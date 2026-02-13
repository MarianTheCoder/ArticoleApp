import React from "react";
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUndo, faBuilding, faMapLocationDot, faPhone, faEnvelope } from "@fortawesome/free-solid-svg-icons";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useCompaniesSelect } from "@/hooks/useCompanies";

export default function FilialeAddDialog({
    companyId,
    open,
    setOpen,
    onSubmit,
    draft,
    setDraft,
    resetDraft,
    buttonStyle = (<div className="hidden" />),
    reset = false,
    title = "Adaugă o filială",
}) {

    const { data: companiiList = [], isLoading: loadingCompanii } = useCompaniesSelect();

    const setField = (key, value) => {
        setDraft((prev) => ({ ...prev, [key]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // VALIDATION: Company is required
        // If no companyId prop is passed, we must rely on the selected draft.companie_id
        if (!companyId && !draft.companie_id) {
            toast.warning("Selectează o companie pentru această filială.");
            return;
        }

        if (!draft.nume_filiala?.trim()) {
            toast.warning("Numele filialei este obligatoriu.");
            return;
        }
        if (!draft.telefon?.trim()) {
            toast.warning("Telefonul este obligatoriu.");
            return;
        }
        if (!draft.email?.trim()) {
            toast.warning("Email-ul este obligatoriu.");
            return;
        }
        await onSubmit();
    };

    // Determine the value for the Select
    // 1. If companyId prop exists, use that.
    // 2. If editing (draft.id exists), use draft.companie_id.
    // 3. Otherwise use the user selection in draft.companie_id.
    const currentCompanyId = companyId
        ? String(companyId)
        : (draft.companie_id ? String(draft.companie_id) : "");
    // Disable if editing an existing record
    const isCompanyDisabled = !!draft.id;

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger onClick={() => {
                if (draft.id) {
                    resetDraft();
                }
            }} asChild>
                {buttonStyle}
            </DialogTrigger>

            <DialogContent className="sm:max-w-[50rem] max-h-[90vh] overflow-y-auto">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <div className="flex flex-col gap-1 mb-4">
                            <DialogTitle>{title}</DialogTitle>
                            <DialogDescription>
                                Completează detaliile filialei sau direcției regionale.
                            </DialogDescription>
                        </div>
                    </DialogHeader>

                    {/* BODY */}
                    <div className="grid gap-6 py-2">

                        {/* 1. Identificare */}
                        <div className="grid gap-4">
                            <div className="text-lg font-semibold text-foreground flex items-center gap-2">
                                Identificare
                            </div>

                            {/* COMPANY DROPDOWN - Only if companyId prop is null */}
                            {!companyId && (
                                <div className="grid gap-2">
                                    <Label>Companie <span className="text-destructive">*</span></Label>
                                    <Select
                                        disabled={isCompanyDisabled}
                                        value={currentCompanyId}
                                        onValueChange={(val) => setField("companie_id", val)}
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

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="nume">Nume Filială <span className="text-destructive">*</span></Label>
                                    <Input
                                        id="nume"
                                        value={draft.nume_filiala}
                                        onChange={(e) => setField("nume_filiala", e.target.value)}
                                        placeholder="Ex: Filiala Nord-Est"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="tip_unitate">Tip unitate</Label>
                                    <Input
                                        id="tip_unitate"
                                        value={draft.tip_unitate}
                                        onChange={(e) => setField("tip_unitate", e.target.value)}
                                        placeholder="Ex: Filială, Direcție Regională..."
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label className="">
                                        Telefon <span className="text-destructive">*</span>
                                    </Label>
                                    <Input
                                        value={draft.telefon}
                                        onChange={(e) => setField("telefon", e.target.value)}
                                        placeholder="Ex: 07xx..."
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label className="">
                                        Email <span className="text-destructive">*</span>
                                    </Label>
                                    <Input
                                        value={draft.email}
                                        onChange={(e) => setField("email", e.target.value)}
                                        placeholder="contact@filiala.ro"
                                    />
                                </div>
                            </div>

                            <div className="grid gap-2">
                                <Label>Nivel Decizie</Label>
                                <Select
                                    value={draft.nivel_decizie}
                                    onValueChange={(v) => setField("nivel_decizie", v)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selectează nivel" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Local">Local</SelectItem>
                                        <SelectItem value="Regional">Regional</SelectItem>
                                        <SelectItem value="National">Național</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <Separator />

                        {/* 2. Locație & Contact */}
                        <div className="grid gap-4">
                            <div className="text-lg font-semibold text-foreground flex items-center gap-2">
                                Locație & Contact
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="grid gap-2">
                                    <Label>Țară</Label>
                                    <Input
                                        id="tara"
                                        value={draft.tara}
                                        onChange={(e) => setField("tara", e.target.value)}
                                        placeholder="Ex: România"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Regiune</Label>
                                    <Input
                                        value={draft.regiune}
                                        onChange={(e) => setField("regiune", e.target.value)}
                                        placeholder="Ex: Moldova"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Oraș</Label>
                                    <Input
                                        value={draft.oras}
                                        onChange={(e) => setField("oras", e.target.value)}
                                        placeholder="Ex: Iași"
                                    />
                                </div>
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

                        {/* 3. Note */}
                        <div className="grid gap-4">
                            <div className="text-lg font-semibold text-foreground">
                                Detalii Suplimentare
                            </div>
                            <div className="grid gap-2">
                                <Label>Notițe interne</Label>
                                <Textarea
                                    value={draft.note}
                                    onChange={(e) => setField("note", e.target.value)}
                                    placeholder="Alte detalii, observații manageriale..."
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