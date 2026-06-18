import React, { useCallback, useLayoutEffect, useMemo, useRef, useState, useEffect, memo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger, ContextMenuSeparator } from "@/components/ui/context-menu";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight, faPenToSquare, faTrash, faCopy, faScrewdriverWrench, faPerson, faTruck, faCar, faSort, faSortDown, faSortUp, faQuestion } from "@fortawesome/free-solid-svg-icons";
import { TableVirtuoso } from "react-virtuoso";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipArrow, TooltipContent, TooltipTrigger } from "@radix-ui/react-tooltip";

import OverflowTooltip from "@/components/ui/OverflowTooltip";
import photoAPI from "@/api/photoAPI";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import ReteteSubList from "./ReteteSubList"; // <-- Componenta globală pentru elementele rețetei

const getCodeTooltipParts = (meta, displayLang = "RO", fallback = "") => {
  const levels = Array.isArray(meta?.levels) ? meta.levels : [];
  const parts = levels.map((level) => {
    const denumire = displayLang === "FR" ? level.denumire_fr || level.denumire_ro : level.denumire_ro;
    const isUndefined = !(level.is_defined && level.is_active && denumire);
    return {
      key: level.path_code || `${level.level_no}-${level.code_segment}`,
      label: `${level.code_segment}. ${isUndefined ? "Nedefinit" : denumire}`,
      isUndefined,
    };
  });

  if (meta?.recipe_code) {
    parts.push({ key: "recipe", label: `${meta.recipe_code} Rețetă` });
  }

  if (parts.length > 0) return parts;
  return [{ key: "fallback", label: fallback || "Cod nedefinit" }];
};

