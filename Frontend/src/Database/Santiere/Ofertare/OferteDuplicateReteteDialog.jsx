import React, { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

import { Tooltip, TooltipArrow, TooltipContent, TooltipTrigger } from "@radix-ui/react-tooltip";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faCopy, faQuestion } from "@fortawesome/free-solid-svg-icons";

import OverflowTooltip from "@/components/ui/OverflowTooltip";
import { toast } from "sonner";
import OferteElementeTooltop from "./components/OferteElementeTooltop";

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
        name: String(item?.name || item?.nume || "").trim(),
        value: String(item?.value || "").trim(),
      }))
      .filter((item) => item.name);
  }

  if (parsed && typeof parsed === "object") {
    return Object.values(parsed)
      .map((item) => {
        if (!item || typeof item !== "object") return null;

        return {
          name: String(item.name || item.nume || "").trim(),
          value: String(item.value || "").trim(),
        };
      })
      .filter(Boolean)
      .filter((item) => item.name);
  }

  return [];
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

export default function OferteDuplicateReteteDialog({ open, setOpen, retete = [], dynamicColumns = [], onConfirm }) {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    if (!open) return;

    setRows(
      (retete || []).map((reteta) => {
        const coloaneValori = normalizeColoaneValori(reteta.coloane_valori);
        const coloaneMap = {};

        dynamicColumns.forEach((col) => {
          const found = coloaneValori.find((item) => item.name.toLowerCase() === col.nume.toLowerCase());
          coloaneMap[col.id] = found?.value || "";
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
          name: col.nume,
          value: String(row.coloaneMap?.[col.id] || "").trim(),
        })),
      };
    });

    const invalid = payload.find((item) => !Number.isFinite(item.cantitate_lucrare) || item.cantitate_lucrare <= 0);

    if (invalid) {
      toast.warning("Cantitatea trebuie să fie mai mare de 0.", { position: "top-right" });
      return;
    }

    await onConfirm?.(payload);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="keepSelection max-w-[90vw] h-[72vh] p-0 gap-0 flex flex-col" style={{ animationDuration: "0ms", transitionDuration: "0ms" }}>
        <DialogHeader className="px-6 py-4 rounded-t-lg border-b bg-muted shrink-0">
          <div className="flex items-center justify-between gap-4">
            <DialogTitle className="text-left flex items-center gap-3 min-w-0">
              <div className="h-10 w-10 rounded-lg bg-sky-600/10 border border-sky-600/30 text-sky-600 flex items-center justify-center shrink-0">
                <FontAwesomeIcon icon={faCopy} />
              </div>

              <span className="text-xl font-black text-foreground truncate">
                Dublează {rows.length} {rows.length === 1 ? "rețetă" : "rețete"}
              </span>
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-auto bg-card p-5">
          <div className="rounded-md border overflow-auto">
            <Table className="min-w-full table-fixed caption-bottom text-left border-collapse border-spacing-0">
              <TableHeader className="sticky top-0 z-50 shadow-sm bg-muted">
                <TableRow className="h-12 bg-muted  hover:bg-muted [&>th]:bg-muted [&>th]:border-0 [&>th]:shadow-none">
                  <TableHead className="text-center px-2 w-[7rem] min-w-[7rem]">Elemente</TableHead>
                  <TableHead className="text-center px-2 w-[8rem] min-w-[8rem]">Cod</TableHead>
                  <TableHead className="text-center px-2 w-[8rem] min-w-[8rem]">Clasa</TableHead>
                  <TableHead className="px-3 w-[12rem] min-w-[12rem]">Denumire</TableHead>
                  <TableHead className="px-3 w-[18rem] min-w-[18rem]">Descriere</TableHead>

                  {dynamicColumns.map((col) => (
                    <TableHead key={col.id} className="text-center px-1.5 w-[8rem] min-w-[8rem]">
                      <OverflowTooltip text={col.nume} align="center" className=" font-bold text-center" maxLines={1} />
                    </TableHead>
                  ))}

                  <TableHead className="text-center px-2 w-[7rem] min-w-[7rem]">Cost</TableHead>
                  <TableHead className="text-center px-2 w-[8rem] min-w-[8rem]">Cantitate</TableHead>
                  <TableHead className="text-center px-2 w-[8rem] min-w-[8rem]">Total</TableHead>

                  <TableHead className="text-center px-2 w-[10rem] min-w-[10rem]">
                    <div className="flex items-center justify-center gap-1.5">
                      <HeaderHelp text="Dacă este bifat, elementele care au variantă vor fi refăcute ca definiții din rețeta/catalogul original. Elementele care sunt deja definiții rămân copiate ca snapshot existent." />

                      <span className="text-xs leading-tight">Doar definiții</span>

                      <Button variant="outline" onClick={handleToggleAllOnlyDefinitions} className="h-6 w-6 p-0 shrink-0">
                        <FontAwesomeIcon className="text-[10px]" icon={faCheck} />
                      </Button>
                    </div>
                  </TableHead>

                  <TableHead className="text-center px-2 w-[10rem] min-w-[10rem]">
                    <div className="flex items-center justify-center gap-1.5">
                      <HeaderHelp text="Funcționează doar când este bifat „Doar definiții”. Dacă este bifat, costurile elementelor din interior se iau din rețeta originală actualizată; dacă nu, se păstrează costurile snapshot din oferta dublată." />

                      <span className="text-xs leading-tight">Rescrie Cost</span>

                      <Button variant="outline" onClick={handleToggleAllRewriteCosts} disabled={rowsWithOnlyDefinitions.length === 0} className="h-6 w-6 p-0 shrink-0 disabled:opacity-40">
                        <FontAwesomeIcon className="text-[10px]" icon={faCheck} />
                      </Button>
                    </div>
                  </TableHead>

                  <TableHead className="text-center px-2 w-[10rem] min-w-[10rem]">
                    <div className="flex items-center justify-center gap-1.5">
                      <HeaderHelp text="Funcționează doar când este bifat „Doar definiții”. Dacă este bifat, cantitățile elementelor din interior se iau din rețeta originală actualizată; dacă nu, se păstrează cantitățile snapshot din oferta dublată." />

                      <span className="text-xs leading-tight">Rescrie Qty</span>

                      <Button variant="outline" onClick={handleToggleAllRewriteQuantities} disabled={rowsWithOnlyDefinitions.length === 0} className="h-6 w-6 p-0 shrink-0 disabled:opacity-40">
                        <FontAwesomeIcon className="text-[10px]" icon={faCheck} />
                      </Button>
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {rows.map((row) => {
                  const reteta = row.reteta;
                  const cost = getRetetaCost(reteta);
                  const cantitate = parseDecimalInput(row.cantitate);
                  const total = cost * (Number.isFinite(cantitate) ? cantitate : 0);

                  return (
                    <TableRow key={row.id} className="h-16 border-b hover:bg-accent">
                      <TableCell className="text-center px-2 py-1">
                        <OferteElementeTooltop reteta={reteta} />
                      </TableCell>

                      <TableCell className="text-center px-2 py-1">
                        <span className="text-sm font-bold text-foreground whitespace-nowrap">{reteta.cod_reteta}</span>
                      </TableCell>

                      <TableCell className="text-center px-2 py-1">
                        <Badge variant="secondary" className="text-xs bg-card border-border font-medium max-w-full truncate">
                          {reteta.clasa_reteta}
                        </Badge>
                      </TableCell>

                      <TableCell className="px-3 py-1">
                        <OverflowTooltip align="left" text={reteta.denumire || "—"} className="text-sm whitespace-pre-wrap text-foreground leading-snug" maxLines={2} />
                      </TableCell>

                      <TableCell className="px-3 py-1">
                        {reteta.descriere ? (
                          <OverflowTooltip align="left" text={reteta.descriere} className="text-sm whitespace-pre-wrap text-foreground leading-snug" maxLines={2} />
                        ) : (
                          <span className="text-sm text-muted-foreground/40 italic">—</span>
                        )}
                      </TableCell>

                      {dynamicColumns.map((col) => (
                        <TableCell key={col.id} className="text-center px-1.5 py-1">
                          <Input
                            className="h-8 w-full border-primary border-2 min-w-[7rem] text-center text-xs font-semibold px-2"
                            maxLength={15}
                            value={row.coloaneMap?.[col.id] || ""}
                            onChange={(e) => {
                              const value = e.target.value;

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
                      ))}

                      <TableCell className="text-center px-2 py-1">
                        <span className="text-sm font-bold text-foreground whitespace-nowrap">{formatNumber(cost)}</span>
                      </TableCell>

                      <TableCell className="text-center px-2 py-1">
                        <Input
                          className="h-8 w-24 mx-auto border-primary text-center text-xs font-black border-2 px-2"
                          value={row.cantitate}
                          onChange={(e) => {
                            const val = normalizeDecimalInput(e.target.value);

                            if (/^\d{0,9}\,?\d{0,3}$/.test(val)) {
                              updateRow(row.id, (current) => ({
                                ...current,
                                cantitate: val,
                              }));
                            }
                          }}
                        />
                      </TableCell>

                      <TableCell className="text-center px-2 py-1">
                        <span className="text-sm tracking-wide font-black whitespace-nowrap">{formatNumber(total)}</span>
                      </TableCell>

                      <TableCell className="text-left px-2 py-1">
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

                      <TableCell className="text-left px-2 py-1">
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

                      <TableCell className="text-left px-2 py-1">
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
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t bg-muted/20 shrink-0">
          <div className="w-full flex items-center justify-between gap-4">
            <div className="rounded-md border bg-card px-4 py-2 flex items-center gap-3">
              <span className="text-xs uppercase tracking-wider font-black text-foreground">Total dublare</span>
              <span className="text-lg font-black text-primary">{formatNumber(totalGeneral)}</span>
            </div>

            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Anulează
              </Button>

              <Button onClick={handleSave} className="gap-2 w-48 bg-sky-600 hover:bg-sky-700 text-white">
                <FontAwesomeIcon icon={faCheck} />
                Dublează
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
