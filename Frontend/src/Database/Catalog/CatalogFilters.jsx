import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faMagnifyingGlass,
  faPlus,
  faLanguage,
  faColumns,
  faFilter,
  faChevronDown,
  faChevronUp,
  faSortAmountDown,
  faSortAmountUp,
  faTimes,
  faLayerGroup,
  faListCheck,
  faAlignLeft,
  faHashtag,
  faRotateLeft,
  faFolderOpen,
} from "@fortawesome/free-solid-svg-icons";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import ReteteClaseCoduriDialog from "@/Database/Retete/ReteteClaseCoduriDialog";
import { faRotate } from "@fortawesome/free-solid-svg-icons/faRotate";

const DECIMAL_PLACE_VALUES = [1, 2];

const COLUMN_LABELS = {
  poza: "Poză",
  limba: "Limbă",
  variante: "Variante",
  cod: "Cod",
  clasa1: "Clasă",
  clasa2: "Subclasă",
  denumire: "Denumire",
  descriere: "Descriere",
  furnizor: "Furnizor",
  marca: "Marcă",
  status: "Status",
  greutate: "Greutate",
  unitate: "Unitate",
  cost: "Cost",
  stocTotal: "Stoc total",
  stocInventar: "Stoc inventar",
  creat: "Creat",
  actualizat: "Actualizat",
};

const getCatalogClassScope = (config) => `catalog_${config?.id || "material"}`;

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

