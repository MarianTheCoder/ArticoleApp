import React, { useContext, useEffect, useState, useRef } from "react";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBoxOpen, faUndo, faCopy, faUpload, faTrash, faX } from "@fortawesome/free-solid-svg-icons";
import { toast } from "sonner";

import { useLoading } from "@/context/LoadingContext";
import { AuthContext } from "@/context/TokenContext";

import { useAddCatalogDef, useEditCatalogDef } from "@/hooks/Database/useCatalog";
import photoAPI from "@/api/photoAPI";

export default function MaterialeDefDialog({ open, setOpen, mode = "add", initialData = null }) {
  const { show, hide } = useLoading();
  const { user } = useContext(AuthContext);

  const { mutateAsync: addDefinitie } = useAddCatalogDef();
  const { mutateAsync: editDefinitie } = useEditCatalogDef();

  const isDuplicateMode = initialData?.isDuplicate === true;
  const actualMode = isDuplicateMode ? "add" : mode;

  const defaultDraft = {
    limba: "RO",
    cod_definitie: "",
    denumire: "",
    denumire_fr: "",
    descriere: "",
    descriere_fr: "",
    unitate_masura: "U",
    cost: "0,000",
    duplicateSubs: false,
  };

  const [draft, setDraft] = useState(defaultDraft);

  // --- STATE-URI PENTRU DRAG & DROP POZĂ ---
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [photoDeleted, setPhotoDeleted] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    let isMounted = true; // Cleanup flag for async fetch

    const initializeData = async () => {
      if (open) {
        if (initialData) {
          setDraft({
            limba: initialData.limba || "RO",
            cod_definitie: initialData.cod_definitie || "",
            denumire: initialData.denumire || "",
            denumire_fr: initialData.denumire_fr || "",
            descriere: initialData.descriere || "",
            descriere_fr: initialData.descriere_fr || "",
            unitate_masura: initialData.unitate_masura || "U",
            cost: String(initialData.cost).replace(".", ",") || "0,000",
            duplicateSubs: isDuplicateMode ? true : false,
            originalId: isDuplicateMode ? initialData.id : null,
          });

          // Dacă suntem în modul DUPLICAT și părintele are poză
          if (isDuplicateMode && initialData.photo_url) {
            try {
              // Descărcăm poza originală și o transformăm în File pe loc
              const imageUrl = `${photoAPI}/${initialData.photo_url}`;
              const response = await fetch(imageUrl);
              const blob = await response.blob();

              // Extragem extensia și formăm un nume temporar
              const ext = initialData.photo_url.split(".").pop();
              const fileName = `duplicate_${Date.now()}.${ext}`;
              const file = new File([blob], fileName, { type: blob.type });

              if (isMounted) {
                setSelectedFile(file);
                setPreviewUrl(URL.createObjectURL(file));
                setPhotoDeleted(false);
              }
            } catch (error) {
              console.error("Eroare la încărcarea pozei originale:", error);
              // Dacă eșuează fetch-ul, lăsăm fără poză ca fallback
              if (isMounted) {
                setPreviewUrl(null);
                setSelectedFile(null);
              }
            }
          }
          // Modul EDIT (Afișăm simplu URL-ul existent)
          else if (!isDuplicateMode && initialData.photo_url) {
            setPreviewUrl(`${photoAPI}/${initialData.photo_url}`);
            setSelectedFile(null);
            setPhotoDeleted(false);
          }
          // Fără poză
          else {
            setPreviewUrl(null);
            setSelectedFile(null);
            setPhotoDeleted(false);
          }
        }
      }
    };

    initializeData();

    return () => {
      isMounted = false;
    };
  }, [open, mode, initialData, isDuplicateMode]);

  const setField = (key, value) => setDraft((prev) => ({ ...prev, [key]: value }));
  const resetDraft = () => {
    setDraft(defaultDraft);
    setSelectedFile(null);
    setPreviewUrl(null);
    setPhotoDeleted(false);
  };

  // --- HANDLERE DRAG & DROP ---
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setPhotoDeleted(false);
    } else {
      toast.error("Te rog să încarci doar imagini valide.");
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setPhotoDeleted(false);
    }
  };

  const clearFile = (e) => {
    e.stopPropagation();
    setSelectedFile(null);
    setPreviewUrl(null);
    setPhotoDeleted(true);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!draft.cod_definitie.trim()) return toast.warning("Codul este obligatoriu.");
    if (!draft.denumire.trim()) return toast.warning("Denumirea este obligatorie.");
    if (!draft.unitate_masura.trim()) return toast.warning("Unitatea de măsură este obligatorie.");
    if (draft.limba === "FR" && !draft.denumire_fr.trim()) return toast.warning("Dacă limba este FR, atunci denumirea în franceză este obligatorie.");

    const fd = new FormData();
    fd.append("tip_resursa", "material");
    fd.append("limba", draft.limba);
    fd.append("cod_definitie", draft.cod_definitie.trim());
    fd.append("denumire", draft.denumire.trim());
    fd.append("denumire_fr", draft.denumire_fr.trim());
    fd.append("descriere", draft.descriere.trim());
    fd.append("descriere_fr", draft.descriere_fr.trim());
    fd.append("unitate_masura", draft.unitate_masura.trim());
    fd.append("cost", String(parseFloat(draft.cost.replace(",", ".")) || 0));
    fd.append("user_id", user.id);

    if (selectedFile) {
      fd.append("photo", selectedFile);
    } else if (photoDeleted) {
      fd.append("delete_photo", "true");
    }

    if (isDuplicateMode && draft.duplicateSubs && draft.originalId) {
      fd.append("duplicate_from_id", draft.originalId);
    }

    show();
    try {
      if (actualMode === "edit") {
        await editDefinitie({ id: initialData.id, data: fd });
        toast.success("Materialul a fost actualizat!");
      } else {
        await addDefinitie(fd);
        toast.success(isDuplicateMode ? "Materialul a fost dublat cu succes!" : "Materialul a fost adăugat cu succes!");
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
      <DialogContent className="lg:max-w-[70rem] sm:max-w-[40rem] p-0 gap-0 overflow-hidden">
        <form onSubmit={handleSubmit} className="flex flex-col">
          {/* ── HEADER ── */}
          <div className="relative px-6 pt-5 pb-4 bg-muted border-b border-border">
            <div className="flex items-end gap-4">
              <div className="h-14 w-14 rounded-xl bg-amber-600/15 border-2 border-amber-600/25 flex items-center justify-center shrink-0">
                <FontAwesomeIcon icon={isDuplicateMode ? faCopy : faBoxOpen} className="text-amber-600 text-2xl" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-amber-600 uppercase tracking-widest leading-none mb-1">Material</p>
                <h2 className="text-xl font-bold text-foreground leading-tight">{isDuplicateMode ? "Dublează material" : actualMode === "edit" ? "Editează material" : "Material nou"}</h2>
              </div>
            </div>
          </div>

          {/* ── BODY ── */}
          <div className="px-6 py-4 flex flex-col gap-4 overflow-y-auto max-h-[65vh]">
            {isDuplicateMode && (
              <div className="flex items-center gap-2 p-4 rounded-lg border bg-muted">
                <Switch checked={draft.duplicateSubs} onCheckedChange={(checked) => setField("duplicateSubs", checked)} className="data-[state=checked]:bg-amber-600 shrink-0" />
                <label className="text-sm font-medium leading-none text-amber-600">Dublează și variantele atașate acestui material.</label>
              </div>
            )}

            {/* Section 1 — Configurare + Drag & Drop Poză pe același rând */}
            <div className="flex flex-col gap-2">
              <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Configurare</p>

              <div className="flex gap-5 items-end">
                {/* DROPZONE PENTRU POZĂ */}
                <div className="relative">
                  <div
                    className={`relative w-24 h-24 shrink-0 border-2 rounded-xl flex items-center justify-center cursor-pointer transition-all overflow-hidden ${
                      isDragging ? "border-amber-500 bg-amber-500/15 scale-105" : "border-border hover:bg-muted/50"
                    }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => {
                      fileInputRef.current.value = "";
                      fileInputRef.current?.click();
                    }}
                  >
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />

                    {previewUrl ? (
                      <img src={previewUrl} alt="Preview" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center gap-1.5 text-muted-foreground/60">
                        <FontAwesomeIcon icon={faUpload} className="text-xl" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-center px-2 leading-tight">Drop </span>
                      </div>
                    )}
                  </div>
                  {previewUrl ? (
                    <Button type="button" variant="destructive" size="icon" className="absolute -top-2 w-6 h-6 -right-2 rounded-full" onClick={clearFile}>
                      <FontAwesomeIcon icon={faX} className="text-xs" />
                    </Button>
                  ) : null}
                </div>

                {/* INPUTURILE */}
                <div className="flex-1 grid grid-cols-4 gap-3 mb-1">
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-sm font-semibold">
                      Cod <span className="text-destructive">*</span>
                    </Label>
                    <Input value={draft.cod_definitie} onChange={(e) => setField("cod_definitie", e.target.value)} placeholder="MAT001" maxLength={15} className="h-9" />
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
                        <SelectItem value="m">m</SelectItem>
                        <SelectItem value="m²">m²</SelectItem>
                        <SelectItem value="m³">m³</SelectItem>
                        <SelectItem value="kg">kg</SelectItem>
                        <SelectItem value="t">t</SelectItem>
                        <SelectItem value="Set">Set</SelectItem>
                        <SelectItem value="Rola">Rola</SelectItem>
                        <SelectItem value="ens">ens</SelectItem>
                        <SelectItem value="j">j</SelectItem>
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
                      Denumire <span className="text-destructive">*</span>
                    </Label>
                    <Input value={draft.denumire} onChange={(e) => setField("denumire", e.target.value)} placeholder="Ex: Ciment" className="h-9" />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label className="text-sm text-foreground">Descriere</Label>
                    <Textarea value={draft.descriere} onChange={(e) => setField("descriere", e.target.value)} placeholder="Detalii material..." className="resize-none h-40" />
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
                    <Label className="text-sm text-foreground">Denumire (FR) {draft.limba === "FR" && <span className="text-destructive">*</span>}</Label>
                    <Input disabled={draft.limba !== "FR"} value={draft.denumire_fr} onChange={(e) => setField("denumire_fr", e.target.value)} placeholder="Ex: Ciment" className="h-9" />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label className="text-sm text-foreground">Descriere (FR)</Label>
                    <Textarea
                      disabled={draft.limba !== "FR"}
                      value={draft.descriere_fr}
                      onChange={(e) => setField("descriere_fr", e.target.value)}
                      placeholder="Détails du matériel..."
                      className="resize-none h-40"
                    />
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
              <Button type="submit" className="px-5 bg-amber-600 hover:bg-amber-700 text-white">
                {isDuplicateMode ? "Dublează" : actualMode === "edit" ? "Salvează modificările" : "Adaugă material"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
