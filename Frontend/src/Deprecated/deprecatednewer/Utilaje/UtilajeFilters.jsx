import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faMagnifyingGlass,
  faPlus,
  faTruck, // Schimbăm iconița pentru Utilaje
  faLanguage,
  faColumns,
  faFilter,
  faChevronDown,
  faChevronUp,
  faSortAmountDown,
  faSortAmountUp,
  faTimes,
  faLayerGroup,
} from "@fortawesome/free-solid-svg-icons";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";

export default function UtilajeFilters({ search, setSearch, totalItems, onAddClick, displayLang, onDisplayLangToggle, visibleColumns, toggleCol, advancedFilters, setAdvancedFilters }) {
  const [isOpen, setIsOpen] = useState(false);

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
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full bg-card flex flex-col gap-4 rounded-lg px-6 py-4 shadow-sm border border-border shrink-0 z-10">
      <div className="flex flex-wrap xl:flex-nowrap items-center justify-between gap-4 w-full">
        <div className="flex items-center gap-3 w-full xl:w-auto">
          <Button variant="default" size="lg" className="gap-2 bg-rose-600 hover:bg-rose-700" onClick={onAddClick}>
            <FontAwesomeIcon icon={faPlus} className="text-base" />
            <span className="tracking-wide">Adaugă Utilaj</span>
          </Button>

          <CollapsibleTrigger asChild>
            <Button variant="outline" size="lg" className="gap-2 text-foreground">
              <FontAwesomeIcon icon={faFilter} className={isOpen ? "text-primary" : "text-foreground"} />
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
                <SelectItem value="cod_definitie">Cod</SelectItem>
                <SelectItem value="cost">Cost</SelectItem>
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
                  {colKey}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="max-w-[20rem] h-10 relative w-full">
            <FontAwesomeIcon icon={faMagnifyingGlass} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Căutare rapidă..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 h-10 text-base bg-background" />
          </div>

          <Separator orientation="vertical" className="h-10 hidden xl:block" />

          <div className="flex items-center gap-2 text-muted-foreground font-medium shrink-0">
            <FontAwesomeIcon className="text-2xl text-rose-600" icon={faTruck} />
            <span>{totalItems} Utilaje</span>
          </div>
        </div>
      </div>

      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center px-1">
          <span className="text-xs font-bold text-muted-foreground uppercase mr-1">Filtre Active:</span>
          {activeFilters.map(([key, value]) => (
            <Badge key={key} variant="outline" className="gap-2 px-2 bg-muted text-sm h-8 font-medium border">
              <span className="">{key}:</span> {value == "1" ? "Da" : value == "0" ? "Nu" : value}
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
                denumire: "",
                descriere: "",
                unitate: "all",
                cost: "",
                variante: "0",
              }));
            }}
          >
            Șterge tot
          </Button>
        </div>
      )}

      <CollapsibleContent className="space-y-4">
        <Separator />
        <div className="flex flex-wrap gap-4 items-end ">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase text-foreground">Doar cu variante</span>
            <Button variant="outline" className="gap-2 text-foreground w-[10rem]" onClick={() => updateFilter("variante", advancedFilters.variante === "0" ? "1" : "0")}>
              <FontAwesomeIcon icon={faLayerGroup} />
              <span>{advancedFilters.variante === "0" ? "Nu" : "Da"}</span>
            </Button>
          </div>

          <div className="flex flex-col w-[8rem] gap-1.5">
            <span className="text-xs font-semibold uppercase text-foreground">Limbă</span>
            <Select value={advancedFilters.limba} onValueChange={(v) => updateFilter("limba", v)}>
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
            <Input value={advancedFilters.cod} onChange={(e) => updateFilter("cod", e.target.value)} className="bg-background " />
          </div>

          <div className="flex flex-col min-w-[15rem] flex-1 gap-1.5">
            <span className="text-xs font-semibold uppercase text-foreground">Denumire</span>
            <Input value={advancedFilters.denumire} onChange={(e) => updateFilter("denumire", e.target.value)} className="bg-background" />
          </div>

          <div className="flex flex-col min-w-[15rem] flex-1 gap-1.5">
            <span className="text-xs font-semibold uppercase text-foreground">Descriere</span>
            <Input value={advancedFilters.descriere} onChange={(e) => updateFilter("descriere", e.target.value)} className="bg-background" />
          </div>

          <div className="flex flex-col w-[8rem] gap-1.5">
            <span className="text-xs font-semibold uppercase text-foreground">Unitate</span>
            <Select value={advancedFilters.unitate} onValueChange={(v) => updateFilter("unitate", v)}>
              <SelectTrigger className="bg-background text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toate</SelectItem>
                <SelectItem value="buc">buc</SelectItem>
                <SelectItem value="kg">kg</SelectItem>
                <SelectItem value="m">m</SelectItem>
                <SelectItem value="m2">m2</SelectItem>
                <SelectItem value="m3">m3</SelectItem>
                <SelectItem value="l">l</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col w-[10rem] gap-1.5">
            <span className="text-xs font-semibold uppercase text-foreground">Cost</span>
            <Input value={advancedFilters.cost} onChange={(e) => updateFilter("cost", e.target.value)} className="bg-background" />
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
