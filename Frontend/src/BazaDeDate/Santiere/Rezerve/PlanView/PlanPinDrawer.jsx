// src/components/Rezerve/PlanPinDrawer.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../../../../api/axiosAPI";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCamera } from "@fortawesome/free-solid-svg-icons";
import photoAPI from "../../../../api/photoAPI.jsx";
import { useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { faXmark } from "@fortawesome/free-solid-svg-icons"; // Used for the close button
import { Button } from "@/components/ui/button";

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

    // --- editing-specific photo state ---
    // URLs of existing photos on the server (only used in edit mode)
    const [existingPhotos, setExistingPhotos] = useState([]); // array<string URL>
    // URLs we removed (so backend can delete)
    const [deleteExisting, setDeleteExisting] = useState([]); // array<string URL>
    // newly added local files (both modes)
    const [localPhotos, setLocalPhotos] = useState([]); // array<File>


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
                    "absolute inset-0 bg-black/40 transition-opacity duration-300",
                    open ? "opacity-100 pointer-events-auto" : "opacity-0",
                ].join(" ")}
                onClick={onCancel}
                aria-hidden
            />

            {/* Drawer */}
            <div
                className={[
                    "absolute right-0 top-0 bottom-0 h-full flex flex-col",
                    "transition-transform duration-300 bg-card border-l border-input ease-out shadow-2xl",
                    open ? "translate-x-0 pointer-events-auto" : "translate-x-full pointer-events-none",
                ].join(" ")}
                style={{ width: "36rem", maxWidth: "90vw" }}
            >
                {/* Header */}
                <div className="px-5 py-4 border-b border-border bg-muted/10 flex items-center justify-between">
                    <Button
                        variant="destructive"
                        size="icon"
                        className="rounded-xl h-10 w-10 shadow-sm shrink-0"
                        onClick={onCancel}
                        aria-label="Închide"
                        title="Închide"
                    >
                        <FontAwesomeIcon icon={faXmark} className="text-lg" />
                    </Button>

                    <div className="flex-1 flex justify-center text-foreground">
                        <h3 className="text-lg font-bold tracking-tight">
                            {editingPin ? "Editează Pin" : "Adaugă Pin"}
                        </h3>
                    </div>

                    <div className="w-10 shrink-0" />
                </div>

                {/* Content */}
                <ScrollArea className="flex-1">
                    <div className="px-5 py-5 space-y-6">
                        {/* Photos */}
                        <section className="block text-base">
                            <div className="flex items-center justify-between mb-2">
                                <Label className="text-base font-semibold flex items-center gap-2 text-foreground">
                                    <FontAwesomeIcon icon={faCamera} className="text-muted-foreground" />
                                    Fotografii
                                </Label>
                                <span className="text-sm font-semibold text-muted-foreground">
                                    {existingPhotos.length + localPhotos.length}/{maxPhotos}
                                </span>
                            </div>

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
                                    "w-full rounded-xl border-2 border-dashed px-3 py-4 transition-all flex items-center justify-center",
                                    canAddMore
                                        ? "border-input bg-background hover:bg-muted/50 cursor-pointer"
                                        : "border-input bg-muted cursor-not-allowed opacity-60",
                                    isDragOver && canAddMore ? "border-primary bg-primary/5" : "",
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

                                <div className="inline-flex items-center gap-2 text-foreground">
                                    <FontAwesomeIcon icon={faCamera} />
                                    <span className="text-sm font-medium">
                                        {canAddMore ? "Click sau trage aici fotografiile" : "Limită fotografii atinsă"}
                                    </span>
                                </div>
                            </div>

                            {(existingPhotos.length > 0 || localPhotos.length > 0) && (
                                <div className="mt-3 grid grid-cols-3 gap-3">
                                    {/* Existing photos (server) */}
                                    {existingPhotos.map((src, idx) => (
                                        <div key={`ex-${idx}`} className="relative group">
                                            <div className="relative rounded-xl overflow-hidden border border-input bg-muted shadow-sm">
                                                <img src={src.url} alt={`existing-${idx}`} className="w-full h-28 object-cover" />
                                            </div>
                                            <Button
                                                variant="destructive"
                                                size="icon"
                                                className="absolute -top-2 -right-2 w-7 h-7 rounded-full text-sm shadow-md z-10 opacity-90 group-hover:opacity-100 transition-opacity"
                                                onClick={() => removeExistingAt(idx)}
                                                title="Șterge"
                                            >
                                                <FontAwesomeIcon icon={faXmark} />
                                            </Button>
                                        </div>
                                    ))}
                                    {/* Newly added local files */}
                                    {localObjectUrls.map((src, idx) => (
                                        <div key={`new-${idx}`} className="relative group">
                                            <div className="relative rounded-xl overflow-hidden border border-input bg-muted shadow-sm">
                                                <img src={src} alt={`preview-${idx}`} className="w-full h-28 object-cover" />
                                            </div>
                                            <Button
                                                variant="destructive"
                                                size="icon"
                                                className="absolute -top-2 -right-2 w-7 h-7 rounded-full text-sm shadow-md z-10 opacity-90 group-hover:opacity-100 transition-opacity"
                                                onClick={() => removeLocalAt(idx)}
                                                title="Șterge"
                                            >
                                                <FontAwesomeIcon icon={faXmark} />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>

                        <Separator className="border-dashed" />

                        {/* Titlu */}
                        <section className="space-y-2 text-foreground">
                            <Label className="text-base font-semibold">Titlu</Label>
                            <Input
                                value={values.title}
                                onChange={(e) => setValues(v => ({ ...v, title: e.target.value }))}
                                placeholder="Ex: Ancorare balustradă"
                                className="h-10"
                            />
                        </section>

                        {/* Reper */}
                        <section className="space-y-2 text-foreground">
                            <Label className="text-base font-semibold">Reper</Label>
                            <Input
                                value={values.reper}
                                onChange={(e) => setValues(v => ({ ...v, reper: e.target.value }))}
                                placeholder="Ex: Ax B-3, etaj 2"
                                className="h-10"
                            />
                        </section>

                        {/* Descriere */}
                        <section className="space-y-2 text-foreground">
                            <Label className="text-base font-semibold">Descriere</Label>
                            <Textarea
                                rows={4}
                                value={values.description}
                                onChange={(e) => setValues(v => ({ ...v, description: e.target.value }))}
                                placeholder="Detalii suplimentare, instrucțiuni, observații..."
                                className="resize-none"
                            />
                        </section>

                        <Separator className="border-dashed" />

                        {/* Status / Prioritate */}
                        <section className="grid grid-cols-1 sm:grid-cols-2 text-foreground gap-4">
                            {/* Status */}
                            <div className="space-y-2">
                                <Label className="text-base font-semibold">Status</Label>
                                <Select
                                    value={values.status}
                                    onValueChange={(val) => setValues(v => ({ ...v, status: val }))}
                                >
                                    <SelectTrigger className="h-10 font-semibold" style={{ color: statusColor ? statusColor[values.status] : undefined }}>
                                        <SelectValue placeholder="Selectează status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="new">Nou</SelectItem>
                                        <SelectItem value="in_progress">În lucru</SelectItem>
                                        <SelectItem value="blocked">Blocat</SelectItem>
                                        <SelectItem value="done">Finalizat</SelectItem>
                                        <SelectItem value="checked">Validat</SelectItem>
                                        <SelectItem value="cancelled">Anulat</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Prioritate */}
                            <div className="space-y-2">
                                <Label className="text-base text-foreground font-semibold">Prioritate</Label>
                                <Select
                                    value={values.priority}
                                    onValueChange={(val) => setValues(v => ({ ...v, priority: val }))}
                                >
                                    <SelectTrigger className="h-10">
                                        <SelectValue placeholder="Selectează prioritate" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="low">Mică</SelectItem>
                                        <SelectItem value="medium">Medie</SelectItem>
                                        <SelectItem value="high">Mare</SelectItem>
                                        <SelectItem value="critical">Critică</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </section>

                        {/* Termen */}
                        <section className="space-y-2 text-foreground">
                            <Label className="text-base font-semibold">Termen</Label>
                            <Input
                                type="date"
                                value={values.due_date}
                                onChange={(e) => setValues(v => ({ ...v, due_date: e.target.value }))}
                                className="h-10"
                            />
                        </section>

                        {/* Keep pin after save */}
                        {!editingPin && (
                            <section className="pt-2 text-foreground">
                                <div className="flex items-center gap-3">
                                    <Checkbox
                                        id="remain-pin-checkbox"
                                        checked={remainPinState}
                                        onCheckedChange={(checked) => setRemainPinState(checked)}
                                        className="h-5 w-5"
                                    />
                                    <Label htmlFor="remain-pin-checkbox" className="text-base font-semibold cursor-pointer">
                                        Menține pinul după salvare
                                    </Label>
                                </div>
                            </section>
                        )}
                    </div>
                </ScrollArea>

                {/* Actions */}
                <div className="px-5 py-4 border-t border-border bg-muted/10 flex gap-3 justify-end">
                    <Button
                        variant="destructive"
                        className="rounded-full px-6"
                        onClick={onCancel}
                    >
                        Anulează
                    </Button>
                    <Button
                        className="rounded-full bg-blue-600 hover:bg-blue-700 text-white px-8"
                        onClick={save}
                    >
                        {editingPin ? "Salvează modificările" : "Salvează"}
                    </Button>
                </div>
            </div>
        </div>
    );
}