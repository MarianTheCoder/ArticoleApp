import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faLayerGroup, faList } from "@fortawesome/free-solid-svg-icons";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TableHead, TableRow } from "@/components/ui/table";
import ReteteClaseCoduriDialog from "@/Database/Retete/ReteteClaseCoduriDialog";
import CatalogMetaDialog from "@/Database/Catalog/CatalogMetaDialog";
import { useCatalogMeta } from "@/hooks/Database/useCatalog";
import OverflowTooltip from "@/components/ui/OverflowTooltip";

const formatCatalogFilterCode = (value) => {
  const compact = String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 13);
  const segmentSizes = [2, 2, 3, 3, 3];
  const parts = [];
  let cursor = 0;

  segmentSizes.forEach((size, index) => {
    const rawPart = compact.slice(cursor, cursor + size);
    const part = index < 2 ? rawPart.replace(/\D/g, "") : rawPart;

    if (part) parts.push(part);
    cursor += size;
  });

  return parts.join(" ");
};

const getCatalogClassScope = (config) => `catalog_${config?.id || "material"}`;

const filterHeadClass = "h-8 border-b bg-transparent px-0 align-middle xxxl:h-9";
const inputClass =
  "h-8 border-0 bg-transparent px-1.5 text-xs font-semibold shadow-none outline-none placeholder:text-muted-foreground/70 focus-visible:ring-0 xxxl:h-9 xxxl:text-sm";
const selectTriggerClass = "h-8 border-0 bg-transparent px-1.5 text-xs font-semibold shadow-none focus:ring-0 focus-visible:ring-0 xxxl:h-9 xxxl:text-sm";

const getAlignClasses = (align = "center") => {
  if (align === "left") return { text: "text-left", justify: "justify-start" };
  if (align === "right") return { text: "text-right", justify: "justify-end" };
  return { text: "text-center", justify: "justify-center" };
};

function InventarMetaFilterCell({ type, label, valueId, onChange, onManage, textAlign = "center" }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { data } = useCatalogMeta(type);

  const options = data?.items || [];
  const selectedOption = options.find((item) => String(item.id) === String(valueId));
  const selectedLabel = selectedOption?.denumire || "";
  const filteredOptions = options.filter((item) =>
    String(item.denumire || "")
      .toLowerCase()
      .includes(search.trim().toLowerCase()),
  );
  const alignClass = getAlignClasses(textAlign).text;
  const justifyClass = getAlignClasses(textAlign).justify;

  return (
    <div className="flex h-8 pr-3 xxxl:h-9">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="ghost" className={`h-8 min-w-0 flex-1 rounded-r-none bg-transparent px-1.5 text-xs font-semibold hover:bg-transparent xxxl:h-9 xxxl:text-sm ${alignClass} ${justifyClass}`}>
            {selectedLabel ? (
              <OverflowTooltip text={selectedLabel} align={textAlign} className="min-w-0 truncate text-foreground" maxLines={1} textSize="sm" />
            ) : (
              <span className="min-w-0 truncate text-muted-foreground/70">{label}</span>
            )}
          </Button>
        </PopoverTrigger>

        <PopoverContent align="start" className="w-[18rem] p-2">
          <div className="flex flex-col gap-2">
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Caută..." className="h-8 text-sm" />

            <div className="max-h-56 overflow-auto rounded-md border">
              <button
                type="button"
                className="flex w-full items-center justify-between border-b px-2 py-2 text-left text-sm hover:bg-accent"
                onClick={() => {
                  onChange("");
                  setOpen(false);
                }}
              >
                <span className="text-muted-foreground">Toți</span>
                {!valueId ? <FontAwesomeIcon icon={faCheck} className="text-primary" /> : null}
              </button>

              {filteredOptions.map((item) => {
                const selected = String(item.id) === String(valueId);

                return (
                  <button
                    key={item.id}
                    type="button"
                    className="flex w-full items-center justify-between border-b px-2 py-2 text-left text-sm last:border-b-0 hover:bg-accent"
                    onClick={() => {
                      onChange(String(item.id));
                      setOpen(false);
                    }}
                  >
                    <span className="min-w-0 truncate font-semibold text-foreground">{item.denumire}</span>
                    {selected ? <FontAwesomeIcon icon={faCheck} className="shrink-0 text-primary" /> : null}
                  </button>
                );
              })}

              {filteredOptions.length === 0 ? <div className="px-2 py-4 text-center text-sm text-muted-foreground">Niciun rezultat.</div> : null}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <Button type="button" variant="ghost" className="h-8 w-7 shrink-0 rounded-l-none px-0 text-foreground hover:bg-transparent xxxl:h-9 xxxl:w-8" onClick={onManage}>
        <FontAwesomeIcon icon={faList} className="text-sm xxxl:text-base" />
      </Button>
    </div>
  );
}

