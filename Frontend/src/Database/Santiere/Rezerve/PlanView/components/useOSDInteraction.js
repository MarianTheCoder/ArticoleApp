import { useCallback, useRef } from "react";
import { vpPointFromPointer } from "../../PlanUtils.jsx";

const DRAG_THRESHOLD_PX = 8;

export const useOSDInteraction = (stageRef, viewerRef, OpenSeadragon, measureMode) => {
  const osdDragRef = useRef({
    dragging: false,
    start: null,
    last: null,
    moved: false,
    panning: false,
  });

  const handleWheel = useCallback(
    (e) => {
      e.evt.preventDefault();
      const viewer = viewerRef.current;
      const stage = stageRef.current;
      if (!viewer || !stage) return;

      const vpPoint = vpPointFromPointer(stage, viewer, OpenSeadragon);
      if (!vpPoint) return;

      const zoomBy = e.evt.deltaY > 0 ? 1 / 1.15 : 1.15;
      viewer.viewport.zoomBy(zoomBy, vpPoint);
      viewer.viewport.applyConstraints();
    },
    [stageRef, viewerRef, OpenSeadragon],
  );

  const handleMouseDown = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const ptr = stage.getPointerPosition();
    if (!ptr) return;

    osdDragRef.current = {
      dragging: true,
      start: { x: ptr.x, y: ptr.y },
      last: { x: ptr.x, y: ptr.y },
      moved: false,
      panning: false,
    };

    stage.container().style.cursor = measureMode ? "crosshair" : "default";
  }, [stageRef, measureMode]);

  const handleMouseMove = useCallback(
    (e) => {
      const stage = stageRef.current;
      const viewer = viewerRef.current;
      if (!stage || !viewer) return;

      const drag = osdDragRef.current;
      const ptr = stage.getPointerPosition();
      if (!ptr || !drag.dragging || !drag.last) return;

      const totalDx = ptr.x - drag.start.x;
      const totalDy = ptr.y - drag.start.y;
      const totalDist = Math.hypot(totalDx, totalDy);

      if (!drag.panning && totalDist < DRAG_THRESHOLD_PX) {
        return;
      }

      if (!drag.panning) {
        drag.panning = true;
        drag.moved = true;
        stage.container().style.cursor = "grabbing";
        drag.last = { x: ptr.x, y: ptr.y };
        return;
      }

      const dx = ptr.x - drag.last.x;
      const dy = ptr.y - drag.last.y;
      if (dx === 0 && dy === 0) return;

      const delta = viewer.viewport.deltaPointsFromPixels(new OpenSeadragon.Point(-dx, -dy), true);
      viewer.viewport.panBy(delta);
      viewer.viewport.applyConstraints();

      drag.last = { x: ptr.x, y: ptr.y };
    },
    [stageRef, viewerRef, OpenSeadragon],
  );

  const handleMouseUp = useCallback(() => {
    osdDragRef.current.dragging = false;
    const stage = stageRef.current;
    if (stage?.container()) {
      stage.container().style.cursor = measureMode ? "crosshair" : "default";
    }
  }, [stageRef, measureMode]);

  const handleMouseLeave = useCallback(() => {
    osdDragRef.current.dragging = false;
    const stage = stageRef.current;
    if (stage?.container()) {
      stage.container().style.cursor = measureMode ? "crosshair" : "default";
    }
  }, [stageRef, measureMode]);

  const wasPanning = useCallback(() => {
    const moved = osdDragRef.current?.moved;
    if (moved) {
      osdDragRef.current.moved = false;
    }
    return moved;
  }, []);

  return {
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
    wasPanning,
  };
};
