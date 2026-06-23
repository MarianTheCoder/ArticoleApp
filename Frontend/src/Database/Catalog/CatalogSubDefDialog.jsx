import React, { useContext, useEffect, useState, useRef } from "react";
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUndo, faSave, faCopy, faUpload, faX } from "@fortawesome/free-solid-svg-icons";
import { toast } from "sonner";
import { useLoading } from "@/context/LoadingContext";
import { AuthContext } from "@/context/TokenContext";
import { useAddCatalogSubDef, useCatalogMeta, useEditCatalogSubDef } from "@/hooks/Database/useCatalog";
import photoAPI from "@/api/photoAPI";
import imageCompression from "browser-image-compression";
import CatalogMetaSelect from "./CatalogMetaSelect";
import CatalogMetaDialog from "./CatalogMetaDialog";

const formatDecimalInputValue = (value) => {
  const numberValue = Number(value || 0);
  return Number.isFinite(numberValue) ? numberValue.toFixed(2).replace(".", ",") : "0,00";
};

export default function CatalogSubDefDialog({ config, open, setOpen, mode = "add", initialData = null, definitieId, tipResursa }) {
  const { show, hide } = useLoading();
  const { user } = useContext(AuthContext);
  const { mutateAsync: addSubDef } = useAddCatalogSubDef();
  const { mutateAsync: editSubDef } = useEditCatalogSubDef();
  const { data: furnizoriData } = useCatalogMeta("furnizori");
  const { data: marciData } = useCatalogMeta("marci");

  const isDuplicateMode = initialData?.isDuplicate === true;
  const actualMode = isDuplicateMode ? "add" : mode;
  const supportsVariantMeta = config.id === "material" || config.id === "utilaj";

  const defaultDraft = {
    cod_specific: "",
    descriere: "",
    descriere_fr: "",
    cost: "0,00",
    furnizor: "", // Preluat doar dacă config.hasFurnizor este true
    furnizor_id: null,
    marca: "",
    marca_id: null,
    status_utilaj: "Nou", // Preluat doar dacă config.hasStatus este true
  };

  const [draft, setDraft] = useState(defaultDraft);
  const [furnizoriDialogOpen, setFurnizoriDialogOpen] = useState(false);
  const [marciDialogOpen, setMarciDialogOpen] = useState(false);

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
            cost: initialData.cost != null ? formatDecimalInputValue(initialData.cost) : "0,00",
            furnizor: config.hasFurnizor ? initialData.detalii_extra?.furnizor || "" : "",
            furnizor_id: config.hasFurnizor ? initialData.furnizor_id || null : null,
            marca: supportsVariantMeta ? initialData.detalii_extra?.marca || "" : "",
            marca_id: supportsVariantMeta ? initialData.marca_id || null : null,
            status_utilaj: config.hasStatus ? initialData.detalii_extra?.status_utilaj || "Nou" : "Nou",
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
                console.log("Eroare la încărcarea pozei originale:", error);
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
        } else {
          setDraft(defaultDraft);
          setPreviewUrl(null);
          setSelectedFile(null);
          setPhotoDeleted(false);
        }
      } else {
        // Resetăm starea la închiderea dialogului
        setDraft(defaultDraft);
        setSelectedFile(null);
        setPreviewUrl(null);
        setPhotoDeleted(false);
      }
    };

    initializeData();
    return () => {
      isMounted = false;
    };
  }, [open, mode, initialData, isDuplicateMode, config, supportsVariantMeta]);

  const setField = (key, value) => setDraft((prev) => ({ ...prev, [key]: value }));

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
    if (previewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
  };

  const handleImageUpload = async (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Te rog să încarci o imagine validă.", { position: "top-right" });
      return;
    }
    setIsDragging(false);

    // dacă e deja sub 500KB, o folosim direct
    if (file.size <= 500 * 1024) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setPhotoDeleted(false);
      return;
    }

    const options = {
      maxSizeMB: 0.5,
      maxWidthOrHeight: 1200,
      useWebWorker: true,
    };
    try {
      show();
      // comprimăm imaginea
      const compressedBlob = await imageCompression(file, options);
      // blob -> File real
      const properFile = new File([compressedBlob], file.name, {
        type: file.type,
      });

      setSelectedFile(properFile);
      setPreviewUrl(URL.createObjectURL(properFile));
      setPhotoDeleted(false);
    } catch (error) {
      console.log("Eroare la compresia imaginii:", error);
      toast.error("Nu am putut procesa imaginea.", { position: "top-right" });
    } finally {
      hide();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!draft.cod_specific.trim()) return toast.warning("Codul specific este obligatoriu.", { position: "top-right" });

    const fd = new FormData();
    fd.append("definitie_id", definitieId);
    fd.append("tip_resursa", tipResursa);
    fd.append("cod_specific", draft.cod_specific.trim());
    fd.append("descriere", draft.descriere.trim());
    fd.append("descriere_fr", draft.descriere_fr.trim());
    fd.append("cost", String(parseFloat(draft.cost.replace(",", ".")) || 0));
    fd.append("user_id", user.id);
    fd.append("furnizor_id", draft.furnizor_id || "");
    fd.append("marca_id", draft.marca_id || "");

    // Construim obiectul detalii_extra doar cu câmpurile necesare
    const detaliiExtraObj = {};
    const selectedFurnizor = (furnizoriData?.items || []).find((item) => String(item.id) === String(draft.furnizor_id));
    const selectedMarca = (marciData?.items || []).find((item) => String(item.id) === String(draft.marca_id));

    if (config.hasFurnizor) detaliiExtraObj.furnizor = String(selectedFurnizor?.denumire || draft.furnizor || "").trim();
    if (supportsVariantMeta) {
      detaliiExtraObj.marca = String(selectedMarca?.denumire || draft.marca || "").trim();
    }
    if (config.hasStatus) detaliiExtraObj.status_utilaj = draft.status_utilaj;

    if (Object.keys(detaliiExtraObj).length > 0) {
      fd.append("detalii_extra", JSON.stringify(detaliiExtraObj));
    }

    if (config.hasPhoto) {
      if (selectedFile) {
        fd.append("photo", selectedFile);
      } else if (photoDeleted) {
        fd.append("delete_photo", "true");
      }
    }

    show();
    try {
      if (actualMode === "edit") {
        await editSubDef({ id: initialData.id, data: fd });
        toast.success("Varianta a fost actualizată!", { position: "top-right" });
      } else {
        await addSubDef(fd);
        toast.success(isDuplicateMode ? "Varianta a fost dublată cu succes!" : "Varianta a fost adăugată!", { position: "top-right" });
      }
      setOpen(false);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Eroare la salvare.", { position: "top-right" });
    } finally {
      hide();
    }
  };

  const buttonColorClass = config.colorClass.replace("text-", "bg-");
  const buttonHoverClass = config.colorClass.replace("text-", "hover:bg-");
  const detailsGridClass = supportsVariantMeta ? "grid-cols-5" : config.id === "utilaj" ? "grid-cols-4" : "grid-cols-3";
  const furnizoriOptions = furnizoriData?.items || [];
  const marciOptions = marciData?.items || [];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[70rem] p-0 gap-0 overflow-hidden">
        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="px-4 xxxl:px-6 pt-4 xxxl:pt-5 pb-3 xxxl:pb-4 bg-muted border-b border-border">
            <div className="flex items-center gap-3 xxxl:gap-4">
              <div className={`h-12 w-12 xxxl:h-14 xxxl:w-14 rounded-lg flex items-center justify-center shrink-0 ${config.bgClass}`}>
                <FontAwesomeIcon icon={isDuplicateMode ? faCopy : config.icon} className={`text-xl xxxl:text-2xl ${config.colorClass}`} />
              </div>
              <div>
                <p className={`text-xs xxxl:text-sm font-bold uppercase tracking-widest mb-0.5 ${config.colorClass}`}>Variantă {config.title}</p>
                <DialogTitle className="text-base xxxl:text-lg font-bold">{isDuplicateMode ? "Dublează variantă" : actualMode === "edit" ? "Editează variantă" : "Adaugă variantă nouă"}</DialogTitle>
              </div>
            </div>
          </div>

          <div className="px-4 xxxl:px-6 py-3 xxxl:py-4 flex flex-col gap-3 xxxl:gap-4">
            <div className="flex gap-4 xxxl:gap-5 items-center">
              {/* DROPZONE PENTRU POZĂ */}
              {config.hasPhoto && (
                <div className="relative">
                  <div
                    className={`relative w-20 h-20 xxxl:w-24 xxxl:h-24 shrink-0 border-2 rounded-xl flex items-center justify-center cursor-pointer transition-all overflow-hidden ${
                      isDragging ? `border-${config.normalColor} scale-105` : "border-border hover:bg-muted/50"
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
                        <FontAwesomeIcon icon={faUpload} className="text-lg xxxl:text-xl" />
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

              {/* INPUTURILE COD / COST / FURNIZOR / STATUS */}
              <div className={`flex-1 grid ${detailsGridClass} gap-3 xxxl:gap-4 mb-1`}>
                <div className="flex flex-col gap-1 xxxl:gap-1.5">
                  <Label className="font-semibold text-xs xxxl:text-sm text-foreground">
                    Cod Specific <span className="text-destructive">*</span>
                  </Label>
                  <Input value={draft.cod_specific} onChange={(e) => setField("cod_specific", e.target.value)} maxLength={15} className="h-9" />
                </div>

                {/* Afișăm Furnizor SAU Status pe baza config-ului */}
                {config.hasFurnizor && (
                  <div className="flex flex-col gap-1 xxxl:gap-1.5">
                    <Label className="font-semibold text-xs xxxl:text-sm text-foreground">Furnizor (Opțional)</Label>
                    <CatalogMetaSelect
                      label="Furnizor"
                      valueId={draft.furnizor_id}
                      fallbackValue={draft.furnizor}
                      options={furnizoriOptions}
                      onChange={(id, denumire) => {
                        setField("furnizor_id", id);
                        setField("furnizor", denumire);
                      }}
                      onManage={() => setFurnizoriDialogOpen(true)}
                    />
                  </div>
                )}

                {supportsVariantMeta && (
                  <div className="flex flex-col gap-1 xxxl:gap-1.5">
                    <Label className="font-semibold text-xs xxxl:text-sm text-foreground">Marcă (Opțional)</Label>
                    <CatalogMetaSelect
                      label="Marcă"
                      valueId={draft.marca_id}
                      fallbackValue={draft.marca}
                      options={marciOptions}
                      onChange={(id, denumire) => {
                        setField("marca_id", id);
                        setField("marca", denumire);
                      }}
                      onManage={() => setMarciDialogOpen(true)}
                    />
                  </div>
                )}

                {config.hasStatus && (
                  <div className="flex flex-col gap-1 xxxl:gap-1.5">
                    <Label className="font-semibold text-xs xxxl:text-sm text-foreground">Status {config.title}</Label>
                    <Select value={draft.status_utilaj} onValueChange={(v) => setField("status_utilaj", v)}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Nou">Nou</SelectItem>
                        <SelectItem value="Ca nou">Ca nou</SelectItem>
                        <SelectItem value="Utilizat">Utilizat</SelectItem>
                        <SelectItem value="Utilizat grav">Uzură avansată</SelectItem>
                        <SelectItem value="Stricat">Stricat</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="flex flex-col gap-1 xxxl:gap-1.5">
                  <Label className="font-semibold text-xs xxxl:text-sm text-foreground">Cost</Label>
                  <Input
                    type="text"
                    value={draft.cost}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (/^\d{0,7}\,?\d{0,2}$/.test(val)) setField("cost", val);
                    }}
                    className="h-9"
                  />
                </div>
              </div>
            </div>

            {/* TEXTE RO / FR */}
            <div className="grid grid-cols-2 gap-3 xxxl:gap-4 mt-1 xxxl:mt-2">
              <div className="flex flex-col gap-1.5 xxxl:gap-2 p-3 xxxl:p-4 rounded-lg border bg-muted/20">
                <div className="flex items-center gap-2 mb-1">
                  <div className="rounded-md p-1 px-2 bg-cyan-500/5 border border-cyan-500 flex items-center justify-center">
                    <span className="text-sm font-bold text-cyan-600">RO</span>
                  </div>
                  <span className="text-sm xxxl:text-base text-foreground">Descriere</span>
                </div>
                <Textarea value={draft.descriere} onChange={(e) => setField("descriere", e.target.value)} placeholder="Detalii specifice..." className="resize-none h-40 xxxl:h-48 text-sm" />
              </div>

              <div className="flex flex-col gap-1.5 xxxl:gap-2 p-3 xxxl:p-4 rounded-lg border bg-muted/20">
                <div className="flex items-center gap-2 mb-1">
                  <div className="rounded-md p-1 px-2 bg-lime-500/5 border border-lime-500 flex items-center justify-center">
                    <span className="text-sm font-bold text-lime-600">FR</span>
                  </div>
                  <span className="text-sm xxxl:text-base text-foreground">Descriere (FR)</span>
                </div>
                <Textarea value={draft.descriere_fr} onChange={(e) => setField("descriere_fr", e.target.value)} placeholder="Détails spécifiques..." className="resize-none h-40 xxxl:h-48 text-sm" />
              </div>
            </div>
          </div>

          <DialogFooter className="px-4 xxxl:px-6 py-3 xxxl:py-4 border-t bg-muted/5 gap-2">
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
                  className="h-9 xxxl:h-10 mr-auto text-sm xxxl:text-base text-muted-foreground"
                >
                  <FontAwesomeIcon icon={faUndo} className="mr-2" /> Resetează
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <DialogClose asChild>
                <Button variant="outline" type="button" className="h-9 xxxl:h-10 text-sm xxxl:text-base">
                  Anulează
                </Button>
              </DialogClose>
              <Button type="submit" className={`h-9 xxxl:h-10 text-sm xxxl:text-base ${buttonColorClass} ${buttonHoverClass} text-white`}>
                <FontAwesomeIcon icon={isDuplicateMode ? faCopy : faSave} className="mr-2" />
                {isDuplicateMode ? "Dublează" : actualMode === "edit" ? "Salvează" : "Adaugă"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
      <CatalogMetaDialog type="furnizori" open={furnizoriDialogOpen} setOpen={setFurnizoriDialogOpen} />
      <CatalogMetaDialog type="marci" open={marciDialogOpen} setOpen={setMarciDialogOpen} />
    </Dialog>
  );
}
