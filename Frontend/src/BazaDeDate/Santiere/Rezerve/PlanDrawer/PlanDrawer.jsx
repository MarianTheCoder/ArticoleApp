import React, {
    useRef,
    useEffect,
    useState,
    useCallback,
    useMemo,
} from "react";
import OpenSeadragon from "openseadragon";
import { Stage, Layer, Line, Shape } from "react-konva";
import api from "../../../../api/axiosAPI.jsx";
import {
    toApiUrl,
    pixelToImagePoint, // din PlanUtils (stage, viewer, OpenSeadragonRef?)
    snapToAngleStep,    // snap global la XOY
    snapToAngleStepRelative, // snap relativ la o direcție de bază
    norm,               // normalizare vector
    computePipeSegmentsForClick,  // verifică dacă două segmente sunt coliniare și în aceeași direcție
    computeMeasureInfo,          // <--- nou
    dnToPx,                      // din DN in px
} from "../PlanUtils.js";
import Elbows from "./Components/Elbows.jsx";
import PreviewHover from "./Components/PreviewHover.jsx";
import PipeSegments from "./Components/PipeSegments.jsx";
import MeasureInfo from "./Components/MeasureInfo.jsx";
import MeniuDrawer from "./Components/MeniuDrawer.jsx";
import Reducers from "./Components/Reducers.jsx";


