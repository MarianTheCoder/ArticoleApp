/* eslint-disable react/prop-types */
import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faFolder, faFolderOpen, faListCheck, faPenToSquare } from "@fortawesome/free-solid-svg-icons";

import OverflowTooltip from "@/components/ui/OverflowTooltip";
import { toast } from "sonner";
import { OferteRetetaClassValue, OferteRetetaCodeValue } from "./OferteRetetaCodeClassDisplay";

const MAX_COLUMN_VALUE_LENGTH = 255;
const DEFAULT_VISIBLE_COLUMNS = {
  elemente: true,
  cod: true,
  clasa: true,
  denumire: true,
  descriere: true,
  descriereFr: true,
  unitate: true,
  cantitate: true,
};
const MENU_ITEM_CLASS = "text-sm py-1.5 pl-7 pr-2 text-foreground";

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
    .toFixed(2)
    .replace(".", ",");
};

const normalizeDecimalInput = (value) => {
  return String(value || "").replace(".", ",");
};

const parseDecimalInput = (value) => {
  return Number(String(value || "0").replace(",", "."));
};

export default function OferteEditRetetaDialog({ open, setOpen, retete = [], dynamicColumns = [], displayLang = "RO", onConfirm }) {
  const [rows, setRows] = useState([]);
  const [visibleColumns, setVisibleColumns] = useState(DEFAULT_VISIBLE_COLUMNS);

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
          descriere: reteta.descriere || "",
          descriereFr: reteta.descriere_fr || "",
          coloaneMap,
        };
      }),
    );
  }, [open, retete, dynamicColumns]);

  const hasFrenchRows = useMemo(() => {
    return rows.some((row) => row.reteta?.limba === "FR" || row.descriereFr);
  }, [rows]);

  const showCol = (key) => {
    if (key === "descriereFr" && !hasFrenchRows) return false;
    return visibleColumns?.[key] !== false;
  };

  const toggleColumn = (key) => {
    setVisibleColumns((prev) => ({
      ...prev,
      [key]: !(prev?.[key] !== false),
    }));
  };

  const updateRow = (id, updater) => {
    setRows((prev) => prev.map((row) => (Number(row.id) === Number(id) ? updater(row) : row)));
  };

  const handleSave = async () => {
    const payload = rows.map((row) => {
      const cantitate = parseDecimalInput(row.cantitate);

      return {
        id: row.reteta.id,
        cantitate_lucrare: cantitate,
        descriere: row.descriere.trim() || null,
        descriere_fr: row.descriereFr.trim() || null,
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

    await onConfirm?.(payload);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="keepSelection max-w-[90vw] h-[72vh] p-0 gap-0 flex flex-col" style={{ animationDuration: "0ms", transitionDuration: "0ms" }}>
        <DialogHeader className="rounded-t-lg px-4 py-3 border-b bg-muted shrink-0">
          <div className="flex items-center justify-between gap-4 min-w-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-10 w-10 rounded-lg border-2 border-emerald-600/50 bg-emerald-600/15 flex items-center justify-center shrink-0">
                <FontAwesomeIcon icon={faPenToSquare} className="text-low text-xl" />
              </div>

              <DialogTitle className="text-left flex flex-col gap-0.5 min-w-0">
                <span className="text-xs text-low font-black uppercase tracking-wider">Editare</span>

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
                  Descriere RO
                </DropdownMenuCheckboxItem>
                {hasFrenchRows && (
                  <DropdownMenuCheckboxItem className={MENU_ITEM_CLASS} checked={showCol("descriereFr")} onSelect={(e) => e.preventDefault()} onCheckedChange={() => toggleColumn("descriereFr")}>
                    Descriere FR
                  </DropdownMenuCheckboxItem>
                )}
                <DropdownMenuCheckboxItem className={MENU_ITEM_CLASS} checked={showCol("unitate")} onSelect={(e) => e.preventDefault()} onCheckedChange={() => toggleColumn("unitate")}>
                  Unitate
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem className={MENU_ITEM_CLASS} checked={showCol("cantitate")} onSelect={(e) => e.preventDefault()} onCheckedChange={() => toggleColumn("cantitate")}>
                  Cantitate
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
                  {showCol("descriere") && <TableHead className="p-1 text-left align-middle text-sm font-bold text-foreground w-[18rem] min-w-[18rem]">Descriere RO</TableHead>}
                  {showCol("descriereFr") && <TableHead className="p-1 text-left align-middle text-sm font-bold text-foreground w-[18rem] min-w-[18rem]">Descriere FR</TableHead>}
                  {showCol("unitate") && <TableHead className="p-1 text-center align-middle text-sm font-bold text-foreground w-[4.5rem] min-w-[4.5rem]">U.M.</TableHead>}
                  {showCol("cantitate") && <TableHead className="p-1 text-center align-middle text-sm font-bold text-foreground w-[7rem] min-w-[7rem]">Qty</TableHead>}
                </TableRow>
              </TableHeader>

              <TableBody>
                {rows.map((row) => {
                  const reteta = row.reteta;

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
                          <Textarea
                            className="h-9 min-h-9 resize-none border-primary/70 bg-background p-1 text-xs font-semibold leading-tight"
                            value={row.descriere}
                            onChange={(e) => {
                              updateRow(row.id, (current) => ({
                                ...current,
                                descriere: e.target.value,
                              }));
                            }}
                          />
                        </TableCell>
                      )}

                      {showCol("descriereFr") && (
                        <TableCell className="border-r border-border p-1 align-middle text-xs">
                          <Textarea
                            className="h-9 min-h-9 resize-none border-primary/70 bg-background p-1 text-xs font-semibold leading-tight"
                            value={row.descriereFr}
                            onChange={(e) => {
                              updateRow(row.id, (current) => ({
                                ...current,
                                descriereFr: e.target.value,
                              }));
                            }}
                          />
                        </TableCell>
                      )}

                      {showCol("unitate") && (
                        <TableCell className="border-r border-border p-1 text-center align-middle text-xs">
                          <span className="text-xs font-semibold text-foreground whitespace-nowrap">{reteta.unitate_masura || "—"}</span>
                        </TableCell>
                      )}

                      {showCol("cantitate") && (
                        <TableCell className="relative border-r border-border p-0 text-center align-middle text-xs">
                          <Input
                            className="absolute inset-0 h-full w-full rounded-none border-0 p-0 text-center text-sm font-black transition-colors hover:border hover:border-primary hover:bg-primary/25 focus-visible:ring-0"
                            value={row.cantitate}
                            onChange={(e) => {
                              const val = normalizeDecimalInput(e.target.value);

                              if (/^\d{0,9},?\d{0,2}$/.test(val)) {
                                updateRow(row.id, (current) => ({
                                  ...current,
                                  cantitate: val,
                                }));
                              }
                            }}
                          />
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
          <div className="w-full flex items-center justify-end gap-2">
            <Button variant="outline" className="h-8 text-sm" onClick={() => setOpen(false)}>
              Anulează
            </Button>

            <Button onClick={handleSave} className="h-8 gap-2 w-40 text-sm">
              <FontAwesomeIcon icon={faCheck} />
              Salvează
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
