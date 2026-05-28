import { getPipeOuterWidthPx } from "../geometry/pipeMetrics.js";

// Shared fitting leg factor for elbows and reducers.
export const FITTING_LEG_FACTOR = 0.85;

// Returns fitting clearance from rendered outer pipe width.
export function getFittingClearancePx(widthPx) {
  return getPipeOuterWidthPx(widthPx) * FITTING_LEG_FACTOR;
}

// Backward-compatible name for fitting clearance.
export function getFittingLegPx(widthPx) {
  return getFittingClearancePx(widthPx);
}
