import React, { useState, useMemo, useEffect, useContext } from "react";
import {
    Dialog, DialogClose, DialogContent,
    DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch, faCheckCircle, faSpinner } from "@fortawesome/free-solid-svg-icons";
import { useAtribuiriData } from "@/hooks/useConturi"; // Removed individual add/delete hooks
import { useLoading } from "@/context/LoadingContext";
import { toast } from "sonner";

// ─── Sub-component: one country column ───────────────────────────────────────

function SantiereColumn({ label, flag, santiere, assignedIds, search, onToggle }) {
    const filtered = santiere.filter((s) =>
        s.nume.toLowerCase().includes(search.toLowerCase())
    );

    const assignedCount = santiere.filter((s) => assignedIds.has(s.id)).length;

    return (
        <div className="flex flex-col flex-1 min-w-0 gap-2">
            <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                    <span className="text-xl">{flag}</span>
                    <span className="text-base font-semibold">{label}</span>
                </div>
                <span className="flex items-center gap-1 text-base text-muted-foreground">
                    <FontAwesomeIcon icon={faCheckCircle} className="text-primary " />
                    {assignedCount} / {santiere.length}
                </span>
            </div>

            <div className="overflow-y-auto border rounded-md divide-y max-h-[52vh]">
                {filtered.length === 0 ? (
                    <p className="p-4 text-center text-sm text-muted-foreground">Niciun șantier găsit.</p>
                ) : filtered.map((santier) => (
                    <label
                        key={santier.id}
                        className={`flex items-center ${assignedIds.has(santier.id) ? "bg-primary/10" : ""} gap-3 p-3 cursor-pointer hover:bg-muted/50 transition-colors`}
                    >
                        <Checkbox
                            className="w-6 h-6"
                            checked={assignedIds.has(santier.id)}
                            onCheckedChange={() => onToggle(santier.id)}
                        />
                        {santier.culoare_hex && (
                            <span
                                className="w-4 h-4 rounded-full shrink-0 border border-black/10"
                                style={{ backgroundColor: santier.culoare_hex }}
                            />
                        )}
                        <span className="flex-1 text-base truncate">{santier.nume}</span>
                    </label>
                ))}
            </div>
        </div>
    );
}

// ─── Main Dialog ──────────────────────────────────────────────────────────────

export default function UtilizatoriAtribuiriDialog({
    open,
    setOpen,
    onSaveAtribuiri,
    buttonStyle = <div className="hidden" />,
}) {
    const { show, hide, loading } = useLoading()

    const [search, setSearch] = useState("");

    // Local state to track selections before saving
    const [localAssignedIds, setLocalAssignedIds] = useState(new Set());

    const { data, isLoading } = useAtribuiriData();

    const santiere = data?.santiere ?? [];
    const assignments = data?.assignments ?? [];

    // Sync local state with database data when dialog opens
    useEffect(() => {
        if (open && data) {
            const initialIds = new Set(
                assignments
                    .filter((a) => a.user_id == open)
                    .map((a) => a.santier_id)
            );
            setLocalAssignedIds(initialIds);
            setSearch(""); // Reset search when opening
        }
    }, [open, data, assignments]);

    const santiereRO = useMemo(() => santiere.filter((s) => s.tara === "RO"), [santiere]);
    const santiereFR = useMemo(() => santiere.filter((s) => s.tara === "FR"), [santiere]);

    // Toggle local state only
    const handleToggle = (santierId) => {
        setLocalAssignedIds((prev) => {
            const next = new Set(prev);
            if (next.has(santierId)) {
                next.delete(santierId);
            } else {
                next.add(santierId);
            }
            return next;
        });
    };

    // Handle the actual save action
    const handleSave = async () => {
        try {
            // Pass an array of all selected IDs to the parent
            await onSaveAtribuiri(open, Array.from(localAssignedIds));
            setOpen(false); // Close dialog on success
            toast.success("Atribuirile au fost salvate!");
        } catch (error) {
            console.error("Save failed", error);
            toast.error("Eroare la salvarea atribuirilor.");
        }
    };

    const columnProps = { assignedIds: localAssignedIds, search, onToggle: handleToggle };

    return (
        <Dialog open={!!open} onOpenChange={setOpen}>
            {buttonStyle}

            <DialogContent className="max-w-[56rem] max-h-[80vh] flex flex-col overflow-hidden">
                <DialogHeader>
                    <DialogTitle>Atribuiri Șantiere</DialogTitle>
                    <DialogDescription>
                        Selectează șantierele active la care este atribuit acest utilizator.
                    </DialogDescription>
                </DialogHeader>

                <div className="relative">
                    <FontAwesomeIcon
                        icon={faSearch}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-base pointer-events-none"
                    />
                    <Input
                        className="pl-9"
                        placeholder="Caută șantier..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                {isLoading ? (
                    <div className="flex-1 flex items-center justify-center text-base text-muted-foreground">
                        Se încarcă...
                    </div>
                ) : (
                    <div className="flex gap-4 flex-1 min-h-0 overflow-hidden">
                        <SantiereColumn label="România" flag="🇷🇴" santiere={santiereRO} {...columnProps} />
                        <div className="w-px bg-border shrink-0" />
                        <SantiereColumn label="Franța" flag="🇫🇷" santiere={santiereFR} {...columnProps} />
                    </div>
                )}

                <DialogFooter className="mt-2 gap-2">
                    <DialogClose asChild>
                        <Button variant="outline" disabled={loading}>Anulează</Button>
                    </DialogClose>
                    <Button onClick={handleSave} disabled={isLoading || loading}>
                        {loading ? (
                            <>
                                <FontAwesomeIcon icon={faSpinner} spin className="mr-2" />
                                Se salvează...
                            </>
                        ) : (
                            "Salvează Atribuirile"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}