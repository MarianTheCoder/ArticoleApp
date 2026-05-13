// snapEngine.js — spatial snap engine using RBush
//
// SCALABILITY:
//   - Index rebuilt once per click: O(n log n)
//   - Query per mousemove: O(log n + k), k = nearby hits (usually 0-3)
//   - Works fine at 100,000+ segments
//
// ELBOW MIDPOINT SNAP:
//   - The outer tip of each elbow (midpoint of outlineTop) is indexed as a
//     named point ("elbowMid"). It snaps just like start/end/mid points.
//   - When the cursor is near an elbow mid-point, line snapping is suppressed
//     for the two segments that form that elbow corner, so the segment body
//     underneath doesn't compete with the elbow tip.

import RBush from "rbush";
import { closestPointOnSegment } from "../../PlanUtils.jsx";

// ─── Priority Map (Higher number wins ties) ──────────────────────────────────
const SNAP_PRIORITY = {
  elbowMid: 3,
  elbowStart: 2,
  elbowEnd: 2,
  start: 1,
  end: 1,
  mid: 0,
};
// ─── snap config ─────────────────────────────────────────────────────────────
const SNAP_RADIUS_PX = 4; // image-coord pixels — snap activates within this distance
const POINT_SNAP_BONUS = 1; // key points (start/end/mid/elbowMid) snap from further away

// How far (in image px) from an elbow point item before we stop suppressing
// line snap for the elbow's parent segments. Keep it >= SNAP_RADIUS_PX + POINT_SNAP_BONUS.
const ELBOW_SUPPRESS_RADIUS = SNAP_RADIUS_PX + POINT_SNAP_BONUS + 1;

// ─── index item shapes ───────────────────────────────────────────────────────

// Segment bounding box — padded so nearby queries catch it
function segItem(seg) {
  const pad = SNAP_RADIUS_PX;
  return {
    minX: Math.min(seg.start.x, seg.end.x) - pad,
    minY: Math.min(seg.start.y, seg.end.y) - pad,
    maxX: Math.max(seg.start.x, seg.end.x) + pad,
    maxY: Math.max(seg.start.y, seg.end.y) + pad,
    type: "seg",
    seg,
  };
}

// Key point (start / end / mid / elbowMid) — small box around the point.
// `suppressSegIds`: optional Set of segment IDs whose line-snap should be
// suppressed when this point is within range. Used for elbow midpoints so
// the pipe bodies underneath don't win over the elbow tip.
function pointItem(x, y, kind, ref, suppressSegIds = null) {
  const pad = SNAP_RADIUS_PX + POINT_SNAP_BONUS;
  return {
    minX: x - pad,
    minY: y - pad,
    maxX: x + pad,
    maxY: y + pad,
    type: "point",
    kind, // "start" | "end" | "mid" | "elbowStart" | "elbowEnd" | "elbowMid"
    x,
    y,
    ref, // the seg or elbow object — useful for later
    suppressSegIds, // Set<string> | null — seg IDs to block from line snap
  };
}

// ─── elbow midpoint extraction ────────────────────────────────────────────────

/**
 * Returns the CENTER of the elbow bend — the original corner point (pCurr)
 * passed to computeElbowFromCorner. This is the geometric center of the
 * fitting, NOT the outer tip.
 *
 * Priority:
 *   1. elbow.corner — pCurr stored explicitly (add it in buildElbow return)
 *   2. midpoint of elbow.start + elbow.end — always available, good fallback
 */
function getElbowMidPoint(elbow) {
  // 1. explicit corner point = pCurr, the true center of the bend
  if (elbow.corner && Number.isFinite(elbow.corner.x)) return elbow.corner;
  // 2. midpoint of the two fitting leg endpoints — decent geometric fallback
  if (elbow.start && elbow.end) {
    return {
      x: (elbow.start.x + elbow.end.x) / 2,
      y: (elbow.start.y + elbow.end.y) / 2,
    };
  }
  return null;
}

