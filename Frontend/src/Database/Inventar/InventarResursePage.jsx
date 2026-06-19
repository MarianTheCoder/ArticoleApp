import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight, faBoxOpen, faChevronDown, faChevronRight, faQuestion, faSort, faSortDown, faSortUp } from "@fortawesome/free-solid-svg-icons";
import { toast } from "sonner";

import CatalogFilters from "@/Database/Catalog/CatalogFilters";
import { resurseConfig } from "@/Database/Catalog/resurseConfig";
import OverflowTooltip from "@/components/ui/OverflowTooltip";
import ImagePreviewTooltip from "@/components/ui/ImagePreviewTooltip";
import SpinnerElement from "@/MainElements/SpinnerElement";
import InventarCatalogSelectDialog from "./InventarCatalogSelectDialog";
import InventarVariantRow from "./InventarVariantRow";
import CatalogSubList from "@/Database/Catalog/CatalogSubList";
import { useAddInventarResurse, useInventarResurse } from "@/hooks/Database/useInventar";
import photoAPI from "@/api/photoAPI";
import NoImage from "@/assets/no-image-icon.png";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const COLUMN_WIDTHS_STORAGE_KEY = "inventar_column_widths";
const TEXT_ALIGN_STORAGE_KEY = "inventar_text_align";
const VISIBLE_COLUMNS_STORAGE_PREFIX = "inventar_visible_columns";

const DEFAULT_COLUMN_WIDTHS = {
  expand: 34,
  poza: 64,
  limba: 64,
  variante: 64,
  cod: 105,
  clasa1: 130,
  clasa2: 130,
  denumire: 620,
  descriere: 320,
  unitate: 74,
  cost: 120,
  stocTotal: 110,
  stocInventar: 120,
  creat: 180,
  actualizat: 180,
};

const MIN_COLUMN_WIDTHS = {
  expand: 34,
  poza: 56,
  limba: 56,
  variante: 56,
  cod: 90,
  clasa1: 100,
  clasa2: 100,
  denumire: 260,
  descriere: 220,
  unitate: 64,
  cost: 90,
  stocTotal: 90,
  stocInventar: 100,
  creat: 150,
  actualizat: 150,
};

const SORT_FIELD_BY_COLUMN = {
  cod: "cod_definitie",
  denumire: "denumire",
  cost: "cost",
  creat: "created_at",
  actualizat: "updated_at",
};

const getDefaultVisibleColumns = (config) => ({
  poza: config.hasPhoto,
  limba: true,
  variante: true,
  cod: true,
  clasa1: false,
  clasa2: false,
  denumire: true,
  descriere: false,
  unitate: true,
  cost: false,
  stocTotal: true,
  stocInventar: true,
  creat: false,
  actualizat: false,
});

const getVisibleColumnsStorageKey = (tipResursa) => `${VISIBLE_COLUMNS_STORAGE_PREFIX}_${tipResursa || "default"}`;

const readVisibleColumns = (tipResursa, config) => {
  const defaults = getDefaultVisibleColumns(config);

  try {
    const saved = JSON.parse(localStorage.getItem(getVisibleColumnsStorageKey(tipResursa)) || "null");
    if (saved && typeof saved === "object") {
      return {
        ...defaults,
        ...saved,
        poza: config.hasPhoto ? Boolean(saved.poza ?? defaults.poza) : false,
      };
    }
  } catch {}

  return defaults;
};

const saveVisibleColumns = (tipResursa, value) => {
  try {
    localStorage.setItem(getVisibleColumnsStorageKey(tipResursa), JSON.stringify(value));
  } catch {}
};

const normalizeDecimalPlaces = (value) => ([1, 2].includes(Number(value)) ? Number(value) : 2);

const getTextAlignClasses = (textAlign) => {
  if (textAlign === "left") return { cell: "text-left", flex: "justify-start", tooltip: "left" };
  if (textAlign === "right") return { cell: "text-right", flex: "justify-end", tooltip: "right" };
  return { cell: "text-center", flex: "justify-center", tooltip: "center" };
};

const formatNumber = (value, digits = 2) => {
  const numberValue = Number(value || 0);
  return Number.isFinite(numberValue) ? numberValue.toFixed(digits).replace(".", ",") : (0).toFixed(digits).replace(".", ",");
};

const getStockNumber = (...values) => {
  for (const value of values) {
    const numberValue = Number(value);
    if (Number.isFinite(numberValue)) return numberValue;
  }

  return 0;
};

const getUserInitials = (name) =>
  String(name || "S")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const formatDateTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return `${date.toLocaleDateString("ro-RO")} ${date.toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" })}`;
};

