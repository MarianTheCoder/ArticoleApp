import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { Tooltip, TooltipArrow, TooltipContent, TooltipTrigger } from "@radix-ui/react-tooltip";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRightLong, faCheck, faCopy, faFolder, faListCheck, faQuestion } from "@fortawesome/free-solid-svg-icons";

import OverflowTooltip from "@/components/ui/OverflowTooltip";
import { toast } from "sonner";
import { OferteRetetaClassValue, OferteRetetaCodeValue } from "./components/OferteRetetaCodeClassDisplay";

const MAX_COLUMN_VALUE_LENGTH = 255;
const DEFAULT_VISIBLE_COLUMNS = {
  elemente: true,
  cod: true,
  clasa: true,
  denumire: true,
  descriere: false,
  unitate: true,
  cost: true,
  cantitate: true,
  costTotal: true,
  onlyDefinitions: true,
  rewriteCost: true,
  rewriteQuantity: true,
};
const MENU_ITEM_CLASS = "text-sm py-1.5 pl-7 pr-2 text-foreground";

const sortByName = (items = []) => {
  return [...items].sort((a, b) => {
    const nameA = String(a?.nume || a?.name || "").trim();
    const nameB = String(b?.nume || b?.name || "").trim();

    return nameA.localeCompare(nameB, "ro", {
      sensitivity: "base",
      numeric: true,
    });
  });
};

