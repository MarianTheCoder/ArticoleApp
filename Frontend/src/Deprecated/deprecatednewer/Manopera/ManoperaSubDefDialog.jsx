import React, { useContext, useEffect, useState } from "react";
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTags, faUndo, faSave, faCopy } from "@fortawesome/free-solid-svg-icons"; // Am adăugat faCopy
import { toast } from "sonner";
import { useLoading } from "@/context/LoadingContext";
import { AuthContext } from "@/context/TokenContext";
import { useAddCatalogSubDef, useEditCatalogSubDef } from "@/hooks/Database/useCatalog";

export default function ManoperaSubDefDialog({ open, setOpen, mode = "add", initialData = null, definitieId }) {
  const { show, hide } = useLoading();
  const { user } = useContext(AuthContext);
  const { mutateAsync: addSubDef } = useAddCatalogSubDef();
  const { mutateAsync: editSubDef } = useEditCatalogSubDef();

  const isDuplicateMode = initialData?.isDuplicate === true;
  const actualMode = isDuplicateMode ? "add" : mode;

  const defaultDraft = {
    cod_specific: "",
    descriere: "",
    descriere_fr: "",
    cost: "0,000",
  };

  const [draft, setDraft] = useState(defaultDraft);

  useEffect(() => {
    if (open) {
      if (initialData) {
        setDraft({
          cod_specific: initialData.cod_specific || "",
          descriere: initialData.descriere || "",
          descriere_fr: initialData.descriere_fr || "",
          cost: initialData.cost?.toString().replace(".", ",") || "0,000",
        });
      } else {
        setDraft(defaultDraft);
      }
    }
  }, [open, mode, initialData, isDuplicateMode]);

  const setField = (key, value) => setDraft((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!draft.cod_specific.trim()) return toast.warning("Codul specific este obligatoriu.");

    const fd = new FormData();
    fd.append("definitie_id", definitieId);
    fd.append("cod_specific", draft.cod_specific.trim());
    fd.append("descriere", draft.descriere.trim());
    fd.append("descriere_fr", draft.descriere_fr.trim());
    fd.append("cost", String(parseFloat(draft.cost.replace(",", ".")) || 0));
    fd.append("user_id", user.id);

    show();
    try {
      if (actualMode === "edit") {
        await editSubDef({ id: initialData.id, data: fd });
        toast.success("Varianta a fost actualizată!");
      } else {
        await addSubDef(fd);
        toast.success(isDuplicateMode ? "Varianta a fost dublată cu succes!" : "Varianta a fost adăugată!");
      }
      setOpen(false);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Eroare la salvare.");
    } finally {
      hide();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[70rem] p-0 gap-0 overflow-hidden">
        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="px-6 pt-5 pb-4 bg-muted border-b border-border">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-lg bg-indigo-500/15 border-2 border-indigo-500/25 flex items-center justify-center shrink-0">
                <FontAwesomeIcon icon={isDuplicateMode ? faCopy : faTags} className="text-indigo-500 text-2xl" />
              </div>
              <div>
                <p className="text-sm font-bold text-indigo-500 uppercase tracking-widest mb-0.5">Variantă</p>
                <DialogTitle className="text-lg font-bold">{isDuplicateMode ? "Dublează variantă" : actualMode === "edit" ? "Editează variantă" : "Adaugă variantă nouă"}</DialogTitle>
              </div>
            </div>
          </div>

          <div className="px-6 py-4 flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label className="font-semibold text-sm text-foreground">
                  Cod Specific <span className="text-destructive">*</span>
                </Label>
                <Input value={draft.cod_specific} onChange={(e) => setField("cod_specific", e.target.value)} placeholder="M001" maxLength={12} className="h-9" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="font-semibold text-sm text-foreground">Cost</Label>
                <Input
                  type="text"
                  value={draft.cost}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (/^\d{0,7}\,?\d{0,3}$/.test(val)) setField("cost", val);
                  }}
                  className="h-9"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2 p-4 rounded-lg border bg-muted/20">
                <div className="flex items-center gap-2 mb-1">
                  <div className="rounded-md p-1 px-2 bg-cyan-500/5 border border-cyan-500 flex items-center justify-center">
                    <span className="text-sm font-bold text-cyan-600">RO</span>
                  </div>
                  <span className="text-base text-foreground">Descriere</span>
                </div>
                <Textarea value={draft.descriere} onChange={(e) => setField("descriere", e.target.value)} placeholder="Detalii specifice..." className="resize-none h-48 text-sm" />
              </div>

              <div className="flex flex-col gap-2 p-4 rounded-lg border bg-muted/20">
                <div className="flex items-center gap-2 mb-1">
                  <div className="rounded-md p-1 px-2 bg-lime-500/5 border border-lime-500 flex items-center justify-center">
                    <span className="text-sm font-bold text-lime-600">FR</span>
                  </div>
                  <span className="text-base text-foreground">Descriere (FR)</span>
                </div>
                <Textarea value={draft.descriere_fr} onChange={(e) => setField("descriere_fr", e.target.value)} placeholder="Détails spécifiques..." className="resize-none h-48 text-sm" />
              </div>
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t bg-muted/5 gap-2">
            <div>
              {actualMode === "add" && !isDuplicateMode && (
                <Button
                  variant="outline"
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setDraft(defaultDraft);
                  }}
                  className="mr-auto text-muted-foreground"
                >
                  <FontAwesomeIcon icon={faUndo} className="mr-2" /> Resetează
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <DialogClose asChild>
                <Button variant="outline">Anulează</Button>
              </DialogClose>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">
                <FontAwesomeIcon icon={isDuplicateMode ? faCopy : faSave} className="mr-2" />
                {isDuplicateMode ? "Dublează" : actualMode === "edit" ? "Salvează" : "Adaugă"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
