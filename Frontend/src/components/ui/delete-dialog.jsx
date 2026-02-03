import React, { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogClose
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTriangleExclamation, faTrashCan } from "@fortawesome/free-solid-svg-icons";
import { toast } from "sonner";

export default function DeleteDialog({
    open,
    setOpen,
    title,
    description,
    onSubmit,
    onCancel,
    useCode = false,
}) {
    const [inputValue, setInputValue] = useState("");

    useEffect(() => {
        if (!open) {
            setInputValue("");
        }
    }, [open]);

    const handleConfirm = async () => {
        if (useCode && !inputValue.trim()) {
            toast.warning("Te rog introdu codul de confirmare pentru a putea continua.");
            return;
        }
        await onSubmit(useCode ? inputValue : null);
    };

    const handleCancel = () => {
        if (onCancel) onCancel();
        setOpen(false);
    };

    return (
        <Dialog open={!!open} onOpenChange={setOpen}>
            <DialogContent className="sm:max-w-xl p-8 gap-8 border-destructive/20 shadow-2xl">

                <DialogHeader className="flex flex-col items-center text-center gap-2">
                    {/* Icon Wrapper - Uses semantic 'destructive' colors */}
                    <div className="mb-4">
                        <div className="bg-destructive/10 p-5 rounded-2xl flex items-center justify-center ring-1 ring-destructive/20 shadow-sm">
                            <FontAwesomeIcon
                                icon={faTrashCan}
                                className="text-destructive text-5xl"
                            />
                        </div>
                    </div>

                    <div className="grid gap-2 w-full">
                        <DialogTitle className="text-2xl font-bold text-center text-foreground">
                            {title || "Ești sigur?"}
                        </DialogTitle>

                        <DialogDescription className="text-base  text-center text-muted-foreground leading-relaxed">
                            {description || "Această acțiune este ireversibilă. Datele vor fi șterse definitiv."}
                        </DialogDescription>
                    </div>
                </DialogHeader>

                {/* Zona de Input Code */}
                {useCode && (
                    <div className="grid gap-3 w-full max-w-sm mx-auto">
                        <Label htmlFor="confirm-code" className="text-center font-semibold text-destructive">
                            Cod de Confirmare
                        </Label>
                        <Input
                            id="confirm-code"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder="Introdu codul aici..."
                            className="h-11 text-center border-destructive/30 focus-visible:ring-destructive text-lg placeholder:text-muted-foreground/50"
                            autoComplete="off"
                        />
                    </div>
                )}

                {/* Footer - Centered Buttons */}
                <DialogFooter className="flex flex-col sm:flex-row gap-3 sm:justify-center w-full">
                    <DialogClose asChild>
                        <Button
                            type="button"
                            variant="outline"
                            size="lg"
                            onClick={handleCancel}
                            className="text-base min-w-[120px]"
                        >
                            Anulează
                        </Button>
                    </DialogClose>
                    <Button
                        type="button"
                        variant="destructive"
                        size="lg"
                        onClick={handleConfirm}
                        // variant="destructive" handles the red bg/text automatically. 
                        // Kept shadow and transition for effect.
                        className="gap-2 shadow-md hover:shadow-lg transition-all text-base min-w-40"
                    >
                        <FontAwesomeIcon icon={faTrashCan} />
                        Șterge
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}