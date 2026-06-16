import React, { useState, useCallback, memo, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger, ContextMenuSeparator } from "@/components/ui/context-menu";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faPenToSquare, faTags, faTrash, faCopy, faLanguage, faColumns } from "@fortawesome/free-solid-svg-icons";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useDeleteCatalogSubDef } from "@/hooks/Database/useCatalog";

import CatalogSubDefDialog from "./CatalogSubDefDialog";
import OverflowTooltip from "@/components/ui/OverflowTooltip";
import photoAPI from "@/api/photoAPI";
import { useLoading } from "@/context/LoadingContext";
import DeleteDialog from "@/components/ui/delete-dialog";
import { toast } from "sonner";
import NoImage from "@/assets/no-image-icon.png";
import ImagePreviewTooltip from "@/components/ui/ImagePreviewTooltip";

// --- MEMOIZED ROW ---
const SubRow = memo(({ sub, config, visibleColumns, displayLang, onEdit, onDuplicate, onDelete }) => {
  const afisareDescriere = displayLang === "FR" ? sub.descriere_fr : sub.descriere;

  const showCol = (colKey) => visibleColumns[colKey];

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <TableRow className="cursor-pointer data-[state=open]:bg-muted border-b transition-colors group hover:bg-accent hover-row-border">
          {/* COLOANA POZĂ */}
          {config.hasPhoto && showCol("poza") && (
            <TableCell className="text-center px-3 xxxl:px-4 py-1.5 xxxl:py-2 w-[5.5rem] xxxl:w-[6rem] max-w-[5.5rem] xxxl:max-w-[6rem]">
              <ImagePreviewTooltip
                src={sub.photo_url ? `${photoAPI}/${sub.photo_url}` : null}
                alt={sub.cod_specific}
                ringColor={`hover:ring-${config.normalColor}`}
                previewMaxHeight="max-h-[30rem]"
                previewMaxWidth="max-w-[30rem]"
                fallback={<img src={NoImage} alt="No Image" className="h-full w-full object-cover opacity-50" />}
                containerClassName="h-12 w-12 xxxl:h-14 xxxl:w-14 rounded-md border border-border bg-muted flex items-center justify-center overflow-hidden shrink-0"
              />
            </TableCell>
          )}

          <TableCell className="text-center px-3 xxxl:px-4 py-2 xxxl:py-4 min-w-[10rem] xxxl:min-w-[12rem] w-[10rem] xxxl:w-[12rem] max-w-[10rem] xxxl:max-w-[12rem] whitespace-nowrap">
            <span className="text-sm xxxl:text-base font-bold text-foreground">{sub.cod_specific}</span>
          </TableCell>

          {/* COLOANĂ FURNIZOR */}
          {config.hasFurnizor && showCol("furnizor") && (
            <TableCell className="text-center px-3 xxxl:px-4 py-1.5 xxxl:py-2 min-w-[10rem] xxxl:min-w-[12rem] w-[10rem] xxxl:w-[12rem] max-w-[10rem] xxxl:max-w-[12rem]">
              {sub.detalii_extra?.furnizor ? <span className="text-sm xxxl:text-base text-foreground">{sub.detalii_extra.furnizor}</span> : <span className="text-sm xxxl:text-base text-muted-foreground/40 italic">—</span>}
            </TableCell>
          )}

          {showCol("descriere") && (
            <TableCell className="px-3 xxxl:px-4 py-1.5 xxxl:py-2 min-w-[28rem] xxxl:min-w-[35rem]">
              <div className="w-full">
                {afisareDescriere ? (
                  <OverflowTooltip align="left" text={afisareDescriere} className="text-sm xxxl:text-base leading-normal text-foreground whitespace-pre-wrap" maxLines={2} />
                ) : (
                  <span className="text-sm xxxl:text-base text-muted-foreground/40 italic">—</span>
                )}
              </div>
            </TableCell>
          )}

          {/* COLOANĂ STATUS */}
          {config.hasStatus && showCol("status") && (
            <TableCell className="text-center px-3 xxxl:px-4 py-1.5 xxxl:py-2 min-w-[10rem] xxxl:min-w-[12rem] w-[10rem] xxxl:w-[12rem] max-w-[10rem] xxxl:max-w-[12rem]">
              {sub.detalii_extra?.status_utilaj ? (
                <span className="text-sm xxxl:text-base text-foreground font-medium">{sub.detalii_extra.status_utilaj}</span>
              ) : (
                <span className="text-sm xxxl:text-base text-muted-foreground/40 italic">—</span>
              )}
            </TableCell>
          )}

          {showCol("cost") && (
            <TableCell className="text-center px-3 xxxl:px-4 py-1.5 xxxl:py-2 min-w-[10rem] xxxl:min-w-[12rem] w-[10rem] xxxl:w-[12rem] max-w-[10rem] xxxl:max-w-[12rem]">
              <span className="font-bold text-sm xxxl:text-base text-foreground">
                {parseFloat(sub.cost || 0)
                  .toFixed(3)
                  .replace(".", ",")}
              </span>
            </TableCell>
          )}

          {/* COLOANA CREAT */}
          {showCol("creat") && (
            <TableCell className="px-3 xxxl:px-4 py-1.5 xxxl:py-2 min-w-[14rem] xxxl:min-w-[16rem] w-[14rem] xxxl:w-[16rem] max-w-[14rem] xxxl:max-w-[16rem]">
              <div className="flex items-center gap-2 xxxl:gap-2.5 h-9 xxxl:h-10 overflow-hidden text-left">
                <Avatar className="h-9 w-9 xxxl:h-10 xxxl:w-10 border rounded-md border-border shadow-sm shrink-0">
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
                  <span className="text-xs xxxl:text-sm font-bold text-foreground truncate block">{sub.created_by_name || "Sistem"}</span>
                  <span className="text-[10px] xxxl:text-[11px] text-muted-foreground mt-0.5">
                    {new Date(sub.created_at).toLocaleDateString("ro-RO")} {new Date(sub.created_at).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </div>
            </TableCell>
          )}

          {/* COLOANA ACTUALIZAT */}
          {showCol("actualizat") && (
            <TableCell className="px-3 xxxl:px-4 py-1.5 xxxl:py-2 min-w-[14rem] xxxl:min-w-[16rem] w-[14rem] xxxl:w-[16rem] max-w-[14rem] xxxl:max-w-[16rem]">
              <div className="flex items-center gap-2 xxxl:gap-2.5 h-9 xxxl:h-10 overflow-hidden text-left">
                <Avatar className="h-9 w-9 xxxl:h-10 xxxl:w-10 border rounded-md border-border shadow-sm shrink-0">
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
                  <span className="text-xs xxxl:text-sm font-bold text-foreground truncate block">{sub.updated_by_name || "Sistem"}</span>
                  <span className="text-[10px] xxxl:text-[11px] text-muted-foreground mt-0.5">
                    {new Date(sub.updated_at).toLocaleDateString("ro-RO")} {new Date(sub.updated_at).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </div>
            </TableCell>
          )}
        </TableRow>
      </ContextMenuTrigger>

      <ContextMenuContent className="w-48">
        <ContextMenuItem className="gap-3" onClick={() => onEdit(sub)}>
          <FontAwesomeIcon className="text-low" icon={faPenToSquare} /> Editează
        </ContextMenuItem>
        <ContextMenuItem className="gap-3" onClick={() => onDuplicate(sub)}>
          <FontAwesomeIcon icon={faCopy} className="text-medium" /> Dublează
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem className="gap-3 text-destructive focus:text-destructive hover:text-destructive" onClick={() => onDelete(sub)}>
          <FontAwesomeIcon icon={faTrash} /> Șterge
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
});

// --- MAIN COMPONENT ---
export default function CatalogSubList({ config, open, setOpen, parentItem }) {
  const { show, hide } = useLoading();
  const [defOpen, setDefOpen] = useState(false);
  const [subDraft, setSubDraft] = useState(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [displayLang, setDisplayLang] = useState("RO");

  const [visibleColumns, setVisibleColumns] = useState({
    poza: config.hasPhoto,
    furnizor: config.hasFurnizor,
    status: config.hasStatus,
    descriere: true,
    cost: true,
    creat: false,
    actualizat: false,
  });

  const { mutateAsync: deleteSubDefinitie } = useDeleteCatalogSubDef();

  const toggleCol = useCallback((key) => {
    setVisibleColumns((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const showCol = useCallback((colKey) => visibleColumns[colKey], [visibleColumns]);

  const handleAddSub = useCallback(() => {
    setSubDraft(null);
    setDefOpen(true);
  }, []);

  const handleEditSub = useCallback((sub) => {
    setSubDraft(sub);
    setDefOpen(true);
  }, []);

  const handleDuplicateSub = useCallback((sub) => {
    setSubDraft({ ...sub, cod_specific: "", isDuplicate: true });
    setDefOpen(true);
  }, []);

  const handleDeleteSub = useCallback((sub) => {
    setItemToDelete(sub);
    setDeleteDialogOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!itemToDelete) return;
    show();
    try {
      await deleteSubDefinitie({ id: itemToDelete.id });
      toast.success("Varianta a fost ștearsă cu succes.", { position: "top-right" });
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Eroare la ștergerea variantei.", { position: "top-right" });
    } finally {
      hide();
    }
  }, [itemToDelete, deleteSubDefinitie, show, hide]);

  const onDisplayLangToggle = useCallback(() => {
    setDisplayLang((prev) => (prev === "RO" ? "FR" : "RO"));
  }, []);

  const buttonColorClass = useMemo(() => config.colorClass.replace("text-", "bg-"), [config.colorClass]);
  const buttonHoverClass = useMemo(() => config.colorClass.replace("text-", "hover:bg-"), [config.colorClass]);

  if (!parentItem) return null;
  const subcategorii = parentItem.subcategorii || [];

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="lg:max-w-[95rem] max-h-[85vh] h-2/3 flex flex-col p-0"
          // --- THIS IS THE KEY FIX: kills the open/close animation lag ---
          style={{ animationDuration: "0ms", transitionDuration: "0ms" }}
        >
          <DialogHeader className="px-4 xxxl:px-6 py-3 xxxl:py-4 rounded-t-md border-b bg-muted flex flex-row items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5 xxxl:gap-3">
              <div className={`h-10 w-10 xxxl:h-12 xxxl:w-12 rounded-xl flex items-center justify-center shrink-0 ${config.bgClass}`}>
                <FontAwesomeIcon icon={config.icon} className={`${config.colorClass} text-lg xxxl:text-xl`} />
              </div>
              <DialogTitle className="text-left max-w-[25rem]">
                <p className="text-xs xxxl:text-sm text-muted-foreground">{parentItem.cod_definitie}</p>
                <OverflowTooltip text={parentItem.denumire} className="text-base xxxl:text-lg font-bold" maxLines={2} />
              </DialogTitle>
            </div>

            <div className="flex items-center gap-2.5 xxxl:gap-3 mr-10">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2 h-9 xxxl:h-10 text-sm xxxl:text-base text-foreground">
                    <FontAwesomeIcon icon={faColumns} />
                    <span>Coloane</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {config.hasPhoto && (
                    <DropdownMenuCheckboxItem checked={visibleColumns.poza} onSelect={(e) => e.preventDefault()} onCheckedChange={() => toggleCol("poza")}>
                      Poză
                    </DropdownMenuCheckboxItem>
                  )}
                  {config.hasFurnizor && (
                    <DropdownMenuCheckboxItem checked={visibleColumns.furnizor} onSelect={(e) => e.preventDefault()} onCheckedChange={() => toggleCol("furnizor")}>
                      Furnizor
                    </DropdownMenuCheckboxItem>
                  )}
                  <DropdownMenuCheckboxItem checked={visibleColumns.descriere} onSelect={(e) => e.preventDefault()} onCheckedChange={() => toggleCol("descriere")}>
                    Descriere
                  </DropdownMenuCheckboxItem>
                  {config.hasStatus && (
                    <DropdownMenuCheckboxItem checked={visibleColumns.status} onSelect={(e) => e.preventDefault()} onCheckedChange={() => toggleCol("status")}>
                      Status
                    </DropdownMenuCheckboxItem>
                  )}
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

              <Button variant="outline" className="gap-2 h-9 xxxl:h-10 text-sm xxxl:text-base text-foreground w-[4.75rem] xxxl:w-[5rem]" onClick={onDisplayLangToggle}>
                <FontAwesomeIcon icon={faLanguage} />
                <span>{displayLang}</span>
              </Button>
              <Button onClick={handleAddSub} className={`gap-2 h-9 xxxl:h-10 px-3 xxxl:px-4 text-sm xxxl:text-base ${buttonColorClass} ${buttonHoverClass} text-white border-transparent`}>
                <FontAwesomeIcon icon={faPlus} /> Adaugă Variantă
              </Button>
            </div>
          </DialogHeader>

          <div className="p-4 xxxl:p-6 overflow-hidden flex-1 flex flex-col">
            {subcategorii.length > 0 ? (
              <div className="rounded-md border bg-card w-full h-full overflow-auto relative">
                <Table className="min-w-full table-fixed caption-bottom text-left border-collapse">
                  <TableHeader className="bg-background sticky top-0 z-20 shadow-sm">
                    <TableRow className="h-9 xxxl:h-10 hover:bg-muted-foreground/25 bg-muted-foreground/25 border-b">
                      {config.hasPhoto && showCol("poza") && <TableHead className="text-center px-3 xxxl:px-4 w-[5.5rem] xxxl:w-[6rem] max-w-[5.5rem] xxxl:max-w-[6rem]">Poză</TableHead>}
                      <TableHead className="text-center px-3 xxxl:px-4 w-[10rem] xxxl:w-[12rem] max-w-[10rem] xxxl:max-w-[12rem]">Cod Variantă</TableHead>
                      {config.hasFurnizor && showCol("furnizor") && <TableHead className="text-center px-3 xxxl:px-4 w-[10rem] xxxl:w-[12rem] max-w-[10rem] xxxl:max-w-[12rem]">Furnizor</TableHead>}
                      {showCol("descriere") && <TableHead className="px-3 xxxl:px-4 min-w-[28rem] xxxl:min-w-[35rem]">Descriere</TableHead>}
                      {config.hasStatus && showCol("status") && <TableHead className="text-center px-3 xxxl:px-4 w-[10rem] xxxl:w-[12rem] max-w-[10rem] xxxl:max-w-[12rem]">Status</TableHead>}
                      {showCol("cost") && <TableHead className="text-center px-3 xxxl:px-4 w-[10rem] xxxl:w-[12rem] max-w-[10rem] xxxl:max-w-[12rem]">Cost</TableHead>}
                      {showCol("creat") && <TableHead className="text-left px-3 xxxl:px-4 w-[14rem] xxxl:w-[16rem] max-w-[14rem] xxxl:max-w-[16rem]">Creat</TableHead>}
                      {showCol("actualizat") && <TableHead className="text-left px-3 xxxl:px-4 w-[14rem] xxxl:w-[16rem] max-w-[14rem] xxxl:max-w-[16rem]">Actualizat</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subcategorii.map((sub) => (
                      <SubRow
                        key={sub.id}
                        sub={sub}
                        config={config}
                        visibleColumns={visibleColumns}
                        displayLang={displayLang}
                        onEdit={handleEditSub}
                        onDuplicate={handleDuplicateSub}
                        onDelete={handleDeleteSub}
                      />
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground rounded-xl">
                <FontAwesomeIcon icon={faTags} className="text-3xl xxxl:text-4xl mb-3 xxxl:mb-4 opacity-60" />
                <p className="text-base xxxl:text-lg">Nu există variante definite pentru acest/această {config.title.toLowerCase()}.</p>
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
      <CatalogSubDefDialog config={config} open={defOpen} setOpen={setDefOpen} mode={subDraft ? "edit" : "add"} initialData={subDraft} definitieId={parentItem.id} tipResursa={config.id} />
    </>
  );
}