export default function InventarHeaderFiltersRow({ config, visibleColumns, getColumnStyle, advancedFilters, setAdvancedFilters, displayLang = "RO", textAlign = "center", showExpandColumn = true, isVariantView = false }) {
  const [claseFilterOpen, setClaseFilterOpen] = useState(false);
  const [metaDialogType, setMetaDialogType] = useState(null);
  const textAlignClasses = getAlignClasses(textAlign);
  const supportsMarca = config.id === "material" || config.id === "utilaj";

  const updateFilter = (key, value) => {
    setAdvancedFilters?.((prev) => ({ ...prev, [key]: value }));
  };

  const renderEmpty = (key) => (
    <TableHead key={key} style={getColumnStyle(key)} className={filterHeadClass}>
      <span className="sr-only">Filtru</span>
    </TableHead>
  );

  const renderStockFilter = (key, filterKey, placeholder) => (
    <TableHead style={getColumnStyle(key)} className={filterHeadClass}>
      <Select value={advancedFilters[filterKey] || "all"} onValueChange={(value) => updateFilter(filterKey, value)}>
        <SelectTrigger className={`${selectTriggerClass} justify-center text-center`}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Toate</SelectItem>
          <SelectItem value="cu">Cu</SelectItem>
          <SelectItem value="fara">Fără</SelectItem>
        </SelectContent>
      </Select>
    </TableHead>
  );

  return (
    <>
      <TableRow className="h-8 border-b bg-muted-foreground/25 hover:bg-muted-foreground/25 xxxl:h-9">
        {showExpandColumn && renderEmpty("expand")}

        {config.hasPhoto && visibleColumns.poza && renderEmpty("poza")}

        {visibleColumns.limba && renderEmpty("limba")}

        {visibleColumns.variante && (
          <TableHead style={getColumnStyle("variante")} className={filterHeadClass}>
            <button
              type="button"
              className="h-8 w-full truncate bg-transparent px-1.5 text-center text-xs font-black text-foreground hover:bg-transparent xxxl:h-9 xxxl:text-sm"
              onClick={() => updateFilter("variante", advancedFilters.variante === "0" ? "1" : "0")}
            >
              {advancedFilters.variante === "0" ? "Toate" : "Cu"}
            </button>
          </TableHead>
        )}

        {visibleColumns.cod && (
          <TableHead style={getColumnStyle("cod")} className={filterHeadClass}>
            <div className="flex h-8 pr-3 xxxl:h-9">
              <Input value={advancedFilters.cod} onChange={(event) => updateFilter("cod", formatCatalogFilterCode(event.target.value))} placeholder="Cod" className={`${inputClass} ${textAlignClasses.text} rounded-r-none`} />
              <Button type="button" variant="ghost" className="h-8 w-7 shrink-0 rounded-l-none px-0 text-foreground hover:bg-transparent xxxl:h-9 xxxl:w-8" onClick={() => setClaseFilterOpen(true)}>
                <FontAwesomeIcon icon={faLayerGroup} className="text-sm xxxl:text-base" />
              </Button>
            </div>
          </TableHead>
        )}

        {visibleColumns.clasa1 && renderEmpty("clasa1")}
        {visibleColumns.clasa2 && renderEmpty("clasa2")}

        {visibleColumns.denumire && (
          <TableHead style={getColumnStyle("denumire")} className={filterHeadClass}>
            <Input value={advancedFilters.denumire} onChange={(event) => updateFilter("denumire", event.target.value)} placeholder="Denumire" className={`${inputClass} ${textAlignClasses.text}`} />
          </TableHead>
        )}

        {visibleColumns.descriere && (
          <TableHead style={getColumnStyle("descriere")} className={filterHeadClass}>
            <Input value={advancedFilters.descriere || ""} onChange={(event) => updateFilter("descriere", event.target.value)} placeholder="Descriere" className={`${inputClass} ${textAlignClasses.text}`} />
          </TableHead>
        )}

        {visibleColumns.furnizor && (
          <TableHead style={getColumnStyle("furnizor")} className={filterHeadClass}>
            {isVariantView && config.hasFurnizor ? (
              <InventarMetaFilterCell type="furnizori" label="Furnizor" valueId={advancedFilters.furnizor_id || ""} onChange={(value) => updateFilter("furnizor_id", value)} onManage={() => setMetaDialogType("furnizori")} textAlign={textAlign} />
            ) : (
              <span className="sr-only">Filtru</span>
            )}
          </TableHead>
        )}
        {visibleColumns.marca && (
          <TableHead style={getColumnStyle("marca")} className={filterHeadClass}>
            {isVariantView && supportsMarca ? (
              <InventarMetaFilterCell type="marci" label="Marcă" valueId={advancedFilters.marca_id || ""} onChange={(value) => updateFilter("marca_id", value)} onManage={() => setMetaDialogType("marci")} textAlign={textAlign} />
            ) : (
              <span className="sr-only">Filtru</span>
            )}
          </TableHead>
        )}
        {visibleColumns.status && renderEmpty("status")}

        {visibleColumns.greutate && (
          <TableHead style={getColumnStyle("greutate")} className={filterHeadClass}>
            {config.id === "material" ? <Input value={advancedFilters.greutate || ""} onChange={(event) => updateFilter("greutate", event.target.value)} placeholder="Kg" className={`${inputClass} text-center`} /> : null}
          </TableHead>
        )}

        {visibleColumns.unitate && (
          <TableHead style={getColumnStyle("unitate")} className={filterHeadClass}>
            <Select value={advancedFilters.unitate} onValueChange={(value) => updateFilter("unitate", value)}>
              <SelectTrigger className={`${selectTriggerClass} justify-center text-center`}>
                <SelectValue placeholder="UM" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toate</SelectItem>
                {config.unitOptions.map((unit) => (
                  <SelectItem key={unit} value={unit}>
                    {unit}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </TableHead>
        )}

        {visibleColumns.cost && (
          <TableHead style={getColumnStyle("cost")} className={filterHeadClass}>
            <Input value={advancedFilters.cost} onChange={(event) => updateFilter("cost", event.target.value)} placeholder="Cost" className={`${inputClass} text-center`} />
          </TableHead>
        )}

        {visibleColumns.stocInventar && renderStockFilter("stocInventar", "stoc_inventar", "Stoc")}
        {visibleColumns.stocTotal && renderStockFilter("stocTotal", "stoc_total", "Total")}
        {visibleColumns.creat && renderEmpty("creat")}
        {visibleColumns.actualizat && renderEmpty("actualizat")}
      </TableRow>

      <ReteteClaseCoduriDialog
        open={claseFilterOpen}
        setOpen={setClaseFilterOpen}
        value={advancedFilters.cod}
        displayLang={displayLang}
        filterMode
        scope={getCatalogClassScope(config)}
        onApply={({ cod_filter }) => updateFilter("cod", formatCatalogFilterCode(cod_filter || ""))}
      />
      <CatalogMetaDialog type={metaDialogType || "furnizori"} open={Boolean(metaDialogType)} setOpen={(nextOpen) => !nextOpen && setMetaDialogType(null)} />
    </>
  );
}
