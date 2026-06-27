import React, { useCallback, useLayoutEffect, useMemo, useRef, useState, useEffect, memo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger, ContextMenuSeparator } from "@/components/ui/context-menu";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPenToSquare, faTrash, faCopy, faQuestion, faArrowRight, faSort, faSortDown, faSortUp, faFolderOpen, faBan, faCheck } from "@fortawesome/free-solid-svg-icons";
import { Tooltip, TooltipArrow, TooltipContent, TooltipTrigger } from "@radix-ui/react-tooltip";
import { TableVirtuoso } from "react-virtuoso";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import OverflowTooltip from "@/components/ui/OverflowTooltip";
import photoAPI from "@/api/photoAPI";
import CatalogSubList from "./CatalogSubList"; // <-- Componenta globală pentru variante
import NoImage from "@/assets/no-image-icon.png";
import ImagePreviewTooltip from "@/components/ui/ImagePreviewTooltip";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import CatalogHeaderFiltersRow from "./CatalogHeaderFiltersRow";

const COLUMN_WIDTHS_STORAGE_KEY = "catalog_column_widths";

const DEFAULT_COLUMN_WIDTHS = {
  poza: 64,
  limba: 64,
  variante: 64,
  cod: 110,
  clasa1: 130,
  clasa2: 130,
  denumire: 620,
  descriere: 320,
  furnizor: 118,
  marca: 112,
  status: 120,
  greutate: 110,
  unitate: 110,
  cost: 130,
  creat: 180,
  actualizat: 180,
};

const MIN_COLUMN_WIDTHS = {
  poza: 56,
  limba: 56,
  variante: 56,
  cod: 90,
  clasa1: 100,
  clasa2: 100,
  denumire: 260,
  descriere: 220,
  furnizor: 88,
  marca: 88,
  status: 90,
  greutate: 90,
  unitate: 80,
  cost: 100,
  creat: 150,
  actualizat: 150,
};

const SORT_FIELD_BY_COLUMN = {
  cod: "cod_definitie",
  denumire: "denumire",
  greutate: "greutate",
  cost: "cost",
  creat: "created_at",
  actualizat: "updated_at",
};

const normalizeDecimalPlaces = (value) => ([1, 2].includes(Number(value)) ? Number(value) : 2);

const getTextAlignClasses = (textAlign) => {
  if (textAlign === "left") return { cell: "text-left", flex: "justify-start", tooltip: "left" };
  if (textAlign === "right") return { cell: "text-right", flex: "justify-end", tooltip: "right" };
  return { cell: "text-center", flex: "justify-center", tooltip: "center" };
};

