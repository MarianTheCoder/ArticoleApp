import React, { memo, useCallback, useLayoutEffect, useEffect, useState, useMemo, useRef } from "react";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from "@/components/ui/context-menu";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCar, faPenToSquare, faPerson, faScrewdriverWrench, faTrash, faTruck } from "@fortawesome/free-solid-svg-icons";

import { TableVirtuoso } from "react-virtuoso";
import OverflowTooltip from "@/components/ui/OverflowTooltip";
import { toast } from "sonner";
import OferteRetetaSubList from "./OferteRetetaSubList";

const COL = {
  limba: "w-[4.5rem] min-w-[4.5rem] max-w-[4.5rem]",
  elemente: "w-[7rem] min-w-[7rem] max-w-[7rem]",
  cod: "w-[8rem] min-w-[8rem] max-w-[8rem]",
  clasa: "w-[9rem] min-w-[9rem] max-w-[9rem]",
  denumire: "w-[18rem] min-w-[18rem] max-w-[18rem]",
  dynamic: "w-[7rem] min-w-[7rem] max-w-[7rem]",
  unitate: "w-[5rem] min-w-[5rem] max-w-[5rem]",
  cost: "w-[7rem] min-w-[7rem] max-w-[7rem]",
  cantitate: "w-[7rem] min-w-[7rem] max-w-[7rem]",
  costTotal: "w-[8rem] min-w-[8rem] max-w-[8rem]",
};

const parseMaybeJson = (value, fallback = []) => {
  if (value === null || value === undefined) return fallback;
  if (Array.isArray(value)) return value;

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed ?? fallback;
    } catch {
      return fallback;
    }
  }

  return value;
};

const normalizeColumns = (value) => {
  const parsed = parseMaybeJson(value, []);

  if (!Array.isArray(parsed)) return [];

  return parsed
    .map((col, index) => {
      if (typeof col === "string") {
        return {
          id: `col_${index + 1}`,
          nume: col.trim(),
        };
      }

      return {
        id: col.id || `col_${index + 1}`,
        nume: String(col.nume || col.name || col.label || "").trim(),
      };
    })
    .filter((col) => col.nume)
    .slice(0, 5);
};

const normalizeColoaneValori = (value) => {
  const parsed = parseMaybeJson(value, []);

  if (Array.isArray(parsed)) {
    return parsed
      .map((item) => ({
        name: String(item?.name || item?.nume || "").trim(),
        value: String(item?.value || "").trim(),
      }))
      .filter((item) => item.name);
  }

  if (parsed && typeof parsed === "object") {
    return Object.values(parsed)
      .map((item) => {
        if (item && typeof item === "object") {
          return {
            name: String(item.name || item.nume || "").trim(),
            value: String(item.value || "").trim(),
          };
        }

        return null;
      })
      .filter(Boolean)
      .filter((item) => item.name);
  }

  return [];
};

const getColoanaValue = (coloaneValori, col) => {
  const found = coloaneValori.find((item) => item.name.toLowerCase() === col.nume.toLowerCase());
  return found?.value || "";
};

const formatNumber = (value) => {
  return parseFloat(value || 0)
    .toFixed(3)
    .replace(".", ",");
};

const hasVariantSelected = (el) => {
  return !!(el?.oferta_subcategorie_id || el?.original_subcategorie_id || el?.cod_specific);
};

const getElementUnitCost = (el) => {
  if (hasVariantSelected(el)) {
    return Number(el.cost_subcategorie ?? el.cost_subcategorie_snapshot ?? el.subcategorie_cost ?? 0);
  }

  return Number(el.cost_definitie ?? el.cost_definitie_snapshot ?? el.definitie_cost ?? el.cost ?? 0);
};

const getRetetaCost = (reteta) => {
  if (reteta.cost_total_reteta !== undefined) return Number(reteta.cost_total_reteta || 0);
  if (reteta.cost !== undefined) return Number(reteta.cost || 0);

  const elemente = reteta.elemente || [];

  return elemente.reduce((sum, el) => {
    const cost = getElementUnitCost(el);
    const cantitate = Number(el.cantitate_in_reteta ?? el.cantitate ?? 0);

    return sum + cost * cantitate;
  }, 0);
};

