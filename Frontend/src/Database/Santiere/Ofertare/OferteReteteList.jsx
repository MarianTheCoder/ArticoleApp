import React, { memo, useCallback, useLayoutEffect, useEffect, useState, useMemo, useRef } from "react";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from "@/components/ui/context-menu";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCalculator,
  faCoins,
  faCopy,
  faFolder,
  faListUl,
  faPenToSquare,
  faScrewdriverWrench,
  faTrash,
  faTruck,
  faTriangleExclamation,
  faFolderOpen,
  faArrowsRotate,
  faArrowRightLong,
  faPlus,
  faPalette,
  faRightLeft,
  faSort,
  faSortDown,
  faSortUp,
} from "@fortawesome/free-solid-svg-icons";

import { TableVirtuoso } from "react-virtuoso";
import OverflowTooltip from "@/components/ui/OverflowTooltip";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import OferteRetetaSubList from "./OferteRetetaSubList";
import OferteElementVariantDialog from "./OferteElementVariantDialog";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipArrow } from "@radix-ui/react-tooltip";

import { DndContext, DragOverlay, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import photoAPI from "@/api/photoAPI";
import ImagePreviewTooltip from "@/components/ui/ImagePreviewTooltip";
import NoImage from "@/assets/no-image-icon.png";
import OferteDuplicateReteteDialog from "./OferteDuplicateReteteDialog";
import OferteReplaceReteteDialog from "./OferteReplaceReteteDialog";

import {
  toId,
  normalizeColumns,
  normalizeColoaneValori,
  getColoanaValue,
  formatNumber,
  getRetetaCost,
  getRetetaTotalLucrare,
  getRetetaGreutateUnitara,
  getRetetaGreutateTotala,
  getElementTotalInLucrare,
  getPercentNumber,
  normalizePercentInput,
  getRangeIds,
  reorderSelectedBlock,
  buildDisplayRowsWithCategories,
  buildAvailableCategoryFields,
  EMPTY_CATEGORY_VALUE,
  getCategoryValue,
  getCategoryColor,
  getReadableTextColor,
  normalizeCategoryColorsConfig,
  normalizeCategoryConfig,
  getRetetaClassLevelDisplay,
} from "./helpers/OferteReteteHelpers";

import OferteQtyFormulaCell from "./components/OferteQtyCell";
import OferteActualizeazaReteteDialog from "./components/OferteActualizeazaDialog";
import OferteFurnizoriDialog from "./components/OferteFurnizorDialog";
import { OferteRetetaCodeValue } from "./components/OferteRetetaCodeClassDisplay";
import { Separator } from "@/components/ui/separator";

import { resurseConfig } from "@/Database/Catalog/resurseConfig";
import { useEditOfertaRetetaElementVariant } from "@/hooks/Database/useOferte";

const COLUMN_WIDTHS_STORAGE_KEY = "oferte_retete_column_widths";

const getDefaultColumnWidths = () => ({
  tree: 26,
  elemente: 42,
  poza: 48,
  info: 40,
  cod: 150,
  clasa1: 128,
  clasa2: 128,
  clasa3: 128,
  clasa4: 128,
  clasa5: 128,
  denumire: typeof window !== "undefined" && window.innerWidth >= 1980 ? 480 : 550,
  descriere: typeof window !== "undefined" && window.innerWidth >= 1980 ? 220 : 180,
  furnizor: 118,
  marca: 112,
  dynamic: 104,
  unitate: 68,
  greutateUnitara: 112,
  greutateTotala: 112,
  cantitate: 104,
  cost: 105,
  qtyTotal: 100,
  costTotal: 132,
  coefProcent: 98,
  coefPret: 112,
  pret: 104,
  creat: 180,
  actualizat: 180,
});

const MIN_COL_WIDTHS = {
  tree: 24,
  elemente: 40,
  poza: 42,
  info: 40,
  cod: 100,
  clasa1: 90,
  clasa2: 90,
  clasa3: 90,
  clasa4: 90,
  clasa5: 90,
  denumire: 110,
  descriere: 120,
  furnizor: 88,
  marca: 88,
  dynamic: 80,
  unitate: 56,
  greutateUnitara: 104,
  greutateTotala: 104,
  cantitate: 104,
  cost: 100,
  qtyTotal: 100,
  costTotal: 112,
  coefProcent: 92,
  coefPret: 104,
  pret: 96,
  creat: 120,
  actualizat: 120,
};

const ESTIMATED_ROW_HEIGHTS = {
  category: 40,
  reteta: 48,
  element: 32,
  empty: 32,
};

const getEstimatedDisplayRowHeight = (row) => {
  return ESTIMATED_ROW_HEIGHTS[row?.type] || 32;
};

const CLASS_LEVEL_COLUMNS = [
  { key: "clasa1", levelNo: 1, label: "Specialitate" },
  { key: "clasa2", levelNo: 2, label: "Capitol de lucrări" },
  { key: "clasa3", levelNo: 3, label: "Familie de lucrări" },
  { key: "clasa4", levelNo: 4, label: "Subfamilie de lucrări" },
  { key: "clasa5", levelNo: 5, label: "Articol de lucrare" },
];

const getCoefTextClass = (value, colorClass) => {
  return Number(value || 0) === 0 ? "text-muted-foreground/45" : colorClass;
};

const getMoneyHeaderLabel = (label, currency) => {
  const normalizedCurrency = String(currency || "").trim();
  return normalizedCurrency ? `${label} (${normalizedCurrency})` : label;
};

const normalizeSearchText = (value) => {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
};

const ResizableTableHead = ({ colKey, style, className = "", children, onResizeStart }) => {
  return (
    <TableHead style={style} className={`relative px-0 select-none ${className}`}>
      {children}

      <span data-no-row-open onPointerDown={(e) => onResizeStart(e, colKey)} className="absolute right-0 top-0 z-30 h-full w-2 cursor-col-resize touch-none select-none hover:bg-primary/50" />
    </TableHead>
  );
};

const isCostDiff = (diff) =>
  String(diff?.field || "")
    .toLowerCase()
    .includes("cost");

const isQuantityDiff = (diff) =>
  String(diff?.field || "")
    .toLowerCase()
    .includes("cantitate") ||
  String(diff?.scope || "")
    .toLowerCase()
    .includes("cantitate");

const getDiffLabels = (syncStatus, predicate) => {
  const diffs = Array.isArray(syncStatus?.diffs) ? syncStatus.diffs : [];

  return diffs
    .filter(predicate)
    .map((diff) => diff?.label || diff?.field)
    .filter(Boolean);
};

const getRetetaIssueGroups = (reteta) => {
  const syncStatus = reteta?.sync_status || null;
  const costLabels = getDiffLabels(syncStatus, isCostDiff);
  const qtyLabels = getDiffLabels(syncStatus, isQuantityDiff);
  const otherLabels = getDiffLabels(syncStatus, (diff) => !isCostDiff(diff) && !isQuantityDiff(diff));
  const groups = [];

  if (reteta?.has_cost_diff || syncStatus?.has_cost_diff || costLabels.length > 0) {
    groups.push({
      icon: faCoins,
      title: "Cost",
      items: costLabels.length > 0 ? costLabels : ["Cost modificat față de original."],
    });
  }

  if (reteta?.has_qty_diff || syncStatus?.has_qty_diff || qtyLabels.length > 0) {
    groups.push({
      icon: faCalculator,
      title: "Qty unitar",
      items: qtyLabels.length > 0 ? qtyLabels : ["Cantitate modificată față de rețetă."],
    });
  }

  if (reteta?.has_other_diff || syncStatus?.has_other_diff || otherLabels.length > 0) {
    groups.push({
      icon: faListUl,
      title: "Altele",
      items: otherLabels.length > 0 ? otherLabels : ["Există alte diferențe față de rețeta originală."],
    });
  }

  if (groups.length === 0 && syncStatus?.is_outdated) {
    groups.push({
      icon: faListUl,
      title: "Altele",
      items: ["Rețeta nu este la zi. Deschide rețeta pentru detalii."],
    });
  }

  return groups;
};

const IssueTooltipGroup = memo(function IssueTooltipGroup({ group }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2 font-black uppercase tracking-wide text-foreground">
        <FontAwesomeIcon icon={group.icon} className="text-primary" />
        <span>{group.title}</span>
      </div>

      <div className="flex flex-col gap-1">
        {group.items.map((item, index) => (
          <div key={`${group.title}-${index}`} className="flex items-start gap-2 text-popover-foreground">
            <span className="text-muted-foreground">-</span>
            <span className="leading-snug">{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
});

const RetetaInfoIcons = memo(function RetetaInfoIcons({ reteta }) {
  const isOutdated = reteta?.is_outdated || reteta?.sync_status?.is_outdated;
  const groups = getRetetaIssueGroups(reteta);

  if (!isOutdated) {
    return <span className="text-sm text-muted-foreground/40 italic"></span>;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex h-6 w-6 items-center justify-center text-lg leading-none text-red-600">
          <FontAwesomeIcon icon={faTriangleExclamation} />
        </span>
      </TooltipTrigger>

      <TooltipContent className="w-72 whitespace-normal break-words font-normal rounded-md text-sm z-[100] bg-popover border-2 border-border text-popover-foreground shadow-md p-3">
        <TooltipArrow width={15} height={10} className="fill-border" />
        <div className="flex flex-col gap-3">
          {groups.map((group) => (
            <IssueTooltipGroup key={group.title} group={group} />
          ))}
        </div>
      </TooltipContent>
    </Tooltip>
  );
});

const SummaryBox = memo(function SummaryBox({ label, value, children, strong = false, tone = null, decimalPlaces = 2 }) {
  const toneClass = tone === "manopera" ? "border-emerald-600/50 bg-emerald-600/10" : strong ? "border-primary" : "border-border";

  const valueClass = tone === "manopera" ? "font-black text-emerald-600" : strong ? "font-black text-primary" : "font-extrabold text-foreground";

  return (
    <div className={`min-w-[7rem] xxxl:min-w-[8rem] rounded-md border p-2 flex flex-col justify-center gap-0.5 ${toneClass}`}>
      <span className="text-sm uppercase tracking-wide font-bold text-muted-foreground">{label}</span>

      {children ? children : <span className={`text-sm whitespace-nowrap ${valueClass}`}>{formatNumber(value, decimalPlaces)}</span>}
    </div>
  );
});

const normalizeAdaosPercentInput = (value) => {
  const raw = String(value ?? "").replace(",", ".");

  if (raw === "") return "";

  if (!/^\d{0,4}(\.\d{0,2})?$/.test(raw)) {
    return null;
  }

  const numberValue = Number(raw);

  if (!Number.isFinite(numberValue)) {
    return null;
  }

  if (numberValue > 1000) {
    return "1000";
  }

  return raw;
};

const getRowItemFromProps = (props) => {
  return props.context?.displayRows?.[props["data-index"]];
};

const cleanVirtuosoRowProps = (props) => {
  const { context, item, ...domProps } = props;
  return domProps;
};

const getPathKey = (path = []) => JSON.stringify(path || []);

const pathsEqual = (a = [], b = []) => getPathKey(a) === getPathKey(b);

const pathStartsWith = (path = [], prefix = []) => {
  if (!Array.isArray(path) || !Array.isArray(prefix)) return false;
  if (prefix.length > path.length) return false;

  return prefix.every((value, index) => path[index] === value);
};

const getInsertAfterFromDragEvent = (event) => {
  const translatedRect = event?.active?.rect?.current?.translated;
  const initialRect = event?.active?.rect?.current?.initial;
  const overRect = event?.over?.rect;

  if (!overRect) return false;

  const activeRect =
    translatedRect ||
    (initialRect
      ? {
          ...initialRect,
          top: initialRect.top + Number(event?.delta?.y || 0),
          bottom: initialRect.bottom + Number(event?.delta?.y || 0),
        }
      : null);

  if (!activeRect) return false;

  const activeCenterY = activeRect.top + activeRect.height / 2;
  const overCenterY = overRect.top + overRect.height / 2;

  return activeCenterY > overCenterY;
};

const reorderSelectedBlockAt = ({ items, selectedIds, activeId, overId, insertAfter = false }) => {
  const active = toId(activeId);
  const over = toId(overId);
  const selectedSet = new Set(selectedIds.map(toId));
  const movingIds = selectedSet.has(active) ? selectedIds.map(toId) : [active];
  const movingSet = new Set(movingIds);
  const movingItems = items.filter((item) => movingSet.has(toId(item.id)));
  const remainingItems = items.filter((item) => !movingSet.has(toId(item.id)));
  const overIndex = remainingItems.findIndex((item) => toId(item.id) === over);

  if (movingItems.length === 0 || overIndex === -1) return items;

  const insertIndex = overIndex + (insertAfter ? 1 : 0);

  return [...remainingItems.slice(0, insertIndex), ...movingItems, ...remainingItems.slice(insertIndex)];
};

const getDragIdForRow = (row) => {
  if (row?.type === "reteta") return toId(row.reteta?.id);
  if (row?.type === "category") return row.id;
  return "";
};

const getDisplayRowByDragId = (rows = [], id) => {
  const dragId = toId(id);
  return rows.find((row) => getDragIdForRow(row) === dragId);
};

const PlainVirtualRow = (props) => {
  const rowItem = getRowItemFromProps(props);
  const domProps = cleanVirtuosoRowProps(props);

  if (!rowItem) {
    return <TableRow {...domProps} />;
  }

  if (rowItem.type === "category") {
    return (
      <TableRow {...domProps} className="h-10 border-b bg-[#c4c4ce] dark:bg-[#34363d] dark:text-foreground [.blue_&]:bg-[#22262b]">
        {props.children}
      </TableRow>
    );
  }

  if (rowItem.type === "element") {
    return (
      <TableRow
        {...domProps}
        className="group h-8 cursor-pointer border-0 hover:bg-transparent dark:hover:bg-transparent"
        onClick={(e) => {
          e.stopPropagation();
          if (props.context?.isCoeficientEditing) {
            props.context?.handleCoeficientElementClick?.(rowItem.element, rowItem.reteta);
            return;
          }
          props.context?.handleElementRowClick?.(rowItem.element, rowItem.reteta);
        }}
      >
        {props.children}
      </TableRow>
    );
  }

  return (
    <TableRow {...domProps} className={`h-8 border-b bg-muted/10`}>
      {props.children}
    </TableRow>
  );
};

const SortableCategoryVirtualRow = ({ rowItem, ...props }) => {
  const isRowOrderLocked = props.context?.isRowOrderLocked;
  const isCoeficientEditing = props.context?.isCoeficientEditing;

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: rowItem.id,
    disabled: isRowOrderLocked || isCoeficientEditing,
  });

  const domProps = cleanVirtuosoRowProps(props);

  return (
    <TableRow
      {...domProps}
      ref={setNodeRef}
      {...(!isRowOrderLocked && !isCoeficientEditing ? attributes : {})}
      {...(!isRowOrderLocked && !isCoeficientEditing ? listeners : {})}
      style={{
        ...domProps.style,
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.45 : 1,
        zIndex: isDragging ? 50 : undefined,
        position: isDragging ? "relative" : undefined,
      }}
      className="h-10 cursor-grab border-b bg-[#c4c4ce] active:cursor-grabbing dark:bg-[#34363d] dark:text-foreground [.blue_&]:bg-[#22262b]"
    >
      {props.children}
    </TableRow>
  );
};

const SortableRecipeVirtualRow = ({ reteta, ...props }) => {
  const id = toId(reteta.id);

  const selectedIds = props.context?.selectedIds || [];
  const selected = selectedIds.includes(id);

  const selectedRetete = props.context?.getSelectedRetete?.() || [];
  const contextItems = selected && selectedRetete.length > 1 ? selectedRetete : [reteta];
  const isMultiple = contextItems.length > 1;
  const isRowOrderLocked = props.context?.isRowOrderLocked;
  const isCoeficientEditing = props.context?.isCoeficientEditing;
  const isCoeficientHighlighted = props.context?.highlightedRetetaIds?.has(id);
  const isCoeficientExcluded = props.context?.excludedRetetaIds?.has(id);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: isRowOrderLocked || isCoeficientEditing,
  });

  const domProps = cleanVirtuosoRowProps(props);
  const isLastRow = props["data-index"] === props.context?.displayRows?.length - 1;
  const rowNode = (
    <TableRow
      {...domProps}
      ref={setNodeRef}
      {...(!isRowOrderLocked && !isCoeficientEditing ? attributes : {})}
      {...(!isRowOrderLocked && !isCoeficientEditing ? listeners : {})}
      style={{
        ...domProps.style,
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.45 : 1,
        zIndex: isDragging ? 50 : undefined,
        position: isDragging ? "relative" : undefined,
      }}
      className={`cursor-pointer drag-row hover:bg-primary/15 data-[state=open]:bg-primary/15 h-12 border-b group dark:!bg-[#08090b] dark:hover:!bg-primary/30 ${
        isCoeficientExcluded
          ? "!bg-red-200 hover:!bg-red-300 dark:!bg-red-500 dark:hover:!bg-red-400 dark:!text-black dark:[&_*]:!text-black"
          : isCoeficientHighlighted
            ? "!bg-yellow-200 hover:!bg-yellow-300 dark:!bg-yellow-500 dark:hover:!bg-yellow-400 dark:!text-black dark:[&_*]:!text-black"
            : selected
              ? "!bg-primary/25 hover:!bg-primary/35 dark:!bg-primary/45 dark:hover:!bg-primary/60"
              : ""
      }`}
      onMouseDownCapture={(e) => {
        if (e.shiftKey) {
          e.preventDefault();
          window.getSelection()?.removeAllRanges();
        }
      }}
      onFocus={(e) => {
        if (e.target === e.currentTarget) {
          e.currentTarget.blur();
        }
      }}
      onContextMenuCapture={(e) => {
        if (isCoeficientEditing) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }

        props.context?.handleRowContextMenu(reteta);
      }}
      onClick={(e) => props.context?.handleRowClick(e, reteta)}
    >
      {props.children}
    </TableRow>
  );

  if (isCoeficientEditing) {
    return rowNode;
  }

  return (
    <ContextMenu key={reteta.id}>
      <ContextMenuTrigger asChild>{rowNode}</ContextMenuTrigger>

      <ContextMenuContent className="w-48">
        {isMultiple && (
          <>
            <div className="p-2">
              <p className="text-sm font-black uppercase tracking-wider text-foreground">Selecție multiplă</p>
              <p className="text-sm text-muted-foreground">{contextItems.length} rețete selectate</p>
            </div>
            <ContextMenuSeparator />
          </>
        )}

        <ContextMenuItem className="gap-3" onClick={() => props.context?.handleFurnizori(contextItems)}>
          <FontAwesomeIcon className="text-sky-500" icon={faTruck} />
          Furnizori
        </ContextMenuItem>

        <ContextMenuItem className="gap-3" onClick={() => props.context?.handleActualizeaza(contextItems)}>
          <FontAwesomeIcon className="text-purple-400" icon={faArrowsRotate} />
          Actualizează
        </ContextMenuItem>

        <ContextMenuItem className="gap-3" onClick={() => props.context?.handleDuplicate(contextItems)}>
          <FontAwesomeIcon className="text-medium" icon={faCopy} />
          Dublează
        </ContextMenuItem>

        <ContextMenuItem className="gap-3" onClick={() => props.context?.handleMove(contextItems)}>
          <FontAwesomeIcon className="text-cyan-600 dark:text-cyan-300" icon={faArrowRightLong} />
          Mută
        </ContextMenuItem>

        <ContextMenuItem className="gap-3" onClick={() => props.context?.handleReplace(contextItems)}>
          <FontAwesomeIcon className="text-pink-600 dark:text-pink-400" icon={faRightLeft} />
          Înlocuiește
        </ContextMenuItem>

        <ContextMenuItem className="gap-3" onClick={() => props.context?.handleEdit(contextItems)}>
          <FontAwesomeIcon className="text-low" icon={faPenToSquare} />
          Editează
        </ContextMenuItem>

        <ContextMenuSeparator />

        <ContextMenuItem className="gap-3 text-destructive focus:text-destructive hover:text-destructive" onClick={() => props.context?.handleDelete(contextItems)}>
          <FontAwesomeIcon icon={faTrash} />
          Șterge
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};

const SortableRetetaRow = (props) => {
  const rowItem = getRowItemFromProps(props);

  if (!rowItem) {
    const domProps = cleanVirtuosoRowProps(props);
    return <TableRow {...domProps} />;
  }

  if (rowItem.type === "category") {
    return <SortableCategoryVirtualRow {...props} rowItem={rowItem} />;
  }

  if (rowItem.type !== "reteta") {
    return <PlainVirtualRow {...props} />;
  }

  return <SortableRecipeVirtualRow {...props} reteta={rowItem.reteta} />;
};

const componentsOferteRetete = {
  Table: (props) => <table {...props} className="min-w-full w-full table-fixed caption-bottom text-left border-collapse text-sm" />,

  TableHead: React.forwardRef((props, ref) => <TableHeader {...props} ref={ref} className="bg-muted sticky top-0 z-20 shadow-sm" />),

  TableBody: React.forwardRef((props, ref) => <TableBody {...props} ref={ref} />),

  TableRow: SortableRetetaRow,
};

const CategoryColorButton = memo(function CategoryColorButton({ row, color, textColor, onChange }) {
  const inputRef = useRef(null);
  const pickerColor = color || "#c4c4ce";

  if (!row?.fieldKey || !onChange) return null;

  return (
    <span data-no-row-open className="pointer-events-auto relative shrink-0" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
      <Button
        type="button"
        variant="ghost"
        className="h-8 w-8 border-0 bg-transparent p-0 text-lg shadow-none hover:bg-transparent hover:opacity-80"
        style={textColor ? { color: textColor } : undefined}
        onClick={() => inputRef.current?.click()}
      >
        <FontAwesomeIcon icon={faPalette} className="text-lg" />
      </Button>

      <input ref={inputRef} type="color" value={pickerColor} className="absolute h-0 w-0 opacity-0" tabIndex={-1} onChange={(e) => onChange(row.fieldKey, row.value, e.target.value)} />
    </span>
  );
});

const OferteReteteList = memo(function OferteReteteList({
  reteteItems = [],
  selectedOferta,
  selectedLucrare,
  displayLang = "RO",
  visibleColumns,
  textAlign = "left",
  decimalPlaces = 2,
  columnResetKey = 0,
  sortResetKey = 0,
  toggleAllKey = 0,
  categoryConfig = [],
  showCategoryTotals = false,
  categoryColorsConfig = {},
  recapitulatiiPercent = "0",
  discountPercent = "0",
  tvaPercent = "0",
  currency = "RON",
  searchQuery = "",
  onEditReteta,
  onDeleteReteta,
  onReorderRetete,
  onDuplicateRetete,
  onMoveRetete,
  onReplaceRetete,
  onUpdateRetetaQuantity,
  onUpdateRetetaCategoryValues,
  onLoadFurnizoriRetete,
  onApplyFurnizoriRetete,
  onActualizeazaRetete,
  onSortActiveChange,
  onAllExpandedChange,
  onSelectedCountChange,
  onCategoryColorChange,
  onRecapitulatiiPercentChange,
  onDiscountPercentChange,
  onTvaPercentChange,
  coeficientEditorState = null,
  oferteOptions = [],
  onAddReteta,
}) {
  const containerRef = useRef(null);
  const displayRowsRef = useRef([]);
  const scrollPosRef = useRef(0);
  const scrollFrameRef = useRef(null);
  const lastClickedIndexRef = useRef(null);
  const wasDraggingRef = useRef(false);
  const skipSaveColumnWidthsRef = useRef(false);

  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [duplicateItems, setDuplicateItems] = useState([]);
  const [moveOpen, setMoveOpen] = useState(false);
  const [moveItems, setMoveItems] = useState([]);
  const [replaceOpen, setReplaceOpen] = useState(false);
  const [replaceItems, setReplaceItems] = useState([]);

  const [actualizeazaOpen, setActualizeazaOpen] = useState(false);
  const [actualizeazaItems, setActualizeazaItems] = useState([]);

  const [furnizoriOpen, setFurnizoriOpen] = useState(false);
  const [furnizoriItems, setFurnizoriItems] = useState([]);

  const [expandedRetetaIds, setExpandedRetetaIds] = useState(new Set());

  const [variantDialogOpen, setVariantDialogOpen] = useState(false);
  const [selectedElement, setSelectedElement] = useState(null);
  const [selectedElementConfig, setSelectedElementConfig] = useState(null);
  const [selectedElementParentReteta, setSelectedElementParentReteta] = useState(null);

  const editElementVariant = useEditOfertaRetetaElementVariant();

  const [orderedRetete, setOrderedRetete] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [activeDragId, setActiveDragId] = useState(null);
  const [sortConfig, setSortConfig] = useState(null);
  const [categoryScrollTop, setCategoryScrollTop] = useState(0);

  const [columnWidths, setColumnWidths] = useState(() => {
    const defaults = getDefaultColumnWidths();

    try {
      const saved = localStorage.getItem(COLUMN_WIDTHS_STORAGE_KEY);

      if (saved) {
        const savedWidths = JSON.parse(saved);

        if (Number(savedWidths.elemente) === 58) {
          savedWidths.elemente = defaults.elemente;
        }

        return {
          ...defaults,
          ...savedWidths,
        };
      }
    } catch {}

    return defaults;
  });

  useEffect(() => {
    if (skipSaveColumnWidthsRef.current) {
      skipSaveColumnWidthsRef.current = false;
      return;
    }

    try {
      localStorage.setItem(COLUMN_WIDTHS_STORAGE_KEY, JSON.stringify(columnWidths));
    } catch {}
  }, [columnWidths]);

  useEffect(() => {
    if (!columnResetKey) return;

    skipSaveColumnWidthsRef.current = true;
    setColumnWidths(getDefaultColumnWidths());

    try {
      localStorage.removeItem(COLUMN_WIDTHS_STORAGE_KEY);
    } catch {}
  }, [columnResetKey]);

  useEffect(() => {
    if (!toggleAllKey) return;

    setExpandedRetetaIds((prev) => {
      const allIds = (reteteItems || []).map((item) => toId(item.id)).filter(Boolean);
      const allExpanded = allIds.length > 0 && allIds.every((id) => prev.has(id));

      return allExpanded ? new Set() : new Set(allIds);
    });
  }, [toggleAllKey]);

  useEffect(() => {
    if (!coeficientEditorState?.expandAllKey) return;

    const allIds = (reteteItems || []).map((item) => toId(item.id)).filter(Boolean);
    setExpandedRetetaIds(new Set(allIds));
  }, [coeficientEditorState?.expandAllKey, reteteItems]);

  useEffect(() => {
    const allIds = (reteteItems || []).map((item) => toId(item.id)).filter(Boolean);
    const allExpanded = allIds.length > 0 && allIds.every((id) => expandedRetetaIds.has(id));

    onAllExpandedChange?.(allExpanded);
  }, [expandedRetetaIds, onAllExpandedChange, reteteItems]);

  const getColumnStyle = useCallback(
    (key) => {
      const fallbackKey = String(key || "").startsWith("dynamic_") ? "dynamic" : key;
      const defaults = getDefaultColumnWidths();
      const width = columnWidths[key] || defaults[fallbackKey] || 112;

      return {
        width,
        minWidth: width,
        maxWidth: width,
      };
    },
    [columnWidths],
  );

  const handleColumnResizeStart = useCallback(
    (e, key) => {
      e.preventDefault();
      e.stopPropagation();

      const fallbackKey = String(key || "").startsWith("dynamic_") ? "dynamic" : key;
      const defaults = getDefaultColumnWidths();
      const startX = e.clientX;
      const startWidth = columnWidths[key] || defaults[fallbackKey] || 112;
      const minWidth = MIN_COL_WIDTHS[fallbackKey] || 70;

      let frame = null;

      const onMove = (moveEvent) => {
        const delta = moveEvent.clientX - startX;
        const nextWidth = Math.max(minWidth, startWidth + delta);

        if (frame) {
          window.cancelAnimationFrame(frame);
        }

        frame = window.requestAnimationFrame(() => {
          setColumnWidths((prev) => ({
            ...prev,
            [key]: nextWidth,
          }));
        });
      };

      const onUp = () => {
        if (frame) {
          window.cancelAnimationFrame(frame);
        }

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

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const dynamicColumns = useMemo(() => {
    return normalizeColumns(selectedLucrare?.coloane_config);
  }, [selectedLucrare?.coloane_config]);

  const normalizedCategoryConfig = useMemo(() => {
    return normalizeCategoryConfig(categoryConfig, buildAvailableCategoryFields(dynamicColumns));
  }, [categoryConfig, dynamicColumns]);

  const activeCategoryFields = useMemo(() => {
    const availableFields = buildAvailableCategoryFields(dynamicColumns);

    return normalizedCategoryConfig.map((key) => availableFields.find((field) => field.key === key)).filter(Boolean);
  }, [dynamicColumns, normalizedCategoryConfig]);

  const normalizedCategoryColorsConfig = useMemo(() => {
    return normalizeCategoryColorsConfig(categoryColorsConfig);
  }, [categoryColorsConfig]);

  useEffect(() => {
    setSortConfig(null);
    lastClickedIndexRef.current = null;
  }, [sortResetKey]);

  const isSortActive = !!sortConfig?.key;
  const isCategoryActive = normalizedCategoryConfig.some(Boolean);
  const normalizedSearchQuery = useMemo(() => normalizeSearchText(searchQuery), [searchQuery]);
  const isSearchActive = normalizedSearchQuery.length > 0;
  const isRowOrderLocked = isSortActive || isSearchActive;
  const isCoeficientEditing = !!coeficientEditorState?.active;
  const highlightedRetetaIds = useMemo(() => new Set((coeficientEditorState?.retetaIds || []).map(toId)), [coeficientEditorState?.retetaIds]);
  const highlightedElementIds = useMemo(() => new Set((coeficientEditorState?.elementIds || []).map(toId)), [coeficientEditorState?.elementIds]);
  const excludedRetetaIds = useMemo(() => new Set((coeficientEditorState?.excludedRetetaIds || []).map(toId)), [coeficientEditorState?.excludedRetetaIds]);
  const excludedElementIds = useMemo(() => new Set((coeficientEditorState?.excludedElementIds || []).map(toId)), [coeficientEditorState?.excludedElementIds]);
  const coefRetetaImpactById = coeficientEditorState?.retetaImpactById || {};
  const coefElementImpactById = coeficientEditorState?.elementImpactById || {};
  const getRetetaListPriceTotals = useCallback(
    (reteta) => {
      const costTotal = getRetetaTotalLucrare(reteta);
      const impact = coefRetetaImpactById[toId(reteta?.id)] || {};
      const coefAdded = impact.excluded ? 0 : Number(impact.totalAdded || 0);

      return {
        costTotal,
        coefAdded,
        pretTotal: costTotal + coefAdded,
      };
    },
    [coefRetetaImpactById],
  );

  useEffect(() => {
    onSortActiveChange?.(isSortActive);
  }, [isSortActive, onSortActiveChange]);

  useEffect(() => {
    onSelectedCountChange?.(selectedIds.length);
  }, [onSelectedCountChange, selectedIds.length]);

  useEffect(() => {
    if (!isCoeficientEditing) return;

    setSelectedIds([]);
    lastClickedIndexRef.current = null;
  }, [isCoeficientEditing]);

  const handleSortColumn = useCallback((key) => {
    setSortConfig((prev) => {
      if (prev?.key === key) {
        if (prev.direction === "asc") {
          return {
            key,
            direction: "desc",
          };
        }

        return null;
      }

      return {
        key,
        direction: "asc",
      };
    });

    setActiveDragId(null);
    lastClickedIndexRef.current = null;
  }, []);

  const getSortValue = useCallback(
    (reteta, key) => {
      if (String(key || "").startsWith("dynamic_")) {
        const columnId = String(key).replace("dynamic_", "");
        const col = dynamicColumns.find((item) => String(item.id) === String(columnId));
        const coloaneValori = normalizeColoaneValori(reteta?.coloane_valori);
        return col ? getColoanaValue(coloaneValori, col) : "";
      }

      if (key === "cod") return reteta?.cod_reteta || "";
      if (String(key || "").startsWith("clasa")) {
        const levelNo = Number(String(key).replace("clasa", ""));
        return getRetetaClassLevelDisplay(reteta, levelNo, displayLang);
      }
      if (key === "denumire") return displayLang === "FR" ? reteta?.denumire_fr || reteta?.denumire || "" : reteta?.denumire || reteta?.denumire_fr || "";
      if (key === "greutateUnitara") return getRetetaGreutateUnitara(reteta);
      if (key === "greutateTotala") return getRetetaGreutateTotala(reteta);
      if (key === "cantitate") return 1;
      if (key === "cost") return getRetetaCost(reteta);
      if (key === "qtyTotal") return Number(reteta?.cantitate_lucrare || 0);
      if (key === "costTotal") return getRetetaTotalLucrare(reteta);
      if (key === "coefProcent") {
        const impact = coefRetetaImpactById[toId(reteta?.id)] || {};
        return Number(impact.directPercent || 0) + Number(impact.interiorPercent || 0);
      }
      if (key === "coefPret") return getRetetaListPriceTotals(reteta).coefAdded;
      if (key === "pret") return getRetetaListPriceTotals(reteta).pretTotal;

      return "";
    },
    [coefRetetaImpactById, displayLang, dynamicColumns, getRetetaListPriceTotals],
  );

  const searchedRetete = useMemo(() => {
    if (!normalizedSearchQuery) return orderedRetete;

    return orderedRetete.filter((reteta) => {
      const coloaneValori = normalizeColoaneValori(reteta?.coloane_valori);
      const values = [
        reteta?.cod_reteta,
        ...CLASS_LEVEL_COLUMNS.map((column) => getRetetaClassLevelDisplay(reteta, column.levelNo, displayLang)),
        reteta?.denumire,
        reteta?.denumire_fr,
        ...dynamicColumns.map((col) => getColoanaValue(coloaneValori, col)),
      ];

      return values.some((value) => normalizeSearchText(value).includes(normalizedSearchQuery));
    });
  }, [displayLang, dynamicColumns, normalizedSearchQuery, orderedRetete]);

  const sortedRetete = useMemo(() => {
    if (!sortConfig?.key) return searchedRetete;

    const directionMultiplier = sortConfig.direction === "desc" ? -1 : 1;

    return [...searchedRetete].sort((a, b) => {
      const aValue = getSortValue(a, sortConfig.key);
      const bValue = getSortValue(b, sortConfig.key);
      const aNumber = typeof aValue === "number" ? aValue : Number(String(aValue || "").replace(",", "."));
      const bNumber = typeof bValue === "number" ? bValue : Number(String(bValue || "").replace(",", "."));
      const bothNumeric = Number.isFinite(aNumber) && Number.isFinite(bNumber) && String(aValue ?? "").trim() !== "" && String(bValue ?? "").trim() !== "";

      if (bothNumeric) {
        return (aNumber - bNumber) * directionMultiplier;
      }

      return String(aValue || "").localeCompare(String(bValue || ""), "ro", { numeric: true, sensitivity: "base" }) * directionMultiplier;
    });
  }, [getSortValue, searchedRetete, sortConfig]);

  const pricedSortedRetete = useMemo(() => {
    return sortedRetete.map((reteta) => {
      const priceTotals = getRetetaListPriceTotals(reteta);

      return {
        ...reteta,
        cost_total_lucrare: priceTotals.costTotal,
        coeficient_added_value: priceTotals.coefAdded,
        pret_total_lucrare: priceTotals.pretTotal,
      };
    });
  }, [getRetetaListPriceTotals, sortedRetete]);

  const reteteForSelection = useMemo(() => {
    return buildDisplayRowsWithCategories({
      retete: pricedSortedRetete,
      expandedRetetaIds: new Set(),
      categoryConfig: normalizedCategoryConfig,
      dynamicColumns,
      displayLang,
    })
      .filter((row) => row.type === "reteta")
      .map((row) => row.reteta);
  }, [displayLang, dynamicColumns, normalizedCategoryConfig, pricedSortedRetete]);

  useEffect(() => {
    setOrderedRetete(reteteItems || []);

    setSelectedIds((prev) => {
      const validIds = new Set((reteteItems || []).map((item) => toId(item.id)));
      return prev.filter((id) => validIds.has(toId(id)));
    });

    setExpandedRetetaIds((prev) => {
      const validIds = new Set((reteteItems || []).map((item) => toId(item.id)));
      const next = new Set();

      prev.forEach((id) => {
        if (validIds.has(toId(id))) {
          next.add(toId(id));
        }
      });

      return next;
    });
  }, [reteteItems]);

  useEffect(() => {
    const cancelReorder = (e) => {
      const target = e.target;

      if (!(target instanceof Element)) return;

      if (target.closest(".keepSelection")) return;
      if (target.closest(".drag-row")) return;
      if (target.closest("[data-radix-popper-content-wrapper]")) return;
      if (target.closest("[role='menu']")) return;
      if (target.closest("[role='dialog']")) return;

      setActiveDragId(null);
      setSelectedIds([]);
      lastClickedIndexRef.current = null;
    };
    const cancelReorderESC = (e) => {
      const target = e.target;
      if (e.key !== "Escape") return;

      setActiveDragId(null);
      setSelectedIds([]);
      lastClickedIndexRef.current = null;
    };

    window.addEventListener("pointerdown", cancelReorder, true);
    window.addEventListener("keydown", cancelReorderESC, true);

    return () => {
      window.removeEventListener("pointerdown", cancelReorder, true);
      window.removeEventListener("keydown", cancelReorderESC, true);
    };
  }, []);

  const showCol = useCallback(
    (key) => {
      if (!visibleColumns) return true;
      return visibleColumns[key] !== false;
    },
    [visibleColumns],
  );

  const safeTextAlign = ["left", "center", "right"].includes(textAlign) ? textAlign : "left";
  const safeDecimalPlaces = [1, 2].includes(Number(decimalPlaces)) ? Number(decimalPlaces) : 2;

  const textAlignClass = {
    left: "text-left",
    center: "text-center",
    right: "text-right",
  }[safeTextAlign];

  const justifyAlignClass = {
    left: "justify-start",
    center: "justify-center",
    right: "justify-end",
  }[safeTextAlign];

  const tooltipAlign = safeTextAlign;

  const totals = useMemo(() => {
    const resourceTotals = {
      manopera: 0,
      material: 0,
      utilaj: 0,
      transport: 0,
    };

    let totalManoperaHours = 0;
    let totalGreutate = 0;
    let finalSubtotal = 0;

    orderedRetete.forEach((reteta) => {
      const elemente = reteta.elemente || [];
      const cantitateLucrare = Number(reteta.cantitate_lucrare || 0);
      const priceTotals = getRetetaListPriceTotals(reteta);
      const retetaResourceBaseTotals = {
        manopera: 0,
        material: 0,
        utilaj: 0,
        transport: 0,
      };

      finalSubtotal += priceTotals.pretTotal;
      totalGreutate += getRetetaGreutateTotala(reteta);

      elemente.forEach((el) => {
        if (resourceTotals[el.tip_resursa] === undefined) return;

        const elementBaseTotal = getElementTotalInLucrare(el, reteta);
        const elementImpact = coefElementImpactById[toId(el.id)] || {};
        const elementAddedValue = elementImpact.excluded ? 0 : Number(elementImpact.addedValue || 0);

        retetaResourceBaseTotals[el.tip_resursa] += elementBaseTotal;
        resourceTotals[el.tip_resursa] += elementBaseTotal + elementAddedValue;

        if (el.tip_resursa === "manopera") {
          const cantitateManoperaInReteta = Number(el.cantitate_in_reteta || 0);
          totalManoperaHours += cantitateManoperaInReteta * cantitateLucrare;
        }
      });

      const retetaBaseTotal = retetaResourceBaseTotals.manopera + retetaResourceBaseTotals.material + retetaResourceBaseTotals.utilaj + retetaResourceBaseTotals.transport;
      const retetaImpact = coefRetetaImpactById[toId(reteta.id)] || {};
      const retetaDirectAdded = retetaImpact.excluded ? 0 : Number(retetaImpact.directAdded || 0);

      if (retetaDirectAdded && retetaBaseTotal > 0) {
        Object.keys(retetaResourceBaseTotals).forEach((tipResursa) => {
          resourceTotals[tipResursa] += retetaDirectAdded * (retetaResourceBaseTotals[tipResursa] / retetaBaseTotal);
        });
      }
    });

    const rawResourceSubtotal = resourceTotals.manopera + resourceTotals.material + resourceTotals.utilaj + resourceTotals.transport;
    const subtotal = finalSubtotal;

    if (rawResourceSubtotal > 0 && Number.isFinite(subtotal)) {
      const scale = subtotal / rawResourceSubtotal;

      Object.keys(resourceTotals).forEach((tipResursa) => {
        resourceTotals[tipResursa] *= scale;
      });
    }

    const extraValue = subtotal * (getPercentNumber(recapitulatiiPercent) / 100);
    const totalDupaAdaos = subtotal + extraValue;

    const discountValue = subtotal * (getPercentNumber(discountPercent) / 100);
    const totalDupaReducere = subtotal + extraValue - discountValue;

    const tvaValue = totalDupaReducere * (getPercentNumber(tvaPercent) / 100);
    const totalFinal = totalDupaReducere + tvaValue;

    return {
      ...resourceTotals,
      totalManoperaHours,
      totalGreutate,
      subtotal,
      extraValue,
      totalDupaAdaos,
      discountValue,
      totalDupaReducere,
      tvaValue,
      totalFinal,
    };
  }, [coefElementImpactById, coefRetetaImpactById, getRetetaListPriceTotals, orderedRetete, tvaPercent, recapitulatiiPercent, discountPercent]);

  const handleTvaPercentChange = useCallback(
    (e) => {
      const next = normalizePercentInput(e.target.value);

      if (next !== null) {
        onTvaPercentChange?.(next);
      }
    },
    [onTvaPercentChange],
  );

  const handleExtraPercentChange = useCallback(
    (e) => {
      const next = normalizeAdaosPercentInput(e.target.value);

      if (next !== null) {
        onRecapitulatiiPercentChange?.(next);
      }
    },
    [onRecapitulatiiPercentChange],
  );

  const handleDiscountPercentChange = useCallback(
    (e) => {
      const next = normalizeAdaosPercentInput(e.target.value);

      if (next !== null) {
        onDiscountPercentChange?.(next);
      }
    },
    [onDiscountPercentChange],
  );

  const getRetetaIndex = useCallback(
    (reteta) => {
      return reteteForSelection.findIndex((item) => Number(item.id) === Number(reteta.id));
    },
    [reteteForSelection],
  );

  const getSelectedRetete = useCallback(() => {
    const selectedSet = new Set(selectedIds.map(toId));
    return reteteForSelection.filter((item) => selectedSet.has(toId(item.id)));
  }, [reteteForSelection, selectedIds]);

  const handleRowContextMenu = useCallback(
    (reteta) => {
      if (isCoeficientEditing) return;

      const id = toId(reteta.id);
      const currentIndex = getRetetaIndex(reteta);

      if (selectedIds.includes(id)) return;

      setSelectedIds([id]);

      if (currentIndex !== -1) {
        lastClickedIndexRef.current = currentIndex;
      }
    },
    [getRetetaIndex, isCoeficientEditing, selectedIds],
  );

  const handleScroll = (e) => {
    if (e.target) {
      const nextTop = e.target.scrollTop;
      scrollPosRef.current = nextTop;

      if (scrollFrameRef.current) {
        window.cancelAnimationFrame(scrollFrameRef.current);
      }

      scrollFrameRef.current = window.requestAnimationFrame(() => {
        scrollFrameRef.current = null;
        setCategoryScrollTop(nextTop);
      });
    }
  };

  useEffect(() => {
    return () => {
      if (scrollFrameRef.current) {
        window.cancelAnimationFrame(scrollFrameRef.current);
      }
    };
  }, []);

  useLayoutEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = scrollPosRef.current;
    }
  }, [orderedRetete]);

  const toggleRetetaExpand = useCallback((reteta) => {
    const id = toId(reteta?.id);

    if (!id) return;

    setExpandedRetetaIds((prev) => {
      const next = new Set(prev);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  }, []);

  const handleElementRowClick = useCallback(
    (element, parentReteta) => {
      if (isCoeficientEditing || !element || !parentReteta) return;

      const config = resurseConfig[element.tip_resursa] || resurseConfig.material;

      setSelectedElement(element);
      setSelectedElementConfig(config);
      setSelectedElementParentReteta(parentReteta);
      setVariantDialogOpen(true);
    },
    [isCoeficientEditing],
  );

  const handleCoeficientElementClick = useCallback(
    (element) => {
      if (!isCoeficientEditing || !element) return;
      coeficientEditorState?.onElementToggle?.(element);
    },
    [coeficientEditorState, isCoeficientEditing],
  );

  const handleRowClick = useCallback(
    (e, reteta) => {
      if (isCoeficientEditing) {
        e.preventDefault();
        e.stopPropagation();
        coeficientEditorState?.onRetetaToggle?.(reteta);
        return;
      }

      if (wasDraggingRef.current) return;
      if (e.target.closest("[data-no-row-open]") && !e.shiftKey) return;
      if (e.target.closest("a, button, input") && !e.shiftKey) return;

      const selection = window.getSelection();
      if (selection.toString().length > 0 && !e.shiftKey) return;

      const id = toId(reteta.id);
      const currentIndex = getRetetaIndex(reteta);

      if (currentIndex === -1) return;

      if (e.shiftKey) {
        if (lastClickedIndexRef.current === null) {
          e.preventDefault();

          setSelectedIds((prev) => {
            if (prev.includes(id)) {
              return prev.filter((x) => x !== id);
            }

            return [...prev, id];
          });

          lastClickedIndexRef.current = currentIndex;
          return;
        }

        e.preventDefault();
        window.getSelection()?.removeAllRanges();

        const rangeIds = getRangeIds(reteteForSelection, lastClickedIndexRef.current, currentIndex);

        setSelectedIds(rangeIds);
        lastClickedIndexRef.current = currentIndex;
        return;
      }

      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();

        setSelectedIds((prev) => {
          if (prev.includes(id)) {
            return prev.filter((x) => x !== id);
          }

          return [...prev, id];
        });

        lastClickedIndexRef.current = currentIndex;
        return;
      }

      const wasSelected = selectedIds.includes(id);

      if (!wasSelected) {
        setSelectedIds([id]);
      }

      lastClickedIndexRef.current = currentIndex;

      if (wasSelected) {
        toggleRetetaExpand(reteta);
      }
    },
    [coeficientEditorState, getRetetaIndex, isCoeficientEditing, reteteForSelection, selectedIds, toggleRetetaExpand],
  );

  const handleDuplicate = useCallback((items) => {
    const nextItems = Array.isArray(items) ? items.filter(Boolean) : [items].filter(Boolean);

    if (nextItems.length === 0) return;

    setDuplicateItems(nextItems);
    setDuplicateOpen(true);
  }, []);

  const handleMove = useCallback((items) => {
    const nextItems = Array.isArray(items) ? items.filter(Boolean) : [items].filter(Boolean);

    if (nextItems.length === 0) return;

    setMoveItems(nextItems);
    setMoveOpen(true);
  }, []);

  const handleReplace = useCallback((items) => {
    const nextItems = Array.isArray(items) ? items.filter(Boolean) : [items].filter(Boolean);

    if (nextItems.length === 0) return;

    setReplaceItems(nextItems);
    setReplaceOpen(true);
  }, []);

  const handleActualizeaza = useCallback((items) => {
    const nextItems = Array.isArray(items) ? items.filter(Boolean) : [items].filter(Boolean);

    if (nextItems.length === 0) return;

    setActualizeazaItems(nextItems);
    setActualizeazaOpen(true);
  }, []);

  useEffect(() => {
    if (!variantDialogOpen || !selectedElement?.id || !selectedElementParentReteta?.id) return;

    const freshParent = orderedRetete.find((r) => Number(r.id) === Number(selectedElementParentReteta.id));

    if (!freshParent) return;

    const freshElement = (freshParent.elemente || []).find((el) => Number(el.id) === Number(selectedElement.id));

    setSelectedElementParentReteta(freshParent);

    if (freshElement) {
      setSelectedElement(freshElement);
    }
  }, [orderedRetete, selectedElement?.id, selectedElementParentReteta?.id, variantDialogOpen]);

  const handleSaveElementSnapshot = useCallback(
    async (payload) => {
      await editElementVariant.mutateAsync({
        ...payload,
        lucrare_id: selectedLucrare?.id,
      });

      toast.success("Elementul a fost actualizat.");
    },
    [editElementVariant, selectedLucrare?.id],
  );

  const handleEdit = useCallback(
    (items) => {
      const nextItems = Array.isArray(items) ? items.filter(Boolean) : [items].filter(Boolean);

      if (nextItems.length === 0) return;

      if (onEditReteta) {
        onEditReteta(nextItems);
        return;
      }

      toast.info("Editare dummy momentan.");
    },
    [onEditReteta],
  );

  const handleDelete = useCallback(
    (items) => {
      const nextItems = Array.isArray(items) ? items.filter(Boolean) : [items].filter(Boolean);

      if (nextItems.length === 0) return;

      if (onDeleteReteta) {
        onDeleteReteta(nextItems.length === 1 ? nextItems[0] : nextItems);
        return;
      }

      toast.info(nextItems.length > 1 ? "Ștergere multiplă dummy momentan." : "Ștergere dummy momentan.");
    },
    [onDeleteReteta],
  );

  const handleFurnizori = useCallback((items) => {
    const nextItems = Array.isArray(items) ? items.filter(Boolean) : [items].filter(Boolean);

    if (nextItems.length === 0) return;

    setFurnizoriItems(nextItems);
    setFurnizoriOpen(true);
  }, []);

  const onConfirmFurnizori = useCallback(
    async (payload) => {
      await onApplyFurnizoriRetete?.(payload);
      setFurnizoriOpen(false);
      setFurnizoriItems([]);
      setSelectedIds([]);
    },
    [onApplyFurnizoriRetete],
  );

  const handleDragStart = useCallback(
    (event) => {
      if (isRowOrderLocked) return;

      const id = toId(event.active.id);
      const activeRow = getDisplayRowByDragId(displayRowsRef.current, id);

      if (!activeRow) return;

      if (activeRow.type === "category") {
        wasDraggingRef.current = true;
        setActiveDragId(id);
        lastClickedIndexRef.current = null;
        return;
      }

      if (activeRow.type !== "reteta") return;

      const currentIndex = orderedRetete.findIndex((item) => toId(item.id) === id);

      wasDraggingRef.current = true;
      setActiveDragId(id);

      setSelectedIds((prev) => {
        if (prev.includes(id)) return prev;
        return [id];
      });

      if (currentIndex !== -1) {
        lastClickedIndexRef.current = currentIndex;
      }
    },
    [isRowOrderLocked, orderedRetete],
  );

  const handleDragCancel = useCallback(() => {
    setActiveDragId(null);

    window.setTimeout(() => {
      wasDraggingRef.current = false;
    }, 0);
  }, []);

  const buildRetetaWithCategoryPath = useCallback(
    (reteta, targetPath = []) => {
      const nextColoaneValori = normalizeColoaneValori(reteta?.coloane_valori);
      let changed = false;
      let unsupportedField = null;

      targetPath.forEach((targetPathValue, levelIndex) => {
        const field = activeCategoryFields[levelIndex];

        if (!field) return;

        const targetValue = String(targetPathValue === EMPTY_CATEGORY_VALUE ? "" : targetPathValue || "").trim();

        if (field.type !== "dynamic") {
          const currentValue = getCategoryValue({
            reteta,
            field,
            dynamicColumns,
            displayLang,
          });
          const comparableTarget = targetValue || EMPTY_CATEGORY_VALUE;

          if (currentValue !== comparableTarget) {
            unsupportedField = field;
          }

          return;
        }

        const col = field.column || dynamicColumns.find((item) => String(item.id) === String(field.columnId));

        if (!col) return;

        const colId = col.id ? String(col.id) : "";
        const colName = String(col.nume || col.name || "").trim();
        const colNameLower = colName.toLowerCase();
        const existingIndex = nextColoaneValori.findIndex((item) => {
          if (colId && item.id && String(item.id) === colId) return true;
          return item.name && item.name.toLowerCase() === colNameLower;
        });

        if (existingIndex === -1) {
          nextColoaneValori.push({
            id: colId,
            name: colName,
            value: targetValue,
          });
          changed = true;
          return;
        }

        if (String(nextColoaneValori[existingIndex].value || "") !== targetValue) {
          nextColoaneValori[existingIndex] = {
            ...nextColoaneValori[existingIndex],
            id: nextColoaneValori[existingIndex].id || colId,
            name: nextColoaneValori[existingIndex].name || colName,
            value: targetValue,
          };
          changed = true;
        }
      });

      return {
        reteta: changed ? { ...reteta, coloane_valori: nextColoaneValori } : reteta,
        coloane_valori: nextColoaneValori,
        changed,
        unsupportedField,
      };
    },
    [activeCategoryFields, displayLang, dynamicColumns],
  );

  const handleDragEnd = useCallback(
    async (event) => {
      if (isRowOrderLocked) {
        setActiveDragId(null);
        return;
      }

      const activeId = event.active?.id;
      const overId = event.over?.id;

      setActiveDragId(null);

      window.setTimeout(() => {
        wasDraggingRef.current = false;
      }, 0);

      if (!activeId || !overId || toId(activeId) === toId(overId)) return;

      const activeRow = getDisplayRowByDragId(displayRowsRef.current, activeId);
      const overRow = getDisplayRowByDragId(displayRowsRef.current, overId);

      if (!activeRow || !overRow) return;

      let next = null;
      let categoryUpdates = [];
      let movedRetetaIds = [];
      let lastMovedRetetaId = null;

      if (isCategoryActive) {
        if (activeRow.type === "reteta") {
          if (overRow.type !== "reteta" && overRow.type !== "category") return;

          const activeRetetaId = toId(activeRow.reteta.id);
          const selectedSet = new Set(selectedIds.map(toId));
          const movingIds = selectedSet.has(activeRetetaId) ? selectedIds.map(toId) : [activeRetetaId];
          const movingSet = new Set(movingIds);
          movedRetetaIds = movingIds;
          lastMovedRetetaId = activeRetetaId;
          const insertAfterOver = getInsertAfterFromDragEvent(event);
          let targetPath = overRow.categoryPath || [];
          let overRetetaRow = null;
          let insertAfterTarget = false;

          if (overRow.type === "reteta") {
            overRetetaRow = overRow;
            insertAfterTarget = insertAfterOver;
          } else {
            const overRowIndex = displayRowsRef.current.findIndex((row) => getDragIdForRow(row) === getDragIdForRow(overRow));

            if (!insertAfterOver && overRowIndex > 0) {
              const previousRetetaRow = [...displayRowsRef.current]
                .slice(0, overRowIndex)
                .reverse()
                .find((row) => row.type === "reteta" && !movingSet.has(toId(row.reteta?.id)));

              if (previousRetetaRow) {
                targetPath = previousRetetaRow.categoryPath || [];
                overRetetaRow = previousRetetaRow;
                insertAfterTarget = true;
              }
            }

            if (!overRetetaRow) {
              overRetetaRow = displayRowsRef.current.find((row) => row.type === "reteta" && pathStartsWith(row.categoryPath, targetPath) && !movingSet.has(toId(row.reteta?.id)));
              insertAfterTarget = false;
            }
          }

          let unsupportedField = null;

          const reteteWithUpdatedCategories = orderedRetete.map((reteta) => {
            if (!movingSet.has(toId(reteta.id))) return reteta;

            const result = buildRetetaWithCategoryPath(reteta, targetPath);

            if (result.unsupportedField) {
              unsupportedField = result.unsupportedField;
            }

            if (result.changed) {
              categoryUpdates.push({
                reteta: result.reteta,
                coloane_valori: result.coloane_valori,
              });
            }

            return result.reteta;
          });

          if (unsupportedField) {
            toast.warning(`Categoria "${unsupportedField.label}" nu poate fi schimbată prin drag & drop. Folosește coloane dinamice pentru mutări între categorii.`, { position: "top-right" });
            return;
          }

          if (!overRetetaRow) {
            next = reteteWithUpdatedCategories;
          } else {
            next = reorderSelectedBlockAt({
              items: reteteWithUpdatedCategories,
              selectedIds: movingIds,
              activeId: activeRetetaId,
              overId: toId(overRetetaRow.reteta.id),
              insertAfter: insertAfterTarget,
            });
          }
        } else if (activeRow.type === "category") {
          if (overRow.type !== "category" || activeRow.level !== overRow.level || !pathsEqual(activeRow.parentPath, overRow.parentPath)) {
            toast.warning("Poți muta categorii doar între categorii de același nivel.", { position: "top-right" });
            return;
          }

          if (pathsEqual(activeRow.categoryPath, overRow.categoryPath)) return;

          const rows = displayRowsRef.current;
          const reteteById = new Map(orderedRetete.map((reteta) => [toId(reteta.id), reteta]));
          const siblingCategoryRows = rows.filter((row) => row.type === "category" && row.level === activeRow.level && pathsEqual(row.parentPath, activeRow.parentPath));
          const activeIndex = siblingCategoryRows.findIndex((row) => pathsEqual(row.categoryPath, activeRow.categoryPath));
          const overIndex = siblingCategoryRows.findIndex((row) => pathsEqual(row.categoryPath, overRow.categoryPath));

          if (activeIndex === -1 || overIndex === -1) return;

          const getCategoryRetete = (categoryRow) => {
            const ids = rows
              .filter((row) => row.type === "reteta" && pathStartsWith(row.categoryPath, categoryRow.categoryPath))
              .map((row) => toId(row.reteta?.id))
              .filter(Boolean);

            return ids.map((id) => reteteById.get(id)).filter(Boolean);
          };

          const siblingGroups = siblingCategoryRows.map((row) => ({
            row,
            items: getCategoryRetete(row),
          }));
          const movingGroup = siblingGroups[activeIndex];

          if (!movingGroup?.items?.length) return;

          siblingGroups.splice(activeIndex, 1);
          siblingGroups.splice(overIndex, 0, movingGroup);

          const siblingIds = new Set(siblingGroups.flatMap((group) => group.items.map((reteta) => toId(reteta.id))));
          const reorderedSiblingItems = siblingGroups.flatMap((group) => group.items);
          let insertedSiblings = false;

          next = orderedRetete.reduce((acc, reteta) => {
            if (!siblingIds.has(toId(reteta.id))) {
              acc.push(reteta);
              return acc;
            }

            if (!insertedSiblings) {
              acc.push(...reorderedSiblingItems);
              insertedSiblings = true;
            }

            return acc;
          }, []);
        }
      } else if (activeRow.type === "reteta" && overRow.type === "reteta") {
        next = reorderSelectedBlock({
          items: orderedRetete,
          selectedIds,
          activeId,
          overId,
        });
      }

      if (!next) return;

      const oldOrder = orderedRetete.map((item) => toId(item.id)).join(",");
      const newOrder = next.map((item) => toId(item.id)).join(",");
      const orderChanged = oldOrder !== newOrder;

      if (!orderChanged && categoryUpdates.length === 0) return;

      setOrderedRetete(next);

      if (lastMovedRetetaId) {
        const nextReteteForSelection = buildDisplayRowsWithCategories({
          retete: next,
          expandedRetetaIds: new Set(),
          categoryConfig: normalizedCategoryConfig,
          dynamicColumns,
          displayLang,
        })
          .filter((row) => row.type === "reteta")
          .map((row) => row.reteta);
        const nextIndex = nextReteteForSelection.findIndex((reteta) => toId(reteta.id) === lastMovedRetetaId);

        if (nextIndex !== -1) {
          lastClickedIndexRef.current = nextIndex;
        }

        setSelectedIds(movedRetetaIds.length > 0 ? movedRetetaIds : [lastMovedRetetaId]);
      }

      try {
        if (categoryUpdates.length > 0) {
          await onUpdateRetetaCategoryValues?.(categoryUpdates);
        }

        if (orderChanged) {
          await onReorderRetete?.({
            lucrare_id: selectedLucrare?.id,
            ordered_ids: next.map((item) => item.id),
          });
        }
      } catch (err) {
        setOrderedRetete(orderedRetete);
        toast.error(err?.response?.data?.message || "Eroare la reordonarea rețetelor.");
      }
    },
    [
      buildRetetaWithCategoryPath,
      displayLang,
      dynamicColumns,
      isCategoryActive,
      isRowOrderLocked,
      normalizedCategoryConfig,
      orderedRetete,
      selectedIds,
      onReorderRetete,
      onUpdateRetetaCategoryValues,
      selectedLucrare?.id,
    ],
  );

  const onConfirmDuplicate = useCallback(
    async (payload) => {
      await onDuplicateRetete?.(payload);
      setDuplicateOpen(false);
      setDuplicateItems([]);
      setSelectedIds([]);
    },
    [onDuplicateRetete],
  );

  const onConfirmMove = useCallback(
    async (payload) => {
      await onMoveRetete?.(payload);
      setMoveOpen(false);
      setMoveItems([]);
      setSelectedIds([]);
    },
    [onMoveRetete],
  );

  const onConfirmReplace = useCallback(
    async (payload) => {
      await onReplaceRetete?.(payload);
      setReplaceOpen(false);
      setReplaceItems([]);
      setSelectedIds([]);
    },
    [onReplaceRetete],
  );

  const onConfirmActualizeaza = useCallback(
    async (payload) => {
      await onActualizeazaRetete?.(payload);
      setActualizeazaOpen(false);
      setActualizeazaItems([]);
      setSelectedIds([]);
    },
    [onActualizeazaRetete],
  );

  const handleSaveRetetaQuantity = useCallback(
    async (reteta, values) => {
      await onUpdateRetetaQuantity?.(reteta, values);
    },
    [onUpdateRetetaQuantity],
  );

  const displayRows = useMemo(() => {
    return buildDisplayRowsWithCategories({
      retete: pricedSortedRetete,
      expandedRetetaIds,
      categoryConfig: normalizedCategoryConfig,
      dynamicColumns,
      displayLang,
    });
  }, [displayLang, dynamicColumns, expandedRetetaIds, normalizedCategoryConfig, pricedSortedRetete]);

  displayRowsRef.current = displayRows;

  const sortableItemIds = useMemo(() => {
    return displayRows
      .filter((row) => row.type === "reteta" || row.type === "category")
      .map(getDragIdForRow)
      .filter(Boolean);
  }, [displayRows]);

  const activeDragRow = useMemo(() => {
    if (!activeDragId) return null;
    return getDisplayRowByDragId(displayRows, activeDragId);
  }, [activeDragId, displayRows]);

  const activeCategoryRows = useMemo(() => {
    if (!isCategoryActive) return [];

    const byLevel = [];
    let offset = 0;

    for (const row of displayRows) {
      if (offset > categoryScrollTop) break;

      const rowHeight = getEstimatedDisplayRowHeight(row);

      if (row.type === "category" && offset + rowHeight <= categoryScrollTop) {
        const levelIndex = Math.max(0, Number(row.level || 1) - 1);
        byLevel[levelIndex] = row;
        byLevel.length = levelIndex + 1;
      }

      offset += rowHeight;
    }

    return byLevel.filter(Boolean);
  }, [categoryScrollTop, displayRows, isCategoryActive]);

  const visibleTableColumnCount = useMemo(() => {
    let count = 1;

    if (showCol("elemente")) count += 1;
    if (showCol("poza")) count += 1;

    dynamicColumns.forEach((col) => {
      if (showCol(`col_${col.id}`)) {
        count += 1;
      }
    });

    [
      "cod",
      "clasa1",
      "clasa2",
      "clasa3",
      "clasa4",
      "clasa5",
      "denumire",
      "descriere",
      "furnizor",
      "marca",
      "unitate",
      "cantitate",
      "qtyTotal",
      "greutateUnitara",
      "greutateTotala",
      "cost",
      "costTotal",
      "coefProcent",
      "coefPret",
      "pret",
      "creat",
      "actualizat",
    ].forEach((key) => {
      if (showCol(key)) {
        count += 1;
      }
    });

    if (showCol("info")) count += 1;

    return count;
  }, [dynamicColumns, showCol]);

  const categoryTotalsLabelColSpan = useMemo(() => {
    let count = 1;

    if (showCol("elemente")) count += 1;
    if (showCol("poza")) count += 1;

    dynamicColumns.forEach((col) => {
      if (showCol(`col_${col.id}`)) {
        count += 1;
      }
    });

    const labelKeys = showCol("pret")
      ? [
          "cod",
          "clasa1",
          "clasa2",
          "clasa3",
          "clasa4",
          "clasa5",
          "denumire",
          "descriere",
          "furnizor",
          "marca",
          "unitate",
          "cantitate",
          "qtyTotal",
          "greutateUnitara",
          "greutateTotala",
          "cost",
          "costTotal",
          "coefProcent",
          "coefPret",
        ]
      : [
          "cod",
          "clasa1",
          "clasa2",
          "clasa3",
          "clasa4",
          "clasa5",
          "denumire",
          "descriere",
          "furnizor",
          "marca",
          "unitate",
          "cantitate",
          "qtyTotal",
          "greutateUnitara",
          "greutateTotala",
          "cost",
          "costTotal",
          "coefProcent",
          "coefPret",
          "pret",
          "creat",
          "actualizat",
        ];

    labelKeys.forEach((key) => {
      if (showCol(key)) {
        count += 1;
      }
    });

    return Math.max(1, count);
  }, [dynamicColumns, showCol]);

  const getCategoryTheme = useCallback(
    (row) => {
      const backgroundColor = getCategoryColor(normalizedCategoryColorsConfig, row?.fieldKey, row?.value);

      if (!backgroundColor) {
        return {
          hasColor: false,
          backgroundColor: "",
          textColor: "",
          style: {},
          cellClass:
            "h-10 border-b border-r border-border bg-[#c4c4ce] p-1 align-middle text-sm text-foreground shadow-sm dark:bg-[#34363d] dark:text-foreground dark:[&_*]:!text-foreground [.blue_&]:bg-[#22262b]",
          fullClass: "h-10 border-b border-border bg-[#c4c4ce] py-0 pr-3 align-middle shadow-sm dark:bg-[#34363d] dark:text-foreground dark:[&_*]:!text-foreground [.blue_&]:bg-[#22262b]",
          badgeClass: "shrink-0 flex gap-3 rounded-md border border-border bg-background/70 px-2.5 py-1 text-sm font-bold text-foreground",
          levelClass: "shrink-0 rounded-md border border-border bg-background/70 px-2.5 py-1 text-sm font-black uppercase tracking-wide text-foreground",
          valueClass: "min-w-0 flex-1 truncate text-base font-black text-foreground",
          totalClass: "text-sm font-black text-primary whitespace-nowrap",
        };
      }

      const color = getReadableTextColor(backgroundColor);

      return {
        hasColor: true,
        backgroundColor,
        textColor: color,
        style: {
          backgroundColor,
          color,
        },
        cellClass: "h-10 border-b border-r border-border p-1 align-middle text-sm shadow-sm",
        fullClass: "h-10 border-b border-border py-0 pr-3 align-middle shadow-sm",
        badgeClass: "shrink-0 flex gap-3 rounded-md border border-current bg-white/20 px-2.5 py-1 text-sm font-bold",
        levelClass: "shrink-0 rounded-md border border-current/40 bg-white/20 px-2.5 py-1 text-sm font-black uppercase tracking-wide",
        valueClass: "min-w-0 truncate text-base font-black",
        totalClass: "text-sm font-black whitespace-nowrap",
      };
    },
    [normalizedCategoryColorsConfig],
  );

  const context = useMemo(() => {
    return {
      displayRows,
      reteteItems: sortedRetete,
      selectedIds,
      isSortActive,
      isRowOrderLocked,
      isCoeficientEditing,
      highlightedRetetaIds,
      excludedRetetaIds,
      expandedRetetaIds,
      toggleRetetaExpand,
      handleRowClick,
      handleRowContextMenu,
      handleElementRowClick,
      handleCoeficientElementClick,
      getSelectedRetete,
      handleEdit,
      handleDelete,
      handleDuplicate,
      handleMove,
      handleReplace,
      handleFurnizori,
      handleActualizeaza,
    };
  }, [
    displayRows,
    sortedRetete,
    selectedIds,
    isSortActive,
    isRowOrderLocked,
    isCoeficientEditing,
    highlightedRetetaIds,
    excludedRetetaIds,
    expandedRetetaIds,
    toggleRetetaExpand,
    handleRowClick,
    handleRowContextMenu,
    handleElementRowClick,
    handleCoeficientElementClick,
    getSelectedRetete,
    handleEdit,
    handleDelete,
    handleDuplicate,
    handleMove,
    handleReplace,
    handleFurnizori,
    handleActualizeaza,
  ]);

  const renderSortHeaderContent = useCallback(
    (sortKey, content, align = "center") => {
      const active = sortConfig?.key === sortKey;
      const icon = !active ? faSort : sortConfig.direction === "asc" ? faSortDown : faSortUp;
      const justifyClass = align === "left" ? "justify-start text-left" : align === "right" ? "justify-end text-right" : "justify-center text-center";

      return (
        <button
          data-no-row-open
          type="button"
          className={`flex h-full w-full min-w-0 items-center  gap-1.5  px-1.5 py-1 text-sm font-black text-foreground transition-colors hover:bg-background/15 ${justifyClass}`}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (isCoeficientEditing) return;
            handleSortColumn(sortKey);
          }}
        >
          <span className="min-w-0 flex-1 overflow-hidden">{content}</span>
          <FontAwesomeIcon className={`shrink-0 text-base ${active ? "!text-[#facc15] dark:!text-[#b7791f]" : "!text-white dark:!text-[#050507] [.blue_&]:!text-white"}`} icon={icon} />
        </button>
      );
    },
    [handleSortColumn, isCoeficientEditing, sortConfig],
  );

  const renderMoneySortHeaderContent = useCallback(
    (sortKey, label) => {
      const active = sortConfig?.key === sortKey;
      const icon = !active ? faSort : sortConfig.direction === "asc" ? faSortDown : faSortUp;
      const normalizedCurrency = String(currency || "").trim();

      return (
        <button
          data-no-row-open
          type="button"
          className="relative flex h-full w-full min-w-0 items-center justify-center px-1 py-0.5 text-center text-sm font-black text-foreground transition-colors hover:bg-background/15"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (isCoeficientEditing) return;
            handleSortColumn(sortKey);
          }}
        >
          <span className="flex min-w-0 flex-col items-center justify-center leading-tight">
            <span className="max-w-full truncate">{label}</span>
            {normalizedCurrency && <span className="max-w-full truncate text-[10px] xxxl:text-xs font-black uppercase leading-tight text-foreground/80">- {normalizedCurrency} -</span>}
          </span>
          <FontAwesomeIcon
            className={`absolute right-1 shrink-0 text-base ${active ? "!text-[#facc15] dark:!text-[#b7791f]" : "!text-white dark:!text-[#050507] [.blue_&]:!text-white"}`}
            icon={icon}
          />
        </button>
      );
    },
    [currency, handleSortColumn, isCoeficientEditing, sortConfig],
  );

  return (
    <div className="rounded-md border bg-card w-full h-full overflow-hidden relative flex flex-col text-sm text-foreground">
      <div ref={containerRef} onScroll={handleScroll} className="flex-1 min-h-0 overflow-auto relative">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragCancel={handleDragCancel} onDragEnd={handleDragEnd}>
          <SortableContext items={sortableItemIds} strategy={verticalListSortingStrategy}>
            <TableVirtuoso
              customScrollParent={containerRef.current}
              overscan={10}
              totalCount={displayRows.length}
              data={displayRows}
              style={{ height: "100%", width: "100%" }}
              components={componentsOferteRetete}
              context={context}
              fixedHeaderContent={() => (
                <TableRow className="h-9 !bg-[#2b2b31] hover:!bg-[#2b2b31] dark:!bg-[#eeeeef] dark:hover:!bg-[#eeeeef] [.blue_&]:!bg-[#191c20] [.blue_&:hover]:!bg-[#191c20] [&>th]:!border-0 [&>th]:!bg-[#2b2b31] [&>th]:!text-white dark:[&>th]:!bg-[#eeeeef] dark:[&>th]:!text-[#050507] [.blue_&>th]:!bg-[#191c20] [.blue_&>th]:!text-white [&>th]:shadow-[inset_-1px_0_0_#6f6f78,inset_0_-1px_0_#6f6f78] dark:[&>th]:shadow-[inset_-1px_0_0_#60696c,inset_0_-1px_0_#60696c] [.blue_&>th]:shadow-[inset_-1px_0_0_#36506b,inset_0_-1px_0_#36506b] [&_button]:!text-white [&_div]:!text-white [&_span]:!text-white dark:[&_button]:!text-[#050507] dark:[&_div]:!text-[#050507] dark:[&_span]:!text-[#050507]">
                  <ResizableTableHead
                    colKey="tree"
                    style={getColumnStyle("tree")}
                    onResizeStart={handleColumnResizeStart}
                    className="relative h-9 border-r border-b border-border text-center align-middle text-sm font-bold text-foreground"
                  />

                  {showCol("elemente") && (
                    <ResizableTableHead
                      colKey="elemente"
                      style={getColumnStyle("elemente")}
                      onResizeStart={handleColumnResizeStart}
                      className="relative h-9 border-l border-r border-b border-border  text-center align-middle text-sm font-bold text-foreground"
                    >
                      Tip
                    </ResizableTableHead>
                  )}

                  {showCol("poza") && (
                    <ResizableTableHead
                      colKey="poza"
                      style={getColumnStyle("poza")}
                      onResizeStart={handleColumnResizeStart}
                      className="relative h-9 border-r border-b border-border  text-center align-middle text-sm font-bold text-foreground"
                    >
                      Poza
                    </ResizableTableHead>
                  )}

                  {dynamicColumns.map((col) =>
                    showCol(`col_${col.id}`) ? (
                      <ResizableTableHead
                        key={col.id}
                        colKey={`dynamic_${col.id}`}
                        style={getColumnStyle(`dynamic_${col.id}`)}
                        onResizeStart={handleColumnResizeStart}
                        className="relative h-9 border-r border-b border-border w-full  text-center align-middle text-sm font-bold text-foreground"
                      >
                        {renderSortHeaderContent(
                          `dynamic_${col.id}`,
                          <OverflowTooltip text={col.nume} align={tooltipAlign} className={`font-bold ${textAlignClass} text-foreground`} maxLines={1} textSize="sm" />,
                          safeTextAlign,
                        )}
                      </ResizableTableHead>
                    ) : null,
                  )}

                  {showCol("cod") && (
                    <ResizableTableHead
                      colKey="cod"
                      style={getColumnStyle("cod")}
                      onResizeStart={handleColumnResizeStart}
                      className="relative h-9 border-r border-b border-border  text-center align-middle text-sm font-bold text-foreground"
                    >
                      {renderSortHeaderContent("cod", "Cod", safeTextAlign)}
                    </ResizableTableHead>
                  )}

                  {CLASS_LEVEL_COLUMNS.map(
                    (column) =>
                      showCol(column.key) && (
                        <ResizableTableHead
                          key={column.key}
                          colKey={column.key}
                          style={getColumnStyle(column.key)}
                          onResizeStart={handleColumnResizeStart}
                          className="relative h-9 border-r border-b border-border  text-center align-middle text-sm font-bold text-foreground"
                        >
                          {renderSortHeaderContent(column.key, column.label, safeTextAlign)}
                        </ResizableTableHead>
                      ),
                  )}

                  {showCol("denumire") && (
                    <ResizableTableHead
                      colKey="denumire"
                      style={getColumnStyle("denumire")}
                      onResizeStart={handleColumnResizeStart}
                      className="relative h-9 border-r border-b border-border  text-left align-middle text-sm font-bold text-foreground"
                    >
                      {renderSortHeaderContent("denumire", "Denumire", safeTextAlign)}
                    </ResizableTableHead>
                  )}

                  {showCol("descriere") && (
                    <ResizableTableHead
                      colKey="descriere"
                      style={getColumnStyle("descriere")}
                      onResizeStart={handleColumnResizeStart}
                      className="relative h-9 border-r border-b border-border  text-left align-middle text-sm font-bold text-foreground"
                    >
                      Descriere
                    </ResizableTableHead>
                  )}

                  {showCol("furnizor") && (
                    <ResizableTableHead
                      colKey="furnizor"
                      style={getColumnStyle("furnizor")}
                      onResizeStart={handleColumnResizeStart}
                      className="relative h-9 border-r border-b border-border text-center align-middle text-sm font-bold text-foreground"
                    >
                      Furnizor
                    </ResizableTableHead>
                  )}

                  {showCol("marca") && (
                    <ResizableTableHead
                      colKey="marca"
                      style={getColumnStyle("marca")}
                      onResizeStart={handleColumnResizeStart}
                      className="relative h-9 border-r border-b border-border text-center align-middle text-sm font-bold text-foreground"
                    >
                      Marcă
                    </ResizableTableHead>
                  )}

                  {showCol("unitate") && (
                    <ResizableTableHead
                      colKey="unitate"
                      style={getColumnStyle("unitate")}
                      onResizeStart={handleColumnResizeStart}
                      className="relative h-9 border-r border-b border-border  text-center align-middle text-sm font-bold text-foreground"
                    >
                      U.M.
                    </ResizableTableHead>
                  )}

                  {showCol("cantitate") && (
                    <ResizableTableHead
                      colKey="cantitate"
                      style={getColumnStyle("cantitate")}
                      onResizeStart={handleColumnResizeStart}
                      className="relative h-10 border-r border-b border-border  text-center align-middle text-sm font-bold text-foreground"
                    >
                      {renderSortHeaderContent("cantitate", "Qty unitar")}
                    </ResizableTableHead>
                  )}

                  {showCol("qtyTotal") && (
                    <ResizableTableHead
                      colKey="qtyTotal"
                      style={getColumnStyle("qtyTotal")}
                      onResizeStart={handleColumnResizeStart}
                      className="relative h-9 border-r border-b border-border  text-center align-middle text-sm font-bold text-foreground"
                    >
                      {renderSortHeaderContent("qtyTotal", "Qty total")}
                    </ResizableTableHead>
                  )}

                  {showCol("greutateUnitara") && (
                    <ResizableTableHead
                      colKey="greutateUnitara"
                      style={getColumnStyle("greutateUnitara")}
                      onResizeStart={handleColumnResizeStart}
                      className="relative h-9 border-r border-b border-border text-center align-middle text-sm font-bold text-foreground"
                    >
                      {renderSortHeaderContent("greutateUnitara", "Greutate unitară")}
                    </ResizableTableHead>
                  )}

                  {showCol("greutateTotala") && (
                    <ResizableTableHead
                      colKey="greutateTotala"
                      style={getColumnStyle("greutateTotala")}
                      onResizeStart={handleColumnResizeStart}
                      className="relative h-9 border-r border-b border-border text-center align-middle text-sm font-bold text-foreground"
                    >
                      {renderSortHeaderContent("greutateTotala", "Greutate totală")}
                    </ResizableTableHead>
                  )}

                  {showCol("cost") && (
                    <ResizableTableHead
                      colKey="cost"
                      style={getColumnStyle("cost")}
                      onResizeStart={handleColumnResizeStart}
                      className="relative h-10 border-r border-b border-border text-center align-middle text-sm font-bold text-foreground"
                    >
                      {renderMoneySortHeaderContent("cost", "Cost unitar")}
                    </ResizableTableHead>
                  )}

                  {showCol("costTotal") && (
                    <ResizableTableHead
                      colKey="costTotal"
                      style={getColumnStyle("costTotal")}
                      onResizeStart={handleColumnResizeStart}
                      className="relative h-10 border-r border-b border-border  text-center align-middle text-sm font-bold text-foreground"
                    >
                      {renderMoneySortHeaderContent("costTotal", "Cost total")}
                    </ResizableTableHead>
                  )}

                  {showCol("coefProcent") && (
                    <ResizableTableHead
                      colKey="coefProcent"
                      style={getColumnStyle("coefProcent")}
                      onResizeStart={handleColumnResizeStart}
                      className="relative h-9 border-r border-b border-border  text-center align-middle text-sm font-bold text-foreground"
                    >
                      {renderSortHeaderContent("coefProcent", "Coef")}
                    </ResizableTableHead>
                  )}

                  {showCol("coefPret") && (
                    <ResizableTableHead
                      colKey="coefPret"
                      style={getColumnStyle("coefPret")}
                      onResizeStart={handleColumnResizeStart}
                      className="relative h-10 border-r border-b border-border  text-center align-middle text-sm font-bold text-foreground"
                    >
                      {renderSortHeaderContent("coefPret", getMoneyHeaderLabel("Coef. preț", currency))}
                    </ResizableTableHead>
                  )}

                  {showCol("pret") && (
                    <ResizableTableHead
                      colKey="pret"
                      style={getColumnStyle("pret")}
                      onResizeStart={handleColumnResizeStart}
                      className="relative h-10 border-r border-b border-border  text-center align-middle text-sm font-black text-foreground"
                    >
                      {renderMoneySortHeaderContent("pret", "Preț")}
                    </ResizableTableHead>
                  )}

                  {showCol("creat") && (
                    <ResizableTableHead
                      colKey="creat"
                      style={getColumnStyle("creat")}
                      onResizeStart={handleColumnResizeStart}
                      className="relative h-9 border-r border-b border-border  text-left align-middle text-sm font-bold text-foreground"
                    >
                      Creat
                    </ResizableTableHead>
                  )}

                  {showCol("actualizat") && (
                    <ResizableTableHead
                      colKey="actualizat"
                      style={getColumnStyle("actualizat")}
                      onResizeStart={handleColumnResizeStart}
                      className="relative h-9 border-r border-b border-border  text-left align-middle text-sm font-bold text-foreground"
                    >
                      Actualizat
                    </ResizableTableHead>
                  )}

                  {showCol("info") && (
                    <ResizableTableHead
                      colKey="info"
                      style={getColumnStyle("info")}
                      onResizeStart={handleColumnResizeStart}
                      className="relative h-9 border-r border-b border-border  text-center align-middle text-sm font-bold text-foreground"
                    >
                      Info
                    </ResizableTableHead>
                  )}
                </TableRow>
              )}
              itemContent={(index) => {
                const rowItem = displayRows[index];

                if (!rowItem) return null;

                if (rowItem.type === "category") {
                  const level = Number(rowItem.level || 1);
                  const categoryTheme = getCategoryTheme(rowItem);
                  const categoryTotals = rowItem.totals || {};
                  const categoryInfoVisible = showCol("info");
                  const categoryMainColSpan = categoryInfoVisible ? Math.max(1, (visibleTableColumnCount || 1) - 1) : visibleTableColumnCount || 1;

                  if (showCategoryTotals) {
                    return (
                      <>
                        <TableCell
                          colSpan={categoryTotalsLabelColSpan}
                          style={{
                            paddingLeft: `${0.75 + (level - 1) * 1.25}rem`,
                            ...categoryTheme.style,
                          }}
                          className={`${categoryTheme.cellClass} pr-3`}
                        >
                          <div className="flex h-full min-w-0 items-center gap-2">
                            <span className={categoryTheme.levelClass}>Nivel {level}</span>

                            <span className={categoryTheme.valueClass}>{rowItem.value}</span>

                            <span className="shrink-0 text-base font-black">
                              | Total rețete: {rowItem.count} | Total ore: {formatNumber(categoryTotals.totalManoperaHours, safeDecimalPlaces)}
                            </span>
                          </div>
                        </TableCell>

                        {showCol("pret") && (
                          <TableCell style={{ ...getColumnStyle("pret"), ...categoryTheme.style }} className={`${categoryTheme.cellClass} text-right`}>
                            <span className={categoryTheme.totalClass}>{formatNumber(categoryTotals.pret ?? categoryTotals.total, safeDecimalPlaces)}</span>
                          </TableCell>
                        )}

                        {showCol("pret") && showCol("creat") && <TableCell style={{ ...getColumnStyle("creat"), ...categoryTheme.style }} className={categoryTheme.cellClass} />}
                        {showCol("pret") && showCol("actualizat") && <TableCell style={{ ...getColumnStyle("actualizat"), ...categoryTheme.style }} className={categoryTheme.cellClass} />}
                        {categoryInfoVisible && (
                          <TableCell style={{ ...getColumnStyle("info"), ...categoryTheme.style }} className={`${categoryTheme.cellClass} text-center`}>
                            <div className="flex h-full items-center justify-center">
                              <CategoryColorButton
                                row={rowItem}
                                color={categoryTheme.backgroundColor}
                                textColor={categoryTheme.textColor}
                                onChange={isCoeficientEditing ? undefined : onCategoryColorChange}
                              />
                            </div>
                          </TableCell>
                        )}
                      </>
                    );
                  }

                  return (
                    <>
                      <TableCell
                        colSpan={categoryMainColSpan}
                        style={{
                          paddingLeft: `${0.75 + (level - 1) * 1.25}rem`,
                          ...categoryTheme.style,
                        }}
                        className={categoryTheme.fullClass}
                      >
                        <div className="flex h-full min-w-0 items-center gap-2">
                          <span className={categoryTheme.levelClass}>Nivel {level}</span>

                          <span className={categoryTheme.valueClass}>{rowItem.value}</span>

                          <span className="shrink-0 text-xs xxxl:text-sm font-black">| Total rețete: {rowItem.count}</span>
                        </div>
                      </TableCell>

                      {categoryInfoVisible && (
                        <TableCell style={{ ...getColumnStyle("info"), ...categoryTheme.style }} className={`${categoryTheme.cellClass} text-center`}>
                          <div className="flex h-full items-center justify-center">
                            <CategoryColorButton
                              row={rowItem}
                              color={categoryTheme.backgroundColor}
                              textColor={categoryTheme.textColor}
                              onChange={isCoeficientEditing ? undefined : onCategoryColorChange}
                            />
                          </div>
                        </TableCell>
                      )}
                    </>
                  );
                }

                if (rowItem.type === "empty") {
                  return (
                    <TableCell colSpan={visibleTableColumnCount} className="p-2 text-center text-sm text-muted-foreground bg-muted/10">
                      Nu există elemente în această rețetă.
                    </TableCell>
                  );
                }

                if (rowItem.type === "element") {
                  return (
                    <OferteRetetaSubList
                      element={rowItem.element}
                      parentItem={rowItem.reteta}
                      displayLang={displayLang}
                      textAlign={textAlign}
                      decimalPlaces={safeDecimalPlaces}
                      dynamicColumns={dynamicColumns}
                      showCol={showCol}
                      getColumnStyle={getColumnStyle}
                      isLastElement={rowItem.isLastElement}
                      isCoeficientHighlighted={highlightedElementIds.has(toId(rowItem.element?.id))}
                      isCoeficientExcluded={excludedElementIds.has(toId(rowItem.element?.id))}
                      coeficientImpact={coefElementImpactById[toId(rowItem.element?.id)]}
                    />
                  );
                }

                const reteta = rowItem.reteta;
                const retetaRowId = toId(reteta.id);
                const afisareDenumire = displayLang === "FR" ? reteta.denumire_fr || "" : reteta.denumire || "";
                const afisareDescriere = displayLang === "FR" ? reteta.descriere_fr || reteta.descriere || "" : reteta.descriere || reteta.descriere_fr || "";

                const coloaneValori = normalizeColoaneValori(reteta.coloane_valori);

                const greutateUnitara = getRetetaGreutateUnitara(reteta);
                const greutateTotala = getRetetaGreutateTotala(reteta);
                const costReteta = getRetetaCost(reteta);
                const costTotalLucrare = getRetetaTotalLucrare(reteta);
                const coefImpact = coefRetetaImpactById[toId(reteta.id)] || {};
                const coefDirectPercent = Number(coefImpact.directPercent || 0);
                const coefInteriorPercent = Number(coefImpact.interiorPercent || 0);
                const coefAddedValue = Number(coefImpact.totalAdded || 0);
                const coefPriceValue = costTotalLucrare + coefAddedValue;
                const coefExcluded = !!coefImpact.excluded;
                const hasSpecialRowBg = coefExcluded || highlightedRetetaIds.has(retetaRowId) || selectedIds.includes(retetaRowId);
                const qtyTotalEditableBgClass = hasSpecialRowBg ? "" : "bg-primary/15 hover:bg-primary/25 dark:bg-primary/30 dark:hover:bg-primary/40";
                const isExpanded = expandedRetetaIds.has(toId(reteta.id));
                const treeStyle = getColumnStyle("tree");
                const tipStyle = getColumnStyle("elemente");
                const retetaElemente = Array.isArray(reteta.elemente) ? reteta.elemente : [];
                const totalElementeCount = retetaElemente.length;
                const variantElementeCount = retetaElemente.filter((element) => !!(element?.oferta_subcategorie_id || element?.original_subcategorie_id || element?.cod_specific)).length;

                return (
                  <>
                    <TableCell style={treeStyle} className="border-0 p-1 text-center text-sky-600 align-middle text-sm">
                      <div className="flex h-full w-full items-center justify-center leading-none">
                        <FontAwesomeIcon icon={isExpanded ? faFolderOpen : faFolder} className="text-lg" />
                      </div>
                    </TableCell>

                    {showCol("elemente") && (
                      <TableCell style={tipStyle} className="border-l border-r border-border p-0 text-center align-middle">
                        <span className="inline-flex h-6 min-w-9 items-center justify-center rounded-md border border-primary/30 bg-primary/10 px-1.5 text-xs font-black text-primary">
                          {variantElementeCount}/{totalElementeCount}
                        </span>
                      </TableCell>
                    )}

                    {showCol("poza") && (
                      <TableCell style={getColumnStyle("poza")} className="border-r border-border p-1 text-center align-middle text-sm">
                        <span className="text-sm text-muted-foreground/60">-</span>
                      </TableCell>
                    )}

                    {dynamicColumns.map((col) => {
                      if (!showCol(`col_${col.id}`)) return null;

                      const value = getColoanaValue(coloaneValori, col);

                      return (
                        <TableCell key={col.id} style={getColumnStyle(`dynamic_${col.id}`)} className={`border-r border-border p-1 align-middle text-sm ${textAlignClass}`}>
                          {value ? (
                            <OverflowTooltip align={tooltipAlign} text={String(value)} className={`font-normal text-foreground ${textAlignClass} whitespace-nowrap`} maxLines={1} textSize="sm" />
                          ) : (
                            <span className="text-sm font-normal text-muted-foreground/40 italic">—</span>
                          )}
                        </TableCell>
                      );
                    })}

                    {showCol("cod") && (
                      <TableCell style={getColumnStyle("cod")} className={`border-r border-border p-1 align-middle text-sm ${textAlignClass}`}>
                        <OferteRetetaCodeValue reteta={reteta} displayLang={displayLang} className={textAlignClass} emptyClassName="text-sm text-muted-foreground/40 italic" />
                      </TableCell>
                    )}

                    {CLASS_LEVEL_COLUMNS.map((column) => {
                      if (!showCol(column.key)) return null;

                      const classValue = getRetetaClassLevelDisplay(reteta, column.levelNo, displayLang);
                      const isUndefined = classValue.includes("Nedefinit");

                      return (
                        <TableCell key={column.key} style={getColumnStyle(column.key)} className={`border-r border-border p-1 align-middle text-sm ${textAlignClass}`}>
                          {classValue ? (
                            <OverflowTooltip
                              align={tooltipAlign}
                              text={classValue}
                              className={`font-normal whitespace-nowrap ${textAlignClass} ${isUndefined ? "text-destructive" : "text-foreground"}`}
                              maxLines={1}
                              textSize="sm"
                            />
                          ) : (
                            <span className="text-sm text-muted-foreground/40 italic">—</span>
                          )}
                        </TableCell>
                      );
                    })}

                    {showCol("denumire") && (
                      <TableCell style={getColumnStyle("denumire")} className={`border-r border-border p-1 align-middle text-sm ${textAlignClass}`}>
                        {afisareDenumire ? (
                          <OverflowTooltip
                            align={tooltipAlign}
                            text={afisareDenumire}
                            className={`font-semibold whitespace-nowrap text-foreground leading-none ${textAlignClass}`}
                            maxLines={1}
                            textSize="sm"
                          />
                        ) : (
                          <span className="text-sm text-muted-foreground/40 italic">—</span>
                        )}
                      </TableCell>
                    )}

                    {showCol("descriere") && (
                      <TableCell style={getColumnStyle("descriere")} className="border-r border-border p-1 align-middle text-sm">
                        {afisareDescriere ? (
                          <OverflowTooltip align="left" text={afisareDescriere} className="font-normal whitespace-nowrap text-foreground leading-none" maxLines={1} textSize="sm" />
                        ) : (
                          <span className="text-sm text-muted-foreground/40 italic">—</span>
                        )}
                      </TableCell>
                    )}

                    {showCol("furnizor") && (
                      <TableCell style={getColumnStyle("furnizor")} className="border-r border-border p-1 text-center align-middle text-sm">
                        <span className="text-sm text-muted-foreground italic"></span>
                      </TableCell>
                    )}

                    {showCol("marca") && (
                      <TableCell style={getColumnStyle("marca")} className="border-r border-border p-1 text-center align-middle text-sm">
                        <span className="text-sm text-muted-foreground italic"></span>
                      </TableCell>
                    )}

                    {showCol("unitate") && (
                      <TableCell style={getColumnStyle("unitate")} className="border-r border-border p-1 text-center align-middle text-sm">
                        <span className="text-sm font-semibold text-foreground whitespace-nowrap">{reteta.unitate_masura}</span>
                      </TableCell>
                    )}

                    {showCol("cantitate") && (
                      <TableCell style={getColumnStyle("cantitate")} className="border-r border-border p-1 text-center align-middle text-sm">
                        <span className="text-sm font-bold text-foreground whitespace-nowrap">{formatNumber(1, safeDecimalPlaces)}</span>
                      </TableCell>
                    )}

                    {showCol("qtyTotal") && (
                      <TableCell
                        data-no-row-open
                        style={getColumnStyle("qtyTotal")}
                        className={`relative border-r border-border p-0 text-center text-sm ${qtyTotalEditableBgClass}`}
                        onPointerDown={(e) => {
                          e.stopPropagation();
                        }}
                        onMouseDown={(e) => {
                          e.stopPropagation();
                        }}
                        onClick={(e) => {
                          if (isCoeficientEditing) {
                            handleRowClick(e, reteta);
                            return;
                          }

                          e.stopPropagation();
                        }}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                        }}
                        onContextMenu={(e) => {
                          e.stopPropagation();
                        }}
                      >
                        {isCoeficientEditing ? (
                          <span className="inline-flex h-full w-full items-center justify-center px-1 text-sm font-bold text-foreground whitespace-nowrap">
                            {formatNumber(reteta.cantitate_lucrare, safeDecimalPlaces)}
                          </span>
                        ) : (
                          <OferteQtyFormulaCell
                            value={reteta.cantitate_lucrare}
                            formula={reteta.cantitate_lucrare_formula}
                            decimalPlaces={safeDecimalPlaces}
                            onSave={(values) => handleSaveRetetaQuantity(reteta, values)}
                          />
                        )}
                      </TableCell>
                    )}

                    {showCol("greutateUnitara") && (
                      <TableCell style={getColumnStyle("greutateUnitara")} className="border-r border-border p-1 text-center align-middle text-sm">
                        <span className="text-sm font-bold text-foreground whitespace-nowrap">{formatNumber(greutateUnitara, safeDecimalPlaces)}</span>
                      </TableCell>
                    )}

                    {showCol("greutateTotala") && (
                      <TableCell style={getColumnStyle("greutateTotala")} className="border-r border-border p-1 text-center align-middle text-sm">
                        <span className="text-sm font-bold text-foreground whitespace-nowrap">{formatNumber(greutateTotala, safeDecimalPlaces)}</span>
                      </TableCell>
                    )}

                    {showCol("cost") && (
                      <TableCell style={getColumnStyle("cost")} className="border-r border-border p-1 text-right align-middle text-sm">
                        <span className="text-sm font-bold text-foreground whitespace-nowrap">{formatNumber(costReteta, safeDecimalPlaces)}</span>
                      </TableCell>
                    )}

                    {showCol("costTotal") && (
                      <TableCell style={getColumnStyle("costTotal")} className="border-r border-border p-1 text-right align-middle text-sm">
                        <span className="text-sm font-black text-primary whitespace-nowrap">{formatNumber(costTotalLucrare, safeDecimalPlaces)}</span>
                      </TableCell>
                    )}

                    {showCol("coefProcent") && (
                      <TableCell style={getColumnStyle("coefProcent")} className="border-r border-border p-1 text-center align-middle text-sm">
                        {coefExcluded ? (
                          <span className="text-sm font-black text-red-600 whitespace-nowrap">Exclude</span>
                        ) : (
                          <span className="inline-flex items-center justify-center gap-1 text-sm font-black whitespace-nowrap">
                            <span className={getCoefTextClass(coefDirectPercent, "text-sky-700 dark:text-sky-300")}>{formatNumber(coefDirectPercent, 2)}%</span>
                            <span className="text-muted-foreground/45">+</span>
                            <span className={getCoefTextClass(coefInteriorPercent, "text-teal-700 dark:text-teal-300")}>{formatNumber(coefInteriorPercent, 2)}%</span>
                          </span>
                        )}
                      </TableCell>
                    )}

                    {showCol("coefPret") && (
                      <TableCell style={getColumnStyle("coefPret")} className="border-r border-border p-1 text-center align-middle text-sm">
                        <span className={`text-sm font-black whitespace-nowrap ${coefExcluded ? "text-red-600" : getCoefTextClass(coefAddedValue, "text-primary")}`}>
                          {formatNumber(coefAddedValue, safeDecimalPlaces)}
                        </span>
                      </TableCell>
                    )}

                    {showCol("pret") && (
                      <TableCell style={getColumnStyle("pret")} className="border-r border-border p-1 text-right align-middle text-sm">
                        <span className={`text-sm font-black whitespace-nowrap ${coefExcluded ? "text-red-600" : "text-primary"}`}>{formatNumber(coefPriceValue, safeDecimalPlaces)}</span>
                      </TableCell>
                    )}

                    {showCol("creat") && (
                      <TableCell style={getColumnStyle("creat")} className="border-r border-border p-1 align-middle text-sm">
                        <div className="flex items-center gap-1.5 overflow-hidden whitespace-nowrap">
                          <ImagePreviewTooltip
                            src={reteta.created_by_photo_url ? `${photoAPI}/${reteta.created_by_photo_url}` : null}
                            alt={reteta.created_by_name}
                            ringColor="ring-primary"
                            fallback={<img src={NoImage} alt="No Image" className="h-full w-full object-cover opacity-50" />}
                            containerClassName="h-6 w-6 rounded border border-border bg-muted flex items-center justify-center overflow-hidden shrink-0"
                          />

                          <span className="min-w-0 truncate text-sm font-semibold text-foreground">
                            {reteta.created_by_name || "Sistem"} · {new Date(reteta.created_at).toLocaleDateString("ro-RO")}{" "}
                            {new Date(reteta.created_at).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      </TableCell>
                    )}

                    {showCol("actualizat") && (
                      <TableCell style={getColumnStyle("actualizat")} className="border-r border-border p-1 align-middle text-sm">
                        <div className="flex items-center gap-1.5 overflow-hidden whitespace-nowrap">
                          <ImagePreviewTooltip
                            src={reteta.updated_by_photo_url ? `${photoAPI}/${reteta.updated_by_photo_url}` : null}
                            alt={reteta.updated_by_name}
                            ringColor="ring-primary"
                            fallback={<img src={NoImage} alt="No Image" className="h-full w-full object-cover opacity-50" />}
                            containerClassName="h-6 w-6 rounded border border-border bg-muted flex items-center justify-center overflow-hidden shrink-0"
                          />

                          <span className="min-w-0 truncate text-sm font-semibold text-foreground">
                            {reteta.updated_by_name || "Sistem"} · {new Date(reteta.updated_at).toLocaleDateString("ro-RO")}{" "}
                            {new Date(reteta.updated_at).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      </TableCell>
                    )}

                    {showCol("info") && (
                      <TableCell style={getColumnStyle("info")} className="border-r border-border p-1 text-center align-middle text-sm">
                        <div className="flex items-center justify-center whitespace-nowrap overflow-hidden">
                          <RetetaInfoIcons reteta={reteta} />
                        </div>
                      </TableCell>
                    )}
                  </>
                );
              }}
            />
          </SortableContext>

          <DragOverlay>
            {activeDragId ? (
              <div className="rounded-md border bg-card p-3 shadow-xl text-sm font-bold text-foreground">
                {activeDragRow?.type === "category"
                  ? `Muți categoria ${activeDragRow.value}`
                  : `Muți ${selectedIds.includes(activeDragId) && selectedIds.length > 1 ? `${selectedIds.length} rețete` : "1 rețetă"}`}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {activeCategoryRows.length > 0 && (
        <div className="pointer-events-none absolute left-0 right-4 top-9 z-30">
          {activeCategoryRows.map((row) => {
            const level = Number(row.level || 1);
            const categoryTheme = getCategoryTheme(row);

            return (
              <div
                key={`sticky-${row.id}`}
                style={{
                  paddingLeft: `${0.75 + (level - 1) * 1.25}rem`,
                  ...categoryTheme.style,
                }}
                className={`flex h-10 items-center border-b border-border py-0 pr-3 shadow-sm ${categoryTheme.hasColor ? "" : "bg-[#c4c4ce] dark:bg-[#34363d] dark:text-foreground dark:[&_*]:!text-foreground [.blue_&]:bg-[#22262b]"}`}
              >
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <span className={categoryTheme.levelClass}>Nivel {level}</span>

                  <span className={categoryTheme.valueClass}>{row.value}</span>

                  <span className="shrink-0 text-xs xxxl:text-sm font-black">
                    | Total rețete: {row.count}
                    {showCategoryTotals && row.totals
                      ? ` | Total ore: ${formatNumber(row.totals.totalManoperaHours, safeDecimalPlaces)} | Preț: ${formatNumber(row.totals.pret ?? row.totals.total, safeDecimalPlaces)}`
                      : ""}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="shrink-0 border-t p-2">
        <div className="flex flex-wrap relative h-full items-stretch gap-1.5">
          <SummaryBox label="Total ore" value={totals.totalManoperaHours} tone="manopera" decimalPlaces={safeDecimalPlaces} />

          <Separator orientation="vertical" className="bg-border mx-1.5" />

          <SummaryBox label="Manoperă" value={totals.manopera} decimalPlaces={safeDecimalPlaces} />

          <div className="flex items-center justify-center text-sm font-black text-muted-foreground">+</div>

          <SummaryBox label="Materiale" value={totals.material} decimalPlaces={safeDecimalPlaces} />

          <div className="flex items-center justify-center text-sm font-black text-muted-foreground">+</div>

          <SummaryBox label="Utilaje" value={totals.utilaj} decimalPlaces={safeDecimalPlaces} />

          <div className="flex items-center justify-center text-sm font-black text-muted-foreground">+</div>

          <SummaryBox label="Transport" value={totals.transport} decimalPlaces={safeDecimalPlaces} />

          <div className="flex items-center justify-center text-sm font-black text-muted-foreground">=</div>

          <SummaryBox label="Subtotal" value={totals.subtotal} strong decimalPlaces={safeDecimalPlaces} />

          <div className="flex items-center justify-center text-sm font-black text-muted-foreground">+</div>

          <SummaryBox label="Recapitulatii">
            <div className="flex items-center gap-1.5">
              <input
                value={recapitulatiiPercent}
                onChange={handleExtraPercentChange}
                className="h-6 w-12 rounded-md border bg-background p-1 text-center text-sm font-black text-foreground outline-none"
                inputMode="decimal"
                placeholder="0"
              />

              <span className="text-sm font-black text-muted-foreground">%</span>

              <span className="text-sm font-extrabold text-foreground whitespace-nowrap">{formatNumber(totals.extraValue, safeDecimalPlaces)}</span>
            </div>
          </SummaryBox>

          <div className="flex items-center justify-center text-sm font-black text-muted-foreground">−</div>

          <SummaryBox label="Discount">
            <div className="flex items-center gap-1.5">
              <input
                value={discountPercent}
                onChange={handleDiscountPercentChange}
                className="h-6 w-12 rounded-md border bg-background p-1 text-center text-sm font-black text-foreground outline-none"
                inputMode="decimal"
                placeholder="0"
              />

              <span className="text-sm font-black text-muted-foreground">%</span>

              <span className="text-sm font-extrabold text-foreground whitespace-nowrap">{formatNumber(totals.discountValue, safeDecimalPlaces)}</span>
            </div>
          </SummaryBox>

          <div className="flex items-center justify-center text-sm font-black text-muted-foreground">=</div>

          <SummaryBox label="Subtotal net" value={totals.totalDupaReducere} strong decimalPlaces={safeDecimalPlaces} />

          <div className="flex items-center justify-center text-sm font-black text-muted-foreground">+</div>

          <SummaryBox label="TVA">
            <div className="flex items-center gap-1.5">
              <input
                value={tvaPercent}
                onChange={handleTvaPercentChange}
                className="h-6 w-12 rounded-md border bg-background p-1 text-center text-sm font-black text-foreground outline-none"
                inputMode="decimal"
                placeholder="0"
              />

              <span className="text-sm font-black text-muted-foreground">%</span>

              <span className="text-sm font-extrabold text-foreground whitespace-nowrap">{formatNumber(totals.tvaValue, safeDecimalPlaces)}</span>
            </div>
          </SummaryBox>

          <div className="flex items-center justify-center text-sm font-black text-muted-foreground">=</div>

          <SummaryBox label="Total final" value={totals.totalFinal} strong decimalPlaces={safeDecimalPlaces} />

          <div className="ml-auto flex shrink-0 items-stretch">
            <Button type="button" onClick={onAddReteta} className="h-full min-h-[3.5rem] gap-2 px-4 text-sm font-black text-white">
              <FontAwesomeIcon className="text-lg" icon={faPlus} />
              Adaugă
            </Button>
          </div>
        </div>
      </div>

      {selectedElementConfig && selectedElement && selectedElementParentReteta && (
        <OferteElementVariantDialog
          open={variantDialogOpen}
          setOpen={setVariantDialogOpen}
          config={selectedElementConfig}
          elementItem={selectedElement}
          parentItem={selectedElementParentReteta}
          onSave={handleSaveElementSnapshot}
        />
      )}

      <OferteDuplicateReteteDialog open={duplicateOpen} setOpen={setDuplicateOpen} retete={duplicateItems} dynamicColumns={dynamicColumns} displayLang={displayLang} onConfirm={onConfirmDuplicate} />

      <OferteDuplicateReteteDialog
        open={moveOpen}
        setOpen={setMoveOpen}
        retete={moveItems}
        dynamicColumns={dynamicColumns}
        displayLang={displayLang}
        onConfirm={onConfirmMove}
        mode="move"
        oferteOptions={oferteOptions}
        selectedOfertaId={selectedOferta?.id}
        selectedLucrareId={selectedLucrare?.id}
      />

      <OferteReplaceReteteDialog open={replaceOpen} setOpen={setReplaceOpen} retete={replaceItems} dynamicColumns={dynamicColumns} displayLang={displayLang} onConfirm={onConfirmReplace} />

      <OferteFurnizoriDialog open={furnizoriOpen} setOpen={setFurnizoriOpen} retete={furnizoriItems} onLoadFurnizori={onLoadFurnizoriRetete} onConfirm={onConfirmFurnizori} />

      <OferteActualizeazaReteteDialog open={actualizeazaOpen} setOpen={setActualizeazaOpen} retete={actualizeazaItems} onConfirm={onConfirmActualizeaza} />
    </div>
  );
});

export default OferteReteteList;
