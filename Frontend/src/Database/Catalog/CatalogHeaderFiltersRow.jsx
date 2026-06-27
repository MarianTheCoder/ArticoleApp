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

// Filtru pe furnizor/marcă (meta) — listă căutabilă + scurtătură către dialogul de administrare meta.
function CatalogMetaFilterCell({ type, label, valueId, onChange, onManage, textAlign = "center" }) {
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

export default function CatalogHeaderFiltersRow({ config, visibleColumns, getColumnStyle, advancedFilters, setAdvancedFilters, lockedLang = null, displayLang = "RO", textAlign = "center" }) {
  const [claseFilterOpen, setClaseFilterOpen] = useState(false);
  const [metaDialogType, setMetaDialogType] = useState(null);
  const supportsMarca = config.id === "material" || config.id === "utilaj";
  const showCol = (colKey) => (visibleColumns ? visibleColumns[colKey] : true);
  const textAlignClasses = getAlignClasses(textAlign);

  const updateFilter = (key, value) => {
    setAdvancedFilters?.((prev) => ({ ...prev, [key]: value }));
  };

  const renderEmpty = (key) => (
    <TableHead key={key} style={getColumnStyle(key)} className={filterHeadClass}>
      <span className="sr-only">Filtru</span>
    </TableHead>
  );

  return (
    <>
      <TableRow className="h-8 border-b bg-muted-foreground/25 hover:bg-muted-foreground/25 xxxl:h-9">
        {config.hasPhoto && showCol("poza") && renderEmpty("poza")}

        {showCol("limba") && (
          <TableHead style={getColumnStyle("limba")} className={filterHeadClass}>
            <Select value={advancedFilters.limba} onValueChange={(value) => updateFilter("limba", lockedLang || value)} disabled={!!lockedLang}>
              <SelectTrigger className={`${selectTriggerClass} justify-center text-center`}>
                <SelectValue placeholder="Limbă" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toate</SelectItem>
                <SelectItem value="RO">RO</SelectItem>
                <SelectItem value="FR">FR</SelectItem>
              </SelectContent>
            </Select>
          </TableHead>
        )}

        {showCol("variante") && (
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

        {showCol("cod") && (
          <TableHead style={getColumnStyle("cod")} className={filterHeadClass}>
            <div className="flex h-8 pr-3 xxxl:h-9">
              <Input value={advancedFilters.cod} onChange={(event) => updateFilter("cod", formatCatalogFilterCode(event.target.value))} placeholder="Cod" className={`${inputClass} ${textAlignClasses.text} rounded-r-none`} />
              <Button type="button" variant="ghost" className="h-8 w-7 shrink-0 rounded-l-none px-0 text-foreground hover:bg-transparent xxxl:h-9 xxxl:w-8" onClick={() => setClaseFilterOpen(true)}>
                <FontAwesomeIcon icon={faLayerGroup} className="text-sm xxxl:text-base" />
              </Button>
            </div>
          </TableHead>
        )}

        {showCol("clasa1") && renderEmpty("clasa1")}
        {showCol("clasa2") && renderEmpty("clasa2")}

        {showCol("denumire") && (
          <TableHead style={getColumnStyle("denumire")} className={filterHeadClass}>
            <Input value={advancedFilters.denumire} onChange={(event) => updateFilter("denumire", event.target.value)} placeholder="Denumire" className={`${inputClass} ${textAlignClasses.text}`} />
          </TableHead>
        )}

        {showCol("descriere") && (
          <TableHead style={getColumnStyle("descriere")} className={filterHeadClass}>
            <Input value={advancedFilters.descriere || ""} onChange={(event) => updateFilter("descriere", event.target.value)} placeholder="Descriere" className={`${inputClass} ${textAlignClasses.text}`} />
          </TableHead>
        )}

        {config.hasFurnizor && showCol("furnizor") && (
          <TableHead style={getColumnStyle("furnizor")} className={filterHeadClass}>
            <CatalogMetaFilterCell type="furnizori" label="Furnizor" valueId={advancedFilters.furnizor_id || ""} onChange={(value) => updateFilter("furnizor_id", value)} onManage={() => setMetaDialogType("furnizori")} textAlign={textAlign} />
          </TableHead>
        )}
        {supportsMarca && showCol("marca") && (
          <TableHead style={getColumnStyle("marca")} className={filterHeadClass}>
            <CatalogMetaFilterCell type="marci" label="Marcă" valueId={advancedFilters.marca_id || ""} onChange={(value) => updateFilter("marca_id", value)} onManage={() => setMetaDialogType("marci")} textAlign={textAlign} />
          </TableHead>
        )}
        {config.hasStatus && showCol("status") && renderEmpty("status")}

        {showCol("unitate") && (
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

        {showCol("greutate") && (
          <TableHead style={getColumnStyle("greutate")} className={filterHeadClass}>
            {config.id === "material" ? <Input value={advancedFilters.greutate || ""} onChange={(event) => updateFilter("greutate", event.target.value)} placeholder="Kg" className={`${inputClass} text-center`} /> : null}
          </TableHead>
        )}

        {showCol("cost") && (
          <TableHead style={getColumnStyle("cost")} className={filterHeadClass}>
            <Input value={advancedFilters.cost} onChange={(event) => updateFilter("cost", event.target.value)} placeholder="Cost" className={`${inputClass} text-center`} />
          </TableHead>
        )}

        {showCol("creat") && renderEmpty("creat")}
        {showCol("actualizat") && renderEmpty("actualizat")}
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
