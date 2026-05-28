import { useEffect, useRef } from "react";
import OpenSeadragon from "openseadragon";
import { buildPlanTileSource } from "../engine/plan/planTiles.js";

// Creates OSD viewer and syncs Konva Stage to image pixels.
export function usePlanViewer({ plan, osdElementRef, stageRef, apiBaseURL, onStageTransformChange }) {
  const viewerRef = useRef(null);

  useEffect(() => {
    const osdEl = osdElementRef.current;

    if (!osdEl) return;
    if (!plan?.width_px || !plan?.height_px) return;

    // Convert DB plan object to OSD tile source.
    const tileSource = buildPlanTileSource(plan, apiBaseURL);
    if (!tileSource) return;

    // Create OSD with speed-first settings.
    const viewer = OpenSeadragon({
      element: osdEl,
      tileSources: tileSource,

      showNavigationControl: false,

      crossOriginPolicy: "Anonymous",
      ajaxWithCredentials: false,

      gestureSettingsMouse: {
        clickToZoom: false,
        dblClickToZoom: true,
        dragToPan: true,
        scrollToZoom: true,
      },

      gestureSettingsTouch: {
        pinchRotate: false,
        flickEnabled: false,
      },

      constrainDuringPan: true,

      // Faster movement.
      animationTime: 0.1,
      springStiffness: 8,
      zoomPerScroll: 1.15,

      // Faster tile swaps.
      blendTime: 0.1,
      alwaysBlend: false,
      immediateRender: true,

      // Pixelated rendering.
      imageSmoothingEnabled: false,

      // More cache = smoother revisits.
      maxImageCacheCount: 100,

      minZoomImageRatio: 0.5,
      maxZoomPixelRatio: 10,
      preserveImageSizeOnResize: true,
    });

    viewerRef.current = viewer;

    // Force pixelated canvas rendering.
    const disableImageSmoothing = () => {
      const canvas = viewer.drawer?.canvas;
      const ctx = viewer.drawer?.context;

      if (canvas) {
        canvas.style.imageRendering = "pixelated";
      }

      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        ctx.webkitImageSmoothingEnabled = false;
        ctx.mozImageSmoothingEnabled = false;
        ctx.msImageSmoothingEnabled = false;
      }
    };

    // Sync Konva stage so coordinates equal image pixels.
    const syncStageToImage = () => {
      const stage = stageRef.current;

      if (!stage) return;
      if (!viewer.world.getItemCount()) return;

      // Image pixel 0 and 1 in viewport coords.
      const p00Viewport = viewer.viewport.imageToViewportCoordinates(0, 0);
      const p10Viewport = viewer.viewport.imageToViewportCoordinates(1, 0);

      // Same points in screen pixels.
      const p00Screen = viewer.viewport.pixelFromPoint(p00Viewport, true);
      const p10Screen = viewer.viewport.pixelFromPoint(p10Viewport, true);

      // Screen size of one image pixel.
      const scale = p10Screen.x - p00Screen.x;

      // Apply OSD transform to Konva.
      stage.scale({ x: scale, y: scale });
      stage.position({ x: p00Screen.x, y: p00Screen.y });
      onStageTransformChange?.({
        scale,
        x: p00Screen.x,
        y: p00Screen.y,
      });

      stage.batchDraw();
    };

    // OSD render-quality handlers.
    viewer.addHandler("open", disableImageSmoothing);
    viewer.addHandler("tile-drawn", disableImageSmoothing);
    viewer.addHandler("viewport-change", disableImageSmoothing);

    // OSD/Konva sync handlers.
    viewer.addOnceHandler("open", syncStageToImage);
    viewer.addHandler("viewport-change", syncStageToImage);

    // Initial safety sync.
    const raf = requestAnimationFrame(() => {
      disableImageSmoothing();
      syncStageToImage();
    });

    // Sync after browser resize.
    window.addEventListener("resize", syncStageToImage);

    return () => {
      cancelAnimationFrame(raf);

      window.removeEventListener("resize", syncStageToImage);

      viewer.removeHandler("open", disableImageSmoothing);
      viewer.removeHandler("tile-drawn", disableImageSmoothing);
      viewer.removeHandler("viewport-change", disableImageSmoothing);
      viewer.removeHandler("viewport-change", syncStageToImage);

      viewer.destroy();
      viewerRef.current = null;
    };
  }, [plan, osdElementRef, stageRef, apiBaseURL, onStageTransformChange]);

  return viewerRef;
}
