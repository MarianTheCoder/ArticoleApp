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

import { Input } from "../../components/ui/input";
import { Separator } from "../../components/ui/separator";
import { Switch } from "../../components/ui/switch";
import { Textarea } from "../../components/ui/textarea";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faUndo } from "@fortawesome/free-solid-svg-icons";

import { Button } from "../../components/ui/button";
import { useLoading } from "@/context/LoadingContext";
import { toast } from "sonner";
import { AuthContext } from "@/context/TokenContext";

export default function CompaniesAddDialog({
    //deschide
    open,
    setOpen,
    // functie la submit
    onSubmitCompany,
    // draft si setDraft din CompaniesAddPage
    draft,
    resetDraft,
    setDraft,
    // buton complet ca si props
    buttonStyle = (<div className="hidden"></div>),
    //
    reset = false,
    title = "Adaugă o companie"
}) {
    const [isDragOver, setIsDragOver] = useState(false);
    const inputRef = useRef(null);

    const setField = (key, value) => {
        setDraft((prev) => ({ ...prev, [key]: value }));
    };

    const acceptLogo = (file) => {
        if (!file) return;
        if (!file.type?.startsWith("image/")) return;

        // revoke vechiul preview înainte să setăm unul nou
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

            <DialogContent className="sm:max-w-[64rem] max-h-[85vh] overflow-y-scroll">
                <form onSubmit={async (e) => {
                    e.preventDefault();
                    if (draft.nume_companie.trim() === "") {
                        toast.warning("Numele companiei este obligatoriu.");
                        return;
                    }
                    await onSubmitCompany();
                }}>
                    <DialogHeader>
                        <div className="grid grid-cols-[auto_1fr] px-2 items-center gap-4">
                            <div className="flex gap-1 flex-col">
                                <DialogTitle>{title}</DialogTitle>
                                <DialogDescription>
                                    Completează datele pentru a salva datele.
                                </DialogDescription>
                            </div>

                            <div className="flex justify-center">
                                <div className="h-20 w-20 rounded-md overflow-hidden border bg-background flex items-center justify-center">
                                    {draft.logoPreview ? (
                                        <img
                                            src={draft.logoPreview}
                                            alt="Previzualizare logo"
                                            className="h-full w-full object-cover"
                                        />
                                    ) : (
                                        <div className="text-xs text-muted-foreground text-center px-2">
                                            Fără logo
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </DialogHeader>

                    {/* BODY scrollabil */}
                    <div className="overflow-y-auto">
                        <div className="grid gap-8 px-2 py-2">
                            {/* Informații generale */}
                            <div className="grid gap-4">
                                <div className="text-lg font-semibold text-foreground">
                                    Informații generale
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="nume_companie">
                                            Nume companie <span className="text-destructive">*</span>
                                        </Label>
                                        <Input
                                            id="nume_companie"
                                            name="nume_companie"
                                            value={draft.nume_companie}
                                            onChange={(e) => setField("nume_companie", e.target.value)}
                                            placeholder="Ex: EIFFAGE Construction"
                                        />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label>Logo (PNG/JPG)</Label>

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
                                                "rounded-lg border p-1 px-4 transition",
                                                "bg-transparent hover:bg-muted/40",
                                                "cursor-pointer select-none overflow-hidden",
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
                                                onClick={(e) => {
                                                    // permite selectarea aceluiași fișier din nou
                                                    e.currentTarget.value = null;
                                                }}
                                            />

                                            <div className="flex items-center gap-4">
                                                {/* Text fișier: 1 linie + ellipsis, fără să întindă containerul */}
                                                <div className="flex-1 min-w-0 overflow-hidden">
                                                    <div className="text-sm text-muted-foreground font-medium truncate">
                                                        {draft.logoFile
                                                            ? draft.logoFile.name
                                                            : "Trage logo-ul aici sau apasă pentru a selecta"}
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

                                                    <Button
                                                        type="button"
                                                        variant="secondary"
                                                        size="sm"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            inputRef.current?.click();
                                                        }}
                                                    >
                                                        Încarcă
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="grup_companie">Grup companie</Label>
                                        <Input
                                            id="grup_companie"
                                            name="grup_companie"
                                            value={draft.grup_companie}
                                            onChange={(e) => setField("grup_companie", e.target.value)}
                                            placeholder="Ex: EIFFAGE"
                                        />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="domeniu_unitate_afaceri">
                                            Domeniu / unitate de afaceri
                                        </Label>
                                        <Input
                                            id="domeniu_unitate_afaceri"
                                            name="domeniu_unitate_afaceri"
                                            value={draft.domeniu_unitate_afaceri}
                                            onChange={(e) => setField("domeniu_unitate_afaceri", e.target.value)}
                                            placeholder="Ex: Construcții / Energie / Mentenanță"
                                        />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="forma_juridica">Formă juridică</Label>
                                        <Input
                                            id="forma_juridica"
                                            name="forma_juridica"
                                            value={draft.forma_juridica}
                                            onChange={(e) => setField("forma_juridica", e.target.value)}
                                            placeholder="Ex: SA / SAS / SRL"
                                        />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="website">Website</Label>
                                        <Input
                                            id="website"
                                            name="website"
                                            value={draft.website}
                                            onChange={(e) => setField("website", e.target.value)}
                                            placeholder="Ex: https://companie.ro"
                                        />
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            {/* Adresă */}
                            <div className="grid gap-4">
                                <div className="text-lg font-semibold text-foreground">Adresă</div>

                                <div className="grid grid-cols-1 md:grid-cols-[auto_1fr_1fr] gap-4">
                                    <div className="grid gap-2">
                                        <Label>Țară</Label>
                                        <Select
                                            value={draft.tara}
                                            onValueChange={(v) => setField("tara", v)}
                                        >
                                            <SelectTrigger className="w-24">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="FR">FR</SelectItem>
                                                <SelectItem value="RO">RO</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="regiune">Regiune</Label>
                                        <Input
                                            id="regiune"
                                            name="regiune"
                                            value={draft.regiune}
                                            onChange={(e) => setField("regiune", e.target.value)}
                                            placeholder="Ex: Pays de la Loire"
                                        />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="oras">Oraș</Label>
                                        <Input
                                            id="oras"
                                            name="oras"
                                            value={draft.oras}
                                            onChange={(e) => setField("oras", e.target.value)}
                                            placeholder="Ex: Nantes"
                                        />
                                    </div>

                                    <div className="grid gap-2 md:col-span-2">
                                        <Label htmlFor="adresa">Adresă</Label>
                                        <Input
                                            id="adresa"
                                            name="adresa"
                                            value={draft.adresa}
                                            onChange={(e) => setField("adresa", e.target.value)}
                                            placeholder="Ex: Strada, număr, bloc, etc."
                                        />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="cod_postal">Cod poștal</Label>
                                        <Input
                                            id="cod_postal"
                                            name="cod_postal"
                                            value={draft.cod_postal}
                                            onChange={(e) => setField("cod_postal", e.target.value)}
                                            placeholder="Ex: 44000"
                                        />
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            {/* CRM */}
                            <div className="grid gap-4">
                                <div className="text-lg font-semibold text-foreground">CRM</div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 gap-y-6">
                                    <div className="grid gap-2">
                                        <Label htmlFor="nivel_strategic">Nivel strategic</Label>
                                        <Input
                                            id="nivel_strategic"
                                            name="nivel_strategic"
                                            value={draft.nivel_strategic}
                                            onChange={(e) => setField("nivel_strategic", e.target.value)}
                                            placeholder="Ex: Țintă"
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Exemple: Nucleu / Țintă / Oportunist
                                        </p>
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="status_relatie">Status relație</Label>
                                        <Input
                                            id="status_relatie"
                                            name="status_relatie"
                                            value={draft.status_relatie}
                                            onChange={(e) => setField("status_relatie", e.target.value)}
                                            placeholder="Ex: Prospect"
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Exemple: Prospect / Activ / Inactiv
                                        </p>
                                    </div>

                                    <div className="grid grid-rows-[auto_1fr] gap-2">
                                        <Label htmlFor="nivel_risc">Nivel risc</Label>
                                        <Select
                                            value={draft.nivel_risc}
                                            onValueChange={(v) => setField("nivel_risc", v)}
                                        >
                                            <SelectTrigger className="">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Scăzut"><span className="text-low">Scăzut</span></SelectItem>
                                                <SelectItem value="Mediu"><span className="text-medium">Mediu</span></SelectItem>
                                                <SelectItem value="Ridicat"><span className="text-high">Ridicat</span></SelectItem>
                                            </SelectContent>
                                        </Select>

                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="scor_conformitate">Scor conformitate (0–100)</Label>
                                        <Input
                                            id="scor_conformitate"
                                            name="scor_conformitate"
                                            type="number"
                                            min={0}
                                            max={100}
                                            value={draft.scor_conformitate}
                                            onChange={(e) => {
                                                if (e.target.value < 0) e.target.value = 0;
                                                if (e.target.value > 100) return;
                                                setField("scor_conformitate", Number(e.target.value || 0))
                                            }}
                                        />
                                    </div>

                                    <div className="flex items-center justify-between rounded-lg border p-3 md:col-span-1">
                                        <div className="grid">
                                            <Label htmlFor="nda_semnat" className="cursor-pointer">
                                                NDA semnat
                                            </Label>
                                            <p className="text-xs text-muted-foreground">
                                                Bifează dacă NDA este semnat.
                                            </p>
                                        </div>
                                        <Switch
                                            id="nda_semnat"
                                            checked={draft.nda_semnat}
                                            onCheckedChange={(v) => setField("nda_semnat", v)}
                                        />
                                    </div>

                                    <div className="grid gap-2 md:col-span-3">
                                        <Label htmlFor="note">Notițe</Label>
                                        <Textarea
                                            id="note"
                                            name="note"
                                            value={draft.note}
                                            onChange={(e) => setField("note", e.target.value)}
                                            placeholder="Ex: Observații interne, particularități, persoane cheie..."
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
                            ) :
                                <div></div>
                            }
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