const ResizableTableHead = ({ colKey, style, className = "", children, onResizeStart }) => {
  return (
    <TableHead style={style} className={`relative px-0 select-none ${className}`}>
      {children}
      <span
        onPointerDown={(event) => onResizeStart(event, colKey)}
        className="absolute right-0 top-0 z-30 flex h-full w-3 cursor-col-resize touch-none select-none items-center justify-center hover:bg-primary/20"
      >
        <span className="h-6 w-[2px] rounded-full bg-foreground" />
      </span>
    </TableHead>
  );
};

const getCatalogClassLevelDisplay = (item, levelNo, displayLang = "RO") => {
  const level = item?.cod_definitie_meta?.classLevels?.[Number(levelNo) - 1];
  if (!level || level.is_empty) return "";

  const denumire = displayLang === "FR" ? level.denumire_fr || level.denumire_ro : level.denumire_ro;
  return `${level.code_segment}. ${level.is_defined && denumire ? denumire : "Nedefinit"}`;
};

const getCatalogCodeTooltipParts = (item, displayLang = "RO") => {
  const meta = item?.cod_definitie_meta || {};
  const levels = Array.isArray(meta.levels) ? meta.levels : Array.isArray(meta.classLevels) ? meta.classLevels.filter((level) => level && !level.is_empty) : [];
  const classParts = levels
    .filter((level) => level && !level.is_empty && level.code_segment && String(level.code_segment) !== "00")
    .map((level, index) => {
      const denumire = displayLang === "FR" ? level.denumire_fr || level.denumire_ro : level.denumire_ro;
      const isUndefined = !(level.is_defined && denumire);

      return {
        key: level.path_code || `${level.level_no || index + 1}-${level.code_segment}`,
        label: `${level.code_segment}. ${isUndefined ? "Nedefinit" : denumire}`,
        isUndefined,
      };
    });
  const specificSegments = Array.isArray(meta.specificSegments)
    ? meta.specificSegments
    : Array.isArray(meta.specific_segments)
      ? meta.specific_segments
      : String(item?.cod_definitie || "")
          .trim()
          .split(/\s+/)
          .slice(2);
  const specificParts = [specificSegments.filter(Boolean).join(" ")].filter(Boolean).map((segment, index) => ({ key: `specific-${index}`, label: segment }));

  return [...classParts, ...specificParts].length > 0 ? [...classParts, ...specificParts] : [{ key: "fallback", label: item?.cod_definitie || "Cod nedefinit" }];
};

