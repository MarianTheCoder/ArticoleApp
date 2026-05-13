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
import { faUndo, faCopy, faUpload, faX } from "@fortawesome/free-solid-svg-icons";
import { toast } from "sonner";
import imageCompression from "browser-image-compression";

import { useLoading } from "@/context/LoadingContext";
import { AuthContext } from "@/context/TokenContext";

import { useAddCatalogDef, useEditCatalogDef } from "@/hooks/Database/useCatalog";
import photoAPI from "@/api/photoAPI";

export default function CatalogDefDialog({ open, setOpen, mode = "add", initialData = null, config, tipResursa }) {
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
    unitate_masura: config.defaultUnit,
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
    let isMounted = true;

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
            unitate_masura: initialData.unitate_masura || config.defaultUnit,
            cost: String(initialData.cost).replace(".", ",") || "0,000",
            duplicateSubs: isDuplicateMode ? true : false,
            originalId: isDuplicateMode ? initialData.id : null,
          });

          if (config.hasPhoto) {
            if (isDuplicateMode && initialData.photo_url) {
              try {
                const imageUrl = `${photoAPI}/${initialData.photo_url}`;
                const response = await fetch(imageUrl);
                const blob = await response.blob();

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
                if (isMounted) {
                  setPreviewUrl(null);
                  setSelectedFile(null);
                }
              }
            } else if (!isDuplicateMode && initialData.photo_url) {
              setPreviewUrl(`${photoAPI}/${initialData.photo_url}`);
              setSelectedFile(null);
              setPhotoDeleted(false);
            } else {
              setPreviewUrl(null);
              setSelectedFile(null);
              setPhotoDeleted(false);
            }
          }
        }
      }
    };

    initializeData();

    return () => {
      isMounted = false;
    };
  }, [open, mode, initialData, isDuplicateMode, config]);

  const setField = (key, value) => setDraft((prev) => ({ ...prev, [key]: value }));
  const resetDraft = () => {
    setDraft(defaultDraft);
    setSelectedFile(null);
    setPreviewUrl(null);
    setPhotoDeleted(false);
  };

  // --- FUNCȚIA MAGICĂ DE COMPRESIE ---
  const handleImageUpload = async (file) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Te rog să încarci o imagine validă.", { position: "top-right" });
      return;
    }

    setIsDragging(false);

    if (file.size <= 500 * 1024) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setPhotoDeleted(false);
      return;
    }

    const options = {
      maxSizeMB: 0.5, // Pozele vor fi de maxim 500KB
      maxWidthOrHeight: 1200,
      useWebWorker: true,
    };

    try {
      show(); // Activăm loader-ul global în timpul compresiei

      // 1. Obținem Blob-ul comprimat
      const compressedBlob = await imageCompression(file, options);

      // 2. MAGIA AICI: Reîmpachetăm Blob-ul într-un File adevărat, folosind numele și tipul original!
      const properFile = new File([compressedBlob], file.name, {
        type: file.type,
      });

      // 3. Salvăm în state fișierul curat și corect
      setSelectedFile(properFile);
      setPreviewUrl(URL.createObjectURL(properFile));
      setPhotoDeleted(false);
    } catch (error) {
      console.error("Eroare la compresia imaginii:", error);
      toast.error("Nu am putut procesa imaginea.", { position: "top-right" });
    } finally {
      hide();
    }
  };

  // --- HANDLERE DRAG & DROP ---
  const handleDragOver = (e) => {
    if (!config.hasPhoto) return;
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    if (!config.hasPhoto) return;
    setIsDragging(false);
  };

  const handleDrop = async (e) => {
    if (!config.hasPhoto) return;
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    await handleImageUpload(file);
  };

  const handleFileChange = async (e) => {
    if (!config.hasPhoto) return;
    const file = e.target.files[0];
    await handleImageUpload(file);
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
    if (!draft.cod_definitie.trim()) return toast.warning("Codul este obligatoriu.", { position: "top-right" });
    if (!draft.denumire.trim()) return toast.warning("Denumirea este obligatorie.", { position: "top-right" });
    if (!draft.unitate_masura.trim()) return toast.warning("Unitatea de măsură este obligatorie.", { position: "top-right" });
    if (draft.limba === "FR" && !draft.denumire_fr.trim()) return toast.warning("Dacă limba este FR, atunci denumirea în franceză este obligatorie.", { position: "top-right" });

    const fd = new FormData();
    fd.append("tip_resursa", tipResursa);
    fd.append("limba", draft.limba);
    fd.append("cod_definitie", draft.cod_definitie.trim());
    fd.append("denumire", draft.denumire.trim());
    fd.append("denumire_fr", draft.denumire_fr.trim());
    fd.append("descriere", draft.descriere.trim());
    fd.append("descriere_fr", draft.descriere_fr.trim());
    fd.append("unitate_masura", draft.unitate_masura.trim());
    fd.append("cost", String(parseFloat(draft.cost.replace(",", ".")) || 0));
    fd.append("user_id", user.id);

    if (config.hasPhoto) {
      if (selectedFile) {
        fd.append("photo", selectedFile);
      } else if (photoDeleted) {
        fd.append("delete_photo", "true");
      }
    }

    if (isDuplicateMode && draft.duplicateSubs && draft.originalId) {
      fd.append("duplicate_from_id", draft.originalId);
    }

    show();
    try {
      if (actualMode === "edit") {
        await editDefinitie({ id: initialData.id, data: fd });
        toast.success(`${config.title} a fost actualizat/ă!`, { position: "top-right" });
      } else {
        await addDefinitie(fd);
        toast.success(isDuplicateMode ? `${config.title} a fost dublat/ă cu succes!` : `${config.title} a fost adăugat/ă cu succes!`, { position: "top-right" });
      }
      setOpen(false);
      resetDraft();
    } catch (error) {
      toast.error(error?.response?.data?.message || "A apărut o eroare la salvare.", { position: "top-right" });
    } finally {
      hide();
    }
  };

  // Setăm culorile dinamice
  const buttonColorClass = config.colorClass.replace("text-", "bg-");
  const buttonHoverClass = config.colorClass.replace("text-", "hover:bg-");
  const borderDragClass = config.colorClass.replace("text-", "border-");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="lg:max-w-[70rem] sm:max-w-[40rem] p-0 gap-0 overflow-hidden">
        <form onSubmit={handleSubmit} className="flex flex-col">
          {/* ── HEADER ── */}
          <div className="relative px-6 pt-5 pb-4 bg-muted border-b border-border">
            <div className="flex items-end gap-4">
              <div className={`h-14 w-14 rounded-xl flex items-center justify-center shrink-0 ${config.bgClass}`}>
                <FontAwesomeIcon icon={isDuplicateMode ? faCopy : config.icon} className={`${config.colorClass} text-2xl`} />
              </div>
              <div className="flex-1">
                <p className={`text-sm font-bold uppercase tracking-widest leading-none mb-1 ${config.colorClass}`}>{config.title}</p>
                <h2 className="text-xl font-bold text-foreground leading-tight">
                  {isDuplicateMode ? `Dublează ${config.title.toLowerCase()}` : actualMode === "edit" ? `Editează ${config.title.toLowerCase()}` : `${config.title} nou/ă`}
                </h2>
              </div>
            </div>
          </div>

          {/* ── BODY ── */}
          <div className="px-6 py-4 flex flex-col gap-4 overflow-y-auto max-h-[65vh]">
            {isDuplicateMode && (
              <div className="flex items-center gap-2 p-4 rounded-lg border bg-muted">
                <Switch checked={draft.duplicateSubs} onCheckedChange={(checked) => setField("duplicateSubs", checked)} className={`${config.switchClass} shrink-0`} />
                <label className={`text-sm font-medium leading-none ${config.colorClass}`}>Dublează și variantele atașate.</label>
              </div>
            )}

            {/* Section 1 — Configurare */}
            <div className="flex flex-col gap-2">
              <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Configurare</p>

              <div className="flex gap-5 items-end">
                {/* DROPZONE PENTRU POZĂ - randat DOAR dacă config.hasPhoto este true */}
                {config.hasPhoto && (
                  <div className="relative">
                    <div
                      className={`relative w-24 h-24 shrink-0 border-2 rounded-xl flex items-center justify-center cursor-pointer transition-all overflow-hidden ${
                        isDragging ? `${borderDragClass} scale-105 bg-muted/50` : "border-border hover:bg-muted/50"
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
                )}

                {/* INPUTURILE */}
                <div className="flex-1 grid grid-cols-4 gap-3 mb-1">
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-sm font-semibold">
                      Cod <span className="text-destructive">*</span>
                    </Label>
                    <Input value={draft.cod_definitie} onChange={(e) => setField("cod_definitie", e.target.value)} maxLength={15} className="h-9" />
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
                        {/* Randăm unitățile specifice din config */}
                        {config.unitOptions.map((unit) => (
                          <SelectItem key={unit} value={unit}>
                            {unit}
                          </SelectItem>
                        ))}
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
                      <span className={`text-sm font-bold ${draft.limba !== "FR" ? "text-muted-foreground " : "text-lime-600"}`}>FR</span>
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
              <Button type="submit" className={`px-5 ${buttonColorClass} ${buttonHoverClass} text-white`}>
                {isDuplicateMode ? "Dublează" : actualMode === "edit" ? "Salvează modificările" : `Adaugă ${config.title.toLowerCase()}`}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
