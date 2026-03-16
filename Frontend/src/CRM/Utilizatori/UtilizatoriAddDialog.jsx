import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    Dialog, DialogClose, DialogContent, DialogDescription,
    DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faUndo, faUser, faXmark, faEye, faEyeSlash,
    faShield, faPlus, faLock, faPen,
} from "@fortawesome/free-solid-svg-icons";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import PhoneInputCustom from "../../components/ui/phone_input";
import photoApi from "@/api/photoAPI";
import TemplateEditorDialog from "./TemplateEditorDialog";
import { useDeleteTemplate } from "@/hooks/useConturi";
import DeleteDialog from "@/components/ui/delete-dialog";

// ── Permission constants ───────────────────────────────────────────────────────
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

// ── Permission helpers ────────────────────────────────────────────────────────
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
function PermRow({ label, value, onChange, locked }) {
    const flags = parseFlags(value);

    const toggle = (flag) => {
        if (locked) return;
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
        <div className={`grid grid-cols-[1fr_repeat(4,2rem)] items-center gap-2 py-2 px-3 ${locked ? "opacity-50" : "hover:bg-muted/50"}`}>
            <span className="text-sm">{label}</span>
            {PERM_FLAGS.map(({ flag, color }) => (
                <button
                    key={flag} type="button" disabled={locked} onClick={() => toggle(flag)}
                    className={[
                        "w-8 h-8 rounded border text-sm font-bold transition-all",
                        flags.has(flag)
                            ? `${color} border-current scale-105 shadow-sm`
                            : "border-border text-muted-foreground/40 hover:border-muted-foreground/50",
                        locked ? "cursor-not-allowed" : "cursor-pointer",
                    ].join(" ")}
                >
                    {flag.toUpperCase()}
                </button>
            ))}
        </div>
    );
}

// ── Default draft ─────────────────────────────────────────────────────────────
const emptyDraft = () => ({
    id: null,
    email: "",
    name: "",
    specializare: "",
    password: "",
    telephone: "",
    telephone_1: "",
    activ: true,
    photoFile: null,
    photoPreview: "",
    data_nastere: "",
    companie_interna_id: null,
});

