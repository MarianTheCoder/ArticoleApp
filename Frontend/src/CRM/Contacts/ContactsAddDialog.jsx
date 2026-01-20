import React, { useContext, useRef, useState } from "react";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUndo } from "@fortawesome/free-solid-svg-icons";

import { Button } from "@/components/ui/button";
import { useLoading } from "@/context/LoadingContext";
import { toast } from "sonner";


export default function ContactsAddDialog({
    // deschide (opțional – dacă nu e dat, componenta se controlează intern)
    open,
    setOpen,
    // funcție custom la submit (opțional)
    onSubmitContact,
    // draft extern (opțional)
    draft,
    resetDraft,
    setDraft,
    // buton complet ca și props
    buttonStyle = (<div className="hidden" />),
    //
    reset = false,
    title = "Adaugă un contact",
}) {

    const [isDragOver, setIsDragOver] = useState(false);
    const inputRef = useRef(null);

    const setField = (key, value) => {
        setDraft((prev) => ({ ...prev, [key]: value }));
    };

    const acceptLogo = (file) => {
        if (!file) return;
        if (!file.type?.startsWith("image/")) return;

        setDraft((prev) => {
            if (prev.logoPreview) URL.revokeObjectURL(prev.logoPreview);

            const url = URL.createObjectURL(file);
            return { ...prev, logoFile: file, logoPreview: url };
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
            if (prev.logoPreview) URL.revokeObjectURL(prev.logoPreview);
            return { ...prev, logoFile: null, logoPreview: "" };
        });
        if (inputRef.current) inputRef.current.value = "";
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>

            <DialogTrigger asChild>
                {buttonStyle}
            </DialogTrigger>

            <DialogContent className="sm:max-w-[56rem] max-h-[85vh] overflow-y-scroll">
                <form onSubmit={async (e) => {
                    e.preventDefault();
                    if (draft.prenume.trim() === "" || draft.nume.trim() === "") {
                        toast.warning("Te rog completează toate câmpurile obligatorii marcate cu *.");
                        return;
                    }
                    await onSubmitContact();
                }}>
                    <DialogHeader>
                        <div className="grid grid-cols-[auto_1fr] px-2 items-center gap-4">
                            <div className="flex gap-1 flex-col">
                                <DialogTitle>{title}</DialogTitle>
                                <DialogDescription>
                                    Completează datele de contact pentru companie.
                                </DialogDescription>
                            </div>

                            <div className="flex justify-center">
                                <div className="h-20 w-20 rounded-md overflow-hidden border bg-background flex items-center justify-center">
                                    {draft?.logoPreview ? (
                                        <img
                                            src={draft.logoPreview}
                                            alt="Previzualizare contact"
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

                    {/* BODY scrollabil */}
                    <div className="overflow-y-auto">
                        <div className="grid gap-8 px-2 py-2">
                            {/* Informații de bază */}
                            <div className="grid gap-4">
                                <div className="text-lg font-semibold text-foreground">
                                    Informații de bază
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="prenume">
                                            Prenume <span className="text-destructive">*</span>
                                        </Label>
                                        <Input
                                            id="prenume"
                                            name="prenume"
                                            value={draft.prenume}
                                            onChange={(e) => setField("prenume", e.target.value)}
                                            placeholder="Andrei"
                                        />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="nume">
                                            Nume <span className="text-destructive">*</span>
                                        </Label>
                                        <Input
                                            id="nume"
                                            name="nume"
                                            value={draft.nume}
                                            onChange={(e) => setField("nume", e.target.value)}
                                            placeholder="Popescu"
                                        />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="functie">
                                            Funcție
                                        </Label>
                                        <Input
                                            id="functie"
                                            name="functie"
                                            value={draft.functie}
                                            onChange={(e) => setField("functie", e.target.value)}
                                            placeholder="Manager Proiect"
                                        />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="categorie_rol">
                                            Categorie rol
                                        </Label>
                                        <Input
                                            id="categorie_rol"
                                            name="categorie_rol"
                                            value={draft.categorie_rol}
                                            onChange={(e) => setField("categorie_rol", e.target.value)}
                                            placeholder="Achiziții / Execuție / Direcțiune / QHSE"
                                        />
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            {/* Detalii contact */}
                            <div className="grid gap-4">
                                <div className="text-lg font-semibold text-foreground">
                                    Detalii contact
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="email">Email</Label>
                                        <Input
                                            id="email"
                                            name="email"
                                            type="email"
                                            value={draft.email}
                                            onChange={(e) => setField("email", e.target.value)}
                                            placeholder="andrei.popescu@companie.ro"
                                        />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="telefon">Telefon</Label>
                                        <Input
                                            id="telefon"
                                            name="telefon"
                                            value={draft.telefon}
                                            onChange={(e) => setField("telefon", e.target.value)}
                                            placeholder="+40 712 345 678"
                                        />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="linkedin_url">LinkedIn</Label>
                                        <Input
                                            id="linkedin_url"
                                            name="linkedin_url"
                                            value={draft.linkedin_url}
                                            onChange={(e) => setField("linkedin_url", e.target.value)}
                                            placeholder="https://www.linkedin.com/in/andrei"
                                        />
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            {/* CRM & preferințe */}
                            <div className="grid gap-4">
                                <div className="text-lg font-semibold text-foreground">
                                    CRM & preferințe
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 gap-y-6">
                                    <div className="grid gap-2">
                                        <Label htmlFor="putere_decizie">Putere decizie (1–5)</Label>
                                        <Input
                                            id="putere_decizie"
                                            name="putere_decizie"
                                            type="number"
                                            min={1}
                                            max={5}
                                            value={draft.putere_decizie}
                                            onChange={(e) => {
                                                let v = Number(e.target.value || 1);
                                                if (v < 1) v = 1;
                                                if (v > 5) v = 5;
                                                setField("putere_decizie", v);
                                            }}
                                        />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="nivel_influenta">Nivel influență (1–5)</Label>
                                        <Input
                                            id="nivel_influenta"
                                            name="nivel_influenta"
                                            type="number"
                                            min={1}
                                            max={5}
                                            value={draft.nivel_influenta}
                                            onChange={(e) => {
                                                let v = Number(e.target.value || 1);
                                                if (v < 1) v = 1;
                                                if (v > 5) v = 5;
                                                setField("nivel_influenta", v);
                                            }}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="canal_preferat">Canal preferat</Label>
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

                            {/* --- COMBINED ROW: Photo & Notes --- */}
                            <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-6">

                                {/* 1. Foto / avatar */}
                                <div className="grid gap-4">

                                    <div className="grid gap-2">
                                        <Label>Foto (PNG/JPG)</Label>
                                        <div
                                            onDragEnter={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setIsDragOver(true);
                                            }}
                                            onDragOver={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setIsDragOver(true);
                                            }}
                                            onDragLeave={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setIsDragOver(false);
                                            }}
                                            onDrop={onDropLogo}
                                            className={[
                                                "h-24 rounded-lg border p-1 px-4 transition",
                                                "bg-transparent hover:bg-muted/40",
                                                "cursor-pointer select-none overflow-hidden flex items-center justify-center",
                                                isDragOver
                                                    ? "border-primary border-dashed ring-2 ring-primary/30"
                                                    : "border-input",
                                            ].join(" ")}
                                            onClick={() => inputRef.current?.click()}
                                            role="button"
                                            tabIndex={0}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter" || e.key === " ") {
                                                    e.preventDefault();
                                                    inputRef.current?.click();
                                                }
                                            }}
                                        >
                                            <input
                                                ref={inputRef}
                                                name="logo_url"
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
                                                            : "Trage poza aici sau apasă..."}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 shrink-0">
                                                    {draft.logoFile && (
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

                                {/* 2. Note interne */}
                                <div className="grid gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="note">Notițe</Label>
                                        <Textarea
                                            id="note"
                                            name="note"
                                            value={draft.note}
                                            onChange={(e) => setField("note", e.target.value)}
                                            placeholder="Observații, istoricul relației..."
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
                                    <span>Resetează formular</span>
                                </Button>
                            ) : (
                                <div />
                            )}
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