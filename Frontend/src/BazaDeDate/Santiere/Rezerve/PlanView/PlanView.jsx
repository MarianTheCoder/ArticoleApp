// src/components/Rezerve/PlanViewKonva.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback, useContext } from "react";
import { Stage, Layer, Image as KonvaImage, Circle, Text, Group, Line } from "react-konva";
import useImage from "use-image";
import api from "../../../../api/axiosAPI";
import PlanPinDrawer from "../PlanView/PlanPinDrawer";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBars, faBrush, faDownload, faFolderOpen, faPlus, faCheck, faXmark, faHashtag, faLocationDot, faRotate, faMap, faRuler, faMapLocationDot, faRoad } from "@fortawesome/free-solid-svg-icons";
import { AuthContext } from "../../../../context/TokenContext";
import PinViewer from "./PinViewer";
import MenuRezerve from "./MenuRezerve";
import SpinnerElement from "../../../../MainElements/SpinnerElement";
import OpenSeadragon from 'openseadragon';
import Pin from "./Pin.jsx";
import {
    toApiUrl,
    hexToRgba,
    fmtDateTime,
    pixelToImagePoint,
    vpPointFromPointer,
    imageToScreen as imageToScreenUtil,
    downloadDataURL,
    exportVisibleCompositePNG,
    pxToMeters, formatMeters,
    polylineLengthPx, snapToAngleStep,

} from "../PlanUtils.js";


