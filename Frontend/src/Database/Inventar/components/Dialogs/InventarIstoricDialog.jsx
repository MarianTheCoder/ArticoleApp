/* eslint-disable react/prop-types */
import { Fragment, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeftLong, faArrowRightLong, faClockRotateLeft, faLanguage, faReceipt } from "@fortawesome/free-solid-svg-icons";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import ImagePreviewTooltip from "@/components/ui/ImagePreviewTooltip";
import OverflowTooltip from "@/components/ui/OverflowTooltip";
import { useInventarTranzactie, useInventarTranzactii } from "@/hooks/Database/useInventar";
import photoAPI from "@/api/photoAPI";
import { cn } from "@/lib/utils";

const EMPTY = "—";

const formatNumber = (value) => {
  const numberValue = Number(value || 0);
  return Number.isFinite(numberValue) ? numberValue.toFixed(2).replace(".", ",") : "0,00";
};

const getStockNumber = (...values) => {
  for (const value of values) {
    const numberValue = Number(value);
    if (Number.isFinite(numberValue)) return numberValue;
  }

  return 0;
};

const getDateParts = (value) => {
  if (!value) return { key: "unknown", label: "Fără dată", time: EMPTY };
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { key: "unknown", label: "Fără dată", time: EMPTY };

  return {
    key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`,
    label: date.toLocaleDateString("ro-RO", { weekday: "long", day: "2-digit", month: "long", year: "numeric" }),
    time: date.toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" }),
  };
};

const getInitials = (name) =>
  String(name || "S")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const getPhotoSrc = (photoUrl) => (photoUrl ? `${photoAPI}/${photoUrl}` : null);

const getVariantTitle = (variant, language) => {
  const parent = variant?.parent || {};
  return language === "FR" ? parent.denumire_fr || parent.denumire || "Ressource" : parent.denumire || parent.denumire_fr || "Resursă";
};

const getLineTitle = (line, language) => {
  return language === "FR" ? line?.definitie_denumire_fr || line?.definitie_denumire || "Ressource" : line?.definitie_denumire || line?.definitie_denumire_fr || "Resursă";
};

const getVariantCode = (variant) => {
  const sub = variant?.sub || {};
  return sub.cod_specific || sub.cod || "";
};

const getLocationTone = (tip) => {
  if (tip === "inventar") return "text-sky-700 dark:text-sky-300";
  if (tip === "santier") return "text-foreground";
  if (tip === "user") return "text-violet-700 dark:text-violet-300";
  if (tip === "cumparare") return "text-amber-700 dark:text-amber-300";
  return "text-foreground";
};

const groupRowsByDate = (rows) => {
  const groups = [];
  const groupMap = new Map();

  rows.forEach((row) => {
    const parts = getDateParts(row.data_tranzactie);
    if (!groupMap.has(parts.key)) {
      const group = { key: parts.key, label: parts.label, rows: [] };
      groupMap.set(parts.key, group);
      groups.push(group);
    }

    groupMap.get(parts.key).rows.push({ ...row, timeLabel: parts.time });
  });

  return groups;
};

const isSameLocation = (rowLocation, location) => rowLocation?.tip === location?.tip && String(rowLocation?.id || "") === String(location?.id || "");

const getLocationDelta = (row, location) => {
  if (!location?.tip || !location?.id) return 0;
  const quantity = Number(row?.cantitate || 0);
  if (isSameLocation(row?.destinatie, location)) return quantity;
  if (isSameLocation(row?.sursa, location)) return -quantity;
  return 0;
};

const addAfterQuantity = (rows, location, currentStock) => {
  if (!location?.tip || !location?.id) return rows.map((row) => ({ ...row, cantitateDupa: null, locatieDelta: 0 }));

  let balanceAfter = Number(currentStock || 0);

  return rows.map((row) => {
    const locatieDelta = getLocationDelta(row, location);
    const nextRow = { ...row, cantitateDupa: balanceAfter, locatieDelta };
    balanceAfter -= locatieDelta;
    return nextRow;
  });
};

const getLocationFilterKey = (location) => `${location?.tip || ""}:${location?.id ?? ""}:${location?.label || ""}`;
const getPersonFilterKey = (person) => (person?.id ? String(person.id) : person?.name || "");

const getLocationTypeLabel = (tip) => {
  if (tip === "inventar") return "Magazie";
  if (tip === "cumparare") return "Cumpărare";
  if (tip === "santier") return "Șantier";
  if (tip === "user") return "Utilizator";
  return tip || EMPTY;
};

const getFilteredRows = (rows, filters) =>
  rows.filter((row) => {
    if (filters.source !== "all" && getLocationFilterKey(row.sursa) !== filters.source) return false;
    if (filters.destination !== "all" && getLocationFilterKey(row.destinatie) !== filters.destination) return false;
    if (filters.createdBy !== "all" && getPersonFilterKey(row.created_by) !== filters.createdBy) return false;
    if (filters.assigned !== "all" && getPersonFilterKey(row.assigned) !== filters.assigned) return false;
    return true;
  });


function HistoryRow({ row, language, isCentered, onOpen }) {
  const quantityClass = row.locatieDelta > 0 ? "text-emerald-600 dark:text-emerald-300" : row.locatieDelta < 0 ? "text-destructive" : "text-primary";

  // Vizualizare centrată (șantier): șantierul mereu în DREAPTA, contrapartea (magazie/etc.) în stânga.
  // Verde spre dreapta = intră în șantier (primește); roșu spre stânga = iese din șantier (dă).
  const receives = row.locatieDelta > 0;
  const anchorSide = receives ? row.destinatie : row.sursa;
  const counterparty = receives ? row.sursa : row.destinatie;

  const leftLoc = isCentered ? counterparty : row.sursa;
  const rightLoc = isCentered ? anchorSide : row.destinatie;
  const arrowIcon = isCentered ? (receives ? faArrowRightLong : faArrowLeftLong) : faArrowRightLong;
  const arrowTone = isCentered ? (receives ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300" : "border-destructive/40 bg-destructive/10 text-destructive") : "border-primary/40 bg-primary/10 text-primary";
  const createdByName = row.created_by?.name || "Sistem";
  const assignedName = row.assigned?.name || "Neasignat";

  return (
    <TableRow className="h-12 cursor-pointer hover:bg-primary/5" onClick={() => onOpen(row.tranzactie_id)}>
      <TableCell className="px-3 py-2 text-center text-sm font-black text-foreground">{row.timeLabel}</TableCell>
      <TableCell className="px-3 py-2 text-center">
        <Badge variant="outline" className="h-7 px-2 text-sm font-black">
          #{row.numar_tranzactie || row.tranzactie_id}
        </Badge>
      </TableCell>
      <TableCell className="px-3 py-2">
        <OverflowTooltip text={getLineTitle(row, language)} align="left" className="min-w-0 truncate text-sm font-bold text-foreground" maxLines={1} textSize="sm" />
      </TableCell>
      <TableCell className="px-3 py-2">
        <OverflowTooltip text={row.furnizor_denumire || EMPTY} align="left" className="min-w-0 truncate text-sm font-semibold text-foreground" maxLines={1} textSize="sm" />
      </TableCell>
      <TableCell className="px-3 py-2">
        <OverflowTooltip text={row.marca_denumire || EMPTY} align="left" className="min-w-0 truncate text-sm font-semibold text-foreground" maxLines={1} textSize="sm" />
      </TableCell>

      {/* Persoane: inițiat de + persoană asignată (fără săgeată) */}
      <TableCell className="px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <ImagePreviewTooltip
            src={getPhotoSrc(row.created_by?.photo_url)}
            alt={createdByName}
            fallback={<span className="text-sm font-black text-muted-foreground">{getInitials(createdByName)}</span>}
            containerClassName="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted"
            previewMaxHeight="max-h-[22rem]"
            previewMaxWidth="max-w-[22rem]"
            ringColor="hover:ring-primary"
          />
          <OverflowTooltip text={createdByName} align="left" className="min-w-0 truncate text-sm font-bold text-foreground" maxLines={1} textSize="sm" />
        </div>
      </TableCell>
      <TableCell className="px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <ImagePreviewTooltip
            src={getPhotoSrc(row.assigned?.photo_url)}
            alt={assignedName}
            fallback={<span className="text-sm font-black text-muted-foreground">{getInitials(assignedName)}</span>}
            containerClassName="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted"
            previewMaxHeight="max-h-[22rem]"
            previewMaxWidth="max-w-[22rem]"
            ringColor="hover:ring-primary"
          />
          <OverflowTooltip text={assignedName} align="left" className="min-w-0 truncate text-sm font-bold text-foreground" maxLines={1} textSize="sm" />
        </div>
      </TableCell>

      {/* Mișcare: ambele locații + săgeata, într-un singur card */}
      <TableCell className="px-3 py-2 align-middle">
        <div className="flex min-h-10 items-center gap-2 rounded-md border bg-card px-3 py-1">
          <div className="flex min-w-0 flex-1 items-center">
            <div className="flex max-w-full min-w-0 items-center gap-1.5">
              {leftLoc?.tip === "santier" ? <span className="h-4 w-4 shrink-0 self-center rounded-sm border border-border" style={{ backgroundColor: leftLoc?.color || "currentColor" }} /> : null}
              <OverflowTooltip text={leftLoc?.label || EMPTY} align="left" className={cn("min-w-0 truncate text-sm font-black", getLocationTone(leftLoc?.tip))} maxLines={1} textSize="sm" />
            </div>
          </div>
          <div className="flex items-center justify-center">
            <span className={cn("flex h-8 w-8 items-center justify-center rounded-full border shadow-sm", arrowTone)}>
              <FontAwesomeIcon icon={arrowIcon} className="text-sm" />
            </span>
          </div>
          <div className="flex min-w-0 flex-1 items-center justify-end">
            <div className="flex max-w-full min-w-0 items-center gap-1.5">
              {rightLoc?.tip === "santier" ? <span className="h-4 w-4 shrink-0 self-center rounded-sm border border-border" style={{ backgroundColor: rightLoc?.color || "currentColor" }} /> : null}
              <OverflowTooltip text={rightLoc?.label || EMPTY} align="left" className={cn("min-w-0 truncate text-sm font-black", getLocationTone(rightLoc?.tip))} maxLines={1} textSize="sm" />
            </div>
          </div>
        </div>
      </TableCell>

      <TableCell className="px-3 py-2 text-center">
        <Badge variant="outline" className="h-7 px-2 text-sm font-black">
          {row.unitate_masura || EMPTY}
        </Badge>
      </TableCell>
      <TableCell className={cn("px-3 py-2 text-center text-base font-black", quantityClass)}>{formatNumber(row.cantitate)}</TableCell>
      <TableCell className="px-3 py-2 text-center text-base font-black text-foreground">{row.cantitateDupa === null ? EMPTY : formatNumber(row.cantitateDupa)}</TableCell>
    </TableRow>
  );
}

function TransactionDetailsDialog({ open, setOpen, transactionId, language }) {
  const { data, isLoading } = useInventarTranzactie(transactionId);
  const transaction = data?.tranzactie || null;
  const lines = Array.isArray(data?.lines) ? data.lines : [];
  const first = lines[0] || {};
  const transactionDate = transaction?.data_tranzactie ? getDateParts(transaction.data_tranzactie) : null;
  const createdByName = transaction?.created_by?.name || "Sistem";
  const responsibleName = transaction?.responsabil?.name || "Fără responsabil";
  const assignedName = transaction?.assigned?.name || "Neasignat";

  return (
    <Dialog open={!!open} onOpenChange={setOpen}>
      <DialogContent className="keepSelection flex max-h-[82vh] max-w-[50rem] flex-col gap-0 p-0">
        <DialogHeader className="shrink-0 rounded-t-md border-b bg-muted px-5 py-4">
          <div className="flex min-w-0 items-center gap-3 pr-10">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border-2 border-primary/50 bg-primary/10 text-primary">
              <FontAwesomeIcon icon={faReceipt} className="text-xl" />
            </span>
            <DialogTitle className="flex min-w-0 flex-col gap-0.5 text-left">
              <span className="text-lg font-black text-foreground">Tranzacția #{transaction?.numar_tranzactie || transactionId}</span>
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-auto p-5">
          {isLoading ? (
            <div className="flex h-40 items-center justify-center text-sm font-semibold text-muted-foreground">Se încarcă tranzacția...</div>
          ) : lines.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-sm font-semibold text-muted-foreground">Nu există linii pentru tranzacție.</div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-md border bg-card px-3 py-2">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex min-w-0 flex-col leading-tight">
                    <span className="text-sm font-black uppercase tracking-wide text-muted-foreground">Data</span>
                    <span className="truncate text-base font-black text-foreground">{transactionDate?.label || EMPTY}</span>
                  </div>
                  <Separator orientation="vertical" className="h-9" />
                  <div className="flex min-w-0 flex-col leading-tight">
                    <span className="text-sm font-black uppercase tracking-wide text-muted-foreground">Ora</span>
                    <span className="text-base font-black text-primary">{transactionDate?.time || EMPTY}</span>
                  </div>
                </div>
                <div className="flex min-w-[13rem] max-w-[19rem] items-center gap-2">
                  <ImagePreviewTooltip
                    src={getPhotoSrc(transaction?.created_by?.photo_url)}
                    alt={createdByName}
                    fallback={<span className="text-sm font-black text-muted-foreground">{getInitials(createdByName)}</span>}
                    containerClassName="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted"
                    previewMaxHeight="max-h-[22rem]"
                    previewMaxWidth="max-w-[22rem]"
                    ringColor="hover:ring-primary"
                  />
                  <div className="flex min-w-0 flex-col leading-tight">
                    <span className="text-sm font-semibold text-muted-foreground">Inițiat de</span>
                    <OverflowTooltip text={createdByName} align="left" className="min-w-0 truncate text-sm font-black text-foreground" maxLines={1} textSize="sm" />
                  </div>
                </div>
              </div>

              {/* Flux: sursă -> destinație, aliniat stânga în detaliul tranzacției. */}
              <div className="flex flex-wrap items-end justify-start gap-x-3 gap-y-2">
                <div className="min-w-0">
                  <div className="mb-1.5 text-xs font-black uppercase tracking-wide text-muted-foreground">Sursă</div>
                  <div className="inline-flex max-w-[18rem] items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5">
                    {first.sursa?.tip === "santier" ? <span className="h-4 w-4 shrink-0 rounded-sm border border-border" style={{ backgroundColor: first.sursa?.color || "currentColor" }} /> : null}
                    <span className={cn("min-w-0 truncate text-base font-black", getLocationTone(first.sursa?.tip))} title={first.sursa?.label || EMPTY}>
                      {first.sursa?.label || EMPTY}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-center">
                  <div className="mb-1.5 select-none text-xs font-black uppercase tracking-wide text-transparent">·</div>
                  <span className="flex h-9 w-9 items-center justify-center rounded-full border border-primary/40 bg-primary/10 text-primary shadow-sm">
                    <FontAwesomeIcon icon={faArrowRightLong} className="text-base" />
                  </span>
                </div>
                <div className="min-w-0">
                  <div className="mb-1.5 text-xs font-black uppercase tracking-wide text-muted-foreground">Destinație</div>
                  <div className="inline-flex max-w-[18rem] items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5">
                    {first.destinatie?.tip === "santier" ? <span className="h-4 w-4 shrink-0 rounded-sm border border-border" style={{ backgroundColor: first.destinatie?.color || "currentColor" }} /> : null}
                    <span className={cn("min-w-0 truncate text-base font-black", getLocationTone(first.destinatie?.tip))} title={first.destinatie?.label || EMPTY}>
                      {first.destinatie?.label || EMPTY}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex min-w-[13rem] max-w-[19rem] items-center gap-2 rounded-md border bg-card px-3 py-2">
                  <ImagePreviewTooltip
                    src={getPhotoSrc(transaction?.responsabil?.photo_url)}
                    alt={responsibleName}
                    fallback={<span className="text-sm font-black text-muted-foreground">{getInitials(responsibleName)}</span>}
                    containerClassName="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted"
                    previewMaxHeight="max-h-[22rem]"
                    previewMaxWidth="max-w-[22rem]"
                    ringColor="hover:ring-primary"
                  />
                  <div className="flex min-w-0 flex-col leading-tight">
                    <span className="text-sm font-semibold text-muted-foreground">Responsabil</span>
                    <OverflowTooltip text={responsibleName} align="left" className="min-w-0 truncate text-sm font-black text-foreground" maxLines={1} textSize="sm" />
                  </div>
                </div>
                <div className="flex min-w-[13rem] max-w-[19rem] items-center gap-2 rounded-md border bg-card px-3 py-2">
                  <ImagePreviewTooltip
                    src={getPhotoSrc(transaction?.assigned?.photo_url)}
                    alt={assignedName}
                    fallback={<span className="text-sm font-black text-muted-foreground">{getInitials(assignedName)}</span>}
                    containerClassName="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted"
                    previewMaxHeight="max-h-[22rem]"
                    previewMaxWidth="max-w-[22rem]"
                    ringColor="hover:ring-primary"
                  />
                  <div className="flex min-w-0 flex-col leading-tight">
                    <span className="text-sm font-semibold text-muted-foreground">Persoană asignată</span>
                    <OverflowTooltip text={assignedName} align="left" className="min-w-0 truncate text-sm font-black text-foreground" maxLines={1} textSize="sm" />
                  </div>
                </div>
              </div>

              {transaction?.observatii_generale ? (
                <div className="rounded-lg border bg-muted/20 px-4 py-3">
                  <div className="mb-1 text-xs font-black uppercase tracking-wide text-muted-foreground">Observații</div>
                  <p className="text-sm font-semibold text-foreground">{transaction.observatii_generale}</p>
                </div>
              ) : null}

              {/* Linii */}
              <div className="overflow-hidden rounded-lg border">
                <Table className="w-full table-fixed">
                  <colgroup>
                    <col className="w-[3rem]" />
                    <col />
                    <col className="w-[5rem]" />
                    <col className="w-[8rem]" />
                  </colgroup>
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead className="px-3 py-2 text-center text-sm font-black">#</TableHead>
                      <TableHead className="px-3 py-2 text-sm font-black">Resursă</TableHead>
                      <TableHead className="px-3 py-2 text-center text-sm font-black">U.M.</TableHead>
                      <TableHead className="px-3 py-2 text-right text-sm font-black">Cantitate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lines.map((line, index) => (
                      <TableRow key={line.id || `${line.tranzactie_id}-${index}`} className="h-12">
                        <TableCell className="px-3 py-2 text-center">
                          <span className="mx-auto flex h-7 w-7 items-center justify-center rounded-md bg-primary text-sm font-black text-primary-foreground">{index + 1}</span>
                        </TableCell>
                        <TableCell className="px-3 py-2">
                          <div className="flex min-w-0 flex-col gap-0.5">
                            <OverflowTooltip text={getLineTitle(line, language)} align="left" className="min-w-0 truncate text-sm font-black text-foreground" maxLines={1} textSize="sm" />
                            {line.observatii ? <span className="truncate text-sm font-semibold italic text-muted-foreground">„{line.observatii}"</span> : null}
                          </div>
                        </TableCell>
                        <TableCell className="px-3 py-2 text-center">
                          <Badge variant="outline" className="h-7 px-2 text-sm font-black">
                            {line.unitate_masura || EMPTY}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-3 py-2 text-right text-base font-black text-primary">{formatNumber(line.cantitate)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function InventarIstoricDialog({ open, setOpen, variant, location = null, primaryStockLabel = "Stoc inventar" }) {
  const [language, setLanguage] = useState("RO");
  const [transactionId, setTransactionId] = useState(null);
  const [tableFilters, setTableFilters] = useState({ source: "all", destination: "all", createdBy: "all", assigned: "all" });
  const subcategorieId = variant?.sub?.id || variant?.sub?.catalog_subcategorie_id || null;
  const historyFilters = useMemo(() => {
    const filters = { limit: "all" };

    if (location?.tip && location?.tip !== "inventar" && location?.id) {
      filters.locatie_tip = location.tip;
      filters.locatie_id = location.id;
    }

    return filters;
  }, [location?.id, location?.tip]);
  const { data, isLoading } = useInventarTranzactii(subcategorieId, historyFilters);
  const rows = useMemo(() => (Array.isArray(data?.items) ? data.items : []), [data?.items]);
  const title = getVariantTitle(variant, language);
  const variantCode = getVariantCode(variant);
  const primaryStock = getStockNumber(variant?.sub?.stoc_inventar, variant?.sub?.stocInventar, variant?.sub?.stoc_total);
  const totalStock = getStockNumber(variant?.sub?.stoc_total, variant?.sub?.stocTotal);
  const rowsWithAfterQuantity = useMemo(() => addAfterQuantity(rows, location, primaryStock), [location, primaryStock, rows]);
  const filteredRows = useMemo(() => getFilteredRows(rowsWithAfterQuantity, tableFilters), [rowsWithAfterQuantity, tableFilters]);
  const groups = useMemo(() => groupRowsByDate(filteredRows), [filteredRows]);
  const sourceOptions = useMemo(() => {
    const map = new Map();
    rowsWithAfterQuantity.forEach((row) => {
      const key = getLocationFilterKey(row.sursa);
      if (key && !map.has(key)) map.set(key, row.sursa);
    });
    return [...map.entries()].map(([key, item]) => ({ key, item }));
  }, [rowsWithAfterQuantity]);
  const destinationOptions = useMemo(() => {
    const map = new Map();
    rowsWithAfterQuantity.forEach((row) => {
      const key = getLocationFilterKey(row.destinatie);
      if (key && !map.has(key)) map.set(key, row.destinatie);
    });
    return [...map.entries()].map(([key, item]) => ({ key, item }));
  }, [rowsWithAfterQuantity]);
  const createdByOptions = useMemo(() => {
    const map = new Map();
    rowsWithAfterQuantity.forEach((row) => {
      const key = getPersonFilterKey(row.created_by);
      if (key && !map.has(key)) map.set(key, row.created_by);
    });
    return [...map.entries()].map(([key, item]) => ({ key, item }));
  }, [rowsWithAfterQuantity]);
  const assignedOptions = useMemo(() => {
    const map = new Map();
    rowsWithAfterQuantity.forEach((row) => {
      const key = getPersonFilterKey(row.assigned);
      if (key && !map.has(key)) map.set(key, row.assigned);
    });
    return [...map.entries()].map(([key, item]) => ({ key, item }));
  }, [rowsWithAfterQuantity]);
  const activeFilterCount = Object.values(tableFilters).filter((value) => value !== "all").length;
  const selectedSource = sourceOptions.find((option) => option.key === tableFilters.source)?.item;
  const selectedDestination = destinationOptions.find((option) => option.key === tableFilters.destination)?.item;
  const selectedCreatedBy = createdByOptions.find((option) => option.key === tableFilters.createdBy)?.item;
  const selectedAssigned = assignedOptions.find((option) => option.key === tableFilters.assigned)?.item;
  // Vizualizare centrată pe locație (șantier) vs. istoric general (magazie = fără punct central).
  const isCentered = Boolean(location?.tip) && location.tip !== "inventar";

  const handleOpenChange = (nextOpen) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setTransactionId(null);
      setLanguage("RO");
      setTableFilters({ source: "all", destination: "all", createdBy: "all", assigned: "all" });
    }
  };

  return (
    <>
      <Dialog open={!!open} onOpenChange={handleOpenChange}>
        <DialogContent className="keepSelection flex h-[76vh] max-w-[76vw] flex-col gap-0 p-0">
          <DialogHeader className="shrink-0 rounded-t-md border-b bg-muted px-5 py-4">
            <div className="flex min-w-0 items-center gap-3 pr-10">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border-2 border-primary/50 bg-primary/15 text-primary">
                <FontAwesomeIcon icon={faClockRotateLeft} className="text-3xl" />
              </span>

              <DialogTitle className="flex min-w-0 flex-1 flex-col gap-1 text-left">
                <OverflowTooltip text={title} align="left" className="min-w-0 truncate text-xl font-black text-foreground" maxLines={1} textSize="sm" />
                {variantCode ? <OverflowTooltip text={variantCode} align="left" className="min-w-0 truncate text-sm font-semibold text-muted-foreground" maxLines={1} textSize="sm" /> : null}
              </DialogTitle>

              <div className="ml-auto flex shrink-0 items-center gap-2">
                <Badge variant="outline" className="h-9 bg-card px-3 text-sm font-black">
                  {primaryStockLabel}: {formatNumber(primaryStock)}
                </Badge>
                <Badge variant="outline" className="h-9 bg-card px-3 text-sm font-black text-primary">
                  Total: {formatNumber(totalStock)}
                </Badge>
                <Button type="button" variant="outline" className="h-9 gap-2 px-3 text-sm font-semibold" onClick={() => setLanguage((prev) => (prev === "RO" ? "FR" : "RO"))}>
                  <FontAwesomeIcon icon={faLanguage} className="text-sm text-foreground" />
                  <span className="whitespace-nowrap text-sm font-semibold text-foreground">{language}</span>
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-auto p-3">
            {isLoading ? (
              <div className="flex h-full min-h-40 items-center justify-center text-sm font-semibold text-muted-foreground">Se încarcă istoricul...</div>
            ) : groups.length === 0 ? (
              <div className="flex h-full min-h-40 items-center justify-center rounded-md border bg-card text-sm font-semibold text-muted-foreground">Nu există istoric pentru această variantă.</div>
            ) : (
              <div className="overflow-hidden rounded-md border">
                <div className="min-w-[110rem]">
                  <Table className="w-full table-fixed">
                    <colgroup>
                      <col className="w-[5.5rem]" />
                      <col className="w-[5.5rem]" />
                      <col />
                      <col className="w-[10rem]" />
                      <col className="w-[11rem]" />
                      <col className="w-[12rem]" />
                      <col className="w-[12rem]" />
                      <col className="w-[24rem]" />
                      <col className="w-[5rem]" />
                      <col className="w-[8rem]" />
                      <col className="w-[8rem]" />
                    </colgroup>
                    <TableHeader className="sticky top-0 z-10 bg-background">
                      <TableRow className="bg-muted-foreground/25 hover:bg-muted-foreground/25">
                        <TableHead className="px-3 py-2 text-center text-sm font-black">Ora</TableHead>
                        <TableHead className="px-3 py-2 text-center text-sm font-black">Nr</TableHead>
                        <TableHead className="px-3 py-2 text-sm font-black">Denumire</TableHead>
                        <TableHead className="px-3 py-2 text-sm font-black">Furnizor</TableHead>
                        <TableHead className="px-3 py-2 text-sm font-black">Marcă</TableHead>
                        <TableHead className="px-3 py-2 text-sm font-black">Inițiat de</TableHead>
                        <TableHead className="px-3 py-2 text-sm font-black">Persoană asignată</TableHead>
                        <TableHead className="px-3 py-2 text-sm font-black">Mișcare</TableHead>
                        <TableHead className="px-3 py-2 text-center text-sm font-black">U.M.</TableHead>
                        <TableHead className="px-3 py-2 text-center text-sm font-black">Cantitate</TableHead>
                        <TableHead className="px-3 py-2 text-center text-sm font-black">După</TableHead>
                      </TableRow>
                      <TableRow className="h-8 border-b bg-muted-foreground/25 hover:bg-muted-foreground/25">
                        <TableHead className="h-8 px-0 align-middle">
                          <span className="sr-only">Filtru ora</span>
                        </TableHead>
                        <TableHead className="h-8 px-0 align-middle">
                          {activeFilterCount > 0 ? (
                            <Button variant="ghost" className="h-8 w-full bg-transparent px-1.5 text-sm font-semibold text-destructive hover:bg-transparent" onClick={() => setTableFilters({ source: "all", destination: "all", createdBy: "all", assigned: "all" })}>
                              Reset
                            </Button>
                          ) : (
                            <span className="sr-only">Filtru nr</span>
                          )}
                        </TableHead>
                        <TableHead className="h-8 px-0 align-middle">
                          <span className="sr-only">Filtru denumire</span>
                        </TableHead>
                        <TableHead className="h-8 px-0 align-middle">
                          <span className="sr-only">Filtru furnizor</span>
                        </TableHead>
                        <TableHead className="h-8 px-0 align-middle">
                          <span className="sr-only">Filtru marcă</span>
                        </TableHead>
                        <TableHead className="h-8 px-0 align-middle">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="ghost" className={cn("h-8 w-full justify-start bg-transparent px-3 text-sm font-semibold hover:bg-transparent", tableFilters.createdBy !== "all" && "text-primary")}>
                                <span className="truncate">{selectedCreatedBy?.name || "Toți"}</span>
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent align="start" className="w-64 p-1">
                              <Button variant={tableFilters.createdBy === "all" ? "default" : "ghost"} className="h-8 w-full justify-start px-2 text-sm font-semibold" onClick={() => setTableFilters((prev) => ({ ...prev, createdBy: "all" }))}>
                                Toți
                              </Button>
                              {createdByOptions.map(({ key, item }) => (
                                <Button key={key} variant={tableFilters.createdBy === key ? "default" : "ghost"} className="h-8 w-full justify-start px-2 text-sm font-semibold" onClick={() => setTableFilters((prev) => ({ ...prev, createdBy: key }))}>
                                  <span className="truncate">{item?.name || EMPTY}</span>
                                </Button>
                              ))}
                            </PopoverContent>
                          </Popover>
                        </TableHead>
                        <TableHead className="h-8 px-0 align-middle">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="ghost" className={cn("h-8 w-full justify-start bg-transparent px-3 text-sm font-semibold hover:bg-transparent", tableFilters.assigned !== "all" && "text-primary")}>
                                <span className="truncate">{selectedAssigned?.name || "Toți"}</span>
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent align="start" className="w-64 p-1">
                              <Button variant={tableFilters.assigned === "all" ? "default" : "ghost"} className="h-8 w-full justify-start px-2 text-sm font-semibold" onClick={() => setTableFilters((prev) => ({ ...prev, assigned: "all" }))}>
                                Toți
                              </Button>
                              {assignedOptions.map(({ key, item }) => (
                                <Button key={key} variant={tableFilters.assigned === key ? "default" : "ghost"} className="h-8 w-full justify-start px-2 text-sm font-semibold" onClick={() => setTableFilters((prev) => ({ ...prev, assigned: key }))}>
                                  <span className="truncate">{item?.name || EMPTY}</span>
                                </Button>
                              ))}
                            </PopoverContent>
                          </Popover>
                        </TableHead>
                        <TableHead className="h-8 px-0 align-middle">
                          <div className="grid h-8 grid-cols-2">
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="ghost" className={cn("h-8 min-w-0 justify-start rounded-r-none bg-transparent px-3 text-sm font-semibold hover:bg-transparent", tableFilters.source !== "all" && "text-primary")}>
                                  <span className="truncate">{selectedSource ? selectedSource.label : "De la"}</span>
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent align="start" className="w-72 p-1">
                                <Button variant={tableFilters.source === "all" ? "default" : "ghost"} className="h-8 w-full justify-start px-2 text-sm font-semibold" onClick={() => setTableFilters((prev) => ({ ...prev, source: "all" }))}>
                                  Toate
                                </Button>
                                {sourceOptions.map(({ key, item }) => (
                                  <Button key={key} variant={tableFilters.source === key ? "default" : "ghost"} className="h-8 w-full justify-start gap-2 px-2 text-sm font-semibold" onClick={() => setTableFilters((prev) => ({ ...prev, source: key }))}>
                                    {item?.tip === "santier" ? <span className="h-3 w-3 shrink-0 rounded-sm border border-border" style={{ backgroundColor: item.color || "currentColor" }} /> : null}
                                    <span className="shrink-0 text-muted-foreground">{getLocationTypeLabel(item?.tip)}</span>
                                    <span className="truncate">{item?.label || EMPTY}</span>
                                  </Button>
                                ))}
                              </PopoverContent>
                            </Popover>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="ghost" className={cn("h-8 min-w-0 justify-start rounded-l-none bg-transparent px-3 text-sm font-semibold hover:bg-transparent", tableFilters.destination !== "all" && "text-primary")}>
                                  <span className="truncate">{selectedDestination ? selectedDestination.label : "Către"}</span>
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent align="start" className="w-72 p-1">
                                <Button variant={tableFilters.destination === "all" ? "default" : "ghost"} className="h-8 w-full justify-start px-2 text-sm font-semibold" onClick={() => setTableFilters((prev) => ({ ...prev, destination: "all" }))}>
                                  Toate
                                </Button>
                                {destinationOptions.map(({ key, item }) => (
                                  <Button key={key} variant={tableFilters.destination === key ? "default" : "ghost"} className="h-8 w-full justify-start gap-2 px-2 text-sm font-semibold" onClick={() => setTableFilters((prev) => ({ ...prev, destination: key }))}>
                                    {item?.tip === "santier" ? <span className="h-3 w-3 shrink-0 rounded-sm border border-border" style={{ backgroundColor: item.color || "currentColor" }} /> : null}
                                    <span className="shrink-0 text-muted-foreground">{getLocationTypeLabel(item?.tip)}</span>
                                    <span className="truncate">{item?.label || EMPTY}</span>
                                  </Button>
                                ))}
                              </PopoverContent>
                            </Popover>
                          </div>
                        </TableHead>
                        <TableHead className="h-8 px-0 align-middle">
                          <span className="sr-only">Filtru U.M.</span>
                        </TableHead>
                        <TableHead className="h-8 px-0 align-middle">
                          <span className="sr-only">Filtru cantitate</span>
                        </TableHead>
                        <TableHead className="h-8 px-0 align-middle">
                          <span className="sr-only">Filtru după</span>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {groups.map((group) => (
                        <Fragment key={group.key}>
                          <TableRow key={`${group.key}-header`} className="bg-muted/45 hover:bg-muted/45">
                            <TableCell colSpan={11} className="px-3 py-2">
                              <div className="flex items-center gap-3">
                                <span className="text-base font-black text-foreground">{group.label}</span>
                                <Separator orientation="vertical" className="h-5" />
                                <span className="text-sm font-semibold text-muted-foreground">
                                  {group.rows.length} {group.rows.length === 1 ? "mișcare" : "mișcări"}
                                </span>
                              </div>
                            </TableCell>
                          </TableRow>
                          {group.rows.map((row) => (
                            <HistoryRow key={row.id} row={row} language={language} isCentered={isCentered} onOpen={setTransactionId} />
                          ))}
                        </Fragment>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <TransactionDetailsDialog open={!!transactionId} setOpen={(nextOpen) => !nextOpen && setTransactionId(null)} transactionId={transactionId} language={language} />
    </>
  );
}
