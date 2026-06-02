import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagnifyingGlass, faPlus, faLanguage, faColumns, faFilter, faChevronDown, faChevronUp, faSortAmountDown, faSortAmountUp, faTimes, faDatabase } from "@fortawesome/free-solid-svg-icons";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";

export default function ReteteFilters({
  search,
  lockedLang = null,
  setSearch,
  totalItems,
  onAddClick,
  displayLang,
  onDisplayLangToggle,
  visibleColumns,
  toggleCol,
  advancedFilters,
  setAdvancedFilters,
}) {
  const [isOpen, setIsOpen] = useState(false);

  const updateFilter = (key, value) => {
    setAdvancedFilters((prev) => ({ ...prev, [key]: value }));
  };

  const toggleSortOrder = () => {
    updateFilter("sortOrder", advancedFilters.sortOrder === "desc" ? "asc" : "desc");
  };

  const clearFilter = (key) => {
    const defaultValue = key === "limba" || key === "unitate" ? "all" : "";
    updateFilter(key, defaultValue);
  };

  const activeFilters = Object.entries(advancedFilters).filter(([key, value]) => {
    if (key === "sortBy" || key === "sortOrder") return false;
    return value !== "" && value !== "all";
  });

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full bg-card flex flex-col gap-4 rounded-lg px-6 py-4 shadow-sm border border-border shrink-0 z-10">
      <div className="flex flex-wrap xl:flex-nowrap items-center justify-between gap-4 w-full">
        <div className="flex items-center gap-3 w-full xl:w-auto">
          {/* Butonul de Adăugare hardcodat pe sky-600 */}
          <Button variant="default" size="lg" className="gap-2 bg-sky-600 hover:bg-sky-700 text-white" onClick={onAddClick}>
            <FontAwesomeIcon icon={faPlus} className="text-base" />
            <span className="tracking-wide">Adaugă Rețetă</span>
          </Button>

          <CollapsibleTrigger asChild>
            <Button variant="outline" size="lg" className="gap-2 text-foreground">
              <FontAwesomeIcon icon={faFilter} className={isOpen ? "text-sky-600" : "text-foreground"} />
              <span className="hidden sm:inline">Filtre avansate</span>
              <FontAwesomeIcon icon={isOpen ? faChevronUp : faChevronDown} className="text-xs ml-1" />
            </Button>
          </CollapsibleTrigger>

          <Separator orientation="vertical" className="h-10 hidden sm:block" />

          <div className="flex items-center gap-2">
            <Select value={advancedFilters.sortBy} onValueChange={(v) => updateFilter("sortBy", v)}>
              <SelectTrigger className="bg-background text-foreground w-[11rem] h-10">
                <SelectValue placeholder="Sortează după" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="updated_at">Actualizat la</SelectItem>
                <SelectItem value="created_at">Creat la</SelectItem>
                <SelectItem value="cod_reteta">Cod Rețetă</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="h-10 shrink-0 text-foreground" onClick={toggleSortOrder}>
              <FontAwesomeIcon icon={advancedFilters.sortOrder === "desc" ? faSortAmountDown : faSortAmountUp} />
              {advancedFilters.sortOrder === "desc" ? "DESC" : "ASC"}
            </Button>
          </div>
        </div>

        <div className="relative justify-end w-full gap-2 xl:gap-4 flex flex-wrap xl:flex-nowrap items-center">
          <Button variant="outline" className="gap-2 h-10 text-foreground w-[5rem]" onClick={onDisplayLangToggle}>
            <FontAwesomeIcon icon={faLanguage} />
            <span>{displayLang}</span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2 h-10 text-foreground">
                <FontAwesomeIcon icon={faColumns} />
                <span className="hidden sm:inline">Coloane</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Vizibilitate coloane</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {Object.keys(visibleColumns).map((colKey) => (
                <DropdownMenuCheckboxItem key={colKey} checked={visibleColumns[colKey]} onCheckedChange={(c) => toggleCol(colKey, c)} onSelect={(e) => e.preventDefault()} className="capitalize">
                  {colKey.replace("_", " ")}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="max-w-[20rem] h-10 relative w-full">
            <FontAwesomeIcon icon={faMagnifyingGlass} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Căutare rapidă..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 h-10 text-base bg-background" />
          </div>

          <Separator orientation="vertical" className="h-10 hidden xl:block" />

          {/* Afișajul hardcodat cu faDatabase și sky-600 */}
          <div className="flex items-center gap-2 text-muted-foreground font-medium shrink-0">
            <FontAwesomeIcon className="text-2xl text-sky-600" icon={faDatabase} />
            <span>{totalItems} Rețete</span>
          </div>
        </div>
      </div>

      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center px-1">
          <span className="text-xs font-bold text-muted-foreground uppercase mr-1">Filtre Active:</span>
          {activeFilters.map(([key, value]) => (
            <Badge key={key} variant="outline" className="gap-2 px-2 bg-muted text-sm h-8 font-medium border">
              <span className="">{key.replace("_", " ")}:</span> {value}
              <FontAwesomeIcon icon={faTimes} className="ml-1 cursor-pointer hover:text-destructive" onClick={() => clearFilter(key)} />
            </Badge>
          ))}
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              setAdvancedFilters((prev) => ({
                ...prev,
                limba: "all",
                cod: "",
                clasa_reteta: "",
                denumire: "",
                unitate: "all",
              }));
            }}
          >
            Șterge tot
          </Button>
        </div>
      )}

      <CollapsibleContent className="space-y-4">
        <Separator />
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex flex-col w-[8rem] gap-1.5">
            <span className="text-xs font-semibold uppercase text-foreground">Limbă</span>
            <Select
              value={lockedLang || advancedFilters.limba}
              disabled={!!lockedLang}
              onValueChange={(value) =>
                setAdvancedFilters((prev) => ({
                  ...prev,
                  limba: lockedLang || value,
                }))
              }
            >
              <SelectTrigger className="bg-background text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toate</SelectItem>
                <SelectItem value="RO">Română</SelectItem>
                <SelectItem value="FR">Franceză</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col w-[10rem] gap-1.5">
            <span className="text-xs font-semibold uppercase text-foreground">Cod</span>
            <Input value={advancedFilters.cod} onChange={(e) => updateFilter("cod", e.target.value)} className="bg-background" />
          </div>

          <div className="flex flex-col min-w-[12rem] flex-1 gap-1.5">
            <span className="text-xs font-semibold uppercase text-foreground">Clasa Rețetă</span>
            <Input value={advancedFilters.clasa_reteta} onChange={(e) => updateFilter("clasa_reteta", e.target.value)} className="bg-background" placeholder="Ex: Betoane, Asfalt..." />
          </div>

          <div className="flex flex-col min-w-[15rem] flex-1 gap-1.5">
            <span className="text-xs font-semibold uppercase text-foreground">Denumire</span>
            <Input value={advancedFilters.denumire} onChange={(e) => updateFilter("denumire", e.target.value)} className="bg-background" />
          </div>

          <div className="flex flex-col w-[8rem] gap-1.5">
            <span className="text-xs font-semibold uppercase text-foreground">Unitate</span>
            <Select value={advancedFilters.unitate} onValueChange={(v) => updateFilter("unitate", v)}>
              <SelectTrigger className="bg-background text-foreground">
                <SelectValue />
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
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
