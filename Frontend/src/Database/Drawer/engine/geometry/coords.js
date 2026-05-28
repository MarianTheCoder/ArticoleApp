// Converts current Konva pointer to source image pixels.
export function screenToImagePoint(stage, viewer, OpenSeadragonRef) {
  const pos = stage?.getPointerPosition();

  if (!pos || !viewer) return null;

  const OSD = OpenSeadragonRef || window.OpenSeadragon;

  if (!OSD) return null;

  // Browser screen px -> OSD viewport coord.
  const viewportPoint = viewer.viewport.pointFromPixel(new OSD.Point(pos.x, pos.y), true);

  // OSD viewport coord -> source image px.
  const imagePoint = viewer.viewport.viewportToImageCoordinates(viewportPoint);

  return {
    x: imagePoint.x,
    y: imagePoint.y,
  };
}

// Converts source image pixels to browser screen pixels.
export function imageToScreenPoint(viewer, point) {
  if (!viewer || !point) return null;

  const viewportPoint = viewer.viewport.imageToViewportCoordinates(point.x, point.y);
  const screenPoint = viewer.viewport.pixelFromPoint(viewportPoint, true);

  return {
    x: screenPoint.x,
    y: screenPoint.y,
  };
}
