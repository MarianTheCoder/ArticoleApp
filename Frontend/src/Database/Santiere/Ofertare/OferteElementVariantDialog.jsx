// src/components/Ofertare/OferteElementVariantDialog.jsx
import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faColumns, faDatabase, faExclamationCircle, faLanguage, faTags } from "@fortawesome/free-solid-svg-icons";

import OverflowTooltip from "@/components/ui/OverflowTooltip";
import ImagePreviewTooltip from "@/components/ui/ImagePreviewTooltip";
import NoImage from "@/assets/no-image-icon.png";
import photoAPI from "@/api/photoAPI";
import { toast } from "sonner";

const EMPTY = "—";

const formatNumber = (value) => {
  return parseFloat(value || 0)
    .toFixed(2)
    .replace(".", ",");
};

const parseDecimalInput = (value) => {
  return Number(String(value || "0").replace(",", "."));
};

const normalizeInputDecimal = (value) => {
  return String(value || "").replace(".", ",");
};

const parseMaybeJson = (value, fallback = null) => {
  if (value === null || value === undefined) return fallback;
  if (typeof value !== "string") return value;

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const isSelectedVariant = (el) => {
  return el?.selected_type === "varianta" || !!el?.oferta_subcategorie_id || !!el?.original_subcategorie_id || !!el?.cod_specific;
};

const getSavedUnitCost = (el) => {
  if (isSelectedVariant(el)) {
    return Number(el?.cost_subcategorie_snapshot ?? 0);
  }

  return Number(el?.cost_definitie_snapshot ?? 0);
};

const getDefinitionCode = (el) => {
  return el?.cod_definitie_actual || el?.cod_definitie || EMPTY;
};

const getDefinitionPhoto = (el) => {
  return el?.photo_url_actual || el?.photo_url || null;
};

const getDefinitionCost = (el) => {
  return Number(el?.cost_definitie_actual ?? el?.cost_definitie_live ?? el?.cost_definitie_snapshot ?? 0);
};

const getDefinitionDescription = (el, displayLang) => {
  if (displayLang === "FR") {
    return el?.descriere_fr_actual || el?.descriere_fr || "";
  }

  return el?.descriere_actual || el?.descriere || "";
};

const getDefinitionName = (el, displayLang) => {
  if (displayLang === "FR") {
    return el?.denumire_fr_actual || el?.denumire_fr || "";
  }

  return el?.denumire_actual || el?.denumire || "";
};

const getVariantDescription = (sub, displayLang) => {
  if (displayLang === "FR") {
    return sub?.descriere_fr || "";
  }

  return sub?.descriere || "";
};

const getVariantExtra = (sub) => {
  return parseMaybeJson(sub?.detalii_extra, {}) || {};
};

const getDefaultQuantity = (el) => {
  const value = el?.cantitate_in_reteta_default ?? el?.cantitate_default ?? el?.reteta_element_cantitate ?? el?.cantitate_originala ?? el?.cantitate_in_reteta ?? 0;

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
};

const numbersDifferent = (a, b) => {
  if (!Number.isFinite(Number(a)) || !Number.isFinite(Number(b))) return false;

  return Math.abs(Number(a) - Number(b)) > 0.0001;
};

const OptionRow = memo(function OptionRow({ row, config, displayLang, visibleColumns, selected, onSelect, defaultQuantity, quantityChanged }) {
  const showCol = (key) => visibleColumns[key];

  const isDefinitie = row.type === "definitie";
  const raw = row.raw;

  const code = isDefinitie ? getDefinitionCode(raw) : raw?.cod_specific || EMPTY;
  const photo = isDefinitie ? getDefinitionPhoto(raw) : raw?.photo_url || null;
  const description = isDefinitie ? getDefinitionDescription(raw, displayLang) : getVariantDescription(raw, displayLang);
  const cost = isDefinitie ? getDefinitionCost(raw) : Number(raw?.cost || 0);

  const extra = isDefinitie ? {} : getVariantExtra(raw);
  const furnizor = extra?.furnizor || "";
  const statusUtilaj = extra?.status_utilaj || "";

  return (
    <TableRow onClick={() => onSelect(row)} className={`cursor-pointer border-b transition-colors hover:bg-accent ${selected ? "bg-primary/10 hover:bg-primary/15" : ""}`}>
      {config?.hasPhoto && showCol("poza") && (
        <TableCell className="text-center px-4 py-2 w-[6rem] max-w-[6rem]">
          <ImagePreviewTooltip
            src={photo ? `${photoAPI}/${photo}` : null}
            alt={code || "Poză"}
            ringColor={`hover:ring-${config?.normalColor || "primary"}`}
            previewMaxHeight="max-h-[30rem]"
            previewMaxWidth="max-w-[30rem]"
            fallback={<img src={NoImage} alt="No Image" className="h-full w-full object-cover opacity-50" />}
            containerClassName="h-14 w-14 rounded-md border border-border bg-muted flex items-center justify-center overflow-hidden shrink-0"
          />
        </TableCell>
      )}

      {showCol("tip") && (
        <TableCell className="text-center px-4 py-2 w-[9rem] max-w-[9rem]">
          <Badge variant="outline" className={`font-black ${isDefinitie ? "bg-card border-foreground/40 text-foreground" : "bg-primary/10 border-primary text-primary"}`}>
            {isDefinitie ? "Definiție" : "Variantă"}
          </Badge>
        </TableCell>
      )}

      {showCol("cod") && (
        <TableCell className="text-center px-4 py-2 w-[12rem] max-w-[12rem] whitespace-nowrap">
          <span className="text-base font-bold text-foreground">{code}</span>
        </TableCell>
      )}

      {config?.hasFurnizor && showCol("furnizor") && (
        <TableCell className="text-center px-4 py-2 w-[12rem] max-w-[12rem]">
          {furnizor ? <span className="text-base text-foreground">{furnizor}</span> : <span className="text-base text-muted-foreground/40 italic">{EMPTY}</span>}
        </TableCell>
      )}

      {showCol("descriere") && (
        <TableCell className="px-4 py-2 min-w-[28rem]">
          {description ? (
            <OverflowTooltip align="left" text={description} className="text-base text-foreground whitespace-pre-wrap leading-normal" maxLines={2} />
          ) : (
            <span className="text-base text-muted-foreground/40 italic">{EMPTY}</span>
          )}
        </TableCell>
      )}

      {config?.hasStatus && showCol("status") && (
        <TableCell className="text-center px-4 py-2 w-[12rem] max-w-[12rem]">
          {statusUtilaj ? <span className="text-base text-foreground font-medium">{statusUtilaj}</span> : <span className="text-base text-muted-foreground/40 italic">{EMPTY}</span>}
        </TableCell>
      )}

      {showCol("cost") && (
        <TableCell className="text-center px-4 py-2 w-[10rem] max-w-[10rem]">
          <span className="font-bold text-base text-foreground">{formatNumber(cost)}</span>
        </TableCell>
      )}

      {showCol("cantitate") && (
        <TableCell className="text-center px-4 py-2 w-[10rem] max-w-[10rem]">
          <div className="flex items-center justify-center gap-1">
            <span className="font-bold text-base text-foreground">{formatNumber(defaultQuantity)}</span>
          </div>
        </TableCell>
      )}

      <TableCell className="text-center px-4 py-2 w-[5rem] max-w-[5rem]">
        {selected ? <FontAwesomeIcon icon={faCheck} className="text-primary text-lg" /> : <span className="text-muted-foreground/30">{EMPTY}</span>}
      </TableCell>
    </TableRow>
  );
});

export default function OferteElementVariantDialog({ open, setOpen, config, elementItem, parentItem, onSave }) {
  const [displayLang, setDisplayLang] = useState("RO");

  const [selectionType, setSelectionType] = useState("definitie");
  const [selectedVariantId, setSelectedVariantId] = useState(null);

  const [costInput, setCostInput] = useState("");
  const [quantityInput, setQuantityInput] = useState("");

  const [visibleColumns, setVisibleColumns] = useState({
    poza: true,
    tip: true,
    cod: true,
    furnizor: true,
    descriere: true,
    status: true,
    cost: true,
    cantitate: true,
  });

  const subcategorii = useMemo(() => {
    return Array.isArray(elementItem?.subcategorii) ? elementItem.subcategorii : [];
  }, [elementItem?.subcategorii]);

  const selectedVariant = useMemo(() => {
    if (!selectedVariantId) return null;
    return subcategorii.find((sub) => Number(sub.id) === Number(selectedVariantId)) || null;
  }, [subcategorii, selectedVariantId]);

  const rows = useMemo(() => {
    if (!elementItem) return [];

    return [
      {
        id: "definitie",
        type: "definitie",
        raw: elementItem,
      },
      ...subcategorii.map((sub) => ({
        id: `varianta_${sub.id}`,
        type: "varianta",
        raw: sub,
      })),
    ];
  }, [elementItem, subcategorii]);

  useEffect(() => {
    if (!open || !elementItem) return;

    const isVariant = isSelectedVariant(elementItem);

    setSelectionType(isVariant ? "varianta" : "definitie");
    setSelectedVariantId(isVariant ? String(elementItem.original_subcategorie_id) : null);

    setCostInput(formatNumber(getSavedUnitCost(elementItem)));
    setQuantityInput(formatNumber(elementItem.cantitate_in_reteta || 0));
  }, [open, elementItem]);

  useEffect(() => {
    if (!open) return;

    setVisibleColumns({
      poza: !!config?.hasPhoto,
      tip: true,
      cod: true,
      furnizor: !!config?.hasFurnizor,
      descriere: true,
      status: !!config?.hasStatus,
      cost: true,
      cantitate: true,
    });
  }, [open, config?.id, config?.hasPhoto, config?.hasFurnizor, config?.hasStatus]);

  const defaultQuantity = getDefaultQuantity(elementItem);

  const selectedLiveCost = useMemo(() => {
    if (selectionType === "varianta" && selectedVariant) {
      return Number(selectedVariant.cost || 0);
    }

    return getDefinitionCost(elementItem);
  }, [elementItem, selectedVariant, selectionType]);

  const parsedCostForUi = parseDecimalInput(costInput);
  const parsedQuantityForUi = parseDecimalInput(quantityInput);

  const costChanged = numbersDifferent(parsedCostForUi, selectedLiveCost);
  const quantityChanged = numbersDifferent(parsedQuantityForUi, defaultQuantity);

  const toggleCol = useCallback((key) => {
    setVisibleColumns((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }, []);

  const handleSelectRow = useCallback(
    (row) => {
      if (!row) return;

      const qty = getDefaultQuantity(elementItem);

      if (row.type === "definitie") {
        setSelectionType("definitie");
        setSelectedVariantId(null);

        setCostInput(formatNumber(getDefinitionCost(elementItem)));
        setQuantityInput(formatNumber(qty));
        return;
      }

      const variant = row.raw;

      setSelectionType("varianta");
      setSelectedVariantId(String(variant.id));

      setCostInput(formatNumber(variant.cost ?? 0));
      setQuantityInput(formatNumber(qty));
    },
    [elementItem],
  );

  const handleCostChange = useCallback((e) => {
    const val = normalizeInputDecimal(e.target.value);

    if (/^\d{0,9}\,?\d{0,2}$/.test(val)) {
      setCostInput(val);
    }
  }, []);

  const handleQuantityChange = useCallback((e) => {
    const val = normalizeInputDecimal(e.target.value);

    if (/^\d{0,9}\,?\d{0,2}$/.test(val)) {
      setQuantityInput(val);
    }
  }, []);

  const handleSave = useCallback(async () => {
    if (!elementItem?.id) return;

    const parsedCost = parseDecimalInput(costInput);
    const parsedQuantity = parseDecimalInput(quantityInput);

    if (!Number.isFinite(parsedCost) || parsedCost < 0) {
      toast.warning("Costul trebuie să fie valid.", { position: "top-right" });
      return;
    }

    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      toast.warning("Cantitatea trebuie să fie mai mare de 0.", { position: "top-right" });
      return;
    }

    const payload = {
      id: elementItem.id,
      oferta_reteta_id: parentItem?.id || elementItem.oferta_reteta_id,
      original_subcategorie_id: selectionType === "varianta" && selectedVariant ? selectedVariant.id : null,
      cost_snapshot: parsedCost,
      cantitate_in_reteta: parsedQuantity,
    };

    await onSave?.(payload);
    setOpen(false);
  }, [costInput, elementItem, onSave, parentItem?.id, quantityInput, selectedVariant, selectionType, setOpen]);

  if (!elementItem) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-[85vw] h-[78vh] flex flex-col p-0 gap-0" style={{ animationDuration: "0ms", transitionDuration: "0ms" }}>
        <DialogHeader className="px-6 py-4 rounded-t-md border-b bg-muted flex flex-row items-center justify-between shrink-0">
          <div className="flex items-center gap-4 min-w-0">
            <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${config?.bgClass || "bg-primary/10"}`}>
              <FontAwesomeIcon icon={config?.icon || faDatabase} className={`${config?.colorClass || "text-primary"} text-xl`} />
            </div>

            <DialogTitle className="text-left flex flex-col gap-0 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground font-bold uppercase tracking-wider">{getDefinitionCode(elementItem)}</p>
              </div>

              <OverflowTooltip align="left" text={getDefinitionName(elementItem, displayLang) || EMPTY} className="text-xl font-bold text-foreground" maxLines={1} />
            </DialogTitle>
          </div>

          <div className="flex items-center gap-3 mr-10">
            <Button variant="outline" className="gap-2 h-10 w-20 text-foreground" onClick={() => setDisplayLang((prev) => (prev === "RO" ? "FR" : "RO"))}>
              <FontAwesomeIcon icon={faLanguage} />
              <span className="font-bold">{displayLang}</span>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2 h-10 text-foreground">
                  <FontAwesomeIcon icon={faColumns} />
                  <span>Coloane</span>
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-48">
                {config?.hasPhoto && (
                  <DropdownMenuCheckboxItem checked={visibleColumns.poza} onSelect={(e) => e.preventDefault()} onCheckedChange={() => toggleCol("poza")}>
                    Poză
                  </DropdownMenuCheckboxItem>
                )}

                <DropdownMenuCheckboxItem checked={visibleColumns.tip} onSelect={(e) => e.preventDefault()} onCheckedChange={() => toggleCol("tip")}>
                  Tip
                </DropdownMenuCheckboxItem>

                <DropdownMenuCheckboxItem checked={visibleColumns.cod} onSelect={(e) => e.preventDefault()} onCheckedChange={() => toggleCol("cod")}>
                  Cod
                </DropdownMenuCheckboxItem>

                {config?.hasFurnizor && (
                  <DropdownMenuCheckboxItem checked={visibleColumns.furnizor} onSelect={(e) => e.preventDefault()} onCheckedChange={() => toggleCol("furnizor")}>
                    Furnizor
                  </DropdownMenuCheckboxItem>
                )}

                <DropdownMenuCheckboxItem checked={visibleColumns.descriere} onSelect={(e) => e.preventDefault()} onCheckedChange={() => toggleCol("descriere")}>
                  Descriere
                </DropdownMenuCheckboxItem>

                {config?.hasStatus && (
                  <DropdownMenuCheckboxItem checked={visibleColumns.status} onSelect={(e) => e.preventDefault()} onCheckedChange={() => toggleCol("status")}>
                    Status
                  </DropdownMenuCheckboxItem>
                )}

                <DropdownMenuCheckboxItem checked={visibleColumns.cost} onSelect={(e) => e.preventDefault()} onCheckedChange={() => toggleCol("cost")}>
                  Cost
                </DropdownMenuCheckboxItem>

                <DropdownMenuCheckboxItem checked={visibleColumns.cantitate} onSelect={(e) => e.preventDefault()} onCheckedChange={() => toggleCol("cantitate")}>
                  Cantitate
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </DialogHeader>

        <div className="p-6 flex-1 min-h-0 bg-card overflow-hidden">
          {rows.length > 0 ? (
            <div className="rounded-md border bg-card w-full h-full overflow-auto relative">
              <Table className="min-w-full table-fixed caption-bottom text-left border-collapse">
                <TableHeader className="bg-background sticky top-0 z-20 shadow-sm">
                  <TableRow className="h-10 hover:bg-muted-foreground/25 bg-muted-foreground/25 border-b">
                    {config?.hasPhoto && visibleColumns.poza && <TableHead className="text-center px-4 w-[6rem] max-w-[6rem]">Poză</TableHead>}
                    {visibleColumns.tip && <TableHead className="text-center px-4 w-[9rem] max-w-[9rem]">Tip</TableHead>}
                    {visibleColumns.cod && <TableHead className="text-center px-4 w-[12rem] max-w-[12rem]">Cod</TableHead>}
                    {config?.hasFurnizor && visibleColumns.furnizor && <TableHead className="text-center px-4 w-[12rem] max-w-[12rem]">Furnizor</TableHead>}
                    {visibleColumns.descriere && <TableHead className="px-4 min-w-[28rem]">Descriere</TableHead>}
                    {config?.hasStatus && visibleColumns.status && <TableHead className="text-center px-4 w-[12rem] max-w-[12rem]">Status</TableHead>}
                    {visibleColumns.cost && <TableHead className="text-center px-4 w-[10rem] max-w-[10rem]">Cost</TableHead>}
                    {visibleColumns.cantitate && <TableHead className="text-center px-4 w-[10rem] max-w-[10rem]">Cantitate</TableHead>}
                    <TableHead className="text-center px-4 w-[5rem] max-w-[5rem]">Ales</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {rows.map((row) => {
                    const selected = row.type === "definitie" ? selectionType === "definitie" : selectionType === "varianta" && Number(selectedVariantId) === Number(row.raw.id);

                    return (
                      <OptionRow
                        key={row.id}
                        row={row}
                        config={config}
                        displayLang={displayLang}
                        visibleColumns={visibleColumns}
                        selected={selected}
                        onSelect={handleSelectRow}
                        defaultQuantity={defaultQuantity}
                        quantityChanged={quantityChanged}
                      />
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground rounded-xl">
              <FontAwesomeIcon icon={faTags} className="text-4xl mb-4 opacity-60" />
              <p className="text-lg">Nu există variante. Poți salva doar definiția.</p>
            </div>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t bg-muted/20 shrink-0">
          <div className="flex w-full items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Label className="font-bold">Cost:</Label>

                <div className="flex items-center gap-1">
                  <Input value={costInput} onChange={handleCostChange} className="h-10 w-32 font-black text-center border-2" placeholder="0,00" />

                  {costChanged && <FontAwesomeIcon icon={faExclamationCircle} className="text-high text-lg" title={`Cost modificat față de live: ${formatNumber(selectedLiveCost)}`} />}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Label className="font-bold">Cantitate:</Label>

                <div className="flex items-center gap-1">
                  <Input value={quantityInput} onChange={handleQuantityChange} className="h-10 w-32 font-black text-center border-2" placeholder="0,00" />

                  {quantityChanged && <FontAwesomeIcon icon={faExclamationCircle} className="text-high text-lg" title={`Cantitate modificată față de rețetă: ${formatNumber(defaultQuantity)}`} />}
                </div>
              </div>
            </div>

            <Button onClick={handleSave} className="gap-2 bg-sky-600 hover:bg-sky-700 text-white h-10 px-8 font-bold">
              <FontAwesomeIcon icon={faCheck} />
              Salvează snapshot
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
