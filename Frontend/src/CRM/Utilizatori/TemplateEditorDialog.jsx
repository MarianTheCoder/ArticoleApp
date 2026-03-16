import React, { useEffect, useState } from "react";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faShield, faSave, faTrash } from "@fortawesome/free-solid-svg-icons";
import { toast } from "sonner";

// ── Permission constants (duplicated so this file is self-contained) ──────────
const PERMISSION_MODULES = [
    { key: "santiere", label: "Șantiere" },
    { key: "filiale", label: "Filiale" },
    { key: "contacte", label: "Contacte" },
    { key: "companii", label: "Companii" },
    { key: "conturi", label: "Conturi" },
    { key: "pontaje", label: "Pontaje" },
    { key: "rezerve", label: "Rezerve" },
    { key: "oferte", label: "Oferte" },
    { key: "retete", label: "Rețete" },
    { key: "manopere", label: "Manopere" },
    { key: "materiale", label: "Materiale" },
    { key: "transport", label: "Transport" },
    { key: "utilaje", label: "Utilaje" },
];

const PERM_FLAGS = [
    { flag: "v", label: "Vizualizare", color: "bg-blue-500/40 text-blue-700 border-blue-500 dark:text-blue-400" },
    { flag: "c", label: "Creare", color: "bg-green-500/40 text-green-700 border-green-500 dark:text-green-400" },
    { flag: "e", label: "Editare", color: "bg-amber-500/40 text-amber-700 border-amber-500 dark:text-amber-400" },
    { flag: "s", label: "Ștergere", color: "bg-red-500/40 text-red-700 border-red-500 dark:text-red-400" },
];

const AVAILABLE_LIMBI = ["RO", "FR"];

const EMPTY_PERMS = {
    superAdmin: false,
    limbi: ["RO"],
    firme: [],
    permisiuni: Object.fromEntries(PERMISSION_MODULES.map(m => [m.key, ""])),
};

const parseFlags = (str) => new Set((str || "").split("").filter(Boolean));
const serializeFlags = (set) => [...set].sort().join("");

const getContrastColor = (hex) => {
    const clean = (hex?.replace("#", "") || "000");
    const full = clean.length === 3 ? clean.split("").map(c => c + c).join("") : clean;
    const n = parseInt(full, 16);
    const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    const lin = c => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); };
    const L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
    return L > 0.179 ? "#000" : "#fff";
};

const parsePerms = (raw) => {
    if (!raw) return EMPTY_PERMS;
    const p = typeof raw === "string" ? JSON.parse(raw) : raw;
    return { ...EMPTY_PERMS, ...p, permisiuni: { ...EMPTY_PERMS.permisiuni, ...(p.permisiuni || {}) } };
};

// ── PermRow ───────────────────────────────────────────────────────────────────
function PermRow({ label, value, onChange }) {
    const flags = parseFlags(value);

    const toggle = (flag) => {
        const next = new Set(flags);
        if (flag === "v") {
            next.has("v") ? next.delete("v") : next.add("v");
            if (!next.has("v")) { onChange(""); return; }
        } else {
            next.has(flag) ? next.delete(flag) : next.add(flag);
            if (next.has(flag)) next.add("v");
        }
        onChange(serializeFlags(next));
    };

    return (
        <div className="grid grid-cols-[1fr_repeat(4,2rem)] items-center gap-2 py-2 px-3 hover:bg-muted/50 rounded">
            <span className="text-sm">{label}</span>
            {PERM_FLAGS.map(({ flag, color }) => (
                <button
                    key={flag} type="button" onClick={() => toggle(flag)}
                    className={[
                        "w-8 h-8 rounded border text-sm font-bold transition-all cursor-pointer",
                        flags.has(flag)
                            ? `${color} border-current scale-105 shadow-sm`
                            : "border-border text-muted-foreground/40 hover:border-muted-foreground/50",
                    ].join(" ")}
                >
                    {flag.toUpperCase()}
                </button>
            ))}
        </div>
    );
}

