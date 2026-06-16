import React, { useContext, useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheckDouble, faChevronDown, faDownload, faFilePdf, faXmark } from "@fortawesome/free-solid-svg-icons";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { AuthContext } from "@/context/TokenContext";
import ExportPontajeSantiere from "./ExportPontajeSantiere";

export default function PontajeSantiereExportMenu({ selectedDates = [], selectMode, setSelectMode, companiiInterneOptions = [], selectedIds, setSelectedIds }) {
  const { user } = useContext(AuthContext);
  const [selectedCompany, setSelectedCompany] = useState("all");

  const companies = useMemo(() => {
    const allowedFirmIds = user?.permissions?.firme;

    if (!Array.isArray(allowedFirmIds) || allowedFirmIds.length === 0) {
      return companiiInterneOptions || [];
    }

    return (companiiInterneOptions || []).filter((c) => allowedFirmIds.includes(c.id));
  }, [companiiInterneOptions, user?.permissions?.firme]);

  useEffect(() => {
    if (!companies.length) {
      setSelectedCompany("all");
      return;
    }

    setSelectedCompany((prev) => {
      if (prev !== "all" && companies.some((c) => String(c.id) === String(prev))) return prev;
      return String(companies[0].id);
    });
  }, [companies]);

  const cancelSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  const enterSelectMode = () => {
    setSelectMode(true);
    setSelectedIds(new Set());
  };

  const clearSelected = () => {
    setSelectedIds(new Set());
  };

  const handleExportAll = () => {
    ExportPontajeSantiere({
      mode: "all",
      dates: selectedDates,
      selectedCompany,
    });
  };

  const handleExportSelected = () => {
    if (selectedIds.size === 0) return;

    ExportPontajeSantiere({
      mode: "selected",
      selectedSantierIds: selectedIds,
      dates: selectedDates,
      selectedCompany,
    });

    cancelSelectMode();
  };

  if (selectMode) {
    return (
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" className="h-9 gap-2 text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive" onClick={cancelSelectMode}>
          <FontAwesomeIcon icon={faXmark} />
          Anulează
        </Button>

        <Button variant="outline" size="sm" className="h-9 text-foreground gap-2" onClick={clearSelected} disabled={selectedIds.size === 0}>
          <FontAwesomeIcon icon={faCheckDouble} />
          Deselectează toate
        </Button>

        {selectedIds.size > 0 && (
          <Badge variant="secondary" className="h-9 px-3 text-sm font-semibold tabular-nums">
            {selectedIds.size} selectate
          </Badge>
        )}

        <Button size="sm" className="h-9 gap-2 font-semibold" onClick={handleExportSelected} disabled={selectedIds.size === 0 || selectedCompany === "all"}>
          <FontAwesomeIcon icon={faFilePdf} />
          Export PDF
        </Button>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2 h-9 font-semibold">
          <FontAwesomeIcon icon={faDownload} className="text-foreground" />
          <span className="hidden sm:inline text-foreground">Export</span>
          <FontAwesomeIcon icon={faChevronDown} className="text-muted-foreground text-xs" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64 p-2" onCloseAutoFocus={(e) => e.preventDefault()}>
        <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wide pb-1">Logo Companie</DropdownMenuLabel>

        <div className="px-1 pb-2" onPointerDown={(e) => e.stopPropagation()}>
          <Select value={selectedCompany} onValueChange={setSelectedCompany}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Selectează compania" />
            </SelectTrigger>

            <SelectContent>
              {companies.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.nume}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wide pb-1">Toate șantierele</DropdownMenuLabel>

        <DropdownMenuItem className="gap-2 cursor-pointer" disabled={selectedCompany === "all"} onClick={handleExportAll}>
          <FontAwesomeIcon icon={faFilePdf} className="text-red-500 w-4" />
          Export PDF
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wide pb-1">Selectează șantiere</DropdownMenuLabel>

        <DropdownMenuItem className="gap-2 cursor-pointer" onClick={enterSelectMode}>
          <FontAwesomeIcon icon={faFilePdf} className="text-red-500 w-4" />
          Selectează → PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
