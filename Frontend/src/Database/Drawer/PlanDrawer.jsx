import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import OpenSeadragon from "openseadragon";
import { Stage } from "react-konva";
import api from "../../api/axiosAPI.jsx";

import { useElementSize } from "./hooks/useElementSize.js";
import { usePlanViewer } from "./hooks/usePlanViewer.js";

import { createInitialDrawingState } from "./engine/createInitialDrawingState.js";
import { drawingReducer } from "./engine/drawingReducer.js";

import { screenToImagePoint } from "./engine/geometry/coords.js";
import { dnToRealPipeWidthPx, parseMetersPerPx } from "./engine/geometry/units.js";
import { snapPointToRelativeAngleStep } from "./engine/geometry/vector.js";

import { updatePipeDraftEnd, commitPipeDraftCommand } from "./engine/commands/pipeCommands.js";
import { getSelectedItemId } from "./engine/commands/deleteCommands.js";
import { findItemAtImagePoint, screenToleranceToImagePx } from "./engine/selection/hitTest.js";
import { buildSnapIndex } from "./engine/snap/buildSnapIndex.js";
import { queryNearestPortSnap } from "./engine/snap/querySnap.js";

import PipeLayer from "./components/PipeLayer.jsx";
import ElbowLayer from "./components/ElbowLayer.jsx";
import ReducerLayer from "./components/ReducerLayer.jsx";
import PreviewLayer from "./components/PreviewLayer.jsx";
import SnapIndicator from "./components/SnapIndicator.jsx";
import ToolPanel from "./components/ToolPanel.jsx";
import HUD from "./components/HUD.jsx";

// Default active tool.
const DEFAULT_TOOL = {
  mode: "draw",
  dn: 32,
  color: "#00ff00",
  systemTypeId: "pipe_default",
};

// Shift angle snap step.
const ANGLE_SNAP_STEP_DEG = 15;

