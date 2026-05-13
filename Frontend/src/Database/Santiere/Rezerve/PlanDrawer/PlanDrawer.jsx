// PlanDrawer.jsx — multi-chain refactor
// State: chains[] instead of flat pipeSegments[]/elbows[]/reducers[]
// Each chain owns its own segments, elbows, reducers.
// Auto-merge when tail of active chain lands on another chain's endpoint.
// Snap index rebuilt via useEffect (no more setTimeout race conditions).
//
// What lives here:    React state, OSD wiring, Konva event handlers, JSX.
// What lives in utils: all pure logic — chain ops, geometry, snap, joint math.

import React, { useRef, useEffect, useState, useCallback, useMemo } from "react";
import OpenSeadragon from "openseadragon";
import { Stage, Layer } from "react-konva";
import api from "../../../../api/axiosAPI.jsx";
import {
  toApiUrl,
  pixelToImagePoint,
  norm,
  computePipeSegmentsForClick,
  isValidTJointAngle,
  isValidYJointAngle,
  createTJointRecord,
  computeMeasureInfo,
  chainEndpoints,
  dnToPx,
  applySnap,
  reorderChainToTail,
  findTJointSnap,
  resolveDrawingPoint,
  findItemAtPoint,
  // chain helpers (factories + pure ops) — all live in PlanUtils
  makeChain,
  findBestEndpointMatch,
  computeElbowFromCorner, // <--- IMPORTAT PENTRU GENERAREA COTULUI LA SUDURĂ
} from "../PlanUtils.jsx";
import Elbows from "./Components/Elbows.jsx";
import PreviewHover from "./Components/PreviewHover.jsx";
import PipeSegments from "./Components/PipeSegments.jsx";
import MeasureInfo from "./Components/MeasureInfo.jsx";
import MeniuDrawer from "./Components/MeniuDrawer.jsx";
import Reducers from "./Components/Reducers.jsx";
import { buildSnapIndex, querySnap } from "./Utils/Spanengine.js";
import SnapIndicator from "./Components/SnapIndicator.jsx";
import TJoints from "./Components/TJoints.jsx";
import Inventory from "./Components/Inventory.jsx";

// ─── constants ────────────────────────────────────────────────────────────────
const COT_VISUAL_FACTOR = 1;
const STEP_DEG = 15;
const REATTACH_TOL = 1.5; // image-coord px

const NO_SNAP = { snapped: null, type: null, kind: null };

// ─── Rendering components ─────────────────────────────────────────────────────
const AllPipeLayers = React.memo(function AllPipeLayers({ selectedItemId, chains, tJoints }) {
  return (
    <Layer listening={false}>
      {chains.map((chain) => (
        <React.Fragment key={chain.id}>
          <PipeSegments pipeSegments={chain.segments} selectedItemId={selectedItemId} />
          <Reducers reducers={chain.reducers} selectedItemId={selectedItemId} />
          <Elbows elbows={chain.elbows} selectedItemId={selectedItemId} />
        </React.Fragment>
      ))}
      <TJoints tJoints={tJoints} COT_VISUAL_FACTOR={COT_VISUAL_FACTOR} selectedItemId={selectedItemId} />
    </Layer>
  );
});

const PreviewLayer = React.memo(function PreviewLayer({ hoverPoint, activeSegments, isDrawing, PIPE_WIDTH, PIPE_COLOR, PIPE_EDGE, CENTER_WIDTH, snapResult }) {
  return (
    <Layer listening={false}>
      {isDrawing && <PreviewHover hoverPoint={hoverPoint} pipeSegments={activeSegments} PIPE_WIDTH={PIPE_WIDTH} PIPE_COLOR={PIPE_COLOR} PIPE_EDGE={PIPE_EDGE} CENTER_WIDTH={CENTER_WIDTH} />}
      <SnapIndicator snapResult={snapResult} PIPE_WIDTH={PIPE_WIDTH} />
    </Layer>
  );
});

const HUDOverlay = React.memo(function HUDOverlay({ measureInfo, cursorPos, hasPipes, isDrawing }) {
  if (!measureInfo || !cursorPos || !hasPipes || !isDrawing) return null;
  return <MeasureInfo info={measureInfo} cursorPos={cursorPos} />;
});

