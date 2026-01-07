// src/components/Rezerve/PlanPinDrawer.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../../../../api/axiosAPI";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCamera } from "@fortawesome/free-solid-svg-icons";
import photoAPI from "../../../../api/photoAPI.jsx";
import { useRef } from "react";

export default function PlanPinDrawer({
    open,
    initial,
    onSave,
    onCancel,
    remainPinState,
    setRemainPinState,
    photos,            // (kept for backward-compat in create mode)
    setPhotos,         // (kept for backward-compat in create mode)
    editingPin,        // if present => EDIT MODE
    setEditingPin,     // unused here, but kept for your API
    saveEditingPin,    // called when saving edit
}) {
    const { idSantier } = useParams();

    const [assignees, setAssignees] = useState([]);
    const [loadingAssignees, setLoadingAssignees] = useState(false);

    // --- editing-specific photo state ---
    // URLs of existing photos on the server (only used in edit mode)
    const [existingPhotos, setExistingPhotos] = useState([]); // array<string URL>
    // URLs we removed (so backend can delete)
    const [deleteExisting, setDeleteExisting] = useState([]); // array<string URL>
    // newly added local files (both modes)
    const [localPhotos, setLocalPhotos] = useState([]); // array<File>

    const loadAssignees = useCallback(async () => {
        if (!idSantier) {
            setAssignees([]);
            return;
        }
        try {
            setLoadingAssignees(true);
            const { data } = await api.get("/users/getAtribuiri");
            const allUsers = Array.isArray(data?.users) ? data.users : [];
            const allAssignments = Array.isArray(data?.assignments) ? data.assignments : [];
            const assignedIds = new Set(
                allAssignments.filter(a => Number(a.santier_id) === Number(idSantier)).map(a => a.user_id)
            );
            const assignedUsers = allUsers
                .filter(u => assignedIds.has(u.id))
                .filter(u => u.role !== "beneficiar")
                .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
            setAssignees(assignedUsers);
        } catch (e) {
            console.warn("loadAssignees error:", e?.message);
            setAssignees([]);
        } finally {
            setLoadingAssignees(false);
        }
    }, [idSantier]);

    useEffect(() => { loadAssignees(); }, [loadAssignees]);

    const statusColor = {
        new: "#8B5CF6",
        in_progress: "#F59E0B",
        done: "#22C55E",
        checked: "#3B82F6",
        blocked: "#E11D48",
        cancelled: "#6B7280",
    };

    const [values, setValues] = useState({
        title: "",
        description: "",
        status: "new",
        priority: "medium",
        assigned_user_id: "",
        due_date: "",
        reper: "",
    });

    const maxPhotos = 3;

    // Initialize on open (support both create & edit)
    useEffect(() => {
        if (!open) return;

        if (editingPin) {
            // EDIT MODE
            setValues({
                title: editingPin?.title || "",
                description: editingPin?.description || "",
                status: editingPin?.status || "new",
                priority: editingPin?.priority || "medium",
                assigned_user_id:
                    editingPin?.assigned_user_id == null ? "" : String(editingPin.assigned_user_id),
                due_date: normalizeDateForInput(editingPin?.due_date) || "",
                reper: editingPin?.reper || "",
            });
            const ex = [];

            // Build existing server-photo URLs (max 3)
            if (editingPin?.photo1_path) ex.push({ key: 'photo1', url: `${photoAPI}${editingPin.photo1_path}` });
            if (editingPin?.photo2_path) ex.push({ key: 'photo2', url: `${photoAPI}${editingPin.photo2_path}` });
            if (editingPin?.photo3_path) ex.push({ key: 'photo3', url: `${photoAPI}${editingPin.photo3_path}` });
            setExistingPhotos(ex);
            setDeleteExisting([]);     // reset deletions
            setLocalPhotos([]);        // new photos cleared when entering edit
        } else {
            // CREATE MODE (original behavior)
            setValues({
                title: initial?.title || "",
                description: initial?.description || "",
                status: initial?.status || "new",
                priority: initial?.priority || "medium",
                assigned_user_id:
                    initial?.assigned_user_id == null ? "" : String(initial.assigned_user_id),
                due_date: normalizeDateForInput(initial?.due_date) || "",
                reper: initial?.reper || "",
            });
            setExistingPhotos([]);     // none on create
            setDeleteExisting([]);
            setLocalPhotos(photos || []); // keep old prop behavior
        }
    }, [open, editingPin, photos]);

    // Previews: existing URLs + local object URLs
    const localObjectUrls = useMemo(
        () => localPhotos.map(f => URL.createObjectURL(f)),
        [localPhotos]
    );
    useEffect(() => () => localObjectUrls.forEach(u => URL.revokeObjectURL(u)), [localObjectUrls]);

    // Total photos shown (existing first, then new)
    const totalCount = existingPhotos.length + localPhotos.length;
    const canAddMore = totalCount < maxPhotos;

    const handlePickFiles = (e) => {
        const files = Array.from(e.target.files || []).filter(f => f.type.startsWith("image/"));
        if (!files.length) return;

        const allowed = Math.max(0, maxPhotos - totalCount);
        const next = files.slice(0, allowed);

        setLocalPhotos(prev => [...prev, ...next]);
        e.target.value = "";
    };

    const [isDragOver, setIsDragOver] = useState(false);

    const handleDropFiles = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
        if (!canAddMore) return;

        const files = Array.from(e.dataTransfer.files || []).filter(f =>
            f.type.startsWith("image/")
        );
        if (!files.length) return;

        const allowed = Math.max(0, maxPhotos - totalCount);
        const next = files.slice(0, allowed);

        setLocalPhotos(prev => [...prev, ...next]);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!canAddMore) return;
        setIsDragOver(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
    };

    const removeExistingAt = (idx) => {
        const item = existingPhotos[idx];
        if (!item) return;
        setExistingPhotos(prev => prev.filter((_, i) => i !== idx));
        // store only the slot key: 'photo1' | 'photo2' | 'photo3'
        setDeleteExisting(prev => [...prev, item.key]);
    };

    const removeLocalAt = (idx) => {
        setLocalPhotos(prev => prev.filter((_, i) => i !== idx));
    };

    const save = () => {
        const payload = {
            ...values,
            assigned_user_id: values.assigned_user_id ? Number(values.assigned_user_id) : null,
        };

        if (editingPin) {
            // call edit callback with diffs
            saveEditingPin?.({
                ...payload,
                photosNew: localPhotos,         // Files to upload
                deleteExisting,                 // URLs to delete on server
            });
        } else {
            // original create behavior
            onSave?.({
                ...payload,
                photos: localPhotos,            // Files to upload
            });
        }
    };

    // add this helper near the top of the file
    function normalizeDateForInput(val) {
        if (!val) return "";
        if (val instanceof Date && !isNaN(val)) {
            const y = val.getFullYear();
            const m = String(val.getMonth() + 1).padStart(2, "0");
            const d = String(val.getDate()).padStart(2, "0");
            return `${y}-${m}-${d}`;
        }
        const s = String(val);
        // if it already looks like YYYY-MM-DD, keep it
        const m1 = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (m1) return s;
        // if it's YYYY-MM-DD HH:mm(:ss), extract the date part
        const m2 = s.match(/^(\d{4}-\d{2}-\d{2})\s+/);
        if (m2) return m2[1];
        // last resort: try Date parse
        const d2 = new Date(s);
        if (!isNaN(d2)) {
            const y = d2.getFullYear();
            const m = String(d2.getMonth() + 1).padStart(2, "0");
            const d = String(d2.getDate()).padStart(2, "0");
            return `${y}-${m}-${d}`;
        }
        return "";
    }

    const fileInputRef = useRef(null);

    return (
        <div className="absolute inset-0 z-40 text-base pointer-events-none overflow-hidden">
            {/* Backdrop */}
            <div
                className={[
                    "absolute inset-0 bg-black/30  transition-opacity duration-300",
                    open ? "opacity-100 pointer-events-auto" : "opacity-0",
                ].join(" ")}
                onClick={onCancel}
                aria-hidden
            />

            {/* Drawer */}
            <div
                className={[
                    "absolute right-0 top-0 bottom-0 h-full",
                    "transition-transform duration-300 ease-out",
                    open ? "translate-x-0" : "translate-x-full",
                    "pointer-events-none",
                ].join(" ")}
                style={{ width: 460, maxWidth: "90vw" }}
            >
                <div
                    className={[
                        "h-full bg-white text-black flex flex-col shadow-2xl border-l border-black/10",
                        "rounded-l-2xl overflow-hidden",
                        open ? "pointer-events-auto" : "pointer-events-none",
                    ].join(" ")}
                >
                    {/* Header */}
                    <div className="px-4 py-3 border-b border-black/10 bg-gradient-to-r from-slate-100 to-slate-50 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <button
                                className="text-white bg-red-600 hover:bg-red-700 text-2xl rounded-xl w-10 h-10 grid place-items-center shadow-sm"
                                onClick={onCancel}
                                aria-label="Închide"
                                title="Închide"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="flex-1 flex justify-center">
                            <h3 className="text-lg font-semibold tracking-tight">
                                {editingPin ? "Editează Pin" : "Adaugă Pin"}
                            </h3>
                        </div>

                        <div className="w-10" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                        {/* Photos */}
                        <section className="block text-base">
                            <div className="flex items-center justify-between mb-1">
                                <span className="font-semibold flex items-center gap-2">
                                    <FontAwesomeIcon icon={faCamera} className="text-slate-700" />
                                    Fotografii
                                </span>
                                <span className="text-xs text-gray-500">
                                    {existingPhotos.length + localPhotos.length}/{maxPhotos}
                                </span>
                            </div>

                            <div
                                className={`
                                        flex gap-4 py-2 flex-col sm:flex-row sm:items-center justify-between
                                    `}
                            >
                                <div
                                    onClick={() => {
                                        if (canAddMore && fileInputRef.current) {
                                            fileInputRef.current.click();
                                        }
                                    }}
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDropFiles}
                                    className={[
                                        "w-full rounded-2xl border-2 border-dashed px-3 py-3 transition",
                                        "flex items-center justify-center",
                                        canAddMore
                                            ? "border-slate-400 bg-slate-50/60 hover:bg-slate-100 cursor-pointer"
                                            : "border-slate-300 bg-slate-100 cursor-not-allowed opacity-60",
                                        isDragOver && canAddMore ? "border-blue-500 bg-blue-50/60" : "",
                                    ].join(" ")}
                                >
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        hidden
                                        onChange={handlePickFiles}
                                        disabled={!canAddMore}
                                    />

                                    <div className="inline-flex items-center gap-2">
                                        <FontAwesomeIcon icon={faCamera} className="text-slate-700" />

                                        <span className="hidden sm:inline text-sm font-medium">
                                            Click sau trage aici fotografiile
                                        </span>

                                        <span className="sm:hidden text-sm font-medium">
                                            Adaugă fotografii
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {(existingPhotos.length > 0 || localPhotos.length > 0) && (
                                <div className="mt-2 grid grid-cols-3 gap-2">
                                    {/* Existing photos (server) */}
                                    {existingPhotos.map((src, idx) => (
                                        <div
                                            key={`ex-${idx}`}
                                            className="relative"
                                        >
                                            <div

                                                className="relative group rounded-xl overflow-hidden border border-black/60 bg-slate-50"
                                            >
                                                <img
                                                    src={src.url}
                                                    alt={`existing-${idx}`}
                                                    className="w-full h-28 object-cover"
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                className="absolute -top-2 -right-2 bg-red-600 text-white w-6 h-6 rounded-full text-xs shadow-md opacity-90 group-hover:opacity-100"
                                                onClick={() => removeExistingAt(idx)}
                                                title="Șterge"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ))}
                                    {/* Newly added local files */}
                                    {localObjectUrls.map((src, idx) => (
                                        <div
                                            key={`new-${idx}`}
                                            className="relative"
                                        >
                                            <div
                                                className="relative group rounded-xl overflow-hidden border border-black/60 bg-slate-50"
                                            >
                                                <img
                                                    src={src}
                                                    alt={`preview-${idx}`}
                                                    className="w-full h-28 object-cover"
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                className="absolute -top-2 -right-2 bg-red-600 text-white w-6 h-6 rounded-full text-xs shadow-md opacity-90 group-hover:opacity-100"
                                                onClick={() => removeLocalAt(idx)}
                                                title="Șterge"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>

                        <hr className="border-dashed border-black/10" />

                        {/* Titlu */}
                        <section className="space-y-1">
                            <label className="block text-base">
                                <span className="font-semibold">Titlu</span>
                                <input
                                    className="mt-1 w-full border border-black rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/70 focus:border-blue-500"
                                    value={values.title}
                                    onChange={(e) => setValues(v => ({ ...v, title: e.target.value }))}
                                    placeholder="Ex: Ancorare balustradă"
                                />
                            </label>
                        </section>

                        {/* Reper */}
                        <section className="space-y-1">
                            <label className="block text-base">
                                <span className="font-semibold">Reper</span>
                                <input
                                    className="mt-1 w-full border border-black rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/70 focus:border-blue-500"
                                    value={values.reper}
                                    onChange={(e) => setValues(v => ({ ...v, reper: e.target.value }))}
                                    placeholder="Ex: Ax B-3, etaj 2"
                                />
                            </label>
                        </section>

                        {/* Descriere */}
                        <section className="space-y-1">
                            <label className="block text-base">
                                <span className="font-semibold">Descriere</span>
                                <textarea
                                    className="mt-1 w-full border border-black rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/70 focus:border-blue-500"
                                    rows={4}
                                    value={values.description}
                                    onChange={(e) => setValues(v => ({ ...v, description: e.target.value }))}
                                    placeholder="Detalii suplimentare, instrucțiuni, observații..."
                                />
                            </label>
                        </section>

                        <hr className="border-dashed border-gray-500" />

                        {/* Status / Prioritate */}
                        <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {/* Status */}
                            <label className="block text-base">
                                <span className="font-semibold">Status</span>
                                <select
                                    style={{ color: statusColor[values.status], backgroundColor: "white" }}
                                    className="mt-1 w-full border border-black rounded-lg px-3 py-2 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/70 focus:border-blue-500"
                                    value={values.status}
                                    onChange={(e) => setValues(v => ({ ...v, status: e.target.value }))}
                                >
                                    <option value="new">Nou</option>
                                    <option value="in_progress">În lucru</option>
                                    <option value="blocked">Blocat</option>
                                    <option value="done">Finalizat</option>
                                    <option value="cancelled">Anulat</option>
                                </select>
                            </label>

                            {/* Prioritate */}
                            <label className="block text-base">
                                <span className="font-semibold">Prioritate</span>
                                <select
                                    className="mt-1 w-full border outline-none border-black rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/70 focus:border-blue-500"
                                    value={values.priority}
                                    onChange={(e) => setValues(v => ({ ...v, priority: e.target.value }))}
                                >
                                    <option value="low">Mică</option>
                                    <option value="medium">Medie</option>
                                    <option value="high">Mare</option>
                                    <option value="critical">Critică</option>
                                </select>
                            </label>
                        </section>

                        {/* Atribuire */}
                        <section className="space-y-1">
                            <label className="block text-base">
                                <span className="font-semibold">Atribuire</span>
                                <select
                                    className="mt-1 w-full border outline-none border-black rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/70 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                                    value={values.assigned_user_id}
                                    onChange={(e) => setValues(v => ({ ...v, assigned_user_id: e.target.value }))}
                                    disabled={loadingAssignees}
                                >
                                    <option value="">Neatribuit</option>
                                    {assignees.map(u => (
                                        <option key={u.id} value={u.id}>{u.name}</option>
                                    ))}
                                </select>
                                {loadingAssignees && (
                                    <div className="text-xs text-gray-500 mt-1">Se încarcă utilizatorii…</div>
                                )}
                            </label>
                        </section>

                        {/* Termen */}
                        <section className="space-y-1">
                            <label className="block text-base">
                                <span className="font-semibold">Termen</span>
                                <input
                                    type="date"
                                    className="mt-1 w-full border border-black rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/70 focus:border-blue-500"
                                    value={values.due_date}
                                    onChange={(e) => setValues(v => ({ ...v, due_date: e.target.value }))}
                                />
                            </label>
                        </section>

                        {/* Keep pin after save */}
                        {!editingPin && (
                            <section className="pt-1">
                                <label className="gap-2 flex items-center text-base">
                                    <input
                                        type="checkbox"
                                        className="w-5 h-5 accent-blue-600"
                                        checked={remainPinState}
                                        onChange={(e) => setRemainPinState(e.target.checked)}
                                    />
                                    <span className="font-semibold">Menține pinul după salvare</span>
                                </label>
                            </section>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="px-4 py-3 border-t border-black/10 bg-slate-50 flex gap-2 justify-end">
                        <button
                            className="rounded-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 text-sm font-semibold shadow-sm"
                            onClick={onCancel}
                        >
                            Anulează
                        </button>
                        <button
                            className="rounded-full bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 text-sm font-semibold shadow-sm"
                            onClick={save}
                        >
                            {editingPin ? "Salvează modificările" : "Salvează"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}