import React, { useState, useCallback, useMemo, memo, useRef, useEffect } from "react";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger, ContextMenuSeparator } from "@/components/ui/context-menu";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faPenToSquare, faTrash, faColumns, faDatabase, faBoxOpen, faCheck, faLanguage, faPenSquare, faFilePen } from "@fortawesome/free-solid-svg-icons";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import OverflowTooltip from "@/components/ui/OverflowTooltip";
import DeleteDialog from "@/components/ui/delete-dialog";
import ImagePreviewTooltip from "@/components/ui/ImagePreviewTooltip";
import NoImage from "@/assets/no-image-icon.png";
import photoAPI from "@/api/photoAPI";
import { toast } from "sonner";
import { useLoading } from "@/context/LoadingContext";
import CatalogSubList from "../Catalog/CatalogSubList";

import CatalogMainPage from "../Catalog/CatalogMainPage";
import { useAddRetetaElement, useDeleteRetetaElement, useEditRetetaElement } from "@/hooks/Database/useRetete";
import { resurseConfig } from "../Catalog/resurseConfig"; // ajustează path-ul dacă fișierul este în alt folder
import CatalogDefDialog from "../Catalog/CatalogDefDialog";

const VISIBLE_COLUMNS_STORAGE_KEY = "retete_sub_visible_columns";
const VISIBLE_COLUMNS_MIGRATION_KEY = "retete_sub_visible_columns_descriere_hidden_v1";

const DEFAULT_VISIBLE_COLUMNS = {
  poza: true,
  variante: true,
  cod: true,
  denumire: true,
  descriere: false,
  furnizor: false,
  marca: false,
  unitate: true,
  greutate: true,
  greutateTotal: true,
  costUnitar: true,
  cantitate: true,
  costTotal: true,
  creat: false,
  actualizat: false,
};

const readVisibleColumns = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(VISIBLE_COLUMNS_STORAGE_KEY) || "null");
    if (saved && typeof saved === "object") {
      const hasGreutateTotal = Object.prototype.hasOwnProperty.call(saved, "greutateTotal");
      const shouldHideDescriereDefault = localStorage.getItem(VISIBLE_COLUMNS_MIGRATION_KEY) !== "1";
      localStorage.setItem(VISIBLE_COLUMNS_MIGRATION_KEY, "1");

      return {
        ...DEFAULT_VISIBLE_COLUMNS,
        ...saved,
        ...(!hasGreutateTotal ? { greutate: true, greutateTotal: true } : {}),
        ...(shouldHideDescriereDefault ? { descriere: false } : {}),
      };
    }
  } catch {}

  return DEFAULT_VISIBLE_COLUMNS;
};

const saveVisibleColumns = (value) => {
  try {
    localStorage.setItem(VISIBLE_COLUMNS_STORAGE_KEY, JSON.stringify(value));
  } catch {}
};

const buildCatalogParentFromRetetaElement = (el) => ({
  id: el.definitie_id,

  tip_resursa: el.tip_resursa,
  limba: el.limba_resursa,

  cod_definitie: el.cod_definitie,

  denumire: el.denumire_resursa,
  denumire_fr: el.denumire_resursa_fr,

  descriere: el.descriere_resursa,
  descriere_fr: el.descriere_resursa_fr,

  unitate_masura: el.unitate_masura_resursa,
  greutate: el.greutate_resursa,
  cost: el.cost_unitar,

  photo_url: el.resursa_photo_url,

  created_at: el.created_at,
  updated_at: el.updated_at,
  created_by_name: el.created_by_name,
  created_by_photo_url: el.created_by_photo_url,
  updated_by_name: el.updated_by_name,
  updated_by_photo_url: el.updated_by_photo_url,

  subcategorii: el.subcategorii || [],
});

const getVisibleColumnCount = (visibleColumns) => {
  return Math.max(1, Object.values(visibleColumns).filter(Boolean).length);
};

const parseMaybeJsonObject = (value) => {
  if (!value) return null;
  if (typeof value === "object" && !Array.isArray(value)) return value;

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  return null;
};

const getElementVariantExtra = (el) => parseMaybeJsonObject(el?.detalii_extra) || parseMaybeJsonObject(el?.subcategorie_detalii_extra) || parseMaybeJsonObject(el?.sub_detalii_extra);

const formatGreutate = (value) => {
  const numberValue = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(numberValue) ? `${numberValue.toFixed(2).replace(".", ",")} kg` : "";
};

const toNumber = (value) => {
  const numberValue = Number(String(value ?? 0).replace(",", "."));
  return Number.isFinite(numberValue) ? numberValue : 0;
};