// ─── Main component ───────────────────────────────────────────────────────────
export default function PlanDrawer({ plan }) {
  const osdRef = useRef(null);
  const viewerRef = useRef(null);
  const containerRef = useRef(null);
  const stageRef = useRef(null);
  const dragStateRef = useRef({ dragging: false, start: null, last: null, moved: false, panning: false });
  const snapIndexRef = useRef(null);

  const [size, setSize] = useState({ w: 0, h: 0 });
  const [cursorPos, setCursorPos] = useState(null);
  const [hoverPoint, setHoverPoint] = useState(null);
  const [measureInfo, setMeasureInfo] = useState(null);
  const [snapResult, setSnapResult] = useState(NO_SNAP);

  const [chains, setChains] = useState([]);
  const [tJoints, setTJoints] = useState([]);
  const [activeChainId, setActiveChainId] = useState(null);

  const [mode, setMode] = useState("draw");
  const [selectedItemId, setSelectedItemId] = useState(null);

  const isDrawing = activeChainId !== null;

  const [currentColor, setCurrentColor] = useState("#00FF00");
  const [currentDN, setCurrentDN] = useState(32);
  const [currentStrokeWidth, setCurrentStrokeWidth] = useState(4);

  const M_PER_PX = plan?.meters_per_px;
  const PIPE_COLOR = currentColor;
  const PIPE_WIDTH = currentStrokeWidth;
  const CENTER_WIDTH = useMemo(() => PIPE_WIDTH / 6, [PIPE_WIDTH]);
  const PIPE_EDGE = useMemo(() => Math.max(1.5, PIPE_WIDTH / 8), [PIPE_WIDTH]);

  const activeChain = useMemo(() => (activeChainId ? (chains.find((c) => c.id === activeChainId) ?? null) : null), [chains, activeChainId]);
  const activeSegments = activeChain?.segments ?? [];

  // =================================================================================
  // ── Funcția de ștergere a piesei selectate (CU SPLIT DE LANȚURI LA MIJLOC) ──────
  // =================================================================================
  const deleteSelectedItem = useCallback(() => {
    if (!selectedItemId) return;

    let itemTypeDeleted = null;

    setTJoints((prev) => {
      if (prev.some((t) => t.id === selectedItemId)) {
        itemTypeDeleted = "tjoint";
        return prev.filter((t) => t.id !== selectedItemId);
      }
      return prev;
    });

    if (itemTypeDeleted === "tjoint") {
      setSelectedItemId(null);
      return;
    }

    let pendingTJointUpdates = [];
    const isPtIn = (pt, segs) => segs.some((s) => Math.hypot(s.end.x - pt.x, s.end.y - pt.y) < 1 || Math.hypot(s.start.x - pt.x, s.start.y - pt.y) < 1);

    setChains((prev) => {
      let newChains = [];

      for (const chain of prev) {
        const segIdx = chain.segments.findIndex((s) => s.id === selectedItemId);
        const elbowIdx = chain.elbows.findIndex((e) => e.id === selectedItemId);
        const redIdx = chain.reducers.findIndex((r) => r.id === selectedItemId);

        if (segIdx === -1 && elbowIdx === -1 && redIdx === -1) {
          newChains.push(chain);
          continue;
        }

        // Dacă ștergem o ȚEAVĂ, trebuie să DESPICĂM lanțul în două
        if (segIdx !== -1) {
          const leftSegs = chain.segments.slice(0, segIdx);
          const rightSegs = chain.segments.slice(segIdx + 1);

          if (leftSegs.length > 0) {
            newChains.push({
              ...chain,
              segments: leftSegs,
              elbows: chain.elbows.filter((e) => isPtIn(e.corner, leftSegs)),
              // ERA GREȘIT AICI:
              reducers: chain.reducers.filter((r) => isPtIn(r.anchor, leftSegs) || isPtIn(r.p1, leftSegs)),
            });
          }

          if (rightSegs.length > 0) {
            const rightChainId = crypto.randomUUID();
            newChains.push({
              id: rightChainId,
              segments: rightSegs,
              elbows: chain.elbows.filter((e) => isPtIn(e.corner, rightSegs)),
              // ȘI AICI:
              reducers: chain.reducers.filter((r) => isPtIn(r.anchor, rightSegs)),
            });
            // Salvăm actualizările pentru T-Jointurile care au picat pe jumătatea dreaptă
            pendingTJointUpdates.push({ oldId: chain.id, newId: rightChainId, segs: rightSegs });
          }
        } else {
          // Dacă ștergem direct un cot sau o reducție
          newChains.push({
            ...chain,
            elbows: elbowIdx !== -1 ? chain.elbows.filter((e) => e.id !== selectedItemId) : chain.elbows,
            reducers: redIdx !== -1 ? chain.reducers.filter((r) => r.id !== selectedItemId) : chain.reducers,
          });
        }
      }
      return newChains;
    });

    // Actualizăm T-Joint-urile orfane (care au picat pe jumătatea dreaptă) ca să indice spre noul ID
    if (pendingTJointUpdates.length > 0) {
      setTJoints((prevT) =>
        prevT.map((tj) => {
          let updated = { ...tj };
          for (const update of pendingTJointUpdates) {
            if (updated.parentChainId === update.oldId && isPtIn(updated.anchor, update.segs)) updated.parentChainId = update.newId;
            if (updated.branchChainId === update.oldId && isPtIn(updated.anchor, update.segs)) updated.branchChainId = update.newId;
          }
          return updated;
        }),
      );
    }

    setSelectedItemId(null);
  }, [selectedItemId]);

  useEffect(() => {
    const allSegs = chains.flatMap((c) => c.segments);
    const allElbows = chains.flatMap((c) => c.elbows);
    snapIndexRef.current = buildSnapIndex(allSegs, allElbows);
  }, [chains]);

  useEffect(() => {
    if (mode === "select" && activeChainId !== null) {
      setChains((prev) =>
        prev.map((c) => {
          if (c.id !== activeChainId) return c;
          const last = c.segments[c.segments.length - 1];
          if (last && Math.hypot(last.end.x - last.start.x, last.end.y - last.start.y) < 1e-3) {
            return { ...c, segments: c.segments.slice(0, -1) };
          }
          return c;
        }),
      );
      setActiveChainId(null);
      setHoverPoint(null);
      setSnapResult(NO_SNAP);
    }
  }, [mode, activeChainId]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "d") {
        setMode((prev) => (prev === "draw" ? "select" : "draw"));
      }

      if ((e.key === "Delete" || e.key === "Backspace") && mode === "select" && selectedItemId) {
        deleteSelectedItem();
        return;
      }
      if (e.key === "Escape") {
        if (mode === "select") {
          setSelectedItemId(null);
          return;
        }
        let ghostChainId = null;
        setChains((prev) =>
          prev
            .map((c) => {
              if (c.id !== activeChainId) return c;
              const last = c.segments[c.segments.length - 1];
              if (last && Math.hypot(last.end.x - last.start.x, last.end.y - last.start.y) < 1e-3) {
                ghostChainId = c.id;
                return { ...c, segments: c.segments.slice(0, -1) };
              }
              return c;
            })
            // MAGIA AICI: Ștergem lanțul dacă a rămas gol!
            .filter((c) => c.segments.length > 0 || c.elbows.length > 0 || c.reducers.length > 0),
        );

        if (ghostChainId) {
          setTJoints((prev) => prev.filter((tj) => tj.branchChainId !== ghostChainId));
        }

        setActiveChainId(null);
        setHoverPoint(null);
        setSnapResult(NO_SNAP);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeChainId, mode, selectedItemId, deleteSelectedItem]);

  useEffect(() => {
    setCurrentStrokeWidth(dnToPx(currentDN, M_PER_PX, 16));
  }, [currentDN, M_PER_PX]);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!plan?.width_px || !plan?.height_px || !osdRef.current) return;
    const imgW = Number(plan.width_px),
      imgH = Number(plan.height_px);
    const tileSize = Number(plan.tile_size || 256);
    const maxLevel = Number.isFinite(Number(plan?.tiles_max_level)) ? Number(plan.tiles_max_level) : Math.ceil(Math.log2(Math.max(imgW || 1, imgH || 1)));
    const tileSource = plan.dzi_url ?? {
      width: imgW,
      height: imgH,
      tileSize,
      minLevel: 0,
      maxLevel,
      getTileUrl: (L, x, y) => `${toApiUrl(plan.tiles_base_url, api.defaults.baseURL)}/${L}/${x}_${y}.png`,
    };
    const viewer = OpenSeadragon({
      element: osdRef.current,
      tileSources: tileSource,
      showNavigationControl: false,
      crossOriginPolicy: "Anonymous",
      ajaxWithCredentials: false,
      gestureSettingsMouse: { clickToZoom: false, dblClickToZoom: true, dragToPan: true, scrollToZoom: true },
      gestureSettingsTouch: { pinchRotate: false, flickEnabled: false },
      constrainDuringPan: true,
      animationTime: 0.1,
      zoomPerScroll: 1.15,
      minZoomImageRatio: 0.5,
      maxZoomPixelRatio: 12.0,
      preserveImageSizeOnResize: true,
    });
    viewerRef.current = viewer;

    const syncStage = () => {
      const stage = stageRef.current;
      if (!stage || !viewer.world.getItemCount()) return;
      const p00_vp = viewer.viewport.imageToViewportCoordinates(0, 0);
      const p10_vp = viewer.viewport.imageToViewportCoordinates(1, 0);
      const p00_px = viewer.viewport.pixelFromPoint(p00_vp, true);
      const p10_px = viewer.viewport.pixelFromPoint(p10_vp, true);
      const scale = p10_px.x - p00_px.x;
      stage.scale({ x: scale, y: scale });
      stage.position({ x: p00_px.x, y: p00_px.y });
      stage.batchDraw();
    };
    viewer.addOnceHandler("open", syncStage);
    viewer.addHandler("viewport-change", syncStage);
    requestAnimationFrame(syncStage);
    window.addEventListener("resize", syncStage);
    return () => {
      window.removeEventListener("resize", syncStage);
      viewer.destroy();
      viewerRef.current = null;
    };
  }, [plan]);

  useEffect(() => {
    const stage = stageRef.current;
    if (stage) stage.container().style.cursor = mode === "select" ? "default" : "crosshair";
  }, [mode]);

  const handleWheel = useCallback((e) => {
    const viewer = viewerRef.current,
      stage = stageRef.current;
    if (!viewer || !stage) return;
    const pos = stage.getPointerPosition();
    if (!pos) return;
    const vp = viewer.viewport.pointFromPixel(new OpenSeadragon.Point(pos.x, pos.y), true);
    viewer.viewport.zoomBy(e.evt.deltaY > 0 ? 1 / 1.15 : 1.15, vp);
    viewer.viewport.applyConstraints();
  }, []);

  const handleMouseDown = useCallback(() => {
    const pos = stageRef.current?.getPointerPosition();
    dragStateRef.current = { dragging: true, start: pos, last: pos, moved: false, panning: false };
  }, []);

  const handleMouseMove = useCallback(
    (e) => {
      const viewer = viewerRef.current,
        stage = stageRef.current;
      if (!viewer || !stage) return;
      const pos = stage.getPointerPosition();
      if (pos) setCursorPos({ x: pos.x, y: pos.y });

      const img = pixelToImagePoint(stage, viewer, OpenSeadragon);
      if (img) {
        if (mode === "select") {
          setSnapResult(NO_SNAP);
          setHoverPoint(null);
          setMeasureInfo(null);
        } else {
          const lastSeg = activeSegments.length ? activeSegments[activeSegments.length - 1] : null;
          const { resolvedPoint, snap } = resolveDrawingPoint(img, lastSeg, e.evt.shiftKey && isDrawing, snapIndexRef.current, STEP_DEG);
          setSnapResult(snap);
          setHoverPoint(resolvedPoint);
          setMeasureInfo(isDrawing ? computeMeasureInfo(activeSegments, resolvedPoint, M_PER_PX) : null);
        }
      } else {
        setSnapResult(NO_SNAP);
        setHoverPoint(null);
        setMeasureInfo(null);
      }

      const drag = dragStateRef.current;
      if (!drag.dragging || !pos) return;
      const dist = Math.hypot(pos.x - drag.start.x, pos.y - drag.start.y);
      if (!drag.panning && dist >= 5) {
        drag.panning = true;
        drag.moved = true;
        drag.last = pos;
        stage.container().style.cursor = "grabbing";
        return;
      }
      if (!drag.panning) return;
      const dx = pos.x - drag.last.x,
        dy = pos.y - drag.last.y;
      if (dx === 0 && dy === 0) return;
      viewer.viewport.panBy(viewer.viewport.deltaPointsFromPixels(new OpenSeadragon.Point(-dx, -dy), true));
      viewer.viewport.applyConstraints();
      drag.last = pos;
    },
    [activeSegments, M_PER_PX, isDrawing, mode],
  );

  const handleMouseUp = useCallback(() => {
    dragStateRef.current.dragging = false;
    dragStateRef.current.panning = false;
    const stage = stageRef.current;
    if (stage && !dragStateRef.current.panning) {
      stage.container().style.cursor = mode === "select" ? "default" : "crosshair";
    }
  }, [mode]);

  const handleMouseLeave = useCallback(() => {
    dragStateRef.current.dragging = false;
    dragStateRef.current.panning = false;
    setHoverPoint(null);
    setMeasureInfo(null);
    setCursorPos(null);
    setSnapResult(NO_SNAP);
  }, []);

  const processDetachedClick = useCallback(
    (prevChains, imgRaw) => {
      const snap = querySnap(snapIndexRef.current, imgRaw.x, imgRaw.y, null);
      const clickPoint = snap.snapped ?? imgRaw;

      const bestMatch = findBestEndpointMatch(prevChains, clickPoint, REATTACH_TOL);
      if (bestMatch) {
        const updated = prevChains.map((c, ci) => (ci !== bestMatch.chainIndex ? c : reorderChainToTail(c, bestMatch)));
        setActiveChainId(prevChains[bestMatch.chainIndex].id);
        return updated;
      }

      if (snap.kind === "elbowMid" && snap.ref) {
        const elbow = snap.ref;
        const corner = elbow.corner ?? clickPoint;
        const seg1Dir = elbow.start ? norm({ x: elbow.start.x - corner.x, y: elbow.start.y - corner.y }) : null;
        const seg2Dir = elbow.end ? norm({ x: elbow.end.x - corner.x, y: elbow.end.y - corner.y }) : null;

        const newChain = makeChain({
          segments: [
            {
              id: crypto.randomUUID(),
              start: { ...clickPoint },
              end: { ...clickPoint },
              color: PIPE_COLOR,
              width: PIPE_WIDTH,
              dn: currentDN,
              elbowSnap: { elbowId: elbow.id, seg1Id: elbow.seg1Id, seg2Id: elbow.seg2Id, seg1Dir, seg2Dir, corner },
            },
          ],
        });
        setActiveChainId(newChain.id);
        return [...prevChains, newChain];
      }

      const tJointSnap = snap.snapped ? findTJointSnap(prevChains, clickPoint) : null;
      if (tJointSnap) {
        const { targetChain, point, refDir, segment } = tJointSnap;
        const newChain = makeChain({
          segments: [{ id: crypto.randomUUID(), start: { ...point }, end: { ...point }, color: PIPE_COLOR, width: PIPE_WIDTH, refDir, dn: currentDN }],
        });
        const newTJoint = createTJointRecord(targetChain.id, newChain.id, point, refDir, null, segment.width, segment.dn, PIPE_WIDTH, currentDN, segment.color);
        setTJoints((prev) => [...prev, newTJoint]);
        setActiveChainId(newChain.id);
        return [...prevChains, newChain];
      }

      const newChain = makeChain({
        segments: [{ id: crypto.randomUUID(), start: { ...clickPoint }, end: { ...clickPoint }, color: PIPE_COLOR, width: PIPE_WIDTH, dn: currentDN }],
      });
      setActiveChainId(newChain.id);
      return [...prevChains, newChain];
    },
    [PIPE_COLOR, PIPE_WIDTH, currentDN],
  );

  const processAttachedClick = useCallback(
    (prevChains, imgRaw, shift) => {
      const activeIdx = prevChains.findIndex((c) => c.id === activeChainId);
      if (activeIdx === -1) return prevChains;

      const chain = prevChains[activeIdx];
      const segs = chain.segments;
      const lastSeg = segs[segs.length - 1];

      const { resolvedPoint: clickPoint } = resolveDrawingPoint(imgRaw, lastSeg, shift, snapIndexRef.current, STEP_DEG);
      const isSeed = Math.hypot(lastSeg.end.x - lastSeg.start.x, lastSeg.end.y - lastSeg.start.y) < 1e-3;

      if (isSeed) {
        const img = shift ? applySnap(lastSeg.end, clickPoint, lastSeg, STEP_DEG) : clickPoint;

        // ── A1. Elbow-corner seed: conversie in T-Joint ──
        // facem T de la cotul existent, cu ramura nouă întinsă spre punctul click-uit
        if (lastSeg.elbowSnap && Math.hypot(img.x - lastSeg.start.x, img.y - lastSeg.start.y) > 1e-3) {
          const { elbowId, seg1Id, seg2Id, seg1Dir, seg2Dir, corner } = lastSeg.elbowSnap;
          const vDrawn = norm({ x: img.x - lastSeg.start.x, y: img.y - lastSeg.start.y });

          // Validăm dacă direcția desenată e suficient de coliniară cu una din cele două segmente ale cotului
          const dot1 = seg1Dir ? Math.abs(seg1Dir.x * vDrawn.x + seg1Dir.y * vDrawn.y) : 0;
          const dot2 = seg2Dir ? Math.abs(seg2Dir.x * vDrawn.x + seg2Dir.y * vDrawn.y) : 0;
          const COLINEAR_TOL = 0.97;

          if (dot1 >= COLINEAR_TOL || dot2 >= COLINEAR_TOL) {
            const isSeg1Main = dot1 >= dot2;
            const idMain = isSeg1Main ? seg1Id : seg2Id;
            const idBranch = isSeg1Main ? seg2Id : seg1Id;

            const hostChainIdx = prevChains.findIndex((c) => c.elbows.some((el) => el.id === elbowId));
            if (hostChainIdx === -1) return prevChains;
            const hostChain = prevChains[hostChainIdx];

            // 2. TĂIEM LANȚUL ÎN DOUĂ FIX LA COT (Geometric, ca să nu greșim z-index-ul!)
            const idx1 = hostChain.segments.findIndex((s) => s.id === seg1Id);
            const idx2 = hostChain.segments.findIndex((s) => s.id === seg2Id);
            const splitIdx = Math.max(idx1, idx2); // Punctul de ruptură

            const leftSegs = hostChain.segments.slice(0, splitIdx);
            const rightSegs = hostChain.segments.slice(splitIdx);

            const isPtIn = (pt, segs) => segs.some((s) => Math.hypot(s.end.x - pt.x, s.end.y - pt.y) < 1 || Math.hypot(s.start.x - pt.x, s.start.y - pt.y) < 1);

            // MAGIA AICI: Scoatem cotul șters, iar pe restul le împărțim în funcție de unde se află fizic pe planșă
            const remainingElbows = hostChain.elbows.filter((e) => e.id !== elbowId);
            const leftElbows = remainingElbows.filter((e) => isPtIn(e.corner, leftSegs));
            const rightElbows = remainingElbows.filter((e) => isPtIn(e.corner, rightSegs));

            const leftReducers = hostChain.reducers.filter((r) => isPtIn(r.p0, leftSegs));
            const rightReducers = hostChain.reducers.filter((r) => isPtIn(r.p0, rightSegs));

            const isMainLeft = leftSegs.some((s) => s.id === idMain);

            let mainChainRaw = {
              ...hostChain,
              segments: isMainLeft ? leftSegs : rightSegs,
              elbows: isMainLeft ? leftElbows : rightElbows,
              reducers: isMainLeft ? leftReducers : rightReducers,
            };

            const branchChain = {
              id: crypto.randomUUID(),
              segments: isMainLeft ? rightSegs : leftSegs,
              elbows: isMainLeft ? rightElbows : leftElbows,
              reducers: isMainLeft ? rightReducers : leftReducers,
            };

            const mainSegIdx = mainChainRaw.segments.findIndex((s) => s.id === idMain);
            const mainSeg = mainChainRaw.segments[mainSegIdx];
            const isStartAtCorner = Math.hypot(mainSeg.start.x - corner.x, mainSeg.start.y - corner.y) < 1;

            let mainChain = reorderChainToTail(mainChainRaw, {
              segIndex: mainSegIdx,
              side: isStartAtCorner ? "start" : "end",
            });

            const lastM = mainChain.segments.length - 1;
            const stretchedSeg = { ...mainChain.segments[lastM], end: { ...img } };
            mainChain.segments = [...mainChain.segments];
            mainChain.segments[lastM] = stretchedSeg;

            const branchSeg = hostChain.segments.find((s) => s.id === idBranch);
            const newTJoint = createTJointRecord(
              mainChain.id,
              branchChain.id,
              corner,
              vDrawn,
              isSeg1Main ? seg2Dir : seg1Dir,
              stretchedSeg.width,
              stretchedSeg.dn ?? currentDN,
              branchSeg.width,
              branchSeg.dn,
              branchSeg.color,
            );
            setTJoints((prev) => [...prev, newTJoint]);
            setActiveChainId(mainChain.id);

            return prevChains.filter((c) => c.id !== activeChainId && c.id !== hostChain.id).concat([mainChain, branchChain]);
          }
        }

        // ── A2. T-joint / Y-joint validate ──────
        const newSegs = [...segs];
        newSegs[newSegs.length - 1] = { ...lastSeg, end: { ...img } };

        if (lastSeg.refDir && Math.hypot(img.x - lastSeg.start.x, img.y - lastSeg.start.y) > 1e-3) {
          const vBranch = norm({ x: img.x - lastSeg.start.x, y: img.y - lastSeg.start.y });
          let jointType = null;
          if (isValidTJointAngle(lastSeg.refDir, vBranch)) jointType = "T";
          else if (isValidYJointAngle(lastSeg.refDir, vBranch)) jointType = "Y";

          if (!jointType) {
            setTJoints((prev) => prev.filter((tj) => tj.branchChainId !== activeChainId));
            setActiveChainId(null);
            return prevChains.filter((c) => c.id !== activeChainId);
          }
          setTJoints((prev) => prev.map((tj) => (tj.branchChainId === activeChainId ? { ...tj, vBranch, dBranch: PIPE_WIDTH, type: jointType } : tj)));
        }
        return prevChains.map((c, ci) => (ci === activeIdx ? { ...chain, segments: newSegs } : c));
      }

      // B. Normal pipe extension
      const result = computePipeSegmentsForClick(segs, clickPoint, shift, PIPE_WIDTH, PIPE_COLOR, COT_VISUAL_FACTOR, STEP_DEG, currentDN);
      const finalSegs = result.nextSegs;
      const finalSeg = finalSegs[finalSegs.length - 1];

      // =========================================================================
      // C1. MERGE CHAINS: Am ajuns fix într-un capăt al altui lanț? (SUDURĂ)
      // =========================================================================
      const otherChains = prevChains.filter((c) => c.id !== activeChainId);
      const endpointMatch = findBestEndpointMatch(otherChains, clickPoint, REATTACH_TOL);

      if (endpointMatch) {
        const targetChain = otherChains[endpointMatch.chainIndex];
        const isTail = endpointMatch.side === "end";

        // Pregătim segmentele țintă să curgă dinspre clickPoint încolo
        let targetSegs = targetChain.segments;
        if (isTail) {
          targetSegs = [...targetSegs].reverse().map((s) => ({ ...s, start: { ...s.end }, end: { ...s.start } }));
        }

        // Închidem țeava curentă fix în capătul țintă
        const closedSegs = [...finalSegs];
        const lastClosed = { ...finalSeg, end: { ...clickPoint } };
        closedSegs[closedSegs.length - 1] = lastClosed;

        const nextSeg = targetSegs[0];
        let newConnElbow = null;

        // Dacă unghiul necesită cot, generăm cotul de sudură!
        const dx1 = clickPoint.x - lastClosed.start.x;
        const dy1 = clickPoint.y - lastClosed.start.y;
        const dx2 = nextSeg.end.x - clickPoint.x;
        const dy2 = nextSeg.end.y - clickPoint.y;
        const n1 = norm({ x: dx1, y: dy1 });
        const n2 = norm({ x: dx2, y: dy2 });

        // Verificăm dacă sunt coliniare perfect (cosinus aproape 1)
        if (n1.x * n2.x + n1.y * n2.y <= 0.98) {
          newConnElbow = computeElbowFromCorner(lastClosed.start, clickPoint, nextSeg.end, STEP_DEG, PIPE_WIDTH, PIPE_COLOR, COT_VISUAL_FACTOR, currentDN);
        }

        // Curățăm coturile vechi care stăteau "în aer" în capătul țevii vechi
        let mergedElbows = [...chain.elbows, ...result.newElbows, ...targetChain.elbows];
        mergedElbows = mergedElbows.filter((e) => Math.hypot(e.corner.x - clickPoint.x, e.corner.y - clickPoint.y) > 1);

        if (newConnElbow) {
          mergedElbows.push({
            id: crypto.randomUUID(),
            ...newConnElbow,
            seg1Id: lastClosed.id,
            seg2Id: nextSeg.id,
          });
        }

        const mergedChain = {
          ...chain, // Păstrăm ID-ul lanțului cu care trăgeam
          segments: [...closedSegs, ...targetSegs],
          elbows: mergedElbows,
          reducers: [...chain.reducers, ...result.newReducers, ...targetChain.reducers],
        };

        // Grijă mare! Dacă T-urile vechi arătau spre targetChain, trebuie să le spunem că acum apartin lui mergedChain
        setTJoints((prev) =>
          prev.map((tj) => {
            let updated = { ...tj };
            if (tj.parentChainId === targetChain.id) updated.parentChainId = mergedChain.id;
            if (tj.branchChainId === targetChain.id) updated.branchChainId = mergedChain.id;
            return updated;
          }),
        );

        setActiveChainId(null); // Gata desenul, le-am sudat!
        return prevChains.filter((c) => c.id !== activeChainId && c.id !== targetChain.id).concat([mergedChain]);
      }

      // =========================================================================
      // C2. Reverse T-joint / Y-joint: am intrat lateral într-o altă conductă?
      // =========================================================================
      const targetT = findTJointSnap(prevChains, clickPoint);
      if (targetT) {
        const { targetChain, point, refDir, segment } = targetT;
        const incomingDir = norm({ x: finalSeg.end.x - finalSeg.start.x, y: finalSeg.end.y - finalSeg.start.y });

        let jointType = null;
        if (isValidTJointAngle(refDir, incomingDir, 0.3)) jointType = "T";
        else if (isValidYJointAngle(refDir, incomingDir, 0.3)) jointType = "Y";

        if (jointType) {
          const vBranchTJoint = { x: -incomingDir.x, y: -incomingDir.y };
          const newJoint = createTJointRecord(targetChain.id, activeChainId, point, refDir, vBranchTJoint, segment.width, segment.dn, PIPE_WIDTH, currentDN, segment.color, jointType);

          setTJoints((prev) => [...prev, newJoint]);
          setActiveChainId(null);

          const closedSegs = [...finalSegs];
          closedSegs[closedSegs.length - 1] = { ...finalSeg, end: { ...point } };
          const finalChain = { ...chain, segments: closedSegs, elbows: [...chain.elbows, ...result.newElbows], reducers: [...chain.reducers, ...result.newReducers] };
          return prevChains.map((c) => (c.id === activeChainId ? finalChain : c));
        }
      }

      // D. Normal continue
      const updatedChain = { ...chain, segments: result.nextSegs, elbows: [...chain.elbows, ...result.newElbows], reducers: [...chain.reducers, ...result.newReducers] };
      return prevChains.map((c, ci) => (ci === activeIdx ? updatedChain : c));
    },
    [activeChainId, PIPE_COLOR, PIPE_WIDTH, currentDN],
  );

  // ─── 3. Main click handler ───────────────────────────────────────────────────
  const handleStageClick = useCallback(
    (e) => {
      console.log(chains);
      if (dragStateRef.current.moved) {
        dragStateRef.current.moved = false;
        return;
      }

      const viewer = viewerRef.current,
        stage = stageRef.current;
      if (!viewer || !stage) return;

      const imgRaw = pixelToImagePoint(stage, viewer, OpenSeadragon);
      if (!imgRaw) return;

      if (mode === "select") {
        const clickedItem = findItemAtPoint(chains, tJoints, imgRaw);
        if (clickedItem) setSelectedItemId(clickedItem.id);
        else setSelectedItemId(null);
        return;
      }

      const shift = !!e.evt.shiftKey;

      setChains((prevChains) => {
        if (!isDrawing) return processDetachedClick(prevChains, imgRaw);
        else return processAttachedClick(prevChains, imgRaw, shift);
      });
    },
    [isDrawing, processDetachedClick, processAttachedClick, mode, chains, tJoints],
  );

  const totalSegCount = useMemo(() => chains.reduce((n, c) => n + c.segments.length, 0), [chains]);

  return (
    <div className="h-full w-full overflow-hidden relative bg-gray-50">
      <div ref={osdRef} className="absolute inset-0" />
      <div ref={containerRef} className="absolute inset-0">
        {size.w > 0 && size.h > 0 && (
          <Stage
            ref={stageRef}
            width={size.w}
            height={size.h}
            pixelRatio={1}
            draggable={false}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            onClick={handleStageClick}
          >
            <AllPipeLayers selectedItemId={selectedItemId} chains={chains} tJoints={tJoints} />
            <PreviewLayer
              hoverPoint={hoverPoint}
              snapResult={snapResult}
              activeSegments={activeSegments}
              isDrawing={isDrawing}
              PIPE_WIDTH={PIPE_WIDTH}
              PIPE_COLOR={PIPE_COLOR}
              PIPE_EDGE={PIPE_EDGE}
              CENTER_WIDTH={CENTER_WIDTH}
            />
          </Stage>
        )}
        <Inventory chains={chains} tJoints={tJoints} M_PER_PX={M_PER_PX} />
        <HUDOverlay measureInfo={measureInfo} cursorPos={cursorPos} hasPipes={totalSegCount > 0} isDrawing={isDrawing} />
        <MeniuDrawer
          currentDN={currentDN}
          setCurrentDN={setCurrentDN}
          currentColor={currentColor}
          setCurrentColor={setCurrentColor}
          mode={mode}
          setMode={setMode}
          selectedItemId={selectedItemId}
          onDelete={deleteSelectedItem}
        />
      </div>
    </div>
  );
}