// ─── build index ─────────────────────────────────────────────────────────────
// Call this after every click (when pipeSegments/elbows change).
// Returns a new RBush instance — store it in snapIndexRef.current.
export function buildSnapIndex(pipeSegments, elbows) {
  const tree = new RBush();
  const items = [];

  // ── Segments — bounding box + 3 key points ──────────────────────────────
  for (const seg of pipeSegments) {
    const dx = seg.end.x - seg.start.x;
    const dy = seg.end.y - seg.start.y;
    const len = Math.hypot(dx, dy);
    if (len < 1e-3) continue; // skip zero-length seed segments
    items.push(segItem(seg));
    items.push(pointItem(seg.start.x, seg.start.y, "start", seg));
    items.push(pointItem(seg.end.x, seg.end.y, "end", seg));
    items.push(pointItem((seg.start.x + seg.end.x) / 2, (seg.start.y + seg.end.y) / 2, "mid", seg));
  }

  // ── Elbows — start, end, and the outer tip (elbowMid) ───────────────────
  // The elbowMid point suppresses line snap for the two parent segments so
  // the pipe bodies underneath don't compete with the elbow corner snap.
  for (const elbow of elbows) {
    // Collect the IDs of the segments that form this elbow corner.
    // buildElbow stores them as elbow.seg1Id / elbow.seg2Id (if available),
    // or we can fall back to suppressing nothing (still snaps correctly,
    // just won't suppress the line underneath).
    const suppressIds = new Set();
    if (elbow.seg1Id) suppressIds.add(elbow.seg1Id);
    if (elbow.seg2Id) suppressIds.add(elbow.seg2Id);
    const suppress = suppressIds.size > 0 ? suppressIds : null;

    // ── Elbow midpoint (outer tip) ─────────────────────────────────────────
    // This is the most useful snap point on an elbow — the outermost corner.
    // It is saved so users can snap back to an elbow tip precisely.
    const mid = getElbowMidPoint(elbow);
    if (mid) {
      items.push(pointItem(mid.x, mid.y, "elbowMid", elbow, suppress));
    }
  }
  tree.load(items); // bulk load — much faster than inserting one by one
  return tree;
}

// ─── query ────────────────────────────────────────────────────────────────────
// Call this on every mousemove with the current image-coord cursor position.
// Returns: { snapped: {x, y}, type: "point"|"line"|null, kind: string|null }
// If no snap: returns { snapped: null, type: null, kind: null }
export function querySnap(tree, cx, cy, excludeSegId = null) {
  if (!tree) return { snapped: null, type: null, kind: null };

  const r = SNAP_RADIUS_PX + POINT_SNAP_BONUS;
  const hits = tree.search({ minX: cx - r, minY: cy - r, maxX: cx + r, maxY: cy + r });

  if (!hits.length) return { snapped: null, type: null, kind: null };

  let bestPoint = null;
  let bestPointDist = Infinity;
  let bestPointPriority = -1; // <--- ADDED: Track who is the boss

  let bestLine = null;
  let bestLineDist = Infinity;

  const suppressedSegIds = new Set();

  // ── First pass: find best point snap + collect suppressions ───────────────
  for (const h of hits) {
    if (h.type !== "point") continue;

    const d = Math.hypot(h.x - cx, h.y - cy);
    const threshold = SNAP_RADIUS_PX + POINT_SNAP_BONUS;

    if (d <= threshold) {
      const priority = SNAP_PRIORITY[h.kind] ?? 0;

      // Treat points within 1px of each other as being in the "same spot"
      const isCloser = d < bestPointDist - 1;
      const isSameSpotButBetter = Math.abs(d - bestPointDist) <= 1 && priority > bestPointPriority;

      if (isCloser || isSameSpotButBetter || bestPoint === null) {
        bestPointDist = d;
        bestPoint = h;
        bestPointPriority = priority;
      }
    }

    if (h.suppressSegIds && d <= ELBOW_SUPPRESS_RADIUS) {
      for (const id of h.suppressSegIds) suppressedSegIds.add(id);
    }
  }

  // ── Second pass: find best line snap (respecting suppressions) ────────────
  for (const h of hits) {
    if (h.type !== "seg") continue;

    if (excludeSegId && h.seg.id === excludeSegId) continue;
    if (suppressedSegIds.has(h.seg.id)) continue;

    const cp = closestPointOnSegment(cx, cy, h.seg.start.x, h.seg.start.y, h.seg.end.x, h.seg.end.y);
    const d = Math.hypot(cp.x - cx, cp.y - cy);
    if (d <= SNAP_RADIUS_PX && d < bestLineDist) {
      bestLineDist = d;
      bestLine = { x: cp.x, y: cp.y, seg: h.seg };
    }
  }

  // Point snap always wins over line snap
  if (bestPoint) {
    return { snapped: { x: bestPoint.x, y: bestPoint.y }, type: "point", kind: bestPoint.kind, ref: bestPoint.ref };
  }
  if (bestLine) {
    return { snapped: { x: bestLine.x, y: bestLine.y }, type: "line", kind: "online" };
  }

  return { snapped: null, type: null, kind: null };
}