const ResizableTableHead = ({ colKey, style, className = "", children, onResizeStart }) => {
  return (
    <TableHead style={style} className={`relative px-0 select-none ${className}`}>
      {children}
      <span
        onPointerDown={(event) => onResizeStart(event, colKey)}
        className="absolute right-0 top-0 z-40 flex h-[4rem] w-3 cursor-col-resize touch-none select-none items-center justify-center hover:bg-primary/20 xxxl:h-[4.5rem]"
      >
        <span className="h-14 w-[2px] rounded-full bg-foreground xxxl:h-16" />
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

const tableCellClass = "px-2 py-1 text-xs xxxl:text-sm";
const tableCellCenterClass = `${tableCellClass} text-center`;
const tableCellLeftClass = `${tableCellClass} text-left`;

const getCatalogCodeTooltipParts = (item, displayLang = "RO") => {
  const meta = item?.cod_definitie_meta || {};
  const classParts = meta.levels
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
  const specificParts = ([meta.specificSegments.join(" ")] || [meta.specific_segments.join(" ")] || []).filter(Boolean).map((segment, index) => ({ key: `specific-${index}`, label: segment }));

  return [...classParts, ...specificParts].length > 0 ? [...classParts, ...specificParts] : [{ key: "fallback", label: item?.cod_definitie || "Cod nedefinit" }];
};

const CatalogCodeValue = ({ item, displayLang, flexClass = "justify-center" }) => {
  const parts = getCatalogCodeTooltipParts(item, displayLang);

  return (
    <div className="grid min-w-0 w-full grid-cols-[minmax(0,1fr)_1.25rem] items-center gap-1.5">
      <span className={`flex min-w-0 overflow-hidden ${flexClass}`}>
        <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-xs xxxl:text-sm font-bold text-foreground">{String(item.cod_definitie)}</span>
      </span>

      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
            className="inline-flex h-5 w-5 shrink-0 cursor-help items-center justify-center rounded-full border border-border bg-card text-[10px] font-black text-foreground hover:border-foreground"
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
          className="z-[100] max-w-[70rem] w-auto rounded-md border-2 border-border bg-popover p-2 text-xs xxxl:text-sm text-popover-foreground shadow-md"
        >
          <div className="flex max-w-[68rem] flex-wrap items-center gap-1">
            {parts.map((part, index) => (
              <React.Fragment key={`${part.key}-${index}`}>
                <span
                  className={`inline-flex min-w-0 max-w-[22rem] rounded-md border p-1 text-xs xxxl:text-sm font-semibold ${
                    part.isUndefined ? "border-destructive/50 bg-destructive/10 text-destructive" : ""
                  }`}
                >
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

// --- VIRTUALIZATION COMPONENTS ---
const componentsCatalog = {
  Table: (props) => <table {...props} className="min-w-full table-fixed caption-bottom text-left border-collapse" />,
  TableHead: React.forwardRef((props, ref) => <TableHeader {...props} ref={ref} className="bg-background sticky top-0 z-20 shadow-sm" />),
  TableBody: React.forwardRef((props, ref) => <TableBody {...props} ref={ref} />),
  TableRow: (props) => {
    const index = props["data-index"];
    const parent = props.context?.catalogItems?.[index];

    if (!parent) return <TableRow {...props} />;

    const selectedIds = (props.context?.selectedItemIds || []).map((id) => String(id));
    const isSelected = selectedIds.includes(String(parent.id)) || String(props.context?.selectedItemId || "") === String(parent.id);

    const rowNode = (
      <TableRow
        {...props}
        className={`cursor-pointer data-[state=open]:bg-muted border-b transition-colors group hover:bg-accent  ${isSelected ? "bg-primary/10 hover:bg-primary/15" : " hover-row-border"}`}
        onMouseDownCapture={(e) => {
          if (!props.context?.isSelectionMode || !e.shiftKey) return;
          e.preventDefault();
          window.getSelection?.()?.removeAllRanges?.();
        }}
        onClick={(e) => props.context?.handleRowClick(e, parent)}
        onContextMenuCapture={(e) => {
          if (!props.context?.isSelectionMode || props.context?.viewMode !== "variante" || isSelected) return;
          props.context?.handleContextSelectElement?.(e, parent);
        }}
      >
        {props.children}
      </TableRow>
    );

    // În view-ul "variante" nu folosim meniul de definiție, ci acțiuni specifice selecției/deschiderii variantei.
    if (props.context?.viewMode === "variante") {
      return (
        <ContextMenu key={parent.id}>
          <ContextMenuTrigger asChild>{rowNode}</ContextMenuTrigger>
          <ContextMenuContent className="w-52">
            {props.context?.isSelectionMode && (
              <>
                {props.context?.selectedItemIds?.length > 1 && (
                  <>
                    <div className="px-2 py-1.5">
                      <p className="text-sm font-semibold text-foreground">{props.context.selectedItemIds.length} selectate</p>
                    </div>
                    <ContextMenuSeparator />
                  </>
                )}
                {props.context?.selectedItemIds?.length <= 1 && (
                  <ContextMenuItem className="gap-3" onClick={() => props.context?.handleOpenSubs(parent)}>
                    <FontAwesomeIcon icon={faFolderOpen} className="text-primary" />
                    Deschide variante
                  </ContextMenuItem>
                )}
                <ContextMenuItem className="gap-3" disabled={!props.context?.selectedItemIds?.length} onClick={props.context?.onConfirmSelection}>
                  <FontAwesomeIcon icon={faCheck} className="text-primary" />
                  Adaugă selectate
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem className="gap-3" onClick={props.context?.onClearSelection}>
                  <FontAwesomeIcon icon={faBan} className="text-destructive" />
                  Anulează selecția
                </ContextMenuItem>
              </>
            )}
            {!props.context?.isSelectionMode && (
              <ContextMenuItem className="gap-3" onClick={() => props.context?.handleOpenSubs(parent)}>
                <FontAwesomeIcon icon={faFolderOpen} className="text-primary" />
                Deschide variante
              </ContextMenuItem>
            )}
          </ContextMenuContent>
        </ContextMenu>
      );
    }

    return (
      <ContextMenu key={parent.id}>
        <ContextMenuTrigger asChild>{rowNode}</ContextMenuTrigger>
        <ContextMenuContent className="w-48">
          {props.context?.isSelectionMode && (
            <>
              <ContextMenuItem className="gap-3" disabled={!props.context?.selectedItemIds?.length} onClick={props.context?.onConfirmSelection}>
                <FontAwesomeIcon icon={faCheck} className="text-primary" /> Adaugă selectate
              </ContextMenuItem>
              <ContextMenuItem className="gap-3" disabled={!props.context?.selectedItemIds?.length} onClick={props.context?.onClearSelection}>
                <FontAwesomeIcon icon={faBan} className="text-destructive" /> Anulează selecția
              </ContextMenuItem>
              <ContextMenuSeparator />
            </>
          )}
          <ContextMenuItem className="gap-3" onClick={() => props.context?.handleClickEdit(parent)}>
            <FontAwesomeIcon className="text-low" icon={faPenToSquare} /> Editează
          </ContextMenuItem>
          <ContextMenuItem className="gap-3" onClick={() => props.context?.handleDuplicateClick(parent)}>
            <FontAwesomeIcon icon={faCopy} className="text-medium" /> Dublează
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem className="gap-3 text-destructive focus:text-destructive hover:text-destructive" onClick={() => props.context?.handleDeleteClick(parent)}>
            <FontAwesomeIcon icon={faTrash} /> Șterge
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    );
  },
};

const CatalogList = memo(
  ({
    selectedItemId,
    selectedItemIds = [],
    config,
    catalogItems = [],
    visibleColumns,
    setDraft,
    setOpen,
    handleDeleteClick,
    displayLang = "RO",
    handleDuplicateClick,
    isSelectionMode = false,
    onSelectElement,
    sortBy = "updated_at",
    sortOrder = "desc",
    decimalPlaces = 2,
    textAlign = "center",
    columnResetKey = 0,
    onSortChange,
    onClearSelection,
    onConfirmSelection,
    advancedFilters,
    setAdvancedFilters,
    lockedLang = null,
    viewMode = "definitii",
    emptyMessage = "Nu există rezultate.",
  }) => {
    const containerRef = useRef(null);
    const scrollPosRef = useRef(0);
    const selectedParentIdRef = useRef(null);

    const [subDialogOpen, setSubDialogOpen] = useState(false);
    const [selectedParent, setSelectedParent] = useState(null);
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
      if (!selectedParentIdRef.current || !subDialogOpen) return;
      // Căutăm definiția "fresh" din lista nouă; în view-ul variante rândurile au __parent (definiția reală).
      const fresh = catalogItems.find((p) => (p.__parent?.id ?? p.id) === selectedParentIdRef.current);
      if (fresh) {
        setSelectedParent(fresh.__parent || fresh);
      }
    }, [catalogItems]);

    const handleScroll = (e) => {
      if (e.target) {
        scrollPosRef.current = e.target.scrollTop;
      }
    };

    useLayoutEffect(() => {
      if (containerRef.current) {
        containerRef.current.scrollTop = scrollPosRef.current;
      }
    }, [catalogItems]);

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

    const showCol = (colKey) => (visibleColumns ? visibleColumns[colKey] : true);
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
        if (!sortField || !onSortChange) return;

        if (sortBy === sortField) {
          if (sortOrder === "asc") {
            onSortChange(sortField, "desc");
            return;
          }

          onSortChange("updated_at", "desc");
          return;
        }

        onSortChange(sortField, "asc");
      },
      [onSortChange, sortBy, sortOrder],
    );

    const renderSortHeaderContent = useCallback(
      (columnKey, label, align = "center") => {
        const sortField = SORT_FIELD_BY_COLUMN[columnKey];
        const active = sortField && sortBy === sortField;
        const icon = !active ? faSort : sortOrder === "asc" ? faSortDown : faSortUp;
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
      [handleSortColumn, sortBy, sortOrder],
    );

    const renderPlainHeader = useCallback((label, align = "center") => {
      const justifyClass = align === "left" ? "justify-start text-left" : align === "right" ? "justify-end text-right" : "justify-center text-center";
      return <div className={`flex h-full w-full items-center px-1.5 xxxl:px-2 text-xs xxxl:text-sm font-bold text-foreground ${justifyClass}`}>{label}</div>;
    }, []);

    const handleOpenSubs = useCallback((parent) => {
      // În view-ul variante deschidem definiția-părinte reală (__parent), ca să apară toate variantele în CatalogSubList.
      const realParent = parent?.__parent || parent;
      selectedParentIdRef.current = realParent.id;
      setSelectedParent(realParent);
      setSubDialogOpen(true);
    }, []);

    const handleRowClick = useCallback(
      (e, parent) => {
        if (e.target.closest("a, button, input")) return;

        // Dacă suntem în modul selecție, click-ul simplu pe rând SELECTEAZĂ.
        if (isSelectionMode && onSelectElement) {
          onSelectElement(parent, e, catalogItems);
        } else {
          // În modul normal de catalog, deschide sublista.
          handleOpenSubs(parent);
        }
      },
      [catalogItems, handleOpenSubs, isSelectionMode, onSelectElement],
    );

    const handleContextSelectElement = useCallback(
      (_event, parent) => {
        if (!isSelectionMode || !onSelectElement) return;
        onSelectElement(parent, { preventDefault: () => {}, ctrlKey: false, metaKey: false, shiftKey: false }, catalogItems);
      },
      [catalogItems, isSelectionMode, onSelectElement],
    );

    const handleClickEdit = useCallback(
      (parent) => {
        setDraft(parent);
        setOpen(true);
      },
      [setDraft, setOpen],
    );

    const context = useMemo(() => {
      return {
        handleRowClick,
        handleOpenSubs,
        handleContextSelectElement,
        handleClickEdit,
        handleDeleteClick,
        handleDuplicateClick,
        catalogItems,
        selectedItemId,
        selectedItemIds,
        isSelectionMode,
        viewMode,
        onClearSelection,
        onConfirmSelection,
      };
    }, [handleRowClick, handleOpenSubs, handleContextSelectElement, handleClickEdit, handleDeleteClick, handleDuplicateClick, catalogItems, selectedItemId, selectedItemIds, isSelectionMode, viewMode, onClearSelection, onConfirmSelection]);

    return (
      <>
        <div
          ref={containerRef}
          data-catalog-selection-table={isSelectionMode ? "true" : undefined}
          onScroll={handleScroll}
          className={`rounded-md ${isSelectionMode ? "select-none" : ""} border bg-card w-full h-full overflow-auto relative`}
        >
          <TableVirtuoso
            customScrollParent={containerRef.current}
            overscan={5}
            totalCount={catalogItems.length}
            data={catalogItems}
            style={{ height: "100%", width: "100%" }}
            fixedHeaderContent={() => (
              <>
                <TableRow className="h-8 xxxl:h-9 hover:bg-muted-foreground/25 bg-muted-foreground/25 border-b">
                  {/* Afișăm Header-ul de Poză doar dacă resursa o suportă (din config) ȘI e selectată în visibleColumns */}
                  {config.hasPhoto && showCol("poza") && (
                    <ResizableTableHead colKey="poza" style={getColumnStyle("poza")} onResizeStart={handleColumnResizeStart} className="text-center">
                      {renderPlainHeader("Poză")}
                    </ResizableTableHead>
                  )}
                  {showCol("limba") && (
                    <ResizableTableHead colKey="limba" style={getColumnStyle("limba")} onResizeStart={handleColumnResizeStart} className="text-center">
                      {renderPlainHeader("Limba")}
                    </ResizableTableHead>
                  )}
                  {showCol("variante") && (
                    <ResizableTableHead colKey="variante" style={getColumnStyle("variante")} onResizeStart={handleColumnResizeStart} className="text-center">
                      {renderPlainHeader("Variante")}
                    </ResizableTableHead>
                  )}
                  {showCol("cod") && (
                    <ResizableTableHead colKey="cod" style={getColumnStyle("cod")} onResizeStart={handleColumnResizeStart}>
                      {renderSortHeaderContent("cod", "Cod", textAlign)}
                    </ResizableTableHead>
                  )}
                  {showCol("clasa1") && (
                    <ResizableTableHead colKey="clasa1" style={getColumnStyle("clasa1")} onResizeStart={handleColumnResizeStart}>
                      {renderPlainHeader("Clasă", textAlign)}
                    </ResizableTableHead>
                  )}
                  {showCol("clasa2") && (
                    <ResizableTableHead colKey="clasa2" style={getColumnStyle("clasa2")} onResizeStart={handleColumnResizeStart}>
                      {renderPlainHeader("Subclasă", textAlign)}
                    </ResizableTableHead>
                  )}
                  {showCol("denumire") && (
                    <ResizableTableHead colKey="denumire" style={getColumnStyle("denumire")} onResizeStart={handleColumnResizeStart}>
                      {renderSortHeaderContent("denumire", "Denumire", textAlign)}
                    </ResizableTableHead>
                  )}
                  {showCol("descriere") && (
                    <ResizableTableHead colKey="descriere" style={getColumnStyle("descriere")} onResizeStart={handleColumnResizeStart}>
                      {renderPlainHeader("Descriere", textAlign)}
                    </ResizableTableHead>
                  )}

                  {config.hasFurnizor && showCol("furnizor") && (
                    <ResizableTableHead colKey="furnizor" style={getColumnStyle("furnizor")} onResizeStart={handleColumnResizeStart}>
                      {renderPlainHeader("Furnizor", textAlign)}
                    </ResizableTableHead>
                  )}
                  {(config.id === "material" || config.id === "utilaj") && showCol("marca") && (
                    <ResizableTableHead colKey="marca" style={getColumnStyle("marca")} onResizeStart={handleColumnResizeStart}>
                      {renderPlainHeader("Marcă", textAlign)}
                    </ResizableTableHead>
                  )}
                  {config.hasStatus && showCol("status") && (
                    <ResizableTableHead colKey="status" style={getColumnStyle("status")} onResizeStart={handleColumnResizeStart} className="text-center">
                      {renderPlainHeader("Status", "center")}
                    </ResizableTableHead>
                  )}

                  {showCol("unitate") && (
                    <ResizableTableHead colKey="unitate" style={getColumnStyle("unitate")} onResizeStart={handleColumnResizeStart} className="text-center">
                      {renderPlainHeader("Unitate")}
                    </ResizableTableHead>
                  )}
                  {showCol("greutate") && (
                    <ResizableTableHead colKey="greutate" style={getColumnStyle("greutate")} onResizeStart={handleColumnResizeStart} className="text-center">
                      {renderSortHeaderContent("greutate", "Greutate (kg)")}
                    </ResizableTableHead>
                  )}
                  {showCol("cost") && (
                    <ResizableTableHead colKey="cost" style={getColumnStyle("cost")} onResizeStart={handleColumnResizeStart} className="text-center">
                      {renderSortHeaderContent("cost", "Cost")}
                    </ResizableTableHead>
                  )}
                  {showCol("creat") && (
                    <ResizableTableHead colKey="creat" style={getColumnStyle("creat")} onResizeStart={handleColumnResizeStart}>
                      {renderSortHeaderContent("creat", "Creat", "left")}
                    </ResizableTableHead>
                  )}
                  {showCol("actualizat") && (
                    <ResizableTableHead colKey="actualizat" style={getColumnStyle("actualizat")} onResizeStart={handleColumnResizeStart}>
                      {renderSortHeaderContent("actualizat", "Actualizat", "left")}
                    </ResizableTableHead>
                  )}
                </TableRow>

                {advancedFilters && setAdvancedFilters && (
                  <CatalogHeaderFiltersRow
                    config={config}
                    visibleColumns={visibleColumns}
                    getColumnStyle={getColumnStyle}
                    advancedFilters={advancedFilters}
                    setAdvancedFilters={setAdvancedFilters}
                    lockedLang={lockedLang}
                    displayLang={displayLang}
                    textAlign={textAlign}
                  />
                )}
              </>
            )}
            components={componentsCatalog}
            context={context}
            itemContent={(index, parent) => {
              const afisareDenumire = displayLang === "FR" ? parent.denumire_fr || "" : parent.denumire;
              const afisareDescriere = displayLang === "FR" ? parent.descriere_fr || "" : parent.descriere;

              return (
                <>
                  {/* COLOANA POZĂ NOUĂ */}
                  {config.hasPhoto && showCol("poza") && (
                    <TableCell onContextMenu={(e) => e.stopPropagation()} style={getColumnStyle("poza")} className={tableCellCenterClass}>
                      <div className="flex w-full justify-center">
                        <ImagePreviewTooltip
                          src={parent.photo_url ? `${photoAPI}/${parent.photo_url}` : null}
                          alt={parent.cod_definitie}
                          ringColor={`hover:ring-${config.normalColor}`} // Folosim culoarea inelului din config (ex: hover:ring-amber-600)
                          fallback={<img src={NoImage} alt="No Image" className="h-full w-full object-cover opacity-50" />}
                          containerClassName="h-8 w-8 xxxl:h-9 xxxl:w-9 rounded-md border border-border bg-muted flex items-center justify-center overflow-hidden shrink-0"
                        />
                      </div>
                    </TableCell>
                  )}

                  {showCol("limba") && (
                    <TableCell style={getColumnStyle("limba")} className={tableCellCenterClass}>
                      <div className="flex justify-center">
                        <div className={`rounded-md border ${parent.limba !== "FR" ? "bg-cyan-500/5 border-cyan-500" : "bg-lime-500/5 border-lime-500"} flex items-center justify-center`}>
                          <span className={`text-xs xxxl:text-sm w-8 xxxl:w-10 py-1 font-bold ${parent.limba !== "FR" ? "text-cyan-600 " : "text-lime-600"}`}>{parent.limba}</span>
                        </div>
                      </div>
                    </TableCell>
                  )}

                  {showCol("variante") && (
                    <TableCell style={getColumnStyle("variante")} className={tableCellCenterClass}>
                      <div className="flex justify-center items-center">
                        <Badge
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenSubs(parent); // <-- Accesăm direct funcția, fără props.context
                          }}
                          className={
                            viewMode === "variante"
                              ? "h-6 px-2 text-xs xxxl:text-sm font-black shadow-none whitespace-nowrap border-primary bg-primary/10 text-primary transition-transform hover:scale-105"
                              : `h-8 w-8 px-2 text-center flex justify-center items-center text-xs xxxl:text-sm shadow-none whitespace-nowrap ${isSelectionMode ? "cursor-pointer transition-all hover:scale-110" : ""}
                        ${parent.subcategorii.length > 0 ? (parent.limba !== "FR" ? "text-cyan-600 border-cyan-500" : "text-lime-600 border-lime-500") : "text-muted-foreground "}`
                          }
                        >
                          {viewMode === "variante" ? "Variantă" : parent.subcategorii.length}
                        </Badge>
                      </div>
                    </TableCell>
                  )}

                  {showCol("cod") && (
                    <TableCell style={getColumnStyle("cod")} className={`${textAlignClasses.cell} ${tableCellClass} whitespace-nowrap`}>
                      {viewMode === "variante" ? <span className="font-bold text-foreground">{parent.cod_definitie || "—"}</span> : <CatalogCodeValue item={parent} displayLang={displayLang} flexClass={textAlignClasses.flex} />}
                    </TableCell>
                  )}

                  {showCol("clasa1") && (
                    <TableCell style={getColumnStyle("clasa1")} className={`${textAlignClasses.cell} ${tableCellClass}`}>
                      {getCatalogClassLevelDisplay(parent, 1, displayLang) ? (
                        <OverflowTooltip
                          align={textAlignClasses.tooltip}
                          text={getCatalogClassLevelDisplay(parent, 1, displayLang)}
                          className={`truncate whitespace-pre-wrap text-foreground leading-normal ${textAlignClasses.cell}`}
                          maxLines={1}
                        />
                      ) : (
                        <span className="text-muted-foreground/40 italic">—</span>
                      )}
                    </TableCell>
                  )}

                  {showCol("clasa2") && (
                    <TableCell style={getColumnStyle("clasa2")} className={`${textAlignClasses.cell} ${tableCellClass}`}>
                      {getCatalogClassLevelDisplay(parent, 2, displayLang) ? (
                        <OverflowTooltip
                          align={textAlignClasses.tooltip}
                          text={getCatalogClassLevelDisplay(parent, 2, displayLang)}
                          className={`truncate whitespace-pre-wrap text-foreground leading-normal ${textAlignClasses.cell}`}
                          maxLines={1}
                        />
                      ) : (
                        <span className="text-muted-foreground/40 italic">—</span>
                      )}
                    </TableCell>
                  )}

                  {showCol("denumire") && (
                    <TableCell style={getColumnStyle("denumire")} className={`${textAlignClasses.cell} ${tableCellClass}`}>
                      {afisareDenumire ? (
                        <OverflowTooltip
                          align={textAlignClasses.tooltip}
                          text={afisareDenumire}
                          className={`truncate whitespace-nowrap text-foreground ${textAlignClasses.cell}`}
                          maxLines={1}
                        />
                      ) : (
                        <span className="text-muted-foreground/40 italic">—</span>
                      )}
                    </TableCell>
                  )}

                  {showCol("descriere") && (
                    <TableCell style={getColumnStyle("descriere")} className={`${textAlignClasses.cell} ${tableCellClass}`}>
                      <div className="w-full">
                        {afisareDescriere ? (
                          <OverflowTooltip
                            align={textAlignClasses.tooltip}
                            text={afisareDescriere}
                            className={`whitespace-pre-wrap text-foreground leading-normal ${textAlignClasses.cell}`}
                            maxLines={2}
                          />
                        ) : (
                          <span className="text-muted-foreground/40 italic">—</span>
                        )}
                      </div>
                    </TableCell>
                  )}

                  {config.hasFurnizor && showCol("furnizor") && (
                    <TableCell style={getColumnStyle("furnizor")} className={`${textAlignClasses.cell} ${tableCellClass}`}>
                      {viewMode === "variante" && (parent.__sub?.furnizor_denumire || parent.__sub?.detalii_extra?.furnizor) ? (
                        <OverflowTooltip align={textAlignClasses.tooltip} text={parent.__sub.furnizor_denumire || parent.__sub.detalii_extra?.furnizor} className={`truncate text-foreground ${textAlignClasses.cell}`} maxLines={1} textSize="sm" />
                      ) : (
                        <span className="text-muted-foreground/40 italic">—</span>
                      )}
                    </TableCell>
                  )}
                  {(config.id === "material" || config.id === "utilaj") && showCol("marca") && (
                    <TableCell style={getColumnStyle("marca")} className={`${textAlignClasses.cell} ${tableCellClass}`}>
                      {viewMode === "variante" && (parent.__sub?.marca_denumire || parent.__sub?.detalii_extra?.marca) ? (
                        <OverflowTooltip align={textAlignClasses.tooltip} text={parent.__sub.marca_denumire || parent.__sub.detalii_extra?.marca} className={`truncate text-foreground ${textAlignClasses.cell}`} maxLines={1} textSize="sm" />
                      ) : (
                        <span className="text-muted-foreground/40 italic">—</span>
                      )}
                    </TableCell>
                  )}
                  {config.hasStatus && showCol("status") && (
                    <TableCell style={getColumnStyle("status")} className={tableCellCenterClass}>
                      {viewMode === "variante" && parent.__sub?.detalii_extra?.status_utilaj ? (
                        <Badge variant="outline" className="h-6 max-w-full truncate px-2 text-xs xxxl:text-sm font-black shadow-none">
                          {parent.__sub.detalii_extra.status_utilaj}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground/40 italic">—</span>
                      )}
                    </TableCell>
                  )}

                  {showCol("unitate") && (
                    <TableCell style={getColumnStyle("unitate")} className={tableCellCenterClass}>
                      <Badge variant="outline" className="h-8 px-2 text-xs xxxl:text-sm shadow-none whitespace-nowrap">
                        {parent.unitate_masura}
                      </Badge>
                    </TableCell>
                  )}

                  {showCol("greutate") && (
                    <TableCell style={getColumnStyle("greutate")} className={tableCellCenterClass}>
                      {parent.tip_resursa === "material" ? (
                        <span className="font-semibold text-foreground">
                          {parseFloat(parent.greutate || 0)
                            .toFixed(safeDecimalPlaces)
                            .replace(".", ",")}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/40 italic">—</span>
                      )}
                    </TableCell>
                  )}

                  {showCol("cost") && (
                    <TableCell style={getColumnStyle("cost")} className={tableCellCenterClass}>
                      <span className="font-bold text-foreground">
                        {parseFloat(parent.cost || 0)
                          .toFixed(safeDecimalPlaces)
                          .replace(".", ",")}
                      </span>
                    </TableCell>
                  )}

                  {showCol("creat") && (
                    <TableCell style={getColumnStyle("creat")} className={tableCellLeftClass}>
                      <div className="flex items-center gap-1.5 h-8 overflow-hidden">
                        <Avatar className="h-7 w-7 border rounded-md border-border shrink-0">
                          <AvatarImage src={`${photoAPI}/${parent.created_by_photo_url}`} alt={parent.created_by_name} className="object-cover" />
                          <AvatarFallback className="text-[10px] rounded-md bg-muted font-bold">
                            {parent.created_by_name
                              ?.split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase() || "S"}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex flex-col justify-center min-w-0 leading-tight">
                          <span className="text-xs font-bold text-foreground truncate block">{parent.created_by_name || "Sistem"}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(parent.created_at).toLocaleDateString("ro-RO")} {new Date(parent.created_at).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                  )}

                  {showCol("actualizat") && (
                    <TableCell style={getColumnStyle("actualizat")} className={tableCellLeftClass}>
                      <div className="flex items-center gap-1.5 h-8 overflow-hidden">
                        <Avatar className="h-7 w-7 border rounded-md border-border shrink-0">
                          <AvatarImage src={`${photoAPI}/${parent.updated_by_photo_url}`} alt={parent.updated_by_name} className="object-cover" />
                          <AvatarFallback className="text-[10px] rounded-md bg-muted font-bold">
                            {parent.updated_by_name
                              ?.split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase() || "S"}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex flex-col justify-center min-w-0 leading-tight">
                          <span className="text-xs font-bold text-foreground truncate block">{parent.updated_by_name || "Sistem"}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(parent.updated_at).toLocaleDateString("ro-RO")} {new Date(parent.updated_at).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                  )}
                </>
              );
            }}
          />

          {catalogItems.length === 0 && (
            <div
              className={`pointer-events-none absolute inset-x-0 bottom-0 ${
                advancedFilters && setAdvancedFilters ? "top-[4rem] xxxl:top-[4.5rem]" : "top-8 xxxl:top-9"
              } flex items-center justify-center bg-card/60`}
            >
              <span className="px-4 text-center text-base italic text-muted-foreground xxxl:text-xl">{emptyMessage}</span>
            </div>
          )}
        </div>

        <CatalogSubList config={config} open={subDialogOpen} setOpen={setSubDialogOpen} parentItem={selectedParent} />
      </>
    );
  },
);

export default CatalogList;