export default function PlanDrawer({ plan }) {
  // OSD container.
  const osdRef = useRef(null);

  // Konva/UI overlay container.
  const overlayRef = useRef(null);

  // Konva stage instance.
  const stageRef = useRef(null);

  // RAF id for throttled cursor/HUD updates.
  const cursorRafRef = useRef(null);

  // Mouse drag/pan state stored outside React for speed.
  const dragStateRef = useRef({
    dragging: false,
    start: null,
    last: null,
    moved: false,
    panning: false,
  });

  // Overlay size used by Konva Stage.
  const size = useElementSize(overlayRef);

  // Canonical CAD drawing state.
  const [drawingState, dispatchDrawing] = useReducer(drawingReducer, null, () => createInitialDrawingState({ plan }));

  // Reset drawing state when changing plan.
  useEffect(() => {
    dispatchDrawing({
      type: "RESET_DRAWING",
      payload: {
        state: createInitialDrawingState({ plan }),
      },
    });
  }, [plan?.id]);

  // Current UI tool state.
  const [tool, setTool] = useState(DEFAULT_TOOL);

  // Cursor position in source image pixels.
  const [cursorImagePoint, setCursorImagePoint] = useState(null);

  // Active open-port snap target.
  const [activeSnap, setActiveSnap] = useState(null);

  // Current image pixel to screen pixel scale.
  const [stageImageScale, setStageImageScale] = useState(1);

  // Tracks OSD/Konva scale without redrawing on pan-only changes.
  const handleStageTransformChange = useCallback(({ scale }) => {
    setStageImageScale((prev) => (Math.abs(prev - scale) < 1e-6 ? prev : scale));
  }, []);

  // OSD viewer + Konva image-coordinate sync.
  const viewerRef = usePlanViewer({
    plan,
    osdElementRef: osdRef,
    stageRef,
    apiBaseURL: api.defaults.baseURL,
    onStageTransformChange: handleStageTransformChange,
  });

  // Parsed plan scale.
  const metersPerPx = useMemo(() => {
    return parseMetersPerPx(plan?.meters_per_px);
  }, [plan?.meters_per_px]);

  // Real DN width in image pixels.
  const pipeWidthPx = useMemo(() => {
    return dnToRealPipeWidthPx(tool.dn, metersPerPx);
  }, [tool.dn, metersPerPx]);

  // Renderable pipe items.
  const pipes = useMemo(() => {
    return drawingState.itemIds.map((id) => drawingState.itemsById[id]).filter((item) => item?.type === "pipe");
  }, [drawingState.itemIds, drawingState.itemsById]);

  // Renderable elbow items.
  const elbows = useMemo(() => {
    return drawingState.itemIds.map((id) => drawingState.itemsById[id]).filter((item) => item?.type === "elbow");
  }, [drawingState.itemIds, drawingState.itemsById]);

  // Renderable reducer items.
  const reducers = useMemo(() => {
    return drawingState.itemIds.map((id) => drawingState.itemsById[id]).filter((item) => item?.type === "reducer");
  }, [drawingState.itemIds, drawingState.itemsById]);

  // Spatial index for currently open ports.
  const snapIndex = useMemo(() => {
    return buildSnapIndex(drawingState);
  }, [drawingState.connectionIds, drawingState.connectionsById, drawingState.itemIds, drawingState.itemsById]);

  // Current screen-to-image snap tolerance.
  const getSnapRadiusPx = useCallback(() => {
    return screenToleranceToImagePx(stageRef.current, 12);
  }, []);

  // Finds nearest open-port snap target.
  const getPortSnap = useCallback(
    (point, excludeRefs = [], match = null) => {
      return queryNearestPortSnap({
        snapIndex,
        point,
        radiusPx: getSnapRadiusPx(),
        excludeRefs,
        match,
      });
    },
    [getSnapRadiusPx, snapIndex],
  );

  // Resolves raw pointer, port snap, and optional angle snap.
  const resolveDrawTarget = useCallback(
    ({ point, activeDraft, shiftKey }) => {
      const excludeRefs = activeDraft?.startPortRef ? [activeDraft.startPortRef] : [];
      const snapMatch =
        activeDraft?.type === "pipeDraft"
          ? {
              dn: activeDraft.dn,
              color: activeDraft.color,
              systemTypeId: activeDraft.systemTypeId,
            }
          : null;
      const snap = getPortSnap(point, excludeRefs, snapMatch);
      const canAngleSnap = shiftKey && activeDraft?.type === "pipeDraft" && !snap;
      const angleOrigin = activeDraft?.startPoint || activeDraft?.startRaw || activeDraft?.start;
      const baseDir = activeDraft?.previousDir || { x: 1, y: 0 };
      const targetPoint = snap?.point ?? (canAngleSnap ? snapPointToRelativeAngleStep(angleOrigin, point, baseDir, ANGLE_SNAP_STEP_DEG) : point);

      return {
        snap,
        targetPoint,
        targetPortRef: snap ? { itemId: snap.itemId, portId: snap.portId } : null,
        targetPortSnapshot: snap?.port ?? null,
      };
    },
    [getPortSnap],
  );

  // Keep cursor style synced with tool mode.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    stage.container().style.cursor = tool.mode === "draw" ? "crosshair" : "default";
  }, [tool.mode]);

  // Cancel draft when leaving draw mode.
  useEffect(() => {
    if (tool.mode === "draw") return;

    setActiveSnap(null);
    if (!drawingState.activeDraft) return;

    dispatchDrawing({
      type: "CLEAR_ACTIVE_DRAFT",
    });
  }, [drawingState.activeDraft, tool.mode]);

  // Cancel pending cursor RAF on unmount.
  useEffect(() => {
    return () => {
      if (cursorRafRef.current) {
        cancelAnimationFrame(cursorRafRef.current);
        cursorRafRef.current = null;
      }
    };
  }, []);

  // Delete selected item from keyboard.
  useEffect(() => {
    const handleKeyDown = (e) => {
      const target = e.target;
      const tagName = target?.tagName?.toLowerCase();
      const isEditing = target?.isContentEditable || tagName === "input" || tagName === "textarea" || tagName === "select";

      if (isEditing) return;

      if (e.key === "Escape") {
        if (!drawingState.activeDraft && !drawingState.selected) return;

        e.preventDefault();
        dispatchDrawing(drawingState.activeDraft ? { type: "CLEAR_ACTIVE_DRAFT" } : { type: "SET_SELECTED", payload: { selected: null } });
        setActiveSnap(null);
        return;
      }

      if (e.key !== "Delete" && e.key !== "Backspace") return;

      const itemId = getSelectedItemId(drawingState.selected);
      if (!itemId) return;

      e.preventDefault();

      dispatchDrawing({
        type: "DELETE_ITEM",
        payload: {
          itemId,
        },
      });
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [drawingState.activeDraft, drawingState.selected]);

  // Read pointer as image-pixel coordinate.
  const getImagePointFromPointer = useCallback(() => {
    const stage = stageRef.current;
    const viewer = viewerRef.current;

    if (!stage || !viewer) return null;

    return screenToImagePoint(stage, viewer, OpenSeadragon);
  }, [viewerRef]);

  // Read pointer and save image-pixel cursor.
  const updateCursorFromPointer = useCallback(() => {
    const imagePoint = getImagePointFromPointer();

    setCursorImagePoint(imagePoint);

    return imagePoint;
  }, [getImagePointFromPointer]);

  // Throttle cursor/HUD updates to animation frames.
  const updateCursorFromPointerThrottled = useCallback(() => {
    if (cursorRafRef.current) return;

    cursorRafRef.current = requestAnimationFrame(() => {
      cursorRafRef.current = null;
      updateCursorFromPointer();
    });
  }, [updateCursorFromPointer]);

  // Zoom OSD around mouse pointer.
  const handleWheel = useCallback(
    (e) => {
      e.evt.preventDefault();

      const viewer = viewerRef.current;
      const stage = stageRef.current;

      if (!viewer || !stage) return;

      const pos = stage.getPointerPosition();
      if (!pos) return;

      const viewportPoint = viewer.viewport.pointFromPixel(new OpenSeadragon.Point(pos.x, pos.y), true);

      const zoomFactor = e.evt.deltaY > 0 ? 1 / 1.2 : 1.2;

      viewer.viewport.zoomBy(zoomFactor, viewportPoint);
      viewer.viewport.applyConstraints();
    },
    [viewerRef],
  );

  // Start click/pan detection.
  const handleMouseDown = useCallback(() => {
    const stage = stageRef.current;
    const pos = stage?.getPointerPosition() ?? null;

    dragStateRef.current = {
      dragging: true,
      start: pos,
      last: pos,
      moved: false,
      panning: false,
    };
  }, []);

  // Handle pan first; update draft/cursor only when not panning.
  const handleMouseMove = useCallback((e) => {
    const viewer = viewerRef.current;
    const stage = stageRef.current;
    const drag = dragStateRef.current;

    if (!viewer || !stage) return;

    const pos = stage.getPointerPosition();

    // Mouse is down: maybe this becomes pan.
    if (drag.dragging && pos && drag.start && drag.last) {
      const dist = Math.hypot(pos.x - drag.start.x, pos.y - drag.start.y);

      // Start pan after small threshold.
      if (!drag.panning && dist >= 5) {
        drag.panning = true;
        drag.moved = true;
        drag.last = pos;

        stage.container().style.cursor = "grabbing";
        return;
      }

      // Active pan: no React state updates here.
      if (drag.panning) {
        const dx = pos.x - drag.last.x;
        const dy = pos.y - drag.last.y;

        if (dx !== 0 || dy !== 0) {
          viewer.viewport.panBy(viewer.viewport.deltaPointsFromPixels(new OpenSeadragon.Point(-dx, -dy), true));

          viewer.viewport.applyConstraints();
          drag.last = pos;
        }

        return;
      }
    }

    // Current image point under cursor.
    const imagePoint = getImagePointFromPointer();
    const drawTarget =
      tool.mode === "draw" && imagePoint
        ? resolveDrawTarget({
            point: imagePoint,
            activeDraft: drawingState.activeDraft,
            shiftKey: Boolean(e?.evt?.shiftKey),
          })
        : null;
    const snap = drawTarget?.snap ?? null;

    setActiveSnap(snap);

    // Live pipe preview while drawing.
    if (drawingState.activeDraft?.type === "pipeDraft" && imagePoint) {
      const endPoint = drawTarget?.targetPoint ?? imagePoint;

      const draft = updatePipeDraftEnd(drawingState.activeDraft, endPoint, {
        endPortRef: drawTarget?.targetPortRef ?? null,
        endPortSnapshot: drawTarget?.targetPortSnapshot ?? null,
      });

      dispatchDrawing({
        type: "SET_ACTIVE_DRAFT",
        payload: {
          draft: {
            ...draft,
            dn: tool.dn,
            color: tool.color,
            systemTypeId: tool.systemTypeId,
            widthPx: pipeWidthPx,
          },
        },
      });
    }

    // Cursor HUD update only when not panning.
    updateCursorFromPointerThrottled();
  }, [drawingState.activeDraft, getImagePointFromPointer, pipeWidthPx, resolveDrawTarget, tool, updateCursorFromPointerThrottled, viewerRef]);

  // End pan/click tracking.
  const handleMouseUp = useCallback(() => {
    const stage = stageRef.current;
    const wasPanning = dragStateRef.current.panning;

    dragStateRef.current.dragging = false;
    dragStateRef.current.panning = false;

    if (stage && wasPanning) {
      stage.container().style.cursor = tool.mode === "draw" ? "crosshair" : "default";
    }
  }, [tool.mode]);

  // Clear pointer state when leaving canvas.
  const handleMouseLeave = useCallback(() => {
    dragStateRef.current.dragging = false;
    dragStateRef.current.panning = false;

    setCursorImagePoint(null);
    setActiveSnap(null);
  }, []);

  // Clean click handler.
  const handleStageClick = useCallback((e) => {
    // Ignore click fired after panning.
    if (dragStateRef.current.moved) {
      dragStateRef.current.moved = false;
      return;
    }

    const imagePoint = updateCursorFromPointer();
    if (!imagePoint) return;

    // Store last click for HUD/debug.
    dispatchDrawing({
      type: "DEBUG_LAST_CLICK",
      payload: {
        point: imagePoint,
      },
    });

    // Select mode hit-tests committed items.
    if (tool.mode === "select") {
      const stage = stageRef.current;
      const hitItem = findItemAtImagePoint(drawingState, imagePoint, screenToleranceToImagePx(stage));

      dispatchDrawing({
        type: "SET_SELECTED",
        payload: {
          selected: hitItem ? { itemId: hitItem.id, portId: null } : null,
        },
      });

      return;
    }

    // Drawing actions only run in draw mode.
    if (tool.mode !== "draw") return;

    const drawTarget = resolveDrawTarget({
      point: imagePoint,
      activeDraft: drawingState.activeDraft,
      shiftKey: Boolean(e?.evt?.shiftKey),
    });
    const snap = drawTarget.snap;
    const targetPoint = drawTarget.targetPoint;
    const targetPortRef = drawTarget.targetPortRef;
    const targetPortSnapshot = drawTarget.targetPortSnapshot;

    setActiveSnap(snap);

    const result = commitPipeDraftCommand({
      state: drawingState,
      draft: drawingState.activeDraft,
      clickPoint: targetPoint,
      portRef: targetPortRef,
      portSnapshot: targetPortSnapshot,
      tool,
      metersPerPx,
    });

    for (const action of result.actions) {
      dispatchDrawing(action);
    }

    setActiveSnap(null);
  }, [drawingState, metersPerPx, resolveDrawTarget, tool, updateCursorFromPointer]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-slate-100">
      {/* OSD plan layer. */}
      <div ref={osdRef} className="absolute inset-0" />

      {/* Konva + UI overlay. */}
      <div ref={overlayRef} className="absolute inset-0">
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
            <PipeLayer pipes={pipes} selected={drawingState.selected} />
            <ElbowLayer elbows={elbows} selected={drawingState.selected} />
            <ReducerLayer reducers={reducers} selected={drawingState.selected} />
            <PreviewLayer draft={drawingState.activeDraft} />
            <SnapIndicator snap={activeSnap} imageScale={stageImageScale} />
          </Stage>
        )}

        <ToolPanel tool={tool} setTool={setTool} pipeWidthPx={pipeWidthPx} metersPerPx={metersPerPx} />

        <HUD plan={plan} cursorImagePoint={cursorImagePoint} tool={tool} pipeWidthPx={pipeWidthPx} metersPerPx={metersPerPx} drawingState={drawingState} />
      </div>
    </div>
  );
}
