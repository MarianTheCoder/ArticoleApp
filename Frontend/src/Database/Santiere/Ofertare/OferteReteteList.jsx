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
  faArrowLeftRotate,
  faArrowsRotate,
} from "@fortawesome/free-solid-svg-icons";

import { TableVirtuoso } from "react-virtuoso";
import OverflowTooltip from "@/components/ui/OverflowTooltip";
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

import {
  toId,
  normalizeColumns,
  normalizeColoaneValori,
  getColoanaValue,
  formatNumber,
  getRetetaCost,
  getRetetaTotalLucrare,
  getElementTotalInLucrare,
  getPercentNumber,
  normalizePercentInput,
  getRangeIds,
  reorderSelectedBlock,
} from "./helpers/OferteReteteHelpers";

import OferteQtyFormulaCell from "./components/OferteQtyCell";
import OferteActualizeazaReteteDialog from "./components/OferteActualizeazaDialog";
import OferteFurnizoriDialog from "./components/OferteFurnizorDialog";
import { Separator } from "@/components/ui/separator";

import { resurseConfig } from "@/Database/Catalog/resurseConfig";
import { useEditOfertaRetetaElementVariant } from "@/hooks/Database/useOferte";

const COLUMN_WIDTHS_STORAGE_KEY = "oferte_retete_column_widths";

const getDefaultColumnWidths = () => ({
  elemente: 42,
  poza: 48,
  info: 40,
  cod: 112,
  clasa: 128,
  denumire: typeof window !== "undefined" && window.innerWidth >= 1980 ? 280 : 190,
  descriere: typeof window !== "undefined" && window.innerWidth >= 1980 ? 340 : 220,
  dynamic: 104,
  unitate: 68,
  cost: 96,
  cantitate: 108,
  costTotal: 112,
  creat: 180,
  actualizat: 180,
});

const MIN_COL_WIDTHS = {
  elemente: 40,
  poza: 42,
  info: 40,
  cod: 80,
  clasa: 90,
  denumire: 110,
  descriere: 120,
  dynamic: 80,
  unitate: 56,
  cost: 80,
  cantitate: 88,
  costTotal: 90,
  creat: 120,
  actualizat: 120,
};

