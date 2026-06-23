import React, { useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight, faBoxesStacked, faChevronDown, faChevronRight, faRightLeft } from "@fortawesome/free-solid-svg-icons";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Textarea } from "@/components/ui/textarea";
import OverflowTooltip from "@/components/ui/OverflowTooltip";

const getLineKey = (item) => String(item?.key || `${item?.parent?.inventar_resursa_id || item?.parent?.id || "p"}:${item?.sub?.id || "s"}`);

const getVariantTitle = (item) => {
  const parentName = item?.parent?.denumire || item?.parent?.denumire_fr || "Resursă";
  const cod = item?.sub?.cod_specific ? ` · ${item.sub.cod_specific}` : "";
  return `${parentName}${cod}`;
};

const getMetaParts = (item) => ({
  furnizor: item?.sub?.furnizor_denumire || item?.sub?.detalii_extra?.furnizor || "—",
  marca: item?.sub?.marca_denumire || item?.sub?.detalii_extra?.marca || "—",
});

const getStockValue = (...values) => {
  for (const value of values) {
    const numberValue = Number(value);
    if (Number.isFinite(numberValue)) return numberValue;
  }

  return 0;
};

const formatNumber = (value) => {
  const numberValue = Number(value || 0);
  return Number.isFinite(numberValue) ? numberValue.toFixed(2).replace(".", ",") : "0,00";
};

const getDefaultDraftLine = () => {
  return {
    cantitate: "",
    sursa_locatie: "cumparare",
    destinatie_locatie: "inventar",
    observatii: "",
  };
};

