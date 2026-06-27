import React, { useCallback, useEffect, useMemo, useState } from "react";
import { TableVirtuoso } from "react-virtuoso";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBoxOpen, faFolderOpen, faListUl, faSort, faSortDown, faSortUp } from "@fortawesome/free-solid-svg-icons";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { resurseConfig } from "@/Database/Catalog/resurseConfig";
import OverflowTooltip from "@/components/ui/OverflowTooltip";
import { cn } from "@/lib/utils";
import { formatNumber, getElementGreutateUnitara, getElementTotalInLucrare, getElementUnitCost, parseMaybeJson, toId } from "../../helpers/OferteReteteHelpers";

const RESOURCE_TABS = [
  { key: "material", label: "Materiale" },
  { key: "manopera", label: "Manoperă" },
  { key: "utilaj", label: "Utilaje" },
  { key: "transport", label: "Transport" },
];

const EMPTY = "—";
const STORAGE_PREFIX = "oferte_extrase_v2";

export const EXTRASE_DEFAULT_VISIBLE_COLUMNS = {
  tip: true,
  cod: true,
  denumire: true,
  clasa: false,
  subclasa: false,
  marca: true,
  furnizor: true,
  unitate: true,
  quantityTotal: true,
  greutateTotala: true,
  cost: true,
  costTotal: true,
  coefPercent: false,
  coefTotal: false,
  pret: true,
  stoc: true,
};

const DEFAULT_COLUMN_WIDTHS = {
  tip: 105,
  cod: 132,
  denumire: 560,
  clasa: 190,
  subclasa: 190,
  marca: 132,
  furnizor: 148,
  unitate: 72,
  quantityTotal: 112,
  greutateTotala: 118,
  cost: 104,
  costTotal: 112,
  coefPercent: 92,
  coefTotal: 104,
  pret: 104,
  stoc: 132,
};

const MIN_COLUMN_WIDTHS = {
  tip: 100,
  cod: 104,
  denumire: 260,
  clasa: 120,
  subclasa: 120,
  marca: 110,
  furnizor: 120,
  unitate: 64,
  quantityTotal: 96,
  greutateTotala: 104,
  cost: 96,
  costTotal: 96,
  coefPercent: 86,
  coefTotal: 96,
  pret: 96,
  stoc: 112,
};

export const EXTRASE_COLUMN_LABELS = {
  tip: "Tip",
  cod: "Cod",
  denumire: "Denumire",
  clasa: "Clasă",
  subclasa: "Subclasă",
  marca: "Marcă",
  furnizor: "Furnizor",
  unitate: "UM",
  quantityTotal: "Cant. totală",
  greutateTotala: "Greutate totală",
  cost: "Cost unitar",
  costTotal: "Cost total",
  coefPercent: "Coef",
  coefTotal: "Coef total",
  pret: "Preț",
  stoc: "Stoc",
};

const TEXT_COLUMNS = new Set(["cod", "denumire", "clasa", "subclasa", "marca", "furnizor"]);
const CENTER_COLUMNS = new Set(["tip", "unitate", "quantityTotal", "greutateTotala", "coefPercent", "stoc"]);
const RIGHT_COLUMNS = new Set(["cost", "costTotal", "coefTotal", "pret"]);
const SORTABLE_COLUMNS = new Set(["cod", "denumire", "clasa", "subclasa", "marca", "furnizor", "unitate", "quantityTotal", "greutateTotala", "cost", "costTotal", "coefPercent", "coefTotal", "pret"]);
const NUMERIC_COLUMNS = new Set(["quantityTotal", "greutateTotala", "cost", "costTotal", "coefPercent", "coefTotal", "pret"]);

const getStorageKey = (name) => `${STORAGE_PREFIX}_${name}`;

const getTextAlignClasses = (textAlign) => {
  if (textAlign === "center") return { cell: "text-center", tooltip: "center", justify: "justify-center" };
  if (textAlign === "right") return { cell: "text-right", tooltip: "right", justify: "justify-end" };
  return { cell: "text-left", tooltip: "left", justify: "justify-start" };
};

const getColumnAlignClass = (key, textAlign) => {
  if (TEXT_COLUMNS.has(key)) return getTextAlignClasses(textAlign).cell;
  if (CENTER_COLUMNS.has(key)) return "text-center";
  if (RIGHT_COLUMNS.has(key)) return "text-right";
  return "text-left";
};