const ResizableTableHead = ({ colKey, style, className = "", children, onResizeStart }) => {
  return (
    <TableHead style={style} className={`relative select-none ${className}`}>
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
      title: "Qty",
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

const SummaryBox = memo(function SummaryBox({ label, value, children, strong = false, tone = null }) {
  const toneClass = tone === "manopera" ? "border-emerald-600/50 bg-emerald-600/10" : strong ? "border-primary" : "border-border";

  const valueClass = tone === "manopera" ? "font-black text-emerald-600" : strong ? "font-black text-primary" : "font-extrabold text-foreground";

  return (
    <div className={`min-w-[7rem] xxxl:min-w-[8rem] rounded-md border p-2 flex flex-col justify-center gap-0.5 ${toneClass}`}>
      <span className="text-sm uppercase tracking-wide font-bold text-muted-foreground">{label}</span>

      {children ? children : <span className={`text-sm whitespace-nowrap ${valueClass}`}>{formatNumber(value)}</span>}
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

const PlainVirtualRow = (props) => {
  const rowItem = getRowItemFromProps(props);
  const domProps = cleanVirtuosoRowProps(props);

  if (!rowItem) {
    return <TableRow {...domProps} />;
  }

  if (rowItem.type === "element") {
    return (
      <TableRow
        {...domProps}
        className={`group cursor-pointer h-8 border-0 hover:bg-transparent `}
        onClick={(e) => {
          e.stopPropagation();
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

const SortableRecipeVirtualRow = ({ reteta, ...props }) => {
  const id = toId(reteta.id);

  const selectedIds = props.context?.selectedIds || [];
  const selected = selectedIds.includes(id);

  const selectedRetete = props.context?.getSelectedRetete?.() || [];
  const contextItems = selected && selectedRetete.length > 1 ? selectedRetete : [reteta];
  const isMultiple = contextItems.length > 1;

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });

  const domProps = cleanVirtuosoRowProps(props);
  const isLastRow = props["data-index"] === props.context?.displayRows?.length - 1;

  return (
    <ContextMenu key={reteta.id}>
      <ContextMenuTrigger asChild>
        <TableRow
          {...domProps}
          ref={setNodeRef}
          {...attributes}
          {...listeners}
          style={{
            ...domProps.style,
            transform: CSS.Transform.toString(transform),
            transition,
            opacity: isDragging ? 0.45 : 1,
            zIndex: isDragging ? 50 : undefined,
            position: isDragging ? "relative" : undefined,
          }}
          className={`cursor-pointer hover:bgb drag-row data-[state=open]:bg-muted h-12 border-b oferta-parent-row dark:hover:bg-black group  ${
            selected ? "!bg-primary/15 hover:!bg-primary/20 dark:!bg-primary/35 dark:hover:!bg-primary/45" : ""
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
          onContextMenuCapture={() => props.context?.handleRowContextMenu(reteta)}
          onClick={(e) => props.context?.handleRowClick(e, reteta)}
        >
          {props.children}
        </TableRow>
      </ContextMenuTrigger>

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

        {!isMultiple && (
          <ContextMenuItem className="gap-3" onClick={() => props.context?.handleEdit(reteta)}>
            <FontAwesomeIcon className="text-low" icon={faPenToSquare} />
            Editează
          </ContextMenuItem>
        )}

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

const OferteReteteList = memo(function OferteReteteList({
  reteteItems = [],
  selectedLucrare,
  displayLang = "RO",
  visibleColumns,
  columnResetKey = 0,
  toggleAllKey = 0,
  onEditReteta,
  onDeleteReteta,
  onReorderRetete,
  onDuplicateRetete,
  onUpdateRetetaQuantity,
  onLoadFurnizoriRetete,
  onApplyFurnizoriRetete,
  onActualizeazaRetete,
}) {
  const containerRef = useRef(null);
  const scrollPosRef = useRef(0);
  const lastClickedIndexRef = useRef(null);
  const wasDraggingRef = useRef(false);
  const skipSaveColumnWidthsRef = useRef(false);

  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [duplicateItems, setDuplicateItems] = useState([]);

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

  const [tvaPercent, setTvaPercent] = useState("0");
  const [extraPercent, setExtraPercent] = useState("0");

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

    window.addEventListener("pointerdown", cancelReorder, true);

    return () => {
      window.removeEventListener("pointerdown", cancelReorder, true);
    };
  }, []);

  const showCol = useCallback(
    (key) => {
      if (!visibleColumns) return true;
      return visibleColumns[key] !== false;
    },
    [visibleColumns],
  );

  const totals = useMemo(() => {
    const resourceTotals = {
      manopera: 0,
      material: 0,
      utilaj: 0,
      transport: 0,
    };

    let totalManoperaHours = 0;

    orderedRetete.forEach((reteta) => {
      const elemente = reteta.elemente || [];
      const cantitateLucrare = Number(reteta.cantitate_lucrare || 0);

      elemente.forEach((el) => {
        if (resourceTotals[el.tip_resursa] === undefined) return;

        resourceTotals[el.tip_resursa] += getElementTotalInLucrare(el, reteta);

        if (el.tip_resursa === "manopera") {
          const cantitateManoperaInReteta = Number(el.cantitate_in_reteta || 0);
          totalManoperaHours += cantitateManoperaInReteta * cantitateLucrare;
        }
      });
    });

    const subtotal = resourceTotals.manopera + resourceTotals.material + resourceTotals.utilaj + resourceTotals.transport;

    const extraValue = subtotal * (getPercentNumber(extraPercent) / 100);
    const totalDupaAdaos = subtotal + extraValue;

    const tvaValue = totalDupaAdaos * (getPercentNumber(tvaPercent) / 100);
    const totalFinal = totalDupaAdaos + tvaValue;

    return {
      ...resourceTotals,
      totalManoperaHours,
      subtotal,
      extraValue,
      totalDupaAdaos,
      tvaValue,
      totalFinal,
    };
  }, [orderedRetete, tvaPercent, extraPercent]);

  const handleTvaPercentChange = useCallback((e) => {
    const next = normalizePercentInput(e.target.value);

    if (next !== null) {
      setTvaPercent(next);
    }
  }, []);

  const handleExtraPercentChange = useCallback((e) => {
    const next = normalizeAdaosPercentInput(e.target.value);

    if (next !== null) {
      setExtraPercent(next);
    }
  }, []);

  const getRetetaIndex = useCallback(
    (reteta) => {
      return orderedRetete.findIndex((item) => Number(item.id) === Number(reteta.id));
    },
    [orderedRetete],
  );

  const getSelectedRetete = useCallback(() => {
    const selectedSet = new Set(selectedIds.map(toId));
    return orderedRetete.filter((item) => selectedSet.has(toId(item.id)));
  }, [orderedRetete, selectedIds]);

  const handleRowContextMenu = useCallback(
    (reteta) => {
      const id = toId(reteta.id);
      const currentIndex = getRetetaIndex(reteta);

      if (selectedIds.includes(id)) return;

      setSelectedIds([id]);

      if (currentIndex !== -1) {
        lastClickedIndexRef.current = currentIndex;
      }
    },
    [getRetetaIndex, selectedIds],
  );

  const handleScroll = (e) => {
    if (e.target) {
      scrollPosRef.current = e.target.scrollTop;
    }
  };

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

  const handleElementRowClick = useCallback((element, parentReteta) => {
    if (!element || !parentReteta) return;

    const config = resurseConfig[element.tip_resursa] || resurseConfig.material;

    setSelectedElement(element);
    setSelectedElementConfig(config);
    setSelectedElementParentReteta(parentReteta);
    setVariantDialogOpen(true);
  }, []);

  const handleRowClick = useCallback(
    (e, reteta) => {
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

        const rangeIds = getRangeIds(orderedRetete, lastClickedIndexRef.current, currentIndex);

        setSelectedIds(rangeIds);
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

      toggleRetetaExpand(reteta);
    },
    [orderedRetete, getRetetaIndex, toggleRetetaExpand],
  );

  const handleDuplicate = useCallback((items) => {
    const nextItems = Array.isArray(items) ? items.filter(Boolean) : [items].filter(Boolean);

    if (nextItems.length === 0) return;

    setDuplicateItems(nextItems);
    setDuplicateOpen(true);
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
    (reteta) => {
      if (onEditReteta) {
        onEditReteta(reteta);
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
      const id = toId(event.active.id);
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
    [orderedRetete],
  );

  const handleDragCancel = useCallback(() => {
    setActiveDragId(null);

    window.setTimeout(() => {
      wasDraggingRef.current = false;
    }, 0);
  }, []);

  const handleDragEnd = useCallback(
    async (event) => {
      const activeId = event.active?.id;
      const overId = event.over?.id;

      setActiveDragId(null);

      window.setTimeout(() => {
        wasDraggingRef.current = false;
      }, 0);

      if (!activeId || !overId || toId(activeId) === toId(overId)) return;

      const next = reorderSelectedBlock({
        items: orderedRetete,
        selectedIds,
        activeId,
        overId,
      });

      const oldOrder = orderedRetete.map((item) => toId(item.id)).join(",");
      const newOrder = next.map((item) => toId(item.id)).join(",");

      if (oldOrder === newOrder) return;

      setOrderedRetete(next);

      try {
        await onReorderRetete?.({
          lucrare_id: selectedLucrare?.id,
          ordered_ids: next.map((item) => item.id),
        });
      } catch (err) {
        setOrderedRetete(orderedRetete);
        toast.error(err?.response?.data?.message || "Eroare la reordonarea rețetelor.");
      }
    },
    [orderedRetete, selectedIds, onReorderRetete, selectedLucrare?.id],
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
    const rows = [];

    orderedRetete.forEach((reteta) => {
      const retetaId = toId(reteta.id);

      rows.push({
        id: `reteta-${retetaId}`,
        type: "reteta",
        reteta,
      });

      if (expandedRetetaIds.has(retetaId)) {
        const elemente = reteta.elemente || [];

        if (elemente.length === 0) {
          rows.push({
            id: `empty-${retetaId}`,
            type: "empty",
            reteta,
          });

          return;
        }

        elemente.forEach((element) => {
          rows.push({
            id: `element-${retetaId}-${element.id}`,
            type: "element",
            reteta,
            element,
          });
        });
      }
    });

    return rows;
  }, [orderedRetete, expandedRetetaIds]);

  const visibleTableColumnCount = useMemo(() => {
    let count = 0;

    if (showCol("elemente")) count += 1;
    if (showCol("poza")) count += 1;

    dynamicColumns.forEach((col) => {
      if (showCol(`col_${col.id}`)) {
        count += 1;
      }
    });

    ["cod", "clasa", "denumire", "descriere", "unitate", "cost", "cantitate", "costTotal", "creat", "actualizat"].forEach((key) => {
      if (showCol(key)) {
        count += 1;
      }
    });

    if (showCol("info")) count += 1;

    return count;
  }, [dynamicColumns, showCol]);

  const context = useMemo(() => {
    return {
      displayRows,
      reteteItems: orderedRetete,
      selectedIds,
      expandedRetetaIds,
      toggleRetetaExpand,
      handleRowClick,
      handleRowContextMenu,
      handleElementRowClick,
      getSelectedRetete,
      handleEdit,
      handleDelete,
      handleDuplicate,
      handleFurnizori,
      handleActualizeaza,
    };
  }, [
    displayRows,
    orderedRetete,
    selectedIds,
    expandedRetetaIds,
    toggleRetetaExpand,
    handleRowClick,
    handleRowContextMenu,
    handleElementRowClick,
    getSelectedRetete,
    handleEdit,
    handleDelete,
    handleDuplicate,
    handleFurnizori,
    handleActualizeaza,
  ]);

  return (
    <div className="rounded-md border bg-card w-full h-full overflow-hidden relative flex flex-col text-sm text-foreground">
      <div ref={containerRef} onScroll={handleScroll} className="flex-1 min-h-0 overflow-auto relative">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragCancel={handleDragCancel} onDragEnd={handleDragEnd}>
          <SortableContext items={orderedRetete.map((item) => toId(item.id))} strategy={verticalListSortingStrategy}>
            <TableVirtuoso
              customScrollParent={containerRef.current}
              overscan={10}
              totalCount={displayRows.length}
              data={displayRows}
              style={{ height: "100%", width: "100%" }}
              components={componentsOferteRetete}
              context={context}
              fixedHeaderContent={() => (
                <TableRow className="h-9 oferta-table-header-row ">
                  {showCol("elemente") && (
                    <ResizableTableHead
                      colKey="elemente"
                      style={getColumnStyle("elemente")}
                      onResizeStart={handleColumnResizeStart}
                      className="relative h-9 p-1 text-center align-middle text-sm font-bold text-foreground"
                    >
                      Tip
                    </ResizableTableHead>
                  )}

                  {showCol("poza") && (
                    <ResizableTableHead
                      colKey="poza"
                      style={getColumnStyle("poza")}
                      onResizeStart={handleColumnResizeStart}
                      className="relative h-9 p-1 text-center align-middle text-sm font-bold text-foreground"
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
                        className="relative h-9 p-1 text-center align-middle text-sm font-bold text-foreground"
                      >
                        <OverflowTooltip text={col.nume} align="center" className="font-bold text-center text-foreground" maxLines={1} textSize="sm" />
                      </ResizableTableHead>
                    ) : null,
                  )}

                  {showCol("cod") && (
                    <ResizableTableHead
                      colKey="cod"
                      style={getColumnStyle("cod")}
                      onResizeStart={handleColumnResizeStart}
                      className="relative h-9 p-1 text-center align-middle text-sm font-bold text-foreground"
                    >
                      Cod
                    </ResizableTableHead>
                  )}

                  {showCol("clasa") && (
                    <ResizableTableHead
                      colKey="clasa"
                      style={getColumnStyle("clasa")}
                      onResizeStart={handleColumnResizeStart}
                      className="relative h-9 p-1 text-center align-middle text-sm font-bold text-foreground"
                    >
                      Clasa
                    </ResizableTableHead>
                  )}

                  {showCol("denumire") && (
                    <ResizableTableHead
                      colKey="denumire"
                      style={getColumnStyle("denumire")}
                      onResizeStart={handleColumnResizeStart}
                      className="relative h-9 p-1 text-left align-middle text-sm font-bold text-foreground"
                    >
                      Denumire
                    </ResizableTableHead>
                  )}

                  {showCol("descriere") && (
                    <ResizableTableHead
                      colKey="descriere"
                      style={getColumnStyle("descriere")}
                      onResizeStart={handleColumnResizeStart}
                      className="relative h-9 p-1 text-left align-middle text-sm font-bold text-foreground"
                    >
                      Descriere
                    </ResizableTableHead>
                  )}

                  {showCol("unitate") && (
                    <ResizableTableHead
                      colKey="unitate"
                      style={getColumnStyle("unitate")}
                      onResizeStart={handleColumnResizeStart}
                      className="relative h-9 p-1 text-center align-middle text-sm font-bold text-foreground"
                    >
                      U.M.
                    </ResizableTableHead>
                  )}

                  {showCol("cost") && (
                    <ResizableTableHead
                      colKey="cost"
                      style={getColumnStyle("cost")}
                      onResizeStart={handleColumnResizeStart}
                      className="relative h-9 p-1 text-center align-middle text-sm font-bold text-foreground"
                    >
                      Cost
                    </ResizableTableHead>
                  )}

                  {showCol("cantitate") && (
                    <ResizableTableHead
                      colKey="cantitate"
                      style={getColumnStyle("cantitate")}
                      onResizeStart={handleColumnResizeStart}
                      className="relative h-9 p-1 text-center align-middle text-sm font-bold text-foreground"
                    >
                      Qty
                    </ResizableTableHead>
                  )}

                  {showCol("costTotal") && (
                    <ResizableTableHead
                      colKey="costTotal"
                      style={getColumnStyle("costTotal")}
                      onResizeStart={handleColumnResizeStart}
                      className="relative h-9 p-1 text-center align-middle text-sm font-bold text-foreground"
                    >
                      Total
                    </ResizableTableHead>
                  )}

                  {showCol("creat") && (
                    <ResizableTableHead
                      colKey="creat"
                      style={getColumnStyle("creat")}
                      onResizeStart={handleColumnResizeStart}
                      className="relative h-9 p-1 text-left align-middle text-sm font-bold text-foreground"
                    >
                      Creat
                    </ResizableTableHead>
                  )}

                  {showCol("actualizat") && (
                    <ResizableTableHead
                      colKey="actualizat"
                      style={getColumnStyle("actualizat")}
                      onResizeStart={handleColumnResizeStart}
                      className="relative h-9 p-1 text-left align-middle text-sm font-bold text-foreground"
                    >
                      Actualizat
                    </ResizableTableHead>
                  )}

                  {showCol("info") && (
                    <ResizableTableHead
                      colKey="info"
                      style={getColumnStyle("info")}
                      onResizeStart={handleColumnResizeStart}
                      className="relative h-9 p-1 text-center align-middle text-sm font-bold text-foreground"
                    >
                      Info
                    </ResizableTableHead>
                  )}
                </TableRow>
              )}
              itemContent={(index) => {
                const rowItem = displayRows[index];

                if (!rowItem) return null;

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
                      dynamicColumns={dynamicColumns}
                      showCol={showCol}
                      getColumnStyle={getColumnStyle}
                    />
                  );
                }

                const reteta = rowItem.reteta;
                const afisareDenumire = displayLang === "FR" ? reteta.denumire_fr || "" : reteta.denumire || "";
                const afisareDescriere = displayLang === "FR" ? reteta.descriere_fr || reteta.descriere || "" : reteta.descriere || reteta.descriere_fr || "";

                const coloaneValori = normalizeColoaneValori(reteta.coloane_valori);

                const costReteta = getRetetaCost(reteta);
                const costTotalLucrare = getRetetaTotalLucrare(reteta);
                const isExpanded = expandedRetetaIds.has(toId(reteta.id));

                return (
                  <>
                    {showCol("elemente") && (
                      <TableCell style={getColumnStyle("elemente")} className="border-r border-border p-1 text-center  text-sky-600 align-middle text-sm">
                        <div className="inline-flex h-full w-full items-center justify-center leading-none">
                          <FontAwesomeIcon icon={isExpanded ? faFolderOpen : faFolder} className="text-base" />
                        </div>
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
                        <TableCell key={col.id} style={getColumnStyle(`dynamic_${col.id}`)} className="border-r border-border p-1 text-center align-middle text-sm">
                          {value ? (
                            <OverflowTooltip align="center" text={String(value)} className="font-normal text-foreground text-center whitespace-nowrap" maxLines={1} textSize="sm" />
                          ) : (
                            <span className="text-sm font-normal text-muted-foreground/40 italic">—</span>
                          )}
                        </TableCell>
                      );
                    })}

                    {showCol("cod") && (
                      <TableCell style={getColumnStyle("cod")} className="border-r border-border p-1 text-center align-middle text-sm">
                        {reteta.cod_reteta ? (
                          <OverflowTooltip align="center" text={String(reteta.cod_reteta)} className="font-semibold text-foreground text-center whitespace-nowrap" maxLines={1} textSize="sm" />
                        ) : (
                          <span className="text-sm text-muted-foreground/40 italic">—</span>
                        )}
                      </TableCell>
                    )}

                    {showCol("clasa") && (
                      <TableCell style={getColumnStyle("clasa")} className="border-r border-border p-1 text-center align-middle text-sm">
                        <OverflowTooltip align="center" text={String(reteta.clasa_reteta)} className="text-foreground font-normal text-center whitespace-nowrap" maxLines={1} textSize="sm" />
                      </TableCell>
                    )}

                    {showCol("denumire") && (
                      <TableCell style={getColumnStyle("denumire")} className="border-r border-border p-1 align-middle text-sm">
                        {afisareDenumire ? (
                          <OverflowTooltip align="left" text={afisareDenumire} className="font-semibold whitespace-nowrap text-foreground leading-none" maxLines={1} textSize="sm" />
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

                    {showCol("unitate") && (
                      <TableCell style={getColumnStyle("unitate")} className="border-r border-border p-1 text-center align-middle text-sm">
                        <span className="text-sm font-semibold text-foreground whitespace-nowrap">{reteta.unitate_masura}</span>
                      </TableCell>
                    )}

                    {showCol("cost") && (
                      <TableCell style={getColumnStyle("cost")} className="border-r border-border p-1 text-center align-middle text-sm">
                        <span className="text-sm font-bold text-foreground whitespace-nowrap">{formatNumber(costReteta)}</span>
                      </TableCell>
                    )}

                    {showCol("cantitate") && (
                      <TableCell
                        data-no-row-open
                        style={getColumnStyle("cantitate")}
                        className="relative border-r border-border p-0 text-center text-sm"
                        onPointerDown={(e) => {
                          e.stopPropagation();
                        }}
                        onMouseDown={(e) => {
                          e.stopPropagation();
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                        }}
                        onContextMenu={(e) => {
                          e.stopPropagation();
                        }}
                      >
                        <OferteQtyFormulaCell value={reteta.cantitate_lucrare} formula={reteta.cantitate_lucrare_formula} onSave={(values) => handleSaveRetetaQuantity(reteta, values)} />
                      </TableCell>
                    )}

                    {showCol("costTotal") && (
                      <TableCell style={getColumnStyle("costTotal")} className="border-r border-border p-1 text-center align-middle text-sm">
                        <span className="text-sm font-black text-primary whitespace-nowrap">{formatNumber(costTotalLucrare)}</span>
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
                Muți {selectedIds.includes(activeDragId) && selectedIds.length > 1 ? `${selectedIds.length} rețete` : "1 rețetă"}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      <div className="shrink-0 border-t p-2">
        <div className="flex flex-wrap relative h-full items-stretch gap-1.5">
          <SummaryBox label="Total ore" value={totals.totalManoperaHours} tone="manopera" />

          <Separator orientation="vertical" className="bg-border mx-1.5" />

          <SummaryBox label="Manoperă" value={totals.manopera} />

          <div className="flex items-center justify-center text-sm font-black text-muted-foreground">+</div>

          <SummaryBox label="Materiale" value={totals.material} />

          <div className="flex items-center justify-center text-sm font-black text-muted-foreground">+</div>

          <SummaryBox label="Utilaje" value={totals.utilaj} />

          <div className="flex items-center justify-center text-sm font-black text-muted-foreground">+</div>

          <SummaryBox label="Transport" value={totals.transport} />

          <div className="flex items-center justify-center text-sm font-black text-muted-foreground">=</div>

          <SummaryBox label="Subtotal" value={totals.subtotal} strong />

          <div className="flex items-center justify-center text-sm font-black text-muted-foreground">+</div>

          <SummaryBox label="Recapitulatii">
            <div className="flex items-center gap-1.5">
              <inputs
                value={extraPercent}
                onChange={handleExtraPercentChange}
                className="h-6 w-12 rounded-md border bg-background p-1 text-center text-sm font-black text-foreground outline-none"
                inputMode="decimal"
                placeholder="0"
              />

              <span className="text-sm font-black text-muted-foreground">%</span>

              <span className="text-sm font-extrabold text-foreground whitespace-nowrap">{formatNumber(totals.extraValue)}</span>
            </div>
          </SummaryBox>

          <div className="flex items-center justify-center text-sm font-black text-muted-foreground">=</div>

          <SummaryBox label="Subtotal" value={totals.totalDupaAdaos} strong />

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

              <span className="text-sm font-extrabold text-foreground whitespace-nowrap">{formatNumber(totals.tvaValue)}</span>
            </div>
          </SummaryBox>

          <div className="flex items-center justify-center text-sm font-black text-muted-foreground">=</div>

          <SummaryBox label="Total final" value={totals.totalFinal} strong />
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

      <OferteDuplicateReteteDialog
        open={duplicateOpen}
        setOpen={setDuplicateOpen}
        retete={duplicateItems}
        selectedLucrare={selectedLucrare}
        dynamicColumns={dynamicColumns}
        displayLang={displayLang}
        onConfirm={onConfirmDuplicate}
      />

      <OferteFurnizoriDialog open={furnizoriOpen} setOpen={setFurnizoriOpen} retete={furnizoriItems} onLoadFurnizori={onLoadFurnizoriRetete} onConfirm={onConfirmFurnizori} />

      <OferteActualizeazaReteteDialog open={actualizeazaOpen} setOpen={setActualizeazaOpen} retete={actualizeazaItems} onConfirm={onConfirmActualizeaza} />
    </div>
  );
});

export default OferteReteteList;