export default function InventarStocTranzactieDialog({ open, setOpen, selectedItems = [], inventar = null, tipResursa = "material" }) {
  const [openKeys, setOpenKeys] = useState(new Set());
  const [lines, setLines] = useState({});

  const normalizedItems = useMemo(() => {
    const seen = new Set();
    return (selectedItems || [])
      .filter((item) => item?.sub && item?.parent)
      .filter((item) => {
        const key = getLineKey(item);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }, [selectedItems]);

  useEffect(() => {
    if (!open) return;

    const keys = new Set(normalizedItems.map(getLineKey));
    setOpenKeys(keys);
    setLines(() => {
      const next = {};
      normalizedItems.forEach((item) => {
        next[getLineKey(item)] = getDefaultDraftLine();
      });
      return next;
    });
  }, [normalizedItems, open]);

  const updateLine = (key, field, value) => {
    setLines((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key] || getDefaultDraftLine()),
        [field]: value,
      },
    }));
  };

  const getLocationOptions = ({ item, side }) => {
    const stocInventar = getStockValue(item.sub?.stoc_inventar, item.sub?.stocInventar, item.sub?.stoc_total);
    const unitate = item.parent?.unitate_masura || "";
    const currentInventarName = inventar?.denumire || `Inventar ${inventar?.limba || ""}`.trim() || "Inventar";
    const options = [];

    if (side === "source") {
      options.push({
        value: "cumparare",
        title: "Cumpărare",
        subtitle: "Intrare directă de la furnizor",
        stock: null,
      });
    }

    options.push({
      value: "inventar",
      title: currentInventarName,
      subtitle: `Inventar ${inventar?.limba || ""}`.trim(),
      stock: stocInventar,
      unitate,
    });

    if (tipResursa === "material") {
      options.push({
        value: "santier-placeholder",
        title: "Șantiere cu stoc",
        subtitle: "Nu există încă listare de șantiere cu stoc pentru această variantă.",
        stock: null,
        disabled: true,
      });
    } else {
      options.push({
        value: "user-placeholder",
        title: "Persoane",
        subtitle: "Nu există încă listare de persoane cu stoc/asignare pentru această variantă.",
        stock: null,
        disabled: true,
      });
    }

    return options;
  };

  const renderLocationList = ({ item, lineKey, field, side, value }) => {
    const options = getLocationOptions({ item, side });

    return (
      <div className="flex flex-col gap-1.5">
        {options.map((option) => {
          const selected = value === option.value;

          return (
            <button
              key={`${lineKey}-${field}-${option.value}`}
              type="button"
              disabled={option.disabled}
              onClick={() => updateLine(lineKey, field, option.value)}
              className={`flex min-h-12 w-full items-center justify-between gap-2 rounded-md border px-2.5 py-2 text-left transition-colors ${
                selected ? "border-primary bg-primary/15 text-foreground" : "border-border bg-background hover:bg-accent"
              } ${option.disabled ? "cursor-not-allowed opacity-55 hover:bg-background" : ""}`}
            >
              <span className="min-w-0">
                <span className="block truncate text-xs font-black text-foreground">{option.title}</span>
                <span className="block truncate text-xs font-semibold text-muted-foreground">{option.subtitle}</span>
              </span>

              {option.stock !== null && (
                <Badge variant="outline" className={`h-7 shrink-0 px-2 text-xs font-black ${selected ? "border-primary text-primary" : "text-foreground"}`}>
                  {formatNumber(option.stock)} {option.unitate}
                </Badge>
              )}
            </button>
          );
        })}
      </div>
    );
  };

  const toggleOpen = (key) => {
    setOpenKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <Dialog open={!!open} onOpenChange={setOpen}>
      <DialogContent className="keepSelection flex h-[82vh] max-w-[86rem] flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b bg-muted px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-md border border-primary/50 bg-primary/10 text-primary">
              <FontAwesomeIcon icon={faRightLeft} className="text-lg" />
            </span>
            <div className="min-w-0">
              <DialogTitle className="text-left text-lg font-black text-foreground">Tranzacție stoc</DialogTitle>
              <DialogDescription className="text-left text-sm font-semibold text-muted-foreground">
                Alegi traseul de la/către pentru {normalizedItems.length} {normalizedItems.length === 1 ? "variantă selectată" : "variante selectate"}. Tipul notei se deduce la salvare.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 grid-cols-[minmax(18rem,24rem)_minmax(0,1fr)] overflow-hidden">
          <div className="border-r bg-muted/10 p-3 overflow-auto">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-wide text-muted-foreground">Selecție</p>
                <p className="truncate text-sm font-black text-foreground">
                  {inventar?.denumire || "Inventar"} · {tipResursa}
                </p>
              </div>
              <Badge variant="outline" className="h-7 px-2 text-xs font-black">
                {normalizedItems.length}
              </Badge>
            </div>

            <div className="flex flex-col gap-1.5">
              {normalizedItems.map((item, index) => (
                <div key={getLineKey(item)} className="rounded-md border bg-background px-2.5 py-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-primary text-xs font-black text-primary-foreground">{index + 1}</span>
                    <div className="min-w-0 flex-1">
                      <OverflowTooltip text={getVariantTitle(item)} align="left" className="block truncate text-xs font-black text-foreground" maxLines={1} />
                      <div className="mt-1 flex flex-col gap-0.5 text-[11px] font-semibold text-muted-foreground">
                        <span className="truncate">Furnizor: {getMetaParts(item).furnizor}</span>
                        <span className="truncate">Marcă: {getMetaParts(item).marca}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="min-h-0 overflow-auto p-4">
            {normalizedItems.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm font-semibold text-muted-foreground">Nu există variante selectate.</div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {normalizedItems.map((item) => {
                  const key = getLineKey(item);
                  const line = lines[key] || getDefaultDraftLine();
                  const isOpen = openKeys.has(key);
                  const stocInventar = getStockValue(item.sub?.stoc_inventar, item.sub?.stocInventar, item.sub?.stoc_total);
                  const stocTotal = getStockValue(item.sub?.stoc_total, item.sub?.stocTotal);
                  const metaParts = getMetaParts(item);

                  return (
                    <Collapsible key={key} open={isOpen} onOpenChange={() => toggleOpen(key)} className="overflow-hidden rounded-md border bg-card">
                      <CollapsibleTrigger asChild>
                        <button type="button" className="flex w-full items-center gap-2  bg-muted/30 px-3 py-2 text-left hover:bg-muted/50">
                          <FontAwesomeIcon icon={isOpen ? faChevronDown : faChevronRight} className="text-sm text-foreground" />
                          <div className="min-w-0 flex-1">
                            <OverflowTooltip text={getVariantTitle(item)} align="left" className="block truncate text-sm font-black text-foreground" maxLines={1} />
                            <div className="mt-0.5 flex flex-col gap-0.5 text-xs font-semibold text-muted-foreground">
                              <span>
                                Furnizor: <span className="text-foreground">{metaParts.furnizor}</span>
                              </span>
                              <span>
                                Marcă: <span className="text-foreground">{metaParts.marca}</span>
                              </span>
                            </div>
                          </div>
                          <Badge variant="outline" className="h-7 px-2 text-xs font-black text-foreground">
                            Stoc inv. {formatNumber(stocInventar)}
                          </Badge>
                          <Badge variant="outline" className="h-7 px-2 text-xs font-black text-primary">
                            Total {formatNumber(stocTotal)}
                          </Badge>
                        </button>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <div className="grid border-t grid-cols-[minmax(0,1fr)_2rem_minmax(0,1fr)_9rem] gap-3 p-3">
                          <div className="flex flex-col gap-1.5">
                            <span className="text-xs font-black uppercase tracking-wide text-muted-foreground">De la</span>
                            {renderLocationList({ item, lineKey: key, field: "sursa_locatie", side: "source", value: line.sursa_locatie })}
                          </div>

                          <div className="flex items-center justify-center pt-6 text-muted-foreground">
                            <FontAwesomeIcon icon={faArrowRight} />
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <span className="text-xs font-black uppercase tracking-wide text-muted-foreground">Către</span>
                            {renderLocationList({ item, lineKey: key, field: "destinatie_locatie", side: "destination", value: line.destinatie_locatie })}
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <span className="text-xs font-black uppercase tracking-wide text-muted-foreground">Cantitate</span>
                            <Input
                              value={line.cantitate}
                              onChange={(event) => updateLine(key, "cantitate", event.target.value.replace(",", "."))}
                              placeholder="0,00"
                              className="h-8 bg-background text-center text-sm font-black"
                            />
                            <Badge variant="outline" className="h-8 justify-center text-xs font-black">
                              {item.parent?.unitate_masura || "U"}
                            </Badge>
                          </div>
                        </div>

                        <div className="border-t p-3">
                          <Textarea
                            value={line.observatii}
                            onChange={(event) => updateLine(key, "observatii", event.target.value)}
                            placeholder="Observații pe linie..."
                            className="min-h-16 resize-none bg-background text-sm font-semibold"
                          />
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="shrink-0 border-t bg-muted/20 px-5 py-4">
          <div className="flex w-full items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
              <FontAwesomeIcon icon={faBoxesStacked} />
              Salvarea în DB vine după endpoint-ul de tranzacții/stoc.
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Închide
              </Button>
              <Button disabled>Salvează tranzacția</Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
