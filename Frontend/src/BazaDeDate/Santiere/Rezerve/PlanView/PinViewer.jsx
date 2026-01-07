// src/components/Rezerve/PlanPinDrawer.jsx
import React, { useEffect, useMemo, useState, useCallback, useContext, startTransition } from "react";
import api from "../../../../api/axiosAPI";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faAddressCard, faCalendar, faLocationDot, faUser,
    faPlus, faTrash, faImages, faCamera,
    faPen,
    faPenToSquare,
    faArrowRight
} from "@fortawesome/free-solid-svg-icons";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import Thumbnails from "yet-another-react-lightbox/plugins/thumbnails";
import "yet-another-react-lightbox/plugins/thumbnails.css";
import { AuthContext } from "../../../../context/TokenContext";
import { useRef } from "react";
import { use } from "react";

const STATUS_LABELS = {
    new: "Nou", in_progress: "În lucru", done: "Finalizat",
    blocked: "Blocat", cancelled: "Anulat", checked: "Validat",
};
const STATUS_COLORS = {
    new: "#8B5CF6", in_progress: "#F59E0B", done: "#22C55E",
    blocked: "#E11D48", cancelled: "#6B7280", checked: "#3B82F6",
};

const baseURL = api?.defaults?.baseURL?.replace(/\/+$/, "") || "";

