import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBoxOpen, faSort, faSortDown, faSortUp } from "@fortawesome/free-solid-svg-icons";
import { toast } from "sonner";

import CatalogFilters from "@/Database/Catalog/CatalogFilters";
import { resurseConfig } from "@/Database/Catalog/resurseConfig";
import OverflowTooltip from "@/components/ui/OverflowTooltip";
import ImagePreviewTooltip from "@/components/ui/ImagePreviewTooltip";
import SpinnerElement from "@/MainElements/SpinnerElement";
import InventarCatalogSelectDialog from "./InventarCatalogSelectDialog";
import { useAddInventarResurse, useInventarResurse } from "@/hooks/Database/useInventar";
import photoAPI from "@/api/photoAPI";
import NoImage from "@/assets/no-image-icon.png";

const COLUMN_WIDTHS_STORAGE_KEY = "inventar_column_widths";
const TEXT_ALIGN_STORAGE_KEY = "inventar_text_align";

const DEFAULT_COLUMN_WIDTHS = {
  poza: 96,
  limba: 90,
  variante: 110,
  cod: 200,
  clasa1: 170,
  clasa2: 170,
  denumire: 300,
  descriere: 380,
  unitate: 120,
  cost: 140,
  creat: 210,
  actualizat: 210,
};

const MIN_COLUMN_WIDTHS = {
  poza: 70,
  limba: 70,
  variante: 80,
  cod: 130,
  clasa1: 110,
  clasa2: 110,
  denumire: 180,
  descriere: 220,
  unitate: 90,
  cost: 100,
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

const normalizeDecimalPlaces = (value) => ([1, 2, 3].includes(Number(value)) ? Number(value) : 3);

const getTextAlignClasses = (textAlign) => {
  if (textAlign === "left") return { cell: "text-left", flex: "justify-start", tooltip: "left" };
  if (textAlign === "right") return { cell: "text-right", flex: "justify-end", tooltip: "right" };
  return { cell: "text-center", flex: "justify-center", tooltip: "center" };
};

const formatNumber = (value, digits = 3) => {
  const numberValue = Number(value || 0);
  return Number.isFinite(numberValue) ? numberValue.toFixed(digits).replace(".", ",") : (0).toFixed(digits).replace(".", ",");
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

function InventarResourceRow({ item, config, visibleColumns, displayLang, getColumnStyle, textAlignClasses, decimalPlaces }) {
  const showCol = (key) => visibleColumns[key];
  const afisareDenumire = displayLang === "FR" ? item.denumire_fr || item.denumire : item.denumire;
  const afisareDescriere = displayLang === "FR" ? item.descriere_fr || "" : item.descriere;

  return (
    <TableRow className="border-b hover:bg-accent">
      {config.hasPhoto && showCol("poza") && (
        <TableCell style={getColumnStyle("poza")} className="text-center px-3 xxxl:px-4 py-1.5 xxxl:py-2">
          <ImagePreviewTooltip
            src={item.photo_url ? `${photoAPI}/${item.photo_url}` : null}
            alt={item.cod_definitie}
            ringColor={`hover:ring-${config.normalColor}`}
            fallback={<img src={NoImage} alt="No Image" className="h-full w-full object-cover opacity-50" />}
            containerClassName="h-14 w-14 xxxl:h-16 xxxl:w-16 rounded-md border border-border bg-muted flex items-center justify-center overflow-hidden shrink-0 mx-auto"
          />
        </TableCell>
      )}

      {showCol("limba") && (
        <TableCell style={getColumnStyle("limba")} className="text-center px-3 xxxl:px-4 py-1.5 xxxl:py-2">
          <div className="flex justify-center">
            <div className={`rounded-md border ${item.limba !== "FR" ? "bg-cyan-500/5 border-cyan-500" : "bg-lime-500/5 border-lime-500"} flex items-center justify-center`}>
              <span className={`text-sm xxxl:text-base w-10 xxxl:w-12 py-1.5 xxxl:py-2 font-bold ${item.limba !== "FR" ? "text-cyan-600 " : "text-lime-600"}`}>{item.limba}</span>
            </div>
          </div>
        </TableCell>
      )}

      {showCol("variante") && (
        <TableCell style={getColumnStyle("variante")} className="text-center px-3 xxxl:px-4 py-1.5 xxxl:py-2">
          <Badge
            variant="outline"
            className={`text-sm xxxl:text-base px-3 xxxl:px-4 py-1.5 xxxl:py-2 shadow-none whitespace-nowrap ${item.subcategorii?.length > 0 ? (item.limba !== "FR" ? "text-cyan-600 border-cyan-500" : "text-lime-600 border-lime-500") : "text-muted-foreground "}`}
          >
            {item.subcategorii?.length || 0}
          </Badge>
        </TableCell>
      )}

      {showCol("cod") && (
        <TableCell style={getColumnStyle("cod")} className={`${textAlignClasses.cell} px-3 xxxl:px-4 py-1.5 xxxl:py-2 whitespace-nowrap`}>
          <span className="text-sm xxxl:text-base font-bold text-foreground">{item.cod_definitie}</span>
        </TableCell>
      )}

      {showCol("clasa1") && (
        <TableCell style={getColumnStyle("clasa1")} className={`${textAlignClasses.cell} px-3 xxxl:px-4 py-1.5 xxxl:py-2`}>
          {getCatalogClassLevelDisplay(item, 1, displayLang) ? (
            <OverflowTooltip align={textAlignClasses.tooltip} text={getCatalogClassLevelDisplay(item, 1, displayLang)} className={`text-sm xxxl:text-base truncate text-foreground ${textAlignClasses.cell}`} maxLines={1} />
          ) : (
            <span className="text-sm xxxl:text-base text-muted-foreground/40 italic">—</span>
          )}
        </TableCell>
      )}

      {showCol("clasa2") && (
        <TableCell style={getColumnStyle("clasa2")} className={`${textAlignClasses.cell} px-3 xxxl:px-4 py-1.5 xxxl:py-2`}>
          {getCatalogClassLevelDisplay(item, 2, displayLang) ? (
            <OverflowTooltip align={textAlignClasses.tooltip} text={getCatalogClassLevelDisplay(item, 2, displayLang)} className={`text-sm xxxl:text-base truncate text-foreground ${textAlignClasses.cell}`} maxLines={1} />
          ) : (
            <span className="text-sm xxxl:text-base text-muted-foreground/40 italic">—</span>
          )}
        </TableCell>
      )}

      {showCol("denumire") && (
        <TableCell style={getColumnStyle("denumire")} className={`${textAlignClasses.cell} px-3 xxxl:px-4 py-1.5 xxxl:py-2`}>
          <OverflowTooltip align={textAlignClasses.tooltip} text={afisareDenumire || "—"} className={`text-sm xxxl:text-base truncate text-foreground ${textAlignClasses.cell}`} maxLines={2} />
        </TableCell>
      )}

      {showCol("descriere") && (
        <TableCell style={getColumnStyle("descriere")} className={`${textAlignClasses.cell} px-3 xxxl:px-4 py-1.5 xxxl:py-2`}>
          {afisareDescriere ? (
            <OverflowTooltip align={textAlignClasses.tooltip} text={afisareDescriere} className={`text-sm xxxl:text-base truncate text-foreground ${textAlignClasses.cell}`} maxLines={2} />
          ) : (
            <span className="text-sm xxxl:text-base text-muted-foreground/40 italic">—</span>
          )}
        </TableCell>
      )}

      {showCol("unitate") && (
        <TableCell style={getColumnStyle("unitate")} className="text-center px-3 xxxl:px-4 py-1.5 xxxl:py-2">
          <Badge variant="outline" className="text-sm xxxl:text-base px-3 xxxl:px-4 py-1.5 xxxl:py-2 shadow-none whitespace-nowrap">
            {item.unitate_masura}
          </Badge>
        </TableCell>
      )}

      {showCol("cost") && (
        <TableCell style={getColumnStyle("cost")} className="text-center px-3 xxxl:px-4 py-1.5 xxxl:py-2">
          <span className="font-bold text-sm xxxl:text-base text-foreground">{formatNumber(item.cost, decimalPlaces)}</span>
        </TableCell>
      )}

      {showCol("creat") && (
        <TableCell style={getColumnStyle("creat")} className="text-left px-3 xxxl:px-4 py-1.5 xxxl:py-2">
          <div className="flex items-center gap-2 xxxl:gap-2.5 h-10 xxxl:h-12 overflow-hidden">
            <Avatar className="h-9 w-9 xxxl:h-10 xxxl:w-10 border rounded-md border-border shrink-0">
              <AvatarImage src={item.created_by_photo_url ? `${photoAPI}/${item.created_by_photo_url}` : undefined} alt={item.created_by_name} className="object-cover" />
              <AvatarFallback className="text-xs xxxl:text-sm rounded-md bg-muted font-bold">{getUserInitials(item.created_by_name)}</AvatarFallback>
            </Avatar>

            <div className="flex flex-col justify-center min-w-0 leading-tight">
              <span className="text-xs xxxl:text-sm font-bold text-foreground truncate block">{item.created_by_name || "Sistem"}</span>
              <span className="text-[10px] xxxl:text-[11px] text-muted-foreground mt-0.5">{formatDateTime(item.created_at)}</span>
            </div>
          </div>
        </TableCell>
      )}

      {showCol("actualizat") && (
        <TableCell style={getColumnStyle("actualizat")} className="text-left px-3 xxxl:px-4 py-1.5 xxxl:py-2">
          <div className="flex items-center gap-2 xxxl:gap-2.5 h-10 xxxl:h-12 overflow-hidden">
            <Avatar className="h-9 w-9 xxxl:h-10 xxxl:w-10 border rounded-md border-border shrink-0">
              <AvatarImage src={item.updated_by_photo_url ? `${photoAPI}/${item.updated_by_photo_url}` : undefined} alt={item.updated_by_name} className="object-cover" />
              <AvatarFallback className="text-xs xxxl:text-sm rounded-md bg-muted font-bold">{getUserInitials(item.updated_by_name)}</AvatarFallback>
            </Avatar>

            <div className="flex flex-col justify-center min-w-0 leading-tight">
              <span className="text-xs xxxl:text-sm font-bold text-foreground truncate block">{item.updated_by_name || "Sistem"}</span>
              <span className="text-[10px] xxxl:text-[11px] text-muted-foreground mt-0.5">{formatDateTime(item.updated_at)}</span>
            </div>
          </div>
        </TableCell>
      )}
    </TableRow>
  );
}

export default function InventarResursePage({ inventar, tipResursa }) {
  const config = resurseConfig[tipResursa];
  const displayLang = inventar?.limba || "RO";

  const [selectDialogOpen, setSelectDialogOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [page, setPage] = useState(1);
  const [limitInput, setLimitInput] = useState("50");
  const [limitDebounced, setLimitDebounced] = useState(50);
  const [visibleColumns, setVisibleColumns] = useState({
    poza: config.hasPhoto,
    limba: true,
    variante: true,
    cod: true,
    clasa1: false,
    clasa2: false,
    denumire: true,
    descriere: false,
    unitate: true,
    cost: true,
    creat: false,
    actualizat: false,
  });

  const [decimalPlaces, setDecimalPlaces] = useState(3);
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
        };
      }
    } catch {}

    return DEFAULT_COLUMN_WIDTHS;
  });

  useEffect(() => {
    try {
      localStorage.setItem(TEXT_ALIGN_STORAGE_KEY, textAlign);
    } catch {}
  }, [textAlign]);

  useEffect(() => {
    setVisibleColumns((prev) => ({ ...prev, poza: config.hasPhoto }));
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
      limba: displayLang,
      sortBy: "updated_at",
      sortOrder: "desc",
    }),
    [displayLang],
  );

  const [advancedFilters, setAdvancedFilters] = useState(() => getDefaultAdvancedFilters());
  const [advancedFiltersDebounced, setAdvancedFiltersDebounced] = useState(() => getDefaultAdvancedFilters());

  useEffect(() => {
    const defaults = getDefaultAdvancedFilters();
    setSearch("");
    setAdvancedFilters(defaults);
    setAdvancedFiltersDebounced(defaults);
    setPage(1);
  }, [tipResursa, getDefaultAdvancedFilters]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchDebounced(search);
      setAdvancedFiltersDebounced({ ...advancedFilters, limba: displayLang });

      let parsedLimit = parseInt(limitInput);
      if (Number.isNaN(parsedLimit) || parsedLimit < 1) parsedLimit = 50;
      setLimitDebounced(parsedLimit);
      setPage(1);
    }, 500);

    return () => clearTimeout(handler);
  }, [search, limitInput, advancedFilters, displayLang]);

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

  const toggleCol = (key, val) => {
    setVisibleColumns((prev) => ({ ...prev, [key]: val }));
  };

  const colCount = Object.entries(visibleColumns).filter(([key, value]) => value && (key !== "poza" || config.hasPhoto)).length;

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
          className={`flex h-full w-full items-center gap-1 px-2 xxxl:px-2.5 text-sm xxxl:text-base font-bold text-foreground ${justifyClass}`}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            handleSortColumn(columnKey);
          }}
        >
          <span className="min-w-0 truncate">{label}</span>
          <FontAwesomeIcon icon={icon} className={`text-base xxxl:text-lg ${active ? "!text-primary" : "text-muted-foreground"}`} />
        </button>
      );
    },
    [handleSortColumn, advancedFilters.sortBy, advancedFilters.sortOrder],
  );

  const renderPlainHeader = useCallback((label, align = "center") => {
    const justifyClass = align === "left" ? "justify-start text-left" : align === "right" ? "justify-end text-right" : "justify-center text-center";
    return <div className={`flex h-full w-full items-center px-2 xxxl:px-2.5 text-sm xxxl:text-base font-bold text-foreground ${justifyClass}`}>{label}</div>;
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
        onDisplayLangToggle={() => {}}
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
            return { ...next, limba: displayLang };
          });
        }}
        lockedLang={displayLang}
      />

      <div className="flex-1 min-h-0 rounded-lg border border-border bg-card overflow-hidden flex flex-col">
        <div className="flex-1 overflow-auto">
          <Table className="min-w-full table-fixed">
            <TableHeader className="sticky top-0 z-10 bg-background">
              <TableRow className="h-9 xxxl:h-10 bg-muted-foreground/25">
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
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={colCount} className="h-40 text-center text-muted-foreground">
                    <div className="flex items-center justify-center gap-2 text-sm xxxl:text-base">
                      <FontAwesomeIcon icon={faBoxOpen} />
                      Nu există {config.titlePlural.toLowerCase()} în inventar.
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
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
                  />
                ))
              )}
            </TableBody>
          </Table>

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

      <InventarCatalogSelectDialog open={selectDialogOpen} setOpen={setSelectDialogOpen} tipResursa={tipResursa} lockedLang={displayLang} onConfirm={handleConfirmSelect} />
    </div>
  );
}
