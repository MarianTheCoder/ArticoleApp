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
import { Input } from "@/components/ui/input";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUndo, faImage, faXmark } from "@fortawesome/free-solid-svg-icons";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import photoAPI from "@/api/photoAPI";

export default function CompaniiInterneAddDialog({
    open,
    setOpen,
    onSubmit,
    draft,
    setDraft,
    resetDraft,
    buttonStyle = (<div className="hidden" />),
    reset = false,
    title = "Adaugă o companie internă",
}) {
    const [isDragOver, setIsDragOver] = useState(false);
    const fileInputRef = useRef(null);

    const setField = (key, value) => {
        setDraft((prev) => ({ ...prev, [key]: value }));
    };

    const acceptLogo = (file) => {
        if (!file) return;
        if (!file.type?.startsWith("image/")) {
            toast.error("Te rugăm să încarci o imagine validă pentru logo.");
            return;
        }
        setDraft((prev) => {
            if (prev.logo_preview && prev.logo_preview.startsWith('blob:')) {
                URL.revokeObjectURL(prev.logo_preview);
            }
            return {
                ...prev,
                logo_file: file,
                logo_preview: URL.createObjectURL(file),
                delete_logo: false,
            };
        });
    };

    const onFileInputChange = (e) => {
        const file = e.target.files?.[0];
        acceptLogo(file);
    };

    const onDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
        acceptLogo(e.dataTransfer.files?.[0]);
    };

    const clearLogo = () => {
        setDraft((prev) => {
            if (prev.logo_preview && prev.logo_preview.startsWith('blob:')) {
                URL.revokeObjectURL(prev.logo_preview);
            }
            return {
                ...prev,
                logo_file: null,
                logo_preview: null,
                delete_logo: true,
            };
        });
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!draft.nume?.trim()) {
            toast.warning("Numele companiei este obligatoriu.");
            return;
        }
        await onSubmit();
    };

    // Show new preview first, then existing DB url (only if not deleted)
    const displayLogo = draft.logo_preview
        || (!draft.delete_logo && draft.logo_url ? `${photoAPI}/${draft.logo_url}` : null);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger onClick={() => { if (draft.id) resetDraft(); }} asChild>
                {buttonStyle}
            </DialogTrigger>

            <DialogContent className="sm:max-w-[36rem]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader className="mb-6">
                        <DialogTitle>{title}</DialogTitle>
                        <DialogDescription>
                            Completează detaliile companiei tale interne.
                        </DialogDescription>
                    </DialogHeader>

                    {/* LOGO LEFT + FIELDS RIGHT */}
                    <div className="flex flex-col items-center gap-5">

                        {/* Drag & Drop Logo */}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={onFileInputChange}
                            onClick={(e) => { e.currentTarget.value = null; }}
                        />
                        <div
                            onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true); }}
                            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true); }}
                            onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(false); }}
                            onDrop={onDrop}
                            onClick={() => fileInputRef.current?.click()}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileInputRef.current?.click(); } }}
                            className={[
                                "relative w-2/3 h-24 shrink-0 rounded-xl border-2 border-dashed transition cursor-pointer flex flex-col items-center justify-center gap-1.5 select-none overflow-hidden hover:bg-muted/40",
                                isDragOver ? "border-primary ring-2 ring-primary/30 bg-muted/40" : "border-input"
                            ].join(" ")}
                        >
                            {displayLogo ? (
                                <>
                                    <img
                                        src={displayLogo}
                                        alt="Logo"
                                        className="absolute inset-0 w-full h-full object-contain"
                                    />
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); clearLogo(); }}
                                        className="absolute top-1 right-1 z-10 bg-black/60 hover:bg-black/80 text-white rounded-full w-6 h-6 flex items-center justify-center transition"
                                    >
                                        <FontAwesomeIcon icon={faXmark} className="text-xs" />
                                    </button>
                                </>
                            ) : (
                                <>
                                    <FontAwesomeIcon icon={faImage} className="text-2xl text-muted-foreground" />
                                    <span className="text-[11px] text-muted-foreground text-center leading-tight px-2">Logo</span>
                                </>
                            )}
                        </div>

                        {/* Name + Color */}
                        <div className="flex flex-col w-3/4 gap-3 flex-1">
                            <div className="grid gap-1.5">
                                <Label htmlFor="nume">
                                    Nume Companie <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="nume"
                                    value={draft.nume}
                                    onChange={(e) => setField("nume", e.target.value)}
                                    placeholder="Ex: Compania Mea SRL"
                                />
                            </div>

                            <div className="grid gap-1.5">
                                <Label htmlFor="culoare">Culoare Brand</Label>
                                <div className="flex gap-2 items-center">
                                    <Input
                                        id="culoare"
                                        type="color"
                                        className="w-10 h-10 p-1 cursor-pointer shrink-0"
                                        value={draft.culoare_hex || "#3b82f6"}
                                        onChange={(e) => setField("culoare_hex", e.target.value)}
                                    />
                                    <Input
                                        value={draft.culoare_hex || "#3b82f6"}
                                        onChange={(e) => setField("culoare_hex", e.target.value)}
                                        placeholder="#3b82f6"
                                        className="uppercase font-mono"
                                    />
                                </div>
                            </div>
                        </div>

                    </div>

                    <DialogFooter className="gap-2 mt-8">
                        <div className="flex w-full justify-between items-center">
                            {reset ? (
                                <Button
                                    variant="outline"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        resetDraft();
                                        if (fileInputRef.current) fileInputRef.current.value = "";
                                    }}
                                >
                                    <FontAwesomeIcon icon={faUndo} className="mr-2" />
                                    Resetează
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