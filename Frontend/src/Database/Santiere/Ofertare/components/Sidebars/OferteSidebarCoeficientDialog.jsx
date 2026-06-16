import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function OferteSidebarCoeficientDialog({ open, onOpenChange, mode = "add", draft, onDraftChange, onSubmit }) {
  const isAdd = mode === "add";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>{isAdd ? "Adaugă coeficient" : "Editează coeficient"}</DialogTitle>
            <DialogDescription>Completează numele coeficientului.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="coeficient_nume">
                Nume <span className="text-high">*</span>
              </Label>
              <Input
                id="coeficient_nume"
                value={draft?.nume || ""}
                onChange={(event) =>
                  onDraftChange?.((prev) => ({
                    ...prev,
                    nume: event.target.value,
                  }))
                }
                placeholder="Ex: Coeficient Electrice"
              />
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Anulează
              </Button>
            </DialogClose>

            <Button type="submit">{isAdd ? "Creează" : "Salvează"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
