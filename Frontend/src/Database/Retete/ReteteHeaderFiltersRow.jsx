import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFolderTree } from "@fortawesome/free-solid-svg-icons";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TableHead, TableRow } from "@/components/ui/table";
import ReteteClaseCoduriDialog from "./ReteteClaseCoduriDialog";

const formatCodFilter = (value) => {
  const digits = String(value || "")
    .replace(/\D/g, "")
    .slice(0, 13);
  const classDigits = digits.slice(0, 10);
  const recipeDigits = digits.slice(10);
  const classSegments = classDigits.match(/.{1,2}/g) || [];

  return [...classSegments, ...(recipeDigits ? [recipeDigits] : [])].join(" ");
};

const filterHeadClass = "h-8 border-b bg-transparent px-0 align-middle xxxl:h-9";
const inputClass =
  "h-8 border-0 bg-transparent px-1.5 text-xs font-semibold shadow-none outline-none placeholder:text-muted-foreground/70 focus-visible:ring-0 xxxl:h-9 xxxl:text-sm";
const selectTriggerClass = "h-8 border-0 bg-transparent px-1.5 text-xs font-semibold shadow-none focus:ring-0 focus-visible:ring-0 xxxl:h-9 xxxl:text-sm";

const getAlignClasses = (align = "center") => {
  if (align === "left") return { text: "text-left" };
  if (align === "right") return { text: "text-right" };
  return { text: "text-center" };
};

export default function ReteteHeaderFiltersRow({ visibleColumns, getColumnStyle, advancedFilters, setAdvancedFilters, lockedLang = null, displayLang = "RO", textAlign = "center" }) {
  const [claseFilterOpen, setClaseFilterOpen] = useState(false);
  const textAlignClasses = getAlignClasses(textAlign);
  const showCol = (colKey) => (visibleColumns ? visibleColumns[colKey] : true);

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
        {showCol("limba") && (
          <TableHead style={getColumnStyle("limba")} className={filterHeadClass}>
            <Select value={lockedLang || advancedFilters.limba} onValueChange={(value) => updateFilter("limba", lockedLang || value)} disabled={!!lockedLang}>
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

        {showCol("elemente") && renderEmpty("elemente")}

        {showCol("cod") && (
          <TableHead style={getColumnStyle("cod")} className={filterHeadClass}>
            <div className="flex h-8 pr-3 xxxl:h-9">
              <Input value={advancedFilters.cod} onChange={(event) => updateFilter("cod", formatCodFilter(event.target.value))} placeholder="Cod" className={`${inputClass} ${textAlignClasses.text} rounded-r-none`} />
              <Button type="button" variant="ghost" className="h-8 w-7 shrink-0 rounded-l-none px-0 text-foreground hover:bg-transparent xxxl:h-9 xxxl:w-8" onClick={() => setClaseFilterOpen(true)}>
                <FontAwesomeIcon icon={faFolderTree} className="text-sm xxxl:text-base" />
              </Button>
            </div>
          </TableHead>
        )}

        {["clasa1", "clasa2", "clasa3", "clasa4", "clasa5"].map((key) => (showCol(key) ? renderEmpty(key) : null))}

        {showCol("denumire") && (
          <TableHead style={getColumnStyle("denumire")} className={filterHeadClass}>
            <Input value={advancedFilters.denumire} onChange={(event) => updateFilter("denumire", event.target.value)} placeholder="Denumire" className={`${inputClass} ${textAlignClasses.text}`} />
          </TableHead>
        )}

        {showCol("unitate") && (
          <TableHead style={getColumnStyle("unitate")} className={filterHeadClass}>
            <Select value={advancedFilters.unitate} onValueChange={(value) => updateFilter("unitate", value)}>
              <SelectTrigger className={`${selectTriggerClass} justify-center text-center`}>
                <SelectValue placeholder="UM" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toate</SelectItem>
                <SelectItem value="m³">m³</SelectItem>
                <SelectItem value="t">t</SelectItem>
                <SelectItem value="kg">kg</SelectItem>
                <SelectItem value="m²">m²</SelectItem>
                <SelectItem value="m">m</SelectItem>
                <SelectItem value="buc">buc</SelectItem>
              </SelectContent>
            </Select>
          </TableHead>
        )}

        {showCol("greutate") && renderEmpty("greutate")}
        {showCol("cost") && renderEmpty("cost")}
        {showCol("creat") && renderEmpty("creat")}
        {showCol("actualizat") && renderEmpty("actualizat")}
      </TableRow>

      <ReteteClaseCoduriDialog
        open={claseFilterOpen}
        setOpen={setClaseFilterOpen}
        value={advancedFilters.cod}
        displayLang={displayLang}
        filterMode
        onApply={({ cod_filter }) => updateFilter("cod", cod_filter || "")}
      />
    </>
  );
}
