// Pipe outline thickness in image pixels.
export function getPipeEdgePx(widthPx) {
  return Math.max(1.5, Number(widthPx || 0) / 8);
}

// Full rendered pipe width including dark outline.
export function getPipeOuterWidthPx(widthPx) {
  const innerWidthPx = Number(widthPx || 0);

  return innerWidthPx + 2 * getPipeEdgePx(innerWidthPx);
}
