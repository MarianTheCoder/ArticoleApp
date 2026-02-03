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
import { faQuestionCircle, faCheck } from "@fortawesome/free-solid-svg-icons";
import { toast } from "sonner";

export default function AskDialog({
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
            <DialogContent className="sm:max-w-xl p-8 gap-8 border shadow-2xl">
                <DialogHeader className="flex flex-col items-center text-center gap-2">
                    {/* Icon Wrapper - Blueish tint */}
                    <div className="mb-4">
                        <div className="bg-blue-50 dark:bg-blue-950/40 p-5 rounded-2xl flex items-center justify-center ring-1 ring-blue-100 dark:ring-blue-900 shadow-sm">
                            <FontAwesomeIcon
                                icon={faQuestionCircle}
                                className="text-blue-600 dark:text-blue-400 text-5xl"
                            />
                        </div>
                    </div>

                    <div className="grid gap-2 w-full">
                        <DialogTitle className="text-2xl font-semibold text-center text-foreground">
                            {title || "Ești sigur?"}
                        </DialogTitle>

                        <DialogDescription className="text-base text-muted-foreground text-center leading-relaxed">
                            {description || "Această acțiune este ireversibilă."}
                        </DialogDescription>
                    </div>
                </DialogHeader>

                {/* Input Area (Only if useCode is true) */}
                {useCode && (
                    <div className="grid gap-3 w-full max-w-sm mx-auto">
                        <Label htmlFor="confirm-code" className="text-center font-semibold text-blue-700 dark:text-blue-300">
                            Cod de Confirmare
                        </Label>
                        <Input
                            id="confirm-code"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder="Introdu codul aici..."
                            className="h-11 text-center border-blue-200 focus-visible:ring-blue-500 text-lg"
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
                        variant="default"
                        size="lg"
                        onClick={handleConfirm}
                        className="gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all text-base min-w-[120px]"
                    >
                        <FontAwesomeIcon icon={faCheck} />
                        Confirmă
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}