export default function PlanDrawer({ plan }) {
    const osdRef = useRef(null);
    const viewerRef = useRef(null);

    const containerRef = useRef(null);
    const stageRef = useRef(null);

    const [size, setSize] = useState({ w: 0, h: 0 });
    const [cursorPos, setCursorPos] = useState(null);

    //
    const [currentColor, setCurrentColor] = useState("#00FF00");
    const [currentDN, setCurrentDN] = useState(32); // mm
    const [currentStrokeWidth, setCurrentStrokeWidth] = useState(4); // px

    // pipe polyline in IMAGE coords: [x0,y0,x1,y1,...]
    const [pipeSegments, setPipeSegments] = useState([]); // [{ start: {x,y}, end: {x,y} }]
    const [elbows, setElbows] = useState([]);
    const [reducers, setReducers] = useState([]);
    const [hoverPoint, setHoverPoint] = useState(null); // {x,y}
    const [measureInfo, setMeasureInfo] = useState(null); // {x,y,angleDeg,segLen,totalLen} pentru patratul de langa cursor sa vedem date

    // stil țeavă
    //////////////////////////////
    // effective width used everywhere
    const PIPE_COLOR = currentColor;
    const PIPE_WIDTH = currentStrokeWidth;
    // cât intră cotul pe țeavă
    const COT_VISUAL_FACTOR = 0.75;
    const STEP_DEG = 15;
    // M_PER_PX is meters per pixel (m/px)
    const M_PER_PX = plan?.meters_per_px;

    const CENTER_WIDTH = useMemo(() => {
        return PIPE_WIDTH / 6;
    }, [PIPE_WIDTH]);

    const PIPE_EDGE = useMemo(() => {
        return Math.max(1.5, PIPE_WIDTH / 8);
    }, [PIPE_WIDTH]);

    // avem de  2 * jumatati de lungimi pentru ca atat ocupa fiecare cot in mod normal
    // inmutlitim cu COT_VISUAL_FACTOR pentru ca ajustam lungimea
    const MIN_SEGMENT_LEN = useMemo(() => {
        return 2 * PIPE_WIDTH * COT_VISUAL_FACTOR;
    }, [PIPE_WIDTH, COT_VISUAL_FACTOR]);
    //////////////////////////////


    //--- Pipe current DN ( width ) ---
    useEffect(() => {
        const newWidth = dnToPx(currentDN, M_PER_PX, 16);
        setCurrentStrokeWidth(newWidth);
    }, [currentDN, M_PER_PX]);

    // --- Resize observer ---
    useEffect(() => {
        if (!containerRef.current) return;
        const ro = new ResizeObserver(([entry]) => {
            setSize({
                w: entry.contentRect.width,
                h: entry.contentRect.height,
            });
        });
        ro.observe(containerRef.current);
        return () => ro.disconnect();
    }, []);

    // --- Init OpenSeadragon ---
    useEffect(() => {
        if (!plan?.width_px || !plan?.height_px) return;
        if (!osdRef.current) return;

        const imgW = Number(plan.width_px);
        const imgH = Number(plan.height_px);
        const tileSize = Number(plan.tile_size || 256);
        const maxLevel = Number.isFinite(Number(plan?.tiles_max_level))
            ? Number(plan.tiles_max_level)
            : Math.ceil(Math.log2(Math.max(imgW || 1, imgH || 1)));

        const tileSource = plan.dzi_url
            ? plan.dzi_url
            : {
                width: imgW,
                height: imgH,
                tileSize,
                minLevel: 0,
                maxLevel,
                getTileUrl: (L, x, y) =>
                    `${toApiUrl(
                        plan.tiles_base_url,
                        api.defaults.baseURL
                    )}/${L}/${x}_${y}.png`,
            };

        const viewer = OpenSeadragon({
            element: osdRef.current,
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
            animationTime: 0.1,
            zoomPerScroll: 1.15,
            minZoomImageRatio: 0.2,
            maxZoomPixelRatio: 4.0,
            preserveImageSizeOnResize: true,
        });

        viewerRef.current = viewer;

        const syncStage = () => {
            const stage = stageRef.current;
            if (!stage || !viewer.world.getItemCount()) return;

            const p00_vp = viewer.viewport.imageToViewportCoordinates(0, 0);
            const p10_vp = viewer.viewport.imageToViewportCoordinates(1, 0);
            const p00_px = viewer.viewport.pixelFromPoint(p00_vp, true);
            const p10_px = viewer.viewport.pixelFromPoint(p10_vp, true);

            const scale = p10_px.x - p00_px.x;
            stage.scale({ x: scale, y: scale });
            stage.position({ x: p00_px.x, y: p00_px.y });
            stage.batchDraw();

        };

        viewer.addOnceHandler("open", syncStage);
        viewer.addHandler("viewport-change", syncStage);
        requestAnimationFrame(syncStage);

        const onResize = () => syncStage();
        window.addEventListener("resize", onResize);

        return () => {
            window.removeEventListener("resize", onResize);
            viewer.destroy();
            viewerRef.current = null;
        };
    }, [plan]);

    // cursor crosshair
    useEffect(() => {
        const stage = stageRef.current;
        if (!stage) return;
        stage.container().style.cursor = "crosshair";
    }, []);

    // --- panning / zoom ---
    const dragStateRef = useRef({
        dragging: false,
        start: null,
        last: null,
        moved: false,
        panning: false,
    });

    const handleWheel = useCallback((e) => {
        const viewer = viewerRef.current;
        const stage = stageRef.current;
        if (!viewer || !stage) return;

        const pos = stage.getPointerPosition();
        if (!pos) return;

        const vpPoint = viewer.viewport.pointFromPixel(
            new OpenSeadragon.Point(pos.x, pos.y),
            true
        );
        const zoomBy = e.evt.deltaY > 0 ? 1 / 1.15 : 1.15;

        viewer.viewport.zoomBy(zoomBy, vpPoint);
        viewer.viewport.applyConstraints();
    }, []);

    const handleMouseDown = useCallback(() => {
        const stage = stageRef.current;
        if (!stage) return;
        const pos = stage.getPointerPosition();
        dragStateRef.current = {
            dragging: true,
            start: pos,
            last: pos,
            moved: false,
            panning: false,
        };
    }, []);

    const handleMouseMove = useCallback(
        (e) => {
            const viewer = viewerRef.current;
            const stage = stageRef.current;
            if (!viewer || !stage) return;

            // POSIȚIE PE ECRAN (canvas) – pentru HUD
            const pos = stage.getPointerPosition();
            if (pos) {
                setCursorPos({ x: pos.x, y: pos.y });
            }

            // în handleMouseMove, înainte de snap:
            // vedem daca avem segement incheiat precedent
            const lastPoint = pipeSegments.length
                ? pipeSegments[pipeSegments.length - 1].end
                : null;

            const img = pixelToImagePoint(stage, viewer, OpenSeadragon);
            if (img) {
                let hp = img;
                const shift = !!e.evt.shiftKey;

                //daca avem shift apasat facem snap la unghi
                if (shift && lastPoint) {
                    // direcția ultimului segment ( lastSeg e ultimul segment) daca nu il avem inseamna 
                    // ca nu avem segmente si nu facem snap relativ
                    const lastSeg = pipeSegments[pipeSegments.length - 1];
                    const baseDir = norm({
                        x: lastSeg.end.x - lastSeg.start.x,
                        y: lastSeg.end.y - lastSeg.start.y,
                    });

                    let snapped;
                    // dacă nu avem direcție (punct repetat) facem snap global
                    if (baseDir.x === 0 && baseDir.y === 0) {
                        snapped = snapToAngleStep(lastPoint, img, STEP_DEG);
                    } else {
                        snapped = snapToAngleStepRelative(lastPoint, img, baseDir, STEP_DEG);
                    }

                    hp = snapped;
                }

                setHoverPoint(hp);
                const info = computeMeasureInfo(pipeSegments, hp, M_PER_PX);
                setMeasureInfo(info);
            } else {
                setMeasureInfo(null);
                setHoverPoint(null);
            }

            // panning
            const drag = dragStateRef.current;
            if (!drag.dragging) return;

            if (!pos) return;

            const dx0 = pos.x - drag.start.x;
            const dy0 = pos.y - drag.start.y;
            const dist = Math.hypot(dx0, dy0);

            if (!drag.panning && dist >= 5) {
                drag.panning = true;
                drag.moved = true;
                drag.last = pos;
                stage.container().style.cursor = "grabbing";
                return;
            }

            if (!drag.panning) return;

            const dx = pos.x - drag.last.x;
            const dy = pos.y - drag.last.y;
            if (dx === 0 && dy === 0) return;

            const delta = viewer.viewport.deltaPointsFromPixels(
                new OpenSeadragon.Point(-dx, -dy),
                true
            );
            viewer.viewport.panBy(delta);
            viewer.viewport.applyConstraints();

            drag.last = pos;
        },
        [pipeSegments]
    );

    const handleMouseUp = useCallback(() => {
        dragStateRef.current.dragging = false;
        dragStateRef.current.panning = false;
        const stage = stageRef.current;
        if (stage) stage.container().style.cursor = "crosshair";
    }, []);

    const handleMouseLeave = useCallback(() => {
        dragStateRef.current.dragging = false;
        dragStateRef.current.panning = false;
        const stage = stageRef.current;
        if (stage) stage.container().style.cursor = "crosshair";
        setHoverPoint(null);
        setMeasureInfo(null);
        setCursorPos(null); // <- nou
    }, []);

    const handleStageClick = useCallback(
        (e) => {
            // ignore click dacă tocmai am făcut pan
            if (dragStateRef.current.moved) {
                dragStateRef.current.moved = false;
                return;
            }

            const viewer = viewerRef.current;
            const stage = stageRef.current;
            if (!viewer || !stage) return;

            const imgRaw = pixelToImagePoint(stage, viewer, OpenSeadragon);
            if (!imgRaw) return;

            const shift = !!e.evt.shiftKey;
            setPipeSegments((prevSegs) => {
                const { nextSegs, newElbow, newReducer } = computePipeSegmentsForClick(
                    prevSegs,
                    imgRaw,
                    shift,
                    STEP_DEG,
                    PIPE_WIDTH,
                    PIPE_COLOR,
                    COT_VISUAL_FACTOR,
                    MIN_SEGMENT_LEN,

                );

                if (newElbow) {
                    setElbows((prevElbows) => [...prevElbows, newElbow]);
                }
                if (newReducer) {
                    setReducers((prevReducers) => [...prevReducers, newReducer]);
                }

                return nextSegs;
            });
        },
        [STEP_DEG, PIPE_WIDTH, COT_VISUAL_FACTOR, MIN_SEGMENT_LEN, PIPE_COLOR]
    );

    return (
        <div className="h-full w-full overflow-hidden relative bg-gray-50">
            {/* OSD plan image */}
            <div ref={osdRef} className="absolute inset-0" />

            {/* overlay container */}
            <div ref={containerRef} className="absolute inset-0">
                {size.w > 0 && size.h > 0 && (
                    <Stage
                        ref={stageRef}
                        width={size.w}
                        height={size.h}
                        pixelRatio={1}
                        draggable={false}
                        onWheel={handleWheel}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseLeave}
                        onClick={handleStageClick}
                    >
                        <Layer listening>
                            <PipeSegments pipeSegments={pipeSegments} />
                            <PreviewHover
                                hoverPoint={hoverPoint}
                                pipeSegments={pipeSegments}
                                PIPE_WIDTH={PIPE_WIDTH}
                                PIPE_COLOR={PIPE_COLOR}
                                PIPE_EDGE={PIPE_EDGE}
                                CENTER_WIDTH={CENTER_WIDTH}
                            />
                            <Reducers reducers={reducers} />
                            <Elbows elbows={elbows} />
                        </Layer>
                    </Stage>
                )}
                {measureInfo && cursorPos && pipeSegments.length > 0 && <MeasureInfo info={measureInfo} cursorPos={cursorPos} />}
                <MeniuDrawer currentDN={currentDN} setCurrentDN={setCurrentDN} currentColor={currentColor} setCurrentColor={setCurrentColor} />
            </div>
        </div>
    );
}