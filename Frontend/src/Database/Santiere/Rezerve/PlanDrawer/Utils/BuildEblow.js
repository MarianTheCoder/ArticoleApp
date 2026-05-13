// buildElbow.js — pure elbow geometry, no React, no state
// Used by: handleElbow (click logic in PlanUtils)
// Rendered by: Elbows.jsx

import { norm } from "../../PlanUtils.jsx";

export function computeElbowFromCorner(pPrev, pCurr, pNext, stepDeg, pipeWidth, pipe_color, cotLen, currentDN) {
  const vIn = { x: pCurr.x - pPrev.x, y: pCurr.y - pPrev.y };
  const vOut = { x: pNext.x - pCurr.x, y: pNext.y - pCurr.y };

  const lenIn = Math.hypot(vIn.x, vIn.y);
  const lenOut = Math.hypot(vOut.x, vOut.y);
  if (lenIn < 1e-3 || lenOut < 1e-3) return null;

  const nIn = { x: vIn.x / lenIn, y: vIn.y / lenIn };
  const nOut = { x: vOut.x / lenOut, y: vOut.y / lenOut };

  const dot = nIn.x * nOut.x + nIn.y * nOut.y;
  const cosTheta = Math.max(-1, Math.min(1, dot));
  const thetaDeg = Math.abs((Math.acos(cosTheta) * 180) / Math.PI);
  const snappedDeg = Math.round(thetaDeg / stepDeg) * stepDeg;
  if (snappedDeg < stepDeg || snappedDeg > 90 || Math.abs(thetaDeg - snappedDeg) > 0.5) return null;

  const edgeWidth = Math.max(1.5, pipeWidth / 8);
  const borderWidth = edgeWidth;
  const outerRadius = pipeWidth / 2 + edgeWidth;
  const rPath = outerRadius - borderWidth / 2;
  const LEG = pipeWidth * cotLen;

  // pipe normals
  const perpIn = { x: -nIn.y, y: nIn.x };
  const perpOut = { x: -nOut.y, y: nOut.x };

  // start / end centers of the fitting
  const start = { x: pCurr.x - nIn.x * LEG, y: pCurr.y - nIn.y * LEG };
  const end = { x: pCurr.x + nOut.x * LEG, y: pCurr.y + nOut.y * LEG };

  // ── 4 base rectangle corners (same as rect version) ──────────────────────
  const A0 = { x: start.x + perpIn.x * rPath, y: start.y + perpIn.y * rPath }; // start top
  const A1 = { x: start.x - perpIn.x * rPath, y: start.y - perpIn.y * rPath }; // start bot
  const B0 = { x: end.x + perpOut.x * rPath, y: end.y + perpOut.y * rPath }; // end top
  const B1 = { x: end.x - perpOut.x * rPath, y: end.y - perpOut.y * rPath }; // end bot

  // ── THE KEY: extend the outer corner past pCurr ───────────────────────────
  // The outer corner of the fitting is where the two outer edges meet.
  // We extend nIn from A0 and -nOut from B0 until they intersect.
  // That intersection point sticks out past pCurr — making it look like
  // a real elbow fitting that has material at the bend.
  //
  // Line intersection: A0 + t*nIn = B0 + s*(-nOut)
  // solve for t using 2D cross product
  function intersect(p1, d1, p2, d2) {
    const cross = d1.x * d2.y - d1.y * d2.x;
    if (Math.abs(cross) < 1e-9) {
      // parallel fallback — just use pCurr offset
      return { x: pCurr.x + perpIn.x * rPath, y: pCurr.y + perpIn.y * rPath };
    }
    const dx = p2.x - p1.x,
      dy = p2.y - p1.y;
    const t = (dx * d2.y - dy * d2.x) / cross;
    return { x: p1.x + t * d1.x, y: p1.y + t * d1.y };
  }

  // outer corner — where the two outer edges meet (sticks out)
  const outerCorner = intersect(A0, nIn, B0, { x: -nOut.x, y: -nOut.y });
  // inner corner — where the two inner edges meet (cuts in)
  const innerCorner = intersect(A1, nIn, B1, { x: -nOut.x, y: -nOut.y });

  // ── polygon: A0 → outerCorner → B0 → B1 → innerCorner → A1 ──────────────
  // outlineTop    = top path    (renderer draws top[0..n])
  // outlineBottom = bottom path (renderer draws bottom[n..0] reversed)
  const outlineTop = [A0, outerCorner, B0];
  const outlineBottom = [A1, innerCorner, B1];

  return {
    start,
    end,
    cp1: start,
    cp2: end,
    color: pipe_color,
    width: pipeWidth,
    corner: { x: pCurr.x, y: pCurr.y },
    LEG,
    outlineTop,
    outlineBottom,
    dn: currentDN,
  };
}
