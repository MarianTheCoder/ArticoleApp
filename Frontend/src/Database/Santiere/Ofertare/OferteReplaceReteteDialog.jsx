/* eslint-disable react/prop-types */
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faDatabase, faFolderOpen, faListCheck, faRightLeft, faTrash } from "@fortawesome/free-solid-svg-icons";

import OverflowTooltip from "@/components/ui/OverflowTooltip";
import ReteteMainPage from "@/Database/Retete/ReteteMainPage";
import { toast } from "sonner";
import { OferteRetetaClassValue, OferteRetetaCodeValue } from "./components/OferteRetetaCodeClassDisplay";

const MAX_COLUMN_VALUE_LENGTH = 255;
const DEFAULT_VISIBLE_COLUMNS = {
  elemente: true,
  cod: true,
  clasa: true,
  denumire: true,
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
    .toFixed(3)
    .replace(".", ",");
};

const normalizeDecimalInput = (value) => {
  return String(value || "").replace(".", ",");
};

const parseDecimalInput = (value) => {
  return Number(String(value || "0").replace(",", "."));
};

export default function OferteReplaceReteteDialog({ open, setOpen, retete = [], dynamicColumns = [], displayLang = "RO", onConfirm }) {
  const { limbaUser } = useParams();
  const [rows, setRows] = useState([]);
  const [visibleColumns, setVisibleColumns] = useState(DEFAULT_VISIBLE_COLUMNS);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [selectedReteta, setSelectedReteta] = useState(null);

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
        };
      }),
    );
    setSelectedReteta(null);
  }, [open, retete, dynamicColumns]);

  const showCol = (key) => visibleColumns?.[key] !== false;

  const toggleColumn = (key) => {
    setVisibleColumns((prev) => ({
      ...prev,
      [key]: !(prev?.[key] !== false),
    }));
  };

  const updateRow = (id, updater) => {
    setRows((prev) => prev.map((row) => (Number(row.id) === Number(id) ? updater(row) : row)));
  };

  const handleSelectReteta = (reteta) => {
    setSelectedReteta(reteta);
    setSelectorOpen(false);
  };

  const handleSave = async () => {
    if (!selectedReteta?.id) {
      toast.warning("Selectează rețeta cu care vrei să înlocuiești.", { position: "top-right" });
      return;
    }

    const payloadRows = rows.map((row) => {
      const cantitate = parseDecimalInput(row.cantitate);

      return {
        oferta_reteta_id: row.reteta.id,
        cantitate_lucrare: cantitate,
        coloane_valori: dynamicColumns.map((col) => ({
          id: col.id,
          name: col.nume,
          value: String(row.coloaneMap?.[col.id] || "").trim(),
        })),
      };
    });

    const invalid = payloadRows.find((item) => !Number.isFinite(item.cantitate_lucrare) || item.cantitate_lucrare < 0);

    if (invalid) {
      toast.warning("Cantitatea trebuie să fie minim 0.", { position: "top-right" });
      return;
    }

    await onConfirm?.({
      original_reteta_id: selectedReteta.id,
      items: payloadRows,
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="keepSelection max-w-[90vw] h-[72vh] p-0 gap-0 flex flex-col" style={{ animationDuration: "0ms", transitionDuration: "0ms" }}>
          <DialogHeader className="rounded-t-lg px-4 py-3 border-b bg-muted shrink-0">
            <div className="flex items-center justify-between gap-4 min-w-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-lg border-2 border-pink-600/50 bg-pink-600/15 flex items-center justify-center shrink-0">
                  <FontAwesomeIcon icon={faRightLeft} className="text-pink-600 dark:text-pink-400 text-xl" />
                </div>

                <DialogTitle className="text-left flex flex-col gap-0.5 min-w-0">
                  <span className="text-xs text-pink-600 dark:text-pink-400 font-black uppercase tracking-wider">Înlocuire</span>

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
                            <FontAwesomeIcon icon={faFolderOpen} className="text-sm" />
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
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>

          <DialogFooter className="px-4 py-3 border-t bg-muted/20 shrink-0">
            <div className="w-full flex items-center justify-between gap-3">
              <div className="min-w-0 flex items-center gap-2">
                {selectedReteta ? (
                  <>
                    <Badge variant="outline" className="shrink-0 max-w-[12rem] border-pink-600/50 bg-pink-600/10 font-black text- dark:text-pink-400">
                      <OferteRetetaCodeValue reteta={selectedReteta} displayLang={displayLang} className="text-center text-xs text-pink-700 dark:text-pink-400" withTooltip={false} />
                    </Badge>
                    <Badge variant="secondary" className="shrink-0 max-w-[13rem] bg-card border-border font-medium">
                      <OferteRetetaClassValue reteta={selectedReteta} displayLang={displayLang} align="center" className="text-center text-xs" />
                    </Badge>
                    <OverflowTooltip text={selectedReteta.denumire || "—"} maxLines={1} align="left" className="text-sm font-bold text-foreground" />
                    <Button type="button" variant="destructive" className="h-8 gap-2 text-sm" onClick={() => setSelectedReteta(null)}>
                      <FontAwesomeIcon icon={faTrash} />
                      Șterge selecția
                    </Button>
                  </>
                ) : (
                  <span className="text-sm font-semibold italic text-muted-foreground">Nu ai ales încă rețeta înlocuitoare.</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" className="h-8 gap-2 text-sm" onClick={() => setSelectorOpen(true)}>
                  <FontAwesomeIcon icon={faDatabase} />
                  Alege rețeta
                </Button>

                <Button variant="outline" className="h-8 text-sm" onClick={() => setOpen(false)}>
                  Anulează
                </Button>

                <Button onClick={handleSave} disabled={!selectedReteta} className="h-8 gap-2 w-44 bg-pink-600 text-sm text-white hover:bg-pink-700 disabled:opacity-50">
                  <FontAwesomeIcon icon={faRightLeft} />
                  Înlocuiește
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={selectorOpen} onOpenChange={setSelectorOpen}>
        <DialogContent className="max-w-[90vw] h-[95vh] rounded-md p-0 gap-0 flex flex-col">
          <div className="shrink-0 bg-muted rounded-t-md px-6 py-2 border-b border-border flex items-center justify-between gap-6">
            <div className="flex items-center gap-4 min-w-0">
              <div className="h-14 w-14 rounded-xl bg-pink-600/15 border border-pink-600/40 flex items-center justify-center shrink-0">
                <FontAwesomeIcon icon={faDatabase} className="text-pink-600 dark:text-pink-400 text-2xl" />
              </div>

              <div className="min-w-0">
                <p className="text-sm font-bold uppercase tracking-widest leading-none mb-1 text-pink-600 dark:text-pink-400">Înlocuire</p>
                <h2 className="text-xl font-bold text-foreground leading-tight">Alege rețeta înlocuitoare</h2>
              </div>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-hidden">
            {selectorOpen && <ReteteMainPage isSelectionMode isEmbedded selectedRetetaId={selectedReteta?.id || null} onSelectReteta={handleSelectReteta} lockedLang={limbaUser} />}
          </div>

          <div className="shrink-0 flex items-center justify-end gap-2 border-t bg-muted/20 px-4 py-3">
            <Button type="button" variant="outline" className="h-8 text-sm" onClick={() => setSelectorOpen(false)}>
              Anulează
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
