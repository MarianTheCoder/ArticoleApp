import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger, ContextMenuSeparator } from "@/components/ui/context-menu";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faPenToSquare, faTags, faTrash, faCopy, faBoxOpen, faLanguage, faColumns, faScrewdriverWrench } from "@fortawesome/free-solid-svg-icons";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useDeleteCatalogSubDef } from "@/hooks/Database/useCatalog";

import MaterialeSubDefDialog from "./MaterialeSubDefDialog";
import OverflowTooltip from "@/components/ui/OverflowTooltip";
import photoAPI from "@/api/photoAPI";
import { useLoading } from "@/context/LoadingContext";
import DeleteDialog from "@/components/ui/delete-dialog";
import { toast } from "sonner";
import NoImage from "@/assets/no-image-icon.png"; // Iconița pentru când nu ai poză
import { Badge } from "lucide-react";
import ImagePreviewTooltip from "@/components/ui/ImagePreviewTooltip";

export default function MaterialeSubList({ open, setOpen, parentItem }) {
  const { show, hide } = useLoading();
  const [defOpen, setDefOpen] = useState(false);
  const [subDraft, setSubDraft] = useState(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [displayLang, setDisplayLang] = useState("RO");

  const [visibleColumns, setVisibleColumns] = useState({
    poza: true, // Am adăugat poza și pe rândul copiilor
    furnizor: true, // Adăugat la state
    descriere: true,
    cost: true,
    creat: false,
    actualizat: false,
  });

  const { mutateAsync: deleteSubDefinitie } = useDeleteCatalogSubDef();

  const toggleCol = (key) => {
    setVisibleColumns((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const showCol = (colKey) => visibleColumns[colKey];

  if (!parentItem) return null;
  const subcategorii = parentItem.subcategorii || [];

  const handleAddSub = () => {
    setSubDraft(null);
    setDefOpen(true);
  };

  const handleEditSub = (sub) => {
    setSubDraft(sub);
    setDefOpen(true);
  };

  const handleDuplicateSub = (sub) => {
    setSubDraft({
      ...sub,
      cod_specific: "",
      isDuplicate: true,
    });
    setDefOpen(true);
  };

  const handleDeleteSub = (sub) => {
    setItemToDelete(sub);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    show();
    try {
      await deleteSubDefinitie({
        id: itemToDelete.id,
      });
      toast.success("Varianta a fost ștearsă cu succes.");
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Eroare la ștergerea variantei.");
    } finally {
      hide();
    }
  };

  const onDisplayLangToggle = () => {
    setDisplayLang((prev) => (prev === "RO" ? "FR" : "RO"));
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="lg:max-w-[95rem] max-h-[85vh] h-2/3 flex flex-col p-0">
          <DialogHeader className="px-6 py-4 border-b bg-muted flex flex-row items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="h-14 w-14 rounded-xl bg-amber-600/15 border-2 border-amber-600/25 flex items-center justify-center shrink-0">
                <FontAwesomeIcon icon={faScrewdriverWrench} className="text-amber-600 text-2xl" />
              </div>
              <DialogTitle className="text-left max-w-[25rem]">
                <p className="text-sm text-muted-foreground">{parentItem.cod_definitie}</p>
                <OverflowTooltip text={parentItem.denumire} className="text-lg font-bold" maxLines={2} />
              </DialogTitle>
            </div>

            <div className="flex items-center gap-3 mr-10">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2 h-10 text-foreground">
                    <FontAwesomeIcon icon={faColumns} />
                    <span>Coloane</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuCheckboxItem checked={visibleColumns.poza} onSelect={(e) => e.preventDefault()} onCheckedChange={() => toggleCol("poza")}>
                    Poză
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem checked={visibleColumns.furnizor} onSelect={(e) => e.preventDefault()} onCheckedChange={() => toggleCol("furnizor")}>
                    Furnizor
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem checked={visibleColumns.descriere} onSelect={(e) => e.preventDefault()} onCheckedChange={() => toggleCol("descriere")}>
                    Descriere
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem checked={visibleColumns.cost} onSelect={(e) => e.preventDefault()} onCheckedChange={() => toggleCol("cost")}>
                    Cost
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem checked={visibleColumns.creat} onSelect={(e) => e.preventDefault()} onCheckedChange={() => toggleCol("creat")}>
                    Creat
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem checked={visibleColumns.actualizat} onSelect={(e) => e.preventDefault()} onCheckedChange={() => toggleCol("actualizat")}>
                    Actualizat
                  </DropdownMenuCheckboxItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button variant="outline" className="gap-2 h-10 text-foreground w-[5rem]" onClick={onDisplayLangToggle}>
                <FontAwesomeIcon icon={faLanguage} />
                <span>{displayLang}</span>
              </Button>
              <Button onClick={handleAddSub} className="gap-2 bg-amber-600 hover:bg-amber-700 h-10">
                <FontAwesomeIcon icon={faPlus} /> Adaugă Variantă
              </Button>
            </div>
          </DialogHeader>

          <div className="p-6 overflow-hidden flex-1 flex flex-col">
            {subcategorii.length > 0 ? (
              <div className="rounded-md border bg-card w-full h-full overflow-auto relative">
                <Table className="min-w-full table-fixed caption-bottom text-left border-collapse">
                  <TableHeader className="bg-background sticky top-0 z-20 shadow-sm">
                    <TableRow className="h-16 hover:bg-muted-foreground/25 bg-muted-foreground/25 border-b">
                      {showCol("poza") && <TableHead className="text-center px-4 w-[6rem] max-w-[6rem]">Poză</TableHead>}
                      <TableHead className="text-center px-4 w-[12rem] max-w-[12rem]">Cod Variantă</TableHead>
                      {showCol("furnizor") && <TableHead className="text-center px-4 w-[12rem] max-w-[12rem]">Furnizor</TableHead>}
                      {showCol("descriere") && <TableHead className="px-4 min-w-[35rem]">Descriere</TableHead>}
                      {showCol("cost") && <TableHead className="text-center px-4 w-[12rem] max-w-[12rem]">Cost (RON)</TableHead>}
                      {showCol("creat") && <TableHead className="text-left px-4 w-[16rem] max-w-[16rem]">Creat</TableHead>}
                      {showCol("actualizat") && <TableHead className="text-left px-4 w-[16rem] max-w-[16rem]">Actualizat</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subcategorii.map((sub) => {
                      const afisareDescriere = displayLang === "FR" ? sub.descriere_fr : sub.descriere;
                      console.log("Subcategorie:", sub); // --- IGNORE ---
                      return (
                        <ContextMenu key={sub.id}>
                          <ContextMenuTrigger asChild>
                            <TableRow className="cursor-pointer data-[state=open]:bg-muted border-b transition-colors group hover:bg-accent hover-row-border">
                              {/* COLOANA POZĂ (Copil) */}
                              {showCol("poza") && (
                                <TableCell className="text-center px-4 py-2 w-[6rem] max-w-[6rem]">
                                  <ImagePreviewTooltip
                                    src={sub.photo_url ? `${photoAPI}/${sub.photo_url}` : null}
                                    alt={sub.cod_specific}
                                    ringColor="hover:ring-amber-600"
                                    previewMaxHeight="max-h-[30rem]"
                                    previewMaxWidth="max-w-[30rem]"
                                    fallback={<img src={NoImage} alt="No Image" className="h-full w-full object-cover opacity-50" />}
                                    containerClassName="h-14 w-14 rounded-md border border-border bg-muted flex items-center justify-center overflow-hidden shrink-0"
                                  />
                                </TableCell>
                              )}

                              <TableCell className="text-center px-4 py-4 min-w-[12rem] w-[12rem] max-w-[12rem] whitespace-nowrap">
                                <span className="text-base font-bold text-foreground">{sub.cod_specific}</span>
                              </TableCell>
                              {/* COLOANĂ FURNIZOR */}
                              {showCol("furnizor") && (
                                <TableCell onClick={() => console.log("Furnizor clicked", sub.detalii_extra?.furnizor)} className="text-center px-4 py-2 min-w-[12rem] w-[12rem] max-w-[12rem]">
                                  {sub.detalii_extra?.furnizor ? (
                                    <span className="text-base text-foreground">{sub.detalii_extra.furnizor}</span>
                                  ) : (
                                    <span className="text-base text-muted-foreground/40 italic">—</span>
                                  )}
                                </TableCell>
                              )}

                              {showCol("descriere") && (
                                <TableCell className="px-4 py-2 min-w-[35rem]">
                                  <div className="w-full">
                                    {afisareDescriere ? (
                                      <OverflowTooltip text={afisareDescriere} className="text-base leading-normal text-foreground whitespace-pre-wrap" maxLines={2} />
                                    ) : (
                                      <span className="text-base text-muted-foreground/40 italic">—</span>
                                    )}
                                  </div>
                                </TableCell>
                              )}

                              {showCol("cost") && (
                                <TableCell className="text-center px-4 py-2 min-w-[12rem] w-[12rem] max-w-[12rem]">
                                  <span className="font-bold text-base text-foreground">
                                    {parseFloat(sub.cost || 0)
                                      .toFixed(3)
                                      .replace(".", ",")}
                                  </span>
                                </TableCell>
                              )}

                              {showCol("creat") && (
                                <TableCell className="px-4 py-2 min-w-[16rem] w-[16rem] max-w-[16rem]">
                                  <div className="flex items-center gap-2.5 h-10 overflow-hidden text-left">
                                    <Avatar className="h-10 w-10 border rounded-md border-border shadow-sm shrink-0">
                                      <AvatarImage src={`${photoAPI}/${sub.created_by_photo_url}`} alt={sub.created_by_name} className="object-cover" />
                                      <AvatarFallback className="text-[10px] rounded-md bg-muted font-bold">
                                        {sub.created_by_name
                                          ?.split(" ")
                                          .map((n) => n[0])
                                          .join("")
                                          .toUpperCase() || "S"}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col justify-center min-w-0 leading-tight">
                                      <span className="text-sm font-bold text-foreground truncate block">{sub.created_by_name || "Sistem"}</span>
                                      <span className="text-[11px] text-muted-foreground mt-0.5">
                                        {new Date(sub.created_at).toLocaleDateString("ro-RO")} {new Date(sub.created_at).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" })}
                                      </span>
                                    </div>
                                  </div>
                                </TableCell>
                              )}

                              {showCol("actualizat") && (
                                <TableCell className="px-4 py-2 min-w-[16rem] w-[16rem] max-w-[16rem]">
                                  <div className="flex items-center gap-2.5 h-10 overflow-hidden text-left">
                                    <Avatar className="h-10 w-10 border rounded-md border-border shadow-sm shrink-0">
                                      <AvatarImage src={`${photoAPI}/${sub.updated_by_photo_url}`} alt={sub.updated_by_name} className="object-cover" />
                                      <AvatarFallback className="text-[10px] rounded-md bg-muted font-bold">
                                        {sub.updated_by_name
                                          ?.split(" ")
                                          .map((n) => n[0])
                                          .join("")
                                          .toUpperCase() || "S"}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col justify-center min-w-0 leading-tight">
                                      <span className="text-sm font-bold text-foreground truncate block">{sub.updated_by_name || "Sistem"}</span>
                                      <span className="text-[11px] text-muted-foreground mt-0.5">
                                        {new Date(sub.updated_at).toLocaleDateString("ro-RO")} {new Date(sub.updated_at).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" })}
                                      </span>
                                    </div>
                                  </div>
                                </TableCell>
                              )}
                            </TableRow>
                          </ContextMenuTrigger>
                          <ContextMenuContent className="w-48">
                            <ContextMenuItem className="gap-3" onClick={() => handleEditSub(sub)}>
                              <FontAwesomeIcon className="text-low" icon={faPenToSquare} /> Editează
                            </ContextMenuItem>
                            <ContextMenuItem className="gap-3" onClick={() => handleDuplicateSub(sub)}>
                              <FontAwesomeIcon icon={faCopy} className="text-medium" /> Dublează
                            </ContextMenuItem>
                            <ContextMenuSeparator />
                            <ContextMenuItem className="gap-3 text-destructive focus:text-destructive hover:text-destructive" onClick={() => handleDeleteSub(sub)}>
                              <FontAwesomeIcon icon={faTrash} /> Șterge
                            </ContextMenuItem>
                          </ContextMenuContent>
                        </ContextMenu>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground rounded-xl">
                <FontAwesomeIcon icon={faTags} className="text-4xl mb-4 opacity-60" />
                <p className="text-lg">Nu există variante definite pentru acest material.</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      <DeleteDialog
        open={deleteDialogOpen}
        setOpen={setDeleteDialogOpen}
        title="Șterge Varianta"
        description={`Ești sigur că vrei să ștergi varianta "${itemToDelete?.cod_specific}"? Această acțiune este ireversibilă.`}
        onSubmit={handleConfirmDelete}
        useCode={false}
      />
      <MaterialeSubDefDialog open={defOpen} setOpen={setDefOpen} mode={subDraft ? "edit" : "add"} initialData={subDraft} definitieId={parentItem.id} />
    </>
  );
}
