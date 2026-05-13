// src/components/Rezerve/PlanViewKonva.jsx
import React, {
    useEffect, useMemo, useRef, useState,
    useCallback, useContext
} from "react";
import {
    Stage, Layer, Image as KonvaImage,
    Circle, Text, Group, RegularPolygon, Line
} from "react-konva";
import useImage from "use-image";
import api from "../../../api/axiosAPI";
import { AuthContext } from "../../../context/TokenContext";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLocationDot, faXmark, faTrash, faCheck, faX } from "@fortawesome/free-solid-svg-icons";
import { useParams } from "react-router-dom";

const toApiUrl = (p) => (p ? new URL(p, api.defaults.baseURL).href : "");

// ===== Constants =============================================================
const DEFAULT_ZONE_OPACITY = 0.30;      // opacity kept separate from fill color
const LABEL_FONT_SIZE = 124;            // large label
const LABEL_FONT_FAMILY = "Arial, sans-serif";
const LABEL_FONT_STYLE = "bold";

// === Helpers =================================================================
function centroidOf(points) {
    let area = 0, cx = 0, cy = 0;
    const n = points.length / 2;
    if (n < 3) return { x: points[0] || 0, y: points[1] || 0 };
    for (let i = 0; i < n; i++) {
        const xi = points[2 * i], yi = points[2 * i + 1];
        const xj = points[2 * ((i + 1) % n)], yj = points[2 * ((i + 1) % n) + 1];
        const a = xi * yj - xj * yi;
        area += a;
        cx += (xi + xj) * a;
        cy += (yi + yj) * a;
    }
    area *= 0.5;
    cx /= (6 * area);
    cy /= (6 * area);
    return { x: cx, y: cy };
}

