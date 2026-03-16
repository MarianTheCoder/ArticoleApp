// src/components/Rezerve/PlanViewKonva.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback, useContext } from "react";
import { Stage, Layer, Image as KonvaImage, Circle, Text, Group, Line } from "react-konva";
import useImage from "use-image";
import OpenSeadragon from 'openseadragon';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faBars, faBrush, faDownload, faFolderOpen, faPlus, faCheck, faXmark,
    faHashtag, faLocationDot, faRotate, faMap, faRuler, faRoad,
    faCirclePlus
} from "@fortawesome/free-solid-svg-icons";
import { AuthContext } from "../../../../context/TokenContext";
import { toast } from "sonner";

// Components
import PinViewer from "./PinViewer";
import MenuRezerve from "./MenuRezerve";
import PlanPinDrawer from "../PlanView/PlanPinDrawer";
import Pin from "./Pin.jsx";
import SpinnerElement from "../../../../MainElements/SpinnerElement";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
// Hooks
import {
    usePins,
    useZones,
    useZonePatterns,
    useCreatePin,
    useUpdatePin,
    useDeletePin,
    useMarkPinSeen,
    usePreviewPlanReplacement,
    useCommitPlanReplacement,
} from "@/hooks/useRezerve";
import { usePlanFilters } from "./components/usePlanFilters";
import { useMeasureTool } from "./components/useMeasureTool";
import { useOpenSeadragon } from "./components/useOpenSeadragon";
import { useOSDInteraction } from "./components/useOSDInteraction";
// Add these imports at the top
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
// Utils
import {

    toApiUrl,
    hexToRgba,
    fmtDateTime,
    pixelToImagePoint,
    imageToScreen as imageToScreenUtil,
    downloadDataURL,
    exportVisibleCompositePNG,
    pxToMeters,
    formatMeters,
    polylineLengthPx,
} from "../PlanUtils.js";
import { useQueryClient } from "@tanstack/react-query";
import DeleteDialog from "@/components/ui/delete-dialog";
import api from "@/api/axiosAPI";
import { Input } from "@/components/ui/input";
import { useLoading } from "@/context/LoadingContext";
import { useParams } from "react-router-dom";
import { faEye } from "@fortawesome/free-regular-svg-icons";