// ── TemplateEditorDialog ──────────────────────────────────────────────────────
/**
 * Props:
 *   open              boolean
 *   onOpenChange      (bool) => void
 *   mode              "create" | "edit"
 *   initialTemplate   { id?, nume_rol, descriere, json_permisiuni } | null
 *   companiiInterneOptions  [{ id, nume, culoare_hex }]
 *   onSave            async ({ id?, nume_rol, descriere, json_permisiuni }) => void
 *   onDelete          async ({ id }) => void   (only used in edit mode)
 */
export default function TemplateEditorDialog({
    open,
    onOpenChange,
    mode = "create",
    initialTemplate = null,
    companiiInterneOptions = [],
    onSave,
    onDelete,
}) {
    const isEdit = mode === "edit";

    const [name, setName] = useState("");
    const [desc, setDesc] = useState("");
    const [perms, setPerms] = useState(EMPTY_PERMS);

    // ── populate on open ─────────────────────────────────────────────────────
    useEffect(() => {
        if (!open) return;
        if (initialTemplate) {
            setName(initialTemplate.nume_rol || "");
            setDesc(initialTemplate.descriere || "");
            setPerms(parsePerms(initialTemplate.json_permisiuni));
        } else {
            setName("");
            setDesc("");
            setPerms(EMPTY_PERMS);
        }
    }, [open, initialTemplate]);

    // ── helpers ──────────────────────────────────────────────────────────────
    const setPermModule = (key, val) =>
        setPerms(p => ({ ...p, permisiuni: { ...p.permisiuni, [key]: val } }));

    const toggleAll = () => {
        const allFull = PERMISSION_MODULES.every(m => perms.permisiuni[m.key] === "vces");
        const next = allFull ? "" : "vces";
        setPerms(p => ({
            ...p,
            permisiuni: Object.fromEntries(PERMISSION_MODULES.map(m => [m.key, next])),
        }));
    };

    const allChecked = PERMISSION_MODULES.every(m => perms.permisiuni[m.key] === "vces");


    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[56rem] max-h-[90vh] flex flex-col overflow-hidden p-0">
                <DialogHeader className="px-6 pt-6 pb-3 shrink-0 border-b">
                    <div className="flex items-center gap-2">
                        <FontAwesomeIcon icon={faShield} className="text-primary" />
                        <DialogTitle>
                            {isEdit ? `Editează template — ${initialTemplate?.nume_rol || ""}` : "Template nou"}
                        </DialogTitle>
                    </div>
                    <DialogDescription>
                        {isEdit ? "Modificările se aplică tuturor utilizatorilor cu acest template." : "Creează un set de permisiuni reutilizabil."}
                    </DialogDescription>
                </DialogHeader>

                {/* ── scrollable body ──────────────────────────────────────── */}
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 min-h-0">

                    {/* Name + description */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label>Nume rol <span className="text-destructive">*</span></Label>
                            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Administrator Regional" />
                        </div>
                        <div className="space-y-1">
                            <Label>Descriere</Label>
                            <Input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Descriere opțională..." />
                        </div>
                    </div>

                    {/* Super admin */}
                    <div className="flex items-center justify-between rounded-lg border p-3 bg-destructive/5 border-destructive/20">
                        <div>
                            <p className="text-sm font-semibold text-destructive">Super Administrator</p>
                            <p className="text-sm text-muted-foreground">Acces complet la toate modulele, indiferent de grid.</p>
                        </div>
                        <Switch
                            checked={perms.superAdmin}
                            onCheckedChange={v => setPerms(p => ({ ...p, superAdmin: v }))}
                        />
                    </div>

                    {/* Limbi + Firme */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="rounded-lg border p-3 space-y-2">
                            <Label className="text-sm font-semibold">Limbi accesibile</Label>
                            <div className="flex flex-wrap gap-2">
                                {AVAILABLE_LIMBI.map(l => (
                                    <label key={l} className={[
                                        "flex items-center gap-2 cursor-pointer px-4 py-2 rounded-md border text-sm transition select-none",
                                        perms.limbi?.includes(l)
                                            ? "border-primary bg-primary/10 text-primary font-medium"
                                            : "border-border text-muted-foreground",
                                    ].join(" ")}>
                                        <Checkbox
                                            className="w-5 h-5"
                                            checked={perms.limbi?.includes(l)}
                                            onCheckedChange={checked => setPerms(p => ({
                                                ...p,
                                                limbi: checked
                                                    ? [...(p.limbi || []), l]
                                                    : (p.limbi || []).filter(x => x !== l),
                                            }))}
                                        />
                                        {l}
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div className="rounded-lg border p-3 space-y-2">
                            <Label className="text-sm font-semibold">Firme accesibile</Label>
                            <div className="flex flex-col gap-1 max-h-24 overflow-y-auto">
                                {companiiInterneOptions.map(f => (
                                    <label key={f.id} className="flex items-center gap-2 text-sm cursor-pointer rounded px-1 py-0.5 hover:bg-muted transition">
                                        <Checkbox
                                            className="w-5 h-5"
                                            checked={perms.firme?.includes(f.id)}
                                            onCheckedChange={checked => setPerms(p => ({
                                                ...p,
                                                firme: checked
                                                    ? [...(p.firme || []), f.id]
                                                    : (p.firme || []).filter(x => x !== f.id),
                                            }))}
                                        />
                                        <span className="px-2 py-0.5 rounded text-sm font-medium"
                                            style={{ backgroundColor: f.culoare_hex, color: getContrastColor(f.culoare_hex) }}>
                                            {f.nume}
                                        </span>
                                    </label>
                                ))}
                                {companiiInterneOptions.length === 0 && (
                                    <span className="text-sm text-muted-foreground italic">Nicio companie disponibilă.</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Permission grid */}
                    <div className="rounded-lg border overflow-hidden">
                        {/* Header */}
                        <div className="grid grid-cols-[1fr_repeat(4,2rem)] items-center gap-2 px-3 py-2 bg-muted/60 border-b">
                            <div className="flex items-center gap-3">
                                <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Modul</span>
                                {/* Select all toggle */}
                                <button
                                    type="button"
                                    onClick={toggleAll}
                                    className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-2 transition"
                                >
                                    {allChecked ? "Deselectează tot" : "Selectează tot"}
                                </button>
                            </div>
                            {PERM_FLAGS.map(({ flag, label, color }) => (
                                <span key={flag} title={label}
                                    className={`w-8 h-7 flex items-center justify-center rounded border text-sm font-bold ${color}`}>
                                    {flag.toUpperCase()}
                                </span>
                            ))}
                        </div>

                        {/* Rows */}
                        <div className="divide-y">
                            {PERMISSION_MODULES.map(({ key, label }) => (
                                <PermRow
                                    key={key}
                                    label={label}
                                    value={(perms.permisiuni?.[key] ?? "")}
                                    onChange={val => setPermModule(key, val)}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Legend */}
                    <div className="flex flex-wrap gap-2">
                        {PERM_FLAGS.map(({ flag, label, color }) => (
                            <span key={flag} className={`flex items-center gap-1 px-2 py-1 rounded border text-sm ${color}`}>
                                <strong>{flag.toUpperCase()}</strong> — {label}
                            </span>
                        ))}
                    </div>
                </div>

                {/* ── footer ───────────────────────────────────────────────── */}
                <DialogFooter className="px-6 py-4 border-t shrink-0">
                    <div className="flex w-full items-center justify-between">
                        {/* Delete (edit mode only) */}
                        {isEdit ? (
                            <Button
                                type="button" variant="destructive"
                                onClick={() => { onDelete?.({ name: initialTemplate.nume_rol, id: initialTemplate.id }); }}
                            >
                                <FontAwesomeIcon icon={faTrash} className="mr-2" />
                                {"Șterge template"}
                            </Button>
                        ) : <div />}

                        <div className="flex gap-2">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                Anulează
                            </Button>
                            <Button type="button" onClick={() => {
                                onSave?.({
                                    ...(isEdit && initialTemplate?.id ? { id: initialTemplate.id } : {}),
                                    nume_rol: name.trim(),
                                    descriere: desc.trim(),
                                    json_permisiuni: perms,
                                });
                            }} >
                                <FontAwesomeIcon icon={faSave} className="mr-2" />
                                {isEdit ? "Salvează modificările" : "Creează template"}
                            </Button>
                        </div>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}