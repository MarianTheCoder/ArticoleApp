import React, { memo, useCallback, useLayoutEffect, useEffect, useState, useMemo, useRef } from "react";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from "@/components/ui/context-menu";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCopy, faDollarSign, faLayerGroup, faPenToSquare, faScaleBalanced, faScrewdriverWrench, faTrash, faTruck } from "@fortawesome/free-solid-svg-icons";

import { TableVirtuoso } from "react-virtuoso";
import OverflowTooltip from "@/components/ui/OverflowTooltip";
import { toast } from "sonner";
import OferteRetetaSubList from "./OferteRetetaSubList";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipArrow } from "@radix-ui/react-tooltip";

import { DndContext, DragOverlay, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import photoAPI from "@/api/photoAPI";
import ImagePreviewTooltip from "@/components/ui/ImagePreviewTooltip";
import NoImage from "@/assets/no-image-icon.png";
import OferteDuplicateReteteDialog from "./OferteDuplicateReteteDialog";
import OferteElementeTooltop from "./components/OferteElementeTooltop";

import {
  toId,
  normalizeColumns,
  normalizeColoaneValori,
  getColoanaValue,
  formatNumber,
  getRetetaInfoFlags,
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

const COL = {
  limba: "w-[4.5rem] min-w-[4.5rem] max-w-[4.5rem]",
  elemente: "w-[7rem] min-w-[7rem] max-w-[7rem]",
  info: "w-[8rem] min-w-[8rem] max-w-[8rem]",
  cod: "w-[8rem] min-w-[8rem] max-w-[8rem]",
  clasa: "w-[9rem] min-w-[9rem] max-w-[9rem]",
  denumire: "w-[12rem] min-w-[12rem] max-w-[12rem] xxxl:w-[18rem] xxxl:min-w-[18rem] xxxl:max-w-[18rem]",
  descriere: "w-[14rem] min-w-[14rem] max-w-[14rem] xxxl:w-[22rem] xxxl:min-w-[22rem] xxxl:max-w-[22rem]",
  dynamic: "w-[7rem] min-w-[7rem] max-w-[7rem]",
  unitate: "w-[5rem] min-w-[5rem] max-w-[5rem]",
  cost: "w-[7rem] min-w-[7rem] max-w-[7rem]",
  cantitate: "w-[7rem] min-w-[7rem] max-w-[7rem]",
  costTotal: "w-[8rem] min-w-[8rem] max-w-[8rem]",
  creat: "w-[14rem] min-w-[14rem] max-w-[14rem]",
  actualizat: "w-[14rem] min-w-[14rem] max-w-[14rem]",
};

const InfoIcon = ({ icon, label, className }) => {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={`inline-flex h-8 w-8 items-center justify-center rounded-md border text-sm ${className}`}>
          <FontAwesomeIcon icon={icon} />
        </span>
      </TooltipTrigger>

      <TooltipContent className="whitespace-pre-wrap break-words xxxl:max-w-[20rem] font-normal lg:max-w-[15rem] max-w-[10rem] rounded-md text-sm xl:text-base z-[100] bg-popover border-2 border-border text-popover-foreground shadow-md p-2">
        <TooltipArrow width={15} height={10} className="fill-border" />
        {label}
      </TooltipContent>
    </Tooltip>
  );
};

const RetetaInfoIcons = memo(function RetetaInfoIcons({ reteta }) {
  const flags = getRetetaInfoFlags(reteta);

  const hasAny = flags.hasChangedPrice || flags.hasChangedQuantity || flags.hasVariant;

  if (!hasAny) {
    return <span className="text-sm text-muted-foreground/40 italic">—</span>;
  }

  return (
    <div className="flex items-center justify-center gap-1">
      {flags.hasChangedPrice && <InfoIcon icon={faDollarSign} label="Există costuri modificate în elementele rețetei." className="border-emerald-600/50 bg-emerald-600/10 text-emerald-600" />}

      {flags.hasChangedQuantity && <InfoIcon icon={faScaleBalanced} label="Există cantități modificate în elementele rețetei." className="border-amber-600/50 bg-amber-600/10 text-amber-600" />}

      {flags.hasVariant && <InfoIcon icon={faLayerGroup} label="Există variante selectate în elementele rețetei." className="border-sky-600/50 bg-sky-600/10 text-sky-600" />}
    </div>
  );
});

const SummaryBox = memo(function SummaryBox({ label, value, children, strong = false }) {
  return (
    <div className={`min-w-[9rem] rounded-md border bg-card px-3 py-2 flex flex-col justify-center gap-1 ${strong ? "border-primary" : "border-border"}`}>
      <span className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">{label}</span>

      {children ? children : <span className={`text-base whitespace-nowrap ${strong ? "font-black text-primary" : "font-extrabold text-foreground"}`}>{formatNumber(value)}</span>}
    </div>
  );
});

const SortableRetetaRow = (props) => {
  const index = props["data-index"];
  const reteta = props.context?.reteteItems?.[index];

  if (!reteta) return <TableRow {...props} />;

  const id = toId(reteta.id);
  const selectedIds = props.context?.selectedIds || [];
  const selected = selectedIds.includes(id);

  const selectedRetete = props.context?.getSelectedRetete?.() || [];
  const contextItems = selected && selectedRetete.length > 1 ? selectedRetete : [reteta];
  const isMultiple = contextItems.length > 1;

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });

  return (
    <ContextMenu key={reteta.id}>
      <ContextMenuTrigger asChild>
        <TableRow
          {...props}
          ref={setNodeRef}
          {...attributes}
          {...listeners}
          style={{
            ...props.style,
            transform: CSS.Transform.toString(transform),
            transition,
            opacity: isDragging ? 0.45 : 1,
            zIndex: isDragging ? 50 : undefined,
            position: isDragging ? "relative" : undefined,
          }}
          className={`cursor-pointer drag-row data-[state=open]:bg-muted h-16 border-b transition-colors group hover:bg-accent hover-row-border ${selected ? "bg-primary/10 hover:bg-primary/15" : ""}`}
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
            <div className="px-2">
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
          <FontAwesomeIcon className="text-purple-500" icon={faScrewdriverWrench} />
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

const componentsOferteRetete = {
  Table: (props) => <table {...props} className="min-w-full w-full table-fixed caption-bottom text-left border-collapse" />,

  TableHead: React.forwardRef((props, ref) => <TableHeader {...props} ref={ref} className="bg-background sticky top-0 z-20 shadow-sm" />),

  TableBody: React.forwardRef((props, ref) => <TableBody {...props} ref={ref} />),

  TableRow: SortableRetetaRow,
};

const OferteReteteList = memo(function OferteReteteList({
  reteteItems = [],
  selectedLucrare,
  displayLang = "RO",
  visibleColumns,
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

  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [duplicateItems, setDuplicateItems] = useState([]);

  const [actualizeazaOpen, setActualizeazaOpen] = useState(false);
  const [actualizeazaItems, setActualizeazaItems] = useState([]);

  const [furnizoriOpen, setFurnizoriOpen] = useState(false);
  const [furnizoriItems, setFurnizoriItems] = useState([]);

  const [subDialogOpen, setSubDialogOpen] = useState(false);
  const [selectedReteta, setSelectedReteta] = useState(null);

  const [orderedRetete, setOrderedRetete] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [activeDragId, setActiveDragId] = useState(null);

  const [tvaPercent, setTvaPercent] = useState("0");
  const [extraPercent, setExtraPercent] = useState("0");

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

    orderedRetete.forEach((reteta) => {
      const elemente = reteta.elemente || [];

      elemente.forEach((el) => {
        if (resourceTotals[el.tip_resursa] === undefined) return;

        resourceTotals[el.tip_resursa] += getElementTotalInLucrare(el, reteta);
      });
    });

    const subtotal = resourceTotals.manopera + resourceTotals.material + resourceTotals.utilaj + resourceTotals.transport;

    const tvaValue = subtotal * (getPercentNumber(tvaPercent) / 100);
    const totalDupaTva = subtotal + tvaValue;

    const extraValue = totalDupaTva * (getPercentNumber(extraPercent) / 100);
    const totalFinal = totalDupaTva + extraValue;

    return {
      ...resourceTotals,
      subtotal,
      tvaValue,
      totalDupaTva,
      extraValue,
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
    const next = normalizePercentInput(e.target.value);

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

      setSelectedReteta(reteta);
      setSubDialogOpen(true);
    },
    [orderedRetete, getRetetaIndex],
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
    if (!selectedReteta?.id) return;

    const fresh = orderedRetete.find((r) => Number(r.id) === Number(selectedReteta.id));

    if (fresh) {
      setSelectedReteta(fresh);
    }
  }, [orderedRetete, selectedReteta?.id]);

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

  const context = useMemo(() => {
    return {
      reteteItems: orderedRetete,
      selectedIds,
      handleRowClick,
      handleRowContextMenu,
      getSelectedRetete,
      handleEdit,
      handleDelete,
      handleDuplicate,
      handleFurnizori,
      handleActualizeaza,
    };
  }, [orderedRetete, selectedIds, handleRowClick, handleRowContextMenu, getSelectedRetete, handleEdit, handleDelete, handleDuplicate, handleFurnizori, handleActualizeaza]);

  return (
    <div className="rounded-md border bg-card w-full h-full overflow-hidden relative flex flex-col">
      <div ref={containerRef} onScroll={handleScroll} className="flex-1 min-h-0 overflow-auto relative">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragCancel={handleDragCancel} onDragEnd={handleDragEnd}>
          <SortableContext items={orderedRetete.map((item) => toId(item.id))} strategy={verticalListSortingStrategy}>
            <TableVirtuoso
              customScrollParent={containerRef.current}
              overscan={10}
              totalCount={orderedRetete.length}
              data={orderedRetete}
              style={{ height: "100%", width: "100%" }}
              components={componentsOferteRetete}
              context={context}
              fixedHeaderContent={() => (
                <TableRow className="h-10 hover:bg-muted-foreground/25 bg-muted-foreground/25 border-b">
                  {showCol("limba") && <TableHead className={`text-center px-2 ${COL.limba}`}>Limba</TableHead>}
                  {showCol("info") && <TableHead className={`text-center px-2 ${COL.info}`}>Info</TableHead>}
                  {showCol("elemente") && <TableHead className={`text-center px-2 ${COL.elemente}`}>Elemente</TableHead>}
                  {dynamicColumns.map((col) =>
                    showCol(`col_${col.id}`) ? (
                      <TableHead key={col.id} className={`text-center px-2 ${COL.dynamic}`}>
                        <OverflowTooltip text={col.nume} align="center" className="text-sm font-bold text-center" maxLines={1} />
                      </TableHead>
                    ) : null,
                  )}
                  {showCol("cod") && <TableHead className={`text-center px-2 ${COL.cod}`}>Cod</TableHead>}
                  {showCol("clasa") && <TableHead className={`text-center px-2 ${COL.clasa}`}>Clasa</TableHead>}
                  {showCol("denumire") && <TableHead className={`px-3 ${COL.denumire}`}>Denumire</TableHead>}
                  {showCol("descriere") && <TableHead className={`px-3 ${COL.descriere}`}>Descriere</TableHead>}
                  {showCol("unitate") && <TableHead className={`text-center px-2 ${COL.unitate}`}>U.M.</TableHead>}
                  {showCol("cost") && <TableHead className={`text-center px-2 ${COL.cost}`}>Cost</TableHead>}
                  {showCol("cantitate") && <TableHead className={`text-center px-2 ${COL.cantitate}`}>Qty</TableHead>}
                  {showCol("costTotal") && <TableHead className={`text-center px-2 ${COL.costTotal}`}>Total</TableHead>}
                  {showCol("creat") && <TableHead className={`text-left px-4 ${COL.creat}`}>Creat</TableHead>}
                  {showCol("actualizat") && <TableHead className={`text-left px-4 ${COL.actualizat}`}>Actualizat</TableHead>}
                </TableRow>
              )}
              itemContent={(index, reteta) => {
                const afisareDenumire = displayLang === "FR" ? reteta.denumire_fr || reteta.denumire || "" : reteta.denumire || "";
                const afisareDescriere = displayLang === "FR" ? reteta.descriere_fr || reteta.descriere || "" : reteta.descriere || "";

                const coloaneValori = normalizeColoaneValori(reteta.coloane_valori);

                const costReteta = getRetetaCost(reteta);
                const costTotalLucrare = getRetetaTotalLucrare(reteta);

                return (
                  <>
                    {showCol("limba") && (
                      <TableCell className={`text-center px-2 py-1 ${COL.limba}`}>
                        <div className="flex justify-center">
                          <div className={`rounded-md border flex items-center justify-center ${reteta.limba !== "FR" ? "bg-cyan-500/5 border-cyan-500" : "bg-lime-500/5 border-lime-500"}`}>
                            <span className={`text-xs w-9 py-1 font-bold ${reteta.limba !== "FR" ? "text-cyan-600" : "text-lime-600"}`}>{reteta.limba || "RO"}</span>
                          </div>
                        </div>
                      </TableCell>
                    )}

                    {showCol("info") && (
                      <TableCell className={`text-center px-2 py-1 ${COL.info}`}>
                        <RetetaInfoIcons reteta={reteta} />
                      </TableCell>
                    )}

                    {showCol("elemente") && (
                      <TableCell className={`text-center px-2 py-1 ${COL.elemente}`}>
                        <OferteElementeTooltop reteta={reteta} />
                      </TableCell>
                    )}

                    {dynamicColumns.map((col) => {
                      if (!showCol(`col_${col.id}`)) return null;

                      const value = getColoanaValue(coloaneValori, col);

                      return (
                        <TableCell key={col.id} className={`text-center px-2 py-1 ${COL.dynamic}`}>
                          {value ? (
                            <OverflowTooltip align="center" text={String(value)} className="text-sm font-semibold text-foreground text-center" maxLines={1} />
                          ) : (
                            <span className="text-sm text-muted-foreground/40 italic">—</span>
                          )}
                        </TableCell>
                      );
                    })}

                    {showCol("cod") && (
                      <TableCell className={`text-center px-2 py-1 ${COL.cod}`}>
                        <span className="text-sm font-bold text-foreground whitespace-nowrap">{reteta.cod_reteta}</span>
                      </TableCell>
                    )}

                    {showCol("clasa") && (
                      <TableCell className={`text-center px-2 py-1 ${COL.clasa}`}>
                        <Badge variant="secondary" className="text-xs bg-card border-border font-medium max-w-full truncate">
                          {reteta.clasa_reteta}
                        </Badge>
                      </TableCell>
                    )}

                    {showCol("denumire") && (
                      <TableCell className={`px-3 py-1 ${COL.denumire}`}>
                        {afisareDenumire ? (
                          <OverflowTooltip align="left" text={afisareDenumire} className="text-sm whitespace-pre-wrap text-foreground leading-snug" maxLines={2} />
                        ) : (
                          <span className="text-sm text-muted-foreground/40 italic">—</span>
                        )}
                      </TableCell>
                    )}

                    {showCol("descriere") && (
                      <TableCell className={`px-3 py-1 ${COL.descriere}`}>
                        {afisareDescriere ? (
                          <OverflowTooltip align="left" text={afisareDescriere} className="text-sm whitespace-pre-wrap text-foreground leading-snug" maxLines={2} />
                        ) : (
                          <span className="text-sm text-muted-foreground/40 italic">—</span>
                        )}
                      </TableCell>
                    )}

                    {showCol("unitate") && (
                      <TableCell className={`text-center px-2 py-1 ${COL.unitate}`}>
                        <Badge variant="outline" className="text-sm px-2 py-1 shadow-none whitespace-nowrap">
                          {reteta.unitate_masura}
                        </Badge>
                      </TableCell>
                    )}

                    {showCol("cost") && (
                      <TableCell className={`text-center px-2 py-1 ${COL.cost}`}>
                        <span className="text-sm font-bold text-foreground whitespace-nowrap">{formatNumber(costReteta)}</span>
                      </TableCell>
                    )}

                    {showCol("cantitate") && (
                      <TableCell
                        data-no-row-open
                        className={`text-center px-2 py-1 ${COL.cantitate}`}
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
                      <TableCell className={`text-center px-2 py-1 ${COL.costTotal}`}>
                        <span className="text-sm font-black text-primary whitespace-nowrap">{formatNumber(costTotalLucrare)}</span>
                      </TableCell>
                    )}

                    {showCol("creat") && (
                      <TableCell className={`text-left px-4 py-1 ${COL.creat}`}>
                        <div className="flex items-center gap-2.5">
                          <ImagePreviewTooltip
                            src={reteta.created_by_photo_url ? `${photoAPI}/${reteta.created_by_photo_url}` : null}
                            alt={reteta.created_by_name}
                            ringColor="ring-primary"
                            fallback={<img src={NoImage} alt="No Image" className="h-full w-full object-cover opacity-50" />}
                            containerClassName="h-10 w-10 rounded-md border border-border bg-muted flex items-center justify-center overflow-hidden shrink-0"
                          />

                          <div className="flex flex-col justify-center min-w-0 leading-tight">
                            <span className="text-sm font-bold text-foreground truncate block">{reteta.created_by_name || "Sistem"}</span>
                            <span className="text-[11px] text-muted-foreground mt-0.5">
                              {new Date(reteta.created_at).toLocaleDateString("ro-RO")} {new Date(reteta.created_at).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                    )}

                    {showCol("actualizat") && (
                      <TableCell className={`text-left px-4 py-1 ${COL.actualizat}`}>
                        <div className="flex items-center gap-2.5">
                          <ImagePreviewTooltip
                            src={reteta.updated_by_photo_url ? `${photoAPI}/${reteta.updated_by_photo_url}` : null}
                            alt={reteta.updated_by_name}
                            ringColor="ring-primary"
                            fallback={<img src={NoImage} alt="No Image" className="h-full w-full object-cover opacity-50" />}
                            containerClassName="h-10 w-10 rounded-md border border-border bg-muted flex items-center justify-center overflow-hidden shrink-0"
                          />

                          <div className="flex flex-col justify-center min-w-0 leading-tight">
                            <span className="text-sm font-bold text-foreground truncate block">{reteta.updated_by_name || "Sistem"}</span>
                            <span className="text-[11px] text-muted-foreground mt-0.5">
                              {new Date(reteta.updated_at).toLocaleDateString("ro-RO")} {new Date(reteta.updated_at).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
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
              <div className="rounded-md border bg-card px-4 py-3 shadow-xl text-sm font-bold text-foreground">
                Muți {selectedIds.includes(activeDragId) && selectedIds.length > 1 ? `${selectedIds.length} rețete` : "1 rețetă"}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      <div className="shrink-0 border-t px-3 py-3">
        <div className="flex flex-wrap items-stretch gap-2">
          <SummaryBox label="Manoperă" value={totals.manopera} />

          <div className="flex items-center text-xl font-black text-muted-foreground px-1">+</div>

          <SummaryBox label="Materiale" value={totals.material} />

          <div className="flex items-center text-xl font-black text-muted-foreground px-1">+</div>

          <SummaryBox label="Utilaje" value={totals.utilaj} />

          <div className="flex items-center text-xl font-black text-muted-foreground px-1">+</div>

          <SummaryBox label="Transport" value={totals.transport} />

          <div className="flex items-center text-xl font-black text-muted-foreground px-1">=</div>

          <SummaryBox label="Subtotal" value={totals.subtotal} strong />

          <div className="flex items-center text-xl font-black text-muted-foreground px-1">+</div>

          <SummaryBox label="TVA">
            <div className="flex items-center gap-2">
              <input
                value={tvaPercent}
                onChange={handleTvaPercentChange}
                className="h-8 w-16 rounded-md border bg-background px-2 text-center text-sm font-black text-foreground outline-none"
                inputMode="decimal"
                placeholder="0"
              />

              <span className="text-sm font-black text-muted-foreground">%</span>

              <span className="text-base font-extrabold text-foreground whitespace-nowrap">{formatNumber(totals.tvaValue)}</span>
            </div>
          </SummaryBox>

          <div className="flex items-center text-xl font-black text-muted-foreground px-1">+</div>

          <SummaryBox label="Adaos">
            <div className="flex items-center gap-2">
              <input
                value={extraPercent}
                onChange={handleExtraPercentChange}
                className="h-8 w-16 rounded-md border bg-background px-2 text-center text-sm font-black text-foreground outline-none"
                inputMode="decimal"
                placeholder="0"
              />

              <span className="text-sm font-black text-muted-foreground">%</span>

              <span className="text-base font-extrabold text-foreground whitespace-nowrap">{formatNumber(totals.extraValue)}</span>
            </div>
          </SummaryBox>

          <div className="flex items-center text-xl font-black text-muted-foreground px-1">=</div>

          <SummaryBox label="Total final" value={totals.totalFinal} strong />
        </div>
      </div>

      <OferteRetetaSubList open={subDialogOpen} setOpen={setSubDialogOpen} parentItem={selectedReteta} selectedLucrare={selectedLucrare} />

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
