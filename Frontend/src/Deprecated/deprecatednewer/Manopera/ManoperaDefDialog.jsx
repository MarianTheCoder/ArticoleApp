import React, { useContext, useEffect, useState } from "react";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox"; // <-- Am adăugat Checkbox-ul de la Shadcn

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPerson, faUndo, faCopy } from "@fortawesome/free-solid-svg-icons";
import { toast } from "sonner";

import { useLoading } from "@/context/LoadingContext";
import { AuthContext } from "@/context/TokenContext";

import { useAddCatalogDef, useEditCatalogDef } from "@/hooks/Database/useCatalog";
import { Switch } from "@/components/ui/switch";

export default function ManoperaDefDialog({ open, setOpen, mode = "add", initialData = null }) {
  const { show, hide } = useLoading();
  const { user } = useContext(AuthContext);

  const { mutateAsync: addDefinitie } = useAddCatalogDef();
  const { mutateAsync: editDefinitie } = useEditCatalogDef();

  // Dacă initialData are flag-ul isDuplicate, forțăm mode-ul pe 'add' intern
  const isDuplicateMode = initialData?.isDuplicate === true;
  const actualMode = isDuplicateMode ? "add" : mode;

  const defaultDraft = {
    limba: "RO",
    cod_definitie: "",
    denumire: "",
    denumire_fr: "",
    descriere: "",
    descriere_fr: "",
    unitate_masura: "h",
    cost: "0,000",
    duplicateSubs: false, // Flag nou pentru a bifa dacă dublăm și variantele
  };

  const [draft, setDraft] = useState(defaultDraft);

  useEffect(() => {
    if (open) {
      if (initialData) {
        setDraft({
          limba: initialData.limba || "RO",
          cod_definitie: initialData.cod_definitie || "",
          denumire: initialData.denumire || "",
          denumire_fr: initialData.denumire_fr || "",
          descriere: initialData.descriere || "",
          descriere_fr: initialData.descriere_fr || "",
          unitate_masura: initialData.unitate_masura || "h",
          cost: String(initialData.cost).replace(".", ",") || "0,000",
          duplicateSubs: isDuplicateMode ? true : false, // Default bifat dacă dublăm
          originalId: isDuplicateMode ? initialData.id : null, // Salvăm ID-ul original ca să știe backend-ul de unde să ia variantele
        });
      } else {
        setDraft(defaultDraft);
      }
    }
  }, [open, mode, initialData, isDuplicateMode]);

  const setField = (key, value) => setDraft((prev) => ({ ...prev, [key]: value }));
  const resetDraft = () => setDraft(defaultDraft);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!draft.cod_definitie.trim()) return toast.warning("Codul este obligatoriu.");
    if (!draft.denumire.trim()) return toast.warning("Denumirea este obligatorie.");
    if (!draft.unitate_masura.trim()) return toast.warning("Unitatea de măsură este obligatorie.");
    if (draft.limba === "FR" && !draft.denumire_fr.trim()) return toast.warning("Dacă limba este FR, atunci denumirea în franceză este obligatorie.");

    const fd = new FormData();
    fd.append("tip_resursa", "manopera");
    fd.append("limba", draft.limba);
    fd.append("cod_definitie", draft.cod_definitie.trim());
    fd.append("denumire", draft.denumire.trim());
    fd.append("denumire_fr", draft.denumire_fr.trim());
    fd.append("descriere", draft.descriere.trim());
    fd.append("descriere_fr", draft.descriere_fr.trim());
    fd.append("unitate_masura", draft.unitate_masura.trim());
    fd.append("cost", String(parseFloat(draft.cost.replace(",", ".")) || 0));
    fd.append("user_id", user.id);

    // Dacă dublăm și vrem să luăm și variantele, trimitem ID-ul original la backend
    if (isDuplicateMode && draft.duplicateSubs && draft.originalId) {
      fd.append("duplicate_from_id", draft.originalId);
    }

    show();
    try {
      if (actualMode === "edit") {
        await editDefinitie({ id: initialData.id, data: fd });
        toast.success("Definiția a fost actualizată!");
      } else {
        await addDefinitie(fd);
        toast.success(isDuplicateMode ? "Definiția a fost dublată cu succes!" : "Definiția a fost adăugată cu succes!");
      }
      setOpen(false);
      resetDraft();
    } catch (error) {
      toast.error(error?.response?.data?.message || "A apărut o eroare la salvare.");
    } finally {
      hide();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="lg:max-w-[70rem]  sm:max-w-[40rem]  p-0 gap-0 overflow-hidden">
        <form onSubmit={handleSubmit} className="flex flex-col">
          {/* ── HEADER ─────────────────────────────────────────────── */}
          <div className="relative px-6 pt-5 pb-4 bg-muted border-b border-border">
            <div className="flex items-end gap-4">
              <div className="h-14 w-14 rounded-xl bg-indigo-500/15 border-2 border-indigo-500/25 flex items-center justify-center shrink-0">
                <FontAwesomeIcon icon={faPerson} className="text-indigo-500 text-2xl" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-indigo-500 uppercase tracking-widest leading-none mb-1">Manoperă</p>
                <h2 className="text-xl font-bold text-foreground leading-tight">{isDuplicateMode ? "Dublează definiție" : actualMode === "edit" ? "Editează definiție" : "Definiție nouă"}</h2>
              </div>
            </div>
          </div>

          {/* ── BODY ───────────────────────────────────────────────── */}
          <div className="px-6 py-4 flex flex-col gap-4 overflow-y-auto max-h-[65vh]">
            {/* Dacă suntem în modul duplicare, dăm opțiunea să dubleze și copiii */}
            {isDuplicateMode && (
              <div className="flex items-center gap-2 p-4  rounded-lg border bg-muted">
                <Switch checked={draft.duplicateSubs} onCheckedChange={(checked) => setField("duplicateSubs", checked)} className="data-[state=checked]:bg-indigo-500 shrink-0" />{" "}
                <label htmlFor="duplicateSubs" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-blue-700 dark:text-blue-400">
                  Dublează și variantele atașate acestei definiții.
                </label>
              </div>
            )}

            {/* Section 1 — Configurare */}
            <div className="flex flex-col gap-2">
              <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Configurare</p>
              <div className="grid grid-cols-4 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label className="text-sm font-semibold">
                    Cod <span className="text-destructive">*</span>
                  </Label>
                  <Input value={draft.cod_definitie} onChange={(e) => setField("cod_definitie", e.target.value)} placeholder="M001" maxLength={15} className="h-9" />
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
                      <SelectItem value="h">Ore</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label className="text-sm font-semibold">Cost standard</Label>
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

                <div className="flex flex-col gap-1.5">
                  <Label className="text-sm font-semibold">Limbă</Label>
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

            <Separator />

            {/* Section 2 — Texte RO / FR */}
            <div className="flex flex-col gap-2">
              <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Denumire și descriere</p>

              <div className="grid grid-cols-2 gap-4">
                {/* RO */}
                <div className="flex flex-col gap-3 p-4 rounded-xl border border-border bg-muted/20">
                  <div className="flex items-center gap-2">
                    <div className=" rounded-md p-1 px-2 bg-cyan-500/5 border border-cyan-500 flex items-center justify-center">
                      <span className="text-sm font-bold text-cyan-600">RO</span>
                    </div>
                    <span className="text-sm font-semibold text-foreground">Română</span>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label className="text-sm text-foreground">
                      Ocupație <span className="text-destructive">*</span>
                    </Label>
                    <Input value={draft.denumire} onChange={(e) => setField("denumire", e.target.value)} placeholder="Ex: Muncitor Necalificat" className="h-9" />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label className="text-sm text-foreground">Descriere</Label>
                    <Textarea value={draft.descriere} onChange={(e) => setField("descriere", e.target.value)} placeholder="Detalii despre ocupație..." className="resize-none h-40" />
                  </div>
                </div>

                {/* FR */}
                <div className="flex flex-col gap-3 p-4 rounded-xl border border-border bg-muted/20">
                  <div className="flex items-center gap-2">
                    <div className={`rounded-md p-1 px-2 border ${draft.limba !== "FR" ? "bg-muted/20 border-border" : "bg-lime-500/5 border-lime-500"} flex items-center justify-center`}>
                      <span className={`text-sm font-bold ${draft.limba !== "FR" ? "text-muted-foreground " : "text-lime-600"}`}>FR</span>
                    </div>
                    <span className="text-sm font-semibold text-foreground">Franceză</span>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label className="text-sm text-foreground">Ocupație (FR) {draft.limba === "FR" && <span className="text-destructive">*</span>}</Label>
                    <Input disabled={draft.limba !== "FR"} value={draft.denumire_fr} onChange={(e) => setField("denumire_fr", e.target.value)} placeholder="Ex: Ouvrier non qualifié" className="h-9" />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label className="text-sm text-foreground">Descriere (FR)</Label>
                    <Textarea
                      disabled={draft.limba !== "FR"}
                      value={draft.descriere_fr}
                      onChange={(e) => setField("descriere_fr", e.target.value)}
                      placeholder="Détails sur la profession..."
                      className="resize-none h-40"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── FOOTER ─────────────────────────────────────────────── */}
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
              <Button type="submit" className="px-5 bg-indigo-600">
                {isDuplicateMode ? "Dublează" : actualMode === "edit" ? "Salvează modificările" : "Adaugă definiția"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