const getOfertaLucrari = (oferta) => {
  return sortByName(oferta?.lucrari || oferta?.sections || oferta?.oferte_lucrari || []);
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

const normalizeColoaneValori = (value) => {
  const parsed = parseMaybeJson(value, []);

  if (Array.isArray(parsed)) {
    return parsed
      .map((item) => ({
        id: item?.id ? String(item.id) : "",
        name: String(item?.name || item?.nume || "").trim(),
        value: String(item?.value ?? "").trim(),
      }))
      .filter((item) => item.id || item.name);
  }

  if (parsed && typeof parsed === "object") {
    return Object.entries(parsed)
      .map(([key, item]) => {
        if (!item || typeof item !== "object") return null;

        return {
          id: item.id ? String(item.id) : String(key || ""),
          name: String(item.name || item.nume || "").trim(),
          value: String(item.value ?? "").trim(),
        };
      })
      .filter(Boolean)
      .filter((item) => item.id || item.name);
  }

  return [];
};

const getColoanaValue = (coloaneValori, col) => {
  const colId = col?.id ? String(col.id) : "";
  const colName = String(col?.nume || col?.name || "")
    .trim()
    .toLowerCase();
  const found = coloaneValori.find((item) => {
    if (colId && item.id && String(item.id) === colId) return true;
    return item.name && item.name.toLowerCase() === colName;
  });

  return found?.value || "";
};

const formatNumber = (value) => {
  return parseFloat(value || 0)
    .toFixed(3)
    .replace(".", ",");
};

const normalizeDecimalInput = (value) => {
  return String(value || "").replace(".", ",");
};

const parseDecimalInput = (value) => {
  return Number(String(value || "0").replace(",", "."));
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

const HeaderHelp = ({ text }) => {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex text-xs w-5 h-5  cursor-help items-center justify-center rounded-full border border-border bg-card  font-black text-muted-foreground hover:text-foreground">
          <FontAwesomeIcon icon={faQuestion} />
        </span>
      </TooltipTrigger>

      <TooltipContent className="whitespace-pre-wrap break-words xxxl:max-w-[40rem] font-normal lg:max-w-[30rem] max-w-[20rem] rounded-md text-sm xl:text-base z-[100] bg-popover border-2 border-border text-popover-foreground shadow-md p-2 xl:p-4">
        <TooltipArrow width={15} height={10} className="fill-border" />
        {text}
      </TooltipContent>
    </Tooltip>
  );
};

export default function OferteDuplicateReteteDialog({
  open,
  setOpen,
  retete = [],
  dynamicColumns = [],
  displayLang = "RO",
  onConfirm,
  mode = "duplicate",
  oferteOptions = [],
  selectedOfertaId = null,
  selectedLucrareId = null,
}) {
  const [rows, setRows] = useState([]);
  const [visibleColumns, setVisibleColumns] = useState(DEFAULT_VISIBLE_COLUMNS);
  const [targetOfertaId, setTargetOfertaId] = useState("");
  const [targetLucrareId, setTargetLucrareId] = useState("");
  const isMoveMode = mode === "move";

  const sortedOferte = useMemo(() => sortByName(oferteOptions || []), [oferteOptions]);
  const selectedTargetOferta = useMemo(() => sortedOferte.find((oferta) => String(oferta.id) === String(targetOfertaId)) || null, [sortedOferte, targetOfertaId]);
  const targetLucrari = useMemo(() => {
    const lucrari = getOfertaLucrari(selectedTargetOferta);

    if (!isMoveMode || String(targetOfertaId) !== String(selectedOfertaId)) return lucrari;

    return lucrari.filter((lucrare) => String(lucrare.id) !== String(selectedLucrareId));
  }, [isMoveMode, selectedLucrareId, selectedOfertaId, selectedTargetOferta, targetOfertaId]);

  useEffect(() => {
    if (!open) return;

    setRows(
      (retete || []).map((reteta) => {
        const coloaneValori = normalizeColoaneValori(reteta.coloane_valori);
        const coloaneMap = {};

        dynamicColumns.forEach((col) => {
          coloaneMap[col.id] = getColoanaValue(coloaneValori, col);
        });

        return {
          id: reteta.id,
          reteta,
          cantitate: formatNumber(reteta.cantitate_lucrare || 0),
          coloaneMap,
          onlyDefinitions: false,
          rewriteCost: false,
          rewriteQuantity: false,
        };
      }),
    );
  }, [open, retete, dynamicColumns]);

  useEffect(() => {
    if (!open || !isMoveMode) return;

    const fallbackOferta = sortedOferte.find((oferta) => String(oferta.id) === String(selectedOfertaId)) || sortedOferte[0] || null;
    const nextOfertaId = fallbackOferta?.id ? String(fallbackOferta.id) : "";
    const lucrari = getOfertaLucrari(fallbackOferta);
    const availableLucrari =
      String(nextOfertaId) === String(selectedOfertaId) ? lucrari.filter((lucrare) => String(lucrare.id) !== String(selectedLucrareId)) : lucrari;
    const fallbackLucrare = availableLucrari[0] || null;

    setTargetOfertaId(nextOfertaId);
    setTargetLucrareId(fallbackLucrare?.id ? String(fallbackLucrare.id) : "");
  }, [isMoveMode, open, selectedLucrareId, selectedOfertaId, sortedOferte]);

  const allOnlyDefinitions = useMemo(() => {
    return rows.length > 0 && rows.every((row) => row.onlyDefinitions);
  }, [rows]);

  const rowsWithOnlyDefinitions = useMemo(() => {
    return rows.filter((row) => row.onlyDefinitions);
  }, [rows]);

  const allRewriteCosts = useMemo(() => {
    return rowsWithOnlyDefinitions.length > 0 && rowsWithOnlyDefinitions.every((row) => row.rewriteCost);
  }, [rowsWithOnlyDefinitions]);

  const allRewriteQuantities = useMemo(() => {
    return rowsWithOnlyDefinitions.length > 0 && rowsWithOnlyDefinitions.every((row) => row.rewriteQuantity);
  }, [rowsWithOnlyDefinitions]);

  const totalGeneral = useMemo(() => {
    return rows.reduce((sum, row) => {
      const cost = getRetetaCost(row.reteta);
      const cantitate = parseDecimalInput(row.cantitate);

      if (!Number.isFinite(cantitate)) return sum;

      return sum + cost * cantitate;
    }, 0);
  }, [rows]);

  const showCol = (key) => visibleColumns?.[key] !== false;

  const toggleColumn = (key) => {
    setVisibleColumns((prev) => ({
      ...prev,
      [key]: !(prev?.[key] !== false),
    }));
  };

  const handleTargetOfertaChange = (ofertaId) => {
    const oferta = sortedOferte.find((item) => String(item.id) === String(ofertaId)) || null;
    const lucrari = getOfertaLucrari(oferta);

    setTargetOfertaId(String(ofertaId || ""));
    setTargetLucrareId(lucrari[0]?.id ? String(lucrari[0].id) : "");
  };

  const updateRow = (id, updater) => {
    setRows((prev) => prev.map((row) => (Number(row.id) === Number(id) ? updater(row) : row)));
  };

  const handleToggleAllOnlyDefinitions = () => {
    const nextChecked = !allOnlyDefinitions;

    setRows((prev) =>
      prev.map((row) => ({
        ...row,
        onlyDefinitions: nextChecked,
        rewriteCost: nextChecked ? row.rewriteCost : false,
        rewriteQuantity: nextChecked ? row.rewriteQuantity : false,
      })),
    );
  };

  const handleToggleAllRewriteCosts = () => {
    const nextChecked = !allRewriteCosts;

    setRows((prev) =>
      prev.map((row) => {
        if (!row.onlyDefinitions) return row;

        return {
          ...row,
          rewriteCost: nextChecked,
        };
      }),
    );
  };

  const handleToggleAllRewriteQuantities = () => {
    const nextChecked = !allRewriteQuantities;

    setRows((prev) =>
      prev.map((row) => {
        if (!row.onlyDefinitions) return row;

        return {
          ...row,
          rewriteQuantity: nextChecked,
        };
      }),
    );
  };

  const handleSave = async () => {
    const payload = rows.map((row) => {
      const cantitate = parseDecimalInput(row.cantitate);

      return {
        source_oferta_reteta_id: row.reteta.id,
        original_reteta_id: row.reteta.original_reteta_id,
        cantitate_lucrare: cantitate,
        only_definitions: row.onlyDefinitions,
        rewrite_costs: row.onlyDefinitions && row.rewriteCost,
        rewrite_quantities: row.onlyDefinitions && row.rewriteQuantity,
        coloane_valori: dynamicColumns.map((col) => ({
          id: col.id,
          name: col.nume,
          value: String(row.coloaneMap?.[col.id] || "").trim(),
        })),
      };
    });

    const invalid = payload.find((item) => !Number.isFinite(item.cantitate_lucrare) || item.cantitate_lucrare < 0);

    if (invalid) {
      toast.warning("Cantitatea trebuie să fie minim 0.", { position: "top-right" });
      return;
    }

    if (isMoveMode) {
      if (!targetLucrareId) {
        toast.warning("Selectează lucrarea destinație.", { position: "top-right" });
        return;
      }

      if (String(targetLucrareId) === String(selectedLucrareId)) {
        toast.warning("Alege altă lucrare pentru mutare.", { position: "top-right" });
        return;
      }

      await onConfirm?.({
        target_lucrare_id: Number(targetLucrareId),
        items: payload,
      });
      return;
    }

    await onConfirm?.(payload);
  };

  const dialogMeta = isMoveMode
    ? {
        eyebrow: "Mutare",
        totalLabel: "Total mutare",
        submitLabel: "Mută",
        icon: faArrowRightLong,
        iconWrapClass: "border-2 border-cyan-600/50 bg-cyan-600/15",
        iconClass: "text-cyan-700 dark:text-cyan-300",
        eyebrowClass: "text-cyan-700 dark:text-cyan-300",
        submitClass: "bg-cyan-600 hover:bg-cyan-700",
      }
    : {
        eyebrow: "Dublare",
        totalLabel: "Total dublare",
        submitLabel: "Dublează",
        icon: faCopy,
        iconWrapClass: "border-2 border-orange-500/50 bg-orange-500/15",
        iconClass: "text-medium",
        eyebrowClass: "text-medium",
        submitClass: "bg-sky-600 hover:bg-sky-700",
      };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="keepSelection max-w-[90vw] h-[72vh] p-0 gap-0 flex flex-col" style={{ animationDuration: "0ms", transitionDuration: "0ms" }}>
        <DialogHeader className="rounded-t-lg px-4 py-3 border-b bg-muted shrink-0">
          <div className="flex items-center justify-between gap-4 min-w-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${dialogMeta.iconWrapClass}`}>
                <FontAwesomeIcon icon={dialogMeta.icon} className={`${dialogMeta.iconClass} text-xl`} />
              </div>

              <DialogTitle className="text-left flex flex-col gap-0.5 min-w-0">
                <span className={`text-xs font-black uppercase tracking-wider ${dialogMeta.eyebrowClass}`}>{dialogMeta.eyebrow}</span>

                <span className="text-base font-black text-foreground truncate">
                  {rows.length} {rows.length === 1 ? "rețetă selectată" : "rețete selectate"}
                </span>
              </DialogTitle>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" className="h-8 gap-1.5 px-2 mr-12 text-sm font-semibold">
                  <FontAwesomeIcon icon={faListCheck} className="text-sm text-foreground" />
                  Coloane vizibile
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-52 p-1">
                <DropdownMenuCheckboxItem className={MENU_ITEM_CLASS} checked={showCol("elemente")} onSelect={(e) => e.preventDefault()} onCheckedChange={() => toggleColumn("elemente")}>
                  Tip
                </DropdownMenuCheckboxItem>

                {dynamicColumns.map((col) => (
                  <DropdownMenuCheckboxItem
                    key={col.id}
                    className={MENU_ITEM_CLASS}
                    checked={showCol(`col_${col.id}`)}
                    onSelect={(e) => e.preventDefault()}
                    onCheckedChange={() => toggleColumn(`col_${col.id}`)}
                  >
                    {col.nume}
                  </DropdownMenuCheckboxItem>
                ))}

                <DropdownMenuCheckboxItem className={MENU_ITEM_CLASS} checked={showCol("cod")} onSelect={(e) => e.preventDefault()} onCheckedChange={() => toggleColumn("cod")}>
                  Cod
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem className={MENU_ITEM_CLASS} checked={showCol("clasa")} onSelect={(e) => e.preventDefault()} onCheckedChange={() => toggleColumn("clasa")}>
                  Clasa
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem className={MENU_ITEM_CLASS} checked={showCol("denumire")} onSelect={(e) => e.preventDefault()} onCheckedChange={() => toggleColumn("denumire")}>
                  Denumire
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem className={MENU_ITEM_CLASS} checked={showCol("descriere")} onSelect={(e) => e.preventDefault()} onCheckedChange={() => toggleColumn("descriere")}>
                  Descriere
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem className={MENU_ITEM_CLASS} checked={showCol("unitate")} onSelect={(e) => e.preventDefault()} onCheckedChange={() => toggleColumn("unitate")}>
                  Unitate
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem className={MENU_ITEM_CLASS} checked={showCol("cost")} onSelect={(e) => e.preventDefault()} onCheckedChange={() => toggleColumn("cost")}>
                  Cost rețetă
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem className={MENU_ITEM_CLASS} checked={showCol("cantitate")} onSelect={(e) => e.preventDefault()} onCheckedChange={() => toggleColumn("cantitate")}>
                  Cantitate
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem className={MENU_ITEM_CLASS} checked={showCol("costTotal")} onSelect={(e) => e.preventDefault()} onCheckedChange={() => toggleColumn("costTotal")}>
                  Total
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem className={MENU_ITEM_CLASS} checked={showCol("onlyDefinitions")} onSelect={(e) => e.preventDefault()} onCheckedChange={() => toggleColumn("onlyDefinitions")}>
                  Doar definiții
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem className={MENU_ITEM_CLASS} checked={showCol("rewriteCost")} onSelect={(e) => e.preventDefault()} onCheckedChange={() => toggleColumn("rewriteCost")}>
                  Rescrie Cost
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem className={MENU_ITEM_CLASS} checked={showCol("rewriteQuantity")} onSelect={(e) => e.preventDefault()} onCheckedChange={() => toggleColumn("rewriteQuantity")}>
                  Rescrie Qty
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-auto bg-card p-2">
          <div className="rounded-md border bg-card overflow-auto">
            <Table className="min-w-full table-fixed caption-bottom text-left border-collapse text-xs">
              <TableHeader className="sticky top-0 z-50 bg-muted shadow-sm">
                <TableRow className="h-9 bg-muted hover:bg-muted [&>th]:bg-muted [&>th:first-child]:rounded-tl-md [&>th:last-child]:rounded-tr-md">
                  {showCol("elemente") && <TableHead className="p-1 text-center align-middle text-sm font-bold text-foreground w-[3rem] min-w-[3rem]">Tip</TableHead>}

                  {dynamicColumns.map((col) =>
                    showCol(`col_${col.id}`) ? (
                      <TableHead key={col.id} className="p-1 text-center align-middle text-sm font-bold text-foreground w-[7rem] min-w-[7rem]">
                        <OverflowTooltip text={col.nume} align="center" className="font-bold text-center" maxLines={1} />
                      </TableHead>
                    ) : null,
                  )}

                  {showCol("cod") && <TableHead className="p-1 text-center align-middle text-sm font-bold text-foreground w-[7rem] min-w-[7rem]">Cod</TableHead>}
                  {showCol("clasa") && <TableHead className="p-1 text-center align-middle text-sm font-bold text-foreground w-[8rem] min-w-[8rem]">Clasa</TableHead>}
                  {showCol("denumire") && <TableHead className="p-1 text-left align-middle text-sm font-bold text-foreground w-[14rem] min-w-[14rem]">Denumire</TableHead>}
                  {showCol("descriere") && <TableHead className="p-1 text-left align-middle text-sm font-bold text-foreground w-[18rem] min-w-[18rem]">Descriere</TableHead>}
                  {showCol("unitate") && <TableHead className="p-1 text-center align-middle text-sm font-bold text-foreground w-[4.5rem] min-w-[4.5rem]">U.M.</TableHead>}
                  {showCol("cost") && <TableHead className="p-1 text-center align-middle text-sm font-bold text-foreground w-[6rem] min-w-[6rem]">Cost</TableHead>}
                  {showCol("cantitate") && <TableHead className="p-1 text-center align-middle text-sm font-bold text-foreground w-[7rem] min-w-[7rem]">Qty</TableHead>}
                  {showCol("costTotal") && <TableHead className="p-1 text-center align-middle text-sm font-bold text-foreground w-[7rem] min-w-[7rem]">Total</TableHead>}

                  {showCol("onlyDefinitions") && (
                    <TableHead className="p-1 text-center align-middle text-sm font-bold text-foreground w-[9rem] min-w-[9rem]">
                      <div className="flex items-center justify-center gap-1.5">
                        <HeaderHelp text="Dacă este bifat, elementele care au variantă vor fi refăcute ca definiții din rețeta/catalogul original. Elementele care sunt deja definiții rămân copiate ca snapshot existent." />

                        <span className="text-xs leading-tight">Doar definiții</span>

                        <Button variant="outline" onClick={handleToggleAllOnlyDefinitions} className="h-6 w-6 p-0 shrink-0">
                          <FontAwesomeIcon className="text-[10px]" icon={faCheck} />
                        </Button>
                      </div>
                    </TableHead>
                  )}

                  {showCol("rewriteCost") && (
                    <TableHead className="p-1 text-center align-middle text-sm font-bold text-foreground w-[9rem] min-w-[9rem]">
                      <div className="flex items-center justify-center gap-1.5">
                        <HeaderHelp text="Funcționează doar când este bifat „Doar definiții”. Dacă este bifat, costurile elementelor din interior se iau din rețeta originală actualizată; dacă nu, se păstrează costurile snapshot din oferta dublată." />

                        <span className="text-xs leading-tight">Rescrie Cost</span>

                        <Button variant="outline" onClick={handleToggleAllRewriteCosts} disabled={rowsWithOnlyDefinitions.length === 0} className="h-6 w-6 p-0 shrink-0 disabled:opacity-40">
                          <FontAwesomeIcon className="text-[10px]" icon={faCheck} />
                        </Button>
                      </div>
                    </TableHead>
                  )}

                  {showCol("rewriteQuantity") && (
                    <TableHead className="p-1 text-center align-middle text-sm font-bold text-foreground w-[9rem] min-w-[9rem]">
                      <div className="flex items-center justify-center gap-1.5">
                        <HeaderHelp text="Funcționează doar când este bifat „Doar definiții”. Dacă este bifat, cantitățile elementelor din interior se iau din rețeta originală actualizată; dacă nu, se păstrează cantitățile snapshot din oferta dublată." />

                        <span className="text-xs leading-tight">Rescrie Qty</span>

                        <Button variant="outline" onClick={handleToggleAllRewriteQuantities} disabled={rowsWithOnlyDefinitions.length === 0} className="h-6 w-6 p-0 shrink-0 disabled:opacity-40">
                          <FontAwesomeIcon className="text-[10px]" icon={faCheck} />
                        </Button>
                      </div>
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>

              <TableBody>
                {rows.map((row) => {
                  const reteta = row.reteta;
                  const cost = getRetetaCost(reteta);
                  const cantitate = parseDecimalInput(row.cantitate);
                  const total = cost * (Number.isFinite(cantitate) ? cantitate : 0);

                  return (
                    <TableRow key={row.id} className="h-10 border-b bg-secondary/80 dark:bg-zinc-900 transition-colors hover:bg-secondary dark:hover:bg-zinc-800">
                      {showCol("elemente") && (
                        <TableCell className="border-r border-border p-1 text-center text-sky-600 align-middle text-xs">
                          <FontAwesomeIcon icon={faFolder} className="text-sm" />
                        </TableCell>
                      )}

                      {dynamicColumns.map((col) =>
                        showCol(`col_${col.id}`) ? (
                          <TableCell key={col.id} className="border-r border-border p-1 text-center align-middle text-xs">
                            <Input
                              className="h-7 w-full min-w-0 border-primary/70 text-center text-xs font-semibold"
                              maxLength={MAX_COLUMN_VALUE_LENGTH}
                              value={row.coloaneMap?.[col.id] || ""}
                              onChange={(e) => {
                                const value = e.target.value.slice(0, MAX_COLUMN_VALUE_LENGTH);

                                updateRow(row.id, (current) => ({
                                  ...current,
                                  coloaneMap: {
                                    ...current.coloaneMap,
                                    [col.id]: value,
                                  },
                                }));
                              }}
                            />
                          </TableCell>
                        ) : null,
                      )}

                      {showCol("cod") && (
                        <TableCell className="border-r border-border p-1 text-center align-middle text-xs">
                          <OferteRetetaCodeValue reteta={reteta} displayLang={displayLang} className="text-center text-xs" withTooltip={false} />
                        </TableCell>
                      )}

                      {showCol("clasa") && (
                        <TableCell className="border-r border-border p-1 text-center align-middle text-xs">
                          <OferteRetetaClassValue reteta={reteta} displayLang={displayLang} align="center" className="text-center" />
                        </TableCell>
                      )}

                      {showCol("denumire") && (
                        <TableCell className="border-r border-border p-1 align-middle text-xs">
                          {reteta.denumire ? (
                            <OverflowTooltip align="left" text={reteta.denumire} className="font-semibold whitespace-nowrap text-foreground leading-none" maxLines={1} textSize="sm" />
                          ) : (
                            <span className="text-xs text-muted-foreground/40 italic">—</span>
                          )}
                        </TableCell>
                      )}

                      {showCol("descriere") && (
                        <TableCell className="border-r border-border p-1 align-middle text-xs">
                          {reteta.descriere ? (
                            <OverflowTooltip align="left" text={reteta.descriere} className="font-normal whitespace-nowrap text-foreground leading-none" maxLines={1} textSize="sm" />
                          ) : (
                            <span className="text-xs text-muted-foreground/40 italic">—</span>
                          )}
                        </TableCell>
                      )}

                      {showCol("unitate") && (
                        <TableCell className="border-r border-border p-1 text-center align-middle text-xs">
                          <span className="text-xs font-semibold text-foreground whitespace-nowrap">{reteta.unitate_masura || "—"}</span>
                        </TableCell>
                      )}

                      {showCol("cost") && (
                        <TableCell className="border-r border-border p-1 text-center align-middle text-xs">
                          <span className="text-xs font-bold text-foreground whitespace-nowrap">{formatNumber(cost)}</span>
                        </TableCell>
                      )}

                      {showCol("cantitate") && (
                        <TableCell className="relative border-r border-border p-0 text-center align-middle text-xs">
                          <Input
                            className="absolute inset-0 h-full w-full rounded-none border-0 p-0 text-center text-sm font-black transition-colors hover:border hover:border-primary hover:bg-primary/25 focus-visible:ring-0"
                            value={row.cantitate}
                            onChange={(e) => {
                              const val = normalizeDecimalInput(e.target.value);

                              if (/^\d{0,9},?\d{0,3}$/.test(val)) {
                                updateRow(row.id, (current) => ({
                                  ...current,
                                  cantitate: val,
                                }));
                              }
                            }}
                          />
                        </TableCell>
                      )}

                      {showCol("costTotal") && (
                        <TableCell className="border-r border-border p-1 text-center align-middle text-xs">
                          <span className="text-xs font-black text-primary whitespace-nowrap">{formatNumber(total)}</span>
                        </TableCell>
                      )}

                      {showCol("onlyDefinitions") && (
                        <TableCell className="border-r border-border p-1 text-center align-middle text-xs">
                          <label className="flex items-center justify-center gap-1.5 text-xs font-bold text-foreground cursor-pointer">
                            <Checkbox
                              className="w-5 h-5"
                              checked={row.onlyDefinitions}
                              onCheckedChange={(checked) => {
                                const nextChecked = checked === true;

                                updateRow(row.id, (current) => ({
                                  ...current,
                                  onlyDefinitions: nextChecked,
                                  rewriteCost: nextChecked ? current.rewriteCost : false,
                                  rewriteQuantity: nextChecked ? current.rewriteQuantity : false,
                                }));
                              }}
                            />
                          </label>
                        </TableCell>
                      )}

                      {showCol("rewriteCost") && (
                        <TableCell className="border-r border-border p-1 text-center align-middle text-xs">
                          <label
                            className={`flex items-center justify-center gap-1.5 text-xs font-bold ${row.onlyDefinitions ? "text-foreground cursor-pointer" : "text-muted-foreground/50 cursor-not-allowed"}`}
                          >
                            <Checkbox
                              className="w-5 h-5"
                              disabled={!row.onlyDefinitions}
                              checked={row.onlyDefinitions && row.rewriteCost}
                              onCheckedChange={(checked) => {
                                if (!row.onlyDefinitions) return;

                                updateRow(row.id, (current) => ({
                                  ...current,
                                  rewriteCost: checked === true,
                                }));
                              }}
                            />
                          </label>
                        </TableCell>
                      )}

                      {showCol("rewriteQuantity") && (
                        <TableCell className="p-1 text-center align-middle text-xs">
                          <label
                            className={`flex items-center justify-center gap-1.5 text-xs font-bold ${row.onlyDefinitions ? "text-foreground cursor-pointer" : "text-muted-foreground/50 cursor-not-allowed"}`}
                          >
                            <Checkbox
                              className="w-5 h-5"
                              disabled={!row.onlyDefinitions}
                              checked={row.onlyDefinitions && row.rewriteQuantity}
                              onCheckedChange={(checked) => {
                                if (!row.onlyDefinitions) return;

                                updateRow(row.id, (current) => ({
                                  ...current,
                                  rewriteQuantity: checked === true,
                                }));
                              }}
                            />
                          </label>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>

        <DialogFooter className="px-4 py-3 border-t bg-muted/20 shrink-0">
          <div className="rounded-md border bg-card px-3 py-1.5 flex items-center gap-2 shrink-0">
            <span className="text-xs uppercase tracking-wider font-black text-foreground">{dialogMeta.totalLabel}</span>
            <span className="text-base font-black text-primary">{formatNumber(totalGeneral)}</span>
          </div>
          <div className="w-full flex items-end gap-3">
            {isMoveMode && (
              <div className="flex min-w-0 items-end gap-2">
                <div className="grid min-w-[12rem] gap-1">
                  <span className="text-[11px] font-black uppercase tracking-wide text-muted-foreground">Ofertă</span>
                  <Select value={targetOfertaId} onValueChange={handleTargetOfertaChange}>
                    <SelectTrigger className="h-8 bg-background text-xs font-semibold">
                      <SelectValue placeholder="Selectează oferta" />
                    </SelectTrigger>
                    <SelectContent>
                      {sortedOferte.map((oferta) => (
                        <SelectItem key={oferta.id} value={String(oferta.id)}>
                          {oferta.nume || `Oferta ${oferta.id}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid min-w-[12rem] gap-1">
                  <span className="text-[11px] font-black uppercase tracking-wide text-muted-foreground">Lucrare</span>
                  <Select value={targetLucrareId} onValueChange={setTargetLucrareId} disabled={!targetOfertaId || targetLucrari.length === 0}>
                    <SelectTrigger className="h-8 bg-background text-xs font-semibold">
                      <SelectValue placeholder="Selectează lucrarea" />
                    </SelectTrigger>
                    <SelectContent>
                      {targetLucrari.map((lucrare) => (
                        <SelectItem key={lucrare.id} value={String(lucrare.id)}>
                          {lucrare.nume || `Lucrare ${lucrare.id}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div className="ml-auto flex items-center gap-2 shrink-0">
              <Button variant="outline" className="h-8 text-sm" onClick={() => setOpen(false)}>
                Anulează
              </Button>

              <Button onClick={handleSave} className={`h-8 gap-2 w-40 text-sm text-white ${dialogMeta.submitClass}`}>
                <FontAwesomeIcon icon={faCheck} />
                {dialogMeta.submitLabel}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
