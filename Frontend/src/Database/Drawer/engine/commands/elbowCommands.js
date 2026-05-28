import { createId } from "../ids.js";
import { getPipeEdgePx } from "../geometry/pipeMetrics.js";
import { angleBetweenDeg, dot, movePoint, normalizeAngleDeg, vectorToDeg } from "../geometry/vector.js";
import { getNearestElbowTemplate } from "../templates/elbowTemplates.js";
import { FITTING_LEG_FACTOR, getFittingClearancePx } from "./fittingClearance.js";

// Elbows can only use these bend angles.
export const ALLOWED_ELBOW_ANGLES = [15, 30, 45, 60, 75, 90];

// Maximum angle mismatch accepted for an elbow.
export const ELBOW_ANGLE_TOLERANCE_DEG = 3;

// Backward-compatible elbow factor alias.
export const ELBOW_LEG_FACTOR = FITTING_LEG_FACTOR;

// Dot tolerance for straight continuation.
export const STRAIGHT_DOT_TOL = 0.99;

// Returns deterministic elbow leg length.
export function getElbowLegPx(pipeWidthPx) {
  return getFittingClearancePx(pipeWidthPx);
}

// Visual clearance includes half the butt-cap outline stroke.
export function getElbowVisualClearancePx(pipeWidthPx) {
  return getElbowLegPx(pipeWidthPx) + getPipeEdgePx(pipeWidthPx) / 2;
}

// Minimum raw segment distance between consecutive elbows.
export function getMinDistanceBetweenElbowsPx(pipeWidthPx) {
  return getElbowLegPx(pipeWidthPx) * 2;
}

// Returns the allowed elbow angle or null for invalid bends.
export function getAllowedElbowAngleDeg(prevDir, newDir) {
  if (!prevDir || !newDir) return null;

  const angle = angleBetweenDeg(prevDir, newDir);

  if (angle < 1) return null;
  if (angle > 90 + ELBOW_ANGLE_TOLERANCE_DEG) return null;

  let best = null;
  let bestDiff = Infinity;

  for (const allowed of ALLOWED_ELBOW_ANGLES) {
    const diff = Math.abs(angle - allowed);

    if (diff < bestDiff) {
      best = allowed;
      bestDiff = diff;
    }
  }

  return bestDiff <= ELBOW_ANGLE_TOLERANCE_DEG ? best : null;
}

// Checks if direction change needs a valid elbow.
export function shouldCreateElbow(prevDir, newDir) {
  if (!prevDir || !newDir) return false;
  if (dot(prevDir, newDir) >= STRAIGHT_DOT_TOL) return false;

  return getAllowedElbowAngleDeg(prevDir, newDir) != null;
}

// Returns exact visual cut points around an elbow corner.
export function getElbowTrimPoints({ corner, incomingDir, outgoingDir, pipeWidthPx, incomingWidthPx = pipeWidthPx, outgoingWidthPx = pipeWidthPx }) {
  const incomingClearance = getFittingClearancePx(incomingWidthPx);
  const outgoingClearance = getFittingClearancePx(outgoingWidthPx);
  const incomingClearancePx = incomingClearance + getPipeEdgePx(incomingWidthPx) / 2;
  const outgoingClearancePx = outgoingClearance + getPipeEdgePx(outgoingWidthPx) / 2;

  return {
    trimBefore: movePoint(corner, incomingDir, -incomingClearance),
    trimAfter: movePoint(corner, outgoingDir, outgoingClearance),
    legPx: outgoingClearance,
    incomingClearance,
    outgoingClearance,
    incomingClearancePx,
    outgoingClearancePx,
  };
}

// Creates an elbow fitting from incoming/outgoing centerline directions.
export function createElbowItem({ corner, incomingDir, outgoingDir, dn, color, systemTypeId, widthPx, incomingWidthPx = widthPx, outgoingWidthPx = widthPx, angleDeg = null }) {
  if (!corner || !incomingDir || !outgoingDir) return null;

  const allowedAngleDeg = angleDeg ?? getAllowedElbowAngleDeg(incomingDir, outgoingDir);
  if (allowedAngleDeg == null || !ALLOWED_ELBOW_ANGLES.includes(allowedAngleDeg)) return null;

  const { trimBefore, trimAfter, legPx, incomingClearance, outgoingClearance, incomingClearancePx, outgoingClearancePx } = getElbowTrimPoints({
    corner,
    incomingDir,
    outgoingDir,
    pipeWidthPx: widthPx,
    incomingWidthPx,
    outgoingWidthPx,
  });
  const incomingDeg = normalizeAngleDeg(vectorToDeg(incomingDir));
  const outgoingDeg = normalizeAngleDeg(vectorToDeg(outgoingDir));
  const template = getNearestElbowTemplate(allowedAngleDeg);

  return {
    id: createId("elbow"),
    type: "elbow",
    templateId: template.id,
    x: corner.x,
    y: corner.y,
    corner: { ...corner },
    incomingDir: { ...incomingDir },
    outgoingDir: { ...outgoingDir },
    trimBefore: { ...trimBefore },
    trimAfter: { ...trimAfter },
    inPort: { ...trimBefore },
    outPort: { ...trimAfter },
    legPx,
    incomingClearance,
    outgoingClearance,
    incomingClearancePx,
    outgoingClearancePx,
    rotationDeg: incomingDeg,
    angleDeg: allowedAngleDeg,
    dn,
    color,
    systemTypeId,
    widthPx,
    z: 20,
    ports: {
      in: {
        id: "in",
        role: "end",
        x: trimBefore.x,
        y: trimBefore.y,
        dirDeg: incomingDeg,
        dn,
        color,
        systemTypeId,
        widthPx: incomingWidthPx,
      },
      out: {
        id: "out",
        role: "end",
        x: trimAfter.x,
        y: trimAfter.y,
        dirDeg: outgoingDeg,
        dn,
        color,
        systemTypeId,
        widthPx: outgoingWidthPx,
      },
    },
  };
}

// Creates an elbow whose input port is fixed to a previous output port.
export function createElbowAfterPoint({ startPoint, incomingDir, outgoingDir, dn, color, systemTypeId, widthPx, incomingWidthPx = widthPx, outgoingWidthPx = widthPx, angleDeg = null }) {
  if (!startPoint || !incomingDir || !outgoingDir) return null;

  const incomingClearance = getFittingClearancePx(incomingWidthPx);
  const corner = movePoint(startPoint, incomingDir, incomingClearance);

  return createElbowItem({
    corner,
    incomingDir,
    outgoingDir,
    dn,
    color,
    systemTypeId,
    widthPx,
    incomingWidthPx,
    outgoingWidthPx,
    angleDeg,
  });
}
