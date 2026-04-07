// PlanUtils.jsx
// Rule: only things needed by MORE THAN ONE file live here.
// Elbow geometry → buildElbow.js
// Reducer geometry → buildReducer.js

import { computeElbowFromCorner } from "./PlanDrawer/Utils/BuildEblow.js";
import { buildReducerData, computeReducerGeometry } from "./PlanDrawer/Utils/BuildReducer.js";
import { querySnap } from "./PlanDrawer/Utils/Spanengine.js";

// re-export so existing importers don't break
export { computeElbowFromCorner, buildReducerData, computeReducerGeometry };

// ─── URL / date helpers ───────────────────────────────────────────────────────
export function toApiUrl(path, baseURL) {
  if (!path) return "";
  return new URL(path, baseURL).href;
}

export function fmtDateTime(isoOrSql) {
  if (!isoOrSql) return "";
  const d = new Date(isoOrSql);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function hexToRgba(hex, alpha = 0.3) {
  if (!hex) return `rgba(0,0,0,${alpha})`;
  let h = hex.replace("#", "");
  if (h.length === 3)
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function downloadDataURL(dataUrl, filename) {
  if (!dataUrl) return;
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

// ─── OSD / Konva coord helpers ────────────────────────────────────────────────
export function vpPointFromPointer(stage, viewer, OpenSeadragonRef) {
  const pos = stage?.getPointerPosition();
  if (!pos || !viewer) return null;
  const OSD = OpenSeadragonRef || window.OpenSeadragon;
  return viewer.viewport.pointFromPixel(new OSD.Point(pos.x, pos.y), true);
}

export function pixelToImagePoint(stage, viewer, OpenSeadragonRef) {
  const vp = vpPointFromPointer(stage, viewer, OpenSeadragonRef);
  if (!vp) return null;
  const img = viewer.viewport.viewportToImageCoordinates(vp);
  return { x: img.x, y: img.y };
}

export function imageToScreen(viewer, { x, y }) {
  if (!viewer) return null;
  const vp = viewer.viewport.imageToViewportCoordinates(x, y);
  const px = viewer.viewport.pixelFromPoint(vp, true);
  return { x: px.x, y: px.y };
}

export function exportVisibleCompositePNG(viewer, stage, pixelRatio = 2) {
  if (!viewer?.drawer?.canvas || !stage) return null;
  const osdCanvas = viewer.drawer.canvas;
  const baseW = osdCanvas.width,
    baseH = osdCanvas.height;
  const out = document.createElement("canvas");
  out.width = Math.max(1, Math.round(baseW * (pixelRatio / window.devicePixelRatio)));
  out.height = Math.max(1, Math.round(baseH * (pixelRatio / window.devicePixelRatio)));
  const ctx = out.getContext("2d");
  ctx.drawImage(osdCanvas, 0, 0, baseW, baseH, 0, 0, out.width, out.height);
  const stageCssW = stage.width();
  const scaleForKonva = baseW / Math.max(1, stageCssW);
  const stageCanvas = stage.toCanvas({ pixelRatio: scaleForKonva });
  ctx.drawImage(stageCanvas, 0, 0, stageCanvas.width, stageCanvas.height, 0, 0, out.width, out.height);
  return out.toDataURL("image/png");
}

// ─── Route helpers ────────────────────────────────────────────────────────────
export const hasValidRoute = (p) => coerceRouteArray(p?.route_json).length > 0;

export function coerceRouteArray(route_json) {
  if (!route_json) return [];
  let arr = route_json;
  try {
    arr = typeof route_json === "string" ? JSON.parse(route_json) : route_json;
  } catch {
    return [];
  }
  if (!Array.isArray(arr)) return [];
  return arr.filter((seg) => Array.isArray(seg?.points_pct) && seg.points_pct.length >= 4 && Number(seg?.width) > 0);
}

export function segPctToPx(seg, plan) {
  const ptsPct = seg.points_pct,
    ptsPx = [];
  for (let i = 0; i < ptsPct.length; i += 2) {
    ptsPx.push(ptsPct[i] * (plan?.width_px || 1), ptsPct[i + 1] * (plan?.height_px || 1));
  }
  return { points: ptsPx, width: Math.max(1, Number(seg.width) || 4), color: typeof seg.color === "string" ? seg.color : "#3B82F6" };
}

export function pointsPxToPct(points, widthPx, heightPx) {
  if (!widthPx || !heightPx) return [];
  const out = [];
  for (let i = 0; i < points.length; i += 2) out.push(points[i] / widthPx, points[i + 1] / heightPx);
  return out;
}

export function collectFinalSegments(routeDraft, segPoints, segColor, segWidth) {
  const base = Array.isArray(routeDraft?.segments) ? routeDraft.segments : [];
  const extra = Array.isArray(segPoints) && segPoints.length >= 4 ? [{ points: segPoints.slice(), color: segColor, width: segWidth }] : [];
  return base.concat(extra);
}

export function firstPointOfRoute(segList, currentSegPoints) {
  if (Array.isArray(segList) && segList.length > 0) {
    const p = segList[0]?.points || [];
    if (p.length >= 2) return { x: p[0], y: p[1] };
  }
  if (Array.isArray(currentSegPoints) && currentSegPoints.length >= 2) return { x: currentSegPoints[0], y: currentSegPoints[1] };
  return null;
}

// ─── Units & formatting ───────────────────────────────────────────────────────
export function pxToMeters(px, metersPerPx) {
  return metersPerPx ? metersPerPx * px : null;
}

export function formatMeters(m) {
  if (m == null) return "—";
  if (m < 1) return `${(m * 100).toFixed(2)} cm`;
  if (m < 1000) return `${m.toFixed(2)} m`;
  return `${(m / 1000).toFixed(3)} km`;
}

export function formatLengthMeters(meters) {
  if (meters == null || !isFinite(meters)) return "";
  if (meters < 1) {
    const cm = meters * 100;
    return `${cm.toFixed(cm < 10 ? 1 : 0)} cm`;
  }
  return `${meters.toFixed(2)} m`;
}

export const dnToPx = (dnText, M_PER_PX, pipeWidth) => {
  if (!M_PER_PX) return pipeWidth;
  const dnMm = parseFloat(String(dnText).trim().replace(",", "."));
  if (!dnMm || Number.isNaN(dnMm)) return pipeWidth;
  return dnMm / 1000 / M_PER_PX;
};

// ─── Vector / geometry ────────────────────────────────────────────────────────
export function norm(v) {
  const len = Math.hypot(v.x, v.y);
  if (len < 1e-6) return { x: 0, y: 0 };
  return { x: v.x / len, y: v.y / len };
}

export function snapToAngleStep(anchor, cand, stepDeg = 45) {
  const dx = cand.x - anchor.x,
    dy = cand.y - anchor.y;
  if (dx === 0 && dy === 0) return cand;
  const r = Math.hypot(dx, dy),
    ang = Math.atan2(dy, dx);
  const step = (stepDeg * Math.PI) / 180;
  const angSnap = Math.round(ang / step) * step;
  return { x: anchor.x + r * Math.cos(angSnap), y: anchor.y + r * Math.sin(angSnap) };
}

export function snapToAngleStepRelative(anchor, target, baseDir, stepDeg = 15) {
  const dx = target.x - anchor.x,
    dy = target.y - anchor.y;
  if (dx === 0 && dy === 0) return target;
  const r = Math.hypot(dx, dy);
  const stepRad = (stepDeg * Math.PI) / 180;
  const angBase = Math.atan2(baseDir.y, baseDir.x);
  let rel = Math.atan2(dy, dx) - angBase;
  if (rel <= -Math.PI) rel += 2 * Math.PI;
  if (rel > Math.PI) rel -= 2 * Math.PI;
  const angFinal = angBase + Math.round(rel / stepRad) * stepRad;
  return { x: anchor.x + r * Math.cos(angFinal), y: anchor.y + r * Math.sin(angFinal) };
}

export function closestPointOnSegment(px, py, ax, ay, bx, by) {
  const abx = bx - ax,
    aby = by - ay,
    apx = px - ax,
    apy = py - ay;
  const ab2 = abx * abx + aby * aby;
  let t = ab2 ? (apx * abx + apy * aby) / ab2 : 0;
  t = Math.max(0, Math.min(1, t));
  return { x: ax + t * abx, y: ay + t * aby, t };
}

export function polylineLengthPx(pts) {
  let len = 0;
  for (let i = 2; i < pts.length; i += 2) len += Math.hypot(pts[i] - pts[i - 2], pts[i + 1] - pts[i - 1]);
  return len;
}

export function totalPolylineLengthPx(segments) {
  let len = 0;
  for (const s of segments || []) len += polylineLengthPx(s.points || []);
  return len;
}

export function isColiniarAndSameDir(p0, p1, p2) {
  const v1 = { x: p1.x - p0.x, y: p1.y - p0.y };
  const v2 = { x: p2.x - p1.x, y: p2.y - p1.y };
  if (Math.abs(v1.x * v2.y - v1.y * v2.x) > 1e-6) return false;
  if (v1.x * v2.x + v1.y * v2.y <= 0) return false;
  return true;
}

export const ensureMinimumLen = (p0, p1, p2, minLen) => {
  if (p0) {
    const cross = (p1.x - p0.x) * (p2.y - p0.y) - (p1.y - p0.y) * (p2.x - p0.x);
    if (Math.abs(cross) < 1e-6) return p2;
  }
  const dx = p2.x - p1.x,
    dy = p2.y - p1.y;
  const len = Math.hypot(dx, dy);
  if (len >= minLen) return p2;
  const scale = minLen / (len || 1);
  return { x: p1.x + dx * scale, y: p1.y + dy * scale };
};

export function draftEdgesFromSegPoints(segPoints) {
  const edges = [];
  if (!Array.isArray(segPoints) || segPoints.length < 4) return edges;
  for (let i = 2; i < segPoints.length; i += 2) edges.push([segPoints[i - 2], segPoints[i - 1], segPoints[i], segPoints[i + 1]]);
  return edges;
}

// ─── Snapping (RBush-assisted) ────────────────────────────────────────────────
export function buildSnapIndexItems(segments) {
  const items = [];
  for (const s of segments || []) {
    const pts = s.points || [];
    for (let i = 2; i < pts.length; i += 2)
      items.push({ minX: Math.min(pts[i - 2], pts[i]), minY: Math.min(pts[i - 1], pts[i + 1]), maxX: Math.max(pts[i - 2], pts[i]), maxY: Math.max(pts[i - 1], pts[i + 1]), seg: s, i });
  }
  return items;
}

export function findSnapPointInIndex(imgX, imgY, index, searchRadiusPx, snapTolPx) {
  if (!index) return null;
  let best = null,
    bestDist = Infinity;
  const hits = index.search({ minX: imgX - searchRadiusPx, minY: imgY - searchRadiusPx, maxX: imgX + searchRadiusPx, maxY: imgY + searchRadiusPx });
  for (const h of hits) {
    const pts = h.seg.points,
      i = h.i;
    const cp = closestPointOnSegment(imgX, imgY, pts[i - 2], pts[i - 1], pts[i], pts[i + 1]);
    const d = Math.hypot(cp.x - imgX, cp.y - imgY);
    if (d < bestDist) {
      bestDist = d;
      best = cp;
    }
  }
  return best && bestDist <= snapTolPx ? best : null;
}

export function findSnapPointCombined(imgX, imgY, index, segPoints, avoid, snapSearchPx = 30, snapTolPx = 12) {
  let best = null,
    bestDist = Infinity;
  const byIndex = findSnapPointInIndex(imgX, imgY, index, snapSearchPx, snapTolPx);
  if (byIndex) {
    best = byIndex;
    bestDist = Math.hypot(byIndex.x - imgX, byIndex.y - imgY);
  }
  for (const [ax, ay, bx, by] of draftEdgesFromSegPoints(segPoints)) {
    const cp = closestPointOnSegment(imgX, imgY, ax, ay, bx, by);
    const d = Math.hypot(cp.x - imgX, cp.y - imgY);
    if (d < bestDist) {
      bestDist = d;
      best = cp;
    }
  }
  if (best && avoid && Math.hypot(best.x - avoid.x, best.y - avoid.y) < 1e-3) return null;
  return best && bestDist <= snapTolPx ? best : null;
}

export function snapFromRBush(x, y, idx, searchPx, tolPx) {
  if (!idx) return null;
  const hits = idx.search({ minX: x - searchPx, minY: y - searchPx, maxX: x + searchPx, maxY: y + searchPx });
  if (!hits?.length) return null;
  let best = null,
    bestD = Infinity;
  for (const h of hits) {
    const cp = closestPointOnSegment(x, y, h.seg.points[h.i - 2], h.seg.points[h.i - 1], h.seg.points[h.i], h.seg.points[h.i + 1]);
    const d = Math.hypot(cp.x - x, cp.y - y);
    if (d < bestD) {
      bestD = d;
      best = cp;
    }
  }
  return bestD <= tolPx ? best : null;
}

// ─── Constants (shared by click handlers + components) ───────────────────────
export const COT_VISUAL_FACTOR = 0.75;
export const STEP_DEG = 15;

// ─── Snap helper (shared by mousemove + click) ────────────────────────────────
export function applySnap(anchor, imgRaw, lastSeg, stepDeg) {
  let baseDir = { x: lastSeg.end.x - lastSeg.start.x, y: lastSeg.end.y - lastSeg.start.y };

  // T-JOINT LOGIC: If it's a seed segment (length 0), use the parent's refDir!
  if (Math.abs(baseDir.x) < 1e-6 && Math.abs(baseDir.y) < 1e-6) {
    if (lastSeg.refDir) {
      baseDir = lastSeg.refDir;
    } else {
      return snapToAngleStep(anchor, imgRaw, stepDeg);
    }
  } else {
    baseDir = norm(baseDir);
  }

  // This forces the new line to snap relative to the parent pipe!
  return snapToAngleStepRelative(anchor, imgRaw, baseDir, stepDeg);
}

// ─── Click result builder ─────────────────────────────────────────────────────
function makeResult(segs, overrides = {}) {
  return { nextSegs: segs, newElbows: [], newReducers: [], newTJoints: [], newYJoints: [], ...overrides };
}

// ─── Click handlers ───────────────────────────────────────────────────────────
function handleFirstClick(imgRaw, PIPE_COLOR, PIPE_WIDTH, currentDN) {
  return makeResult([{ id: crypto.randomUUID(), start: { ...imgRaw }, end: { ...imgRaw }, color: PIPE_COLOR, width: PIPE_WIDTH, dn: currentDN }]);
}

function handleColinearExtend(prevSegs, img) {
  const segs = [...prevSegs];
  segs[segs.length - 1] = { ...segs[segs.length - 1], end: { x: img.x, y: img.y } };
  return makeResult(segs);
}

//
// aici se face reductie, daca avem culaore diferita sau grosime diferita.
function handleColinearReducer(prevSegs, img, anchor, PIPE_WIDTH, PIPE_COLOR, COT_VISUAL_FACTOR, currentDN) {
  const segs = [...prevSegs];
  const lastSeg = segs[segs.length - 1];

  img = ensureMinimumLen(null, anchor, img, 2 * PIPE_WIDTH * COT_VISUAL_FACTOR);

  const vFwd = norm({ x: img.x - anchor.x, y: img.y - anchor.y });
  const reducer = buildReducerData(anchor, vFwd, lastSeg.width, PIPE_WIDTH, PIPE_COLOR, COT_VISUAL_FACTOR, currentDN, lastSeg.dn, lastSeg.color);

  // segs[segs.length - 1] = { ...lastSeg, end: { ...reducer.p0 } };
  segs.push({ id: crypto.randomUUID(), start: { ...anchor }, end: { x: img.x, y: img.y }, color: PIPE_COLOR, width: PIPE_WIDTH, dn: currentDN });

  return makeResult(segs, { newReducers: [reducer] });
}

//
// aici se face cot daca avem unghi specific
function handleElbow(prevSegs, img, anchor, PIPE_WIDTH, PIPE_COLOR, COT_VISUAL_FACTOR, STEP_DEG, currentDN) {
  const segs = [...prevSegs];
  const lastSeg = segs[segs.length - 1];
  const specChanged = PIPE_WIDTH !== lastSeg.width || PIPE_COLOR !== lastSeg.color;

  img = ensureMinimumLen(null, anchor, img, 2 * lastSeg.width * COT_VISUAL_FACTOR);
  // segment always uses OLD spec — elbow is on the old pipe
  segs.push({
    id: crypto.randomUUID(),
    start: { ...anchor },
    end: { x: img.x, y: img.y },
    color: lastSeg.color,
    width: lastSeg.width,
    dn: lastSeg.dn,
  });

  const s1 = segs[segs.length - 2];
  const s2 = segs[segs.length - 1];

  const elbowGeom = computeElbowFromCorner(s1.start, s1.end, s2.end, STEP_DEG, lastSeg.width, lastSeg.color, COT_VISUAL_FACTOR, lastSeg.dn);

  const newElbows = elbowGeom ? [{ id: crypto.randomUUID(), ...elbowGeom, seg1Id: s1.id, seg2Id: s2.id }] : [];

  if (!specChanged) {
    return makeResult(segs, { newElbows });
  }

  // spec changed → place reducer at the END of s2, along s2's direction
  // s2 goes from anchor → img, so the reducer sits at img pointing forward
  // We need a "forward" direction to place the reducer.
  // The reducer sits right at the end of s2 (img), extending along s2's direction.
  return applyReducerAfterElbow(segs, s2, PIPE_WIDTH, PIPE_COLOR, COT_VISUAL_FACTOR, newElbows, currentDN);
}

// facem reductie dupa cot, daca e nevoie, pentru a schimba culoarea/grosimea
// Places a reducer at the end of the elbow segment (s2),
// continuing in the same direction as s2.
function applyReducerAfterElbow(segs, elbowSeg, PIPE_WIDTH, PIPE_COLOR, COT_VISUAL_FACTOR, newElbows, currentDN) {
  // direction of the elbow segment
  const dx = elbowSeg.end.x - elbowSeg.start.x;
  const dy = elbowSeg.end.y - elbowSeg.start.y;
  const len = Math.hypot(dx, dy) || 1;
  const vFwd = { x: dx / len, y: dy / len };

  // reducer anchor = end of elbow segment
  const anchor = elbowSeg.end;

  const LEG_IN = elbowSeg.width * COT_VISUAL_FACTOR;
  const LEG_OUT = PIPE_WIDTH * COT_VISUAL_FACTOR;

  // ensure the elbow segment is long enough to accommodate the reducer's IN leg
  // if not, extend the segment end
  const minElbowLen = LEG_IN * 2;
  const curLen = Math.hypot(elbowSeg.end.x - elbowSeg.start.x, elbowSeg.end.y - elbowSeg.start.y);

  let segEnd = anchor;
  if (curLen < minElbowLen) {
    // push the end further along vFwd so the reducer fits
    segEnd = {
      x: elbowSeg.start.x + vFwd.x * minElbowLen,
      y: elbowSeg.start.y + vFwd.y * minElbowLen,
    };
    segs[segs.length - 1] = { ...elbowSeg, end: segEnd };
  }

  const reducer = buildReducerData(segEnd, vFwd, elbowSeg.width, PIPE_WIDTH, PIPE_COLOR, COT_VISUAL_FACTOR, currentDN, elbowSeg.dn, elbowSeg.color);

  // trim elbow segment end to reducer p0 so they butt up flush
  // segs[segs.length - 1] = { ...segs[segs.length - 1], end: { ...reducer.p0 } };

  // new segment after reducer in new spec
  // extend beyond reducer p1 by LEG_OUT so there's visible pipe after the reducer
  const afterReducer = {
    x: reducer.p1.x + vFwd.x * LEG_OUT,
    y: reducer.p1.y + vFwd.y * LEG_OUT,
  };

  segs.push({
    id: crypto.randomUUID(),
    start: { ...segEnd },
    end: afterReducer,
    color: PIPE_COLOR,
    width: PIPE_WIDTH,
    dn: currentDN,
  });

  return makeResult(segs, { newElbows, newReducers: [reducer] });
}
// ─── Orchestrator ─────────────────────────────────────────────────────────────
export function computePipeSegmentsForClick(prevSegs, imgRaw, shift, PIPE_WIDTH, PIPE_COLOR, COT_VISUAL_FACTOR = 0.75, STEP_DEG = 15, currentDN) {
  if (prevSegs.length === 0) return handleFirstClick(imgRaw, PIPE_COLOR, PIPE_WIDTH, currentDN);

  const lastSeg = prevSegs[prevSegs.length - 1];
  const anchor = lastSeg.end;
  const img = shift ? applySnap(anchor, imgRaw, lastSeg, STEP_DEG) : imgRaw;

  const isColiniar = isColiniarAndSameDir(lastSeg.start, lastSeg.end, img);
  if (isColiniar) {
    if (PIPE_COLOR === lastSeg.color && PIPE_WIDTH === lastSeg.width) return handleColinearExtend(prevSegs, img);
    return handleColinearReducer(prevSegs, img, anchor, PIPE_WIDTH, PIPE_COLOR, COT_VISUAL_FACTOR, currentDN);
  }

  // future T/Y handlers go here

  return handleElbow(prevSegs, img, anchor, PIPE_WIDTH, PIPE_COLOR, COT_VISUAL_FACTOR, STEP_DEG, currentDN);
}

// ─── Measure HUD ─────────────────────────────────────────────────────────────
export function computeMeasureInfo(pipeSegments, hoverPoint, mPerPx) {
  if (!hoverPoint) return null;
  const segCount = pipeSegments?.length || 0;
  const lastSeg = segCount > 0 ? pipeSegments[segCount - 1] : null;
  const anchor = lastSeg?.end ?? null;
  let angleDeg = 0;

  if (segCount >= 1 && anchor) {
    const v2x = hoverPoint.x - anchor.x,
      v2y = hoverPoint.y - anchor.y;
    let v1x = lastSeg.end.x - lastSeg.start.x;
    let v1y = lastSeg.end.y - lastSeg.start.y;

    // Use the parent's angle for the HUD if it's the start of a T-Joint
    if (Math.abs(v1x) < 1e-6 && Math.abs(v1y) < 1e-6 && lastSeg.refDir) {
      v1x = lastSeg.refDir.x;
      v1y = lastSeg.refDir.y;
    }

    const len1 = Math.hypot(v1x, v1y),
      len2 = Math.hypot(v2x, v2y);
    if (len1 > 1e-6 && len2 > 1e-6) {
      const ux1 = v1x / len1,
        uy1 = v1y / len1;
      const ux2 = v2x / len2,
        uy2 = v2y / len2;
      angleDeg = Math.abs((Math.atan2(ux1 * uy2 - uy1 * ux2, ux1 * ux2 + uy1 * uy2) * 180) / Math.PI);
    } else {
      angleDeg = Math.abs((Math.atan2(v2y, v2x) * 180) / Math.PI);
    }
  }

  const scale = mPerPx || 0;
  let segLenM = anchor ? Math.hypot(hoverPoint.x - anchor.x, hoverPoint.y - anchor.y) * scale : 0;
  let totalLenM = segLenM;
  for (const seg of pipeSegments || []) totalLenM += Math.hypot(seg.end.x - seg.start.x, seg.end.y - seg.start.y) * scale;

  const fmt = (m) => {
    if (!m || m <= 0) return "0 cm";
    if (m < 1) return `${Math.round(m * 100)} cm`;
    return `${m.toFixed(2)} m`;
  };

  return { x: hoverPoint.x, y: hoverPoint.y, angleDeg, segLenM, totalLenM, segLabel: fmt(segLenM), totalLabel: fmt(totalLenM) };
}

/**
 * Reorder a chain's segments so that `match.side` of `match.segIndex`
 * becomes the tail (end of last segment).
 */
export function reorderChainToTail(chain, match) {
  const segs = chain.segments;
  const { segIndex, side } = match;

  // Already correct — tail is the end of the last segment
  if (side === "end" && segIndex === segs.length - 1) return chain;

  // Head reattach: Reverse segments to flow backward, but LEAVE reducers alone!
  // am inversat senul, dar si intern start si end pentru ca sunt tot obiecte !
  if (side === "start" && segIndex === 0) {
    const reversedSegs = [...segs].reverse().map((s) => ({
      ...s,
      start: { ...s.end },
      end: { ...s.start },
    }));
    return { ...chain, segments: reversedSegs };
  }

  // nu folosim acum
  // Mid-segment reattach (internal point) — keep segments before + reverse up to match
  if (side === "end") {
    const kept = segs.slice(0, segIndex + 1);
    const tail = segs
      .slice(segIndex + 1)
      .reverse()
      .map((s) => ({
        ...s,
        start: { ...s.end },
        end: { ...s.start },
      }));
    return { ...chain, segments: [...kept, ...tail] };
  }

  // nici aici
  // side === "start", segIndex > 0: reverse [0..segIndex], keep the rest
  const before = segs.slice(0, segIndex + 1);
  const after = segs.slice(segIndex + 1);
  const reversed = [...before].reverse().map((s) => ({
    ...s,
    start: { ...s.end },
    end: { ...s.start },
  }));
  return { ...chain, segments: [...reversed, ...after] };
}

/**
 * Returns the two "free" endpoints of a chain:
 * head = start of first non-zero segment
 * tail = end of last non-zero segment
 * Seed segments (start===end) are ignored.
 */
export function chainEndpoints(chain) {
  const real = chain.segments.filter((s) => Math.hypot(s.end.x - s.start.x, s.end.y - s.start.y) >= 1e-3);
  if (real.length === 0) return null;
  return {
    head: real[0].start,
    tail: real[real.length - 1].end,
  };
}

export function findTJointSnap(chains, clickPoint, snapTolPx = 2) {
  for (let ci = 0; ci < chains.length; ci++) {
    const c = chains[ci];
    for (let si = 0; si < c.segments.length; si++) {
      const seg = c.segments[si];

      const cp = closestPointOnSegment(clickPoint.x, clickPoint.y, seg.start.x, seg.start.y, seg.end.x, seg.end.y);

      if (Math.hypot(cp.x - clickPoint.x, cp.y - clickPoint.y) <= snapTolPx) {
        // Ensure we didn't click the absolute tips (Head/Tail handle those)
        if (Math.hypot(clickPoint.x - seg.start.x, clickPoint.y - seg.start.y) > 1e-3 && Math.hypot(clickPoint.x - seg.end.x, clickPoint.y - seg.end.y) > 1e-3) {
          // Calculate the exact direction of the parent pipe
          const refDir = norm({ x: seg.end.x - seg.start.x, y: seg.end.y - seg.start.y });
          return { targetChain: c, segment: seg, point: cp, refDir };
        }
      }
    }
  }
  return null;
}

// PlanUtils.jsx (adaugă la final)

/**
 * Verifică dacă direcția trasată (vBranch) este perpendiculară pe direcția de bază (vMain).
 * Folosește o toleranță mică pentru a permite imperfecțiuni de snapping.
 */
export function isValidTJointAngle(vMain, vBranch, tolerance = 0.1) {
  if (!vMain || !vBranch) return false;
  // Produsul scalar (dot product) trebuie să fie aproape de 0 pentru 90 de grade
  const dotProduct = vMain.x * vBranch.x + vMain.y * vBranch.y;
  return Math.abs(dotProduct) <= tolerance;
}

/**
 * Generează un obiect de tip T-Joint pentru a fi adăugat în state.
 */
/**
 * MODIFICAT: Acum acceptă un parametru "type" (default 'T') pentru a ști ce desenăm.
 */
export function createTJointRecord(targetChainId, newChainId, anchorPoint, vMain, vBranch, dMain, dnMain, dBranch, dnBranch, color, type = "T") {
  return {
    id: crypto.randomUUID(),
    parentChainId: targetChainId,
    branchChainId: newChainId,
    anchor: { ...anchorPoint },
    vMain: vMain,
    vBranch: vBranch,
    dMain: dMain,
    dnMain: dnMain,
    dBranch: dBranch,
    dnBranch: dnBranch,
    color: color,
    type: type, // <--- Salvăm dacă e T sau Y
  };
}

// * Produsul scalar (cosinusul unghiului) pentru 45° este ~0.707.
//  */
export function isValidYJointAngle(vMain, vBranch, tolerance = 0.15) {
  if (!vMain || !vBranch) return false;
  const dotProduct = vMain.x * vBranch.x + vMain.y * vBranch.y;
  const targetDot = Math.cos(45 * (Math.PI / 180)); // 0.7071
  // Verificăm valoarea absolută pentru a permite Y-ul în ambele sensuri de curgere (+45° și -45°/135°)
  return Math.abs(Math.abs(dotProduct) - targetDot) <= tolerance;
}
// PlanUtils.jsx (la final)

/**
 * Calculează punctul exact unde trebuie să ajungă mouse-ul/click-ul,
 * ținând cont de Shift (90 grade) și de proiecția peste alte țevi.
 */
export function resolveDrawingPoint(imgRaw, lastSeg, isShiftPressed, snapIndex, STEP_DEG) {
  const excludeId = lastSeg?.id ?? null;
  let snap = querySnap(snapIndex, imgRaw.x, imgRaw.y, excludeId);
  let resolvedPoint = snap.snapped ?? imgRaw;

  // Dacă avem o țeavă începută și ținem SHIFT
  if (isShiftPressed && lastSeg) {
    const perfectPt = applySnap(lastSeg.end, imgRaw, lastSeg, STEP_DEG);

    if (snap.snapped) {
      // Proiectăm snap-ul pe axa perfectă de 90 de grade
      const dir = norm({ x: perfectPt.x - lastSeg.end.x, y: perfectPt.y - lastSeg.end.y });
      const dx = snap.snapped.x - lastSeg.end.x;
      const dy = snap.snapped.y - lastSeg.end.y;
      const dist = dx * dir.x + dy * dir.y;

      resolvedPoint = { x: lastSeg.end.x + dir.x * dist, y: lastSeg.end.y + dir.y * dist };
      snap = { ...snap, snapped: resolvedPoint };
    } else {
      resolvedPoint = perfectPt;
    }
  }

  return { resolvedPoint, snap };
}

/**
 * Create a fresh empty chain with a stable UUID.
 * Replaces the inline `{ id: crypto.randomUUID(), elbows: [], reducers: [], segments: [...] }`
 * literals that were scattered across PlanDrawer's click handlers.
 *
 * Usage:
 *   makeChain({ segments: [seedSeg] })
 *   makeChain({ segments: [seedSeg], elbows: [], reducers: [] })
 */
export function makeChain(overrides = {}) {
  return {
    id: crypto.randomUUID(),
    segments: [],
    elbows: [],
    reducers: [],
    ...overrides,
  };
}

// ─── Endpoint reattach helper ─────────────────────────────────────────────────

/**
 * Search every chain's head and tail for the closest one within `tol`
 * image-coord pixels of `clickPoint` (the already-snapped cursor position).
 *
 * Returns { chainIndex, segIndex, side:"start"|"end" } or null.
 *
 * Note: unlike the branch-check version, this receives the SNAPPED clickPoint
 * (not imgRaw) because the detached handler already resolved it via querySnap.
 * That matches the original doc-10 behaviour where the endpoint loop used
 * `clickPoint` (snap.snapped ?? imgRaw).
 */
export function findBestEndpointMatch(chains, clickPoint, tol) {
  let bestMatch = null;
  let bestDist = tol;

  for (let ci = 0; ci < chains.length; ci++) {
    const ep = chainEndpoints(chains[ci]);
    if (!ep) continue;

    const dTail = Math.hypot(clickPoint.x - ep.tail.x, clickPoint.y - ep.tail.y);
    const dHead = Math.hypot(clickPoint.x - ep.head.x, clickPoint.y - ep.head.y);

    if (dTail < bestDist) {
      // suntem mai aproape de coada — dam reorder ca tail sa devina activ
      bestDist = dTail;
      const segs = chains[ci].segments;
      const lastRealIdx = segs.reduceRight((found, s, i) => (found === -1 && Math.hypot(s.end.x - s.start.x, s.end.y - s.start.y) >= 1e-3 ? i : found), -1);
      bestMatch = { chainIndex: ci, segIndex: lastRealIdx, side: "end" };
    }

    if (dHead < bestDist) {
      // suntem mai aproape de cap — reorderChainToTail va inversa lantul
      bestDist = dHead;
      bestMatch = { chainIndex: ci, segIndex: 0, side: "start" };
    }
  }

  return bestMatch;
}

/**
 * Scanează toate elementele de pe planșă pentru a găsi pe ce am dat click.
 * Prioritate (ce e deasupra câștigă): T-Joints -> Coturi -> Reducții -> Țevi.
 */
export function findItemAtPoint(chains, tJoints, pt, tolPx = 5) {
  // 1. Verificăm T-Joints / Y-Joints
  for (const tj of tJoints) {
    if (Math.hypot(tj.anchor.x - pt.x, tj.anchor.y - pt.y) <= tj.dMain / 2 + tolPx) {
      return { ...tj, itemType: "tjoint" };
    }
  }

  // 2. Parcurgem lanțurile invers (cele mai noi desenate primele)
  for (let i = chains.length - 1; i >= 0; i--) {
    const c = chains[i];

    // Coturi
    for (const el of c.elbows) {
      if (el.corner && Math.hypot(el.corner.x - pt.x, el.corner.y - pt.y) <= el.width / 2 + tolPx) {
        return { ...el, itemType: "elbow", chainId: c.id };
      }
    }

    // Reducții
    for (const r of c.reducers) {
      const cp = closestPointOnSegment(pt.x, pt.y, r.p0.x, r.p0.y, r.p1.x, r.p1.y);
      if (Math.hypot(cp.x - pt.x, cp.y - pt.y) <= Math.max(r.dIn, r.dOut) / 2 + tolPx) {
        console.log("Clicked on reducer", r);
        return { ...r, itemType: "reducer", chainId: c.id };
      }
    }

    // Țevi (Segmente)
    for (const s of c.segments) {
      const len = Math.hypot(s.end.x - s.start.x, s.end.y - s.start.y);
      if (len < 1e-3) continue; // Ignorăm semințele (punctele)
      const cp = closestPointOnSegment(pt.x, pt.y, s.start.x, s.start.y, s.end.x, s.end.y);
      if (Math.hypot(cp.x - pt.x, cp.y - pt.y) <= s.width / 2 + tolPx) {
        return { ...s, itemType: "segment", chainId: c.id };
      }
    }
  }

  return null; // Nu am dat click pe nimic
}
