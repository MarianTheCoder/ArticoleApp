import React, { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faWarehouse } from "@fortawesome/free-solid-svg-icons";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAddInventar } from "@/hooks/Database/useInventar";

const INITIAL_DRAFT = {
  limba: "RO",
  denumire: "",
  descriere: "",
};

export default function InventarAddDialog({ open, setOpen }) {
  const [draft, setDraft] = useState(INITIAL_DRAFT);
  const { mutateAsync: addInventar, isPending } = useAddInventar();

  useEffect(() => {
    if (open) {
      setDraft(INITIAL_DRAFT);
    }
  }, [open]);

  const setField = (field, value) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!draft.denumire.trim()) {
      toast.warning("Denumirea este obligatorie.", { position: "top-right" });
      return;
    }

    try {
      await addInventar({
        limba: draft.limba,
        denumire: draft.denumire.trim(),
        descriere: draft.descriere.trim(),
      });

      toast.success("Inventarul a fost adăugat.", { position: "top-right" });
      setOpen(false);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Eroare la adăugarea inventarului.", { position: "top-right" });
    }
  };

  return (
    <Dialog open={!!open} onOpenChange={setOpen}>
      <DialogContent className="keepSelection max-w-[34rem] p-0 overflow-hidden">
        <DialogHeader className="border-b px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-lime-600/50 bg-lime-600/15">
              <FontAwesomeIcon icon={faWarehouse} className="text-xl text-lime-600" />
            </div>

            <div className="min-w-0 text-left">
              <DialogTitle className="text-lg font-black text-foreground">Adaugă inventar</DialogTitle>
              <DialogDescription className="text-sm font-semibold text-muted-foreground">Creează un inventar nou în baza de date.</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-3 px-5 py-4">
            <div className="grid gap-1.5">
              <Label className="text-sm font-bold">
                Limbă <span className="text-destructive">*</span>
              </Label>
              <Select value={draft.limba} onValueChange={(value) => setField("limba", value)}>
                <SelectTrigger className="h-9 bg-background text-sm font-semibold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RO">RO</SelectItem>
                  <SelectItem value="FR">FR</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1.5">
              <Label className="text-sm font-bold">
                Denumire <span className="text-destructive">*</span>
              </Label>
              <Input value={draft.denumire} onChange={(event) => setField("denumire", event.target.value)} className="h-9 bg-background text-sm font-semibold" autoFocus />
            </div>

            <div className="grid gap-1.5">
              <Label className="text-sm font-bold">Descriere</Label>
              <Textarea value={draft.descriere} onChange={(event) => setField("descriere", event.target.value)} className="min-h-[8rem] bg-background text-sm font-semibold" />
            </div>
          </div>

          <DialogFooter className="border-t bg-muted/20 px-5 py-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              Anulează
            </Button>
            <Button type="submit" disabled={isPending} className="bg-lime-600 text-white hover:bg-lime-700">
              Adaugă
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