// ── Main component ────────────────────────────────────────────────────────────
export default function UtilizatoriAddDialog({
    open,
    setOpen,
    onSubmitUtilizator,
    selectedUser = null,
    setSelectedUserEdit,
    companiiInterneOptions = [],

    // permissions props — wire up later
    predefinedRoles = [],
    // 
    onSavePredefinedRole,
    onEditPredefinedRole,
    onDeletePredefinedRole,
    buttonStyle,
}) {


    const photoRef = useRef(null);
    const [localDraft, setLocalDraft] = useState(emptyDraft);
    const [showPassword, setShowPassword] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);
    const [fixedNumbers, setFixedNumbers] = useState({ telephone: "", telephone_1: "" });

    // permissions state
    const [localPerms, setLocalPerms] = useState(EMPTY_PERMS);
    const [selectedRoleId, setSelectedRoleId] = useState("custom");
    const [templateEditorOpen, setTemplateEditorOpen] = useState(false);
    const [templateEditorMode, setTemplateEditorMode] = useState("create"); // "create" | "edit"

    // delete role state
    const [deleteRoleOpen, setDeleteRoleOpen] = useState(false);
    const [selectedRoleDelete, setSelectedRoleDelete] = useState(null); // { id, name }


    const [pendingSelectId, setPendingSelectId] = useState(null);

    // When predefinedRoles updates and contains our pending id → apply it
    useEffect(() => {
        if (!pendingSelectId) return;
        const found = predefinedRoles.find(r => String(r.id) === String(pendingSelectId));
        if (found) {
            setSelectedRoleId(String(found.id));
            setLocalPerms(parsePerms(found.json_permisiuni));
            setPendingSelectId(null);
        }
    }, [predefinedRoles, pendingSelectId]);

    useEffect(() => {
        if (!open) return;

        if (selectedUser) {
            setLocalDraft({
                id: selectedUser.id,
                email: selectedUser.email || "",
                name: selectedUser.name || "",
                specializare: selectedUser.specializare || "",
                password: "",
                telephone: selectedUser.telephone || "",
                telephone_1: selectedUser.telephone_1 || "",
                activ: !!selectedUser.activ,
                photoFile: null,
                photoPreview: selectedUser.photo_url ? `${photoApi}/${selectedUser.photo_url}` : "",
                data_nastere: selectedUser.data_nastere ? selectedUser.data_nastere.split("T")[0] : "",
                companie_interna_id: selectedUser.companie_interna_id || null,
            });
            setFixedNumbers({
                telephone: selectedUser.telephone || "",
                telephone_1: selectedUser.telephone_1 || "",
            });

            // load permissions from user
            const tid = selectedUser.permissions_template_id;
            if (tid) {
                const role = predefinedRoles.find(r => r.id === tid);
                setSelectedRoleId(String(tid));
                setLocalPerms(role ? parsePerms(role.json_permisiuni) : EMPTY_PERMS);
            } else {
                setSelectedRoleId("custom");
                setLocalPerms(parsePerms(selectedUser.permissions));
            }
        } else {
            setLocalDraft(emptyDraft());
            setFixedNumbers({ telephone: "", telephone_1: "" });
            setSelectedRoleId("custom");
            setLocalPerms(EMPTY_PERMS);
        }

        setShowPassword(false);
        setTemplateEditorOpen(false);
    }, [open, selectedUser]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Helpers ───────────────────────────────────────────────────────────────
    const set = (key, val) => setLocalDraft(prev => ({ ...prev, [key]: val }));
    const setPermModule = (key, val) => setLocalPerms(p => ({ ...p, permisiuni: { ...p.permisiuni, [key]: val } }));

    // reseataza draftul local
    const resetDraft = useCallback(() => {
        setLocalDraft(prev => {
            if (prev.photoPreview && !prev.photoPreview.startsWith("http")) URL.revokeObjectURL(prev.photoPreview);
            return emptyDraft();
        });
        setLocalPerms(EMPTY_PERMS);
        setSelectedRoleId("custom");
    }, []);

    // ── Template handlers ─────────────────────────────────────────────────────
    const isTemplate = selectedRoleId !== "custom";
    const selectedRole = predefinedRoles.find(r => String(r.id) === selectedRoleId);

    const openCreateTemplate = () => { setTemplateEditorMode("create"); setTemplateEditorOpen(true); };
    const openEditTemplate = () => { setTemplateEditorMode("edit"); setTemplateEditorOpen(true); };


    const applyRole = (val) => {
        setSelectedRoleId(val == "Unlocked" ? "custom" : val);
        if (val === "custom") { setLocalPerms(EMPTY_PERMS); return; }
        const role = predefinedRoles.find(r => String(r.id) === val);
        if (role) setLocalPerms(parsePerms(role.json_permisiuni));
    };

    // ── Photo ─────────────────────────────────────────────────────────────────
    const acceptPhoto = (file) => {
        if (!file?.type?.startsWith("image/")) return;
        setLocalDraft(prev => {
            if (prev.photoPreview && !prev.photoPreview.startsWith("http")) URL.revokeObjectURL(prev.photoPreview);
            return { ...prev, photoFile: file, photoPreview: URL.createObjectURL(file) };
        });
    };

    const clearPhoto = (e) => {
        e.stopPropagation();
        setLocalDraft(prev => {
            if (prev.photoPreview && !prev.photoPreview.startsWith("http")) URL.revokeObjectURL(prev.photoPreview);
            return { ...prev, photoFile: null, photoPreview: "" };
        });
        if (photoRef.current) photoRef.current.value = "";
    };

    // ── Submit ────────────────────────────────────────────────────────────────
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!localDraft.name?.trim()) { toast.warning("Numele este obligatoriu."); return; }
        if (!localDraft.email?.trim()) { toast.warning("Email-ul este obligatoriu."); return; }
        if (!localDraft.companie_interna_id) { toast.warning("Compania internă este obligatorie."); return; }
        if (!localDraft.id && (!localDraft.password?.trim() || localDraft.password.trim().length < 6)) { toast.warning("Parola este obligatorie pentru utilizatori noi și trebuie să aibă minim 6 caractere."); return; }
        await onSubmitUtilizator({
            ...localDraft,
            activ: localDraft.activ == true ? 1 : 0,
            permissions_template_id: isTemplate ? parseInt(selectedRoleId) : null,
            permissions: isTemplate ? null : localPerms,
        });
    };

    // ── Close ─────────────────────────────────────────────────────────────────
    const handleOpenChange = (val) => {
        if (!val) {
            setLocalDraft(prev => {
                if (prev.photoPreview && !prev.photoPreview.startsWith("http")) URL.revokeObjectURL(prev.photoPreview);
                return prev;
            });
        }
        setSelectedUserEdit?.(null);
        setOpen(val);
    };

    // ─────────────────────────────────────────────────────────────────────────

    // ── EDIT/SAVE TEMPLATES ────────────────────────────────────────────────────────────────

    const handleTemplateSave = async ({ id, nume_rol, descriere, json_permisiuni }) => {
        if (!nume_rol.trim()) { toast.warning("Numele rolului este obligatoriu."); return; }
        try {
            if (templateEditorMode === "edit") {
                await onEditPredefinedRole?.({ id, nume_rol, descriere, json_permisiuni });
                setLocalPerms(parsePerms(json_permisiuni));
                toast.success(`Template-ul "${nume_rol}" a fost actualizat cu succes!`);
            } else {
                const result = await onSavePredefinedRole?.({ nume_rol, descriere, json_permisiuni });
                if (result?.data?.templateId) {
                    setPendingSelectId(result.data.templateId);
                }
                toast.success(`Template-ul "${nume_rol}" a fost creat cu succes!`);
            }
            setTemplateEditorOpen(false);
        }
        catch (error) {
            console.log("Error saving template:", error);
            toast.error(error?.response?.data?.message || "Eroare la salvarea template-ului de Rol.");
        }
    };
    // ─────────────────────────────────────────────────────────────────────────


    // ── DELETE TEMPLATES ────────────────────────────────────────────────────────────────

    const handleTemplateDeleteClick = async ({ id, name }) => {
        setSelectedRoleDelete({ id, name });
        setDeleteRoleOpen(true);
    };

    const handleConfirmDeleteRole = async (code) => {
        const name = selectedRoleDelete?.name || "unknown";
        try {
            await onDeletePredefinedRole?.({ id: selectedRoleDelete.id, code });
            setSelectedRoleId("custom");
            setLocalPerms(EMPTY_PERMS);
            setTemplateEditorMode("create");
            setTemplateEditorOpen(false);
            toast.success(`Template-ul "${name}" a fost șters cu succes!`);
        }
        catch (error) {
            console.log("Error deleting template:", error);
            toast.error(error?.response?.data?.message || "Eroare la ștergerea template-ului de Rol.");
            return;
        }
        finally {
            setDeleteRoleOpen(false);
            setSelectedRoleDelete(null);
        }

    };
    // ─────────────────────────────────────────────────────────────────────────


    return (
        <>
            <Dialog open={open} onOpenChange={handleOpenChange}>
                <DialogTrigger asChild>{buttonStyle}</DialogTrigger>

                <DialogContent className="sm:max-w-[64rem] max-h-[90vh] flex flex-col overflow-hidden p-0">
                    <form onSubmit={handleSubmit} className="flex flex-col h-full max-h-[90vh]">

                        <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
                            <DialogTitle>{localDraft.id ? "Editează Utilizator" : "Adaugă Utilizator"}</DialogTitle>
                            <DialogDescription>Completează datele utilizatorului.</DialogDescription>
                        </DialogHeader>

                        {/* ── Scrollable body ──────────────────────────────────── */}
                        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-8 min-h-0">

                            {/* ── Informații personale ─────────────────────────── */}
                            <section className="space-y-4">
                                <p className="text-base font-semibold">Informații personale</p>

                                {/* Photo + fields */}
                                <div className="grid grid-cols-[auto_1fr] gap-4">
                                    <div
                                        onClick={() => photoRef.current?.click()}
                                        onDragEnter={e => { e.preventDefault(); setIsDragOver(true); }}
                                        onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
                                        onDragLeave={e => { e.preventDefault(); setIsDragOver(false); }}
                                        onDrop={e => { e.preventDefault(); setIsDragOver(false); acceptPhoto(e.dataTransfer.files?.[0]); }}
                                        className={[
                                            "relative w-32 h-32 shrink-0 rounded-xl border-2 border-dashed cursor-pointer select-none",
                                            "flex flex-col items-center justify-center gap-1 overflow-hidden hover:bg-muted/40 transition",
                                            isDragOver ? "border-primary ring-2 ring-primary/30" : "border-input",
                                        ].join(" ")}
                                    >
                                        <input ref={photoRef} type="file" accept="image/*" className="hidden"
                                            onChange={e => acceptPhoto(e.target.files?.[0])}
                                            onClick={e => { e.currentTarget.value = null; }}
                                        />
                                        {localDraft.photoPreview ? (
                                            <>
                                                <img src={localDraft.photoPreview} alt="avatar" className="absolute inset-0 w-full h-full object-cover" />
                                                <button type="button" onClick={clearPhoto}
                                                    className="absolute top-1 right-1 z-10 bg-black/60 hover:bg-black/80 text-white rounded-full w-6 h-6 flex items-center justify-center">
                                                    <FontAwesomeIcon icon={faXmark} className="text-sm" />
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <FontAwesomeIcon icon={faUser} className="text-xl text-muted-foreground" />
                                                <span className="text-sm text-muted-foreground text-center px-1">Fotografie</span>
                                            </>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <Label>Nume complet <span className="text-destructive">*</span></Label>
                                            <Input value={localDraft.name} onChange={e => set("name", e.target.value)} placeholder="POPESCU Ion" />
                                        </div>
                                        <div className="space-y-1">
                                            <Label>Email <span className="text-destructive">*</span></Label>
                                            <Input type="email" value={localDraft.email} onChange={e => set("email", e.target.value)} placeholder="ion@companie.ro" />
                                        </div>
                                        <div className="space-y-1">
                                            <Label>Telefon muncă</Label>
                                            <PhoneInputCustom
                                                fixedNumber={fixedNumbers.telephone}
                                                value={localDraft.telephone}
                                                defaultCountry="RO"
                                                onChange={v => set("telephone", v)}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label>Telefon personal</Label>
                                            <PhoneInputCustom
                                                fixedNumber={fixedNumbers.telephone_1}
                                                value={localDraft.telephone_1}
                                                defaultCountry="RO"
                                                onChange={v => set("telephone_1", v)}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Specializare / Data nastere / Companie */}
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="space-y-1">
                                        <Label>Specializare</Label>
                                        <Input value={localDraft.specializare} onChange={e => set("specializare", e.target.value)} placeholder="Inginer Civil" />
                                    </div>
                                    <div className="space-y-1">
                                        <Label>Data nașterii</Label>
                                        <Input type="date" value={localDraft.data_nastere || ""} onChange={e => set("data_nastere", e.target.value)} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label>Companie principală <span className="text-destructive">*</span></Label>
                                        <Select value={localDraft.companie_interna_id?.toString() || ""} onValueChange={v => set("companie_interna_id", parseInt(v))}>
                                            <SelectTrigger><SelectValue placeholder="Selectează..." /></SelectTrigger>
                                            <SelectContent>
                                                {companiiInterneOptions.map(c => (
                                                    <SelectItem key={c.id} value={c.id.toString()}>
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: c.culoare_hex }} />
                                                            {c.nume}
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                {/* Password + Active */}
                                <div className="flex gap-4 items-start">
                                    <div className="space-y-1 flex-1 max-w-sm">
                                        <Label>Parolă {!localDraft.id && <span className="text-destructive">*</span>}</Label>
                                        <div className="relative">
                                            <Input
                                                type={showPassword ? "text" : "password"}
                                                value={localDraft.password} maxLength={25}
                                                onChange={e => set("password", e.target.value)}
                                                placeholder={localDraft.id ? "Lasă gol pentru a nu modifica" : "Parola123$"}
                                                className="pr-10"
                                            />
                                            <button type="button" onClick={() => setShowPassword(v => !v)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                                                <FontAwesomeIcon icon={showPassword ? faEye : faEyeSlash} className="text-sm" />
                                            </button>
                                        </div>
                                        <p className="text-sm text-muted-foreground">Minim 6 caractere.</p>
                                    </div>
                                    <div className="space-y-1">
                                        <Label>Cont activ</Label>
                                        <div className="flex items-center gap-2 h-10 px-3 rounded-md border border-input">
                                            <Switch checked={!!localDraft.activ} onCheckedChange={v => set("activ", v)} />
                                            <span className={`text-sm font-medium ${localDraft.activ ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}>
                                                {localDraft.activ ? "Activ" : "Inactiv"}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <Separator />

                            {/* ── Permisiuni ───────────────────────────────────── */}
                            <section className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <FontAwesomeIcon icon={faShield} className="text-primary" />
                                    <p className="text-base font-semibold">Permisiuni</p>
                                    {isTemplate && (
                                        <Badge variant="outline" className="gap-1 bg-muted">
                                            <FontAwesomeIcon icon={faLock} className="text-sm" />
                                            {selectedRole?.nume_rol}
                                        </Badge>
                                    )}
                                </div>

                                {/* Template selector + actions */}
                                <div className="flex flex-wrap items-center gap-2">
                                    <Select value={selectedRoleId} onValueChange={applyRole}>
                                        <SelectTrigger className="w-56 h-8 text-sm">
                                            <SelectValue placeholder="Alege template..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="custom" className="font-semibold text-primary">Personalizat</SelectItem>
                                            {predefinedRoles.map(r => (
                                                <SelectItem key={r.id} value={String(r.id)}>{r.nume_rol}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>

                                    {isTemplate && (
                                        <>
                                            <Button type="button" size="sm" variant="outline" className="h-8 gap-1" onClick={() => applyRole("Unlocked")}>
                                                <FontAwesomeIcon icon={faLock} /> Deblochează
                                            </Button>
                                            <Button type="button" size="sm" variant="outline" className="h-8 gap-1" onClick={openEditTemplate}>
                                                <FontAwesomeIcon icon={faPen} /> Editează template
                                            </Button>
                                        </>
                                    )}

                                    {!isTemplate && (
                                        <Button type="button" size="sm" variant="outline" className="h-8 gap-1" onClick={openCreateTemplate}>
                                            <FontAwesomeIcon icon={faPlus} /> Salvează ca template
                                        </Button>
                                    )}
                                </div>

                                {/* Super admin */}
                                <div className="flex items-center justify-between rounded-lg border p-3 bg-destructive/5 border-destructive/20">
                                    <div>
                                        <p className="text-sm font-semibold text-destructive">Super Administrator</p>
                                        <p className="text-sm text-muted-foreground">Acces complet la toate modulele.</p>
                                    </div>
                                    <Switch
                                        checked={localPerms.superAdmin}
                                        onCheckedChange={v => setLocalPerms(p => ({ ...p, superAdmin: v }))}
                                        disabled={isTemplate}
                                    />
                                </div>

                                {/* Limbi + Firme */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="rounded-lg border p-3 space-y-2">
                                        <Label className="text-sm font-semibold">Limbi accesibile</Label>
                                        <div className="flex flex-wrap gap-2">
                                            {AVAILABLE_LIMBI.map(l => (
                                                <label key={l} className={[
                                                    "flex items-center gap-2 cursor-pointer px-3 py-1 rounded-md border text-sm transition select-none",
                                                    localPerms.limbi?.includes(l) ? "border-primary bg-primary/10 text-primary font-medium" : "border-border text-muted-foreground",
                                                    isTemplate ? "opacity-60 cursor-not-allowed" : "",
                                                ].join(" ")}>
                                                    <Checkbox
                                                        checked={localPerms.limbi?.includes(l)}
                                                        disabled={isTemplate}
                                                        onCheckedChange={checked => setLocalPerms(p => ({
                                                            ...p,
                                                            limbi: checked ? [...(p.limbi || []), l] : (p.limbi || []).filter(x => x !== l),
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
                                                <label key={f.id} className={`flex items-center gap-2 text-sm cursor-pointer rounded px-1 py-0.5 hover:bg-muted transition ${isTemplate ? "opacity-60 cursor-not-allowed" : ""}`}>
                                                    <Checkbox
                                                        checked={localPerms.firme?.includes(f.id)}
                                                        disabled={isTemplate}
                                                        onCheckedChange={checked => setLocalPerms(p => ({
                                                            ...p,
                                                            firme: checked ? [...(p.firme || []), f.id] : (p.firme || []).filter(x => x !== f.id),
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
                                    <div className="grid grid-cols-[1fr_repeat(4,2rem)] items-center gap-2 px-3 py-2 bg-muted/50 border-b">
                                        <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Modul</span>
                                        {PERM_FLAGS.map(({ flag, label, color }) => (
                                            <span key={flag} title={label}
                                                className={`w-8 h-7 flex items-center justify-center rounded border text-sm font-bold ${color}`}>
                                                {flag.toUpperCase()}
                                            </span>
                                        ))}
                                    </div>
                                    <div className="divide-y">
                                        {PERMISSION_MODULES.map(({ key, label }) => (
                                            <PermRow
                                                key={key}
                                                label={label}
                                                value={localPerms.permisiuni?.[key] ?? ""}
                                                onChange={val => setPermModule(key, val)}
                                                locked={isTemplate}
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
                            </section>
                        </div>

                        {/* ── Footer ───────────────────────────────────────────── */}
                        <DialogFooter className="px-6 py-4 border-t shrink-0">
                            <div className="flex w-full justify-between items-center">
                                {!localDraft.id ? (
                                    <Button type="button" variant="outline" onClick={resetDraft}>
                                        <FontAwesomeIcon icon={faUndo} className="mr-2" /> Resetează
                                    </Button>
                                ) : <div />}
                                <div className="flex gap-2">
                                    <DialogClose asChild>
                                        <Button type="button" variant="outline">Anulează</Button>
                                    </DialogClose>
                                    <Button type="submit">Salvează</Button>
                                </div>
                            </div>
                        </DialogFooter>

                    </form>
                </DialogContent>
            </Dialog>

            <TemplateEditorDialog
                open={templateEditorOpen}
                onOpenChange={setTemplateEditorOpen}
                mode={templateEditorMode}
                initialTemplate={
                    templateEditorMode === "edit"
                        ? selectedRole ?? null
                        : { json_permisiuni: localPerms }   // seed "create" with current perms
                }
                companiiInterneOptions={companiiInterneOptions}
                onSave={handleTemplateSave}
                onDelete={handleTemplateDeleteClick}
            />

            <DeleteDialog
                open={deleteRoleOpen}
                setOpen={setDeleteRoleOpen}
                title={`Șterge template-ul "${selectedRoleDelete?.name}"?`}
                description="Această acțiune este ireversibilă. Toți utilizatorii care aveau acest template vor fi setați pe permisiuni personalizate."
                onSubmit={handleConfirmDeleteRole}
                useCode={true}
            />
        </>
    );
}