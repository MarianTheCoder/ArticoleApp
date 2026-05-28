import { createId } from "../ids.js";
import { getPipeEdgePx } from "../geometry/pipeMetrics.js";
import { movePoint, normalize, vectorFromPoints, vectorToDeg } from "../geometry/vector.js";
import { dnToRealPipeWidthPx } from "../geometry/units.js";
import { FITTING_LEG_FACTOR } from "./fittingClearance.js";

// Reducer leg length copied from the old reducer data model.
export function getReducerLegPx(widthPx) {
  return Number(widthPx || 0) * FITTING_LEG_FACTOR;
}

// Reducer stroke width from old geometry.
export function getReducerBorderPx(widthApx, widthBpx) {
  const edgeIn = getPipeEdgePx(widthApx);
  const edgeOut = getPipeEdgePx(widthBpx);

  return Math.max(1.5, Math.min(edgeIn, edgeOut));
}

// Visual start clearance includes half the reducer end-face stroke.
export function getReducerIncomingClearancePx(widthApx, widthBpx) {
  return getReducerLegPx(widthApx) + getReducerBorderPx(widthApx, widthBpx) / 2;
}

// Visual end clearance includes half the reducer end-face stroke.
export function getReducerOutgoingClearancePx(widthApx, widthBpx) {
  return getReducerLegPx(widthBpx) + getReducerBorderPx(widthApx, widthBpx) / 2;
}

// Old reducer render geometry with stroke compensation.
export function computeReducerGeometry(p0, p1, dIn, dOut, anchor) {
  const dx = p1.x - p0.x;
  const dy = p1.y - p0.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const nx = -uy;
  const ny = ux;
  const edgeIn = getPipeEdgePx(dIn);
  const edgeOut = getPipeEdgePx(dOut);
  const border = Math.max(1.5, Math.min(edgeIn, edgeOut));
  const rIn = Math.max(0, dIn / 2 + edgeIn - border / 2);
  const rOut = Math.max(0, dOut / 2 + edgeOut - border / 2);
  const capInset = Math.min(border / 2, Math.max(0, len / 2 - 0.001));
  const start = { x: p0.x + ux * capInset, y: p0.y + uy * capInset };
  const end = { x: p1.x - ux * capInset, y: p1.y - uy * capInset };
  const mid = anchor || { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 };

  return {
    P0T: { x: start.x + nx * rIn, y: start.y + ny * rIn },
    P0B: { x: start.x - nx * rIn, y: start.y - ny * rIn },
    MidT_In: { x: mid.x + nx * rIn, y: mid.y + ny * rIn },
    MidB_In: { x: mid.x - nx * rIn, y: mid.y - ny * rIn },
    MidT_Out: { x: mid.x + nx * rOut, y: mid.y + ny * rOut },
    MidB_Out: { x: mid.x - nx * rOut, y: mid.y - ny * rOut },
    P1T: { x: end.x + nx * rOut, y: end.y + ny * rOut },
    P1B: { x: end.x - nx * rOut, y: end.y - ny * rOut },
    border,
  };
}

// Checks if a port transition needs a reducer.
export function needsReducer(fromPort, tool) {
  if (!fromPort || !tool) return false;

  return fromPort.dn !== tool.dn || fromPort.color !== tool.color || fromPort.systemTypeId !== tool.systemTypeId;
}

// Returns reducer length from asymmetric fitting clearances.
export function getReducerLengthPx(fromWidthPx, toWidthPx) {
  return getReducerLegPx(fromWidthPx) + getReducerLegPx(toWidthPx);
}

// Creates a reducer item along a direction.
export function createReducerItem({ rawPoint, dir, fromPort, tool, metersPerPx }) {
  if (!rawPoint || !dir || !fromPort || !tool) return null;

  return createReducerItemFromGeometry({ rawPoint, dir, fromPort, tool, metersPerPx });
}

// Creates a reducer whose start face is fixed to a visual exit point.
export function createReducerAfterPoint({ startPoint, dir, fromPort, tool, metersPerPx }) {
  if (!startPoint || !dir || !fromPort || !tool) return null;

  const dnA = fromPort.dn;
  const widthApx = fromPort.widthPx || dnToRealPipeWidthPx(dnA, metersPerPx);
  const unitDir = normalize(dir);
  const rawPoint = movePoint(startPoint, unitDir, getReducerLegPx(widthApx));

  return createReducerItemFromGeometry({ rawPoint, dir: unitDir, fromPort, tool, metersPerPx, startOverride: startPoint });
}

// Builds the reducer item from a raw anchor and optional fixed start.
function createReducerItemFromGeometry({ rawPoint, dir, fromPort, tool, metersPerPx, startOverride = null }) {
  const dnA = fromPort.dn;
  const dnB = tool.dn;
  const colorA = fromPort.color;
  const colorB = tool.color;
  const systemTypeA = fromPort.systemTypeId;
  const systemTypeB = tool.systemTypeId;
  const widthApx = fromPort.widthPx || dnToRealPipeWidthPx(dnA, metersPerPx);
  const widthBpx = tool.widthPx || dnToRealPipeWidthPx(dnB, metersPerPx);
  const incomingClearance = getReducerLegPx(widthApx);
  const outgoingClearance = getReducerLegPx(widthBpx);
  const incomingClearancePx = getReducerIncomingClearancePx(widthApx, widthBpx);
  const outgoingClearancePx = getReducerOutgoingClearancePx(widthApx, widthBpx);
  const lengthPx = incomingClearance + outgoingClearance;
  const unitDir = normalize(dir);
  const start = startOverride ? { ...startOverride } : movePoint(rawPoint, unitDir, -incomingClearance);
  const end = movePoint(rawPoint, unitDir, outgoingClearance);
  const angleDeg = vectorToDeg(unitDir);

  return {
    id: createId("reducer"),
    type: "reducer",
    anchor: { ...rawPoint },
    p0: { ...start },
    p1: { ...end },
    inPort: { ...start },
    outPort: { ...end },
    dIn: widthApx,
    dOut: widthBpx,
    color: colorA || colorB,
    colorStart: colorA,
    colorEnd: colorB,
    dnStart: dnA,
    dnEnd: dnB,
    rawPoint: { ...rawPoint },
    dir: { ...unitDir },
    a: { ...start },
    b: { ...end },
    dnA,
    dnB,
    colorA,
    colorB,
    systemTypeA,
    systemTypeB,
    widthApx,
    widthBpx,
    lengthPx,
    incomingClearance,
    outgoingClearance,
    incomingClearancePx,
    outgoingClearancePx,
    z: 20,
    ports: {
      in: {
        id: "in",
        role: "end",
        x: start.x,
        y: start.y,
        dirDeg: angleDeg + 180,
        dn: dnA,
        color: colorA,
        systemTypeId: systemTypeA,
        widthPx: widthApx,
      },
      out: {
        id: "out",
        role: "end",
        x: end.x,
        y: end.y,
        dirDeg: angleDeg,
        dn: dnB,
        color: colorB,
        systemTypeId: systemTypeB,
        widthPx: widthBpx,
      },
    },
  };
}

// Returns reducer direction from start to target.
export function getReducerDirection(start, target) {
  return normalize(vectorFromPoints(start, target));
}
