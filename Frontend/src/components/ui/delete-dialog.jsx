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

export default function DeleteConfirmationDialog({
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
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="sm:max-w-lg p-8 gap-6 text-lg border-destructive/50 shadow-2xl">

                <DialogHeader className="gap-2 sm:gap-4">
                    <div className="flex items-start gap-5">
                        {/* Increased gap-5 for icon separation */}

                        {/* Icon Wrapper */}
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0">
                            {/* Increased icon container to h-14 w-14 */}
                            <FontAwesomeIcon icon={faTriangleExclamation} className="text-red-600 text-2xl" />
                        </div>

                        <div className="grid gap-2 pt-1">
                            <DialogTitle className="text-2xl font-bold text-foreground">
                                {title || "Ești sigur?"}
                            </DialogTitle>

                            <DialogDescription className="text-base text-muted-foreground leading-relaxed">
                                {description || "Această acțiune este ireversibilă. Datele vor fi șterse definitiv."}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                {/* Zona de Input Code */}
                {useCode && (
                    <div className="grid gap-3 py-2 "> {/* Increased padding-left to align with text */}
                        <Label htmlFor="confirm-code" className="text-base font-semibold text-destructive">
                            Cod de Confirmare
                        </Label>
                        <Input
                            id="confirm-code"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder="Introdu codul aici..."
                            className="h-11 border-destructive/30 focus-visible:ring-destructive/30 text-base"
                            autoComplete="off"
                        />
                    </div>
                )}

                <DialogFooter className="gap-3 sm:justify-end mt-2">
                    <DialogClose asChild>
                        <Button
                            type="button"
                            variant="outline"
                            size="lg" // Bigger button
                            onClick={handleCancel}
                            className="text-base"
                        >
                            Anulează
                        </Button>
                    </DialogClose>
                    <Button
                        type="button"
                        variant="destructive"
                        size="lg" // Bigger button
                        onClick={handleConfirm}
                        className="gap-2 bg-red-600 hover:bg-red-700 text-white shadow-md hover:shadow-lg transition-all text-base"
                    >
                        <FontAwesomeIcon icon={faTrashCan} />
                        Șterge definitiv
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}