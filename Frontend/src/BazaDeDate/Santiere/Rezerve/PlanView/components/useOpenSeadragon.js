import { useEffect, useRef, useState } from 'react';
import OpenSeadragon from 'openseadragon';
import { toApiUrl } from '../../PlanUtils';
import api from '@/api/axiosAPI';

export const useOpenSeadragon = (osdRef, plan, stageRef) => {
    const viewerRef = useRef(null);
    const rafRef = useRef(null);
    const [viewSyncTick, setViewSyncTick] = useState(0);

    const scaleRef = useRef(1);
    const posRef = useRef({ x: 0, y: 0 });

    useEffect(() => {
        const useOSD = !!plan?.tiles_base_url || !!plan?.dzi_url;
        if (!useOSD || !osdRef.current || !plan?.width_px || !plan?.height_px) return;

        // 1. If a viewer already exists, destroy it completely before creating a new one
        if (viewerRef.current) {
            try {
                console.log("Destroying previous OSD instance");
                viewerRef.current.destroy();
            } catch (e) {
                console.log("Error destroying previous OSD instance", e);
            }
            viewerRef.current = null;
        }

        const imgW = Number(plan.width_px);
        const imgH = Number(plan.height_px);
        const tileSize = Number(plan.tile_size || 256);
        const maxLevel = Number(plan.tiles_max_zoom) || Math.ceil(Math.log2(Math.max(imgW || 1, imgH || 1)));

        const tileSource = plan.dzi_url
            ? plan.dzi_url
            : {
                width: imgW,
                height: imgH,
                tileSize,
                minLevel: 0,
                maxLevel,
                getTileUrl: (L, x, y) => `${toApiUrl(plan.tiles_base_url, api.defaults.baseURL)}/${L}/${x}_${y}.png`,
            };

        const viewer = OpenSeadragon({
            element: osdRef.current,
            tileSources: tileSource,
            showNavigationControl: false,
            crossOriginPolicy: "Anonymous",
            ajaxWithCredentials: false,
            gestureSettingsMouse: { clickToZoom: false, dblClickToZoom: true },
            gestureSettingsTouch: { pinchRotate: false, flickEnabled: false },
            constrainDuringPan: true,
            animationTime: 0.10,
            zoomPerScroll: 1.15,
            minZoomImageRatio: 0.2,
            maxZoomPixelRatio: 4.0,
            preserveImageSizeOnResize: true,
        });

        viewerRef.current = viewer;

        const syncKonva = () => {
            const stage = stageRef.current;
            if (!stage || !viewer.world.getItemCount()) return;

            const p00_vp = viewer.viewport.imageToViewportCoordinates(0, 0);
            const p10_vp = viewer.viewport.imageToViewportCoordinates(1, 0);
            const p00_px = viewer.viewport.pixelFromPoint(p00_vp, true);
            const p10_px = viewer.viewport.pixelFromPoint(p10_vp, true);

            const scaleNow = p10_px.x - p00_px.x;
            stage.scale({ x: scaleNow, y: scaleNow });
            stage.position({ x: p00_px.x, y: p00_px.y });
            stage.batchDraw();

            scaleRef.current = scaleNow;
            posRef.current = { x: p00_px.x, y: p00_px.y };

            if (!rafRef.current) {
                rafRef.current = requestAnimationFrame(() => {
                    rafRef.current = null;
                    setViewSyncTick(t => t + 1);
                });
            }
        };

        viewer.addHandler('open', () => {
            viewer.viewport.goHome(true);
            syncKonva();
        });
        viewer.addHandler('animation', syncKonva);

        requestAnimationFrame(() => syncKonva());
        viewer.addOnceHandler('tile-loaded', () => syncKonva());

        const onResize = () => syncKonva();
        window.addEventListener('resize', onResize);

        return () => {
            window.removeEventListener('resize', onResize);
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            if (viewerRef.current) {
                try { viewerRef.current.destroy(); } catch { }
                viewerRef.current = null;
            }
        };
    }, [plan?.id, plan?.width_px, plan?.height_px, plan?.tiles_base_url, plan?.dzi_url, osdRef, stageRef]);

    return { viewerRef, viewSyncTick, scaleRef, posRef };
};