// src/components/Rezerve/PlanPinDrawer.jsx
import React, { useEffect, useMemo, useState, useCallback, useContext, startTransition } from "react";
import api from "../../../../api/axiosAPI";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faAddressCard, faCalendar, faLocationDot, faUser,
    faPlus, faTrash, faImages, faCamera,
    faPen,
    faPenToSquare,
    faArrowRight, faXmark,
} from "@fortawesome/free-solid-svg-icons";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import Thumbnails from "yet-another-react-lightbox/plugins/thumbnails";
import "yet-another-react-lightbox/plugins/thumbnails.css";
import { AuthContext } from "../../../../context/TokenContext";
import { useRef } from "react";
import { use } from "react";
import { useAddComment, useComments, useEditComment } from "@/hooks/useRezerve";
import { toast } from "sonner";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
export default function PlanPinDrawer({ open, pin, onClose, remainCommentState, setRemainCommentState, onEditPin, onDeletePin }) {

    // keep a local snapshot
    const [localPin, setLocalPin] = useState(pin || null);
    useEffect(() => {
        setLocalPin(pin || null);
        if (pin) {
            setRecStatus(pin.status || "new");
        }
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
    const { data: comments, isFetching: commentsLoading, error: commentsError } = useComments(localPin?.id);
    const addComment = useAddComment();
    const editComment = useEditComment();

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
            const data = await addComment.mutateAsync({ formData: fd, planId: localPin?.plan_id, pinId: localPin?.id, userId: user?.id });
            setLocalPin((prev) => ({ ...prev, updated_at: data.pin.updated_at, status: data.pin.status }));
            toast.success("Comentariul a fost adăugat cu succes.");
        } catch (err) {
            console.log("Failed to save record:", err);
            const msg = err?.response?.data?.message || "A apărut o eroare la salvarea comentariului.";
            toast.error(msg);
        } finally {
            setPanelOpen(false);
            if (!remainCommentState) resetPanel();
            else setSavingRecord(false);

        }
    }, [
        savingRecord, recDesc, recPhotos, recChangeStatus, recStatus, remainCommentState,
        localPin?.id, localPin?.status, user?.id, resetPanel
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
            const data = await editComment.mutateAsync({ formData: fd, pinId: localPin?.id, userId: user?.id, planId: localPin?.plan_id });
            setLocalPin((prev) => ({ ...prev, updated_at: data.pin.updated_at }));
            toast.success("Comentariul a fost actualizat cu succes.");
        } catch (err) {
            console.log("Failed to update comment:", err);
            const msg = err?.response?.data?.message || "A apărut o eroare la actualizarea comentariului.";
            toast.error(msg);
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
        user?.id, maxPhotos, localPin?.id, localPin?.plan_id
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
                    "absolute inset-0 bg-black/40  transition-opacity duration-300",
                    open ? "opacity-100 pointer-events-auto" : "opacity-0",
                ].join(" ")}
                onClick={onClose}
                aria-hidden
            />

            {/* Right drawer */}
            <div
                className={[
                    "absolute right-0 top-0 bottom-0 h-full flex flex-col",
                    "transition-transform duration-300 bg-card border-l border-input ease-out",
                    open ? "translate-x-0 shadow-2xl pointer-events-auto" : "translate-x-full pointer-events-none",
                ].join(" ")}
                style={{ width: "38rem", maxWidth: "90vw" }}
            >
                <div className="flex-1 overflow-y-auto p-5 text-foreground relative">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                        {/* Left: action buttons */}
                        <div className="flex items-center gap-2">
                            <Button
                                variant="destructive"
                                size="icon"
                                className="rounded-xl h-10 w-10 shadow-sm"
                                onClick={onClose}
                                aria-label="Închide"
                                title="Închide"
                            >
                                <FontAwesomeIcon icon={faXmark} className="text-lg" />
                            </Button>

                            <Separator orientation="vertical" className="h-8 mx-1" />
                            <Button
                                className="bg-green-600 hover:bg-green-700 text-white rounded-xl h-10 w-10 shadow-sm"
                                size="icon"
                                onClick={() => onEditPin(localPin)}
                                aria-label="Editează pin"
                                title="Editează pin"
                            >
                                <FontAwesomeIcon icon={faPen} />
                            </Button>

                            <Button
                                variant="destructive"
                                size="icon"
                                className="rounded-xl h-10 w-10 shadow-sm"
                                onClick={() => onDeletePin(localPin)}
                                aria-label="Șterge pin"
                                title="Șterge pin"
                            >
                                <FontAwesomeIcon icon={faTrash} />
                            </Button>
                        </div>

                        {/* Middle: code pill */}
                        <Badge variant="outline" className="px-4 h-10 rounded-full text-base font-bold  shadow-sm bg-background ">
                            #{localPin?.code || "—"}
                        </Badge>

                        {/* Right: status pill */}
                        <Badge
                            className="h-10 px-4 rounded-full text-base font-semibold shadow-sm text-white border-0"
                            style={{
                                background: `linear-gradient(135deg, ${statusColor} 0%, ${statusColor}CC 100%)`,
                            }}
                        >
                            {statusLabel}
                        </Badge>
                    </div>

                    {/* Title & description row */}
                    <div className="flex items-center mb-6 text-sm justify-between gap-2">
                        <Badge variant="outline" className="px-4 py-1.5 rounded-full text-sm font-medium shadow-sm gap-2 bg-background ">
                            <span className="text-foreground">Creat la:</span>
                            <span>{creatLabel}</span>
                        </Badge>
                        <Badge variant="outline" className="px-4 py-1.5 rounded-full text-sm font-medium shadow-sm gap-2 bg-background ">
                            <span className="text-foreground">Actualizat la:</span>
                            <span>{actualizareLabel}</span>
                        </Badge>
                    </div>

                    <div className="mb-1 text-2xl font-extrabold tracking-tight">
                        {localPin?.title || "Pin nou"}
                    </div>
                    <div className="mb-3 text-muted-foreground leading-relaxed">
                        {localPin?.description || "Fără descriere"}
                    </div>

                    {/* Meta vertical */}
                    <div className="my-4 flex flex-col gap-3">
                        <div className="inline-flex items-center gap-2">
                            <Badge variant="outline" className="px-4 py-2 rounded-full text-sm font-medium shadow-sm gap-2 bg-background ">
                                <FontAwesomeIcon icon={faAddressCard} className="text-foreground" />
                                {createdBy || "—"}
                            </Badge>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            <Badge variant="outline" className="px-4 py-2 rounded-full text-sm font-medium shadow-sm gap-2 bg-background ">
                                <FontAwesomeIcon icon={faLocationDot} className="text-foreground" />
                                {reperText}
                            </Badge>
                            <Badge variant="outline" className="px-4 py-2 rounded-full text-sm font-medium shadow-sm gap-2 bg-background ">
                                <FontAwesomeIcon icon={faCalendar} className="text-foreground" />
                                {dueText}
                            </Badge>
                            <Badge variant="outline" className="px-4 py-2 rounded-full text-sm font-medium shadow-sm gap-2 bg-background ">
                                <FontAwesomeIcon icon={faUser} className="text-foreground" />
                                {assignedName}
                            </Badge>
                        </div>
                    </div>

                    {/* Photos grid */}
                    {photos.length > 0 && (
                        <div className="mb-4 grid grid-cols-3 gap-2">
                            {photos.map((uri, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => { setLbIndex(idx); setLbOpen(true); }}
                                    className="group block rounded-lg border border-input overflow-hidden shadow-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all hover:shadow-md"
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
                    <div className="mb-6">
                        {comments == null ? (
                            <div className="text-muted-foreground">Se încarcă comentariile...</div>
                        ) : comments.length === 0 ? (
                            <div className="text-muted-foreground">Nu există comentarii încă.</div>
                        ) : (
                            <div className="flex flex-col gap-3">
                                {comments.map((c) => (
                                    <Card onClick={() => console.log(c)} key={c.id} className="rounded-2xl border-input shadow-sm hover:shadow-md transition-all">
                                        <div className="p-4">
                                            {/* Header */}
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="h-9 w-9 rounded-full bg-background border border-input grid place-items-center text-sm font-semibold text-secondary-foreground">
                                                        {(c.user_name?.[0] || "—").toUpperCase()}
                                                    </div>
                                                    <div className="truncate">
                                                        <div className="font-semibold text-foreground truncate">
                                                            {c.user_name || "—"}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        className="bg-green-600 hover:bg-green-700 h-8 w-8 text-white rounded-xlshadow-sm"
                                                        size="icon"
                                                        onClick={() => openEdit(c)}
                                                        disabled={panelOpen}


                                                    >
                                                        <FontAwesomeIcon icon={faPen} />
                                                    </Button>


                                                </div>
                                            </div>

                                            {/* Status change (if any) */}
                                            {c.status_from && c.status_to && (
                                                <div className="flex items-center gap-2 mt-3 mb-2 flex-wrap">
                                                    <span className="text-sm uppercase tracking-wide text-muted-foreground font-semibold">
                                                        Status
                                                    </span>
                                                    <span
                                                        className="font-semibold"
                                                        style={{ color: STATUS_COLORS[c.status_from] || "inherit" }}
                                                    >
                                                        {STATUS_LABELS[c.status_from] || c.status_from}
                                                    </span>
                                                    <span className="opacity-60 text-muted-foreground"><FontAwesomeIcon icon={faArrowRight} /></span>
                                                    <span
                                                        className="font-semibold"
                                                        style={{ color: STATUS_COLORS[c.status_to] || "inherit" }}
                                                    >
                                                        {STATUS_LABELS[c.status_to] || c.status_to}
                                                    </span>
                                                </div>
                                            )}

                                            {/* Body */}
                                            <div className="text-foreground leading-relaxed mt-2">
                                                {c.body_text ? (
                                                    <p className="whitespace-pre-wrap text-sm">{c.body_text}</p>
                                                ) : (
                                                    <span className="text-muted-foreground italic text-sm">Fără descriere</span>
                                                )}
                                            </div>

                                            {/* Photos */}
                                            {Array.isArray(c.photos) && c.photos.length > 0 && (
                                                <>
                                                    <div className="my-3 border-t border-dashed border-input" />
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
                                                                className="group h-24 w-24 block cursor-pointer rounded-lg overflow-hidden border border-input focus:outline-none focus:ring-2 focus:ring-primary transition-all hover:shadow-md"
                                                                title={`Foto ${pi + 1}`}
                                                            >
                                                                <img
                                                                    src={`${baseURL}${p}`}
                                                                    className="w-full h-full object-cover group-hover:scale-[1.05] transition-transform duration-200"
                                                                    alt="comment-photo"
                                                                    loading="lazy"
                                                                />
                                                            </button>
                                                        ))}
                                                    </div>
                                                </>
                                            )}
                                            <div className="flex flex-col">
                                                <div className="my-3 border-t border-dashed border-input" />
                                                <div className="flex justify-between">
                                                    <Badge variant="outline" className="px-4 h-8 items-center flex justify-center rounded-full text-sm font-medium shadow-sm gap-2 bg-background ">
                                                        <span className="text-foreground">Creat la:</span>
                                                        {fmtDateAndTime(c.created_at)}
                                                    </Badge>
                                                    <Badge variant="outline" className="px-4 h-8 items-center flex justify-center rounded-full text-sm font-medium shadow-sm gap-2 bg-background ">
                                                        <span className="text-foreground">Actualizat la:</span>
                                                        {fmtDateAndTime(c.updated_at)}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>

                    {lbOpen && (
                        <Lightbox open close={() => setLbOpen(false)} index={lbIndex} slides={slides} plugins={[Zoom, Thumbnails]} controller={{ closeOnBackdropClick: true }} />
                    )}
                    {lbOpenCom && (
                        <Lightbox open close={() => setLbOpenCom(false)} index={lbIndexCom} slides={lbComSlides} plugins={[Zoom, Thumbnails]} controller={{ closeOnBackdropClick: true }} />
                    )}

                </div>

                <div className="p-4 flex justify-center border-t border-input bg-muted/10">
                    {/* Slide-up panel inside drawer */}
                    {panelOpen ? (
                        <Card className="w-full rounded-2xl shadow-md border-input">
                            <div className="p-5 flex flex-col gap-5">
                                {/* Header */}
                                <div className="text-xl flex items-center justify-between font-extrabold text-foreground">
                                    <span className="tracking-tight">{isEditing ? "Editează comentariu" : "Înregistrare nouă"}</span>

                                    {!isEditing && (
                                        <div className="flex items-center space-x-2">
                                            <Checkbox
                                                id="remain-checkbox"
                                                checked={remainCommentState}
                                                onCheckedChange={(checked) => setRemainCommentState(checked)}
                                                className="h-6 w-6"
                                            />
                                            <Label htmlFor="remain-checkbox" className="text-sm font-medium cursor-pointer">
                                                Menține Comentariul
                                            </Label>
                                        </div>
                                    )}
                                </div>

                                {/* Photos row */}
                                <div>
                                    <Label className="mb-2 block font-semibold text-foreground">Fotografii</Label>

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
                                                    "mb-3 rounded-xl border-2 border-dashed px-3 py-3 transition-all flex items-center",
                                                    isFull
                                                        ? "opacity-60 cursor-not-allowed bg-muted"
                                                        : "cursor-pointer hover:bg-background/10",
                                                    isDragOverUpload && !isFull ? "border-primary bg-primary/5" : "border-input",
                                                ].join(" ")}
                                            >
                                                <div className="inline-flex items-center gap-2 text-foreground">
                                                    <FontAwesomeIcon icon={faImages} />
                                                    <span className="font-medium text-sm">
                                                        {isFull ? "Limită fotografii atinsă" : "Click sau trage din Galerie"}
                                                    </span>

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
                                            <div className="flex gap-2 pb-1">
                                                {editExistingPhotos.map((p, i) => (
                                                    <div key={`ex-${i}`} className="relative flex-shrink-0">
                                                        <Button
                                                            size="icon"
                                                            className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-destructive text-xs shadow z-10"
                                                            onClick={() => removeExistingEditPhotoAt(i)}
                                                        >✕</Button>
                                                        <div className="relative rounded-xl border border-input overflow-hidden shadow-sm w-24 h-24">
                                                            <img src={`${baseURL}${p}`} alt={`exist-${i}`} className="w-full h-full object-cover" />
                                                        </div>
                                                    </div>
                                                ))}
                                                {editNewPhotos.map((f, i) => (
                                                    <div key={`new-${i}`} className="relative flex-shrink-0">
                                                        <Button
                                                            variant="destructive"
                                                            size="icon"
                                                            className="absolute -top-2 -right-2 w-6 h-6 rounded-full text-xs shadow z-10"
                                                            onClick={() => removeNewEditPhotoAt(i)}
                                                            title="Șterge"
                                                        >✕</Button>
                                                        <div className="relative rounded-xl border border-input overflow-hidden shadow-sm w-24 h-24">
                                                            <img key={editNewPhotoUrls[i]} src={editNewPhotoUrls[i]} alt={`new-${i}`} className="w-full h-full object-cover" />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )
                                    ) : (
                                        recPhotos.length > 0 && (
                                            <div className="flex gap-2 pb-1">
                                                {recPhotos.map((f, i) => (
                                                    <div key={`rec-${i}`} className="relative flex-shrink-0">
                                                        <Button
                                                            variant="destructive"
                                                            size="icon"
                                                            className="absolute -top-2 -right-2 w-6 h-6 rounded-full text-xs shadow z-10"
                                                            onClick={() => removeRecPhotoAt(i)}
                                                            title="Șterge"
                                                        >✕</Button>
                                                        <div className="relative rounded-xl border border-input overflow-hidden shadow-sm w-24 h-24">
                                                            <img key={recPhotoUrls[i]} src={recPhotoUrls[i]} alt={`rec-${i}`} className="w-full h-full object-cover" />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )
                                    )}
                                </div>

                                {/* Description */}
                                <div>
                                    <Label className="mb-2 block font-semibold text-foreground">Descriere</Label>
                                    <Textarea
                                        rows={3}
                                        value={isEditing ? editDesc : recDesc}
                                        onChange={(e) => isEditing ? setEditDesc(e.target.value) : setRecDesc(e.target.value)}
                                        placeholder="Adaugă detalii relevante…"
                                    />
                                </div>

                                {/* Change status */}
                                {!isEditing && (
                                    <div className="flex flex-col gap-3">
                                        <div className="flex items-center justify-between">
                                            <Label className="font-semibold text-foreground cursor-pointer" htmlFor="status-toggle">
                                                Schimbă statusul
                                            </Label>
                                            <Checkbox
                                                id="status-toggle"
                                                checked={recChangeStatus}
                                                onCheckedChange={setRecChangeStatus}
                                                className="h-6 w-6"
                                            />
                                        </div>

                                        {recChangeStatus && (
                                            <Select
                                                value={recStatus}
                                                onValueChange={(value) => setRecStatus(value)}
                                            >
                                                <SelectTrigger className="mt-1">
                                                    <SelectValue placeholder="Toți" />
                                                </SelectTrigger>
                                                <SelectContent>

                                                    {Object.keys(STATUS_LABELS).map((k) => (
                                                        <SelectItem key={k} value={k}>
                                                            {STATUS_LABELS[k]}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>

                                            </Select>
                                        )}
                                    </div>
                                )}

                                {/* Footer buttons */}
                                <div className="flex gap-3 pt-2">
                                    <Button
                                        variant="destructive"
                                        className="flex-1 rounded-full"
                                        onClick={cancelPanel}
                                        disabled={savingRecord}
                                    >
                                        Anulează
                                    </Button>

                                    <Button
                                        className="flex-1 rounded-full bg-blue-600 hover:bg-blue-700 text-white"
                                        onClick={isEditing ? submitEdit : submitRecord}
                                        disabled={isEditing ? editSaving : savingRecord}
                                    >
                                        {(isEditing ? (editSaving ? "Se actualizează…" : "Actualizează")
                                            : (savingRecord ? "Se salvează…" : "Salvează"))}
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    ) : (
                        <Button
                            className="rounded-full flex-1 w-full gap-2 text-base h-12"
                            onClick={togglePanel}
                            title="Adaugă înregistrare"
                        >
                            <FontAwesomeIcon icon={faPlus} />
                            Adaugă înregistrare
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}