const RecipeCodeHelpTooltip = ({ tooltipParts }) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          data-no-row-open
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
        className="z-[100] max-w-[64rem] w-auto rounded-md border-2 border-border bg-popover p-3 text-sm text-popover-foreground shadow-md"
      >
        <div className="flex max-w-[62rem] flex-wrap items-center gap-1">
          {tooltipParts.map((part, index) => (
            <React.Fragment key={`${part.key}-${index}`}>
              <span
                title={part.label}
                className={`inline-flex min-w-0 max-w-32 rounded-md border p-1 text-xs xxxl:text-sm font-semibold ${
                  part.isUndefined ? "border-destructive/50 bg-destructive/10 text-destructive" : ""
                }`}
              >
                <OverflowTooltip text={part.label} align="center" className={`block max-w-full truncate ${part.isUndefined ? "text-destructive" : "text-foreground"}`} maxLines={1} textSize="sm" />
              </span>

              {index < tooltipParts.length - 1 && (
                <span className="text-base">
                  <FontAwesomeIcon icon={faArrowRight} />
                </span>
              )}
            </React.Fragment>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

const getClassLevelInfo = (meta, levelNo, displayLang = "RO") => {
  const level = Array.isArray(meta?.classLevels) ? meta.classLevels[levelNo - 1] : null;
  if (!level || level.is_empty) return { label: "—", isEmpty: true, isUndefined: false };

  const denumire = displayLang === "FR" ? level.denumire_fr || level.denumire_ro : level.denumire_ro;
  const isUndefined = !(level.is_defined && denumire);
  return {
    label: `${level.code_segment}. ${isUndefined ? "Nedefinit" : denumire}`,
    isEmpty: false,
    isUndefined,
  };
};

const CLASS_LEVEL_COLUMNS = [
  { key: "clasa1", levelNo: 1, label: "Specialitate" },
  { key: "clasa2", levelNo: 2, label: "Capitol de lucrări" },
  { key: "clasa3", levelNo: 3, label: "Familie de lucrări" },
  { key: "clasa4", levelNo: 4, label: "Subfamilie de lucrări" },
  { key: "clasa5", levelNo: 5, label: "Articol de lucrare" },
];

const COLUMN_WIDTHS_STORAGE_KEY = "retete_column_widths";

const DEFAULT_COLUMN_WIDTHS = {
  limba: 60,
  elemente: 100,
  cod: 160,
  clasa1: 150,
  clasa2: 150,
  clasa3: 150,
  clasa4: 150,
  clasa5: 150,
  denumire: 400,
  unitate: 120,
  cost: 160,
  creat: 210,
  actualizat: 210,
};

const MIN_COLUMN_WIDTHS = {
  limba: 80,
  elemente: 80,
  cod: 120,
  clasa1: 110,
  clasa2: 110,
  clasa3: 110,
  clasa4: 110,
  clasa5: 110,
  denumire: 220,
  unitate: 80,
  cost: 110,
  creat: 150,
  actualizat: 150,
};

const SORT_FIELD_BY_COLUMN = {
  limba: "limba",
  cod: "cod_reteta",
  denumire: "denumire",
  cost: "cost",
  actualizat: "updated_at",
  creat: "created_at",
};

const normalizeDecimalPlaces = (value) => ([1, 2, 3].includes(Number(value)) ? Number(value) : 3);

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
        className="absolute right-0 top-0 z-30 flex h-full w-3 cursor-col-resize touch-none select-none items-center justify-center hover:bg-primary/20"
      >
        <span className="h-6 w-[2px] rounded-full bg-foreground" />
      </span>
    </TableHead>
  );
};

// --- VIRTUALIZATION COMPONENTS ---
const componentsRetete = {
  Table: (props) => <table {...props} className="min-w-full table-fixed caption-bottom text-left border-collapse" />,
  TableHead: React.forwardRef((props, ref) => <TableHeader {...props} ref={ref} className="bg-background sticky top-0 z-20 shadow-sm" />),
  TableBody: React.forwardRef((props, ref) => <TableBody {...props} ref={ref} />),
  TableRow: (props) => {
    const index = props["data-index"];
    const parent = props.context?.reteteItems?.[index];

    if (!parent) return <TableRow {...props} />;

    return (
      <ContextMenu key={parent.id}>
        <ContextMenuTrigger asChild>
          <TableRow
            {...props}
            className={`cursor-pointer data-[state=open]:bg-muted border-b transition-colors group hover-row-border ${
              props.context?.selectedRetetaId === parent.id ? "bg-primary/10 hover:bg-primary/15" : "hover:bg-accent"
            }`}
            onClick={(e) => props.context?.handleRowClick(e, parent)}
          >
            {props.children}
          </TableRow>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-48">
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

const ReteteList = memo(
  ({
    reteteItems = [],
    visibleColumns,
    setDraft,
    setOpen,
    handleDeleteClick,
    displayLang = "RO",
    handleDuplicateClick,
    isSelectionMode = false,
    selectedRetetaId = null,
    onSelectReteta,
    sortBy = "updated_at",
    sortOrder = "desc",
    decimalPlaces = 3,
    textAlign = "center",
    columnResetKey = 0,
    onSortChange,
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
      const fresh = reteteItems.find((p) => p.id === selectedParentIdRef.current);
      if (fresh) {
        setSelectedParent(fresh);
      }
    }, [reteteItems, subDialogOpen]);

    const handleScroll = (e) => {
      if (e.target) {
        scrollPosRef.current = e.target.scrollTop;
      }
    };

    useLayoutEffect(() => {
      if (containerRef.current) {
        containerRef.current.scrollTop = scrollPosRef.current;
      }
    }, [reteteItems]);

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
      [handleSortColumn, sortBy, sortOrder],
    );

    const handleOpenSubs = useCallback((parent) => {
      selectedParentIdRef.current = parent.id;
      setSelectedParent(parent);
      setSubDialogOpen(true);
    }, []);

    const handleRowClick = useCallback(
      (e, parent) => {
        if (e.target.closest("a, button, input")) return;

        const selection = window.getSelection();
        if (selection.toString().length > 0) return;

        if (isSelectionMode && onSelectReteta) {
          onSelectReteta(parent);
          return;
        }

        handleOpenSubs(parent);
      },
      [handleOpenSubs, isSelectionMode, onSelectReteta],
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
        handleClickEdit,
        handleDeleteClick,
        handleDuplicateClick,
        reteteItems,
        selectedRetetaId,
      };
    }, [handleRowClick, handleClickEdit, handleDeleteClick, handleDuplicateClick, reteteItems, selectedRetetaId]);

    return (
      <>
        <div ref={containerRef} onScroll={handleScroll} className="rounded-md border bg-card w-full h-full overflow-auto relative">
          <TableVirtuoso
            customScrollParent={containerRef.current}
            overscan={10}
            totalCount={reteteItems.length}
            data={reteteItems}
            style={{ height: "100%", width: "100%" }}
            fixedHeaderContent={() => (
              <TableRow className="h-9 xxxl:h-10  hover:bg-muted-foreground/25 bg-muted-foreground/25 border-b">
                {showCol("limba") && (
                  <ResizableTableHead colKey="limba" style={getColumnStyle("limba")} onResizeStart={handleColumnResizeStart} className="text-center">
                    {renderSortHeaderContent("limba", "Limba")}
                  </ResizableTableHead>
                )}
                {/* COLOANA NOUĂ PENTRU VARIANTE/ELEMENTE */}
                {showCol("elemente") && (
                  <ResizableTableHead colKey="elemente" style={getColumnStyle("elemente")} onResizeStart={handleColumnResizeStart} className="text-center">
                    <div className="px-3 xxxl:px-4">Elemente</div>
                  </ResizableTableHead>
                )}

                {showCol("cod") && (
                  <ResizableTableHead colKey="cod" style={getColumnStyle("cod")} onResizeStart={handleColumnResizeStart} className="text-center">
                    {renderSortHeaderContent("cod", "Cod", textAlign)}
                  </ResizableTableHead>
                )}
                {CLASS_LEVEL_COLUMNS.map(
                  (column) =>
                    showCol(column.key) && (
                      <ResizableTableHead key={column.key} colKey={column.key} style={getColumnStyle(column.key)} onResizeStart={handleColumnResizeStart} className="text-center">
                        <div className={`px-2 xxxl:px-2.5 text-sm xxxl:text-base font-bold text-foreground ${textAlignClasses.cell}`}>{column.label}</div>
                      </ResizableTableHead>
                    ),
                )}
                {showCol("denumire") && (
                  <ResizableTableHead colKey="denumire" style={getColumnStyle("denumire")} onResizeStart={handleColumnResizeStart}>
                    {renderSortHeaderContent("denumire", "Denumire", textAlign)}
                  </ResizableTableHead>
                )}
                {showCol("unitate") && (
                  <ResizableTableHead colKey="unitate" style={getColumnStyle("unitate")} onResizeStart={handleColumnResizeStart} className="text-center">
                    <div className="px-3 xxxl:px-4">Unitate</div>
                  </ResizableTableHead>
                )}

                {showCol("cost") && (
                  <ResizableTableHead colKey="cost" style={getColumnStyle("cost")} onResizeStart={handleColumnResizeStart} className="text-center">
                    {renderSortHeaderContent("cost", "Cost", textAlign)}
                  </ResizableTableHead>
                )}

                {showCol("creat") && (
                  <ResizableTableHead colKey="creat" style={getColumnStyle("creat")} onResizeStart={handleColumnResizeStart}>
                    {renderSortHeaderContent("creat", "Creat", textAlign)}
                  </ResizableTableHead>
                )}
                {showCol("actualizat") && (
                  <ResizableTableHead colKey="actualizat" style={getColumnStyle("actualizat")} onResizeStart={handleColumnResizeStart}>
                    {renderSortHeaderContent("actualizat", "Actualizat", textAlign)}
                  </ResizableTableHead>
                )}
              </TableRow>
            )}
            components={componentsRetete}
            context={context}
            itemContent={(index, parent) => {
              const afisareDenumire = displayLang === "FR" ? parent.denumire_fr || "" : parent.denumire;
              const codTooltipParts = getCodeTooltipParts(parent.cod_reteta_meta, displayLang, parent.cod_reteta);

              // Logica de numărare a elementelor pentru coloana Variante
              const elemente = parent.elemente || [];
              const counts = { material: 0, manopera: 0, utilaj: 0, transport: 0 };
              elemente.forEach((el) => {
                if (counts[el.tip_resursa] !== undefined) counts[el.tip_resursa]++;
              });

              return (
                <>
                  {showCol("limba") && (
                    <TableCell style={getColumnStyle("limba")} className="text-center px-2 xxxl:px-3 py-1 xxxl:py-1.5">
                      <div className="flex justify-center">
                        <div className={`rounded-md border ${parent.limba !== "FR" ? "bg-cyan-500/5 border-cyan-500" : "bg-lime-500/5 border-lime-500"} flex items-center justify-center`}>
                          <span className={`text-sm xxxl:text-base w-9 xxxl:w-10 py-1 xxxl:py-1.5 font-bold ${parent.limba !== "FR" ? "text-cyan-600" : "text-lime-600"}`}>{parent.limba}</span>
                        </div>
                      </div>
                    </TableCell>
                  )}

                  {/* RANDARE ICONIȚE ELEMENTE INTERIOARE */}
                  {showCol("elemente") && (
                    <TableCell
                      style={getColumnStyle("elemente")}
                      className="text-center px-2 xxxl:px-3 py-1 xxxl:py-1.5"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenSubs(parent);
                      }}
                    >
                      <div className={`grid grid-cols-2 items-center ${isSelectionMode ? "cursor-pointer transition-all hover:scale-105" : ""}  justify-center gap-1 xxxl:gap-1.5 cursor-pointer`}>
                        {counts.manopera > 0 && (
                          <div
                            className="flex items-center justify-center gap-1 xxxl:gap-1.5 text-indigo-500 bg-indigo-500/10 border border-indigo-500/50 px-1.5 xxxl:px-2 py-0.5 rounded-md"
                            title="Manoperă"
                          >
                            <FontAwesomeIcon icon={faPerson} className="text-xs" />
                            <span className="text-xs xxxl:text-sm font-bold">{counts.manopera}</span>
                          </div>
                        )}

                        {counts.material > 0 && (
                          <div
                            className="flex items-center justify-center gap-1 xxxl:gap-1.5 text-amber-600 bg-amber-600/10 border border-amber-600/50 px-1.5 xxxl:px-2 py-0.5 rounded-md"
                            title="Materiale"
                          >
                            <FontAwesomeIcon icon={faScrewdriverWrench} className="text-xs" />
                            <span className="text-xs xxxl:text-sm font-bold">{counts.material}</span>
                          </div>
                        )}

                        {counts.utilaj > 0 && (
                          <div
                            className="flex items-center justify-center gap-1 xxxl:gap-1.5 text-rose-600 bg-rose-600/10 border border-rose-600/50 px-1.5 xxxl:px-2 py-0.5 rounded-md"
                            title="Utilaje"
                          >
                            <FontAwesomeIcon icon={faTruck} className="text-xs" />
                            <span className="text-xs xxxl:text-sm font-bold">{counts.utilaj}</span>
                          </div>
                        )}

                        {counts.transport > 0 && (
                          <div
                            className="flex items-center justify-center gap-1 xxxl:gap-1.5 text-emerald-600 bg-emerald-600/10 border border-emerald-600/50 px-1.5 xxxl:px-2 py-0.5 rounded-md"
                            title="Transport"
                          >
                            <FontAwesomeIcon icon={faCar} className="text-xs" />
                            <span className="text-xs xxxl:text-sm font-bold">{counts.transport}</span>
                          </div>
                        )}

                        {elemente.length === 0 && <div className="text-xs col-span-2 text-center text-muted-foreground italic font-medium">Gol</div>}
                      </div>
                    </TableCell>
                  )}

                  {showCol("cod") && (
                    <TableCell style={getColumnStyle("cod")} className={`${textAlignClasses.cell} px-2 xxxl:px-3 py-1 xxxl:py-1.5 overflow-hidden`}>
                      {parent.cod_reteta ? (
                        <div className={`flex min-w-0 items-center gap-1.5 ${textAlignClasses.flex}`}>
                          <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-sm xxxl:text-base font-bold text-foreground">{String(parent.cod_reteta)}</span>
                          <RecipeCodeHelpTooltip tooltipParts={codTooltipParts} />
                        </div>
                      ) : (
                        <span className="text-sm xxxl:text-base text-muted-foreground/40 italic">—</span>
                      )}
                    </TableCell>
                  )}

                  {CLASS_LEVEL_COLUMNS.map((column) =>
                    showCol(column.key) ? (
                      <TableCell key={column.key} style={getColumnStyle(column.key)} className={`${textAlignClasses.cell} px-1.5 xxxl:px-2 py-1 xxxl:py-1.5 whitespace-nowrap overflow-hidden`}>
                        {(() => {
                          const classInfo = getClassLevelInfo(parent.cod_reteta_meta, column.levelNo, displayLang);

                          return classInfo.isEmpty ? (
                            <span className="text-sm xxxl:text-base text-muted-foreground/40 italic">—</span>
                          ) : (
                            <Badge
                              variant="secondary"
                              className={`text-xs xxxl:text-sm font-medium max-w-full truncate ${
                                classInfo.isUndefined ? "border-destructive/50 bg-destructive/10 text-destructive" : "bg-card border-border"
                              }`}
                            >
                              <OverflowTooltip
                                align={textAlignClasses.tooltip}
                                text={classInfo.label}
                                className={`block w-full max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-xs xxxl:text-sm font-medium ${classInfo.isUndefined ? "text-destructive" : "text-foreground"} ${textAlignClasses.cell}`}
                                maxLines={1}
                              />
                            </Badge>
                          );
                        })()}
                      </TableCell>
                    ) : null,
                  )}

                  {showCol("denumire") && (
                    <TableCell style={getColumnStyle("denumire")} className={`${textAlignClasses.cell} px-2 xxxl:px-3 py-1 xxxl:py-1.5`}>
                      {afisareDenumire ? (
                        <OverflowTooltip
                          align={textAlignClasses.tooltip}
                          text={afisareDenumire}
                          className={`text-sm xxxl:text-base whitespace-pre-wrap text-foreground leading-normal ${textAlignClasses.cell}`}
                          maxLines={2}
                        />
                      ) : (
                        <span className="text-sm xxxl:text-base text-muted-foreground/40 italic">—</span>
                      )}
                    </TableCell>
                  )}

                  {showCol("unitate") && (
                    <TableCell style={getColumnStyle("unitate")} className="text-center px-2 xxxl:px-3 py-1 xxxl:py-1.5">
                      <Badge variant="secondary" className="text-sm xxxl:text-base bg-card border-border px-2 xxxl:px-3 py-1 xxxl:py-1.5 shadow-none whitespace-nowrap ">
                        {parent.unitate_masura}
                      </Badge>
                    </TableCell>
                  )}

                  {/* COSTUL TOTAL COMBINAT SCOS ÎN EVIDENȚĂ */}
                  {showCol("cost") && (
                    <TableCell style={getColumnStyle("cost")} className="text-center px-2 xxxl:px-3 py-1 xxxl:py-1.5">
                      <div className="flex items-center justify-center gap-1.5 xxxl:gap-2">
                        <span className="font-extrabold text-base xxxl:text-lg ">
                          {parseFloat(parent.cost || 0)
                            .toFixed(safeDecimalPlaces)
                            .replace(".", ",")}
                        </span>
                      </div>
                    </TableCell>
                  )}

                  {showCol("creat") && (
                    <TableCell style={getColumnStyle("creat")} className="text-left px-2 xxxl:px-3 py-1 xxxl:py-1.5">
                      <div className="flex items-center gap-1.5 xxxl:gap-2 h-9 xxxl:h-10 overflow-hidden">
                        <Avatar className="h-8 w-8 xxxl:h-9 xxxl:w-9 border rounded-md border-border shrink-0">
                          <AvatarImage src={`${photoAPI}/${parent.created_by_photo_url}`} alt={parent.created_by_name} className="object-cover" />
                          <AvatarFallback className="text-[11px] xxxl:text-xs rounded-md bg-muted font-bold">
                            {parent.created_by_name
                              ?.split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase() || "S"}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex flex-col justify-center min-w-0 leading-tight">
                          <span className="text-xs xxxl:text-sm font-bold text-foreground truncate block">{parent.created_by_name || "Sistem"}</span>
                          <span className="text-[10px] xxxl:text-[11px] text-muted-foreground mt-0.5">
                            {new Date(parent.created_at).toLocaleDateString("ro-RO")} {new Date(parent.created_at).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                  )}

                  {showCol("actualizat") && (
                    <TableCell style={getColumnStyle("actualizat")} className="text-left px-2 xxxl:px-3 py-1 xxxl:py-1.5">
                      <div className="flex items-center gap-1.5 xxxl:gap-2 h-9 xxxl:h-10 overflow-hidden">
                        <Avatar className="h-8 w-8 xxxl:h-9 xxxl:w-9 border rounded-md border-border shrink-0">
                          <AvatarImage src={`${photoAPI}/${parent.updated_by_photo_url}`} alt={parent.updated_by_name} className="object-cover" />
                          <AvatarFallback className="text-[11px] xxxl:text-xs rounded-md bg-muted font-bold">
                            {parent.updated_by_name
                              ?.split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase() || "S"}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex flex-col justify-center min-w-0 leading-tight">
                          <span className="text-xs xxxl:text-sm font-bold text-foreground truncate block">{parent.updated_by_name || "Sistem"}</span>
                          <span className="text-[10px] xxxl:text-[11px] text-muted-foreground mt-0.5">
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
        </div>

        <ReteteSubList open={subDialogOpen} setOpen={setSubDialogOpen} parentItem={selectedParent} displayLang={displayLang} />
      </>
    );
  },
);

export default ReteteList;
