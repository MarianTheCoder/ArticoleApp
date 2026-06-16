import React, { Fragment, useContext, useEffect, useMemo, useState } from "react";
import { Dialog, DialogClose, DialogContent } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUndo, faCopy, faDatabase, faArrowRight, faLanguage } from "@fortawesome/free-solid-svg-icons";
import { toast } from "sonner";

import { useLoading } from "@/context/LoadingContext";
import { AuthContext } from "@/context/TokenContext";

// Hook-uri presupuse pentru Rețete
import { useAddReteta, useEditReteta, useReteteClaseCoduri } from "@/hooks/Database/useRetete";
import ReteteClaseCoduriDialog from "./ReteteClaseCoduriDialog";
import OverflowTooltip from "@/components/ui/OverflowTooltip";

const getClassPartsFromCode = (codReteta) => {
  const segments = String(codReteta || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const activeParts = [];
  return segments.slice(0, 5).reduce((paths, segment) => {
    if (!segment || segment === "00") return paths;
    activeParts.push(segment);
    paths.push({
      code_segment: segment,
      path_code: activeParts.join("."),
    });
    return paths;
  }, []);
};

const buildClassBadgesFromCode = (codReteta, classItems = [], displayLang = "RO", fallback = "") => {
  const rowsByPath = new Map((classItems || []).map((item) => [item.path_code, item]));
  const derivedBadges = getClassPartsFromCode(codReteta).map((part) => {
    const row = rowsByPath.get(part.path_code);
    const denumire = displayLang === "FR" ? row?.denumire_fr || row?.denumire_ro : row?.denumire_ro;
    return `${part.code_segment}. ${denumire || "Nedefinit"}`;
  });

  if (derivedBadges.length > 0) return derivedBadges;

  return String(fallback || "")
    .split(/\s*->\s*/)
    .map((part) => part.trim())
    .filter(Boolean);
};

export default function ReteteDefDialog({ open, setOpen, mode = "add", initialData = null }) {
  const { show, hide } = useLoading();
  const { user } = useContext(AuthContext);

  const { mutateAsync: addReteta } = useAddReteta();
  const { mutateAsync: editReteta } = useEditReteta();
  const { data: claseCoduriData } = useReteteClaseCoduri(false);

  const isDuplicateMode = initialData?.isDuplicate === true;
  const actualMode = isDuplicateMode ? "add" : mode;

  const defaultDraft = {
    limba: "RO",
    cod_reteta: "",
    clasa_reteta: "",
    denumire: "",
    denumire_fr: "",
    unitate_masura: "U", // Unitate default bazată pe filtre
    duplicateElements: false,
  };

  const [draft, setDraft] = useState(defaultDraft);
  const [claseDialogOpen, setClaseDialogOpen] = useState(false);
  const [classDisplayLang, setClassDisplayLang] = useState("RO");

  useEffect(() => {
    if (open && initialData) {
      setDraft({
        limba: initialData.limba || "RO",
        cod_reteta: initialData.cod_reteta || "",
        clasa_reteta: initialData.clasa_reteta || "",
        denumire: initialData.denumire || "",
        denumire_fr: initialData.denumire_fr || "",
        unitate_masura: initialData.unitate_masura || "m³",
        duplicateElements: isDuplicateMode ? true : false,
        originalId: isDuplicateMode ? initialData.id : null,
      });
      setClassDisplayLang(initialData.limba === "FR" ? "FR" : "RO");
    } else if (open && !initialData) {
      setDraft(defaultDraft);
      setClassDisplayLang("RO");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, initialData, isDuplicateMode]);

  const setField = (key, value) => setDraft((prev) => ({ ...prev, [key]: value }));

  const resetDraft = () => {
    setDraft(defaultDraft);
  };

  const handleApplyClaseCode = ({ cod_reteta, clasa_reteta }) => {
    setDraft((prev) => ({
      ...prev,
      cod_reteta,
      clasa_reteta: clasa_reteta || "",
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!draft.cod_reteta.trim()) return toast.warning("Codul rețetei este obligatoriu.", { position: "top-right" });
    if (!draft.denumire.trim()) return toast.warning("Denumirea este obligatorie.", { position: "top-right" });
    if (!draft.unitate_masura.trim()) return toast.warning("Unitatea de măsură este obligatorie.", { position: "top-right" });
    if (draft.limba === "FR" && !draft.denumire_fr.trim()) return toast.warning("Dacă limba este FR, atunci denumirea în franceză este obligatorie.", { position: "top-right" });

    const resolvedClassLabel = buildClassBadgesFromCode(draft.cod_reteta, claseCoduriData?.items || [], classDisplayLang, draft.clasa_reteta).join(" -> ");

    // Pentru că nu avem fișiere (poze), putem folosi un obiect JSON simplu
    const payload = {
      limba: draft.limba,
      cod_reteta: draft.cod_reteta.trim(),
      clasa_reteta: resolvedClassLabel,
      denumire: draft.denumire.trim(),
      denumire_fr: draft.denumire_fr.trim(),
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

  const classBadges = useMemo(() => {
    return buildClassBadgesFromCode(draft.cod_reteta, claseCoduriData?.items || [], classDisplayLang, draft.clasa_reteta);
  }, [claseCoduriData?.items, classDisplayLang, draft.clasa_reteta, draft.cod_reteta]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="lg:max-w-[56rem] sm:max-w-[48rem] p-0 gap-0 ">
        <form onSubmit={handleSubmit} className="flex flex-col">
          {/* ── HEADER ── */}
          <div className="relative px-4 xxxl:px-6 pt-4 xxxl:pt-5 pb-3 xxxl:pb-4 bg-muted rounded-md border-b border-border">
            <div className="flex items-end gap-3 xxxl:gap-4">
              <div className="h-12 w-12 xxxl:h-14 xxxl:w-14 rounded-xl flex items-center justify-center shrink-0 bg-sky-600/25 border border-sky-600/25">
                <FontAwesomeIcon icon={isDuplicateMode ? faCopy : faDatabase} className="text-sky-600 text-xl xxxl:text-2xl" />
              </div>
              <div className="flex-1">
                <p className="text-xs xxxl:text-sm font-bold uppercase tracking-widest leading-none mb-1 text-sky-600">Rețetă</p>
                <h2 className="text-lg xxxl:text-xl font-bold text-foreground leading-tight">{isDuplicateMode ? "Dublează rețeta" : actualMode === "edit" ? "Editează rețeta" : "Rețetă nouă"}</h2>
              </div>
            </div>
          </div>

          {/* ── BODY ── */}
          <div className="px-4 xxxl:px-6 py-4 xxxl:py-5 flex flex-col gap-3 xxxl:gap-4 overflow-y-auto max-h-[65vh]">
            <div className="flex flex-col gap-2.5 xxxl:gap-3 rounded-md border bg-muted/10 p-2.5 xxxl:p-3">
              <div className="flex items-center justify-between gap-2.5 xxxl:gap-3">
                <p className="text-xs xxxl:text-sm font-bold uppercase tracking-widest text-muted-foreground">Denumire</p>

                <Select value={draft.limba} onValueChange={(v) => setField("limba", v)}>
                  <SelectTrigger className="h-9 w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RO">RO</SelectItem>
                    <SelectItem value="FR">FR</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1 xxxl:gap-1.5">
                <div className="flex items-center gap-2">
                  <span className="rounded-md border border-cyan-500 bg-cyan-500/5 px-2 py-1 text-sm font-bold text-cyan-600">RO</span>
                  <Label className="text-xs xxxl:text-sm font-semibold">
                    Denumire RO <span className="text-destructive">*</span>
                  </Label>
                </div>

                <Input value={draft.denumire} onChange={(e) => setField("denumire", e.target.value)} className="h-10 xxxl:h-11 text-sm xxxl:text-base font-semibold" />
              </div>

              <div className="flex flex-col gap-1 xxxl:gap-1.5">
                <div className="flex items-center gap-2">
                  <span className="rounded-md border border-lime-500 bg-lime-500/5 px-2 py-1 text-sm font-bold text-lime-600">FR</span>
                  <Label className="text-xs xxxl:text-sm font-semibold">
                    Denumire FR <span className="text-destructive">*</span>
                  </Label>
                </div>

                <Input
                  value={draft.denumire_fr}
                  disabled={draft.limba != "FR"}
                  onChange={(e) => setField("denumire_fr", e.target.value)}
                  className="h-10 xxxl:h-11 text-sm xxxl:text-base font-semibold"
                />
              </div>
            </div>

            {isDuplicateMode && (
              <div className="flex items-center gap-2 p-2.5 xxxl:p-3 rounded-md border bg-muted">
                <Switch checked={draft.duplicateElements} onCheckedChange={(checked) => setField("duplicateElements", checked)} className="data-[state=checked]:bg-sky-600 shrink-0" />
                <label className="text-xs xxxl:text-sm font-medium leading-none text-sky-600">Dublează și elementele (materiale/utilaje) atașate acestei rețete.</label>
              </div>
            )}

            <div className="grid grid-cols-[auto_1fr] gap-2.5 xxxl:gap-3 items-center">
              <div className="flex flex-col  gap-1 xxxl:gap-1.5">
                <Label className="text-xs xxxl:text-sm font-semibold">
                  Cod rețetă <span className="text-destructive">*</span>
                </Label>
                <button
                  type="button"
                  onClick={() => setClaseDialogOpen(true)}
                  className="h-9  rounded-md border border-input bg-background px-3 text-left text-sm  font-bold text-foreground hover:bg-accent"
                >
                  {draft.cod_reteta || "Alege cod"}
                </button>
              </div>

              <div className="flex flex-col w-32 gap-1 xxxl:gap-1.5">
                <Label className="text-xs xxxl:text-sm font-semibold">
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
            </div>

            <div className="flex flex-col gap-1 ">
              <div className="flex items-center justify-left gap-2">
                <Label className="text-xs xxxl:text-sm font-semibold">Clasă</Label>
                <Button
                  type="button"
                  variant="outline"
                  className="h-6 gap-1 rounded-md px-1.5 py-0 text-xs font-bold text-foreground"
                  onClick={() => setClassDisplayLang((prev) => (prev === "RO" ? "FR" : "RO"))}
                >
                  <FontAwesomeIcon icon={faLanguage} className="text-[10px]" />
                  <span className="leading-none">{classDisplayLang}</span>
                </Button>
              </div>
              <div className="flex  flex-wrap items-center gap-1 rounded-md   ">
                {classBadges.length > 0 ? (
                  classBadges.map((badge, index) => {
                    return (
                      <Fragment key={`${badge}-${index}`}>
                        <span className="inline-flex min-w-0 max-w-[8rem] rounded-md border p-2 text-xs xxxl:text-sm font-semibold">
                          <OverflowTooltip text={badge} align="center" className="block max-w-full truncate" maxLines={1} textSize="sm" />
                        </span>
                        {index < classBadges.length - 1 && (
                          <span className="xxxl:text-base text-sm">
                            <FontAwesomeIcon icon={faArrowRight} />
                          </span>
                        )}
                      </Fragment>
                    );
                  })
                ) : (
                  <span className="text-sm font-semibold text-muted-foreground">Nicio clasă selectată</span>
                )}
              </div>
            </div>
          </div>

          {/* ── FOOTER ── */}
          <div className="flex items-center justify-between px-4 xxxl:px-6 py-3 xxxl:py-4 border-t border-border bg-muted/5">
            <div>
              {actualMode === "add" && !isDuplicateMode && (
                <Button
                  variant="outline"
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    resetDraft();
                  }}
                  className="h-9 xxxl:h-10 text-sm xxxl:text-base text-muted-foreground"
                >
                  <FontAwesomeIcon icon={faUndo} className="mr-2" />
                  Resetează
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <DialogClose asChild>
                <Button variant="outline" type="button" className="h-9 xxxl:h-10 text-sm xxxl:text-base">
                  Anulează
                </Button>
              </DialogClose>
              <Button type="submit" className="h-9 xxxl:h-10 px-4 xxxl:px-5 text-sm xxxl:text-base bg-sky-600 hover:bg-sky-700 text-white">
                {isDuplicateMode ? "Dublează" : actualMode === "edit" ? "Salvează modificările" : "Adaugă rețetă"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
      <ReteteClaseCoduriDialog open={claseDialogOpen} setOpen={setClaseDialogOpen} value={draft.cod_reteta} onApply={handleApplyClaseCode} displayLang={classDisplayLang} />
    </Dialog>
  );
}