const getRetetaTotalLucrare = (reteta) => {
  const costReteta = getRetetaCost(reteta);
  const cantitateLucrare = Number(reteta.cantitate_lucrare || 0);

  return costReteta * cantitateLucrare;
};

const getElementCounts = (reteta) => {
  const counts = {
    manopera: 0,
    material: 0,
    utilaj: 0,
    transport: 0,
  };

  const elemente = reteta.elemente || [];

  elemente.forEach((el) => {
    if (counts[el.tip_resursa] !== undefined) {
      counts[el.tip_resursa] += 1;
    }
  });

  return counts;
};

const componentsOferteRetete = {
  Table: (props) => <table {...props} className="min-w-full w-full table-fixed caption-bottom text-left border-collapse" />,

  TableHead: React.forwardRef((props, ref) => <TableHeader {...props} ref={ref} className="bg-background sticky top-0 z-20 shadow-sm" />),

  TableBody: React.forwardRef((props, ref) => <TableBody {...props} ref={ref} />),

  TableRow: (props) => {
    const index = props["data-index"];
    const reteta = props.context?.reteteItems?.[index];

    if (!reteta) return <TableRow {...props} />;

    return (
      <ContextMenu key={reteta.id}>
        <ContextMenuTrigger asChild>
          <TableRow
            {...props}
            className="cursor-pointer data-[state=open]:bg-muted h-16 border-b transition-colors group hover:bg-accent hover-row-border"
            onClick={(e) => props.context?.handleRowClick(e, reteta)}
          >
            {props.children}
          </TableRow>
        </ContextMenuTrigger>

        <ContextMenuContent className="w-44">
          <ContextMenuItem className="gap-3" onClick={() => props.context?.handleEdit(reteta)}>
            <FontAwesomeIcon className="text-low" icon={faPenToSquare} />
            Editează
          </ContextMenuItem>

          <ContextMenuSeparator />

          <ContextMenuItem className="gap-3 text-destructive focus:text-destructive hover:text-destructive" onClick={() => props.context?.handleDelete(reteta)}>
            <FontAwesomeIcon icon={faTrash} />
            Șterge
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    );
  },
};

