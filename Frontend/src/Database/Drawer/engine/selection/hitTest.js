import { distance, distanceToSegment } from "../geometry/vector.js";

// Minimum select tolerance in screen pixels.
export const MIN_ITEM_HIT_RADIUS_SCREEN_PX = 8;

// Converts screen-pixel tolerance to image-pixel tolerance.
export function screenToleranceToImagePx(stage, screenPx = MIN_ITEM_HIT_RADIUS_SCREEN_PX) {
  const scale = Math.abs(stage?.scaleX?.() || 0);

  if (!Number.isFinite(scale) || scale <= 1e-9) return screenPx;

  return screenPx / scale;
}

// Checks one pipe body.
function hitPipe(item, point, tolerancePx) {
  if (!item?.a || !item?.b) return null;

  const hitRadius = Math.max((item.widthPx || 0) / 2 + tolerancePx, tolerancePx);
  const d = distanceToSegment(point, item.a, item.b);

  return d <= hitRadius ? d : null;
}

// Checks one elbow body.
function hitElbow(item, point, tolerancePx) {
  const corner = item?.corner || (Number.isFinite(item?.x) && Number.isFinite(item?.y) ? { x: item.x, y: item.y } : null);
  const trimBefore = item?.trimBefore;
  const trimAfter = item?.trimAfter;

  if (!corner || !trimBefore || !trimAfter) return null;

  const hitRadius = Math.max((item.widthPx || 0) / 2 + tolerancePx, tolerancePx);
  const d = Math.min(distance(point, corner), distance(point, trimBefore), distance(point, trimAfter), distanceToSegment(point, trimBefore, corner), distanceToSegment(point, corner, trimAfter));

  return d <= hitRadius ? d : null;
}

// Checks one reducer body.
function hitReducer(item, point, tolerancePx) {
  if (!item?.a || !item?.b) return null;

  const widthPx = Math.max(item.widthApx || 0, item.widthBpx || 0);
  const hitRadius = Math.max(widthPx / 2 + tolerancePx, tolerancePx);
  const d = distanceToSegment(point, item.a, item.b);

  return d <= hitRadius ? d : null;
}

// Finds selectable item at image point, fittings before pipes.
export function findItemAtImagePoint(state, point, tolerancePx = 0) {
  if (!state || !point) return null;

  let best = null;
  const items = state.itemIds.map((id) => state.itemsById[id]).filter(Boolean);

  for (let i = items.length - 1; i >= 0; i -= 1) {
    const item = items[i];
    if (item.type !== "elbow" && item.type !== "reducer") continue;

    const d = item.type === "reducer" ? hitReducer(item, point, tolerancePx) : hitElbow(item, point, tolerancePx);
    if (d != null && (!best || d < best.distancePx)) best = { item, distancePx: d };
  }

  if (best) return best.item;

  for (let i = items.length - 1; i >= 0; i -= 1) {
    const item = items[i];
    if (item.type !== "pipe") continue;

    const d = hitPipe(item, point, tolerancePx);
    if (d != null && (!best || d < best.distancePx)) best = { item, distancePx: d };
  }

  return best?.item ?? null;
}