const getHeaderJustifyClass = (key, textAlign) => {
  if (TEXT_COLUMNS.has(key)) return getTextAlignClasses(textAlign).justify;
  if (CENTER_COLUMNS.has(key)) return "justify-center";
  if (RIGHT_COLUMNS.has(key)) return "justify-center";
  return "justify-start";
};

const toNumber = (value) => {
  const parsed = Number(String(value ?? 0).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
};

const getRetetaBaseTotal = (reteta) => {
  return (reteta?.elemente || []).reduce((sum, element) => sum + getElementTotalInLucrare(element, reteta), 0);
};

const getVariantId = (element) => {
  return (
    element?.original_subcategorie_id || element?.subcategorie_id || element?.subcategorie_oferta?.original_subcategorie_id || element?.subcategorie_oferta?.id || element?.oferta_subcategorie_id || ""
  );
};

const hasVariantSelected = (element) => {
  return !!(getVariantId(element) || element?.cod_specific || element?.sub_cod_specific);
};

const getSelectedVariant = (element) => {
  const originalSubId = element?.original_subcategorie_id;
  if (!originalSubId) return null;

  const variants = Array.isArray(element?.subcategorii) ? element.subcategorii : [];
  return variants.find((sub) => Number(sub.id) === Number(originalSubId)) || null;
};

const getDisplayedCode = (element) => {
  if (hasVariantSelected(element)) {
    return element?.cod_specific || element?.sub_cod_specific || element?.subcategorie_oferta?.cod_specific || element?.cod_afisat || EMPTY;
  }

  return element?.cod_definitie || element?.definitie_oferta?.cod_definitie || element?.definitie_live?.cod_definitie || element?.definitie_cod || element?.cod_afisat || EMPTY;
};

const getDisplayedName = (element, displayLang) => {
  if (displayLang === "FR") {
    return element?.denumire_fr || element?.definitie_oferta?.denumire_fr || element?.denumire || "";
  }

  return element?.denumire || element?.definitie_oferta?.denumire || "";
};

const getCatalogClassLevels = (element) => {
  const snapshot = parseMaybeJson(element?.definitie_oferta?.catalog_class_snapshot || element?.catalog_class_snapshot, []);

  if (Array.isArray(snapshot)) return snapshot;
  if (Array.isArray(snapshot?.levels)) return snapshot.levels;
  if (Array.isArray(snapshot?.classLevels)) return snapshot.classLevels;

  return [];
};

const getClassLabel = (element, levelNo, displayLang) => {
  const levels = getCatalogClassLevels(element);
  const level = levels[levelNo - 1] || levels.find((item) => Number(item?.level_no) === Number(levelNo));

  if (!level || level.is_empty) return "";

  const code = level.code_segment || level.segment || "";
  if (!code || String(code) === "00") return "";

  const denumire = displayLang === "FR" ? level.denumire_fr || level.denumire_ro : level.denumire_ro;
  const label = level.is_defined && denumire ? denumire : "Nedefinit";

  return `${code}. ${label}`;
};

const getVariantMetaLabel = (element, key) => {
  const tipResursa = String(element?.tip_resursa || "")
    .trim()
    .toLowerCase();
  if (!["material", "utilaj"].includes(tipResursa)) return "";
  if (!hasVariantSelected(element)) return "";

  const field = key === "furnizor" ? "furnizor_denumire" : "marca_denumire";

  return String(element?.[field] ?? element?.subcategorie_oferta?.[field] ?? "").trim();
};

const getElementQuantityTotal = (element, reteta) => {
  return toNumber(element?.cantitate_in_reteta ?? element?.cantitate) * toNumber(reteta?.cantitate_lucrare);
};

const getElementDefinitionId = (element) => {
  return String(element?.original_definitie_id || element?.definitie_id || element?.oferta_definitie_id || element?.definitie_oferta?.original_definitie_id || "");
};

const getElementCoefficientImpact = (element, reteta, coeficientEditorState, retetaBaseTotal) => {
  const elementImpact = coeficientEditorState?.elementImpactById?.[toId(element?.id)] || {};
  const retetaImpact = coeficientEditorState?.retetaImpactById?.[toId(reteta?.id)] || {};
  const elementBaseTotal = getElementTotalInLucrare(element, reteta);
  const elementAdded = elementImpact.excluded ? 0 : toNumber(elementImpact.addedValue);
  const retetaDirectAdded = retetaImpact.excluded ? 0 : toNumber(retetaImpact.directAdded);
  const retetaDirectShare = retetaDirectAdded && retetaBaseTotal > 0 ? retetaDirectAdded * (elementBaseTotal / retetaBaseTotal) : 0;
  const addedValue = elementAdded + retetaDirectShare;
  const inactive = !!elementImpact.inactive && Math.abs(elementAdded) < 0.000001;
  const inactivePercent = inactive ? toNumber(elementImpact.percent || elementImpact.inactivePercent) : 0;

  return {
    addedValue,
    inactive,
    inactivePercent,
    excluded: !!elementImpact.excluded,
  };
};

const buildExtractRows = ({ retete, resourceKey, displayLang, coeficientEditorState }) => {
  const grouped = new Map();

  (retete || []).forEach((reteta) => {
    const retetaBaseTotal = getRetetaBaseTotal(reteta);

    (reteta.elemente || []).forEach((element) => {
      const tipResursa = String(element?.tip_resursa || "")
        .trim()
        .toLowerCase();
      if (tipResursa !== resourceKey) return;

      const unitCost = getElementUnitCost(element);
      const unitate = String(element?.unitate_masura || reteta?.unitate_masura || "").trim();
      const quantityTotal = getElementQuantityTotal(element, reteta);
      const baseTotal = getElementTotalInLucrare(element, reteta);
      const greutateUnitara = resourceKey === "material" ? getElementGreutateUnitara(element) : 0;
      const coefImpact = getElementCoefficientImpact(element, reteta, coeficientEditorState, retetaBaseTotal);
      const originalDefinitionId = element?.original_definitie_id || element?.definitie_id || element?.oferta_definitie_id || element?.definitie_oferta?.original_definitie_id || "";
      const variantId = getVariantId(element);
      const isVariant = hasVariantSelected(element);
      const key = JSON.stringify([originalDefinitionId, variantId, unitate, unitCost]);

      if (!grouped.has(key)) {
        grouped.set(key, {
          key,
          resourceFilter: {
            tipResursa,
            originalDefinitionId: String(originalDefinitionId || ""),
            variantId: String(variantId || ""),
            unitate,
            unitCost,
          },
          tipResursa,
          isVariant,
          cod: getDisplayedCode(element),
          denumire: getDisplayedName(element, displayLang),
          clasa: getClassLabel(element, 1, displayLang),
          subclasa: getClassLabel(element, 2, displayLang),
          furnizor: getVariantMetaLabel(element, "furnizor"),
          marca: getVariantMetaLabel(element, "marca"),
          unitate,
          cost: unitCost,
          quantityTotal: 0,
          greutateTotala: 0,
          costTotal: 0,
          coefTotal: 0,
          coefInactive: false,
          inactiveCoefPercent: 0,
          pret: 0,
        });
      }

      const row = grouped.get(key);
      row.quantityTotal += quantityTotal;
      row.greutateTotala += greutateUnitara * quantityTotal;
      row.costTotal += baseTotal;
      row.coefTotal += coefImpact.addedValue;
      row.pret += baseTotal + coefImpact.addedValue;

      if (coefImpact.inactive) {
        row.coefInactive = true;
        row.inactiveCoefPercent = Math.max(row.inactiveCoefPercent, coefImpact.inactivePercent);
      }
    });
  });

  return [...grouped.values()].map((row) => ({
    ...row,
    coefPercent: row.coefTotal ? (row.costTotal > 0 ? (row.coefTotal / row.costTotal) * 100 : 0) : row.inactiveCoefPercent,
    pret: row.pret || row.costTotal + row.coefTotal,
  }));
};

const includesSearch = (row, search) => {
  const term = String(search || "")
    .trim()
    .toLowerCase();
  if (!term) return true;

  return [row.cod, row.denumire, row.clasa, row.subclasa, row.furnizor, row.marca, row.unitate].some((value) =>
    String(value || "")
      .toLowerCase()
      .includes(term),
  );
};

const getSortValue = (row, key) => {
  if (NUMERIC_COLUMNS.has(key)) return toNumber(row?.[key]);
  return String(row?.[key] || "").toLowerCase();
};

export const getAvailableExtraseColumns = (resourceKey) => {
  const showMetaColumns = resourceKey === "material" || resourceKey === "utilaj";
  const showWeightColumn = resourceKey === "material";
  const showStocColumn = resourceKey === "material" || resourceKey === "utilaj" || resourceKey === "transport";

  return [
    "tip",
    "cod",
    "denumire",
    "clasa",
    "subclasa",
    ...(showMetaColumns ? ["marca", "furnizor"] : []),
    "unitate",
    "quantityTotal",
    ...(showWeightColumn ? ["greutateTotala"] : []),
    "cost",
    "costTotal",
    "coefPercent",
    "coefTotal",
    "pret",
    ...(showStocColumn ? ["stoc"] : []),
  ];
};

const getSafeVisibleColumns = (resourceKey, visibleColumns) => {
  const available = getAvailableExtraseColumns(resourceKey);
  return available.filter((key) => visibleColumns?.[key] !== false);
};

function ResizableTableHead({ colKey, style, className = "", onResizeStart, children }) {
  return (
    <TableHead style={style} className={cn("relative px-0 select-none", className)}>
      {children}
      <span
        onPointerDown={(event) => onResizeStart(event, colKey)}
        className="absolute right-0 top-0 z-30 flex h-full w-3 cursor-col-resize touch-none select-none items-center justify-center hover:bg-primary/20"
      >
        <span className="h-8 w-[2px] rounded-full bg-foreground" />
      </span>
    </TableHead>
  );
}

const ResourceSelector = ({ activeResource, onChange }) => (
  <div className="flex flex-wrap items-center gap-1.5">
    {RESOURCE_TABS.map((item) => {
      const config = resurseConfig[item.key];
      const active = activeResource === item.key;

      return (
        <Button
          key={item.key}
          type="button"
          variant={active ? "default" : "outline"}
          className={cn("h-8 gap-1.5 px-2 text-sm font-bold", active ? config.hoverButton : "bg-card hover:bg-accent")}
          onClick={() => onChange(item.key)}
        >
          <FontAwesomeIcon icon={config.icon} className="text-sm" />
          {item.label}
        </Button>
      );
    })}
  </div>
);

const ExtraseVirtualRow = React.forwardRef((props, ref) => {
  const { context, item, className, ...rowProps } = props;
  const rowIndex = Number(rowProps["data-index"]);
  const row = item || (Number.isFinite(rowIndex) ? context?.rows?.[rowIndex] : null);
  const canOpen = !!row;

  const rowNode = (
    <TableRow
      ref={ref}
      {...rowProps}
      className={cn("h-9 cursor-pointer border-b hover:bg-accent", className)}
      onMouseDownCapture={(event) => {
        if (event.shiftKey) {
          event.preventDefault();
          window.getSelection()?.removeAllRanges();
        }
      }}
      onFocus={(event) => {
        if (event.target === event.currentTarget) {
          event.currentTarget.blur();
        }
      }}
      onClick={(event) => {
        rowProps.onClick?.(event);
        if (!row || event.target.closest("a, button, input, textarea, select")) return;
        context?.onOpenDetails?.(row, { expandElemente: false });
      }}
    />
  );

  if (!canOpen) return rowNode;

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{rowNode}</ContextMenuTrigger>

      <ContextMenuContent className="w-52">
        <ContextMenuItem className="gap-3" onClick={() => context?.onOpenDetails?.(row)}>
          <FontAwesomeIcon icon={faListUl} className="text-primary" />
          Deschide rețete
        </ContextMenuItem>

        <ContextMenuItem className="gap-3" onClick={() => context?.onOpenVariant?.(row)}>
          <FontAwesomeIcon icon={faFolderOpen} className="text-amber-500 dark:text-amber-300" />
          Deschide variante
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
});
ExtraseVirtualRow.displayName = "ExtraseVirtualRow";

const componentsExtrase = {
  Table: (props) => <table {...props} className="min-w-full w-full table-fixed caption-bottom text-left border-collapse" />,
  TableHead: React.forwardRef((props, ref) => <TableHeader {...props} ref={ref} className="sticky top-0 z-10 bg-background" />),
  TableBody: React.forwardRef((props, ref) => <TableBody {...props} ref={ref} />),
  TableRow: ExtraseVirtualRow,
};
componentsExtrase.TableHead.displayName = "ExtraseTableHead";
componentsExtrase.TableBody.displayName = "ExtraseTableBody";

export default function OferteExtraseView({
  retete = [],
  displayLang = "RO",
  currency = "RON",
  resourceKey = "material",
  onResourceKeyChange,
  search = "",
  decimalPlaces = 2,
  textAlign = "left",
  visibleColumns = EXTRASE_DEFAULT_VISIBLE_COLUMNS,
  columnResetKey = 0,
  coeficientEditorState = null,
  onOpenDetails,
  onOpenVariant,
}) {
  const [sortConfig, setSortConfig] = useState({ key: "denumire", direction: "asc" });
  const [columnWidths, setColumnWidths] = useState(() => ({
    ...DEFAULT_COLUMN_WIDTHS,
    ...(() => {
      try {
        const parsed = JSON.parse(localStorage.getItem(getStorageKey("column_widths")) || "null");
        return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
      } catch {
        return {};
      }
    })(),
  }));

  const config = resurseConfig[resourceKey] || resurseConfig.material;
  const textAlignClasses = getTextAlignClasses(textAlign);
  const visibleColumnKeys = useMemo(() => getSafeVisibleColumns(resourceKey, visibleColumns), [resourceKey, visibleColumns]);

  useEffect(() => {
    try {
      localStorage.setItem(getStorageKey("column_widths"), JSON.stringify(columnWidths));
    } catch {}
  }, [columnWidths]);

  useEffect(() => {
    if (!columnResetKey) return;

    setColumnWidths(DEFAULT_COLUMN_WIDTHS);
    try {
      localStorage.removeItem(getStorageKey("column_widths"));
    } catch {}
  }, [columnResetKey]);

  const rows = useMemo(() => {
    const filteredRows = buildExtractRows({ retete, resourceKey, displayLang, coeficientEditorState }).filter((row) => includesSearch(row, search));
    const direction = sortConfig.direction === "desc" ? -1 : 1;

    return [...filteredRows].sort((a, b) => {
      const aValue = getSortValue(a, sortConfig.key);
      const bValue = getSortValue(b, sortConfig.key);

      if (NUMERIC_COLUMNS.has(sortConfig.key)) return (aValue - bValue) * direction;

      return String(aValue).localeCompare(String(bValue), "ro", { numeric: true, sensitivity: "base" }) * direction;
    });
  }, [coeficientEditorState, displayLang, resourceKey, retete, search, sortConfig.direction, sortConfig.key]);

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
        const nextWidth = Math.max(minWidth, startWidth + moveEvent.clientX - startX);

        if (frame) window.cancelAnimationFrame(frame);
        frame = window.requestAnimationFrame(() => {
          setColumnWidths((prev) => ({ ...prev, [key]: nextWidth }));
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

  const handleSortColumn = useCallback((key) => {
    if (!SORTABLE_COLUMNS.has(key)) return;

    setSortConfig((prev) => {
      if (prev.key !== key) return { key, direction: "asc" };
      if (prev.direction === "asc") return { key, direction: "desc" };
      return { key: "denumire", direction: "asc" };
    });
  }, []);

  const renderHeaderLabel = useCallback(
    (key) => {
      if (key === "quantityTotal") {
        return (
          <span className="flex min-w-0 flex-col leading-tight">
            <span>Cantitate</span>
            <span>totală</span>
          </span>
        );
      }

      if (key === "greutateTotala") {
        return (
          <span className="flex min-w-0 flex-col leading-tight">
            <span>Greutate</span>
            <span>totală</span>
          </span>
        );
      }

      if (key === "cost" || key === "costTotal" || key === "coefTotal" || key === "pret") {
        return (
          <span className="flex min-w-0 flex-col leading-tight">
            <span>{EXTRASE_COLUMN_LABELS[key]}</span>
            <span className="text-xs font-black text-foreground/80">- {currency} -</span>
          </span>
        );
      }

      return <span className="min-w-0 truncate">{EXTRASE_COLUMN_LABELS[key]}</span>;
    },
    [currency],
  );

  const renderHeaderContent = useCallback(
    (key) => {
      const active = sortConfig.key === key;
      const icon = !active ? faSort : sortConfig.direction === "asc" ? faSortDown : faSortUp;
      const justify = getHeaderJustifyClass(key, textAlign);

      if (!SORTABLE_COLUMNS.has(key)) {
        return <div className={cn("flex h-full w-full items-center px-2 py-1.5 text-sm font-black text-foreground", justify)}>{renderHeaderLabel(key)}</div>;
      }

      return (
        <button
          type="button"
          className={cn("flex h-full w-full items-center gap-1 px-2 py-1.5 text-sm font-black text-foreground", justify)}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            handleSortColumn(key);
          }}
        >
          {renderHeaderLabel(key)}
          <FontAwesomeIcon icon={icon} className={cn("text-sm", active ? "text-primary" : "text-muted-foreground")} />
        </button>
      );
    },
    [handleSortColumn, renderHeaderLabel, sortConfig.direction, sortConfig.key, textAlign],
  );

  const renderCellContent = (row, key) => {
    if (key === "tip") {
      return (
        <Badge
          variant="outline"
          className={cn("h-6 justify-center px-2 text-xs font-black", row.isVariant ? "border-primary bg-primary/10 text-primary" : "border-foreground/40 bg-card text-foreground")}
        >
          {row.isVariant ? "Variantă" : "Definiție"}
        </Badge>
      );
    }

    if (TEXT_COLUMNS.has(key)) {
      const value = row[key] || EMPTY;
      return (
        <OverflowTooltip
          text={value}
          align={textAlignClasses.tooltip}
          className={cn("truncate text-sm text-foreground", key === "cod" || key === "denumire" ? "font-bold" : "font-normal", textAlignClasses.cell)}
          maxLines={1}
        />
      );
    }

    if (key === "unitate") {
      return (
        <Badge variant="outline" className="h-7 justify-center px-2 text-xs font-bold">
          {row.unitate || EMPTY}
        </Badge>
      );
    }

    if (key === "quantityTotal") return <span className="text-sm font-bold text-foreground">{formatNumber(row.quantityTotal, decimalPlaces)}</span>;
    if (key === "greutateTotala") return <span className="text-sm font-semibold text-foreground">{row.greutateTotala ? `${formatNumber(row.greutateTotala, decimalPlaces)} kg` : EMPTY}</span>;
    if (key === "cost") return <span className="text-sm font-bold text-foreground">{formatNumber(row.cost, decimalPlaces)}</span>;
    if (key === "costTotal") return <span className="text-sm font-bold text-foreground">{formatNumber(row.costTotal, decimalPlaces)}</span>;
    if (key === "coefPercent") {
      return (
        <span
          className={cn(
            "whitespace-nowrap text-sm font-black",
            row.coefInactive && !row.coefTotal ? "text-red-600 dark:text-red-400" : row.coefPercent ? "text-teal-700 dark:text-teal-300" : "text-muted-foreground/60",
          )}
        >
          {formatNumber(row.coefPercent, 2)}%
        </span>
      );
    }
    if (key === "coefTotal") return <span className="text-sm font-black text-primary">{formatNumber(row.coefTotal, decimalPlaces)}</span>;
    if (key === "pret") return <span className="text-sm font-black text-primary">{formatNumber(row.pret, decimalPlaces)}</span>;
    if (key === "stoc") return <span className="text-sm font-black text-muted-foreground/70">—</span>;

    return EMPTY;
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex shrink-0 items-center border-b border-border bg-background p-2">
        <ResourceSelector activeResource={resourceKey} onChange={onResourceKeyChange} />
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        {rows.length === 0 ? (
          <div className="flex h-full w-full items-center justify-center bg-card text-muted-foreground hover:bg-card">
            <div className="flex items-center justify-center gap-2 text-sm font-semibold">
              <FontAwesomeIcon icon={faBoxOpen} />
              Nu există extrase pentru selecția curentă.
            </div>
          </div>
        ) : (
          <TableVirtuoso
            overscan={8}
            totalCount={rows.length}
            data={rows}
            style={{ height: "100%", width: "100%" }}
            components={componentsExtrase}
            context={{
              rows,
              onOpenDetails,
              onOpenVariant,
            }}
            fixedHeaderContent={() => (
              <TableRow className="h-10 bg-muted-foreground/25 hover:bg-muted-foreground/25">
                {visibleColumnKeys.map((key) => (
                  <ResizableTableHead key={key} colKey={key} style={getColumnStyle(key)} onResizeStart={handleColumnResizeStart} className={cn(getColumnAlignClass(key, textAlign))}>
                    {renderHeaderContent(key)}
                  </ResizableTableHead>
                ))}
              </TableRow>
            )}
            itemContent={(_, row) =>
              visibleColumnKeys.map((key) => (
                <TableCell key={key} style={getColumnStyle(key)} className={cn("px-2 py-1 align-middle", getColumnAlignClass(key, textAlign))}>
                  {renderCellContent(row, key)}
                </TableCell>
              ))
            }
          />
        )}
      </div>

    </div>
  );
}