const OferteReteteList = memo(function OferteReteteList({ reteteItems = [], selectedLucrare, displayLang = "RO", visibleColumns, onEditReteta, onDeleteReteta }) {
  const containerRef = useRef(null);
  const scrollPosRef = useRef(0);

  const [subDialogOpen, setSubDialogOpen] = useState(false);
  const [selectedReteta, setSelectedReteta] = useState(null);

  const dynamicColumns = useMemo(() => {
    return normalizeColumns(selectedLucrare?.coloane_config);
  }, [selectedLucrare?.coloane_config]);

  const showCol = useCallback(
    (key) => {
      if (!visibleColumns) return true;
      return visibleColumns[key] !== false;
    },
    [visibleColumns],
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
  }, [reteteItems]);

  const handleRowClick = useCallback((e, reteta) => {
    if (e.target.closest("a, button, input")) return;

    const selection = window.getSelection();
    if (selection.toString().length > 0) return;

    setSelectedReteta(reteta);
    setSubDialogOpen(true);
  }, []);

  useEffect(() => {
    if (!selectedReteta?.id) return;

    const fresh = reteteItems.find((r) => Number(r.id) === Number(selectedReteta.id));

    if (fresh) {
      setSelectedReteta(fresh);
    }
  }, [reteteItems, selectedReteta?.id]);

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
    (reteta) => {
      if (onDeleteReteta) {
        onDeleteReteta(reteta);
        return;
      }

      toast.info("Ștergere dummy momentan.");
    },
    [onDeleteReteta],
  );

  const context = useMemo(() => {
    return {
      reteteItems,
      handleRowClick,
      handleEdit,
      handleDelete,
    };
  }, [reteteItems, handleRowClick, handleEdit, handleDelete]);

  return (
    <div ref={containerRef} onScroll={handleScroll} className="rounded-md border bg-card w-full h-full overflow-auto relative">
      <TableVirtuoso
        customScrollParent={containerRef.current}
        overscan={10}
        totalCount={reteteItems.length}
        data={reteteItems}
        style={{ height: "100%", width: "100%" }}
        components={componentsOferteRetete}
        context={context}
        fixedHeaderContent={() => (
          <TableRow className="h-9 hover:bg-muted-foreground/25 bg-muted-foreground/25 border-b">
            {showCol("limba") && <TableHead className={`text-center px-2 ${COL.limba}`}>Limba</TableHead>}
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
            {showCol("descriere") && <TableHead className="px-3 min-w-[22rem]">Descriere</TableHead>}
            {showCol("unitate") && <TableHead className={`text-center px-2 ${COL.unitate}`}>U.M.</TableHead>}
            {showCol("cost") && <TableHead className={`text-center px-2 ${COL.cost}`}>Cost</TableHead>}
            {showCol("cantitate") && <TableHead className={`text-center px-2 ${COL.cantitate}`}>Cant.</TableHead>}
            {showCol("costTotal") && <TableHead className={`text-center px-2 ${COL.costTotal}`}>Total</TableHead>}
          </TableRow>
        )}
        itemContent={(index, reteta) => {
          const afisareDenumire = displayLang === "FR" ? reteta.denumire_fr || reteta.denumire || "" : reteta.denumire || "";
          const afisareDescriere = displayLang === "FR" ? reteta.descriere_fr || reteta.descriere || "" : reteta.descriere || "";

          const counts = getElementCounts(reteta);
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

              {showCol("elemente") && (
                <TableCell className={`text-center px-2 py-1 ${COL.elemente}`}>
                  <div className="grid grid-cols-2 items-center justify-center gap-1">
                    {counts.manopera > 0 && (
                      <div className="flex items-center justify-center gap-1 text-indigo-500 bg-indigo-500/10 border border-indigo-500/50 px-1.5 py-0.5 rounded-md" title="Manoperă">
                        <FontAwesomeIcon icon={faPerson} className="text-[10px]" />
                        <span className="text-xs font-bold">{counts.manopera}</span>
                      </div>
                    )}

                    {counts.material > 0 && (
                      <div className="flex items-center justify-center gap-1 text-amber-600 bg-amber-600/10 border border-amber-600/50 px-1.5 py-0.5 rounded-md" title="Materiale">
                        <FontAwesomeIcon icon={faScrewdriverWrench} className="text-[10px]" />
                        <span className="text-xs font-bold">{counts.material}</span>
                      </div>
                    )}

                    {counts.utilaj > 0 && (
                      <div className="flex items-center justify-center gap-1 text-rose-600 bg-rose-600/10 border border-rose-600/50 px-1.5 py-0.5 rounded-md" title="Utilaje">
                        <FontAwesomeIcon icon={faTruck} className="text-[10px]" />
                        <span className="text-xs font-bold">{counts.utilaj}</span>
                      </div>
                    )}

                    {counts.transport > 0 && (
                      <div className="flex items-center justify-center gap-1 text-emerald-600 bg-emerald-600/10 border border-emerald-600/50 px-1.5 py-0.5 rounded-md" title="Transport">
                        <FontAwesomeIcon icon={faCar} className="text-[10px]" />
                        <span className="text-xs font-bold">{counts.transport}</span>
                      </div>
                    )}

                    {(reteta.elemente || []).length === 0 && <div className="text-xs col-span-2 text-center text-muted-foreground italic font-medium">Gol</div>}
                  </div>
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
                <TableCell className="px-3 py-1 min-w-[22rem]">
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
                <TableCell className={`text-center px-2 py-1 ${COL.cantitate}`}>
                  <span className="text-sm font-black text-foreground whitespace-nowrap">{formatNumber(reteta.cantitate_lucrare)}</span>
                </TableCell>
              )}

              {showCol("costTotal") && (
                <TableCell className={`text-center px-2 py-1 ${COL.costTotal}`}>
                  <span className="text-sm font-black text-primary whitespace-nowrap">{formatNumber(costTotalLucrare)}</span>
                </TableCell>
              )}
            </>
          );
        }}
      />

      <OferteRetetaSubList open={subDialogOpen} setOpen={setSubDialogOpen} parentItem={selectedReteta} selectedLucrare={selectedLucrare} />
    </div>
  );
});

export default OferteReteteList;
