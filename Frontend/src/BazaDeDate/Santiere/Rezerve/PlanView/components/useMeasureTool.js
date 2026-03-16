import { useState, useCallback, useRef, useEffect } from 'react';
import { pixelToImagePoint, snapToAngleStep } from '../../PlanUtils';

export const useMeasureTool = (plan, stageRef, viewerRef, OpenSeadragon, ui) => {
    const [measureMode, setMeasureMode] = useState(false);
    const [measureDraft, setMeasureDraft] = useState([]);
    const [measureHover, setMeasureHover] = useState(null);
    const measureDraftRef = useRef(measureDraft);

    useEffect(() => {
        measureDraftRef.current = measureDraft;
    }, [measureDraft]);

    const toggleMeasureMode = useCallback(() => {
        const next = !measureMode;
        setMeasureMode(next);
        setMeasureDraft([]);
        setMeasureHover(null);

        const stage = stageRef.current;
        if (stage?.container()) {
            stage.container().style.cursor = next ? "crosshair" : "default";
        }
    }, [measureMode, stageRef]);

    const handleMeasureClick = useCallback((e) => {
        if (!measureMode) return;

        const viewer = viewerRef.current;
        const stage = stageRef.current;
        if (!viewer || !stage) return;

        const img = pixelToImagePoint(stage, viewer, OpenSeadragon);
        if (!img) return;

        const md = measureDraftRef.current;
        const shift = !!e.evt?.shiftKey;

        let p = img;
        if (shift && md.length >= 2) {
            const anchor = { x: md[md.length - 2], y: md[md.length - 1] };
            p = snapToAngleStep(anchor, img, 45);
        }
        setMeasureDraft(prev => [...prev, p.x, p.y]);
    }, [measureMode, stageRef, viewerRef, OpenSeadragon]);

    const handleMeasureMove = useCallback((e) => {
        if (!measureMode) return;

        const viewer = viewerRef.current;
        const stage = stageRef.current;
        if (!viewer || !stage) return;

        const img = pixelToImagePoint(stage, viewer, OpenSeadragon);
        if (!img) return;

        const md = measureDraftRef.current;
        const shift = !!e?.evt?.shiftKey;

        if (shift && md.length >= 2) {
            const anchor = { x: md[md.length - 2], y: md[md.length - 1] };
            setMeasureHover(snapToAngleStep(anchor, img, 45));
        } else {
            setMeasureHover(img);
        }
    }, [measureMode, stageRef, viewerRef, OpenSeadragon]);

    const clearMeasure = useCallback(() => {
        setMeasureDraft([]);
        setMeasureHover(null);
    }, []);

    const undoMeasurePoint = useCallback(() => {
        setMeasureDraft(prev => prev.length >= 2 ? prev.slice(0, prev.length - 2) : []);
    }, []);

    // Keyboard shortcuts
    useEffect(() => {
        const onKey = (ev) => {
            if (ui.drawerOpen || ui.menuOpen || ui.viewerOpen) return; // don't trigger shortcuts when UI elements are open
            if (ev.key.toLowerCase() === "m") {
                toggleMeasureMode();
                return;
            }
            if (ev.key === "Escape" && measureMode) {
                if (measureDraft.length > 0) {
                    clearMeasure();
                } else {
                    setMeasureMode(false);
                }
            }
            if ((ev.key === "Backspace" || ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "z")) && measureMode) {
                ev.preventDefault();
                undoMeasurePoint();
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [measureMode, measureDraft, toggleMeasureMode, clearMeasure, undoMeasurePoint, ui]);

    return {
        measureMode,
        measureDraft,
        measureHover,
        toggleMeasureMode,
        handleMeasureClick,
        handleMeasureMove,
        clearMeasure,
    };
};