const fmtDateTime = (isoOrSql) => {
    if (!isoOrSql) return "";
    const d = new Date(isoOrSql);
    if (Number.isNaN(d.getTime())) return "";
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const fmtDateAndTime = (isoOrSql) => {
    if (!isoOrSql) return "";
    const d = new Date(isoOrSql);
    if (Number.isNaN(d.getTime())) return "";
    const pad = (n) => String(n).padStart(2, "0");

    // Convert to Romania time (Europe/Bucharest)
    const ro = new Date(
        d.toLocaleString("en-US", { timeZone: "Europe/Bucharest" })
    );

    return `${ro.getFullYear()}-${pad(ro.getMonth() + 1)}-${pad(ro.getDate())} ${pad(ro.getHours())}:${pad(ro.getMinutes())}`;
};

/**
 * Props:
 *  - open: boolean
 *  - pin: object | null
 *  - onClose: () => void
 *  - onPinPatched?: (pinId:number, patch:any) => void
 *  - userId?: number
 */
export default function PlanPinDrawer({ open, pin, onClose, onPinPatched, remainCommentState, setRemainCommentState, onEditPin, onDeletePin }) {

    // keep a local snapshot
    const [localPin, setLocalPin] = useState(pin || null);
    useEffect(() => {
        setLocalPin(pin || null);
    }, [pin]);

    const { user } = useContext(AuthContext);

    const statusColor = STATUS_COLORS[localPin?.status] || "#3B82F6";
    const statusLabel = STATUS_LABELS[localPin?.status] || "—";
    const dueText = useMemo(() => localPin?.due_date ? fmtDateTime(localPin.due_date) : "Fără termen", [localPin?.due_date]);
    const assignedName = localPin?.assigned_user_name || "Neatribuit";
    const createdBy = localPin?.user_name ? `Creat de ${localPin.user_name}` : "Creat de —";
    const reperText = localPin?.landmark || localPin?.reper || localPin?.reference || "Fără reper";
    const creatLabel = useMemo(() => localPin?.created_at ? fmtDateAndTime(localPin.created_at) : "—", [localPin?.created_at]);
    const actualizareLabel = useMemo(() => localPin?.updated_at ? fmtDateAndTime(localPin.updated_at) : "—", [localPin?.updated_at]);

    // pin photos
    const photos = useMemo(
        () => [localPin?.photo1_path, localPin?.photo2_path, localPin?.photo3_path].filter(Boolean),
        [localPin]
    );

    // comments
    const [comments, setComments] = useState([]);
    const [commentsLoading, setCommentsLoading] = useState(false);
    const [commentsError, setCommentsError] = useState(null);

    const loadComments = useCallback(async () => {
        if (!open || !localPin?.id) return;
        try {
            setCommentsLoading(true);
            setCommentsError(null);
            const { data } = await api.get("/rezerve/comentarii", { params: { pin_id: localPin.id } });
            const list = Array.isArray(data?.comments) ? data.comments : [];
            list.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
            setComments(list);
        } catch (e) {
            setCommentsError(e?.message || "Nu am putut încărca comentariile.");
        } finally {
            setCommentsLoading(false);
        }
    }, [open, localPin?.id]);


    useEffect(() => { loadComments(); }, [loadComments]);

    // Lightboxes
    const [lbOpen, setLbOpen] = useState(false);
    const [lbOpenCom, setLbOpenCom] = useState(false);
    const [lbIndex, setLbIndex] = useState(0);
    const [lbIndexCom, setLbIndexCom] = useState(0);
    const [lbComSlides, setLbComSlides] = useState([]);
    const slides = useMemo(() => photos.map((p) => ({ src: `${baseURL}${p}` })), [photos]);

    // ---------- Inline "Adaugă înregistrare" panel ----------
    const [panelOpen, setPanelOpen] = useState(false);
    const [recDesc, setRecDesc] = useState("");
    const [recChangeStatus, setRecChangeStatus] = useState(false);
    const [recStatus, setRecStatus] = useState(localPin?.status || "new");
    const [recPhotos, setRecPhotos] = useState([]); // File[]
    const [savingRecord, setSavingRecord] = useState(false);
    const maxPhotos = 3;

    const resetPanel = useCallback(() => {
        setRecDesc("");
        setRecChangeStatus(false);
        setRecStatus(localPin?.status || "new");
        setRecPhotos([]);
        setSavingRecord(false);
    }, [localPin?.status]);

    const togglePanel = () => {
        setPanelOpen((v) => {
            const next = !v;
            if (!next) resetPanel();
            return next;
        });
    };

    const onPickRecPhotos = (e) => {
        const files = Array.from(e.target.files || []).filter((f) => f.type.startsWith("image/"));
        if (!files.length) return;
        setRecPhotos((prev) => [...prev, ...files].slice(0, maxPhotos));
        e.target.value = "";
    };
    const removeRecPhotoAt = (i) => setRecPhotos((prev) => prev.filter((_, idx) => idx !== i));

    // Submit record (adapted for web)
    const submitRecord = useCallback(async () => {
        if (savingRecord) return;

        try {
            const nothingToSave = !recDesc.trim() && recPhotos.length === 0 && !recChangeStatus;
            if (nothingToSave) { setPanelOpen(false); resetPanel(); return; }

            setSavingRecord(true);

            const fd = new FormData();
            fd.append("pin_id", String(localPin.id));
            if (user?.id != null) fd.append("user_id", String(user.id));
            fd.append("body_text", recDesc.trim());

            if (recChangeStatus) {
                fd.append("status_to", recStatus);
            }

            recPhotos.slice(0, 3).forEach((file, idx) => {
                // browser File already has name & type
                fd.append("photos", file, file.name || `photo_${idx + 1}.jpg`);
            });

            const { data } = await api.post("/rezerve/comentarii", fd, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            // Patch status if backend changed it
            const newStatus = data?.pin?.status;
            if (newStatus && newStatus !== localPin.status) {
                setLocalPin((prev) => ({ ...prev, status: newStatus }));
                if (typeof onPinPatched === "function") onPinPatched(localPin.id, { status: newStatus });
            }
            setLocalPin((prev) => ({ ...prev, updated_at: data?.pin?.updated_at || prev.updated_at }));
            if (typeof onPinPatched === "function" && data?.pin?.updated_at) {
                onPinPatched(localPin.id, { updated_at: data.pin.updated_at });
            }

            // Append created comment (backend returns {comment})
            if (data?.comment) {
                setComments((prev) => [...prev, data.comment]);
            } else {
                // fallback: reload
                loadComments();
            }
        } catch (err) {
            console.error("Failed to save record:", err);
            alert("Eroare: Nu am putut salva înregistrarea.");
        } finally {
            setPanelOpen(false);
            if (!remainCommentState) resetPanel();
            else setSavingRecord(false);

        }
    }, [
        savingRecord, recDesc, recPhotos, recChangeStatus, recStatus, remainCommentState,
        localPin?.id, localPin?.status, user?.id, onPinPatched, loadComments, resetPanel
    ]);

    // -------------------------------------------------------
    // edit the comment
    // -------------------------------------------------------
    // --- EDIT STATE (doesn't touch the create draft) ---
    const [editingCommentId, setEditingCommentId] = useState(null);
    const isEditing = editingCommentId != null;

    const [editDesc, setEditDesc] = useState("");
    const [editExistingPhotos, setEditExistingPhotos] = useState([]); // string[] from server
    const [editNewPhotos, setEditNewPhotos] = useState([]);           // File[]
    const [editSaving, setEditSaving] = useState(false);

    const arraysEqual = (a, b) =>
        a.length === b.length && a.every((v, i) => v === b[i]);

    const [editInitialDesc, setEditInitialDesc] = useState("");
    const [editInitialPhotos, setEditInitialPhotos] = useState([]);

    const openEdit = (comment) => {
        setEditingCommentId(comment.id);
        const initDesc = comment.body_text || "";
        const initPhotos = Array.isArray(comment.photos) ? [...comment.photos] : [];

        setEditDesc(initDesc);
        setEditExistingPhotos([...initPhotos]);
        setEditNewPhotos([]);
        setEditInitialDesc(initDesc);
        setEditInitialPhotos(initPhotos);

        setPanelOpen(true);
    };

    const onPickEditPhotos = (e) => {
        const files = Array.from(e.target.files || []).filter((f) => f.type.startsWith("image/"));
        if (!files.length) return;

        const remainingSlots = maxPhotos - (editExistingPhotos.length + editNewPhotos.length);
        if (remainingSlots <= 0) return;

        setEditNewPhotos((prev) => {
            const allowed = Math.max(0, maxPhotos - editExistingPhotos.length - prev.length);
            return [...prev, ...files].slice(0, prev.length + allowed);
        });
        e.target.value = "";
    };

    const removeExistingEditPhotoAt = (i) => {
        setEditExistingPhotos((prev) => prev.filter((_, idx) => idx !== i));
    };

    const removeNewEditPhotoAt = (i) => {
        setEditNewPhotos((prev) => prev.filter((_, idx) => idx !== i));
    };

    const submitEdit = useCallback(async () => {
        if (editSaving || !isEditing) return;
        const descChanged = editDesc.trim() !== editInitialDesc.trim();
        const photosChanged =
            editNewPhotos.length > 0 || !arraysEqual(editExistingPhotos, editInitialPhotos);

        const nothingToSave = !descChanged && !photosChanged;

        if (nothingToSave) {
            setPanelOpen(false);
            setEditingCommentId(null);
            setEditExistingPhotos([]);
            setEditNewPhotos([]);
            setEditDesc("");
            setEditSaving(false);
            return;
        }

        setEditSaving(true);

        const fd = new FormData();
        fd.append("comment_id", String(editingCommentId));
        if (user?.id != null) fd.append("user_id", String(user.id));
        fd.append("body_text", editDesc.trim());

        // what remains after deletions
        editExistingPhotos.forEach((p) => fd.append("keep_photos[]", p));

        const slotsLeft = Math.max(0, maxPhotos - editExistingPhotos.length);
        editNewPhotos.slice(0, slotsLeft).forEach((file, idx) => {
            fd.append("photos", file, file.name || `photo_${idx + 1}.jpg`);
        });
        try {
            const { data } = await api.put("/rezerve/comentarii", fd, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            if (data?.comment) {
                setComments((prev) => prev.map((c) => (c.id === data.comment.id ? data.comment : c)));
            } else {
                await loadComments();
            }

            if (data?.pin?.updated_at) {
                setLocalPin((prev) => ({ ...prev, updated_at: data.pin.updated_at }));
                onPinPatched?.(localPin.id, { updated_at: data.pin.updated_at });
            }
        } catch (err) {
            console.log("Failed to update comment:", err);
            alert("Eroare: Nu am putut actualiza comentariul.");
        } finally {
            setPanelOpen(false);
            setEditingCommentId(null);
            setEditExistingPhotos([]);
            setEditNewPhotos([]);
            setEditDesc("");
            setEditInitialDesc("");
            setEditInitialPhotos([]);
            setEditSaving(false);
        }
    }, [
        isEditing, editSaving, editingCommentId,
        editDesc, editInitialDesc,
        editExistingPhotos, editInitialPhotos, editNewPhotos,
        user?.id, maxPhotos, loadComments, onPinPatched, localPin?.id
    ]);

    const [isDragOverUpload, setIsDragOverUpload] = useState(false);

    const handleDropUpload = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOverUpload(false);

        const currentCount = isEditing
            ? editExistingPhotos.length + editNewPhotos.length
            : recPhotos.length;

        if (currentCount >= maxPhotos) return;

        const files = Array.from(e.dataTransfer.files || []).filter((f) =>
            f.type.startsWith("image/")
        );
        if (!files.length) return;

        if (isEditing) {
            // reuse your maxPhotos logic for edit mode
            setEditNewPhotos((prev) => {
                const remainingSlots = maxPhotos - (editExistingPhotos.length + prev.length);
                if (remainingSlots <= 0) return prev;
                const next = files.slice(0, remainingSlots);
                return [...prev, ...next];
            });
        } else {
            // reuse your maxPhotos logic for record mode
            setRecPhotos((prev) => {
                const remainingSlots = maxPhotos - prev.length;
                if (remainingSlots <= 0) return prev;
                const next = files.slice(0, remainingSlots);
                return [...prev, ...next];
            });
        }
    };

    const handleDragOverUpload = (e) => {
        e.preventDefault();
        e.stopPropagation();

        const currentCount = isEditing
            ? editExistingPhotos.length + editNewPhotos.length
            : recPhotos.length;

        if (currentCount >= maxPhotos) return;
        setIsDragOverUpload(true);
    };

    const handleDragLeaveUpload = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOverUpload(false);
    };

    const cancelPanel = () => {
        setPanelOpen(false);
        startTransition(() => {
            if (isEditing) {
                setEditingCommentId(null);
                setEditExistingPhotos([]);
                setEditNewPhotos([]);
                setEditDesc("");
                setEditInitialDesc("");
                setEditInitialPhotos([]);
                setEditSaving(false);
            } else if (!remainCommentState) {
                resetPanel();
            }
        });
    };

    useEffect(() => {
        if (!open) cancelPanel();  // keep the same logic but it's now transitioned
    }, [open]);


    const uploadInputRef = useRef(null);

    // ADD near other hooks
    const recPhotoUrls = useMemo(
        () => recPhotos.map(f => URL.createObjectURL(f)),
        [recPhotos]
    );
    useEffect(() => {
        return () => { recPhotoUrls.forEach(u => URL.revokeObjectURL(u)); };
    }, [recPhotoUrls]);

    const editNewPhotoUrls = useMemo(
        () => editNewPhotos.map(f => URL.createObjectURL(f)),
        [editNewPhotos]
    );
    useEffect(() => {
        return () => { editNewPhotoUrls.forEach(u => URL.revokeObjectURL(u)); };
    }, [editNewPhotoUrls]);


    return (
        <div className="absolute inset-0 z-40 text-base pointer-events-none overflow-hidden">
            {/* Backdrop */}
            <div
                className={[
                    "absolute inset-0 bg-black/20 transition-opacity duration-300",
                    open ? "opacity-100 pointer-events-auto" : "opacity-0",
                ].join(" ")}
                onClick={onClose}
                aria-hidden
            />

            {/* Right drawer */}
            <div
                className={[
                    "absolute right-0 top-0 bottom-0 h-full",
                    "transition-transform duration-300 bg-white ease-out",
                    open ? "translate-x-0" : "translate-x-full",
                    "pointer-events-none",
                ].join(" ")}
                style={{ width: 550, maxWidth: "90vw" }}
            >
                <div
                    className={[
                        "h-full bg-white text-black flex flex-col  relative",
                        open ? "pointer-events-auto shadow-2xl" : "pointer-events-none",
                    ].join(" ")}
                >
                    <div className="overflow-y-auto p-5 ">
                        {/* Header */}
                        {/* === Header (same structure/handlers, fancier styles) === */}
                        <div className="flex items-center justify-between mb-4">
                            {/* Left: action buttons */}
                            <div className="flex items-center gap-2">
                                <button
                                    className="text-white bg-red-600 hover:bg-red-700 active:scale-[.98] transition-all text-2xl rounded-xl w-10 h-10 grid place-items-center shadow-sm ring-1 ring-red-500/30 focus:outline-none focus:ring-2 focus:ring-red-400"
                                    onClick={onClose}
                                    aria-label="Închide"
                                    title="Închide"
                                >
                                    ✕
                                </button>

                                <div className="h-8 w-px bg-gray-300 mx-1 rounded-full" />

                                <button
                                    className="text-white bg-green-600 hover:bg-green-700 active:scale-[.98] transition-all text-xl rounded-xl w-10 h-10 grid place-items-center shadow-sm ring-1 ring-green-500/30 focus:outline-none focus:ring-2 focus:ring-green-400"
                                    onClick={() => onEditPin(localPin)}
                                    aria-label="Editează pin"
                                    title="Editează pin"
                                >
                                    <FontAwesomeIcon icon={faPen} />
                                </button>

                                <button
                                    className="text-white bg-rose-600 hover:bg-rose-700 active:scale-[.98] transition-all text-xl rounded-xl w-10 h-10 grid place-items-center shadow-sm ring-1 ring-rose-500/30 focus:outline-none focus:ring-2 focus:ring-rose-400"
                                    onClick={() => onDeletePin(localPin)}
                                    aria-label="Șterge pin"
                                    title="Șterge pin"
                                >
                                    <FontAwesomeIcon icon={faTrash} />
                                </button>
                            </div>

                            {/* Middle: code pill */}
                            <div className="h-10 px-3 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 text-gray-900 flex items-center min-w-0 shadow-sm border border-gray-200">
                                <span className="text-base font-bold truncate tracking-wide">#{localPin?.code || "—"}</span>
                            </div>

                            {/* Right: status pill */}
                            <div
                                className="h-10 px-3 rounded-full text-white flex items-center shadow-sm border border-white/20 transition-all hover:brightness-110 "
                                style={{
                                    background: `linear-gradient(135deg, ${statusColor} 0%, ${statusColor}CC 100%)`,
                                }}
                            >
                                <span className="text-base font-semibold drop-shadow-sm">{statusLabel}</span>
                            </div>
                        </div>

                        {/* === Title & description row (kept positions, nicer chips) === */}
                        <div className="flex items-center mb-6 text-sm justify-between gap-2">
                            <div className="bg-gray-100/80 backdrop-blur-sm font-medium px-4 py-1.5 rounded-full border border-gray-200 shadow-sm">
                                <span className="text-gray-600 mr-1.5">Creat la:</span>
                                <span className="font-semibold text-gray-900">{creatLabel}</span>
                            </div>
                            <div className="bg-gray-100/80 backdrop-blur-sm font-medium px-4 py-1.5 rounded-full border border-gray-200 shadow-sm">
                                <span className="text-gray-600 mr-1.5">Actualizat la:</span>
                                <span className="font-semibold text-gray-900">{actualizareLabel}</span>
                            </div>
                        </div>

                        <div className="mb-1 text-xl font-extrabold tracking-tight text-gray-900">
                            {localPin?.title || "Pin nou"}
                        </div>
                        <div className="mb-3 text-gray-600 leading-relaxed">
                            {localPin?.description || "Fără descriere"}
                        </div>

                        {/* === Meta vertical (same content, refined pills) === */}
                        <div className="my-4 flex flex-col gap-3">
                            <div className="inline-flex items-center gap-2">
                                <span className="text-gray-900 px-4 py-2 rounded-full bg-gray-100 border border-gray-200 font-medium shadow-sm">
                                    <FontAwesomeIcon icon={faAddressCard} className="mr-2 opacity-80" />
                                    {`${createdBy || "—"}`}
                                </span>
                            </div>

                            {/* Pills: row 2 = Reper, Termen, Atribuit */}
                            <div className="flex flex-wrap items-center gap-3">
                                <span className="text-gray-900 px-4 py-2 rounded-full bg-gray-100 border border-gray-200 font-medium shadow-sm">
                                    <FontAwesomeIcon icon={faLocationDot} className="mr-2 opacity-80" />
                                    {reperText}
                                </span>
                                <span className="text-gray-900 px-4 py-2 rounded-full bg-gray-100 border border-gray-200 font-medium shadow-sm">
                                    <FontAwesomeIcon icon={faCalendar} className="mr-2 opacity-80" />
                                    {dueText}
                                </span>
                                <span className="text-gray-900 px-4 py-2 rounded-full bg-gray-100 border border-gray-200 font-medium shadow-sm">
                                    <FontAwesomeIcon icon={faUser} className="mr-2 opacity-80" />
                                    {assignedName}
                                </span>
                            </div>
                        </div>

                        {/* === Photos grid (same behavior, subtle hover) === */}
                        {photos.length > 0 && (
                            <div className="mb-4 grid grid-cols-3 gap-2">
                                {photos.map((uri, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => { setLbIndex(idx); setLbOpen(true); }}
                                        className="group block rounded-lg border border-gray-300 overflow-hidden shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all hover:shadow-md"
                                        title={`Foto ${idx + 1}`}
                                        aria-label={`Deschide foto ${idx + 1}`}
                                    >
                                        <img
                                            src={`${baseURL}${uri}`}
                                            alt={`pin-photo-${idx}`}
                                            className="w-full h-40 object-cover group-hover:scale-[1.02] transition-transform duration-200"
                                            loading="lazy"
                                        />
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Comments */}
                        {/* Comments */}
                        <div className="mb-6">
                            {commentsLoading ? (
                                <div className="text-gray-500 italic">Se încarcă…</div>
                            ) : commentsError ? (
                                <div className="text-red-600">{commentsError}</div>
                            ) : comments.length === 0 ? (
                                <div className="text-gray-500">Nu există comentarii încă.</div>
                            ) : (
                                <div className="flex flex-col gap-3">
                                    {comments.map((c) => (
                                        <div
                                            key={c.id}
                                            className="rounded-2xl border border-gray-400 bg-white/80 backdrop-blur-sm p-4 shadow-sm hover:shadow-md transition-all"
                                        >
                                            {/* Header */}
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="h-9 w-9 rounded-full bg-gray-200 border border-gray-200 grid place-items-center text-sm font-semibold text-gray-700">
                                                        {(c.user_name?.[0] || "—").toUpperCase()}
                                                    </div>
                                                    <div className="truncate">
                                                        <div className="font-semibold text-gray-900 truncate">
                                                            {c.user_name || "—"}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        disabled={panelOpen}
                                                        onClick={() => openEdit(c)}
                                                        className="text-white bg-green-600 hover:bg-green-700 active:scale-[.98] transition-all text-base rounded-xl p-1 px-2 shadow-sm ring-1 ring-green-500/30 focus:outline-none focus:ring-2 focus:ring-green-400"
                                                    >
                                                        <FontAwesomeIcon className="" icon={faPen} />
                                                    </button>
                                                    <span className="shrink-0 text-sm text-black bg-gray-200 border border-gray-300 rounded-full px-2 py-1">
                                                        {fmtDateAndTime(c.created_at)}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Status change (if any) */}
                                            {c.status_from && c.status_to && (
                                                <div className="flex items-center gap-2 mt-3 mb-2 flex-wrap">
                                                    <span className="text-xs uppercase tracking-wide text-gray-500 font-semibold">
                                                        Status
                                                    </span>
                                                    <span
                                                        className="font-semibold"
                                                        style={{ color: STATUS_COLORS[c.status_from] || "#111827" }}
                                                    >
                                                        {STATUS_LABELS[c.status_from] || c.status_from}
                                                    </span>
                                                    <span className="opacity-60"><FontAwesomeIcon icon={faArrowRight} />    </span>
                                                    <span
                                                        className="font-semibold"
                                                        style={{ color: STATUS_COLORS[c.status_to] || "#111827" }}
                                                    >
                                                        {STATUS_LABELS[c.status_to] || c.status_to}
                                                    </span>
                                                </div>
                                            )}

                                            {/* Body */}
                                            <div className="text-gray-800 leading-relaxed">
                                                {c.body_text ? (
                                                    <p className="whitespace-pre-wrap">{c.body_text}</p>
                                                ) : (
                                                    <span className="opacity-60">Fără descriere</span>
                                                )}
                                            </div>

                                            {/* Photos */}
                                            {Array.isArray(c.photos) && c.photos.length > 0 && (
                                                <>
                                                    <div className="my-3 border-t border-dashed border-gray-400" />
                                                    <div className="flex gap-2 flex-wrap">
                                                        {c.photos.slice(0, 3).map((p, pi) => (
                                                            <button
                                                                key={pi}
                                                                type="button"
                                                                onClick={() => {
                                                                    const slides = c.photos.map((ph) => ({ src: `${baseURL}${ph}` }));
                                                                    setLbComSlides(slides);
                                                                    setLbIndexCom(pi);
                                                                    setLbOpenCom(true);
                                                                }}
                                                                className="group h-32 max-w-32 block cursor-pointer rounded-lg overflow-hidden border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all hover:shadow-md"
                                                                title={`Foto ${pi + 1}`}
                                                                aria-label={`Deschide foto ${pi + 1}`}
                                                            >
                                                                <img
                                                                    src={`${baseURL}${p}`}
                                                                    className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-200"
                                                                    alt="comment-photo"
                                                                    loading="lazy"
                                                                />
                                                            </button>
                                                        ))}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {lbOpen && (
                            <Lightbox
                                open
                                close={() => setLbOpen(false)}
                                index={lbIndex}
                                slides={slides}
                                plugins={[Zoom, Thumbnails]}
                                controller={{ closeOnBackdropClick: true }}
                            />
                        )}
                        {lbOpenCom && (
                            <Lightbox
                                open
                                close={() => setLbOpenCom(false)}
                                index={lbIndexCom}
                                slides={lbComSlides}
                                plugins={[Zoom, Thumbnails]}
                                controller={{ closeOnBackdropClick: true }}
                            />
                        )}





                    </div>
                    <div className="p-4 flex justify-center border-t-2">
                        {/* Slide-up panel inside drawer */}
                        {panelOpen ? (

                            <div className="p-4 flex flex-col gap-5 w-full rounded-2xl border border-gray-200 bg-white/80 backdrop-blur-sm shadow-sm">
                                {/* Header */}
                                <div className="text-xl flex items-center justify-between font-extrabold">
                                    <span className="tracking-tight">{isEditing ? "Editează comentariu" : "Înregistrare nouă"}</span>

                                    {!isEditing && (
                                        <label className="flex items-center gap-3 text-sm font-medium text-gray-700 select-none">
                                            <span className="inline-flex items-center gap-2 bg-gray-100 border border-gray-200 px-3 py-1.5 rounded-full">
                                                Menține înregistrarea
                                                <input
                                                    type="checkbox"
                                                    className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
                                                    checked={remainCommentState}
                                                    onChange={(e) => setRemainCommentState(e.target.checked)}
                                                    aria-label="Menține înregistrarea după salvare"
                                                />
                                            </span>
                                        </label>
                                    )}
                                </div>

                                {/* Photos row */}
                                <div>
                                    <div className="font-semibold mb-2 text-gray-900">Fotografii</div>

                                    {/* === Galerie button === */}
                                    {(() => {
                                        const currentCount = isEditing
                                            ? editExistingPhotos.length + editNewPhotos.length
                                            : recPhotos.length;
                                        const isFull = currentCount >= maxPhotos;

                                        return (
                                            <div
                                                onClick={() => {
                                                    if (!isFull && uploadInputRef.current) {
                                                        uploadInputRef.current.click();
                                                    }
                                                }}
                                                onDragOver={handleDragOverUpload}
                                                onDragLeave={handleDragLeaveUpload}
                                                onDrop={handleDropUpload}
                                                className={[
                                                    "mb-3 rounded-xl border-2 border-dashed px-2 py-2 transition-all",
                                                    "flex items-center justify-start bg-white",
                                                    isFull
                                                        ? "opacity-60 cursor-not-allowed"
                                                        : "cursor-pointer hover:bg-gray-50 hover:shadow-sm",
                                                    isDragOverUpload && !isFull ? "border-blue-500 bg-blue-50" : "border-gray-300",
                                                ].join(" ")}
                                            >
                                                <div
                                                    className={[
                                                        "inline-flex items-center gap-2 rounded-lg px-3 py-2",
                                                        "transition-all",
                                                    ].join(" ")}
                                                >
                                                    <FontAwesomeIcon className="opacity-80" icon={faImages} />
                                                    <span className="font-medium">
                                                        {isFull ? "Limită fotografii atinsă" : "Click sau trage din Galerie"}
                                                    </span>

                                                    {/* hidden input – still uses the same handlers */}
                                                    <input
                                                        ref={uploadInputRef}
                                                        type="file"
                                                        accept="image/*"
                                                        multiple
                                                        hidden
                                                        onChange={isEditing ? onPickEditPhotos : onPickRecPhotos}
                                                        disabled={isFull}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    {/* === Thumbnails row === */}
                                    {isEditing ? (
                                        (editExistingPhotos.length > 0 || editNewPhotos.length > 0) && (
                                            <div className="flex gap-2  pb-1">
                                                {/* Existing photos */}
                                                {editExistingPhotos.map((p, i) => (
                                                    <div key={`ex-${i}`} className="relative flex-shrink-0">
                                                        {/* delete button ABOVE the box */}
                                                        <button
                                                            type="button"
                                                            className="absolute -top-2 -right-2 bg-red-600 hover:bg-red-700 text-white w-6 h-6 rounded-full text-xs shadow ring-1 ring-red-500/30 z-10"
                                                            onClick={() => removeExistingEditPhotoAt(i)}
                                                            title="Șterge"
                                                        >
                                                            ✕
                                                        </button>
                                                        {/* image box */}
                                                        <div className="relative rounded-xl border border-gray-300 bg-white overflow-hidden shadow-sm hover:shadow-md transition-all w-32 h-32">
                                                            <img
                                                                src={`${baseURL}${p}`}
                                                                alt={`exist-${i}`}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        </div>
                                                    </div>
                                                ))}

                                                {/* Newly added photos */}
                                                {editNewPhotos.map((f, i) => {
                                                    return (
                                                        <div key={`new-${i}`} className="relative flex-shrink-0">
                                                            {/* delete button ABOVE the box */}
                                                            <button
                                                                type="button"
                                                                className="absolute -top-2 -right-2 bg-red-600 hover:bg-red-700 text-white w-6 h-6 rounded-full text-xs shadow ring-1 ring-red-500/30 z-10"
                                                                onClick={() => removeNewEditPhotoAt(i)}
                                                                title="Șterge"
                                                            >
                                                                ✕
                                                            </button>
                                                            {/* image box */}
                                                            <div className="relative rounded-xl border border-gray-300 bg-white overflow-hidden shadow-sm hover:shadow-md transition-all w-32 h-32">
                                                                <img
                                                                    key={editNewPhotoUrls[i]}
                                                                    src={editNewPhotoUrls[i]}
                                                                    alt={`new-${i}`}
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )
                                    ) : (
                                        recPhotos.length > 0 && (
                                            <div className="flex gap-2  pb-1">
                                                {recPhotos.map((f, i) => {
                                                    return (
                                                        <div key={`rec-${i}`} className="relative flex-shrink-0">
                                                            {/* delete button ABOVE the box */}
                                                            <button
                                                                type="button"
                                                                className="absolute -top-2 -right-2 bg-red-600 hover:bg-red-700 text-white w-6 h-6 rounded-full text-xs shadow ring-1 ring-red-500/30 z-10"
                                                                onClick={() => removeRecPhotoAt(i)}
                                                                title="Șterge"
                                                            >
                                                                ✕
                                                            </button>
                                                            {/* image box */}
                                                            <div className="relative rounded-xl border border-gray-300 bg-white overflow-hidden shadow-sm hover:shadow-md transition-all w-32 h-32">
                                                                <img
                                                                    key={recPhotoUrls[i]}
                                                                    src={recPhotoUrls[i]}
                                                                    alt={`rec-${i}`}
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )
                                    )}
                                </div>

                                {/* Description */}
                                <div>
                                    <div className="font-semibold mb-2 text-gray-900">Descriere</div>
                                    <div className="relative">
                                        <textarea
                                            rows={4}
                                            className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:outline-none resize-none focus:ring-2 focus:ring-blue-500 bg-white/90"
                                            value={isEditing ? editDesc : recDesc}
                                            onChange={(e) => isEditing ? setEditDesc(e.target.value) : setRecDesc(e.target.value)}
                                            placeholder="Adaugă detalii relevante…"
                                        />

                                    </div>
                                </div>

                                {/* Change status */}
                                {!isEditing && (
                                    <>
                                        <div className="flex items-center justify-between">
                                            <div className="font-semibold text-gray-900">Schimbă statusul</div>

                                            <label className="inline-flex items-center cursor-pointer select-none">
                                                <input
                                                    type="checkbox"
                                                    checked={recChangeStatus}
                                                    onChange={(e) => setRecChangeStatus(e.target.checked)}
                                                    className="sr-only peer"
                                                    aria-label="Activează schimbarea statusului"
                                                />
                                                <div className="w-11 h-6 bg-gray-300 rounded-full peer peer-checked:bg-blue-600 transition-colors relative shadow-inner">
                                                    <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform peer-checked:translate-x-5 shadow" />
                                                </div>
                                            </label>
                                        </div>

                                        {recChangeStatus && (
                                            <select
                                                className="w-full border border-gray-300 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                value={recStatus}
                                                onChange={(e) => setRecStatus(e.target.value)}
                                                aria-label="Alege noul status"
                                            >
                                                {Object.keys(STATUS_LABELS).map((k) => (
                                                    <option key={k} value={k}>
                                                        {STATUS_LABELS[k]}
                                                    </option>
                                                ))}
                                            </select>
                                        )}
                                    </>
                                )}

                                {/* Footer buttons */}
                                <div className="flex gap-2 pt-2">
                                    <button
                                        type="button"
                                        className="flex-1 rounded-full bg-red-600 hover:bg-red-700 active:scale-[.99] transition-all text-white px-4 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-red-400 disabled:opacity-60 disabled:cursor-not-allowed"
                                        onClick={() => {
                                            cancelPanel();
                                        }}
                                        disabled={savingRecord}
                                    >
                                        Anulează
                                    </button>

                                    <button
                                        type="button"
                                        className="flex-1 rounded-full bg-blue-900 hover:bg-blue-800 active:scale-[.99] transition-all text-white px-4 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
                                        onClick={isEditing ? submitEdit : submitRecord}
                                        disabled={isEditing ? editSaving : savingRecord}
                                        aria-busy={(isEditing ? editSaving : savingRecord) ? "true" : "false"}
                                    >
                                        {(isEditing ? (editSaving ? "Se actualizează…" : "Actualizează")
                                            : (savingRecord ? "Se salvează…" : "Salvează"))}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <button
                                className="rounded-full bg-blue-600 text-white px-4 py-2 flex-1 flex items-center justify-center gap-2"
                                onClick={togglePanel}
                                title="Adaugă înregistrare"
                            >
                                <FontAwesomeIcon icon={faPlus} />
                                Adaugă înregistrare
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}