export default function CatalogFilters({
  config,
  search,
  setSearch,
  totalItems,
  onAddClick,
  displayLang,
  onDisplayLangToggle,
  decimalPlaces = 2,
  setDecimalPlaces,
  textAlign = "center",
  setTextAlign,
  onResetColumnWidths,
  visibleColumns,
  toggleCol,
  advancedFilters,
  setAdvancedFilters,
  lockedLang = null,
  allRowsExpanded = false,
  onToggleAllRows,
  toggleAllRowsLabel = "Extinde/închide rânduri",
  viewMode = null,
  onToggleViewMode,
  viewModeLabel = "",
  viewModeLocked = false,
  showAdvancedFilters = true,
  showAddButton = true,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [claseFilterOpen, setClaseFilterOpen] = useState(false);
  const [claseCatalogOpen, setClaseCatalogOpen] = useState(false);

  const updateFilter = (key, value) => {
    setAdvancedFilters((prev) => ({ ...prev, [key]: value }));
  };

  const toggleSortOrder = () => {
    updateFilter("sortOrder", advancedFilters.sortOrder === "desc" ? "asc" : "desc");
  };

  const clearFilter = (key) => {
    const defaultValue = key === "limba" || key === "unitate" ? "all" : key === "variante" ? "0" : "";
    updateFilter(key, defaultValue);
  };

  const activeFilters = Object.entries(advancedFilters).filter(([key, value]) => {
    if (key === "sortBy" || key === "sortOrder") return false;
    return value !== "" && value !== "all" && value !== "0";
  });

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full bg-card flex flex-col gap-2 xxxl:gap-3 rounded-lg px-3 xxxl:px-4 py-2 xxxl:py-3 shadow-sm border border-border shrink-0 z-10">
      <div className="flex flex-wrap xl:flex-nowrap items-center justify-between gap-2 xxxl:gap-3 w-full">
        <div className="flex items-center gap-2 xxxl:gap-2.5 w-full xl:w-auto">
          {/* Butonul de Adăugare preia titlul dinamic */}
          {showAddButton && (
            <Button variant="default" className={`gap-2 h-8 xxxl:h-9 px-2.5 xxxl:px-3 text-sm xxxl:text-base ${config.hoverButton}`} onClick={onAddClick}>
              <FontAwesomeIcon icon={faPlus} className="text-sm xxxl:text-base" />
              <span className="tracking-wide">Adaugă {config.title}</span>
            </Button>
          )}

          {showAdvancedFilters && (
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="gap-2 h-8 xxxl:h-9 px-2.5 xxxl:px-3 text-sm xxxl:text-base text-foreground">
                <FontAwesomeIcon icon={faFilter} className={isOpen ? "text-primary" : "text-foreground"} />
                <span className="hidden sm:inline">Filtre avansate</span>
                <FontAwesomeIcon icon={isOpen ? faChevronUp : faChevronDown} className="text-xs ml-1" />
              </Button>
            </CollapsibleTrigger>
          )}

          <Button variant="outline" className="gap-2 h-8 xxxl:h-9 px-2.5 xxxl:px-3 text-sm xxxl:text-base text-foreground" onClick={() => setClaseCatalogOpen(true)}>
            <FontAwesomeIcon icon={faLayerGroup} />
            <span className="hidden sm:inline">Clase</span>
          </Button>

          <Separator orientation="vertical" className="h-8 xxxl:h-9 hidden sm:block" />

          <div className="flex items-center gap-2">
            <Select value={advancedFilters.sortBy} onValueChange={(v) => updateFilter("sortBy", v)}>
              <SelectTrigger className="bg-background text-foreground w-[9.5rem] xxxl:w-[10.5rem] h-8 xxxl:h-9 text-sm xxxl:text-base">
                <SelectValue placeholder="Sortează după" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="updated_at">Actualizat la</SelectItem>
                <SelectItem value="created_at">Creat la</SelectItem>
                <SelectItem value="cod_definitie">Cod</SelectItem>
                <SelectItem value="denumire">Denumire</SelectItem>
                {config.id === "material" && <SelectItem value="greutate">Greutate</SelectItem>}
                <SelectItem value="cost">Cost</SelectItem>
                {visibleColumns?.stocInventar && <SelectItem value="stoc_inventar">Stoc inventar</SelectItem>}
                {visibleColumns?.stocTotal && <SelectItem value="stoc_total">Stoc total</SelectItem>}
              </SelectContent>
            </Select>
            <Button variant="outline" className="h-8 xxxl:h-9 px-2.5 xxxl:px-3 shrink-0 text-sm xxxl:text-base text-foreground" onClick={toggleSortOrder}>
              <FontAwesomeIcon icon={advancedFilters.sortOrder === "desc" ? faSortAmountDown : faSortAmountUp} />
              {advancedFilters.sortOrder === "desc" ? "DESC" : "ASC"}
            </Button>
          </div>
        </div>

        <div className="relative justify-end w-full gap-2 xxxl:gap-3 flex flex-wrap xl:flex-nowrap items-center">
          {(onToggleViewMode || viewModeLocked) && (
            <>
              <Button onClick={onToggleViewMode} disabled={viewModeLocked} variant="outline" className="group gap-2 h-8 xxxl:h-9 text-sm xxxl:text-base text-foreground disabled:opacity-70">
                <FontAwesomeIcon icon={faRotate} className={`text-sm text-foreground transition-transform duration-500 ${viewModeLocked ? "" : "group-hover:rotate-[360deg]"}`} />
                <span>{viewModeLabel || "Schimbă view"}</span>
              </Button>
            </>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2 h-8 xxxl:h-9 text-sm xxxl:text-base text-foreground">
                <FontAwesomeIcon icon={faListCheck} />
                <span className="hidden sm:inline">Afișare</span>
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-56 p-1">
              <DropdownMenuItem className="gap-2 text-sm font-semibold" onSelect={onDisplayLangToggle}>
                <FontAwesomeIcon icon={faLanguage} className="text-sm text-foreground" />
                <span>Limbă</span>
                <span className="ml-auto text-sm font-black text-muted-foreground">{displayLang}</span>
              </DropdownMenuItem>

              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="gap-2 text-sm font-semibold">
                  <FontAwesomeIcon icon={faAlignLeft} className="text-sm text-foreground" />
                  Aliniere text
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-44 p-1">
                  <DropdownMenuCheckboxItem className="text-sm font-semibold" checked={textAlign === "left"} onSelect={(e) => e.preventDefault()} onCheckedChange={() => setTextAlign?.("left")}>
                    Stânga
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem className="text-sm font-semibold" checked={textAlign === "center"} onSelect={(e) => e.preventDefault()} onCheckedChange={() => setTextAlign?.("center")}>
                    Centru
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem className="text-sm font-semibold" checked={textAlign === "right"} onSelect={(e) => e.preventDefault()} onCheckedChange={() => setTextAlign?.("right")}>
                    Dreapta
                  </DropdownMenuCheckboxItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="gap-2 text-sm font-semibold">
                  <FontAwesomeIcon icon={faHashtag} className="text-sm text-foreground" />
                  Zecimale
                  <span className="ml-auto text-sm font-black text-muted-foreground">{decimalPlaces}</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-44 p-1">
                  {DECIMAL_PLACE_VALUES.map((value) => (
                    <DropdownMenuCheckboxItem
                      key={value}
                      className="text-sm font-semibold"
                      checked={decimalPlaces === value}
                      onSelect={(e) => e.preventDefault()}
                      onCheckedChange={() => setDecimalPlaces?.(value)}
                    >
                      {value} zecimal{value === 1 ? "ă" : "e"}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="gap-2 text-sm font-semibold">
                  <FontAwesomeIcon icon={faColumns} className="text-sm text-foreground" />
                  Coloane vizibile
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-52 p-1">
                  {Object.keys(visibleColumns)
                    .filter((colKey) => colKey !== "greutate" || config.id === "material")
                    .filter((colKey) => colKey !== "furnizor" || config.hasFurnizor)
                    .filter((colKey) => colKey !== "marca" || config.id === "material" || config.id === "utilaj")
                    .filter((colKey) => colKey !== "status" || config.hasStatus)
                    .map((colKey) => (
                      <DropdownMenuCheckboxItem
                        key={colKey}
                        checked={visibleColumns[colKey]}
                        onCheckedChange={(c) => toggleCol(colKey, c)}
                        onSelect={(e) => e.preventDefault()}
                        className="text-sm font-semibold"
                      >
                        {COLUMN_LABELS[colKey] || colKey}
                      </DropdownMenuCheckboxItem>
                    ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              {onToggleAllRows && (
                <>
                  <DropdownMenuSeparator />

                  <DropdownMenuItem className={`${allRowsExpanded ? "bg-primary/25 text-foreground focus:bg-primary/30" : ""} gap-2 text-sm font-semibold`} onSelect={onToggleAllRows}>
                    <FontAwesomeIcon icon={faFolderOpen} className={`text-sm ${allRowsExpanded ? "text-primary" : "text-foreground"}`} />
                    <span>{toggleAllRowsLabel}</span>
                  </DropdownMenuItem>
                </>
              )}

              <DropdownMenuSeparator />

              <DropdownMenuItem className="gap-2 text-sm font-semibold" onSelect={onResetColumnWidths}>
                <FontAwesomeIcon icon={faRotateLeft} className="text-sm text-foreground" />
                <span>Reset lățimi</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="max-w-[17rem] xxxl:max-w-[19rem] h-8 xxxl:h-9 relative w-full">
            <FontAwesomeIcon icon={faMagnifyingGlass} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Căutare rapidă..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 xxxl:pl-10 h-8 xxxl:h-9 text-sm xxxl:text-base bg-background" />
          </div>

          <Separator orientation="vertical" className="h-8 xxxl:h-9 hidden xl:block" />

          {/* Afișajul dinamic pentru iconiță, culoare și pluralul resursei */}
          <div className="flex items-center gap-2 text-muted-foreground font-medium shrink-0">
            <FontAwesomeIcon className={`text-xl xxxl:text-2xl ${config.colorClass}`} icon={config.icon} />
            <span className="text-sm xxxl:text-base">
              {totalItems} {config.titlePlural}
            </span>
          </div>
        </div>
      </div>

      {showAdvancedFilters && activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-1.5 xxxl:gap-2 items-center px-1">
          <span className="text-[11px] xxxl:text-xs font-bold text-muted-foreground uppercase mr-1">Filtre Active:</span>
          {activeFilters.map(([key, value]) => (
            <Badge key={key} variant="outline" className="gap-1.5 xxxl:gap-2 px-2 bg-muted text-xs xxxl:text-sm h-7 xxxl:h-8 font-medium border">
              <span className="">{key}:</span> {value == "1" ? "Da" : value == "0" ? "Nu" : value}
              {!(lockedLang && key === "limba") && <FontAwesomeIcon icon={faTimes} className="ml-1 cursor-pointer hover:text-destructive" onClick={() => clearFilter(key)} />}
            </Badge>
          ))}
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              setAdvancedFilters((prev) => ({
                ...prev,
                cod: "",
                denumire: "",
                descriere: "",
                greutate: "",
                unitate: "all",
                cost: "",
                variante: "0",
                limba: lockedLang || "all",
              }));
            }}
            className="h-8 text-xs xxxl:text-sm"
          >
            Șterge tot
          </Button>
        </div>
      )}

      {showAdvancedFilters && (
        <CollapsibleContent className="space-y-2 xxxl:space-y-3">
          <Separator />
          <div className="flex flex-wrap gap-2 xxxl:gap-3 items-end ">
            <div className="flex flex-col gap-1">
              <span className="text-[11px] xxxl:text-xs font-semibold uppercase text-foreground">Doar cu variante</span>
              <Button
                variant="outline"
                className="gap-2 h-8 xxxl:h-9 text-sm xxxl:text-base text-foreground w-[9rem] xxxl:w-[10rem]"
                onClick={() => updateFilter("variante", advancedFilters.variante === "0" ? "1" : "0")}
              >
                <FontAwesomeIcon icon={faLayerGroup} />
                <span>{advancedFilters.variante === "0" ? "Nu" : "Da"}</span>
              </Button>
            </div>

            <div className="flex flex-col w-[7rem] xxxl:w-[7.5rem] gap-1">
              <span className="text-[11px] xxxl:text-xs font-semibold uppercase text-foreground">Limbă</span>
              <Select value={advancedFilters.limba} onValueChange={(v) => updateFilter("limba", lockedLang || v)} disabled={!!lockedLang}>
                <SelectTrigger className="bg-background text-foreground h-8 xxxl:h-9 text-sm xxxl:text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toate</SelectItem>
                  <SelectItem value="RO">Română</SelectItem>
                  <SelectItem value="FR">Franceză</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col w-[9rem] xxxl:w-[10rem] gap-1">
              <span className="text-[11px] xxxl:text-xs font-semibold uppercase text-foreground">Cod</span>
              <div className="flex">
                <Input
                  value={advancedFilters.cod}
                  onChange={(e) => updateFilter("cod", formatCatalogFilterCode(e.target.value))}
                  className="bg-background h-8 xxxl:h-9 text-sm xxxl:text-base rounded-r-none"
                />
                <Button type="button" variant="outline" className="h-8 xxxl:h-9 w-8 xxxl:w-9 rounded-l-none border-l-0 px-0 text-foreground" onClick={() => setClaseFilterOpen(true)}>
                  <FontAwesomeIcon icon={faLayerGroup} className="text-xs" />
                </Button>
              </div>
            </div>

            <div className="flex flex-col min-w-[12rem] xxxl:min-w-[14rem] flex-1 gap-1">
              <span className="text-[11px] xxxl:text-xs font-semibold uppercase text-foreground">Denumire</span>
              <Input value={advancedFilters.denumire} onChange={(e) => updateFilter("denumire", e.target.value)} className="bg-background h-8 xxxl:h-9 text-sm xxxl:text-base" />
            </div>

            <div className="flex flex-col min-w-[12rem] xxxl:min-w-[14rem] flex-1 gap-1">
              <span className="text-[11px] xxxl:text-xs font-semibold uppercase text-foreground">Descriere</span>
              <Input value={advancedFilters.descriere} onChange={(e) => updateFilter("descriere", e.target.value)} className="bg-background h-8 xxxl:h-9 text-sm xxxl:text-base" />
            </div>

            <div className="flex flex-col w-[7rem] xxxl:w-[7.5rem] gap-1">
              <span className="text-[11px] xxxl:text-xs font-semibold uppercase text-foreground">Unitate</span>
              <Select value={advancedFilters.unitate} onValueChange={(v) => updateFilter("unitate", v)}>
                <SelectTrigger className="bg-background text-foreground h-8 xxxl:h-9 text-sm xxxl:text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toate</SelectItem>
                  {/* Opțiunile de unitate sunt generate dinamic din config */}
                  {config.unitOptions.map((unit) => (
                    <SelectItem key={unit} value={unit}>
                      {unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {config.id === "material" && (
              <div className="flex flex-col w-[8rem] xxxl:w-[9rem] gap-1">
                <span className="text-[11px] xxxl:text-xs font-semibold uppercase text-foreground">Greutate</span>
                <Input value={advancedFilters.greutate || ""} onChange={(e) => updateFilter("greutate", e.target.value)} className="bg-background h-8 xxxl:h-9 text-sm xxxl:text-base" />
              </div>
            )}

            <div className="flex flex-col w-[9rem] xxxl:w-[10rem] gap-1">
              <span className="text-[11px] xxxl:text-xs font-semibold uppercase text-foreground">Cost</span>
              <Input value={advancedFilters.cost} onChange={(e) => updateFilter("cost", e.target.value)} className="bg-background h-8 xxxl:h-9 text-sm xxxl:text-base" />
            </div>
          </div>
        </CollapsibleContent>
      )}
      <ReteteClaseCoduriDialog
        open={claseFilterOpen}
        setOpen={setClaseFilterOpen}
        value={advancedFilters.cod}
        displayLang={displayLang}
        filterMode
        scope={getCatalogClassScope(config)}
        onApply={({ cod_filter }) => updateFilter("cod", formatCatalogFilterCode(cod_filter || ""))}
      />
      <ReteteClaseCoduriDialog open={claseCatalogOpen} setOpen={setClaseCatalogOpen} displayLang={displayLang} catalogMode scope={getCatalogClassScope(config)} />
    </Collapsible>
  );
}
