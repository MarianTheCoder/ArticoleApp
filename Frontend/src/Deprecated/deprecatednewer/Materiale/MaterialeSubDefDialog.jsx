import React, { useContext, useEffect, useState, useRef } from "react";
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTags, faUndo, faSave, faCopy, faUpload, faTrash, faX } from "@fortawesome/free-solid-svg-icons";
import { toast } from "sonner";
import { useLoading } from "@/context/LoadingContext";
import { AuthContext } from "@/context/TokenContext";
import { useAddCatalogSubDef, useEditCatalogSubDef } from "@/hooks/Database/useCatalog";
import photoAPI from "@/api/photoAPI";

export default function MaterialeSubDefDialog({ open, setOpen, mode = "add", initialData = null, definitieId }) {
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
    furnizor: "", // Câmp nou JSON
  };

  const [draft, setDraft] = useState(defaultDraft);

  // --- STATE-URI DRAG & DROP ---
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
            cod_specific: initialData.cod_specific || "",
            descriere: initialData.descriere || "",
            descriere_fr: initialData.descriere_fr || "",
            cost: initialData.cost?.toString().replace(".", ",") || "0,000",
            furnizor: initialData.detalii_extra?.furnizor || "", // Extragem din JSON
          });

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
        } else {
          setDraft(defaultDraft);
          setPreviewUrl(null);
          setSelectedFile(null);
          setPhotoDeleted(false);
        }
      }
    };

    initializeData();
    return () => {
      isMounted = false;
    };
  }, [open, mode, initialData, isDuplicateMode]);

  const setField = (key, value) => setDraft((prev) => ({ ...prev, [key]: value }));

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
      toast.error("Te rog să încarci o imagine validă.");
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
    if (!draft.cod_specific.trim()) return toast.warning("Codul specific este obligatoriu.");

    const fd = new FormData();
    fd.append("definitie_id", definitieId);
    fd.append("cod_specific", draft.cod_specific.trim());
    fd.append("descriere", draft.descriere.trim());
    fd.append("descriere_fr", draft.descriere_fr.trim());
    fd.append("cost", String(parseFloat(draft.cost.replace(",", ".")) || 0));
    fd.append("user_id", user.id);

    // Ambalăm câmpurile extra într-un obiect JSON și îl transformăm în string
    const detaliiExtraObj = {
      furnizor: draft.furnizor.trim(),
    };
    fd.append("detalii_extra", JSON.stringify(detaliiExtraObj));

    if (selectedFile) {
      fd.append("photo", selectedFile);
    } else if (photoDeleted) {
      fd.append("delete_photo", "true");
    }

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
              <div className="h-14 w-14 rounded-lg bg-amber-600/15 border-2 border-amber-600/25 flex items-center justify-center shrink-0">
                <FontAwesomeIcon icon={isDuplicateMode ? faCopy : faTags} className="text-amber-600 text-2xl" />
              </div>
              <div>
                <p className="text-sm font-bold text-amber-600 uppercase tracking-widest mb-0.5">Variantă Material</p>
                <DialogTitle className="text-lg font-bold">{isDuplicateMode ? "Dublează variantă" : actualMode === "edit" ? "Editează variantă" : "Adaugă variantă nouă"}</DialogTitle>
              </div>
            </div>
          </div>

          <div className="px-6 py-4 flex flex-col gap-4">
            <div className="flex gap-5 items-center">
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

              {/* INPUTURILE COD / COST / FURNIZOR */}
              <div className="flex-1 grid grid-cols-3 gap-4 mb-1">
                <div className="flex flex-col gap-1.5">
                  <Label className="font-semibold text-sm text-foreground">
                    Cod Specific <span className="text-destructive">*</span>
                  </Label>
                  <Input value={draft.cod_specific} onChange={(e) => setField("cod_specific", e.target.value)} maxLength={15} className="h-9" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="font-semibold text-sm text-foreground">Furnizor (Opțional)</Label>
                  <Input value={draft.furnizor} onChange={(e) => setField("furnizor", e.target.value)} placeholder="Ex: Dedeman, Arabesque" className="h-9" />
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
            </div>

            {/* TEXTE RO / FR */}
            <div className="grid grid-cols-2 gap-4 mt-2">
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
                    setSelectedFile(null);
                    setPreviewUrl(null);
                  }}
                  className="mr-auto text-muted-foreground"
                >
                  <FontAwesomeIcon icon={faUndo} className="mr-2" /> Resetează
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <DialogClose asChild>
                <Button variant="outline" type="button">
                  Anulează
                </Button>
              </DialogClose>
              <Button type="submit" className="bg-amber-600 hover:bg-amber-700">
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
