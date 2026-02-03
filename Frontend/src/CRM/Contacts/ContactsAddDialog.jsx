import React, { useRef, useState } from "react";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

import { Label } from "@/components/ui/label";

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUndo } from "@fortawesome/free-solid-svg-icons";

import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function ContactsAddDialog({
    open,
    setOpen,
    onSubmitContact,
    draft,
    resetDraft,
    setDraft,
    buttonStyle = (<div className="hidden" />),
    reset = false,
    title = "Adaugă un contact",
}) {

    const [isDragOver, setIsDragOver] = useState(false);
    const inputRef = useRef(null);

    const setField = (key, value) => {
        setDraft((prev) => ({ ...prev, [key]: value }));
    };

    // --- LOGICA FOTO ACTUALIZATĂ ---

    const acceptLogo = (file) => {
        if (!file) return;
        if (!file.type?.startsWith("image/")) {
            toast.error("Te rog încarcă doar fișiere de tip imagine (JPG, PNG).");
            return;
        }

        setDraft((prev) => {
            // Dacă exista un preview anterior creat local (Blob), îl ștergem din memorie
            if (prev.logoPreview && prev.logoPreview.startsWith('blob:')) {
                URL.revokeObjectURL(prev.logoPreview);
            }

            const url = URL.createObjectURL(file);
            return {
                ...prev,
                logoFile: file,
                logoPreview: url,
                delete_logo: false // Dacă punem o poză nouă, anulăm ștergerea
            };
        });
    };

    const onLogoInputChange = (e) => {
        const file = e.target.files?.[0];
        acceptLogo(file);
    };

    const onDropLogo = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
        const file = e.dataTransfer.files?.[0];
        acceptLogo(file);
    };

    const clearLogo = () => {
        setDraft((prev) => {
            if (prev.logoPreview && prev.logoPreview.startsWith('blob:')) {
                URL.revokeObjectURL(prev.logoPreview);
            }
            return {
                ...prev,
                logoFile: null,
                logoPreview: null, // Ascundem poza
                delete_logo: true  // <--- SETĂM FLAGUL PENTRU SERVER
            };
        });
        if (inputRef.current) inputRef.current.value = "";
    };

    // -------------------------------

    return (
        <Dialog open={open} onOpenChange={setOpen}>

            <DialogTrigger onClick={() => {

                // Resetează draft-ul dacă e un contact existent
                // daca nu e pe baza de user id, lasam salvat.
                if (draft.id) {
                    resetDraft();
                }
            }} asChild>
                {buttonStyle}
            </DialogTrigger>

            <DialogContent className="sm:max-w-[56rem] max-h-[85vh] overflow-y-scroll">
                <form onSubmit={async (e) => {
                    e.preventDefault();
                    if (!draft.prenume?.trim() || !draft.nume?.trim()) {
                        toast.warning("Te rog completează Prenumele și Numele.");
                        return;
                    }
                    await onSubmitContact();
                }}>
                    <DialogHeader>
                        <div className="grid grid-cols-[auto_1fr] px-2 items-center gap-4">
                            <div className="flex gap-1 flex-col">
                                <DialogTitle>{title}</DialogTitle>
                                <DialogDescription>
                                    Completează sau modifică datele de contact.
                                </DialogDescription>
                            </div>

                            {/* Preview Avatar Header */}
                            <div className="flex justify-center">
                                <div className="h-20 w-20 rounded-md overflow-hidden border bg-background flex items-center justify-center relative">
                                    {draft?.logoPreview ? (
                                        <img
                                            src={draft.logoPreview}
                                            alt="Previzualizare"
                                            className="h-full w-full object-cover"
                                        />
                                    ) : (
                                        <div className="text-xs text-muted-foreground text-center px-2">
                                            Fără foto
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </DialogHeader>

                    {/* BODY */}
                    <div className="overflow-y-auto">
                        <div className="grid gap-8 px-2 py-2">
                            {/* 1. Informații de bază */}
                            <div className="grid gap-4">
                                <div className="text-lg font-semibold text-foreground">
                                    Informații de bază
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="prenume">Prenume <span className="text-destructive">*</span></Label>
                                        <Input
                                            id="prenume"
                                            value={draft.prenume}
                                            onChange={(e) => setField("prenume", e.target.value)}
                                            placeholder="Ex: Andrei"
                                        />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="nume">Nume <span className="text-destructive">*</span></Label>
                                        <Input
                                            id="nume"
                                            value={draft.nume}
                                            onChange={(e) => setField("nume", e.target.value)}
                                            placeholder="Ex: Popescu"
                                        />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="functie">Funcție</Label>
                                        <Input
                                            id="functie"
                                            value={draft.functie}
                                            onChange={(e) => setField("functie", e.target.value)}
                                            placeholder="Ex: Manager Proiect"
                                        />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="categorie_rol">Categorie rol</Label>
                                        <Input
                                            id="categorie_rol"
                                            value={draft.categorie_rol}
                                            onChange={(e) => setField("categorie_rol", e.target.value)}
                                            placeholder="Ex: Achiziții"
                                        />
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            {/* 2. Detalii contact */}
                            <div className="grid gap-4">
                                <div className="text-lg font-semibold text-foreground">
                                    Detalii contact
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="email">Email</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            value={draft.email}
                                            onChange={(e) => setField("email", e.target.value)}
                                            placeholder="email@companie.ro"
                                        />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="telefon">Telefon</Label>
                                        <Input
                                            id="telefon"
                                            value={draft.telefon}
                                            onChange={(e) => setField("telefon", e.target.value)}
                                            placeholder="+40..."
                                        />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="linkedin_url">LinkedIn</Label>
                                        <Input
                                            id="linkedin_url"
                                            value={draft.linkedin_url}
                                            onChange={(e) => setField("linkedin_url", e.target.value)}
                                            placeholder="https://linkedin.com/in/..."
                                        />
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            {/* 3. CRM & Preferințe */}
                            <div className="grid gap-4">
                                <div className="text-lg font-semibold text-foreground">
                                    CRM & preferințe
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 gap-y-6">
                                    <div className="grid gap-2">
                                        <Label>Putere decizie (1–5)</Label>
                                        <Input
                                            type="number"
                                            min={1}
                                            max={5}
                                            value={draft.putere_decizie}
                                            onChange={(e) => setField("putere_decizie", e.target.value)}
                                        />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label>Nivel influență (1–5)</Label>
                                        <Input
                                            type="number"
                                            min={1}
                                            max={5}
                                            value={draft.nivel_influenta}
                                            onChange={(e) => setField("nivel_influenta", e.target.value)}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Canal preferat</Label>
                                        <Select
                                            value={draft.canal_preferat}
                                            onValueChange={(v) => setField("canal_preferat", v)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Email">Email</SelectItem>
                                                <SelectItem value="Telefon">Telefon</SelectItem>
                                                <SelectItem value="LinkedIn">LinkedIn</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            {/* 4. Foto & Note */}
                            <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-6">

                                {/* Upload Foto */}
                                <div className="grid gap-4">
                                    <div className="grid gap-2">
                                        <Label>Foto (PNG/JPG)</Label>
                                        <div
                                            onDragEnter={(e) => { e.preventDefault(); setIsDragOver(true); }}
                                            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                                            onDragLeave={(e) => { e.preventDefault(); setIsDragOver(false); }}
                                            onDrop={onDropLogo}
                                            onClick={() => inputRef.current?.click()}
                                            className={[
                                                "h-24 rounded-lg border p-1 px-4 transition",
                                                "bg-transparent hover:bg-muted/40",
                                                "cursor-pointer select-none overflow-hidden flex items-center justify-center",
                                                isDragOver ? "border-primary border-dashed ring-2 ring-primary/30" : "border-input",
                                            ].join(" ")}
                                        >
                                            <input
                                                ref={inputRef}
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={onLogoInputChange}
                                                onClick={(e) => { e.currentTarget.value = null; }}
                                            />

                                            <div className="flex items-center gap-4 w-full">
                                                <div className="flex-1 min-w-0 overflow-hidden">
                                                    <div className="text-sm text-muted-foreground font-medium truncate">
                                                        {draft.logoFile
                                                            ? draft.logoFile.name
                                                            : (draft.logoPreview ? "Modifică poza..." : "Trage poza aici...")}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 shrink-0">
                                                    {(draft.logoFile || draft.logoPreview) && (
                                                        <Button
                                                            type="button"
                                                            variant="destructive"
                                                            size="sm"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                clearLogo();
                                                            }}
                                                        >
                                                            Șterge
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Note */}
                                <div className="grid gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="note">Notițe</Label>
                                        <Textarea
                                            id="note"
                                            value={draft.note}
                                            onChange={(e) => setField("note", e.target.value)}
                                            placeholder="Observații..."
                                            className="resize-none h-24"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="gap-2 mt-4">
                        <div className="flex w-full justify-between items-center">
                            {reset ? (
                                <Button
                                    variant="outline"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        resetDraft();
                                    }}
                                >
                                    <FontAwesomeIcon icon={faUndo} className="mr-2" />
                                    <span>Resetează</span>
                                </Button>
                            ) : <div />}

                            <div className="flex gap-2">
                                <DialogClose asChild>
                                    <Button variant="outline">Anulează</Button>
                                </DialogClose>
                                <Button type="submit">Salvează</Button>
                            </div>
                        </div>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}