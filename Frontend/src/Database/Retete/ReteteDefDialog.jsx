import React, { useContext, useEffect, useState } from "react";
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUndo, faCopy, faDatabase } from "@fortawesome/free-solid-svg-icons";
import { toast } from "sonner";

import { useLoading } from "@/context/LoadingContext";
import { AuthContext } from "@/context/TokenContext";

// Hook-uri presupuse pentru Rețete
import { useAddReteta, useEditReteta } from "@/hooks/Database/useRetete";

export default function ReteteDefDialog({ open, setOpen, mode = "add", initialData = null }) {
  const { show, hide } = useLoading();
  const { user } = useContext(AuthContext);

  const { mutateAsync: addReteta } = useAddReteta();
  const { mutateAsync: editReteta } = useEditReteta();

  const isDuplicateMode = initialData?.isDuplicate === true;
  const actualMode = isDuplicateMode ? "add" : mode;

  const defaultDraft = {
    limba: "RO",
    cod_reteta: "",
    clasa_reteta: "",
    denumire: "",
    denumire_fr: "",
    descriere: "",
    descriere_fr: "",
    unitate_masura: "U", // Unitate default bazată pe filtre
    duplicateElements: false,
  };

  const [draft, setDraft] = useState(defaultDraft);

  useEffect(() => {
    if (open && initialData) {
      setDraft({
        limba: initialData.limba || "RO",
        cod_reteta: initialData.cod_reteta || "",
        clasa_reteta: initialData.clasa_reteta || "",
        denumire: initialData.denumire || "",
        denumire_fr: initialData.denumire_fr || "",
        descriere: initialData.descriere || "",
        descriere_fr: initialData.descriere_fr || "",
        unitate_masura: initialData.unitate_masura || "m³",
        duplicateElements: isDuplicateMode ? true : false,
        originalId: isDuplicateMode ? initialData.id : null,
      });
    } else if (open && !initialData) {
      setDraft(defaultDraft);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, initialData, isDuplicateMode]);

  const setField = (key, value) => setDraft((prev) => ({ ...prev, [key]: value }));

  const resetDraft = () => {
    setDraft(defaultDraft);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!draft.cod_reteta.trim()) return toast.warning("Codul rețetei este obligatoriu.", { position: "top-right" });
    if (!draft.clasa_reteta.trim()) return toast.warning("Clasa rețetei este obligatorie.", { position: "top-right" });
    if (!draft.denumire.trim()) return toast.warning("Denumirea este obligatorie.", { position: "top-right" });
    if (!draft.unitate_masura.trim()) return toast.warning("Unitatea de măsură este obligatorie.", { position: "top-right" });
    if (draft.limba === "FR" && !draft.denumire_fr.trim()) return toast.warning("Dacă limba este FR, atunci denumirea în franceză este obligatorie.", { position: "top-right" });

    // Pentru că nu avem fișiere (poze), putem folosi un obiect JSON simplu
    const payload = {
      limba: draft.limba,
      cod_reteta: draft.cod_reteta.trim(),
      clasa_reteta: draft.clasa_reteta.trim(),
      denumire: draft.denumire.trim(),
      denumire_fr: draft.denumire_fr.trim(),
      descriere: draft.descriere.trim(),
      descriere_fr: draft.descriere_fr.trim(),
      unitate_masura: draft.unitate_masura.trim(),
      user_id: user.id,
    };

    if (isDuplicateMode && draft.duplicateElements && draft.originalId) {
      payload.duplicate_from_id = draft.originalId;
    }

    show();
    try {
      if (actualMode === "edit") {
        await editReteta({ id: initialData.id, data: payload });
        toast.success("Rețeta a fost actualizată!", { position: "top-right" });
      } else {
        await addReteta(payload);
        toast.success(isDuplicateMode ? "Rețeta a fost dublată cu succes!" : "Rețeta a fost adăugată cu succes!", { position: "top-right" });
      }
      setOpen(false);
      resetDraft();
    } catch (error) {
      toast.error(error?.response?.data?.message || "A apărut o eroare la salvare.", { position: "top-right" });
    } finally {
      hide();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="lg:max-w-[70rem] sm:max-w-[40rem] p-0 gap-0 overflow-hidden">
        <form onSubmit={handleSubmit} className="flex flex-col">
          {/* ── HEADER ── */}
          <div className="relative px-6 pt-5 pb-4 bg-muted border-b border-border">
            <div className="flex items-end gap-4">
              <div className="h-14 w-14 rounded-xl flex items-center justify-center shrink-0 bg-sky-600/25 border border-sky-600/25">
                <FontAwesomeIcon icon={isDuplicateMode ? faCopy : faDatabase} className="text-sky-600 text-2xl" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold uppercase tracking-widest leading-none mb-1 text-sky-600">Rețetă</p>
                <h2 className="text-xl font-bold text-foreground leading-tight">{isDuplicateMode ? "Dublează rețeta" : actualMode === "edit" ? "Editează rețeta" : "Rețetă nouă"}</h2>
              </div>
            </div>
          </div>

          {/* ── BODY ── */}
          <div className="px-6 py-4 flex flex-col gap-4 overflow-y-auto max-h-[65vh]">
            {isDuplicateMode && (
              <div className="flex items-center gap-2 p-4 rounded-lg border bg-muted">
                <Switch checked={draft.duplicateElements} onCheckedChange={(checked) => setField("duplicateElements", checked)} className="data-[state=checked]:bg-sky-600 shrink-0" />
                <label className="text-sm font-medium leading-none text-sky-600">Dublează și elementele (materiale/utilaje) atașate acestei rețete.</label>
              </div>
            )}

            {/* Section 1 — Configurare */}
            <div className="flex flex-col gap-2">
              <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Configurare de bază</p>

              <div className="flex gap-5 items-end">
                <div className="flex-1 grid grid-cols-4 gap-3 mb-1">
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-sm font-semibold">
                      Cod Rețetă <span className="text-destructive">*</span>
                    </Label>
                    <Input value={draft.cod_reteta} onChange={(e) => setField("cod_reteta", e.target.value)} maxLength={30} className="h-9" />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label className="text-sm font-semibold">
                      Clasa Rețetei <span className="text-destructive">*</span>
                    </Label>
                    <Input value={draft.clasa_reteta} onChange={(e) => setField("clasa_reteta", e.target.value)} placeholder="Ex: Betoane" className="h-9" />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label className="text-sm font-semibold">
                      Unitate <span className="text-destructive">*</span>
                    </Label>
                    <Select value={draft.unitate_masura} onValueChange={(v) => setField("unitate_masura", v)}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="U">U</SelectItem>
                        <SelectItem value="kg">kg</SelectItem>
                        <SelectItem value="m">m</SelectItem>
                        <SelectItem value="m²">m²</SelectItem>
                        <SelectItem value="m³">m³</SelectItem>
                        <SelectItem value="l">l</SelectItem>
                        <SelectItem value="Set">Set</SelectItem>
                        <SelectItem value="Rola">Rola</SelectItem>
                        <SelectItem value="ens">ens</SelectItem>
                        <SelectItem value="j">j</SelectItem>
                        <SelectItem value="t">t</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label className="text-sm font-semibold">Limbă de bază</Label>
                    <Select value={draft.limba} onValueChange={(v) => setField("limba", v)}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="RO">Română (RO)</SelectItem>
                        <SelectItem value="FR">Franceză (FR)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Section 2 — Texte RO / FR */}
            <div className="flex flex-col gap-2">
              <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Denumire și descriere</p>

              <div className="grid grid-cols-2 gap-4">
                {/* RO */}
                <div className="flex flex-col gap-3 p-4 rounded-xl border border-border bg-muted/20">
                  <div className="flex items-center gap-2">
                    <div className="rounded-md p-1 px-2 bg-cyan-500/5 border border-cyan-500 flex items-center justify-center">
                      <span className="text-sm font-bold text-cyan-600">RO</span>
                    </div>
                    <span className="text-sm font-semibold text-foreground">Română</span>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label className="text-sm text-foreground">
                      Denumire <span className="text-destructive">*</span>
                    </Label>
                    <Input value={draft.denumire} onChange={(e) => setField("denumire", e.target.value)} className="h-9" />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label className="text-sm text-foreground">Descriere</Label>
                    <Textarea value={draft.descriere} onChange={(e) => setField("descriere", e.target.value)} className="resize-none h-40" />
                  </div>
                </div>

                {/* FR */}
                <div className="flex flex-col gap-3 p-4 rounded-xl border border-border bg-muted/20">
                  <div className="flex items-center gap-2">
                    <div className={`rounded-md p-1 px-2 border ${draft.limba !== "FR" ? "bg-muted/20 border-border" : "bg-lime-500/5 border-lime-500"} flex items-center justify-center`}>
                      <span className={`text-sm font-bold ${draft.limba !== "FR" ? "text-muted-foreground" : "text-lime-600"}`}>FR</span>
                    </div>
                    <span className="text-sm font-semibold text-foreground">Franceză</span>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label className="text-sm text-foreground">Denumire (FR) {draft.limba === "FR" && <span className="text-destructive">*</span>}</Label>
                    <Input disabled={draft.limba !== "FR"} value={draft.denumire_fr} onChange={(e) => setField("denumire_fr", e.target.value)} className="h-9" />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label className="text-sm text-foreground">Descriere (FR)</Label>
                    <Textarea disabled={draft.limba !== "FR"} value={draft.descriere_fr} onChange={(e) => setField("descriere_fr", e.target.value)} className="resize-none h-40" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── FOOTER ── */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/5">
            <div>
              {actualMode === "add" && !isDuplicateMode && (
                <Button
                  variant="outline"
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    resetDraft();
                  }}
                  className="text-muted-foreground"
                >
                  <FontAwesomeIcon icon={faUndo} className="mr-2" />
                  Resetează
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <DialogClose asChild>
                <Button variant="outline" type="button">
                  Anulează
                </Button>
              </DialogClose>
              <Button type="submit" className="px-5 bg-sky-600 hover:bg-sky-700 text-white">
                {isDuplicateMode ? "Dublează" : actualMode === "edit" ? "Salvează modificările" : "Adaugă rețetă"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