const ResourceMiniHeaderRow = memo(({ config, elements, onAdd, colSpan }) => {
  return (
    <TableRow className={`${config.lessBg} border-y-2`}>
      <TableCell colSpan={colSpan} className="p-0">
        <div className="flex items-center justify-between p-2 px-3 xxxl:px-4">
          <div className="flex items-center justify-center gap-2.5 xxxl:gap-3">
            <div className={`h-7 w-7 xxxl:h-8 xxxl:w-8 rounded-lg flex items-center justify-center shrink-0 border ${config.bgClass}`}>
              <FontAwesomeIcon icon={config.icon} className={`${config.colorClass} text-sm xxxl:text-base`} />
            </div>

            <div className="flex items-center justify-center gap-1.5 xxxl:gap-2">
              <h3 className={`font-bold text-sm xxxl:text-base leading-none ${config.colorClass}`}>{config.titlePlural}</h3>
            </div>
          </div>

          <Button onClick={onAdd} className={`gap-2 h-8 xxxl:h-9 py-0 px-3 xxxl:px-4 w-56 xxxl:w-64 text-sm xxxl:text-base ${config.hoverButton} text-white border-transparent`}>
            <FontAwesomeIcon icon={faPlus} /> Adaugă {config.title}
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
});

const ResourceRows = memo(({ elements, config, onEdit, onEditDef, onDelete, onOpenSubs, displayLang, visibleColumns, colSpan }) => {
  const showCol = (key) => visibleColumns[key];
  if (elements.length === 0) {
    return (
      <TableRow className="hover:bg-transparent">
        <TableCell colSpan={colSpan} className="p-2.5 xxxl:p-3 text-center text-muted-foreground bg-muted/10">
          <div className="flex gap-1.5 xxxl:gap-2 items-center justify-center">
            <FontAwesomeIcon icon={faBoxOpen} className="text-sm xxxl:text-base text-muted-foreground/50" />
            <p className="text-xs xxxl:text-sm font-medium">Nu există {config.titlePlural.toLowerCase()} în această rețetă.</p>
          </div>
        </TableCell>
      </TableRow>
    );
  }

  return elements.map((el) => {
    const afisareDenumire = displayLang === "FR" ? el.denumire_resursa_fr || el.denumire_resursa : el.denumire_resursa;
    const afisareDescriere = displayLang === "FR" ? el.descriere_resursa_fr || "" : el.descriere_resursa;
    const varianteCount = el.subcategorii?.length || 0;
    const resourceLang = el.limba_resursa;
    const variantExtra = el.tip_resursa === "material" || el.tip_resursa === "utilaj" ? getElementVariantExtra(el) : null;
    const furnizor = variantExtra?.furnizor || "";
    const marca = variantExtra?.marca || "";
    const greutateValue = el.tip_resursa === "material" ? toNumber(el.greutate_resursa ?? el.greutate) : null;
    const cantitateValue = toNumber(el.cantitate);
    const greutate = greutateValue !== null ? formatGreutate(greutateValue) : "";
    const greutateTotala = greutateValue !== null ? formatGreutate(greutateValue * cantitateValue) : "";

    return (
      <ContextMenu key={el.id}>
        <ContextMenuTrigger asChild>
          <TableRow
            onClick={(e) => {
              e.stopPropagation();
              onOpenSubs(buildCatalogParentFromRetetaElement(el), config);
            }}
            className="cursor-pointer h-16 xxxl:h-20 p-0 data-[state=open]:bg-muted border-b transition-colors group hover:bg-accent hover-row-border"
          >
            {/* POZĂ */}
            {showCol("poza") && (
              <TableCell onContextMenu={(e) => e.stopPropagation()} className="text-center px-3 xxxl:px-4 w-[5.5rem] xxxl:w-[6rem] max-w-[5.5rem] xxxl:max-w-[6rem]">
                <ImagePreviewTooltip
                  src={config.hasPhoto && el.resursa_photo_url ? `${photoAPI}/${el.resursa_photo_url}` : null}
                  alt={el.cod_definitie}
                  ringColor={`hover:ring-${config.normalColor}`}
                  fallback={<img src={NoImage} alt="No Image" className="h-full w-full object-cover opacity-50" />}
                  containerClassName="h-14 w-14 xxxl:h-16 xxxl:w-16 rounded-md border border-border bg-muted flex items-center justify-center overflow-hidden shrink-0"
                />
              </TableCell>
            )}

            {/* VARIANTE */}
            {showCol("variante") && (
              <TableCell className="text-center px-3 xxxl:px-4 whitespace-nowrap">
                <Badge
                  variant="outline"
                  className={`text-sm xxxl:text-base w-9 xxxl:w-10 text-center justify-center px-2 shadow-none whitespace-nowrap cursor-pointer transition-all  ${
                    varianteCount > 0 ? (resourceLang !== "FR" ? "text-cyan-600 border-cyan-500" : "text-lime-600 border-lime-500") : "text-muted-foreground"
                  }`}
                >
                  {varianteCount}
                </Badge>
              </TableCell>
            )}

            {/* COD */}
            {showCol("cod") && (
              <TableCell className="text-center px-3 xxxl:px-4 whitespace-nowrap">
                <span className="text-sm xxxl:text-base font-bold text-foreground">{el.cod_definitie}</span>
              </TableCell>
            )}

            {/* DENUMIRE */}
            {showCol("denumire") && (
              <TableCell className="px-3 xxxl:px-4 py-2.5 xxxl:py-3 min-w-[30rem] xxxl:min-w-[40rem] w-[30rem] xxxl:w-[40rem] max-w-[30rem] xxxl:max-w-[40rem]">
                <OverflowTooltip align="left" text={afisareDenumire} className="text-sm xxxl:text-base text-foreground whitespace-pre-wrap leading-normal" maxLines={2} />
              </TableCell>
            )}

            {/* DESCRIERE */}
            {showCol("descriere") && (
              <TableCell className="px-3 xxxl:px-4 min-w-[16rem] xxxl:min-w-[28rem]">
                {afisareDescriere ? (
                  <OverflowTooltip align="left" text={afisareDescriere} className="text-sm xxxl:text-base text-foreground whitespace-pre-wrap leading-normal" maxLines={2} />
                ) : (
                  <span className="text-sm xxxl:text-base text-muted-foreground/40 italic">—</span>
                )}
              </TableCell>
            )}

            {showCol("furnizor") && (
              <TableCell className="text-center px-3 xxxl:px-4 min-w-[10rem] xxxl:min-w-[12rem] w-[10rem] xxxl:w-[12rem] max-w-[10rem] xxxl:max-w-[12rem]">
                {furnizor ? (
                  <OverflowTooltip align="center" text={furnizor} className="text-sm xxxl:text-base text-foreground truncate" maxLines={1} />
                ) : (
                  <span className="text-sm xxxl:text-base text-muted-foreground/40 italic">—</span>
                )}
              </TableCell>
            )}

            {showCol("marca") && (
              <TableCell className="text-center px-3 xxxl:px-4 min-w-[10rem] xxxl:min-w-[12rem] w-[10rem] xxxl:w-[12rem] max-w-[10rem] xxxl:max-w-[12rem]">
                {marca ? (
                  <OverflowTooltip align="center" text={marca} className="text-sm xxxl:text-base text-foreground truncate" maxLines={1} />
                ) : (
                  <span className="text-sm xxxl:text-base text-muted-foreground/40 italic">—</span>
                )}
              </TableCell>
            )}

            {/* UNITATE */}
            {showCol("unitate") && (
              <TableCell className="text-center px-1.5 xxxl:px-2 w-[5rem] xxxl:w-[5.5rem] max-w-[5rem] xxxl:max-w-[5.5rem] whitespace-nowrap">
                <Badge variant="outline" className="text-sm xxxl:text-base px-2 w-9 xxxl:w-10 justify-center py-1.5 xxxl:py-2 shadow-none whitespace-nowrap">
                  {el.unitate_masura_resursa}
                </Badge>
              </TableCell>
            )}

            {/* CANTITATE */}
            {showCol("cantitate") && (
              <TableCell className="text-center px-1.5 xxxl:px-2 w-[6rem] xxxl:w-[6.5rem] max-w-[6rem] xxxl:max-w-[6.5rem] whitespace-nowrap text-sm xxxl:text-base font-bold text-foreground">
                {parseFloat(el.cantitate || 0)
                  .toFixed(2)
                  .replace(".", ",")}
              </TableCell>
            )}

            {showCol("greutate") && (
              <TableCell className="text-center px-1.5 xxxl:px-2 min-w-[7.5rem] xxxl:min-w-[8rem] w-[7.5rem] xxxl:w-[8rem] max-w-[7.5rem] xxxl:max-w-[8rem]">
                {greutate ? (
                  <span className="text-sm xxxl:text-base font-normal text-foreground whitespace-nowrap">{greutate}</span>
                ) : (
                  <span className="text-sm xxxl:text-base text-muted-foreground/40 italic">—</span>
                )}
              </TableCell>
            )}

            {showCol("greutateTotal") && (
              <TableCell className="text-center px-1.5 xxxl:px-2 min-w-[8rem] xxxl:min-w-[8.5rem] w-[8rem] xxxl:w-[8.5rem] max-w-[8rem] xxxl:max-w-[8.5rem]">
                {greutateTotala ? (
                  <span className="text-sm xxxl:text-base font-normal text-foreground whitespace-nowrap">{greutateTotala}</span>
                ) : (
                  <span className="text-sm xxxl:text-base text-muted-foreground/40 italic">—</span>
                )}
              </TableCell>
            )}

            {/* COST UNITAR */}
            {showCol("costUnitar") && (
              <TableCell className="text-center px-1.5 xxxl:px-2 w-[6.5rem] xxxl:w-[7rem] max-w-[6.5rem] xxxl:max-w-[7rem] whitespace-nowrap">
                <span className="text-sm xxxl:text-base text-muted-foreground">
                  {parseFloat(el.cost_unitar || 0)
                    .toFixed(2)
                    .replace(".", ",")}
                </span>
              </TableCell>
            )}

            {/* COST TOTAL */}
            {showCol("costTotal") && (
              <TableCell className="text-center px-1.5 xxxl:px-2 w-[7rem] xxxl:w-[8rem] max-w-[7rem] xxxl:max-w-[8rem] whitespace-nowrap">
                <span className={`font-bold text-sm xxxl:text-base ${config.colorClass}`}>
                  {parseFloat(el.cost_total_element || 0)
                    .toFixed(2)
                    .replace(".", ",")}
                </span>
              </TableCell>
            )}

            {/* CREAT */}
            {showCol("creat") && (
              <TableCell className="text-left px-3 xxxl:px-4 min-w-[12.5rem] xxxl:min-w-[14rem] w-[12.5rem] xxxl:w-[14rem] max-w-[12.5rem] xxxl:max-w-[14rem]">
                <div className="flex items-center gap-2 xxxl:gap-2.5 overflow-hidden">
                  <Avatar className="h-9 w-9 xxxl:h-10 xxxl:w-10 border rounded-md border-border shrink-0">
                    <AvatarImage src={`${photoAPI}/${el.created_by_photo_url}`} alt={el.created_by_name} className="object-cover" />
                    <AvatarFallback className="text-xs xxxl:text-sm rounded-md bg-muted font-bold">
                      {el.created_by_name
                        ?.split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase() || "S"}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex flex-col justify-center min-w-0 leading-tight">
                    <span className="text-xs xxxl:text-sm font-bold text-foreground truncate block">{el.created_by_name || "Sistem"}</span>
                    <span className="text-[10px] xxxl:text-[11px] text-muted-foreground mt-0.5">
                      {new Date(el.created_at).toLocaleDateString("ro-RO")} {new Date(el.created_at).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>
              </TableCell>
            )}

            {/* ACTUALIZAT */}
            {showCol("actualizat") && (
              <TableCell className="text-left px-3 xxxl:px-4 min-w-[12.5rem] xxxl:min-w-[14rem] w-[12.5rem] xxxl:w-[14rem] max-w-[12.5rem] xxxl:max-w-[14rem]">
                <div className="flex items-center gap-2 xxxl:gap-2.5 overflow-hidden">
                  <Avatar className="h-9 w-9 xxxl:h-10 xxxl:w-10 border rounded-md border-border shrink-0">
                    <AvatarImage src={`${photoAPI}/${el.updated_by_photo_url}`} alt={el.updated_by_name} className="object-cover" />
                    <AvatarFallback className="text-xs xxxl:text-sm rounded-md bg-muted font-bold">
                      {el.updated_by_name
                        ?.split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase() || "S"}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex flex-col justify-center min-w-0 leading-tight">
                    <span className="text-xs xxxl:text-sm font-bold text-foreground truncate block">{el.updated_by_name || "Sistem"}</span>
                    <span className="text-[10px] xxxl:text-[11px] text-muted-foreground mt-0.5">
                      {new Date(el.updated_at).toLocaleDateString("ro-RO")} {new Date(el.updated_at).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>
              </TableCell>
            )}
          </TableRow>
        </ContextMenuTrigger>

        <ContextMenuContent className="">
          <ContextMenuItem className="gap-3" onClick={() => onEditDef(el)}>
            <FontAwesomeIcon className="text-low" icon={faFilePen} />
            Editează definiția
          </ContextMenuItem>

          <ContextMenuItem className="gap-3" onClick={() => onEdit(el)}>
            <FontAwesomeIcon className="text-low" icon={faPenToSquare} />
            Editează cantitatea
          </ContextMenuItem>

          <ContextMenuSeparator />

          <ContextMenuItem className="gap-3 text-destructive focus:text-destructive hover:text-destructive" onClick={() => onDelete(el)}>
            <FontAwesomeIcon icon={faTrash} />
            Șterge
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    );
  });
});

const ResourcesTable = memo(({ sections, visibleColumns, displayLang, onEdit, onEditDef, onDelete, onOpenSubs }) => {
  const showCol = (key) => visibleColumns[key];
  const colSpan = getVisibleColumnCount(visibleColumns);

  return (
    <div className="rounded-md border bg-card w-full h-full overflow-auto relative shadow-sm">
      <Table className="min-w-full table-fixed caption-bottom text-left border-collapse">
        <TableHeader className="bg-background sticky top-0 z-50 shadow-sm">
          <TableRow className="h-10 xxxl:h-12 hover:bg-muted-foreground/25 bg-muted-foreground/25">
            {showCol("poza") && <TableHead className="text-center px-3 xxxl:px-4 w-[5.5rem] xxxl:w-[6rem] max-w-[5.5rem] xxxl:max-w-[6rem]">Poză</TableHead>}
            {showCol("variante") && <TableHead className="text-center px-3 xxxl:px-4 w-[5.5rem] xxxl:w-[6rem] max-w-[5.5rem] xxxl:max-w-[6rem]">Variante</TableHead>}
            {showCol("cod") && <TableHead className="text-center px-3 xxxl:px-4 w-[10rem] xxxl:w-[12rem] max-w-[10rem] xxxl:max-w-[12rem]">Cod</TableHead>}
            {showCol("denumire") && <TableHead className="px-3 xxxl:px-4 min-w-[30rem] xxxl:min-w-[40rem] w-[30rem] xxxl:w-[40rem] max-w-[30rem] xxxl:max-w-[40rem]">Denumire</TableHead>}
            {showCol("descriere") && <TableHead className="px-3 xxxl:px-4 min-w-[16rem] xxxl:min-w-[18rem]">Descriere</TableHead>}
            {showCol("furnizor") && <TableHead className="text-center px-3 xxxl:px-4 w-[10rem] xxxl:w-[12rem] max-w-[10rem] xxxl:max-w-[12rem]">Furnizor</TableHead>}
            {showCol("marca") && <TableHead className="text-center px-3 xxxl:px-4 w-[10rem] xxxl:w-[12rem] max-w-[10rem] xxxl:max-w-[12rem]">Marcă</TableHead>}
            {showCol("unitate") && <TableHead className="text-center px-1.5 xxxl:px-2 w-[5rem] xxxl:w-[5.5rem] max-w-[5rem] xxxl:max-w-[5.5rem]">Unitate</TableHead>}
            {showCol("cantitate") && <TableHead className="text-center px-1.5 xxxl:px-2 w-[6rem] xxxl:w-[6.5rem] max-w-[6rem] xxxl:max-w-[6.5rem]">Cantitate</TableHead>}
            {showCol("greutate") && <TableHead className="text-center px-1.5 xxxl:px-2 w-[8rem] xxxl:w-[9rem] max-w-[8rem] xxxl:max-w-[9rem]">Greutate unitara (kg)</TableHead>}
            {showCol("greutateTotal") && <TableHead className="text-center px-1.5 xxxl:px-2 w-[8rem] xxxl:w-[8.5rem] max-w-[8rem] xxxl:max-w-[8.5rem]">Greutate totală (kg)</TableHead>}
            {showCol("costUnitar") && <TableHead className="text-center px-1.5 xxxl:px-2 w-[6.5rem] xxxl:w-[7rem] max-w-[6.5rem] xxxl:max-w-[7rem]">Cost</TableHead>}
            {showCol("costTotal") && <TableHead className="text-center px-1.5 xxxl:px-2 w-[7rem] xxxl:w-[8rem] max-w-[7rem] xxxl:max-w-[8rem]">Cost Total</TableHead>}
            {showCol("creat") && <TableHead className="text-left px-3 xxxl:px-4 w-[12.5rem] xxxl:w-[14rem] max-w-[12.5rem] xxxl:max-w-[14rem]">Creat</TableHead>}
            {showCol("actualizat") && <TableHead className="text-left px-3 xxxl:px-4 w-[12.5rem] xxxl:w-[14rem] max-w-[12.5rem] xxxl:max-w-[14rem]">Actualizat</TableHead>}
          </TableRow>
        </TableHeader>

        <TableBody>
          {sections.map((section) => (
            <React.Fragment key={section.config.id}>
              <ResourceMiniHeaderRow config={section.config} elements={section.elements} onAdd={section.onAdd} colSpan={colSpan} />
              <ResourceRows
                elements={section.elements}
                config={section.config}
                onEdit={onEdit}
                onEditDef={onEditDef}
                onDelete={onDelete}
                onOpenSubs={onOpenSubs}
                displayLang={displayLang}
                visibleColumns={visibleColumns}
                colSpan={colSpan}
              />
            </React.Fragment>
          ))}
        </TableBody>
      </Table>
    </div>
  );
});

// --- MAIN COMPONENT ---
export default function ReteteSubList({ open, setOpen, parentItem }) {
  const { show, hide } = useLoading();

  // edit the catalog item
  const [defDialogOpen, setDefDialogOpen] = useState(false);
  const [defDialogConfig, setDefDialogConfig] = useState(null);
  const [defDialogTipResursa, setDefDialogTipResursa] = useState(null);
  const [defDialogDraft, setDefDialogDraft] = useState(null);
  //
  //

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState(null);
  const [editQuantity, setEditQuantity] = useState("");

  // --- STATE PENTRU SELECTORUL DE CATALOG ---
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [activeResourceType, setActiveResourceType] = useState("material");
  const [selectedCatalogItem, setSelectedCatalogItem] = useState(null);
  const [quantity, setQuantity] = useState("");

  //deschidem variantele
  const [subDialogOpen, setSubDialogOpen] = useState(false);
  const [selectedParent, setSelectedParent] = useState(null);
  const [selectedParentConfig, setSelectedParentConfig] = useState(null);
  const selectedParentDefinitieIdRef = useRef(null);

  // --- GLOBAL UI STATE (Limba + Coloane pt toate tabelele) ---
  const [localDisplayLang, setLocalDisplayLang] = useState("RO");
  const [visibleColumns, setVisibleColumns] = useState(() => readVisibleColumns());

  const toggleCol = useCallback((key) => {
    setVisibleColumns((prev) => {
      const next = {
        ...prev,
        [key]: !prev[key],
      };
      saveVisibleColumns(next);
      return next;
    });
  }, []);

  const { mutateAsync: addElement } = useAddRetetaElement();
  const { mutateAsync: editElement } = useEditRetetaElement();
  const { mutateAsync: deleteElement } = useDeleteRetetaElement();

  const handleAddElement = useCallback((tip) => {
    setActiveResourceType(tip);
    setSelectedCatalogItem(null);
    setQuantity("");
    setSelectorOpen(true);
  }, []);

  const handleOpenSubs = useCallback((parent, config) => {
    selectedParentDefinitieIdRef.current = parent.id;
    setSelectedParent(parent);
    setSelectedParentConfig(config);
    setSubDialogOpen(true);
  }, []);

  const handleSelectElement = useCallback((item) => {
    setSelectedCatalogItem(item);
  }, []);

  const handleConfirmAdd = useCallback(async () => {
    if (!selectedCatalogItem) {
      toast.warning("Te rog să selectezi o resursă din catalog.", { position: "top-right" });
      return;
    }
    const parsedQuantity = parseFloat(quantity.replace(",", "."));
    if (isNaN(parsedQuantity) || parsedQuantity <= 0) {
      toast.warning("Te rog să introduci o cantitate validă (mai mare de 0).", { position: "top-right" });
      return;
    }
    try {
      show();

      await addElement({
        reteta_id: parentItem.id,
        definitie_id: selectedCatalogItem.id,
        cantitate: parsedQuantity,
      });

      toast.success(`Ales: ${selectedCatalogItem.denumire}, cantitate: ${parsedQuantity}`, { position: "top-right" });
      setSelectorOpen(false);
      setSelectedCatalogItem(null);
      setQuantity("");
    } catch (error) {
      toast.error(`${error?.response?.data?.message || "Eroare la adăugarea elementului."}`, { position: "top-right" });
    } finally {
      hide();
    }
  }, [selectedCatalogItem, quantity, parentItem, addElement, show, hide]);

  const handleEditElement = useCallback((el) => {
    setItemToEdit(el);
    setEditQuantity(
      parseFloat(el.cantitate || 0)
        .toFixed(2)
        .replace(".", ","),
    );
    setEditDialogOpen(true);
  }, []);

  const handleConfirmEdit = useCallback(async () => {
    if (!itemToEdit) return;

    const parsedQuantity = parseFloat(editQuantity.replace(",", "."));

    if (isNaN(parsedQuantity) || parsedQuantity <= 0) {
      toast.warning("Te rog să introduci o cantitate validă (mai mare de 0).", { position: "top-right" });
      return;
    }

    show();

    try {
      await editElement({ id: itemToEdit.id, cantitate: parsedQuantity });
      toast.success("Cantitatea a fost actualizată.", { position: "top-right" });
      setEditDialogOpen(false);
      setItemToEdit(null);
      setEditQuantity("");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Eroare la editarea cantității.", { position: "top-right" });
    } finally {
      hide();
    }
  }, [itemToEdit, editQuantity, editElement, show, hide]);

  const handleDeleteElement = useCallback((el) => {
    setItemToDelete(el);
    setDeleteDialogOpen(true);
  }, []);

  const handleEditCatalogDef = useCallback((el) => {
    const tip = el.tip_resursa;
    const config = resurseConfig[tip];

    setDefDialogTipResursa(tip);
    setDefDialogConfig(config);
    setDefDialogDraft(buildCatalogParentFromRetetaElement(el));
    setDefDialogOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!itemToDelete) return;

    show();

    try {
      await deleteElement({ id: itemToDelete.id });
      toast.success("Elementul a fost eliminat din rețetă.", { position: "top-right" });
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Eroare la ștergere.", { position: "top-right" });
    } finally {
      hide();
    }
  }, [itemToDelete, deleteElement, show, hide]);

  useEffect(() => {
    if (!subDialogOpen || !parentItem || !selectedParentDefinitieIdRef.current) return;

    const freshElement = parentItem.elemente?.find((el) => el.definitie_id === selectedParentDefinitieIdRef.current);
    console.log(freshElement);
    if (freshElement) {
      setSelectedParent(buildCatalogParentFromRetetaElement(freshElement));
    }
  }, [parentItem, subDialogOpen]);

  if (!parentItem) return null;

  const elemente = parentItem.elemente || [];

  const materiale = elemente.filter((el) => el.tip_resursa === "material");
  const manopere = elemente.filter((el) => el.tip_resursa === "manopera");
  const utilaje = elemente.filter((el) => el.tip_resursa === "utilaj");
  const transporturi = elemente.filter((el) => el.tip_resursa === "transport");

  const sections = [
    {
      config: resurseConfig.manopera,
      elements: manopere,
      onAdd: () => handleAddElement("manopera"),
    },
    {
      config: resurseConfig.material,
      elements: materiale,
      onAdd: () => handleAddElement("material"),
    },
    {
      config: resurseConfig.utilaj,
      elements: utilaje,
      onAdd: () => handleAddElement("utilaj"),
    },
    {
      config: resurseConfig.transport,
      elements: transporturi,
      onAdd: () => handleAddElement("transport"),
    },
  ];

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[85vw] max-h-[90vh] h-[90vh] flex flex-col p-0" style={{ animationDuration: "0ms", transitionDuration: "0ms" }}>
          {/* HEADER DIALOG (Rețeta) */}
          <DialogHeader className="px-4 xxxl:px-6 py-3 xxxl:py-4 rounded-md rounded-b-none border-b bg-muted flex flex-row items-center justify-between shrink-0">
            <div className="flex items-center min-w-0 max-w-[60%] gap-3 xxxl:gap-4">
              <div className="h-11 w-11 xxxl:h-14 xxxl:w-14 rounded-xl flex items-center justify-center shrink-0 bg-sky-600/25 border border-sky-600/25">
                <FontAwesomeIcon icon={faDatabase} className="text-sky-600 text-xl xxxl:text-2xl" />
              </div>

              <DialogTitle className="text-left overflow-hidden flex flex-col gap-0">
                <div className="flex items-center gap-2">
                  <p className="text-xs xxxl:text-sm text-sky-600 font-bold uppercase tracking-wider">{parentItem.cod_reteta}</p>
                </div>
                <OverflowTooltip align="left" text={parentItem.denumire} className="text-lg xxxl:text-xl font-bold text-foreground" maxLines={1} />
              </DialogTitle>
            </div>

            {/* SECȚIUNEA DREAPTA: Toggles Globale + Cost Total */}
            <div className="flex items-center gap-5 xxxl:gap-8 mr-12">
              {/* Toggles Globale: Limbă și Coloane */}
              <div className="flex items-center gap-2.5 xxxl:gap-3">
                <Button
                  variant="outline"
                  className="gap-2 h-9 xxxl:h-10 w-[4.5rem] xxxl:w-20 text-sm xxxl:text-base text-foreground"
                  onClick={() => setLocalDisplayLang((prev) => (prev === "RO" ? "FR" : "RO"))}
                >
                  <FontAwesomeIcon icon={faLanguage} />
                  <span className="font-bold">{localDisplayLang}</span>
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="gap-2 h-9 xxxl:h-10 text-sm xxxl:text-base text-foreground">
                      <FontAwesomeIcon icon={faColumns} />
                      <span>Coloane</span>
                    </Button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuCheckboxItem checked={visibleColumns.poza} onSelect={(e) => e.preventDefault()} onCheckedChange={() => toggleCol("poza")}>
                      Poză
                    </DropdownMenuCheckboxItem>

                    <DropdownMenuCheckboxItem checked={visibleColumns.variante} onSelect={(e) => e.preventDefault()} onCheckedChange={() => toggleCol("variante")}>
                      Variante
                    </DropdownMenuCheckboxItem>

                    <DropdownMenuCheckboxItem checked={visibleColumns.cod} onSelect={(e) => e.preventDefault()} onCheckedChange={() => toggleCol("cod")}>
                      Cod
                    </DropdownMenuCheckboxItem>

                    <DropdownMenuCheckboxItem checked={visibleColumns.denumire} onSelect={(e) => e.preventDefault()} onCheckedChange={() => toggleCol("denumire")}>
                      Denumire
                    </DropdownMenuCheckboxItem>

                    <DropdownMenuCheckboxItem checked={visibleColumns.descriere} onSelect={(e) => e.preventDefault()} onCheckedChange={() => toggleCol("descriere")}>
                      Descriere
                    </DropdownMenuCheckboxItem>

                    <DropdownMenuCheckboxItem checked={visibleColumns.furnizor} onSelect={(e) => e.preventDefault()} onCheckedChange={() => toggleCol("furnizor")}>
                      Furnizor
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem checked={visibleColumns.marca} onSelect={(e) => e.preventDefault()} onCheckedChange={() => toggleCol("marca")}>
                      Marcă
                    </DropdownMenuCheckboxItem>

                    <DropdownMenuCheckboxItem checked={visibleColumns.unitate} onSelect={(e) => e.preventDefault()} onCheckedChange={() => toggleCol("unitate")}>
                      Unitate
                    </DropdownMenuCheckboxItem>

                    <DropdownMenuCheckboxItem checked={visibleColumns.greutate} onSelect={(e) => e.preventDefault()} onCheckedChange={() => toggleCol("greutate")}>
                      Greutate
                    </DropdownMenuCheckboxItem>

                    <DropdownMenuCheckboxItem checked={visibleColumns.greutateTotal} onSelect={(e) => e.preventDefault()} onCheckedChange={() => toggleCol("greutateTotal")}>
                      Greutate totală
                    </DropdownMenuCheckboxItem>

                    <DropdownMenuCheckboxItem checked={visibleColumns.cantitate} onSelect={(e) => e.preventDefault()} onCheckedChange={() => toggleCol("cantitate")}>
                      Cantitate
                    </DropdownMenuCheckboxItem>

                    <DropdownMenuCheckboxItem checked={visibleColumns.costUnitar} onSelect={(e) => e.preventDefault()} onCheckedChange={() => toggleCol("costUnitar")}>
                      Cost
                    </DropdownMenuCheckboxItem>

                    <DropdownMenuCheckboxItem checked={visibleColumns.costTotal} onSelect={(e) => e.preventDefault()} onCheckedChange={() => toggleCol("costTotal")}>
                      Cost Total
                    </DropdownMenuCheckboxItem>

                    <DropdownMenuCheckboxItem checked={visibleColumns.creat} onSelect={(e) => e.preventDefault()} onCheckedChange={() => toggleCol("creat")}>
                      Creat
                    </DropdownMenuCheckboxItem>

                    <DropdownMenuCheckboxItem checked={visibleColumns.actualizat} onSelect={(e) => e.preventDefault()} onCheckedChange={() => toggleCol("actualizat")}>
                      Actualizat
                    </DropdownMenuCheckboxItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Cost Total Rețetă */}
              <div className="flex flex-col justify-center items-center gap-0.5 xxxl:gap-1">
                <span className="text-xs xxxl:text-sm text-foreground font-semibold uppercase tracking-wider">Cost Total Rețetă</span>

                <div className="flex items-baseline gap-1 xxxl:gap-1.5 bg-card px-2.5 xxxl:px-3 py-1 rounded-md border border-foreground/40">
                  <span className="text-base xxxl:text-lg font-extrabold ">
                    {parseFloat(parentItem.cost || 0)
                      .toFixed(2)
                      .replace(".", ",")}
                  </span>
                  <span className="text-xs xxxl:text-sm font-bold ">/ {parentItem.unitate_masura}</span>
                </div>
              </div>
            </div>
          </DialogHeader>

          {/* BODY DIALOG */}
          <div className="p-4 xxxl:p-6 flex-1 min-h-0 rounded-md bg-card">
            <ResourcesTable
              sections={sections}
              visibleColumns={visibleColumns}
              displayLang={localDisplayLang}
              onEdit={handleEditElement}
              onEditDef={handleEditCatalogDef}
              onDelete={handleDeleteElement}
              onOpenSubs={handleOpenSubs}
            />
          </div>
        </DialogContent>
      </Dialog>
      {/* DIALOG PENTRU SELECȚIA DIN CATALOG */}
      <Dialog open={selectorOpen} onOpenChange={setSelectorOpen}>
        <DialogContent className="max-w-[90vw] h-[95vh] rounded-md p-0 gap-0 flex flex-col ">
          {/* Randăm CatalogMainPage setat pe modul de selecție */}
          <div className="flex-1 overflow-hidden">
            {selectorOpen && (
              <CatalogMainPage selectedItemId={selectedCatalogItem?.id} tipResursa={activeResourceType} isSelectionMode={true} onSelectElement={handleSelectElement} lockedLang={parentItem.limba} />
            )}
          </div>

          {/* AICI ESTE ZONA DE CONFIRMARE ȘI CANTITATE */}
          <div className="bg-muted rounded-b-md px-3 xxxl:px-4 border-t border-border shrink-0 flex items-center justify-between gap-4 xxxl:gap-6">
            {/* ZONA INFO RESURSĂ - w-1/3 */}
            <div className="flex flex-col h-20 xxxl:h-24 w-1/3 min-w-0 py-3 xxxl:py-4">
              {selectedCatalogItem ? (
                <>
                  <div className="flex items-center gap-2 min-w-0 w-full">
                    <Badge variant="outline" className="font-bold bg-background shrink-0">
                      {selectedCatalogItem.cod_definitie}
                    </Badge>

                    <div className="flex-1 min-w-0">
                      <OverflowTooltip text={selectedCatalogItem.denumire || "—"} align="left" maxLines={1} className="text-xs xxxl:text-sm font-bold text-foreground" />
                    </div>
                  </div>

                  <div className="mt-1 ">
                    <OverflowTooltip text={selectedCatalogItem.descriere || "—"} align="left" maxLines={2} className="text-xs xxxl:text-sm text-muted-foreground" />
                  </div>
                </>
              ) : (
                <div className="flex items-center px-3">
                  <span className="italic text-sm xxxl:text-base text-muted-foreground">Selectează o resursă din tabel...</span>
                </div>
              )}
            </div>

            {/* ZONA INPUT ȘI BUTON */}
            <div className="flex items-center py-3 xxxl:py-4 gap-3 xxxl:gap-4 shrink-0">
              <div className="flex items-center gap-2.5 xxxl:gap-3">
                <Label className="font-bold text-sm xxxl:text-base">Cantitate:</Label>

                <Input
                  className="w-28 xxxl:w-32 h-10 xxxl:h-11 text-sm xxxl:text-base font-black text-center border-2"
                  placeholder="0,00"
                  value={quantity}
                  onChange={(e) => {
                    const val = e.target.value.replace(".", ",");
                    if (/^\d{0,7}\,?\d{0,2}$/.test(val)) setQuantity(val);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleConfirmAdd();
                    }
                  }}
                />
              </div>

              {selectedCatalogItem && (
                <Button
                  variant="destructive"
                  onClick={() => setSelectedCatalogItem(null)}
                  className="gap-2 h-10 xxxl:h-11 px-5 xxxl:px-8 text-sm xxxl:text-base font-bold shadow-md transition-all active:scale-95"
                >
                  <FontAwesomeIcon icon={faTrash} className="text-base xxxl:text-lg" />
                  Șterge selecția
                </Button>
              )}

              <Button
                onClick={handleConfirmAdd}
                disabled={!selectedCatalogItem}
                className="gap-2 bg-sky-600 hover:bg-sky-700 text-white h-10 xxxl:h-11 px-5 xxxl:px-8 text-sm xxxl:text-base font-bold shadow-md transition-all active:scale-95"
              >
                <FontAwesomeIcon icon={faCheck} className="text-base xxxl:text-lg" />
                Confirmă adăugarea
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* DIALOG EDITARE CANTITATE */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-4 xxxl:px-6 py-3 xxxl:py-4 border-b bg-muted/40">
            <div className="flex items-center gap-2.5 xxxl:gap-3">
              <div className={`h-10 w-10 xxxl:h-12 xxxl:w-12 rounded-lg flex items-center justify-center bg-green-500/10 border-low text-low shrink-0 border`}>
                <FontAwesomeIcon icon={faPenToSquare} className={`text-base xxxl:text-lg`} />
              </div>
              <DialogTitle className="text-left text-base xxxl:text-lg">Editează cantitatea</DialogTitle>
            </div>
          </DialogHeader>

          <div className="px-4 xxxl:px-6 py-4 xxxl:py-5 flex flex-col gap-3 xxxl:gap-4">
            <div className="flex items-center gap-2 min-w-0">
              <Badge variant="outline" className="font-bold shrink-0">
                {itemToEdit?.cod_definitie}
              </Badge>

              <OverflowTooltip align="left" text={itemToEdit?.denumire_resursa || ""} maxLines={1} className="text-xs xxxl:text-sm font-bold text-foreground" />
            </div>

            <div className="grid gap-1.5 xxxl:gap-2">
              <Label htmlFor="edit-reteta-element-quantity" className="text-sm xxxl:text-base font-bold">
                Cantitate
              </Label>

              <Input
                id="edit-reteta-element-quantity"
                className="h-10 xxxl:h-11 text-sm xxxl:text-base font-black text-center border-2"
                placeholder="0,00"
                value={editQuantity}
                onChange={(e) => {
                  const val = e.target.value.replace(".", ",");
                  if (/^\d{0,7}\,?\d{0,2}$/.test(val)) setEditQuantity(val);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleConfirmEdit();
                  }
                }}
              />
            </div>
          </div>

          <DialogFooter className="px-4 xxxl:px-6 py-3 xxxl:py-4 border-t bg-muted/20 gap-2">
            <DialogClose asChild>
              <Button variant="outline" className="h-9 xxxl:h-10 text-sm xxxl:text-base">
                Anulează
              </Button>
            </DialogClose>

            <Button onClick={handleConfirmEdit} className="h-9 xxxl:h-10 text-sm xxxl:text-base bg-sky-600 hover:bg-sky-700 text-white">
              Salvează
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <DeleteDialog
        open={deleteDialogOpen}
        setOpen={setDeleteDialogOpen}
        title={`Elimină ${itemToDelete?.tip_resursa} din rețetă`}
        description={`Ești sigur că vrei să elimini "${itemToDelete?.denumire_resursa}" din această rețetă?`}
        onSubmit={handleConfirmDelete}
        useCode={false}
      />
      {selectedParentConfig && selectedParent && <CatalogSubList config={selectedParentConfig} open={subDialogOpen} setOpen={setSubDialogOpen} parentItem={selectedParent} />}
      {defDialogConfig && defDialogTipResursa && (
        <CatalogDefDialog config={defDialogConfig} open={defDialogOpen} setOpen={setDefDialogOpen} mode="edit" initialData={defDialogDraft} tipResursa={defDialogTipResursa} />
      )}
    </>
  );
}