export default function PlanViewKonva({ plan, onPlanReplaced, onSelectManagementZone, onSelectDrawingZone }) {
    const { user } = useContext(AuthContext);
    const [loading, setLoading] = useState(true);

    //DZI FILES
    const osdRef = useRef(null);
    const rafRef = useRef(null);
    const viewerRef = useRef(null);
    //hud for measure
    const hudRef = useRef(null);
    const hudLayerRef = useRef(null);

    const useOSD = !!plan?.tiles_base_url || !!plan?.dzi_url;

    // OSD pan state (when useOSD is true we pan the viewer on mouse drag)
    // at top-level (near other consts)
    const DRAG_THRESHOLD_PX = 8; // tweak to taste (6–12 usually feels good)
    const osdDragRef = useRef({ dragging: false, start: null, last: null, moved: false, panning: false });
    const getViewer = () => viewerRef.current;

    const containerRef = useRef(null);
    const stageRef = useRef(null);
    const imageLayerRef = useRef(null);

    const [zonePanelOpen, setZonePanelOpen] = useState(false);
    const [allZones, setAllZones] = useState([]);
    const [currentPatternId, setCurrentPatternId] = useState(null);

    const [zones, setZones] = useState([]);
    const [showZones, setShowZones] = useState(false);
    const [viewSyncTick, setViewSyncTick] = useState(0); // forces re-render on zoom/pan

    const [BW, setBW] = useState(false);

    //keep comment state if checked
    const [remainCommentState, setRemainCommentState] = useState(false);
    //keep pin state if checked
    const [remainPinState, setRemainPinState] = useState(false);

    const [size, setSize] = useState({ w: 0, h: 0 });
    const [scale, setScale] = useState(1);
    const [pos, setPos] = useState({ x: 0, y: 0 });
    const posRef = useRef(pos);
    const scaleRef = useRef(scale);
    useEffect(() => { posRef.current = pos; }, [pos]);
    useEffect(() => { scaleRef.current = scale; }, [scale]);

    // Live preview numbers for the thickness slider

    const [pins, setPins] = useState([]);
    const [error, setError] = useState("");

    // ghost pin
    const [ghost, setGhost] = useState(null);
    //pozele din pin saved
    const [photos, setPhotos] = useState([]);


    // drawer (create-pin) state
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [showPins, setShowPins] = useState(true);

    // --- ROUTE DRAWING STATE ---






    // menu (list+filters) state
    const [menuOpen, setMenuOpen] = useState(false);

    //ruler mode activation 
    // Measure tool
    const [measureMode, setMeasureMode] = useState(false);
    const [measureDraft, setMeasureDraft] = useState([]);       // [x,y,...] current polyline being drawn
    const [measureHover, setMeasureHover] = useState(null);     // {x,y} live cursor in IMAGE coords

    // keep measureDraft fresh inside callbacks
    const measureDraftRef = useRef(measureDraft);
    useEffect(() => { measureDraftRef.current = measureDraft; }, [measureDraft]);

    // filters shared with MenuRezerve
    const [filters, setFilters] = useState({
        status: "",
        assignedId: "",
        createdBy: "",
        title: "",
        reper: "",
        dueUntil: "",
        lastUpdated: "",
        noUntil: false,
    });

    // context menu state
    const [menu, setMenu] = useState({ open: false, x: 0, y: 0, imgX: 0, imgY: 0 });

    // pin viewer
    const [selectedPin, setSelectedPin] = useState(null);
    const [viewerOpen, setViewerOpen] = useState(false);
    //editing pin?
    const [editingPin, setEditingPin] = useState(null);
    //confirmi ca se sterge?
    const [confirmDeletePin, setConfirmDeletePin] = useState(false);
    const [deletePin, setDeletePin] = useState(null);

    // track source of last open
    const openedFromMenuRef = useRef(false);

    // one-shot init when plan changes (based on initial scale)
    useEffect(() => {
        // reset states
        //
        setConfirmDeletePin(false);
        setDeletePin(null);
        setError("");
        setDrawerOpen(false);
        setViewerOpen(false);
        setSelectedPin(null);
        setEditingPin(null);
        setMeasureDraft([]); setMeasureHover(null);
        setMeasureMode(false);
        setShowZones(false);
        setShowPins(true);
        setGhost((prev) => (remainPinState && prev ? { ...prev, x: null, y: null, x_pct: null, y_pct: null } : null));


    }, [plan?.id]); // init pe plan nou




    // --------------- UPDATE PLAN (PREVIEW / REPLACE) ---------------
    const fileInputRef = useRef(null);
    const [replaceMode, setReplaceMode] = useState(false);
    const [overlayInfo, setOverlayInfo] = useState({
        url: "",     // preview plan image url
        dx: 0,       // overlay offset in IMAGE pixels (x)
        dy: 0,       // overlay offset in IMAGE pixels (y)
        opacity: 0.55,
    });
    const [overlayImg] = useImage(overlayInfo.url || null, "anonymous", "origin");
    const [uploading, setUploading] = useState(false);
    const [savingReplace, setSavingReplace] = useState(false);

    const openFilePicker = () => {
        if (!fileInputRef.current) return;
        fileInputRef.current.value = ""; // reset
        fileInputRef.current.click();
    };

    const handlePickFile = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!plan?.id) return;
        setLoading(true);
        setUploading(true);
        setError("");
        try {
            const fd = new FormData();
            fd.append("plan_id", String(plan.id));
            fd.append("pdf", file); // ⚠ adjust field name to your backend
            fd.append("dpi", plan.dpi);

            // ⬇️ CALL YOUR PREVIEW ENDPOINT
            const { data } = await api.post("/Rezerve/plans/plansPreview", fd, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            const preview = data?.preview || data; // { image_path, width_px, height_px }
            if (!preview?.image_path) {
                throw new Error("Răspuns invalid de la server.");
            }

            setOverlayInfo({
                url: toApiUrl(preview.image_path, api.defaults.baseURL),
                publicPath: preview.image_path,
                dx: 0,
                dy: 0,
                opacity: 0.55,
            });
            setReplaceMode(true);
        } catch (e2) {
            setError(e2?.response?.data?.error || e2?.message || "Upload eșuat.");
        } finally {
            setUploading(false);
            setLoading(false);
        }
    };


    const cancelReplace = () => {
        setReplaceMode(false);
        setOverlayInfo({ url: "", dx: 0, dy: 0, opacity: 0.55 });
    };

    const saveReplace = async () => {
        if (!replaceMode || !plan?.id) return;
        setSavingReplace(true);
        setError("");
        setLoading(true);
        try {
            // ⬇️ CALL YOUR COMMIT ENDPOINT
            const payload = {
                preview_image_path: overlayInfo.publicPath, // <-- REQUIRED
                plan_id: plan.id,
                dx_px: overlayInfo.dx,
                dy_px: overlayInfo.dy,
                dpi: plan.dpi,
            };
            const { data } = await api.post("/Rezerve/plans/commitNewPlan", payload);

            const updated = data?.plan || data;
            if (!updated?.image_path) throw new Error("Răspuns invalid la commit.");

            // Update current plan image in-place
            // If parent needs to know, call onPlanReplaced?.(updated);
            if (typeof onPlanReplaced === "function") onPlanReplaced(updated);
            setReplaceMode(false);
            setOverlayInfo({ url: "", dx: 0, dy: 0, opacity: 0.55 });
        } catch (e) {
            setError(e?.response?.data?.error || e?.message || "Nu s-a putut salva noul plan.");
        } finally {
            setSavingReplace(false);
            setLoading(false);
        }
    };

    // ---------------- Pins open handlers ----------------
    const openPinFromCanvas = useCallback(async (p) => {
        if (!plan?.id || !user?.id || !p || replaceMode) return;

        openedFromMenuRef.current = false;
        setMenu(m => ({ ...m, open: false }));

        setPins(prev => {
            const next = prev.map(pin =>
                pin.id === p.id ? { ...pin, is_unseen: 0 } : pin
            );
            const fresh = next.find(pin => pin.id === p.id);
            setSelectedPin(fresh);            // <- use the fresh one
            return next;
        });

        try {
            api.post(`/Rezerve/pins/markSeenPlan/${plan.id}/${p.id}`, { user_id: user.id });
        } catch { }

        setViewerOpen(true);
    }, [plan?.id, user?.id, replaceMode]);

    const handleSelectPinFromMenu = useCallback((p) => {
        openedFromMenuRef.current = true;
        setMenuOpen(false);

        setPins(prev => {
            const next = prev.map(pin =>
                pin.id === p.id ? { ...pin, is_unseen: 0 } : pin
            );
            const fresh = next.find(pin => pin.id === p.id);
            setSelectedPin(fresh);            // <- fresh again
            return next;
        });

        setViewerOpen(true);
    }, []);

    const closeViewer = useCallback(() => {
        setViewerOpen(false);
        setSelectedPin(null);
        if (openedFromMenuRef.current) {
            setMenuOpen(true);
            openedFromMenuRef.current = false;
        }
    }, []);

    const loadPins = async () => {
        setPins([]);
        console.log("Loading pins...");
        setError("");
        if (!plan?.id) return;
        try {
            const { data } = await api.get("/Rezerve/pins", { params: { plan_id: plan.id, user_id: user.id } });
            const list = data?.pins ?? [];
            setPins(list);
        } catch (e) {
            setError(e?.response?.data?.error || "Failed to load pins");
        } finally {
            setLoading(false);
        }
    };

    const loadZone = async () => {
        if (!plan?.id || !plan?.width_px || !plan?.height_px) {
            setZones([]);
            return;
        }

        try {
            // route for specific pattern + zones of this plan
            const { data } = await api.get(`/Rezerve/managementZones/specific/${plan.id}`);

            const rawZones = Array.isArray(data?.zones) ? data.zones : [];

            const mapped = rawZones.map((z) => {
                // points can come as array or JSON string with pct coords [x_pct, y_pct, ...]
                let pts = [];
                if (Array.isArray(z.points)) {
                    pts = z.points;
                } else if (z.points_json) {
                    try {
                        const parsed = JSON.parse(z.points_json);
                        if (Array.isArray(parsed)) pts = parsed;
                    } catch { }
                }

                // convert pct -> px
                const ptsPx = pts.map((v, i) =>
                    i % 2 === 0
                        ? v * plan.width_px
                        : v * plan.height_px
                );

                const labelX = (z.label_x_pct ?? 0.5) * plan.width_px;
                const labelY = (z.label_y_pct ?? 0.5) * plan.height_px;
                const labelW = (z.label_w_pct ?? 0.15) * plan.width_px;

                return {
                    id: z.id,
                    title: z.title || "",
                    points: ptsPx,
                    colorHex: z.color_hex || "#ff7f50",
                    opacity: z.opacity ?? 0.3,
                    strokeWidth: z.stroke_width ?? 3,
                    labelX,
                    labelY,
                    labelW,
                };
            });

            setZones(mapped);
        } catch (e) {
            console.log(e?.response?.data?.error || e?.message || "Failed to load zones");
            setZones([]);
        }
    };

    // load pins
    useEffect(() => {
        loadPins();
        loadZone();
    }, [plan?.id, user?.id]);

    // sizing
    useEffect(() => {
        if (!containerRef.current) return;
        const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
        ro.observe(containerRef.current);
        return () => ro.disconnect();
    }, [plan]);


    // jump to pin
    const jumpToPin = useCallback((p) => {
        const viewer = getViewer(); if (!viewer || !p) return;
        // p.x_pct / p.y_pct are [0..1] of image
        const imgPoint = new OpenSeadragon.Point(
            p.x_pct * (plan?.width_px || 1),
            p.y_pct * (plan?.height_px || 1)
        );
        // center without changing zoom:
        const vpPoint = viewer.viewport.imageToViewportCoordinates(imgPoint);
        viewer.viewport.panTo(vpPoint, true); // animate==true; use false if you want instant
    }, [plan?.width_px, plan?.height_px]);


    useEffect(() => {
        const close = () => setMenu((m) => ({ ...m, open: false }));
        const onKey = (ev) => {
            if (ev.key === "Escape") {
                close();
                setDrawerOpen(false);
                if (!remainPinState) {
                    setPhotos([]);
                    setGhost(null);
                }
                else {
                    setGhost((g) => g ? { ...g, x: null, y: null, x_pct: null, y_pct: null } : null);
                }
                setMenuOpen(false);
                if (replaceMode) cancelReplace();
            }
        };
        window.addEventListener("click", close);
        window.addEventListener("keydown", onKey);
        return () => {
            window.removeEventListener("click", close);
            window.removeEventListener("keydown", onKey);
        };
    }, [replaceMode, remainPinState, ghost]);


    //useeffect for measure tool key events
    //
    useEffect(() => {
        const onKey = (ev) => {
            if (ev.key.toLowerCase() === "m") {
                const next = !measureMode;
                setMeasureMode(next);
                setMeasureDraft([]);
                setMeasureHover(null);
                // cursor hint
                const stage = stageRef.current;
                if (stage?.container()) stage.container().style.cursor = next ? "crosshair" : "default";
                return;
            }
            if (ev.key === "Escape" && measureMode) {
                if (measureDraft.length > 0) {

                    setMeasureDraft([]); setMeasureHover(null);
                } else {
                    setMeasureMode(false);
                }
            }
            if ((ev.key === "Backspace" || ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "z")) && measureMode) {
                ev.preventDefault();
                setMeasureDraft((prev) => prev.length >= 2 ? prev.slice(0, prev.length - 2) : []);
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [measureMode, measureDraft]);

    // add pin
    const handleAddPinHere = () => {
        if (!plan?.width_px || !plan?.height_px) return;
        const x_pct = menu.imgX / plan.width_px;
        const y_pct = menu.imgY / plan.height_px;
        const nextCode = String(pins.length + 1);
        if (!remainPinState) {
            setPhotos([]);
            setGhost({
                x: menu.imgX, y: menu.imgY, x_pct, y_pct,
                status: "new", code: nextCode, reper: "",
                title: `Pin ${nextCode}`, description: "",
            });
        } else {
            setGhost((g) => ({ ...g, code: nextCode, x: menu.imgX, y: menu.imgY, x_pct, y_pct }));
        }
        setDrawerOpen(true);
        setMenu((m) => ({ ...m, open: false }));
    };

    const handlePinPatched = useCallback((pinId, patch) => {
        setPins(prev => prev.map(p => (p.id === pinId ? { ...p, ...patch } : p)));
        setSelectedPin(prev => (prev && prev.id === pinId ? { ...prev, ...patch } : prev));
    }, []);


    const handleSavePin = async (values) => {
        if (!plan || !ghost) return;
        try {
            setLoading(true);
            const fd = new FormData();
            fd.append('plan_id', String(plan.id));
            fd.append('x_pct', String(ghost.x_pct));
            fd.append('y_pct', String(ghost.y_pct));
            fd.append('status', values.status || 'new');
            fd.append('priority', values.priority || 'medium');
            fd.append('title', values.title ?? '');
            fd.append('description', values.description ?? '');
            fd.append('reper', values.reper ?? '');
            if (values.assigned_user_id != null && values.assigned_user_id !== '')
                fd.append('assigned_user_id', String(values.assigned_user_id));
            const dueUtc = fmtDateTime(values.due_date);
            if (dueUtc) fd.append('due_date_utc', dueUtc);
            if (user?.id) fd.append('user_id', String(user.id));
            (values.photos || []).slice(0, 3).forEach((file) => {
                fd.append('photos', file, file.name || 'photo.jpg');
            });
            const { data } = await api.post('/Rezerve/pins', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
            const created = data?.pin || data;
            setPins((prev) => [...prev, created]);
            setDrawerOpen(false);
            if (!remainPinState) {
                setGhost(null);
                setPhotos([]);
            } else {
                setGhost((g) => g ? { x: null, y: null, x_pct: null, y_pct: null, ...values, photos: null } : null);
                setPhotos((g) => g ? [...values.photos] : []);
            }
        } catch (e) {
            setError(e?.response?.data?.error || e?.message || 'Failed to create pin');
        }
        finally {
            setLoading(false);
        }
    };

    const handleCancelPin = () => {
        setDrawerOpen(false);
        if (!remainPinState) {
            setPhotos([]);
            setGhost(null);
        } else {
            setGhost((g) => g ? { ...g, x: null, y: null, x_pct: null, y_pct: null } : null);
        }
        setEditingPin(null);
    };

    const toPx = useCallback(
        (p) => ({
            x: p.x_pct * plan.width_px,
            y: p.y_pct * plan.height_px,
        }),
        [plan?.width_px, plan?.height_px]
    );

    // ------------------- FILTERED PINS -------------------
    const filteredPins = useMemo(() => {
        const f = (pins || []).filter((p) => {
            if (filters.status && p.status !== filters.status) return false;
            if (filters.assignedId && String(p.assigned_user_id || "") !== String(filters.assignedId)) return false;
            if (filters.createdBy) {
                const needle = filters.createdBy.toLowerCase();
                if (!(p.user_name || "").toLowerCase().includes(needle)) return false;
            }
            if (filters.title) {
                const needle = filters.title.toLowerCase();
                if (!(p.title || "").toLowerCase().includes(needle) && !(p.code || "").toLowerCase().includes(needle)) return false;
            }
            if (filters.reper) {
                const hay = (p.landmark || p.reper || p.reference || "").toLowerCase();
                if (!hay.includes(filters.reper.toLowerCase())) return false;
            }
            if (filters.dueUntil) {
                const due = p.due_date ? new Date(p.due_date) : null;
                const until = new Date(filters.dueUntil + "T23:59:59");
                if (due && due > until) return false;
            }
            if (filters.noUntil) {
                if (!p.due_date) return false;
            }
            if (filters.lastUpdated) {
                if (!p.updated_at) return false;

                const updatedDate = new Date(p.updated_at);
                if (Number.isNaN(updatedDate.getTime())) return false;

                // normalize to YYYY-MM-DD
                const updatedStr = updatedDate.toISOString().slice(0, 10); // "2025-02-10"
                if (updatedStr !== filters.lastUpdated) return false;
            }
            return true;
        });
        return f;
    }, [pins, filters]);



    const handleDownloadVisiblePNG = useCallback(() => {
        const dataUrl = exportVisibleCompositePNG(viewerRef.current, stageRef.current, 2);
        downloadDataURL(dataUrl, `${(plan?.title || "plan")}_view.png`);
    }, [plan?.title]);


    const startEditPin = (pin) => {
        setEditingPin(pin);
        setDrawerOpen(true);
    };

    const handleSaveEditedPin = async (patch) => {
        if (!editingPin?.id) return;
        try {
            setLoading(true);

            const fd = new FormData();

            // always append (even empty)
            fd.append("title", patch.title ?? "");
            fd.append("description", patch.description ?? "");
            fd.append("status", patch.status || "new");
            fd.append("priority", patch.priority || "medium");
            fd.append("reper", patch.reper ?? "");

            // empty string means clear
            fd.append(
                "assigned_user_id",
                (patch.assigned_user_id == null || patch.assigned_user_id === "")
                    ? "" : String(patch.assigned_user_id)
            );

            // use your fmtDateTime; append even if empty
            const dueUtc = fmtDateTime(patch.due_date) || "";
            fd.append("due_date_utc", dueUtc);

            // deletions: always append JSON
            const del = Array.isArray(patch.deleteExisting) ? patch.deleteExisting : [];
            fd.append("delete_existing", JSON.stringify(del));

            // new photos (up to 3)
            (patch.photosNew || []).slice(0, 3).forEach((file) => {
                fd.append("photos", file, file.name || "photo.jpg");
            });
            fd.append("user_id", String(user.id));

            const { data } = await api.put(`/Rezerve/pinsEdit/${editingPin.id}`, fd, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            const updated = data?.pin || data;
            console.log("Updated pin:", updated);
            if (updated?.id) {
                setPins((prev) => prev.map((p) => (p.id == updated.id ? { ...p, ...updated } : p)));
                setSelectedPin((prev) => (prev && prev.id === updated.id ? { ...prev, ...updated } : prev));
            } else {
                await loadPins(); // fallback if backend returns nothing useful
            }

            setDrawerOpen(false);
            setEditingPin(null);
        } catch (e) {
            setError(e?.response?.data?.error || e?.message || "Failed to save changes");
        } finally {
            setLoading(false);
        }
    };

    const handleDeletePin = async () => {
        if (!deletePin?.id) return;
        try {
            setLoading(true);
            await api.delete(`/Rezerve/pins/${deletePin.id}`);
            setPins((prev) => prev.filter((p) => p.id !== deletePin.id));
            if (selectedPin?.id === deletePin.id) {
                setSelectedPin(null);
                setViewerOpen(false);
            }
            setConfirmDeletePin(false);
            setDeletePin(null);
        } catch (e) {
            setError(e?.response?.data?.error || e?.message || "Failed to delete pin");
        } finally {
            setLoading(false);
        }
    }

    const deletePinAsk = async (pinToDel) => {
        if (!pinToDel?.id) return;
        setConfirmDeletePin(true);
        setDeletePin(pinToDel);
    }


    const handlePanel = async () => {
        try {
            const { data } = await api.get(`/Rezerve/managementZones/${plan.id}`);

            setAllZones(data.patterns || []);
            setCurrentPatternId(data.current_pattern_id ?? null);
            setZonePanelOpen(true);
        } catch (e) {
            console.log(e?.response?.data?.error || e?.message || "Failed to open zone panel");
        }
    };

    useEffect(() => {
        if (!useOSD || !osdRef.current || !plan?.width_px || !plan?.height_px) return;

        const imgW = Number(plan.width_px);
        const imgH = Number(plan.height_px);
        const tileSize = Number(plan.tile_size || 256);
        const maxLevel = Number(plan.tiles_max_zoom) || Math.ceil(Math.log2(Math.max(imgW || 1, imgH || 1)));


        const tileSource = plan.dzi_url
            ? plan.dzi_url
            : {
                width: imgW, height: imgH, tileSize, minLevel: 0, maxLevel,
                getTileUrl: (L, x, y) => `${toApiUrl(plan.tiles_base_url, api.defaults.baseURL)}/${L}/${x}_${y}.png`,
            };

        const viewer = OpenSeadragon({
            element: osdRef.current,
            tileSources: tileSource,
            showNavigationControl: false,

            //credentials
            crossOriginPolicy: "Anonymous",
            ajaxWithCredentials: false,
            //----------    
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

            const scaleNow = (p10_px.x - p00_px.x); // px per image px
            stage.scale({ x: scaleNow, y: scaleNow });
            stage.position({ x: p00_px.x, y: p00_px.y });
            stage.batchDraw();

            scaleRef.current = scaleNow;
            posRef.current = { x: p00_px.x, y: p00_px.y };

            // 🔔 trigger a re-render so <Pin invScale={...}/> picks up the new scale
            if (!rafRef.current) {
                rafRef.current = requestAnimationFrame(() => {
                    rafRef.current = null;
                    setViewSyncTick(t => t + 1);
                });
            }
        };

        viewer.addHandler('open', () => { viewer.viewport.goHome(true); syncKonva(); });
        viewer.addHandler('animation', syncKonva);

        // ✅ Fire at least one sync even if 'open' is delayed or not emitted
        requestAnimationFrame(() => syncKonva());
        viewer.addOnceHandler('tile-loaded', () => syncKonva());


        const onResize = () => syncKonva();
        window.addEventListener('resize', onResize);

        return () => {
            window.removeEventListener('resize', onResize);
            try { viewer.destroy(); } catch { }
            viewerRef.current = null;
        };
    }, [useOSD, plan?.id, plan?.width_px, plan?.height_px, plan?.tiles_base_url, plan?.dzi_url]);



    const handleStageWheel = useCallback((e) => {
        if (!useOSD) return;
        e.evt.preventDefault();
        const viewer = getViewer(); if (!viewer) return;
        const stage = stageRef.current; if (!stage) return;

        const vpPoint = vpPointFromPointer(stage, viewer, OpenSeadragon); if (!vpPoint) return;
        const zoomBy = e.evt.deltaY > 0 ? 1 / 1.15 : 1.15; // match OSD zoomPerScroll
        viewer.viewport.zoomBy(zoomBy, vpPoint);
        viewer.viewport.applyConstraints();
    }, [useOSD]);

    const handleStageMouseDown = useCallback(() => {
        if (!useOSD) return;
        const stage = stageRef.current; if (!stage) return;
        const ptr = stage.getPointerPosition(); if (!ptr) return;

        osdDragRef.current = {
            dragging: true,
            start: { x: ptr.x, y: ptr.y }, // <— record where we started
            last: { x: ptr.x, y: ptr.y },
            moved: false,
            panning: false
        };
        // don't show grabbing yet; only after threshold
        stage.container().style.cursor = measureMode ? 'crosshair' : 'default';
    }, [useOSD, measureMode]);

    const handleStageMouseMove = useCallback((e) => {
        const stage = stageRef.current;
        const viewer = getViewer(); // <<< ensure we have the viewer once
        if (!stage || !viewer) return;
        // --- Measure hover preview (unchanged) ---
        if (measureMode) {
            const img = pixelToImagePoint(stage, viewer, OpenSeadragon);
            if (img) {
                const md = measureDraftRef.current;
                const shift = !!e?.evt?.shiftKey;
                if (shift && md.length >= 2) {
                    const anchor = { x: md[md.length - 2], y: md[md.length - 1] };
                    setMeasureHover(snapToAngleStep(anchor, img, 45));
                } else {
                    setMeasureHover(img);
                }
            }
            // no return; allow panning while measuring
        }

        // --- OSD panning (also active during measure/draw) ---
        if (!useOSD) return;
        const drag = osdDragRef.current;
        const ptr = stage.getPointerPosition();
        if (!ptr || !drag.dragging || !drag.last) return;
        // 1) Check cumulative distance from the start
        const totalDx = ptr.x - drag.start.x;
        const totalDy = ptr.y - drag.start.y;
        const totalDist = Math.hypot(totalDx, totalDy);

        // 2) If below threshold, don't pan, don't mark moved
        if (!drag.panning && totalDist < DRAG_THRESHOLD_PX) {
            return;
        }

        // 3) We crossed the threshold => start panning
        if (!drag.panning) {
            drag.panning = true;
            drag.moved = true; // so click handler will be suppressed
            // show grabbing now
            stage.container().style.cursor = 'grabbing';
            // reset last to current so we don't jump
            drag.last = { x: ptr.x, y: ptr.y };
            return; // start panning on next mousemove frame
        }

        // 4) Actively pan (delta from last)
        const dx = ptr.x - drag.last.x;
        const dy = ptr.y - drag.last.y;
        if (dx === 0 && dy === 0) return;

        const delta = viewer.viewport.deltaPointsFromPixels(new OpenSeadragon.Point(-dx, -dy), true);
        viewer.viewport.panBy(delta);
        viewer.viewport.applyConstraints();

        drag.last = { x: ptr.x, y: ptr.y };
    }, [useOSD, measureMode]);

    const handleStageMouseUp = useCallback(() => {
        if (!useOSD) return;
        osdDragRef.current.dragging = false;
        const stage = stageRef.current;
        if (stage?.container()) stage.container().style.cursor = measureMode ? 'crosshair' : 'default';
    }, [useOSD, measureMode]);

    const handleStageMouseLeave = useCallback(() => {
        if (!useOSD) return;
        osdDragRef.current.dragging = false;
        const stage = stageRef.current;
        if (stage?.container()) stage.container().style.cursor = measureMode ? 'crosshair' : 'default';
    }, [useOSD, measureMode]);

    const handleStageContextMenu = useCallback((e) => {
        e.evt.preventDefault();
        if (replaceMode || measureMode) return;
        const viewer = getViewer(); if (!viewer) return;
        const stage = stageRef.current; if (!stage) return;

        const img = pixelToImagePoint(stage, viewer, OpenSeadragon); if (!img) return;
        const ptr = stage.getPointerPosition(); if (!ptr) return;

        setMenu({ open: true, x: ptr.x, y: ptr.y, imgX: img.x, imgY: img.y });
    }, [replaceMode, measureMode]);

    const handleStageClick = useCallback((e) => {
        // if we just panned, swallow the click
        if (osdDragRef.current?.moved) {
            osdDragRef.current.moved = false; // reset for next interaction
            return;
        }

        if (measureMode) {
            const viewer = getViewer(); if (!viewer) return;
            const stage = stageRef.current; if (!stage) return;

            const img = pixelToImagePoint(stage, viewer, OpenSeadragon); if (!img) return;

            const md = measureDraftRef.current || measureDraft;
            const shift = !!e.evt?.shiftKey;

            let p = img;
            if (shift && md.length >= 2) {
                const anchor = { x: md[md.length - 2], y: md[md.length - 1] };
                p = snapToAngleStep(anchor, img, 45);
            }
            setMeasureDraft(prev => [...prev, p.x, p.y]);
        }

    }, [measureMode]);


    useEffect(() => {
        const hud = hudLayerRef.current;
        if (!hud) return;

        hud.destroyChildren(); // clear frame

        // ================== MEASURE HUD (your existing logic) ==================
        if (measureMode && measureDraft.length) {
            // Build screen-space points
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

            if (ptsScr.length > 4)
                hud.add(new window.Konva.Line({
                    points: ptsScr.slice(0, -2),
                    stroke: '#6b7280',
                    strokeWidth: strokePx,
                    listening: false,
                }));

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

            hud.add(box); hud.add(text);
        }

        hud.draw();
    }, [
        // measure deps
        measureMode, measureDraft, measureHover,
        // helpers / re-render tick
        imageToScreenUtil, viewSyncTick, plan?.meters_per_px
    ]);





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

            {/* Top left badge */}
            <div className="absolute top-2 flex flex-col items-start gap-2 left-2 z-10 ">
                <div className="text-base text-black bg-white p-2 border border-black rounded shadow">{plan.title} • {plan.scale_label} • {plan.dpi} DPI • pins: {pins.length} • vizibile: {filteredPins.length}</div>
                <div className="flex gap-2 items-center">
                    <div onClick={() => loadPins()} className="bg-white p-2 px-3 border text-base text-black border-black rounded shadow"><FontAwesomeIcon className="hover:rotate-180 cursor-pointer transition-all duration-300" icon={faRotate} /></div>
                    <button onClick={() => onSelectDrawingZone(true)} className="bg-white p-2 px-3 border text-base text-black hover:bg-blue-200 flex items-center gap-2 border-black rounded shadow"><FontAwesomeIcon className="" icon={faRoad} />Ajustează Traseele</button>
                </div>
            </div>

            {/* Top right controls */}
            <div className="absolute top-2 right-2 select-none z-10  flex items-center gap-3">
                {!replaceMode ? (
                    <>
                        <button
                            onClick={() => { setShowPins((v) => !v); }}
                            className={`group relative gap-2 flex items-center text-base text-black
                            ${showPins ? "bg-green-200" : "bg-white"} active:bg-blue-200 border border-black px-4 h-12 rounded shadow`}
                        >
                            <FontAwesomeIcon icon={faLocationDot} className="text-xl" />

                            {/* Tooltip – below & centered */}
                            <div className="
                                absolute left-1/2 top-full mt-3 -translate-x-1/2
                                whitespace-nowrap px-3 py-1 rounded-lg bg-white text-black text-sm
                                border-black border
                                opacity-0 pointer-events-none
                                transition-opacity duration-150
                                group-hover:opacity-100
                            ">
                                <div className="absolute left-1/2  bottom-full  -translate-x-1/2 border-[8px] border-l-transparent border-r-transparent border-t-transparent  border-green-700"></div>
                                {
                                    showPins ? "Ascunde pinii"
                                        : "Arată pinii"}
                            </div>
                        </button>


                        <button
                            onClick={() => setShowZones((v) => !v)}
                            className={`group relative gap-2 flex items-center  text-base text-black ${zones.length == 0 ? "opacity-60 cursor-not-allowed" : showZones ? "active:bg-blue-200 bg-green-200" : "bg-white active:bg-blue-200"}  border border-black px-4 h-12 rounded shadow`}
                            disabled={zones.length == 0}
                        >
                            <FontAwesomeIcon icon={faMap} className="text-lg" />

                            {/* Tooltip – below & centered */}
                            <div className="
                                absolute left-1/2 top-full mt-3 -translate-x-1/2
                                whitespace-nowrap px-3 py-1 rounded-lg bg-white text-black text-sm
                                border-black border
                                opacity-0 pointer-events-none
                                transition-opacity duration-150
                                group-hover:opacity-100
                            ">
                                <div className="absolute left-1/2  bottom-full  -translate-x-1/2 border-[8px] border-l-transparent border-r-transparent border-t-transparent  border-green-700"></div>
                                <p>{zones.length == 0 ? "Nu existǎ zone" : showZones ? "Ascunde Zonele" : "Arată Zonele"}</p>
                            </div>
                        </button>
                        <button
                            onClick={() => { handlePanel(); }}
                            className={`group relative gap-2 flex items-center  text-base text-black  active:bg-blue-200  bg-white border border-black px-4 h-12 rounded shadow`}
                        >
                            <FontAwesomeIcon icon={faHashtag} className="text-lg" />

                            {/* Tooltip – below & centered */}
                            <div className="
                                absolute left-1/2 top-full mt-3 -translate-x-1/2
                                whitespace-nowrap px-3 py-1 rounded-lg bg-white text-black text-sm
                                border-black border
                                opacity-0 pointer-events-none
                                transition-opacity duration-150
                                group-hover:opacity-100
                            ">
                                <div className="absolute left-1/2  bottom-full  -translate-x-1/2 border-[8px] border-l-transparent border-r-transparent border-t-transparent  border-green-700"></div>
                                <p>{"Organizarea zonelor"}</p>
                            </div>
                        </button>


                        <button
                            onClick={openFilePicker}
                            disabled={uploading}
                            className={`group relative gap-2 flex items-center  text-base text-black ${uploading ? "opacity-60 cursor-not-allowed" : "active:bg-blue-200"} bg-white border border-black px-4 h-12 rounded shadow`}
                        >
                            <FontAwesomeIcon icon={faFolderOpen} className="text-lg" />

                            {uploading && (<p>Se încarcă...</p>)}
                            {/* Tooltip – below & centered */}
                            <div className="
                                absolute left-1/2 top-full mt-3 -translate-x-1/2
                                whitespace-nowrap px-3 py-1 rounded-lg bg-white text-black text-sm
                                border-black border
                                opacity-0 pointer-events-none
                                transition-opacity duration-150
                                group-hover:opacity-100
                            ">
                                <div className="absolute left-1/2  bottom-full  -translate-x-1/2 border-[8px] border-l-transparent border-r-transparent border-t-transparent  border-green-700"></div>
                                <p>{uploading ? "Se încarcă..." : "Actualizează Planul"}</p>
                            </div>
                        </button>


                        <button
                            onClick={() => setBW((v) => !v)}
                            className={`group relative gap-2 flex items-center ${BW ? "bg-green-200" : "bg-white "} active:bg-blue-200 text-base text-black border border-black px-4 h-12 rounded shadow`}
                        >
                            <FontAwesomeIcon icon={faBrush} className="text-lg" />

                            {/* Tooltip – below & centered */}
                            <div className="
                                absolute left-1/2 top-full mt-3 -translate-x-1/2
                                whitespace-nowrap px-3 py-1 rounded-lg bg-white text-black text-sm
                                border-black border
                                opacity-0 pointer-events-none
                                transition-opacity duration-150
                                group-hover:opacity-100
                            ">
                                <div className="absolute left-1/2  bottom-full  -translate-x-1/2 border-[8px] border-l-transparent border-r-transparent border-t-transparent  border-green-700"></div>
                                <p>{!BW ? "Alb-Negru" : "Color"}</p>
                            </div>
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); handleDownloadVisiblePNG(); }}
                            className="group relative gap-2 flex items-center active:bg-blue-200 text-base text-black bg-white border border-black px-4 h-12 rounded shadow"
                        >
                            <FontAwesomeIcon icon={faDownload} className="text-lg" />

                            {/* Tooltip – below & centered */}
                            <div className="
                                absolute left-1/2 top-full mt-3 -translate-x-1/2
                                whitespace-nowrap px-3 py-1 rounded-lg bg-white text-black text-sm
                                border-black border
                                opacity-0 pointer-events-none
                                transition-opacity duration-150
                                group-hover:opacity-100
                            ">
                                <div className="absolute left-1/2  bottom-full  -translate-x-1/2 border-[8px] border-l-transparent border-r-transparent border-t-transparent  border-green-700"></div>
                                <p>Descarcă imaginea</p>
                            </div>
                        </button>
                        <button
                            onClick={() => {
                                const next = !measureMode;
                                setMeasureMode(next);
                                setMeasureDraft([]);
                                setMeasureHover(null);
                                // cursor hint
                                const stage = stageRef.current;
                                if (stage?.container()) stage.container().style.cursor = next ? "crosshair" : "default";
                            }}
                            className={`group relative gap-2 flex items-center text-base text-black
                                    ${plan?.meters_per_px ? measureMode ? "bg-blue-200" : "active:bg-blue-200 bg-white" : "opacity-60 bg-white cursor-not-allowed"}
                                     border border-black px-4 h-12 rounded shadow`}
                            disabled={!plan?.meters_per_px}
                            title={plan?.meters_per_px ? "Măsoară distanțe" : "Necesită meters_per_px pe plan"}
                        >
                            <FontAwesomeIcon icon={faRuler} className="text-lg" />
                            {/* Tooltip */}
                            <div className="absolute left-1/2 top-full mt-3 -translate-x-1/2 whitespace-nowrap px-3 py-1 rounded-lg bg-white text-black text-sm border border-black opacity-0 pointer-events-none transition-opacity duration-150 group-hover:opacity-100">
                                <p>{measureMode ? "Măsurare activă" : "Măsoară distanțe"}</p>
                            </div>
                        </button>

                        <button
                            onClick={(e) => { e.stopPropagation(); setMenuOpen(true); }}
                            className=" gap-2 flex items-center text-base text-black bg-white border border-black px-4 h-12 rounded shadow"
                        >
                            <FontAwesomeIcon icon={faBars} className="text-lg" />
                            <span className=" text-lg">Meniu</span>
                        </button>
                    </>
                ) : (
                    // Replace-mode toolbar
                    <>
                        <div className="gap-2 flex items-center text-base text-black bg-white border border-black px-3 py-2 rounded shadow">
                            <span className="mr-2">Transparență</span>
                            <input
                                type="range"
                                min={0.1}
                                max={0.9}
                                step={0.05}
                                value={overlayInfo.opacity}
                                onChange={(e) => setOverlayInfo((o) => ({ ...o, opacity: Number(e.target.value) }))}
                            />
                        </div>

                        <button
                            onClick={saveReplace}
                            disabled={savingReplace}
                            className="gap-2 flex items-center text-base text-white bg-green-600 border border-green-700 px-4 py-2 rounded shadow disabled:opacity-60"
                            title="Salvează noul plan (înlocuiește)"
                        >
                            <FontAwesomeIcon icon={faCheck} className="text-lg" />
                            <span className="text-lg">{savingReplace ? "Se salvează..." : "Confirmă înlocuirea"}</span>
                        </button>

                        <button
                            onClick={cancelReplace}
                            className="gap-2 flex items-center text-base text-white bg-red-600 border border-red-700 px-4 py-2 rounded shadow"
                            title="Renunță și revino la planul curent"
                        >
                            <FontAwesomeIcon icon={faXmark} className="text-lg" />
                            <span className="text-lg">Renunță</span>
                        </button>
                    </>
                )}
            </div>

            <div ref={osdRef} className={`absolute inset-0 ${BW ? 'grayscale' : ''}`} />
            <div ref={containerRef} className="absolute inset-0">
                {size.w > 0 && size.h > 0 && (
                    <>
                        <Stage
                            ref={stageRef}
                            width={size.w}
                            height={size.h}
                            pixelRatio={1}
                            draggable={false}
                            onWheel={handleStageWheel}
                            onMouseDown={handleStageMouseDown}
                            onMouseMove={handleStageMouseMove}
                            onMouseUp={handleStageMouseUp}
                            onMouseLeave={handleStageMouseLeave}
                            onContextMenu={handleStageContextMenu}
                            onClick={handleStageClick}
                        >
                            {/* BASE IMAGE */}
                            <Layer listening={false} imageSmoothingEnabled>

                                {showZones && zones.map((z) => {
                                    const fillColor = hexToRgba(z.colorHex, z.opacity ?? 0.3);
                                    const sw = z.strokeWidth ?? 3;
                                    return (
                                        <Group key={z.id} listening={false}>
                                            {/* main polygon */}
                                            <Line
                                                points={z.points}
                                                closed
                                                fill={fillColor}
                                                stroke="black"
                                                strokeWidth={sw}
                                                shadowForStrokeEnabled={false}
                                                perfectDrawEnabled={false}
                                            />
                                        </Group>
                                    );
                                })}
                            </Layer>

                            {/* OVERLAY PREVIEW (draggable) */}
                            {replaceMode && overlayImg && (
                                <Layer listening >
                                    <KonvaImage
                                        image={overlayImg}
                                        width={overlayImg.width}
                                        height={overlayImg.height}
                                        x={overlayInfo.dx}
                                        y={overlayInfo.dy}
                                        opacity={overlayInfo.opacity}
                                        draggable     // only overlay is draggable now
                                        // 🔒 prevent Stage from catching the drag
                                        onMouseDown={(e) => { e.cancelBubble = true; }}
                                        onTouchStart={(e) => { e.cancelBubble = true; }}
                                        onDragStart={(e) => { e.cancelBubble = true; }}
                                        onDragMove={(e) => { e.cancelBubble = true; }}
                                        onDragEnd={(e) => {
                                            e.cancelBubble = true;
                                            const { x, y } = e.target.position();
                                            setOverlayInfo(o => ({ ...o, dx: x, dy: y }));
                                        }}
                                    />
                                </Layer>
                            )}

                            {/* STATIC PINS – filtered (always on top of images) */}
                            <Layer visible={showPins} listening={!measureMode && !replaceMode}>
                                {/* read viewSyncTick so React re-renders pins on zoom/pan */}
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


                            <Layer listening={false}>
                                {zones.map(z => (
                                    showZones && z.title && (
                                        <Text
                                            key={`${z.id}:${z.title}`}
                                            text={z.title}
                                            x={z.labelX}                    // already top-left
                                            y={z.labelY}                    // already top-left
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
                                    )))}
                            </Layer>
                        </Stage>
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

                {/* Context menu (disabled in replace mode) */}
                {!replaceMode && menu.open && (
                    <div
                        className="absolute z-20 bg-white text-black border shadow-md rounded text-sm select-none"
                        style={{ left: menu.x, top: menu.y }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button className="w-full text-left flex px-3 items-center gap-2 py-2 hover:bg-gray-100" onClick={handleAddPinHere}>
                            <FontAwesomeIcon icon={faPlus} className="text-lg text-green-600" /> Adaugă pin aici
                        </button>
                    </div>
                )}
            </div>

            {/* Pin viewer */}
            <PinViewer
                open={viewerOpen}
                remainCommentState={remainCommentState}
                setRemainCommentState={setRemainCommentState}
                pin={selectedPin}
                onClose={closeViewer}
                onPinPatched={handlePinPatched}
                onEditPin={startEditPin}
                onDeletePin={deletePinAsk}
            />

            {/* Create-pin drawer */}
            <PlanPinDrawer
                editingPin={editingPin}
                setEditingPin={setEditingPin}
                open={drawerOpen}
                photos={photos}
                setPhotos={setPhotos}
                initial={{
                    title: ghost?.title || "",
                    description: ghost?.description || "",
                    status: ghost?.status || "new",
                    priority: ghost?.priority || "medium",
                    assigned_user_id: ghost?.assigned_user_id || "",
                    due_date: ghost?.due_date ? ghost.due_date : "",
                    reper: ghost?.reper || "",

                }}
                onCancel={handleCancelPin}
                onSave={handleSavePin}
                remainPinState={remainPinState}
                setRemainPinState={setRemainPinState}
                saveEditingPin={handleSaveEditedPin}

            />

            {/* RIGHT MENU (list + filters) */}
            <MenuRezerve
                open={menuOpen}
                onClose={() => setMenuOpen(false)}
                pins={pins}
                filters={filters}
                onChangeFilters={setFilters}
                onSelectPin={handleSelectPinFromMenu}
                planId={plan?.id}
                exportVisibleStagePNG={() => exportVisibleCompositePNG(viewerRef.current, stageRef.current, 2)}
                onJumpToPin={jumpToPin}
                showPins={showPins}
            />
            {loading && <SpinnerElement text={2} />}
            {error ? <div className="absolute bottom-2 left-2 z-10 text-red-600 text-xs">{error}</div> : null}
            {
                confirmDeletePin && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
                        {/* backdrop */}
                        <div
                            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                            onClick={() => setConfirmDeletePin(false)}
                        />

                        {/* dialog */}
                        <div
                            role="dialog"
                            aria-modal="true"
                            className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-black/5"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* close (x) */}
                            <button
                                onClick={() => setConfirmDeletePin(false)}
                                className="absolute right-3 text-2xl top-3 inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                aria-label="Închide"
                            >
                                ×
                            </button>

                            <div className="flex items-start gap-4">
                                <div className="mt-1 text-xl flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-600">
                                    !
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900">Ștergi acest pin?</h3>
                                    <p className="mt-1 text-base text-gray-600">
                                        Acțiunea este ireversibilă. Ești sigur că vrei să continui?
                                    </p>
                                </div>
                            </div>

                            <div className="mt-6 flex justify-end gap-3">
                                <button
                                    onClick={() => setConfirmDeletePin(false)}
                                    className="rounded-lg border border-gray-300 px-4 py-2 text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    Anulează
                                </button>
                                <button
                                    onClick={() => handleDeletePin()}
                                    className="rounded-lg bg-red-600 px-4 py-2 text-base font-semibold text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                                >
                                    Confirmă
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
            {
                zonePanelOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
                        {/* backdrop */}
                        <div
                            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                            onClick={() => setZonePanelOpen(false)}
                        />

                        {/* dialog */}
                        <div
                            role="dialog"
                            aria-modal="true"
                            className="relative w-full max-w-xl rounded-3xl bg-white p-8 shadow-2xl ring-1 ring-black/10 animate-[fadeIn_.2s_ease]"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* close (x) */}
                            <button
                                onClick={() => setZonePanelOpen(false)}
                                className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center 
                           rounded-full text-gray-500 hover:bg-gray-200 hover:text-gray-700 
                           focus:outline-none focus:ring-2 focus:ring-blue-500 text-2xl"
                                aria-label="Închide"
                            >
                                ×
                            </button>

                            {/* Header */}
                            <div className="flex items-center gap-4 mb-6">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl 
                                bg-blue-100 text-blue-600 text-2xl shadow-inner">
                                    #
                                </div>
                                <div>
                                    <h3 className="text-2xl font-bold text-gray-900">
                                        Organizarea zonelor
                                    </h3>
                                    <p className="text-base text-gray-600 mt-1">
                                        Lista modelelor salvate pentru acest șantier.
                                    </p>
                                </div>
                            </div>

                            {/* List */}
                            <div className="mt-2 max-h-80 overflow-y-auto space-y-3 pr-1">
                                {allZones.length === 0 && (
                                    <div className="text-base text-gray-500 italic">
                                        Nu există încă pattern-uri salvate pentru acest șantier.
                                    </div>
                                )}

                                {allZones.map((patt) => {
                                    const isActive = patt.id === currentPatternId;
                                    return (
                                        <div
                                            key={patt.id}
                                            className={`rounded-xl px-4 py-3 border shadow-sm transition-all
                                ${isActive
                                                    ? "border-blue-500 bg-blue-50 shadow-md"
                                                    : "border-gray-200 bg-gray-50 hover:bg-gray-100"
                                                }`}
                                        >
                                            <div className="flex items-center justify-between mb-1">
                                                <div className="text-lg font-semibold text-gray-800">
                                                    {patt.name || `Pattern #${patt.id}`}
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm text-gray-600">
                                                        zone: {patt.zones_count ?? 0}
                                                    </span>

                                                    {isActive && (
                                                        <span className="text-sm font-semibold text-blue-700 bg-blue-100 px-3 py-1 rounded-full">
                                                            curent
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {patt.description && (
                                                <div className="text-sm text-gray-600 leading-snug">
                                                    {patt.description}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Actions */}
                            <div className="mt-8 flex justify-between items-center">
                                <button
                                    onClick={() => onSelectManagementZone(true)}
                                    className="rounded-xl bg-green-600 text-white px-5 py-2.5 text-base font-semibold 
                               hover:bg-green-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                                >
                                    Creeazǎ o zonǎ nouǎ
                                </button>

                                <button
                                    onClick={() => setZonePanelOpen(false)}
                                    className="rounded-xl border border-gray-300 px-5 py-2.5 text-base font-medium 
                               text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
                                >
                                    Închide
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}