const InventarCodeValue = ({ item, displayLang, flexClass = "justify-center" }) => {
  const parts = getCatalogCodeTooltipParts(item, displayLang);

  return (
    <div className={`flex min-w-0 items-center gap-1.5 ${flexClass}`}>
      <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap font-bold text-foreground">{String(item.cod_definitie || "—")}</span>

      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
            className="inline-flex h-5 w-5 shrink-0 cursor-help items-center justify-center rounded-full border border-border bg-card text-[10px] font-black text-muted-foreground hover:text-foreground"
          >
            <FontAwesomeIcon icon={faQuestion} />
          </button>
        </PopoverTrigger>

        <PopoverContent
          align="center"
          side="bottom"
          sideOffset={8}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
          className="z-[100] max-w-[64rem] w-auto rounded-md border-2 border-border bg-popover p-2 text-xs xxxl:text-sm text-popover-foreground shadow-md"
        >
          <div className="flex max-w-[62rem] flex-wrap items-center gap-1">
            {parts.map((part, index) => (
              <React.Fragment key={`${part.key}-${index}`}>
                <span className={`inline-flex min-w-0 max-w-[18rem] rounded-md border p-1 text-xs font-semibold ${part.isUndefined ? "border-destructive/50 bg-destructive/10 text-destructive" : ""}`}>
                  <OverflowTooltip text={part.label} align="center" className={`block max-w-full truncate ${part.isUndefined ? "text-destructive" : "text-foreground"}`} maxLines={1} textSize="sm" />
                </span>

                {index < parts.length - 1 && (
                  <span className="text-sm xxxl:text-base">
                    <FontAwesomeIcon icon={faArrowRight} />
                  </span>
                )}
              </React.Fragment>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

const tableCellClass = "px-2 py-1 text-xs xxxl:text-sm";
const tableCellCenterClass = `${tableCellClass} text-center`;
const tableCellLeftClass = `${tableCellClass} text-left`;
const expandCellClass = "px-0 py-1 text-center";

function InventarResourceRow({ item, config, visibleColumns, displayLang, getColumnStyle, textAlignClasses, decimalPlaces, isExpanded, onToggleVariants, onAddVariant }) {
  const showCol = (key) => visibleColumns[key];
  const afisareDenumire = displayLang === "FR" ? item.denumire_fr || item.denumire : item.denumire;
  const afisareDescriere = displayLang === "FR" ? item.descriere_fr || "" : item.descriere;
  const subcategorii = item.subcategorii || [];
  const hasVariants = subcategorii.length > 0;
  const stocTotal = getStockNumber(item.stoc_total, item.stocTotal);
  const stocInventar = getStockNumber(item.stoc_inventar, item.stocInventar);

  return (
    <>
      <TableRow
        className={`h-9 border-b hover:bg-accent ${hasVariants ? "cursor-pointer" : ""}`}
        onClick={(event) => {
          if (event.target.closest("a, button, input, textarea, select")) return;
          if (hasVariants) onToggleVariants?.(item);
        }}
      >
        <TableCell style={getColumnStyle("expand")} className={expandCellClass}>
          <button
            type="button"
            disabled={!hasVariants}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              if (hasVariants) onToggleVariants?.(item);
            }}
            className={`inline-flex  h-10 w-10  items-center justify-center rounded-md ${hasVariants ? "cursor-pointer text-foreground hover:text-primary" : "cursor-default text-muted-foreground"}`}
          >
            <FontAwesomeIcon icon={isExpanded ? faChevronDown : faChevronRight} className={`text-base transition-transform ${hasVariants ? "" : "opacity-30"}`} />
          </button>
        </TableCell>

        {config.hasPhoto && showCol("poza") && (
          <TableCell style={getColumnStyle("poza")} className={tableCellCenterClass}>
            <ImagePreviewTooltip
              src={item.photo_url ? `${photoAPI}/${item.photo_url}` : null}
              alt={item.cod_definitie}
              ringColor={`hover:ring-${config.normalColor}`}
              fallback={<img src={NoImage} alt="No Image" className="h-full w-full object-cover opacity-50" />}
              containerClassName="h-9 w-9 xxxl:h-10 xxxl:w-10 rounded-md border border-border bg-muted flex items-center justify-center overflow-hidden shrink-0 mx-auto"
            />
          </TableCell>
        )}

        {showCol("limba") && (
          <TableCell style={getColumnStyle("limba")} className={tableCellCenterClass}>
            <div className="flex justify-center">
              <div className={`rounded-md border ${item.limba !== "FR" ? "bg-cyan-500/5 border-cyan-500" : "bg-lime-500/5 border-lime-500"} flex items-center justify-center`}>
                <span className={`text-xs xxxl:text-sm w-8 xxxl:w-10 py-1 font-bold ${item.limba !== "FR" ? "text-cyan-600 " : "text-lime-600"}`}>{item.limba}</span>
              </div>
            </div>
          </TableCell>
        )}

        {showCol("variante") && (
          <TableCell style={getColumnStyle("variante")} className={tableCellCenterClass}>
            <div className="flex justify-center items-center">
              <Badge
                variant="outline"
                onClick={(event) => {
                  event.stopPropagation();
                  onAddVariant?.(item);
                }}
                className={`h-8 w-8 px-2 text-center flex justify-center items-center text-xs xxxl:text-sm shadow-none whitespace-nowrap cursor-pointer transition-all hover:scale-110 ${
                  hasVariants ? (item.limba !== "FR" ? "text-cyan-600 border-cyan-500" : "text-lime-600 border-lime-500") : "text-muted-foreground"
                }`}
              >
                {subcategorii.length}
              </Badge>
            </div>
          </TableCell>
        )}

        {showCol("cod") && (
          <TableCell style={getColumnStyle("cod")} className={`${textAlignClasses.cell} ${tableCellClass} whitespace-nowrap`}>
            <InventarCodeValue item={item} displayLang={displayLang} flexClass={textAlignClasses.flex} />
          </TableCell>
        )}

        {showCol("clasa1") && (
          <TableCell style={getColumnStyle("clasa1")} className={`${textAlignClasses.cell} ${tableCellClass}`}>
            {getCatalogClassLevelDisplay(item, 1, displayLang) ? (
              <OverflowTooltip
                align={textAlignClasses.tooltip}
                text={getCatalogClassLevelDisplay(item, 1, displayLang)}
                className={`truncate text-foreground ${textAlignClasses.cell}`}
                maxLines={1}
                textSize="sm"
              />
            ) : (
              <span className="text-muted-foreground/40 italic">—</span>
            )}
          </TableCell>
        )}

        {showCol("clasa2") && (
          <TableCell style={getColumnStyle("clasa2")} className={`${textAlignClasses.cell} ${tableCellClass}`}>
            {getCatalogClassLevelDisplay(item, 2, displayLang) ? (
              <OverflowTooltip
                align={textAlignClasses.tooltip}
                text={getCatalogClassLevelDisplay(item, 2, displayLang)}
                className={`truncate text-foreground ${textAlignClasses.cell}`}
                maxLines={1}
                textSize="sm"
              />
            ) : (
              <span className="text-muted-foreground/40 italic">—</span>
            )}
          </TableCell>
        )}

        {showCol("denumire") && (
          <TableCell style={getColumnStyle("denumire")} className={`${textAlignClasses.cell} ${tableCellClass}`}>
            <OverflowTooltip align={textAlignClasses.tooltip} text={afisareDenumire || "—"} className={`truncate text-foreground ${textAlignClasses.cell}`} maxLines={1} textSize="sm" />
          </TableCell>
        )}

        {showCol("descriere") && (
          <TableCell style={getColumnStyle("descriere")} className={`${textAlignClasses.cell} ${tableCellClass}`}>
            {afisareDescriere ? (
              <OverflowTooltip align={textAlignClasses.tooltip} text={afisareDescriere} className={`truncate text-foreground ${textAlignClasses.cell}`} maxLines={1} textSize="sm" />
            ) : (
              <span className="text-muted-foreground/40 italic">—</span>
            )}
          </TableCell>
        )}

        {showCol("unitate") && (
          <TableCell style={getColumnStyle("unitate")} className={tableCellCenterClass}>
            <Badge variant="outline" className="h-6 px-2 text-xs xxxl:text-sm shadow-none whitespace-nowrap">
              {item.unitate_masura}
            </Badge>
          </TableCell>
        )}

        {showCol("cost") && (
          <TableCell style={getColumnStyle("cost")} className={tableCellCenterClass}>
            <span className="font-bold text-foreground">{formatNumber(item.cost, decimalPlaces)}</span>
          </TableCell>
        )}

        {showCol("stocTotal") && (
          <TableCell style={getColumnStyle("stocTotal")} className={tableCellCenterClass}>
            <span className="font-black text-foreground">{formatNumber(stocTotal, decimalPlaces)}</span>
          </TableCell>
        )}

        {showCol("stocInventar") && (
          <TableCell style={getColumnStyle("stocInventar")} className={tableCellCenterClass}>
            <span className="font-black text-primary">{formatNumber(stocInventar, decimalPlaces)}</span>
          </TableCell>
        )}

        {showCol("creat") && (
          <TableCell style={getColumnStyle("creat")} className={tableCellLeftClass}>
            <div className="flex items-center gap-1.5 h-8 overflow-hidden">
              <Avatar className="h-7 w-7 border rounded-md border-border shrink-0">
                <AvatarImage src={item.created_by_photo_url ? `${photoAPI}/${item.created_by_photo_url}` : undefined} alt={item.created_by_name} className="object-cover" />
                <AvatarFallback className="text-[10px] rounded-md bg-muted font-bold">{getUserInitials(item.created_by_name)}</AvatarFallback>
              </Avatar>

              <div className="flex flex-col justify-center min-w-0 leading-tight">
                <span className="text-xs font-bold text-foreground truncate block">{item.created_by_name || "Sistem"}</span>
                <span className="text-[10px] text-muted-foreground">{formatDateTime(item.created_at)}</span>
              </div>
            </div>
          </TableCell>
        )}

        {showCol("actualizat") && (
          <TableCell style={getColumnStyle("actualizat")} className={tableCellLeftClass}>
            <div className="flex items-center gap-1.5 h-8 overflow-hidden">
              <Avatar className="h-7 w-7 border rounded-md border-border shrink-0">
                <AvatarImage src={item.updated_by_photo_url ? `${photoAPI}/${item.updated_by_photo_url}` : undefined} alt={item.updated_by_name} className="object-cover" />
                <AvatarFallback className="text-[10px] rounded-md bg-muted font-bold">{getUserInitials(item.updated_by_name)}</AvatarFallback>
              </Avatar>

              <div className="flex flex-col justify-center min-w-0 leading-tight">
                <span className="text-xs font-bold text-foreground truncate block">{item.updated_by_name || "Sistem"}</span>
                <span className="text-[10px] text-muted-foreground">{formatDateTime(item.updated_at)}</span>
              </div>
            </div>
          </TableCell>
        )}
      </TableRow>

      {isExpanded &&
        subcategorii.map((sub, index) => (
          <InventarVariantRow
            key={sub.id}
            last={index == subcategorii.length - 1}
            sub={sub}
            parent={item}
            config={config}
            visibleColumns={visibleColumns}
            displayLang={displayLang}
            getColumnStyle={getColumnStyle}
            textAlignClasses={textAlignClasses}
            decimalPlaces={decimalPlaces}
          />
        ))}
    </>
  );
}

export default function InventarResursePage({ inventar, tipResursa }) {
  const config = resurseConfig[tipResursa];
  const inventarLang = inventar?.limba || "RO";

  const [selectDialogOpen, setSelectDialogOpen] = useState(false);
  const [variantDialogOpen, setVariantDialogOpen] = useState(false);
  const [variantDialogParent, setVariantDialogParent] = useState(null);
  const [displayLang, setDisplayLang] = useState("RO");
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [page, setPage] = useState(1);
  const [limitInput, setLimitInput] = useState("50");
  const [limitDebounced, setLimitDebounced] = useState(50);
  const [visibleColumns, setVisibleColumns] = useState(() => readVisibleColumns(tipResursa, config));

  const [expandedResourceIds, setExpandedResourceIds] = useState(new Set());
  const [decimalPlaces, setDecimalPlaces] = useState(2);
  const [textAlign, setTextAlign] = useState(() => {
    try {
      const saved = localStorage.getItem(TEXT_ALIGN_STORAGE_KEY);
      if (saved === "left" || saved === "center" || saved === "right") return saved;
    } catch {}
    return "center";
  });
  const [columnResetKey, setColumnResetKey] = useState(0);
  const [columnWidths, setColumnWidths] = useState(() => {
    try {
      const saved = localStorage.getItem(COLUMN_WIDTHS_STORAGE_KEY);
      if (saved) {
        return {
          ...DEFAULT_COLUMN_WIDTHS,
          ...JSON.parse(saved),
          expand: DEFAULT_COLUMN_WIDTHS.expand,
        };
      }
    } catch {}

    return DEFAULT_COLUMN_WIDTHS;
  });

  useEffect(() => {
    setDisplayLang("RO");
  }, [inventar?.id]);

  useEffect(() => {
    try {
      localStorage.setItem(TEXT_ALIGN_STORAGE_KEY, textAlign);
    } catch {}
  }, [textAlign]);

  useEffect(() => {
    setVisibleColumns(readVisibleColumns(tipResursa, config));
  }, [tipResursa, config.hasPhoto]);

  useEffect(() => {
    try {
      localStorage.setItem(COLUMN_WIDTHS_STORAGE_KEY, JSON.stringify(columnWidths));
    } catch {}
  }, [columnWidths]);

  useEffect(() => {
    if (!columnResetKey) return;

    setColumnWidths(DEFAULT_COLUMN_WIDTHS);
    try {
      localStorage.removeItem(COLUMN_WIDTHS_STORAGE_KEY);
    } catch {}
  }, [columnResetKey]);

  const getDefaultAdvancedFilters = useCallback(
    () => ({
      cod: "",
      denumire: "",
      variante: "0",
      cost: "",
      unitate: "all",
      limba: "all",
      sortBy: "updated_at",
      sortOrder: "desc",
    }),
    [],
  );

  const [advancedFilters, setAdvancedFilters] = useState(() => getDefaultAdvancedFilters());
  const [advancedFiltersDebounced, setAdvancedFiltersDebounced] = useState(() => getDefaultAdvancedFilters());

  useEffect(() => {
    const defaults = getDefaultAdvancedFilters();
    setSearch("");
    setAdvancedFilters(defaults);
    setAdvancedFiltersDebounced(defaults);
    setPage(1);
    setExpandedResourceIds(new Set());
  }, [tipResursa, getDefaultAdvancedFilters]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchDebounced(search);
      setAdvancedFiltersDebounced(advancedFilters);

      let parsedLimit = parseInt(limitInput);
      if (Number.isNaN(parsedLimit) || parsedLimit < 1) parsedLimit = 50;
      setLimitDebounced(parsedLimit);
      setPage(1);
    }, 500);

    return () => clearTimeout(handler);
  }, [search, limitInput, advancedFilters]);

  const filters = useMemo(
    () => ({
      search: searchDebounced,
      page,
      limit: limitDebounced,
      cod: advancedFiltersDebounced.cod,
      denumire: advancedFiltersDebounced.denumire,
      descriere: advancedFiltersDebounced.descriere,
      variante: advancedFiltersDebounced.variante,
      cost: advancedFiltersDebounced.cost,
      unitate: advancedFiltersDebounced.unitate === "all" ? "" : advancedFiltersDebounced.unitate,
      sortBy: advancedFiltersDebounced.sortBy,
      sortOrder: advancedFiltersDebounced.sortOrder,
    }),
    [advancedFiltersDebounced, limitDebounced, page, searchDebounced],
  );

  const { data, isFetching } = useInventarResurse(inventar?.id, tipResursa, filters);
  const { mutateAsync: addInventarResurse } = useAddInventarResurse();

  const items = data?.items || [];
  const totalItems = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  useEffect(() => {
    if (!variantDialogOpen || !variantDialogParent?.id) return;

    const freshParent = items.find((item) => Number(item.id) === Number(variantDialogParent.id));
    if (freshParent && freshParent !== variantDialogParent) {
      setVariantDialogParent(freshParent);
    }
  }, [items, variantDialogOpen, variantDialogParent]);

  const handleConfirmSelect = async (selectedIds) => {
    try {
      await addInventarResurse({
        inventar_id: inventar.id,
        catalog_definitie_ids: selectedIds,
      });
      toast.success("Resursele au fost adăugate în inventar.", { position: "top-right" });
    } catch (error) {
      toast.error(error?.response?.data?.message || "Eroare la adăugarea resurselor în inventar.", { position: "top-right" });
      throw error;
    }
  };

  const toggleResourceExpand = useCallback((item) => {
    const id = String(item?.inventar_resursa_id || item?.id || "");
    if (!id) return;

    setExpandedResourceIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleOpenVariantDialog = useCallback((item) => {
    if (!item?.id) return;
    setVariantDialogParent(item);
    setVariantDialogOpen(true);
  }, []);

  const handleSetVariantDialogOpen = useCallback((nextOpen) => {
    setVariantDialogOpen(nextOpen);
    if (!nextOpen) setVariantDialogParent(null);
  }, []);

  const toggleCol = useCallback(
    (key, val) => {
      setVisibleColumns((prev) => {
        const next = {
          ...prev,
          [key]: val,
        };
        saveVisibleColumns(tipResursa, next);
        return next;
      });
    },
    [tipResursa],
  );

  const safeDecimalPlaces = normalizeDecimalPlaces(decimalPlaces);
  const textAlignClasses = getTextAlignClasses(textAlign);

  const getColumnStyle = useCallback(
    (key) => {
      const width = columnWidths[key] || DEFAULT_COLUMN_WIDTHS[key] || 120;
      return {
        width,
        minWidth: width,
        maxWidth: width,
      };
    },
    [columnWidths],
  );

  const handleColumnResizeStart = useCallback(
    (event, key) => {
      event.preventDefault();
      event.stopPropagation();

      const startX = event.clientX;
      const startWidth = columnWidths[key] || DEFAULT_COLUMN_WIDTHS[key] || 120;
      const minWidth = MIN_COLUMN_WIDTHS[key] || 80;
      let frame = null;

      const onMove = (moveEvent) => {
        const delta = moveEvent.clientX - startX;
        const nextWidth = Math.max(minWidth, startWidth + delta);

        if (frame) window.cancelAnimationFrame(frame);
        frame = window.requestAnimationFrame(() => {
          setColumnWidths((prev) => ({
            ...prev,
            [key]: nextWidth,
          }));
        });
      };

      const onUp = () => {
        if (frame) window.cancelAnimationFrame(frame);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [columnWidths],
  );

  const handleSortColumn = useCallback(
    (columnKey) => {
      const sortField = SORT_FIELD_BY_COLUMN[columnKey];
      if (!sortField) return;

      setAdvancedFilters((prev) => {
        if (prev.sortBy === sortField) {
          if (prev.sortOrder === "asc") return { ...prev, sortBy: sortField, sortOrder: "desc" };
          return { ...prev, sortBy: "updated_at", sortOrder: "desc" };
        }

        return { ...prev, sortBy: sortField, sortOrder: "asc" };
      });
    },
    [setAdvancedFilters],
  );

  const renderSortHeaderContent = useCallback(
    (columnKey, label, align = "center") => {
      const sortField = SORT_FIELD_BY_COLUMN[columnKey];
      const active = sortField && advancedFilters.sortBy === sortField;
      const icon = !active ? faSort : advancedFilters.sortOrder === "asc" ? faSortDown : faSortUp;
      const justifyClass = align === "left" ? "justify-start text-left" : align === "right" ? "justify-end text-right" : "justify-center text-center";

      return (
        <button
          type="button"
          className={`flex h-full w-full items-center gap-1 px-1.5 xxxl:px-2 text-xs xxxl:text-sm font-bold text-foreground ${justifyClass}`}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            handleSortColumn(columnKey);
          }}
        >
          <span className="min-w-0 truncate">{label}</span>
          <FontAwesomeIcon icon={icon} className={`text-sm xxxl:text-base ${active ? "!text-primary" : "text-muted-foreground"}`} />
        </button>
      );
    },
    [handleSortColumn, advancedFilters.sortBy, advancedFilters.sortOrder],
  );

  const renderPlainHeader = useCallback((label, align = "center") => {
    const justifyClass = align === "left" ? "justify-start text-left" : align === "right" ? "justify-end text-right" : "justify-center text-center";
    return <div className={`flex h-full w-full items-center px-1.5 xxxl:px-2 text-xs xxxl:text-sm font-bold text-foreground ${justifyClass}`}>{label}</div>;
  }, []);

  return (
    <div className="h-full w-full flex flex-col gap-3 p-3 xxxl:p-4 overflow-hidden">
      <CatalogFilters
        config={config}
        search={search}
        setSearch={setSearch}
        totalItems={totalItems}
        onAddClick={() => setSelectDialogOpen(true)}
        displayLang={displayLang}
        onDisplayLangToggle={() => setDisplayLang((prev) => (prev === "RO" ? "FR" : "RO"))}
        decimalPlaces={decimalPlaces}
        setDecimalPlaces={setDecimalPlaces}
        textAlign={textAlign}
        setTextAlign={setTextAlign}
        onResetColumnWidths={() => setColumnResetKey((prev) => prev + 1)}
        visibleColumns={visibleColumns}
        toggleCol={toggleCol}
        advancedFilters={advancedFilters}
        setAdvancedFilters={(updater) => {
          setAdvancedFilters((prev) => {
            const next = typeof updater === "function" ? updater(prev) : updater;
            return next;
          });
        }}
      />

      <div className="flex-1 min-h-0 rounded-lg border border-border bg-card overflow-hidden flex flex-col">
        <div className="relative flex-1 overflow-auto">
          <Table className="min-w-full table-fixed">
            <TableHeader className="sticky top-0 z-10 bg-background">
              <TableRow className="h-8 xxxl:h-9 bg-muted-foreground/25 hover:bg-muted-foreground/25">
                <TableHead style={getColumnStyle("expand")} className="px-0 text-center">
                  {renderPlainHeader("")}
                </TableHead>

                {config.hasPhoto && visibleColumns.poza && (
                  <ResizableTableHead colKey="poza" style={getColumnStyle("poza")} onResizeStart={handleColumnResizeStart} className="text-center">
                    {renderPlainHeader("Poză")}
                  </ResizableTableHead>
                )}
                {visibleColumns.limba && (
                  <ResizableTableHead colKey="limba" style={getColumnStyle("limba")} onResizeStart={handleColumnResizeStart} className="text-center">
                    {renderPlainHeader("Limba")}
                  </ResizableTableHead>
                )}
                {visibleColumns.variante && (
                  <ResizableTableHead colKey="variante" style={getColumnStyle("variante")} onResizeStart={handleColumnResizeStart} className="text-center">
                    {renderPlainHeader("Variante")}
                  </ResizableTableHead>
                )}
                {visibleColumns.cod && (
                  <ResizableTableHead colKey="cod" style={getColumnStyle("cod")} onResizeStart={handleColumnResizeStart}>
                    {renderSortHeaderContent("cod", "Cod", textAlign)}
                  </ResizableTableHead>
                )}
                {visibleColumns.clasa1 && (
                  <ResizableTableHead colKey="clasa1" style={getColumnStyle("clasa1")} onResizeStart={handleColumnResizeStart}>
                    {renderPlainHeader("Clasă", textAlign)}
                  </ResizableTableHead>
                )}
                {visibleColumns.clasa2 && (
                  <ResizableTableHead colKey="clasa2" style={getColumnStyle("clasa2")} onResizeStart={handleColumnResizeStart}>
                    {renderPlainHeader("Subclasă", textAlign)}
                  </ResizableTableHead>
                )}
                {visibleColumns.denumire && (
                  <ResizableTableHead colKey="denumire" style={getColumnStyle("denumire")} onResizeStart={handleColumnResizeStart}>
                    {renderSortHeaderContent("denumire", "Denumire", textAlign)}
                  </ResizableTableHead>
                )}
                {visibleColumns.descriere && (
                  <ResizableTableHead colKey="descriere" style={getColumnStyle("descriere")} onResizeStart={handleColumnResizeStart}>
                    {renderPlainHeader("Descriere", textAlign)}
                  </ResizableTableHead>
                )}
                {visibleColumns.unitate && (
                  <ResizableTableHead colKey="unitate" style={getColumnStyle("unitate")} onResizeStart={handleColumnResizeStart} className="text-center">
                    {renderPlainHeader("UM")}
                  </ResizableTableHead>
                )}
                {visibleColumns.cost && (
                  <ResizableTableHead colKey="cost" style={getColumnStyle("cost")} onResizeStart={handleColumnResizeStart} className="text-center">
                    {renderSortHeaderContent("cost", "Cost")}
                  </ResizableTableHead>
                )}
                {visibleColumns.stocTotal && (
                  <ResizableTableHead colKey="stocTotal" style={getColumnStyle("stocTotal")} onResizeStart={handleColumnResizeStart} className="text-center">
                    {renderPlainHeader("Stoc total")}
                  </ResizableTableHead>
                )}
                {visibleColumns.stocInventar && (
                  <ResizableTableHead colKey="stocInventar" style={getColumnStyle("stocInventar")} onResizeStart={handleColumnResizeStart} className="text-center">
                    {renderPlainHeader("Stoc inventar")}
                  </ResizableTableHead>
                )}
                {visibleColumns.creat && (
                  <ResizableTableHead colKey="creat" style={getColumnStyle("creat")} onResizeStart={handleColumnResizeStart}>
                    {renderSortHeaderContent("creat", "Creat", "left")}
                  </ResizableTableHead>
                )}
                {visibleColumns.actualizat && (
                  <ResizableTableHead colKey="actualizat" style={getColumnStyle("actualizat")} onResizeStart={handleColumnResizeStart}>
                    {renderSortHeaderContent("actualizat", "Actualizat", "left")}
                  </ResizableTableHead>
                )}
              </TableRow>
            </TableHeader>

            <TableBody>
              {items.length > 0 &&
                items.map((item) => (
                  <InventarResourceRow
                    key={item.inventar_resursa_id}
                    item={item}
                    config={config}
                    visibleColumns={visibleColumns}
                    displayLang={displayLang}
                    getColumnStyle={getColumnStyle}
                    textAlignClasses={textAlignClasses}
                    decimalPlaces={safeDecimalPlaces}
                    isExpanded={expandedResourceIds.has(String(item.inventar_resursa_id || item.id))}
                    onToggleVariants={toggleResourceExpand}
                    onAddVariant={handleOpenVariantDialog}
                  />
                ))}
            </TableBody>
          </Table>

          {items.length === 0 && !isFetching && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 top-9 xxxl:top-10 flex items-center justify-center text-muted-foreground">
              <div className="flex items-center justify-center gap-2 text-sm xxxl:text-base">
                <FontAwesomeIcon icon={faBoxOpen} />
                Nu există {config.titlePlural.toLowerCase()} în inventar.
              </div>
            </div>
          )}

          {isFetching && <SpinnerElement text={2} />}
        </div>
        <div className="shrink-0 border-t border-border bg-muted/10 p-2.5 xxxl:p-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5 xxxl:gap-2">
            <span className="text-sm xxxl:text-base text-foreground font-medium">Arată:</span>
            <Input
              type="text"
              value={limitInput}
              onChange={(event) => {
                const val = event.target.value;
                if (val === "" || (/^\d+$/.test(val) && parseInt(val) <= 999)) setLimitInput(val);
              }}
              onBlur={() => {
                if (limitInput === "" || parseInt(limitInput) < 1) setLimitInput("50");
              }}
              className="w-[54px] xxxl:w-[60px] h-8 text-sm xxxl:text-base text-center bg-background text-foreground px-2"
            />
            <span className="text-sm xxxl:text-base text-foreground font-medium">rânduri</span>
          </div>

          <div className="flex items-center gap-3 xxxl:gap-4">
            <Button variant="default" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className={`h-9 xxxl:h-10 px-3 xxxl:px-4 text-sm xxxl:text-base ${config.hoverButton}`}>
              Înapoi
            </Button>
            <span className="text-sm xxxl:text-base font-semibold text-foreground">
              Pagina {page} / {totalPages || 1}
            </span>
            <Button
              variant="default"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= (totalPages || 1)}
              className={`h-9 xxxl:h-10 px-3 xxxl:px-4 text-sm xxxl:text-base ${config.hoverButton}`}
            >
              Înainte
            </Button>
          </div>
        </div>
      </div>

      <InventarCatalogSelectDialog open={selectDialogOpen} setOpen={setSelectDialogOpen} tipResursa={tipResursa} lockedLang={inventarLang} onConfirm={handleConfirmSelect} />
      {variantDialogParent && <CatalogSubList config={config} open={variantDialogOpen} setOpen={handleSetVariantDialogOpen} parentItem={variantDialogParent} />}
    </div>
  );
}