function hexToRgba(hex, alpha = 0.30) {
    if (!hex) return `rgba(0,0,0,${alpha})`;
    let h = hex.replace("#", "");
    if (h.length === 3) h = h.split("").map(c => c + c).join("");
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function distance(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
}

// constrain to horizontal/vertical relative to anchor
function constrainAxis(p, anchor) {
    const dx = Math.abs(p.x - anchor.x);
    const dy = Math.abs(p.y - anchor.y);
    if (dx >= dy) {
        return { x: p.x, y: anchor.y }; // horizontal
    } else {
        return { x: anchor.x, y: p.y }; // vertical
    }
}

// point-in-polygon (ray casting)
function pointInPolygon(x, y, points) {
    let inside = false;
    const n = points.length / 2;
    for (let i = 0, j = n - 1; i < n; j = i++) {
        const xi = points[2 * i], yi = points[2 * i + 1];
        const xj = points[2 * j], yj = points[2 * j + 1];
        const intersect = (yi > y) !== (yj > y) &&
            x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
        if (intersect) inside = !inside;
    }
    return inside;
}

// measure label width using a canvas context (so the whole text fits)
const measCtx =
    typeof document !== "undefined"
        ? document.createElement("canvas").getContext("2d")
        : null;

function measureTextWidth(text, fontSize = LABEL_FONT_SIZE, fontStyle = LABEL_FONT_STYLE, fontFamily = LABEL_FONT_FAMILY) {
    if (!measCtx) return text.length * fontSize; // fallback SSR
    measCtx.font = `${fontStyle} ${fontSize}px ${fontFamily}`;
    const m = measCtx.measureText(text || "");
    // add a small padding to avoid edge clipping
    return Math.ceil(m.width) + 8;
}

// === Pin (memo, non-interactive) ============================================
const Pin = React.memo(function Pin({
    x, y, label, color = "#e11d48", opacity = 1, invScale = 1
}) {
    const R = 60, fontSize = 40;
    const clampedScale = Math.max(0.5, Math.min(invScale, 2.5));
    const bodyRef = React.useRef(null);

    React.useEffect(() => {
        const body = bodyRef.current;
        if (!body) return;
        body.cache({ pixelRatio: 2 });
        body.draw();
    }, [label, color]);

    return (
        <Group
            x={x}
            y={y}
            opacity={opacity}
            scaleX={clampedScale}
            scaleY={clampedScale}
            offsetY={90}
            listening={false}
        >
            <Group ref={bodyRef} listening={false}>
                <Circle radius={R} fill={color} stroke="white" strokeWidth={5} shadowBlur={6} />
                <RegularPolygon sides={3} radius={R * 0.6} fill={color} y={R} rotation={180} />
                <Text
                    text={String(label ?? "")}
                    fontSize={fontSize}
                    fontStyle="bold"
                    fill="white"
                    x={-R}
                    y={-fontSize / 2}
                    width={R * 2}
                    height={fontSize}
                    align="center"
                    verticalAlign="middle"
                    listening={false}
                />
            </Group>
        </Group>
    );
}, (a, b) =>
    a.x === b.x &&
    a.y === b.y &&
    a.label === b.label &&
    a.color === b.color &&
    a.opacity === b.opacity &&
    a.invScale === b.invScale
);

// ---------------------------------------------------------------------------

export default function ZoneManagement({ plan, onSelectManagementZone }) {
    const { user } = useContext(AuthContext);
    const { idSantier } = useParams();

    const containerRef = useRef(null);
    const stageRef = useRef(null);
    const imageLayerRef = useRef(null);
    const zonesLayerRef = useRef(null); // for batchDraw after edits

    // snap preview dot for drawing onto existing edges
    const [snapPt, setSnapPt] = useState(null); // {x,y,zoneId} | null
    const snapPtRef = useRef(null);


    const [size, setSize] = useState({ w: 0, h: 0 });
    const [scale, setScale] = useState(1);
    const [pos, setPos] = useState({ x: 0, y: 0 });
    const [pins, setPins] = useState([]);
    const [showPins, setShowPins] = useState(true);
    const [error, setError] = useState("");

    // zones: {id, title, colorHex, opacity, points, strokeWidth}
    const [zones, setZones] = useState([]);
    const [currentPts, setCurrentPts] = useState([]); // [x,y,...]
    const [hoverPt, setHoverPt] = useState(null);
    const [zoneTitleSeed, setZoneTitleSeed] = useState(1);

    // selection
    const [selectedZoneId, setSelectedZoneId] = useState(null);

    // label editing overlay
    const [editingLabel, setEditingLabel] = useState(null);
    // { id, value, screenX, screenY }

    // UI controls
    const [zoneFillHex, setZoneFillHex] = useState("#ff7f50");
    const [lineWidth, setLineWidth] = useState(10);
    const [randomColorHex, setRandomColorHex] = useState(false);
    const [openConfirm, setOpenConfirm] = useState(false);

    //titlu si descriere zona
    const [zoneTitle, setZoneTitle] = useState("");
    const [zoneDescription, setZoneDescription] = useState("");

    // image
    const imageUrl = useMemo(() => (plan ? toApiUrl(plan.image_path) : ""), [plan]);
    const [img] = useImage(imageUrl, "anonymous", "origin");

    // pins
    useEffect(() => {
        setPins([]);
        setError("");
        if (!plan?.id || !user?.id) return;
        (async () => {
            try {
                const { data } = await api.get("/Rezerve/pins", {
                    params: { plan_id: plan.id, user_id: user.id }
                });
                setPins(data?.pins ?? []);
            } catch (e) {
                setError(e?.response?.data?.error || "Failed to load pins");
            }
        })();
    }, [plan?.id, user?.id]);

    // sizing
    useEffect(() => {
        if (!containerRef.current) return;
        const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
        ro.observe(containerRef.current);
        return () => ro.disconnect();
    }, [plan]);

    // center
    const lastPlanKey = useRef(null);
    useEffect(() => {
        if (!plan || !img || !img.width || !img.height || !size.w || !size.h) return;
        const key = `${plan.id}:${img.width}x${img.height}`;
        if (lastPlanKey.current === key) return;

        const initialScale = 0.16;
        const initialPos = {
            x: (size.w - img.width * initialScale) / 2,
            y: (size.h - img.height * initialScale) / 2,
        };
        setScale(initialScale);
        setPos(initialPos);
        lastPlanKey.current = key;
    }, [plan?.id, img, size.w, size.h]);

    // zoom/pan
    const onWheel = useCallback((e) => {
        e.evt.preventDefault();
        const stage = stageRef.current;
        const oldScale = stage.scaleX();
        const pointer = stage.getPointerPosition();
        const scaleBy = 1.05;
        const newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;
        const clamped = Math.min(Math.max(newScale, 0.05), 12);
        const mousePointTo = {
            x: (pointer.x - stage.x()) / oldScale,
            y: (pointer.y - stage.y()) / oldScale,
        };
        setScale(clamped);
        setPos({
            x: pointer.x - mousePointTo.x * clamped,
            y: pointer.y - mousePointTo.y * clamped,
        });
    }, []);


    // --- Snap-to-edge helpers ----------------------------------------------------
    function nearestPointOnSegment(px, py, ax, ay, bx, by) {
        const abx = bx - ax, aby = by - ay;
        const apx = px - ax, apy = py - ay;
        const abLen2 = abx * abx + aby * aby || 1; // avoid 0
        let t = (apx * abx + apy * aby) / abLen2;
        t = Math.max(0, Math.min(1, t));
        const x = ax + t * abx, y = ay + t * aby;
        const dx = px - x, dy = py - y;
        return { x, y, dist2: dx * dx + dy * dy };
    }

    /**
     * Find nearest snap point on any zone edge within a screen-pixel threshold.
     * maxDistPx is in SCREEN px; we convert to image space by dividing by current scale.
     */
    function findSnapPoint(zones, p, scale, maxDistPx = 20) {
        const maxDist = maxDistPx / (scale || 1);
        const maxDist2 = maxDist * maxDist;
        let best = null;

        for (const z of zones) {
            const pts = z.points;
            for (let i = 0; i < pts.length; i += 2) {
                const j = (i + 2) % pts.length; // segment to next vertex, wrapping
                if (j === 0 && i === pts.length - 2) {
                    // last->first ok
                }
                const ax = pts[i], ay = pts[i + 1];
                const bx = pts[j], by = pts[j + 1];
                const cand = nearestPointOnSegment(p.x, p.y, ax, ay, bx, by);
                if (cand.dist2 <= maxDist2 && (!best || cand.dist2 < best.dist2)) {
                    best = { x: cand.x, y: cand.y, dist2: cand.dist2, zoneId: z.id };
                }
            }
        }
        return best;
    }

    const onDragEnd = useCallback((e) => {
        const s = e.target;
        setPos({ x: s.x(), y: s.y() });
    }, []);

    const stagePointerToImage = useCallback(() => {
        const stage = stageRef.current;
        if (!stage || !img) return null;
        const pointer = stage.getPointerPosition();
        const s = stage.scaleX();
        const x = (pointer.x - stage.x()) / s;
        const y = (pointer.y - stage.y()) / s;
        return { x, y };
    }, [img]);

    const toPx = useCallback(
        (p) => ({
            x: p.x_pct * (img?.width || plan.width_px),
            y: p.y_pct * (img?.height || plan.height_px),
        }),
        [img?.width, img?.height, plan?.width_px, plan?.height_px]
    );

    // --- fast-inside label point (capped grid) -------------------------------
    // Returns {x,y} for a point inside the polygon, near the visual center.
    // Bounded work: at most 32x32 samples (≈1k), so it won't hang.
    function polylabelXY(flatPoints, grid = 32) {
        // convert [x0,y0,x1,y1,...] -> [[x,y], ...]
        const ring = [];
        for (let i = 0; i < flatPoints.length; i += 2) ring.push([flatPoints[i], flatPoints[i + 1]]);
        if (ring.length === 0) return { x: 0, y: 0 };
        if (ring.length === 1) return { x: ring[0][0], y: ring[0][1] };

        // bbox
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const [x, y] of ring) {
            if (x < minX) minX = x; if (y < minY) minY = y;
            if (x > maxX) maxX = x; if (y > maxY) maxY = y;
        }
        const w = maxX - minX, h = maxY - minY;
        if (w <= 0 || h <= 0) return { x: ring[0][0], y: ring[0][1] };

        // point-in-poly
        function inside(x, y) {
            let ins = false;
            for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
                const [xi, yi] = ring[i], [xj, yj] = ring[j];
                const inter = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
                if (inter) ins = !ins;
            }
            return ins;
        }
        // distance to edges (positive inside, negative outside)
        function distSigned(px, py) {
            let minSq = Infinity, ins = false;
            for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
                const [x1, y1] = ring[j], [x2, y2] = ring[i];
                // in/out toggle
                const inter = ((y1 > py) !== (y2 > py)) && (px < (x2 - x1) * (py - y1) / (y2 - y1) + x1);
                if (inter) ins = !ins;
                // segment distance
                let dx = x2 - x1, dy = y2 - y1;
                let t = ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy);
                t = Math.max(0, Math.min(1, t));
                const lx = x1 + t * dx, ly = y1 + t * dy;
                const ddx = px - lx, ddy = py - ly;
                const sq = ddx * ddx + ddy * ddy;
                if (sq < minSq) minSq = sq;
            }
            return (ins ? 1 : -1) * Math.sqrt(minSq);
        }

        // sample a capped grid over the bbox, pick the point with max distance
        let best = { x: ring[0][0], y: ring[0][1], d: -Infinity };
        const cols = Math.max(8, Math.min(64, grid));  // keep it bounded
        const rows = Math.max(8, Math.min(64, grid));
        for (let i = 0; i <= cols; i++) {
            const x = minX + (w * i) / cols;
            for (let j = 0; j <= rows; j++) {
                const y = minY + (h * j) / rows;
                const d = distSigned(x, y);
                if (d > best.d) best = { x, y, d };
            }
        }
        // if nothing inside (degenerate), fall back to any inside vertex or centroid
        if (best.d <= 0) {
            for (const [x, y] of ring) if (inside(x, y)) return { x, y };
            const c = centroidOf(flatPoints);
            return inside(c.x, c.y) ? c : { x: ring[0][0], y: ring[0][1] };
        }
        return { x: best.x, y: best.y };
    }

    // image -> screen coords (for HTML input)
    const imageToScreen = useCallback((x, y) => {
        return {
            x: x * scale + pos.x,
            y: y * scale + pos.y,
        };
    }, [scale, pos.x, pos.y]);

    const handleStageClick = useCallback((e) => {
        if (editingLabel) return;
        if (selectedZoneId) { setSelectedZoneId(null); return; }

        const pRaw = stagePointerToImage();
        if (!pRaw) return;

        let pCandidate = snapPtRef.current ? { x: snapPtRef.current.x, y: snapPtRef.current.y } : pRaw;
        // console.log(snapPtRef.current);

        // no drawing inside existing zones
        if (!snapPtRef.current) {
            for (const z of zones) {
                if (pointInPolygon(pRaw.x, pRaw.y, z.points)) return;
            }
        }

        // pick snapped (if near any edge) or raw pointer

        if (currentPts.length === 0) {
            setCurrentPts([pCandidate.x, pCandidate.y]);
            setSelectedZoneId(null);
            return;
        }

        const last = { x: currentPts[currentPts.length - 2], y: currentPts[currentPts.length - 1] };
        const p = e?.evt?.shiftKey ? constrainAxis(pCandidate, last) : pCandidate;

        const first = { x: currentPts[0], y: currentPts[1] };
        if (distance(p, first) < 20 && currentPts.length >= 6) {
            // ... your close-polygon logic stays the same ...
            const points = [...currentPts];

            // (optional but recommended) snap the closing point onto the first vertex
            // so the polygon is perfectly closed without sub-pixel drift
            // points already have the first; we don't add p.x,p.y now

            const id = crypto?.randomUUID?.() || `z_${Date.now()}`;
            const title = `Z${zoneTitleSeed}`;
            let colorHex = null;
            if (randomColorHex) {
                const randomColor = Math.floor(Math.random() * 16777215).toString(16);
                colorHex = `#${randomColor.padStart(6, '0')}`;
            }

            // compute and store label coords (you already do this)
            const pole = polylabelXY(points, 32);
            const cx = pole.x, cy = pole.y;
            const textWidth = measureTextWidth(title, LABEL_FONT_SIZE, LABEL_FONT_STYLE, LABEL_FONT_FAMILY);
            const labelX = cx - textWidth / 2;
            const labelY = cy - LABEL_FONT_SIZE / 2;

            setZones(prev => [...prev, {
                id, title,
                colorHex: colorHex || zoneFillHex,
                opacity: DEFAULT_ZONE_OPACITY,
                points,
                strokeWidth: 5,
                labelX, labelY,
                labelW: textWidth
            }]);
            setZoneTitleSeed(n => n + 1);
            setCurrentPts([]);
            setHoverPt(null);
            setSnapPt(null);
            return;
        }

        setCurrentPts(pts => [...pts, p.x, p.y]);
    }, [
        zones, currentPts, zoneFillHex, lineWidth, zoneTitleSeed,
        stagePointerToImage, selectedZoneId, editingLabel, randomColorHex, snapPt
    ]);

    const rafState = useRef({ id: 0, pending: null }); // rAF coalescing for mousemove

    // schedule snap computation in next animation frame
    //
    const scheduleSnapCompute = useCallback((pRaw, lockAxis = false) => {
        // keep only the latest mouse position in this frame
        rafState.current.pending = { pRaw, lockAxis };
        if (rafState.current.id) return;

        rafState.current.id = requestAnimationFrame(() => {
            const pending = rafState.current.pending;
            rafState.current.id = 0;
            rafState.current.pending = null;

            const { pRaw: pIn, lockAxis } = pending;

            const snap = findSnapPointIndexed(pIn, scale, 20);
            snapPtRef.current = snap || null;
            setSnapPt(snap || null); // only for the teal dot

            // cursor preview point
            let pUse = snap ? { x: snap.x, y: snap.y } : pIn;
            setHoverPt(lockAxis ? { ...pUse, lockAxis: true } : pUse);
        });
    }, [zones, scale]);

    // mousemove handler, detects if we're near an edge for snapping
    //
    const handleMove = useCallback((e) => {
        if (editingLabel) return;
        const pRaw = stagePointerToImage();
        if (!pRaw) {
            setHoverPt(null);
            setSnapPt(null);
            snapPtRef.current = null;
            return;
        }

        if (currentPts.length >= 2 && e?.evt?.shiftKey) {
            const last = { x: currentPts[currentPts.length - 2], y: currentPts[currentPts.length - 1] };
            const constrained = constrainAxis(pRaw, last);
            // coalesce snap compute to this frame, but keep axis lock in the preview
            scheduleSnapCompute(constrained, true);
        } else {
            scheduleSnapCompute(pRaw, false);
        }
    }, [stagePointerToImage, currentPts, editingLabel, scheduleSnapCompute]);

    // Reseteaza rAF la demontare
    //
    useEffect(() => {
        return () => {
            if (rafState.current.id) cancelAnimationFrame(rafState.current.id);
        };
    }, []);

    // --- Segment index for fast snapping ----------------------------------------
    //
    const segIndexRef = useRef({ cell: 200, map: new Map() }); // 200 image px per cell; tune if needed

    function cellKey(ix, iy) { return ix + ':' + iy; }

    function addSeg(ix, iy, seg) {
        const k = cellKey(ix, iy);
        let arr = segIndexRef.current.map.get(k);
        if (!arr) segIndexRef.current.map.set(k, arr = []);
        arr.push(seg);
    }

    useEffect(() => {
        const cell = segIndexRef.current.cell;
        const map = new Map();

        for (const z of zones) {
            const pts = z.points;
            for (let i = 0; i < pts.length; i += 2) {
                const j = (i + 2) % pts.length;
                const ax = pts[i], ay = pts[i + 1];
                const bx = pts[j], by = pts[j + 1];
                const minX = Math.min(ax, bx), maxX = Math.max(ax, bx);
                const minY = Math.min(ay, by), maxY = Math.max(ay, by);
                const ix0 = Math.floor(minX / cell), ix1 = Math.floor(maxX / cell);
                const iy0 = Math.floor(minY / cell), iy1 = Math.floor(maxY / cell);
                for (let ix = ix0; ix <= ix1; ix++) {
                    for (let iy = iy0; iy <= iy1; iy++) {
                        const k = ix + ':' + iy;
                        let arr = map.get(k);
                        if (!arr) map.set(k, arr = []);
                        arr.push({ ax, ay, bx, by, zoneId: z.id });
                    }
                }
            }
        }
        segIndexRef.current.map = map;
    }, [zones]);

    function findSnapPointIndexed(p, scale, maxDistPx = 20) {
        const maxDist = maxDistPx / (scale || 1);
        const maxDist2 = maxDist * maxDist;
        const { cell, map } = segIndexRef.current;

        const ix = Math.floor(p.x / cell), iy = Math.floor(p.y / cell);

        let best = null;
        // check the current cell + 8 neighbors (3x3)
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                const arr = map.get((ix + dx) + ':' + (iy + dy));
                if (!arr) continue;
                for (const s of arr) {
                    const cand = nearestPointOnSegment(p.x, p.y, s.ax, s.ay, s.bx, s.by);
                    if (cand.dist2 <= maxDist2 && (!best || cand.dist2 < best.dist2)) {
                        best = { x: cand.x, y: cand.y, dist2: cand.dist2, zoneId: s.zoneId };
                    }
                }
            }
        }
        return best;
    }

    // Cancel drawing mode
    const cancelDrawing = useCallback(() => {
        setCurrentPts([]);
        setHoverPt(null);
    }, []);

    const deleteSelected = useCallback(() => {
        if (!selectedZoneId) return;
        setZones(zs => zs.filter(z => z.id !== selectedZoneId));
        setSelectedZoneId(null);
    }, [selectedZoneId]);

    // start label edit (dblclick)
    const startEditLabel = useCallback((e, z) => {
        e.cancelBubble = true;
        const { x, y } = centroidOf(z.points);
        const screen = imageToScreen(x, y);
        setEditingLabel({
            id: z.id,
            value: z.title,
            screenX: screen.x,
            screenY: screen.y,
        });
    }, [imageToScreen]);

    // save label edit (force a redraw)
    const commitEditLabel = useCallback((value) => {
        if (!editingLabel) return;
        const next = value.trim();
        if (next) {

            const z = zones.find(z => z.id === editingLabel.id);
            const pole = polylabelXY(z.points, 32); // 32-sample grid is plenty
            const cx = pole.x;
            const cy = pole.y;

            const textWidth = measureTextWidth(
                next,
                LABEL_FONT_SIZE,
                LABEL_FONT_STYLE,
                LABEL_FONT_FAMILY
            );

            const labelX = cx - textWidth / 2;
            const labelY = cy - LABEL_FONT_SIZE / 2;

            setZones(prev =>
                prev.map(z => z.id === editingLabel.id
                    ? { ...z, title: next, labelX, labelY, labelW: textWidth } // ✅ store width
                    : z)
            );
        }
        setEditingLabel(null);
        requestAnimationFrame(() => {
            zonesLayerRef.current?.batchDraw?.();
        });
    }, [editingLabel]);

    // keyboard: Esc cancels drawing; Delete removes selected zone
    useEffect(() => {
        const onKeyDown = (ev) => {
            if (ev.key === "Escape") {
                if (editingLabel) {
                    setEditingLabel(null);
                    return;
                }
                cancelDrawing();
                setSelectedZoneId(null);
            }
            if ((ev.key === "Delete" || ev.key === "Backspace") && selectedZoneId && !editingLabel) {
                ev.preventDefault();
                deleteSelected();
            }
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [cancelDrawing, selectedZoneId, deleteSelected, editingLabel]);

    const saveZonesToServer = useCallback(async () => {
        if (!plan?.id || !user?.id) return;
        try {
            const payload = {
                plan_id: plan.id,
                user_id: user.id,
                zone_title: zoneTitle,
                zone_description: zoneDescription,
                zones: zones.map(z => ({
                    id: z.id,
                    title: z.title,
                    color_hex: z.colorHex,
                    opacity: z.opacity,
                    points: z.points,
                    stroke_width: z.strokeWidth,
                    label_x: z.labelX,
                    label_y: z.labelY,
                    label_w: z.labelW,
                })),
            };
            await api.post("/Rezerve/save_zones", payload);
            console.log("Zonele au fost salvate cu succes.");
            onSelectManagementZone(false);
        } catch (e) {
            console.log("Eroare la salvarea zonelor: " + (e?.response?.data?.error || e.message));
        }
    }, [plan?.id, user?.id, zones, zoneTitle, zoneDescription]);

    const isDrawing = currentPts.length > 0 && !editingLabel;
    const isPanningRef = useRef(false);

    return (
        <div className="h-full w-full relative" ref={containerRef}>
            {/* Inline title editor */}
            {editingLabel && (
                <div
                    style={{
                        position: "absolute",
                        left: editingLabel.screenX,
                        top: editingLabel.screenY,
                        transform: "translate(-50%, -50%)",
                        zIndex: 30,
                        background: "white",
                        padding: 6,
                        borderRadius: 8,
                        color: "#000",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
                        border: "1px solid #000"
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <input
                        autoFocus
                        type="text"
                        value={editingLabel.value}
                        onChange={(e) => setEditingLabel(prev => ({ ...prev, value: e.target.value }))}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") commitEditLabel(editingLabel.value);
                            if (e.key === "Escape") setEditingLabel(null);
                        }}
                        className="px-2 py-1 text-sm border rounded outline-none"
                        style={{ minWidth: 180 }}
                    />
                    <button
                        onClick={() => commitEditLabel(editingLabel.value)}
                        className="px-2.5 py-1 rounded bg-green-600 text-white border border-black hover:bg-green-700"
                        title="Confirmă"
                    >
                        <FontAwesomeIcon icon={faCheck} />
                    </button>
                    <button
                        onClick={() => setEditingLabel(null)}
                        className="px-2.5 py-1 rounded bg-gray-600 text-white border border-black hover:bg-gray-700"
                        title="Renunță (Esc)"
                    >
                        <FontAwesomeIcon icon={faXmark} />
                    </button>
                </div>
            )}

            <div className="absolute top-2 left-2 z-10 text-base justify-center items-center gap-2 flex text-black bg-white px-2 py-2 border border-black rounded shadow">
                <button
                    onClick={() => onSelectManagementZone(null)}
                    className="gap-2 flex items-center text-sm bg-red-600 hover:bg-red-700 text-white border border-black px-3 py-1 rounded"
                    title="Șterge zona selectată"
                >
                    <FontAwesomeIcon icon={faX} />
                    <span>Închide</span>
                </button>
                <p>{plan.title} • {plan.scale_label} • {plan.dpi} DPI • pins: {pins.length}</p>
            </div>


            {/* Toolbar */}
            <div className="absolute top-2 right-2 z-10 flex flex-wrap items-center gap-3 bg-white/90 border border-black rounded px-3 py-2 shadow">

                {zones.length > 0 && !isDrawing && !editingLabel &&
                    <button
                        onClick={() => setOpenConfirm(true)}
                        className="gap-2 flex items-center text-sm bg-green-600 hover:bg-green-700 text-white border border-black px-3 py-1 rounded"
                        title="Anulează zona curentă"
                    >
                        <FontAwesomeIcon icon={faCheck} />
                        <span>Confirmǎ zonele</span>
                    </button>
                }
                <button
                    onClick={() => setShowPins(p => !p)}
                    className="gap-2 flex items-center text-sm text-black bg-white border border-black px-3 py-1 rounded"
                >
                    <FontAwesomeIcon icon={faLocationDot} className="text-base" />
                    <span>{showPins ? "Ascunde pinii" : "Arată pinii"}</span>
                </button>
                {/* Random Color */}
                <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-700">Culoare Aleatorie</label>
                    <input
                        type="checkbox"
                        checked={randomColorHex}
                        onChange={(e) => setRandomColorHex(e.target.checked)}
                        className="w-8 h-6 p-0 border border-gray-300 rounded cursor-pointer"
                    />
                </div>

                {/* Color (fill) */}
                <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-700">Culoare:</label>
                    <input
                        type="color"
                        value={zoneFillHex}
                        onChange={(e) => setZoneFillHex(e.target.value)}
                        className="w-8 h-6 p-0 border border-gray-300 rounded cursor-pointer"
                        title="Culoare umplere zonă"
                    />
                </div>

                {/* Line width (preview + final) */}
                <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-700">Linie desen:</label>
                    <input
                        type="range"
                        min="1"
                        max="20"
                        step="1"
                        value={lineWidth}
                        onChange={(e) => setLineWidth(parseInt(e.target.value, 10))}
                        className="w-24"
                        title="Grosime linie"
                    />
                </div>

                {selectedZoneId && !editingLabel && (
                    <button
                        onClick={deleteSelected}
                        className="gap-2 flex items-center text-sm bg-red-600 hover:bg-red-700 text-white border border-black px-3 py-1 rounded"
                        title="Șterge zona selectată"
                    >
                        <FontAwesomeIcon icon={faTrash} />
                        <span>Șterge zona</span>
                    </button>
                )}

                {currentPts.length > 0 && !editingLabel && (
                    <button
                        onClick={cancelDrawing}
                        className="gap-2 flex items-center text-sm bg-gray-700 text-white border border-black px-3 py-1 rounded"
                        title="Anulează zona curentă"
                    >
                        <FontAwesomeIcon icon={faXmark} />
                        <span>Anulează</span>
                    </button>
                )}
            </div>

            {/* Selection badge */}
            {selectedZoneId ? (
                <div className="absolute top-16 right-2 z-10 bg-blue-50 border border-blue-400 text-blue-900 text-xs px-2 py-1 rounded shadow">
                    Selectat: {zones.find(z => z.id === selectedZoneId)?.title ?? selectedZoneId}
                </div>
            ) : null}

            {size.w > 0 && size.h > 0 && (
                <Stage
                    ref={stageRef}
                    width={size.w}
                    height={size.h}
                    scaleX={scale}
                    scaleY={scale}
                    x={pos.x}
                    y={pos.y}
                    draggable
                    onDragStart={() => { isPanningRef.current = true; }}
                    onDragEnd={(e) => { isPanningRef.current = false; onDragEnd(e); }}
                    onWheel={onWheel}
                    onClick={(e) => {
                        if (isPanningRef.current) return; // ignore clicks that were drags
                        handleStageClick(e);
                    }}
                    dragDistance={8}
                    onMouseMove={handleMove}
                    style={{ background: "#f8fafc" }}
                >
                    {/* base plan */}
                    <Layer ref={imageLayerRef} listening={false}>
                        {img && (
                            <KonvaImage
                                image={img}
                                width={img.width}
                                height={img.height}
                                listening={false}
                            />
                        )}
                    </Layer>

                    {/* zones (listening so clicks work) */}
                    <Layer listening={!isDrawing && !snapPt} ref={zonesLayerRef}>
                        {zones.map((z) => {
                            const selected = selectedZoneId === z.id;
                            const fillColor = hexToRgba(z.colorHex ?? "#ff7f50", z.opacity ?? DEFAULT_ZONE_OPACITY);
                            const sw = z.strokeWidth ?? lineWidth;
                            const isEditingThis = editingLabel?.id === z.id;


                            const textWidth = z.labelW ?? 200; // fallback for legacy zones

                            return (
                                <Group
                                    key={z.id}
                                    onMouseEnter={() => {
                                        const stage = stageRef.current;
                                        stage?.container() && (stage.container().style.cursor = "pointer");
                                    }}
                                    onMouseLeave={() => {
                                        const stage = stageRef.current;
                                        stage?.container() && (stage.container().style.cursor = "default");
                                    }}
                                    onClick={(e) => {
                                        if (isDrawing || editingLabel || isPanningRef.current) return;
                                        e.cancelBubble = true;          // only stop Stage click, not Stage drag
                                        setSelectedZoneId(z.id);
                                    }}
                                >
                                    {/* main polygon */}
                                    <Line
                                        points={z.points}
                                        closed
                                        fill={fillColor}
                                        stroke={selected ? "#2563EB" : "black"}
                                        strokeWidth={selected ? Math.max(2, sw + 2) : sw}
                                        shadowForStrokeEnabled={false}
                                        perfectDrawEnabled={false}
                                    />
                                    {/* selection halo */}
                                    {selected && (
                                        <Line
                                            points={z.points}
                                            closed
                                            stroke="#3B82F6"
                                            strokeWidth={sw + 6}
                                            opacity={0.15}
                                        />
                                    )}
                                    {/* label (dblclick to edit) — no wrap, sized to measured width */}
                                    {!isEditingThis && (
                                        <Text
                                            key={`${z.id}:${z.title}`} // ensure remount on title change
                                            text={z.title}
                                            x={z.labelX}
                                            y={z.labelY}
                                            width={textWidth}
                                            height={LABEL_FONT_SIZE}
                                            fontSize={LABEL_FONT_SIZE}
                                            fontFamily={LABEL_FONT_FAMILY}
                                            fontStyle={LABEL_FONT_STYLE}
                                            align="center"
                                            verticalAlign="middle"
                                            wrap="none"
                                            fill="#000"
                                            listening
                                            onDblClick={(e) => startEditLabel(e, z)}
                                            onDblTap={(e) => startEditLabel(e, z)}
                                        />
                                    )}
                                    {snapPt && !editingLabel && (
                                        <Circle x={snapPt.x} y={snapPt.y} radius={Math.max(4, lineWidth)} fill="#14b8a6" stroke="white" strokeWidth={2} />
                                    )}
                                </Group>
                            );
                        })}

                        {/* live preview (stroke only) */}
                        {currentPts.length > 0 && !editingLabel && (
                            <>
                                <Line
                                    points={[
                                        ...currentPts,
                                        ...(hoverPt ? [hoverPt.x, hoverPt.y] : []),
                                    ]}
                                    stroke="#000"
                                    strokeWidth={lineWidth}
                                    dash={[10, 6]}
                                />
                                {currentPts.map((v, i) =>
                                    i % 2 === 0 ? (
                                        <Circle
                                            key={i}
                                            x={currentPts[i]}
                                            y={currentPts[i + 1]}
                                            radius={Math.max(4, lineWidth)}
                                            fill={i === 0 ? "#10B981" : "#111827"}
                                        />
                                    ) : null
                                )}
                                {hoverPt && (
                                    <Circle
                                        x={hoverPt.x}
                                        y={hoverPt.y}
                                        radius={Math.max(4, lineWidth - 1)}
                                        fill="#2563EB"
                                    />
                                )}
                            </>
                        )}
                    </Layer>

                    {/* pins */}
                    <Layer listening={false} visible={showPins}>
                        {pins.map((p) => {
                            const { x, y } = toPx(p);
                            const statusColor = ({
                                new: "#8B5CF6",
                                in_progress: "#F59E0B",
                                done: "#22C55E",
                                checked: "#3B82F6",
                                blocked: "#E11D48",
                                cancelled: "#6B7280",
                            }[p.status]) || "#3B82F6";
                            return (
                                <Pin
                                    key={p.id}
                                    x={x}
                                    y={y}
                                    label={p.code || p.title || String(p.id)}
                                    color={statusColor}
                                    invScale={1 / scale}
                                    opacity={1}
                                />
                            );
                        })}
                    </Layer>
                </Stage>
            )}

            {error && (
                <div className="absolute bottom-2 left-2 z-10 text-red-600 text-xs">
                    {error}
                </div>
            )}
            {openConfirm && (
                <div
                    className="fixed inset-0 z-50 text-black flex items-center justify-center bg-black/50 backdrop-blur-sm"
                    onKeyDown={(e) => {
                        if (e.key === "Escape") setOpenConfirm(false);
                    }}
                >
                    <div
                        className="bg-white w-full max-w-md mx-4 rounded-2xl shadow-2xl border border-black/10"
                        role="dialog"
                        aria-modal="true"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 pt-6">
                            <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-full border border-black flex items-center justify-center bg-emerald-50">
                                    <span className="text-emerald-700 text-lg">✓</span>
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold">Confirmă salvarea zonelor</h3>
                                    <p className="text-xs text-gray-500">Denumește modelul ca să-l poți refolosi.</p>
                                </div>
                            </div>

                        </div>

                        {/* Form */}
                        <form
                            onSubmit={async (e) => {
                                e.preventDefault();
                                if (!zoneTitle.trim()) {
                                    alert("Titlul zonei este obligatoriu.");
                                    return;
                                }
                                await saveZonesToServer();
                                setOpenConfirm(false);
                            }}
                            className="px-6 pb-6 pt-4 space-y-4"
                        >
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Titlu zonă</label>
                                <input
                                    type="text"
                                    required
                                    value={zoneTitle}
                                    onChange={(e) => setZoneTitle(e.target.value)}
                                    className="w-full rounded-xl px-3 py-2 border border-gray-300 focus:outline-none focus:ring-1 focus:ring-emerald-200 focus:border-emerald-500"
                                    placeholder="Ex: Pattern intrare / Z1"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Descriere zonă (opțional)</label>
                                <textarea
                                    value={zoneDescription}
                                    onChange={(e) => setZoneDescription(e.target.value)}
                                    rows={4}
                                    className="w-full rounded-xl px-3 py-2 border border-gray-300 focus:outline-none focus:ring-1 focus:ring-emerald-200 focus:border-emerald-500 resize-none"
                                    placeholder="Note utile despre pattern, versiune, etc."
                                />
                            </div>

                            {/* Actions */}
                            <div className="flex items-center justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setZoneTitle("");
                                        setZoneDescription("");
                                        setOpenConfirm(false);
                                    }}
                                    className="px-4 py-2 rounded-xl text-white border bg-red-600 hover:bg-red-700 border-black  focus:outline-none "
                                >
                                    Anulează
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 rounded-xl bg-emerald-600 text-white border border-black active:scale-[0.98] hover:bg-emerald-700 focus:outline-none"
                                >
                                    Confirmă
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}