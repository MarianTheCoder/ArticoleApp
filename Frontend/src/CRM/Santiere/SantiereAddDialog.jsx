import React, { useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUndo, faMapLocationDot } from "@fortawesome/free-solid-svg-icons";

import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useFilialeSelect } from "@/hooks/useFiliale";
import { useCompaniesSelect } from "@/hooks/useCompanies";

export default function SantiereAddDialog({
    open,
    companyId, // If provided, the dialog is locked to this company
    setOpen,
    onSubmit,
    draft,
    resetDraft,
    setDraft,
    buttonStyle = (<div className="hidden" />),
    reset = false,
    title = "Adaugă un șantier",
}) {
    // 1. Determine which company is currently "active" (Prop OR Draft selection)
    const currentCompanyId = companyId || draft.companie_id;

    // 2. Fetch Filiale based on the CURRENT active company
    const { data: filialeList = [], isLoading: loadingFiliale } = useFilialeSelect(currentCompanyId);

    // 3. Fetch Companies (only needed if companyId prop is missing)
    const { data: companiiList = [], isLoading: loadingCompanii } = useCompaniesSelect();

    const setField = (key, value) => {
        setDraft((prev) => ({ ...prev, [key]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!currentCompanyId) {
            toast.warning("Selectează o companie.");
            return;
        }
        if (!draft.nume?.trim()) {
            toast.warning("Numele șantierului este obligatoriu.");
            return;
        }
        await onSubmit();
    };
    const isCompanyDisabled = !!draft.id;

    return (
        <Dialog open={open} onOpenChange={setOpen}>

            <DialogTrigger onClick={() => {
                if (draft.id) resetDraft();
            }} asChild>
                {buttonStyle}
            </DialogTrigger>

            <DialogContent className="sm:max-w-[50rem] max-h-[90vh] overflow-y-auto">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <div className="flex flex-col gap-1 mb-4">
                            <DialogTitle>{title}</DialogTitle>
                            <DialogDescription>
                                Completează detaliile proiectului sau șantierului.
                            </DialogDescription>
                        </div>
                    </DialogHeader>

                    {/* BODY */}
                    <div className="grid gap-6 py-2">

                        {/* 1. Identificare Proiect */}
                        <div className="grid gap-4">
                            <div className="text-lg font-semibold text-foreground flex items-center gap-2">
                                Identificare Proiect
                            </div>

                            {/* --- COMPANY SELECTION (Only if not fixed by props) --- */}
                            {!companyId && (
                                <div className="grid gap-2">
                                    <Label>Companie <span className="text-destructive">*</span></Label>
                                    <Select
                                        disabled={isCompanyDisabled}
                                        value={draft.companie_id ? String(draft.companie_id) : ""}
                                        onValueChange={(val) => {
                                            setField("companie_id", val);
                                            setField("filiala_id", null); // Reset branch when company changes
                                        }}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={loadingCompanii ? "Se încarcă..." : "Selectează compania"} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {companiiList.map((comp) => (
                                                <SelectItem key={comp.id} value={String(comp.id)}>
                                                    {comp.nume_companie}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-4">
                                {/* Nume */}
                                <div className="grid gap-2">
                                    <Label htmlFor="nume">Nume Șantier <span className="text-destructive">*</span></Label>
                                    <Input
                                        id="nume"
                                        value={draft.nume}
                                        onChange={(e) => setField("nume", e.target.value)}
                                        placeholder="Ex: Ansamblul Rezidențial Nord"
                                    />
                                </div>

                                {/* Filiala (DEPENDS ON COMPANY) */}
                                <div className="grid gap-2">
                                    <Label>Filiala</Label>
                                    <Select
                                        // Disable if no company is selected yet
                                        disabled={!currentCompanyId || loadingFiliale}
                                        value={draft.filiala_id ? String(draft.filiala_id) : "0"}
                                        onValueChange={(v) => setField("filiala_id", v === "0" ? null : v)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={
                                                !currentCompanyId
                                                    ? "Selectează întâi compania"
                                                    : "Selectează filiala"
                                            } />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="0">- Fără filială -</SelectItem>

                                            {filialeList.map((item) => (
                                                <SelectItem key={item.id} value={String(item.id)}>
                                                    {item.nume_filiala}
                                                </SelectItem>
                                            ))}

                                            {filialeList.length === 0 && (
                                                <div className="p-2 text-sm text-muted-foreground text-center">
                                                    Nu există filiale pentru această companie.
                                                </div>
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Culoare & Status */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                                <div className="grid gap-2">
                                    <Label htmlFor="culoare">Culoare Identificare</Label>
                                    <div className="flex gap-2 items-center">
                                        <Input
                                            id="culoare"
                                            type="color"
                                            value={draft.culoare_hex}
                                            onChange={(e) => setField("culoare_hex", e.target.value)}
                                            className="w-16 h-10 p-1 cursor-pointer"
                                        />
                                        <span className="text-sm text-muted-foreground uppercase">{draft.culoare_hex}</span>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between border p-2 px-4 rounded-md h-10 bg-muted/20">
                                    <Label htmlFor="active-mode" className="cursor-pointer text-sm font-medium">
                                        Status Șantier (Activ)
                                    </Label>
                                    <Switch
                                        id="active-mode"
                                        checked={draft.activ}
                                        onCheckedChange={(val) => setField("activ", val)}
                                    />
                                </div>
                            </div>
                        </div>

                        <Separator />

                        {/* 2. Locație & GPS */}
                        <div className="grid gap-4">
                            <div className="text-lg font-semibold text-foreground flex items-center gap-2">
                                <FontAwesomeIcon icon={faMapLocationDot} className="text-muted-foreground text-sm" />
                                Locație
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="adresa">Adresa completă</Label>
                                <Input
                                    id="adresa"
                                    value={draft.adresa}
                                    onChange={(e) => setField("adresa", e.target.value)}
                                    placeholder="Strada, Număr, Oraș, Județ..."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="latitudine">Latitudine</Label>
                                    <Input
                                        id="latitudine"
                                        type="number"
                                        step="any"
                                        value={draft.latitudine}
                                        onChange={(e) => setField("latitudine", e.target.value)}
                                        placeholder="ex: 44.4268"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="longitudine">Longitudine</Label>
                                    <Input
                                        id="longitudine"
                                        type="number"
                                        step="any"
                                        value={draft.longitudine}
                                        onChange={(e) => setField("longitudine", e.target.value)}
                                        placeholder="ex: 26.1025"
                                    />
                                </div>
                            </div>
                        </div>

                        <Separator />

                        {/* 3. Perioadă & Detalii */}
                        <div className="grid gap-4">
                            <div className="text-lg font-semibold text-foreground">
                                Detalii & Planificare
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="data_inceput">Data Început</Label>
                                    <Input
                                        id="data_inceput"
                                        type="date"
                                        value={draft.data_inceput}
                                        onChange={(e) => setField("data_inceput", e.target.value)}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="data_sfarsit">Data Sfârșit (Estimată)</Label>
                                    <Input
                                        id="data_sfarsit"
                                        type="date"
                                        value={draft.data_sfarsit}
                                        onChange={(e) => setField("data_sfarsit", e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="notita">Notițe interne</Label>
                                <Textarea
                                    id="notita"
                                    value={draft.notita}
                                    onChange={(e) => setField("notita", e.target.value)}
                                    placeholder="Detalii suplimentare, cod acces, persoane contact șantier..."
                                    className="resize-none h-24"
                                />
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