export default function PlanViewKonva({ plan, onPlanReplaced, onSelectManagementZone, onSelectDrawingZone }) {
    const { user } = useContext(AuthContext);
    const { show, hide, loading } = useLoading();

    const { idSantier } = useParams();

    const queryClient = useQueryClient();
    // ==================== REFS ====================
    const osdRef = useRef(null);
    const containerRef = useRef(null);
    const stageRef = useRef(null);
    const hudRef = useRef(null);
    const hudLayerRef = useRef(null);
    const fileInputRef = useRef(null);
    const openedFromMenuRef = useRef(false);
    const pinsLayerRef = useRef(null);


    // ==================== REACT QUERY ====================
    const { data: pins = [], isFetching: loadingPins, refetch: refetchPins } = usePins(plan?.id, user?.id);
    const { data: zones = [], isFetching: loadingZones } = useZones(plan?.id, plan?.width_px, plan?.height_px);
    const { data: zoneData, refetch: refetchZonePatterns } = useZonePatterns(plan?.id, false);


    const pinsRef = useRef([]);
    useEffect(() => {
        pinsRef.current = pins;
    }, [pins]);

    const createPin = useCreatePin();
    const updatePin = useUpdatePin();
    const deletePinMutation = useDeletePin();
    const markPinSeen = useMarkPinSeen();
    const previewReplacement = usePreviewPlanReplacement();
    const commitReplacement = useCommitPlanReplacement();

    // ==================== CUSTOM HOOKS ====================
    const { viewerRef, viewSyncTick, scaleRef, posRef } = useOpenSeadragon(osdRef, plan, stageRef);
    const { filters, setFilters, filteredPins } = usePlanFilters(pins);

    const [ui, setUi] = useState({
        drawerOpen: false,
        menuOpen: false,
        viewerOpen: false,
        zonePanelOpen: false,
        confirmDeletePin: false,
        showPins: true,
        showZones: false,
        BW: false,
    });

    const {
        measureMode,
        measureDraft,
        measureHover,
        toggleMeasureMode,
        handleMeasureClick,
        handleMeasureMove,
    } = useMeasureTool(plan, stageRef, viewerRef, OpenSeadragon, ui);

    const {
        handleWheel,
        handleMouseDown,
        handleMouseMove,
        handleMouseUp,
        handleMouseLeave,
        wasPanning,
    } = useOSDInteraction(stageRef, viewerRef, OpenSeadragon, measureMode);

    // ==================== CONSOLIDATED STATE ====================


    const [selection, setSelection] = useState({
        selectedPin: null,
        editingPin: null,
        deletePin: null,
    });

    const [display, setDisplay] = useState({
        remainCommentState: false,
        remainPinState: false,
    });

    const [size, setSize] = useState({ w: 0, h: 0 });

    // Ghost pin
    const [ghost, setGhost] = useState(null);
    const [photos, setPhotos] = useState([]);

    // Context menu
    const [menu, setMenu] = useState({ open: false, x: 0, y: 0, imgX: 0, imgY: 0 });

    // Replace mode
    const [replaceMode, setReplaceMode] = useState(false);
    const [overlayInfo, setOverlayInfo] = useState({
        url: "",
        publicPath: "",
        dx: 0,
        dy: 0,
        width: 0,
        height: 0,
        opacity: 0.55,
    });
    const [overlayImg] = useImage(overlayInfo.url || null, "anonymous", "origin");

    // Zone patterns (lazy loaded)
    const [allZones, setAllZones] = useState([]);
    const [currentPatternId, setCurrentPatternId] = useState(null);

    // ==================== COMPUTED VALUES ====================
    const useOSD = !!plan?.tiles_base_url || !!plan?.dzi_url;
    const loadingGlobal = loadingPins || createPin.isPending || updatePin.isPending || deletePinMutation.isPending ||
        previewReplacement.isPending || commitReplacement.isPending;

    // ==================== EFFECTS ====================

    // Reset on plan change
    useEffect(() => {
        setSelection({ selectedPin: null, editingPin: null, deletePin: null });
        setUi(prev => ({
            ...prev,
            confirmDeletePin: false,
            drawerOpen: false,
            viewerOpen: false,
            showZones: false,
            showPins: true,
        }));
        setGhost(prev => ({ ...prev, x: null, y: null, x_pct: null, y_pct: null }));
        setReplaceMode(false);
        setOverlayInfo({ url: "", publicPath: "", dx: 0, dy: 0, opacity: 0.55, width: 0, height: 0 });
    }, [plan?.id]);

    // Container sizing
    useEffect(() => {
        if (!containerRef.current) return;
        const ro = new ResizeObserver(([e]) =>
            setSize({ w: e.contentRect.width, h: e.contentRect.height })
        );
        ro.observe(containerRef.current);
        return () => ro.disconnect();
    }, [plan]);

    // ==================== HANDLERS ====================
    // Pin Operations
    const openPinFromCanvas = useCallback(async (p) => {
        if (!plan?.id || !user?.id || !p || replaceMode) return;
        openedFromMenuRef.current = false;
        setMenu(m => ({ ...m, open: false }));
        const findPin = pinsRef.current.find(fp => fp.id == p.id) || p;

        await markPinSeen.mutateAsync({ planId: plan.id, pinId: p.id, userId: user.id, santierId: idSantier, isUnseen: findPin?.is_unseen });
        setSelection(prev => ({ ...prev, selectedPin: findPin }));

        setUi(prev => ({ ...prev, viewerOpen: true }));
    }, [plan?.id, user?.id, replaceMode, markPinSeen]);

    const handleSelectPinFromMenu = useCallback((p) => {
        openedFromMenuRef.current = true;
        setUi(prev => ({ ...prev, menuOpen: false, viewerOpen: true }));
        const findPin = pinsRef.current.find(fp => fp.id == p.id) || p;
        setSelection(prev => ({ ...prev, selectedPin: findPin || p }));
    }, [pins]);

    const closeViewer = useCallback(() => {
        const shouldReopenMenu = openedFromMenuRef.current;
        setUi(prev => ({
            ...prev,
            viewerOpen: false,
            menuOpen: shouldReopenMenu
        }));
        setSelection(prev => ({ ...prev, selectedPin: null }));
        openedFromMenuRef.current = false;
    }, []);

    const jumpToPin = useCallback((p) => {
        const viewer = viewerRef.current;
        if (!viewer || !p) return;

        const imgPoint = new OpenSeadragon.Point(
            p.x_pct * (plan?.width_px || 1),
            p.y_pct * (plan?.height_px || 1)
        );
        const vpPoint = viewer.viewport.imageToViewportCoordinates(imgPoint);
        viewer.viewport.panTo(vpPoint, true);
    }, [plan?.width_px, plan?.height_px]);


    const handleAddPinHere = useCallback(() => {
        if (!plan?.width_px || !plan?.height_px) return;

        const x_pct = menu.imgX / plan.width_px;
        const y_pct = menu.imgY / plan.height_px;
        const nextCode = String(pinsRef.current.reduce((max, p) => Number(p.code) > max ? Number(p.code) : max, 0) + 1);

        if (!display.remainPinState) {
            setPhotos([]);
            setGhost({
                x: menu.imgX,
                y: menu.imgY,
                x_pct,
                y_pct,
                status: "new",
                code: nextCode,
                reper: "",
                title: `Pin ${nextCode}`,
                description: "",
            });
        } else {
            setGhost(g => ({
                ...g,
                code: nextCode,
                x: menu.imgX,
                y: menu.imgY,
                x_pct,
                y_pct
            }));
        }

        setUi(prev => ({ ...prev, drawerOpen: true }));
        setMenu(m => ({ ...m, open: false }));
    }, [plan, menu, pins.length, display.remainPinState]);

    const handleSavePin = async (values) => {
        if (!plan || !ghost) return;

        const fd = new FormData();
        fd.append('plan_id', String(plan.id));
        fd.append('x_pct', String(ghost.x_pct));
        fd.append('y_pct', String(ghost.y_pct));
        fd.append('status', values.status || 'new');
        fd.append('priority', values.priority || 'medium');
        fd.append('title', values.title ?? '');
        fd.append('description', values.description ?? '');
        fd.append('reper', values.reper ?? '');

        if (values.assigned_user_id != null && values.assigned_user_id !== '') {
            fd.append('assigned_user_id', String(values.assigned_user_id));
        }

        const dueUtc = fmtDateTime(values.due_date);
        if (dueUtc) fd.append('due_date_utc', dueUtc);
        if (user?.id) fd.append('user_id', String(user.id));

        (values.photos || []).slice(0, 3).forEach((file) => {
            fd.append('photos', file, file.name || 'photo.jpg');
        });

        try {
            await createPin.mutateAsync({ formData: fd, planId: plan.id, userId: user.id });
            setUi(prev => ({ ...prev, drawerOpen: false }));

            if (!display.remainPinState) {
                setGhost(null);
                setPhotos([]);
            } else {
                setGhost(g => g ? {
                    ...g,
                    x: null,
                    y: null,
                    x_pct: null,
                    y_pct: null,
                    ...values,
                    photos: null
                } : null);
                setPhotos(values.photos || []);
            }
            toast.success("Pin creat cu succes!");
        } catch (e) {
            const msg = e?.response?.data?.message || "A apărut o eroare la salvarea pinului.";
            toast.error(msg);
        }
    };

    const handleCancelPin = () => {
        setUi(prev => ({ ...prev, drawerOpen: false }));

        if (!display.remainPinState) {
            setPhotos([]);
            setGhost(null);
        } else {
            setGhost(g => g ? { ...g, x: null, y: null, x_pct: null, y_pct: null } : null);
        }

        setSelection(prev => ({ ...prev, editingPin: null }));
    };

    const startEditPin = (pin) => {
        setSelection(prev => ({ ...prev, editingPin: pin }));
        setUi(prev => ({ ...prev, drawerOpen: true }));
    };

    const handleSaveEditedPin = async (patch) => {
        if (!selection.editingPin?.id) return;

        const fd = new FormData();
        fd.append("title", patch.title ?? "");
        fd.append("description", patch.description ?? "");
        fd.append("status", patch.status || "new");
        fd.append("priority", patch.priority || "medium");
        fd.append("reper", patch.reper ?? "");
        fd.append(
            "assigned_user_id",
            (patch.assigned_user_id == null || patch.assigned_user_id === "")
                ? ""
                : String(patch.assigned_user_id)
        );

        const dueUtc = fmtDateTime(patch.due_date) || "";
        fd.append("due_date_utc", dueUtc);

        const del = Array.isArray(patch.deleteExisting) ? patch.deleteExisting : [];
        fd.append("delete_existing", JSON.stringify(del));

        (patch.photosNew || []).slice(0, 3).forEach((file) => {
            fd.append("photos", file, file.name || "photo.jpg");
        });
        fd.append("user_id", String(user.id));

        try {
            const updated = await updatePin.mutateAsync({
                formData: fd,
                pinId: selection.editingPin.id,
                userId: user.id,
                planId: plan.id,
            });

            setUi(prev => ({ ...prev, drawerOpen: false }));
            setSelection(prev => ({ ...prev, editingPin: null, selectedPin: updated }));
            toast.success("Pin actualizat cu succes!");
        } catch (e) {
            const msg = e?.response?.data?.message || "A apărut o eroare la actualizarea pinului.";
            toast.error(msg);
        }
    };
    const deletePinAsk = async (pinToDel) => {
        if (!pinToDel?.id) return;
        setSelection(prev => ({ ...prev, deletePin: pinToDel }));
        setUi(prev => ({ ...prev, confirmDeletePin: true }));
    };

    const handleDeletePin = async () => {
        if (!selection.deletePin?.id) return;

        try {
            await deletePinMutation.mutateAsync({ pinId: selection.deletePin.id, planId: plan.id, userId: user.id });

            if (selection.selectedPin?.id === selection.deletePin.id) {
                setSelection({ selectedPin: null, editingPin: null, deletePin: null });
                setUi(prev => ({ ...prev, viewerOpen: false, confirmDeletePin: false }));
            } else {
                setSelection(prev => ({ ...prev, deletePin: null }));
                setUi(prev => ({ ...prev, confirmDeletePin: false }));
            }
            toast.success("Pin șters cu succes!");
        } catch (e) {
            const msg = e?.response?.data?.message || "A apărut o eroare la ștergerea pinului.";
            toast.error(msg);
        }
    };

    // Replace Plan Operations
    const openFilePicker = () => {
        if (!fileInputRef.current) return;
        fileInputRef.current.value = "";
        fileInputRef.current.click();
    };

    const handlePickFile = async (e) => {
        const file = e.target.files?.[0];
        if (!file || !plan?.id) return;

        const fd = new FormData();
        fd.append("plan_id", String(plan.id));
        fd.append("pdf", file);
        fd.append("dpi", plan.dpi);

        try {
            const preview = await previewReplacement.mutateAsync({
                planId: plan.id,
                formData: fd
            });

            if (!preview?.image_path) {
                throw new Error("Răspuns invalid de la server.");
            }

            setOverlayInfo({
                url: toApiUrl(preview.image_path, api.defaults.baseURL),
                publicPath: preview.image_path,
                dx: 0,
                dy: 0,
                width: preview.width_px,
                height: preview.height_px,
                opacity: 0.55,
            });
            setReplaceMode(true);
        } catch (e) {
            const msg = e?.response?.data?.message || "A apărut o eroare la adăugarea planului.";
            toast.error(msg);
        }
    };

    const cancelReplace = () => {
        setReplaceMode(false);
        setOverlayInfo({ url: "", publicPath: "", dx: 0, dy: 0, opacity: 0.55, width: 0, height: 0 });
    };


    const markAllPinsSeen = async () => {
        console.log("Marking all pins as seen for plan", plan?.id);
        if (!plan?.id || !user?.id) return;

        try {
            show();
            const unseenPins = pinsRef.current.filter(p => p.is_unseen);
            await Promise.all(unseenPins.map(p =>
                markPinSeen.mutateAsync({ planId: plan.id, pinId: p.id, userId: user.id, santierId: idSantier, isUnseen: true })
            ));
            toast.success("Toți pinii au fost marcați ca văzuți!");
        } catch (e) {
            const msg = e?.response?.data?.message || "A apărut o eroare la marcarea pinilor ca văzuți.";
            toast.error(msg);
        }
        finally {
            hide();
        }
    }

    const saveReplace = async () => {
        if (!replaceMode || !plan?.id) return;

        const payload = {
            preview_image_path: overlayInfo.publicPath,
            plan_id: plan.id,
            dx_px: overlayInfo.dx,
            dy_px: overlayInfo.dy,
            dpi: plan.dpi,
        };

        try {
            show();

            const updated = await commitReplacement.mutateAsync({ payload: payload, idSantier: idSantier, idUser: user.id });
            onPlanReplaced(updated);

            setReplaceMode(false);
            setOverlayInfo({ url: "", publicPath: "", dx: 0, dy: 0, opacity: 0.55, width: 0, height: 0 });
            toast.success("Plan actualizat cu succes!");
        } catch (e) {
            const msg = e?.response?.data?.message || "Nu s-a putut salva noul plan.";
            toast.error(msg);
        }
        finally {
            hide();
        }
    };

    // Zone Operations
    const handlePanel = async () => {
        try {
            const data = await refetchZonePatterns();
            setAllZones(data?.data?.patterns || []);
            setCurrentPatternId(data?.data?.currentPatternId ?? null);
            setUi(prev => ({ ...prev, zonePanelOpen: true }));
        } catch (e) {
            const msg = e?.response?.data?.message || "A apărut o eroare la deschiderea panoului de zone.";
            toast.error(msg);
        }
    };

    // Stage Interactions
    const handleStageContextMenu = useCallback((e) => {
        e.evt.preventDefault();
        if (replaceMode || measureMode) return;

        const viewer = viewerRef.current;
        const stage = stageRef.current;
        if (!viewer || !stage) return;

        const img = pixelToImagePoint(stage, viewer, OpenSeadragon);
        if (!img) return;

        const ptr = stage.getPointerPosition();
        if (!ptr) return;

        setMenu({ open: true, x: ptr.x, y: ptr.y, imgX: img.x, imgY: img.y });
    }, [replaceMode, measureMode]);

    const handleStageClick = useCallback((e) => {
        if (wasPanning()) return;
        if (measureMode) {
            handleMeasureClick(e);
        }
    }, [wasPanning, measureMode, handleMeasureClick]);

    const handleDownloadVisiblePNG = useCallback(() => {
        const dataUrl = exportVisibleCompositePNG(viewerRef.current, stageRef.current, 2);
        downloadDataURL(dataUrl, `${(plan?.title || "plan")}_view.png`);
    }, [plan?.title]);

    // Utility
    const toPx = useCallback(
        (p) => ({
            x: p.x_pct * plan.width_px,
            y: p.y_pct * plan.height_px,
        }),
        [plan?.width_px, plan?.height_px]
    );

    // ==================== MEASURE HUD EFFECT ====================
    useEffect(() => {
        const hud = hudLayerRef.current;
        if (!hud) return;

        hud.destroyChildren();

        if (measureMode && measureDraft.length) {
            const ptsImg = [...measureDraft, ...(measureHover ? [measureHover.x, measureHover.y] : [])];
            const ptsScr = [];

            for (let i = 0; i < ptsImg.length; i += 2) {
                const scr = imageToScreenUtil(viewerRef.current, { x: ptsImg[i], y: ptsImg[i + 1] });
                if (scr) ptsScr.push(scr.x, scr.y);
            }

            const lenPx = polylineLengthPx(ptsImg);
            const lenM = pxToMeters(lenPx, plan?.meters_per_px);

            let currSegM = null;
            if (measureDraft.length >= 2 && measureHover) {
                const ax = measureDraft[measureDraft.length - 2];
                const ay = measureDraft[measureDraft.length - 1];
                const bx = measureHover.x;
                const by = measureHover.y;
                currSegM = pxToMeters(Math.hypot(bx - ax, by - ay), plan?.meters_per_px);
            }

            const oldR = 4, currR = 7, strokePx = 3, fontPx = 16;

            if (ptsScr.length > 4) {
                hud.add(new window.Konva.Line({
                    points: ptsScr.slice(0, -2),
                    stroke: '#6b7280',
                    strokeWidth: strokePx,
                    listening: false,
                }));
            }

            hud.add(new window.Konva.Line({
                points: [ptsScr[ptsScr.length - 4], ptsScr[ptsScr.length - 3], ptsScr[ptsScr.length - 2], ptsScr[ptsScr.length - 1]],
                stroke: '#0f766e',
                strokeWidth: strokePx,
                dash: [10, 5],
                listening: false,
            }));

            for (let i = 0; i < ptsScr.length - 2; i += 2) {
                hud.add(new window.Konva.Circle({
                    x: ptsScr[i],
                    y: ptsScr[i + 1],
                    radius: oldR,
                    fill: '#6b7280',
                    listening: false,
                }));
            }

            const ex = ptsScr[ptsScr.length - 2];
            const ey = ptsScr[ptsScr.length - 1];

            hud.add(new window.Konva.Circle({
                x: ex, y: ey, radius: currR, fill: '#0f766e', listening: false,
            }));

            const textLines = [
                currSegM != null ? `Line: ${formatMeters(currSegM)}` : null,
                '----------------------',
                `Total: ${formatMeters(lenM)}`
            ].filter(Boolean);

            const text = new window.Konva.Text({
                x: ex + 32, y: ey - 16,
                text: textLines.join('\n'),
                fontSize: fontPx, fill: '#000', padding: 6, listening: false,
            });

            const box = new window.Konva.Rect({
                x: text.x(), y: text.y(),
                width: text.width(), height: text.height(),
                fill: 'rgba(255,255,255,0.7)',
                stroke: '#000', strokeWidth: 1, cornerRadius: 4, listening: false,
            });

            hud.add(box);
            hud.add(text);
        }

        hud.draw();
    }, [measureMode, measureDraft, measureHover, viewSyncTick, plan?.meters_per_px]);



    // ==================== RENDER ====================
    return (
        <div className="h-full w-full relative">
            {/* Hidden file input */}
            <input
                type="file"
                ref={fileInputRef}
                accept="application/pdf"
                className="hidden"
                onChange={handlePickFile}
            />

            {/* Top left info */}
            <div className="absolute top-4 flex flex-col items-start gap-3 left-4 z-10">
                <Card className="shadow-lg rounded-sm h-12 border-foreground bg-card">
                    <CardContent className=" flex p-0 px-4 h-full items-center gap-2 text-sm font-medium text-foreground">
                        <span className="first-letter:uppercase">{plan.title}</span>
                        <span className="text-muted-foreground">•</span>
                        <span>{plan.scale_label}</span>
                        <span className="text-muted-foreground">•</span>
                        <span>{plan.dpi} DPI</span>
                        <span className="text-muted-foreground">•</span>
                        <span className="flex items-center gap-1.5">Pini: <Badge variant="default" className="p-1 px-2 hover:bg-primary">{pins.length}</Badge></span>
                        <span className="text-muted-foreground">•</span>
                        <span className="flex items-center gap-1.5">Vizibili: <Badge variant="default" className="p-1 px-2 hover:bg-primary">{filteredPins.length}</Badge></span>
                    </CardContent>
                </Card>

                <div className="flex gap-2 items-center">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => refetchPins()}
                        className="shadow-lg relative group rounded-sm bg-card h-12 w-12 border-foreground hover:bg-accent text-foreground"
                    >
                        <FontAwesomeIcon
                            className="hover:rotate-180 transition-all duration-300"
                            icon={faRotate}
                        />
                        <div className="absolute left-0 top-full mt-3 whitespace-nowrap px-3 py-1 rounded-lg bg-popover text-popover-foreground text-sm border border-foreground opacity-0 pointer-events-none transition-opacity duration-150 group-hover:opacity-100 z-50">
                            Reîncarcă Pinii
                        </div>
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => markAllPinsSeen()}
                        className="shadow-lg relative group rounded-sm bg-card h-12 w-12 border-foreground hover:bg-accent text-foreground"
                    >
                        <FontAwesomeIcon
                            className="hover:rotate-180 transition-all duration-300"
                            icon={faEye}
                        />
                        <div className="absolute left-1/2 -translate-x-1/2 top-full mt-3 whitespace-nowrap px-3 py-1 rounded-lg bg-popover text-popover-foreground text-sm border border-foreground opacity-0 pointer-events-none transition-opacity duration-150 group-hover:opacity-100 z-50">
                            Marchează toți pinii ca văzuți
                        </div>
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => onSelectDrawingZone(true)}
                        className="shadow-lg rounded-sm bg-card h-12 text-foreground border-foreground hover:bg-primary transition-colors gap-2"
                    >
                        <FontAwesomeIcon icon={faRoad} />
                        Ajustează Traseele
                    </Button>
                </div>
            </div>

            {/* Top right controls */}
            <div className="absolute top-2 right-2 select-none z-10 flex items-center gap-3">
                {!replaceMode ? (
                    <>
                        <button
                            onClick={() => setUi(prev => ({ ...prev, showPins: !prev.showPins }))}
                            className={`group relative gap-2 flex items-center text-foreground hover:bg-hoverGreen shadow-lg text-base transition-colors
                                ${ui.showPins ? "bg-activeGreen" : "bg-card "} 
                                border border-foreground px-4 h-12 rounded shadow`}
                        >
                            <FontAwesomeIcon icon={faLocationDot} className="text-xl" />
                            <div className="absolute left-1/2 top-full mt-3 -translate-x-1/2 whitespace-nowrap px-3 py-1 rounded-lg bg-popover text-popover-foreground text-sm border border-foreground opacity-0 pointer-events-none transition-opacity duration-150 group-hover:opacity-100 z-50">
                                {ui.showPins ? "Ascunde pinii" : "Arată pinii"}
                            </div>
                        </button>

                        <button
                            onClick={() => setUi(prev => ({ ...prev, showZones: !prev.showZones }))}
                            className={`group relative gap-2 flex items-center shadow-lg text-base transition-colors text-foreground
                                ${zones.length === 0 ? "opacity-60 cursor-not-allowed bg-card hover:bg-card " : ui.showZones ? "bg-activeGreen  hover:bg-hoverGreen" : "bg-card   hover:bg-hoverGreen"} 
                                border border-foreground px-4 h-12 rounded shadow`}
                            disabled={zones.length === 0}
                        >
                            <FontAwesomeIcon icon={faMap} className="text-xl" />
                            <div className="absolute left-1/2 top-full mt-3 -translate-x-1/2 whitespace-nowrap px-3 py-1 rounded-lg bg-popover  text-foreground text-sm border border-foreground opacity-0 pointer-events-none transition-opacity duration-150 group-hover:opacity-100 z-50">
                                {zones.length === 0 ? "Nu există zone" : ui.showZones ? "Ascunde Zonele" : "Arată Zonele"}
                            </div>
                        </button>

                        <button
                            onClick={handlePanel}
                            className="group relative gap-2 flex items-center text-base shadow-lg text-foreground bg-card hover:bg-accent transition-colors border border-foreground px-4 h-12 rounded"
                        >
                            <FontAwesomeIcon icon={faHashtag} className="text-xl" />
                            <div className="absolute left-1/2 top-full mt-3 -translate-x-1/2 whitespace-nowrap px-3 py-1 rounded-lg bg-popover text-popover-foreground text-sm border border-foreground opacity-0 pointer-events-none transition-opacity duration-150 group-hover:opacity-100 z-50">
                                Organizarea zonelor
                            </div>
                        </button>

                        <button
                            onClick={openFilePicker}
                            disabled={previewReplacement.isPending}
                            className={`group relative gap-2 flex items-center text-base shadow-lg text-foreground bg-card border border-foreground px-4 h-12 rounded transition-colors
                                ${previewReplacement.isPending ? "opacity-60 cursor-not-allowed" : "hover:bg-accent"}`}
                        >
                            <FontAwesomeIcon icon={faFolderOpen} className="text-xl" />
                            {previewReplacement.isPending && <p>Se încarcă...</p>}
                            <div className="absolute left-1/2 top-full mt-3 -translate-x-1/2 whitespace-nowrap px-3 py-1 rounded-lg bg-popover text-popover-foreground text-sm border border-foreground opacity-0 pointer-events-none transition-opacity duration-150 group-hover:opacity-100 z-50">
                                {previewReplacement.isPending ? "Se încarcă..." : "Actualizează Planul"}
                            </div>
                        </button>

                        <button
                            onClick={() => setUi(prev => ({ ...prev, BW: !prev.BW }))}
                            className={`group relative gap-2 flex hover:bg-hoverGreen items-center text-foreground text-base transition-colors
                                ${ui.BW ? "bg-activeGreen" : "bg-card"} 
                                border border-foreground px-4 h-12 rounded shadow`}
                        >
                            <FontAwesomeIcon icon={faBrush} className="text-lg" />
                            <div className="absolute left-1/2 top-full mt-3 -translate-x-1/2 whitespace-nowrap px-3 py-1 rounded-lg bg-popover text-popover-foreground text-sm border border-foreground opacity-0 pointer-events-none transition-opacity duration-150 group-hover:opacity-100 z-50">
                                {!ui.BW ? "Alb-Negru" : "Color"}
                            </div>
                        </button>

                        <button
                            onClick={handleDownloadVisiblePNG}
                            className="group relative gap-2 flex items-center text-base shadow-lg text-foreground bg-card hover:bg-accent transition-colors border border-foreground px-4 h-12 rounded"
                        >
                            <FontAwesomeIcon icon={faDownload} className="text-xl" />
                            <div className="absolute left-1/2 top-full mt-3 -translate-x-1/2 whitespace-nowrap px-3 py-1 rounded-lg bg-popover text-popover-foreground text-sm border border-foreground opacity-0 pointer-events-none transition-opacity duration-150 group-hover:opacity-100 z-50">
                                Descarcă imaginea
                            </div>
                        </button>

                        <button
                            onClick={toggleMeasureMode}
                            className={`group relative gap-2 flex items-center text-base transition-colors text-foreground hover:bg-hoverGreen
                                ${!plan?.meters_per_px ? "opacity-60 bg-card text-foreground cursor-not-allowed" : measureMode ? "bg-activeGreen" : "bg-card"}
                                border border-foreground px-4 h-12 rounded shadow-lg`}
                            disabled={!plan?.meters_per_px}
                        >
                            <FontAwesomeIcon icon={faRuler} className="text-xl" />
                            <div className="absolute left-1/2 top-full mt-3 -translate-x-1/2 whitespace-nowrap px-3 py-1 rounded-lg bg-popover text-popover-foreground text-sm border border-foreground opacity-0 pointer-events-none transition-opacity duration-150 group-hover:opacity-100 z-50">
                                {measureMode ? "Măsurare activă" : "Măsoară distanțe"}
                            </div>
                        </button>

                        <button
                            onClick={() => setUi(prev => ({ ...prev, menuOpen: true }))}
                            className="gap-2 flex items-center text-base text-foreground bg-card hover:bg-accent transition-colors border border-foreground px-4 h-12 rounded shadow-lg"
                        >
                            <FontAwesomeIcon icon={faBars} className="text-xl" />
                            <span className="text-lg">Meniu</span>
                        </button>
                    </>
                ) : (
                    <>
                        <div className="gap-2 flex items-center text-base text-foreground bg-card border border-foreground px-3 py-2 h-12 rounded shadow-lg">
                            <span className="mr-2">Transparență</span>
                            <Input
                                type="range"
                                min={0.1}
                                max={1}
                                step={0.05}
                                value={overlayInfo.opacity}
                                onChange={(e) => setOverlayInfo(o => ({ ...o, opacity: Number(e.target.value) }))}
                            />
                        </div>

                        <button
                            onClick={saveReplace}
                            disabled={commitReplacement.isPending}
                            className="gap-2 flex items-center text-base text-foreground bg-activeGreen hover:bg-hoverGreen transition-colors border border-foreground px-4 h-12 rounded shadow-lg disabled:opacity-60"
                        >
                            <FontAwesomeIcon icon={faCheck} className="text-xl" />
                            <span className="text-lg">{commitReplacement.isPending ? "Se salvează..." : "Confirmă înlocuirea"}</span>
                        </button>

                        <button
                            onClick={cancelReplace}
                            className="gap-2 flex items-center text-base text-destructive-foreground bg-destructive hover:bg-destructive/90 transition-colors border border-foreground px-4 h-12 rounded shadow-lg"
                        >
                            <FontAwesomeIcon icon={faXmark} className="text-xl" />
                            <span className="text-lg">Renunță</span>
                        </button>
                    </>
                )}
            </div>

            {/* OSD Container */}
            <div ref={osdRef} className={`absolute inset-0 ${ui.BW ? 'grayscale' : ''}`} />

            {/* Konva Container */}
            <div ref={containerRef} className="absolute inset-0">
                {size.w > 0 && size.h > 0 && (
                    <>
                        <Stage
                            ref={stageRef}
                            width={size.w}
                            height={size.h}
                            pixelRatio={1}
                            draggable={false}
                            onWheel={handleWheel}
                            onMouseDown={handleMouseDown}
                            onMouseMove={(e) => {
                                handleMouseMove(e);
                                if (measureMode) handleMeasureMove(e);
                            }}
                            onMouseUp={handleMouseUp}
                            onMouseLeave={handleMouseLeave}
                            onContextMenu={handleStageContextMenu}
                            onClick={handleStageClick}
                        >
                            {/* Zones Layer */}
                            <Layer listening={false} imageSmoothingEnabled>
                                {ui.showZones && zones.map((z) => {
                                    const fillColor = hexToRgba(z.colorHex, z.opacity ?? 0.3);
                                    return (
                                        <Group key={z.id} listening={false}>
                                            <Line
                                                points={z.points}
                                                closed
                                                fill={fillColor}
                                                stroke="black"
                                                strokeWidth={z.strokeWidth ?? 3}
                                                shadowForStrokeEnabled={false}
                                                perfectDrawEnabled={false}
                                            />
                                        </Group>
                                    );
                                })}
                            </Layer>

                            {/* Overlay Preview Layer */}
                            {replaceMode && overlayImg && (
                                <Layer listening>
                                    <KonvaImage
                                        image={overlayImg}
                                        width={overlayInfo.width}
                                        height={overlayInfo.height}
                                        x={overlayInfo.dx}
                                        y={overlayInfo.dy}
                                        opacity={overlayInfo.opacity}
                                        draggable
                                        onMouseDown={(e) => e.cancelBubble = true}
                                        onTouchStart={(e) => e.cancelBubble = true}
                                        onDragStart={(e) => e.cancelBubble = true}
                                        onDragMove={(e) => e.cancelBubble = true}
                                        onDragEnd={(e) => {
                                            e.cancelBubble = true;
                                            const { x, y } = e.target.position();
                                            setOverlayInfo(o => ({ ...o, dx: x, dy: y }));
                                        }}
                                    />
                                </Layer>
                            )}

                            {/* Pins Layer */}
                            <Layer
                                // ref={pinsLayerRef}
                                visible={ui.showPins}
                                listening={!measureMode && !replaceMode}
                            >
                                {viewSyncTick >= 0 && filteredPins.map((p) => {
                                    const { x, y } = toPx(p);
                                    const statusColor = ({
                                        new: '#8B5CF6',
                                        in_progress: '#F59E0B',
                                        done: '#22C55E',
                                        checked: '#3B82F6',
                                        blocked: '#E11D48',
                                        cancelled: '#6B7280',
                                    }[p.status]) || "#3B82F6";
                                    return (
                                        <Pin
                                            key={p.id}
                                            x={x}
                                            y={y}
                                            label={p.code || p.title || String(p.id)}
                                            color={statusColor}
                                            invScale={1 / (scaleRef.current || 1)}
                                            onClick={() => openPinFromCanvas(p)}
                                            showBang={!!p.is_unseen}
                                        />
                                    );
                                })}

                                {!replaceMode && ghost && ghost.x != null && ghost.y != null && (
                                    <Pin
                                        x={ghost.x}
                                        y={ghost.y}
                                        label={ghost.code}
                                        color="#8B5CF6"
                                        opacity={0.6}
                                        invScale={1 / (scaleRef.current || 1)}
                                    />
                                )}
                            </Layer>

                            {/* Zone Labels Layer */}
                            <Layer listening={false}>
                                {zones.map(z => (
                                    ui.showZones && z.title && (
                                        <Text
                                            key={`${z.id}:${z.title}`}
                                            text={z.title}
                                            x={z.labelX}
                                            y={z.labelY}
                                            width={z.labelW || 200}
                                            height={124}
                                            fontSize={124}
                                            fontStyle="bold"
                                            align="center"
                                            verticalAlign="middle"
                                            wrap="none"
                                            fill="#000"
                                            listening={false}
                                        />
                                    )
                                ))}
                            </Layer>
                        </Stage>

                        {/* HUD Stage (Measure) */}
                        <Stage
                            ref={hudRef}
                            width={size.w}
                            height={size.h}
                            listening={false}
                            className="absolute inset-0 pointer-events-none"
                        >
                            <Layer ref={hudLayerRef} />
                        </Stage>
                    </>
                )}

                {/* Context Menu */}
                {!replaceMode && menu.open && (
                    <div
                        className="absolute z-50 min-w-[12rem] overflow-hidden rounded-md border border-border bg-card
                        text-foreground shadow-md animate-in fade-in-0 zoom-in-95 duration-150 origin-top-left"
                        style={{ left: menu.x, top: menu.y }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            className="relative flex w-full cursor-pointer select-none items-center rounded-sm p-2 text-base font-medium outline-none transition-colors hover:bg-accent hover:text-foreground gap-2"
                            onClick={handleAddPinHere}
                        >
                            <FontAwesomeIcon icon={faCirclePlus} className="text-lg text-primary" />
                            <span>Adaugă pin aici</span>
                        </button>
                    </div>
                )}
            </div>

            {/* Dialogs & Drawers */}
            <PinViewer
                open={ui.viewerOpen}
                remainCommentState={display.remainCommentState}
                setRemainCommentState={(val) => setDisplay(prev => ({ ...prev, remainCommentState: val }))}
                pin={selection.selectedPin}
                onClose={closeViewer}
                onEditPin={startEditPin}
                onDeletePin={deletePinAsk}
            />

            <PlanPinDrawer
                editingPin={selection.editingPin}
                setEditingPin={(pin) => setSelection(prev => ({ ...prev, editingPin: pin }))}
                open={ui.drawerOpen}
                photos={photos}
                setPhotos={setPhotos}
                initial={{
                    title: ghost?.title || "",
                    description: ghost?.description || "",
                    status: ghost?.status || "new",
                    priority: ghost?.priority || "medium",
                    assigned_user_id: ghost?.assigned_user_id || "",
                    due_date: ghost?.due_date || "",
                    reper: ghost?.reper || "",
                }}
                onCancel={handleCancelPin}
                onSave={handleSavePin}
                saveEditingPin={handleSaveEditedPin}
                remainPinState={display.remainPinState}
                setRemainPinState={(val) => setDisplay(prev => ({ ...prev, remainPinState: val }))}
            />

            <MenuRezerve
                open={ui.menuOpen}
                onClose={() => setUi(prev => ({ ...prev, menuOpen: false }))}
                pins={pins}
                filters={filters}
                onChangeFilters={setFilters}
                onSelectPin={handleSelectPinFromMenu}
                planId={plan?.id}
                exportVisibleStagePNG={() => exportVisibleCompositePNG(viewerRef.current, stageRef.current, 2)}
                onJumpToPin={jumpToPin}
                showPins={ui.showPins}
            />

            <DeleteDialog
                open={ui.confirmDeletePin}
                setOpen={(val) => setUi(prev => ({ ...prev, confirmDeletePin: false }))}
                title="Ștergi acest pin?"
                description="Acțiunea este ireversibilă. Ești sigur că vrei să continui?"
                onSubmit={handleDeletePin}
                onCancel={() => setUi(prev => ({ ...prev, confirmDeletePin: false }))}
            />

            {/* Zone Panel */}
            {ui.zonePanelOpen && (
                <Dialog open={ui.zonePanelOpen} onOpenChange={(open) => setUi(prev => ({ ...prev, zonePanelOpen: open }))}>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                    <FontAwesomeIcon icon={faHashtag} className="text-xl" />
                                </div>
                                <span>Organizarea zonelor</span>
                            </DialogTitle>
                            <DialogDescription>
                                Lista modelelor salvate pentru acest șantier.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="mt-4 max-h-[400px] overflow-y-auto space-y-3 pr-1">
                            {allZones.length === 0 && (
                                <div className="text-center py-8 text-muted-foreground">
                                    Nu există încă pattern-uri salvate pentru acest șantier.
                                </div>
                            )}

                            {allZones.map((patt) => {
                                const isActive = patt.id === currentPatternId;
                                return (
                                    <Card
                                        key={patt.id}
                                        className={`transition-all ${isActive
                                            ? "border-primary bg-primary/5 shadow-md"
                                            : "border-border hover:bg-accent/50"
                                            }`}
                                    >
                                        <CardContent className="p-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <h4 className="text-base font-semibold text-foreground">
                                                    {patt.name || `Pattern #${patt.id}`}
                                                </h4>
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="outline" className="text-sm">
                                                        {patt.zones_count ?? 0} zone
                                                    </Badge>
                                                    {isActive && (
                                                        <Badge className="text-sm bg-primary text-primary-foreground">
                                                            Curent
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                            {patt.description && (
                                                <p className="text-sm text-muted-foreground leading-relaxed">
                                                    {patt.description}
                                                </p>
                                            )}
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>

                        <div className="mt-6 flex justify-between items-center gap-3">
                            <Button
                                onClick={() => onSelectManagementZone(true)}
                                className="gap-2"
                            >
                                <FontAwesomeIcon icon={faPlus} />
                                Creează o zonă nouă
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => setUi(prev => ({ ...prev, zonePanelOpen: false }))}
                            >
                                Închide
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            )}

            {loadingGlobal && !loading && <SpinnerElement text={2} />}
        </div>
    );
}