import React, { useState, useMemo, useContext } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFileExcel, faFilePdf, faChevronDown, faXmark, faCheckDouble, faDownload } from "@fortawesome/free-solid-svg-icons";
import ExportPontaje from "./ExportPontaje";
import ExportPontajeExcel from "./ExportPontajeExcel";
import { AuthContext } from "@/context/TokenContext";
import { useCompaniiInterne } from "@/hooks/useCompaniiInterne";
import { Checkbox } from "@/components/ui/checkbox";

// ─── Component ────────────────────────────────────────────────────────────────
const EMPTY_ARRAY = [];

export default function PontajeExportMenu({
  data = [], // all users (filtered or raw)
  selectedDates = [], // string[] yyyy-MM-dd
  selectMode,
  setSelectMode,
  companiiInterneOptions,
  selectedIds,
  setSelectedIds,
}) {
  const { user } = useContext(AuthContext);

  const [selectedCompany, setSelectedCompany] = useState("all");
  const [exportFormat, setExportFormat] = useState(null); // "pdf" | "excel" | null
  const [includeRapoarte, setIncludeRapoarte] = useState(false);

  const companies = useMemo(() => {
    if (!user?.permissions?.firme) return [];
    setSelectedCompany(String(user.permissions.firme[0] || "all"));
    return companiiInterneOptions.filter((c) => user.permissions.firme.includes(c.id));
  }, [companiiInterneOptions, user.permissions.firme]);

  // Users filtered by selected company
  const usersForCompany = data;

  const allSelected = usersForCompany.length > 0 && usersForCompany.every((u) => selectedIds.has(u.id));

  const toggleUser = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(usersForCompany.map((u) => u.id)));
    }
  };

  const cancelSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
    setExportFormat(null);
  };
  const enterSelectMode = (fmt) => {
    setExportFormat(fmt);
    setSelectMode(true);
    setSelectedIds(new Set());
  };

  const handleExport = () => {
    if (selectedIds.size === 0) return;
    const dates = selectedDates;
    if (exportFormat === "pdf") {
      ExportPontaje({ selectedUserIds: selectedIds, dates, selectedCompany, includeRapoarte });
    } else {
      ExportPontajeExcel({ selectedUserIds: selectedIds, dates, selectedCompany, includeRapoarte });
    }
    cancelSelectMode();
  };

  const handleExportAll = (fmt) => {
    const ids = new Set(usersForCompany.map((u) => u.id));
    const dates = selectedDates;
    if (fmt === "pdf") {
      ExportPontaje({ selectedUserIds: ids, dates, selectedCompany, includeRapoarte });
    } else {
      ExportPontajeExcel({ selectedUserIds: ids, dates, selectedCompany, includeRapoarte });
    }
  };

  // ── Select mode UI ────────────────────────────────────────────────────────
  if (selectMode) {
    return (
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" className="h-9 gap-2 text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive" onClick={cancelSelectMode}>
          <FontAwesomeIcon icon={faXmark} />
          Anulează
        </Button>

        <Button variant="outline" size="sm" className="h-9 text-foreground gap-2" onClick={toggleAll}>
          <FontAwesomeIcon icon={faCheckDouble} />
          {allSelected ? "Deselectează toți" : "Selectează toți"}
        </Button>

        {selectedIds.size > 0 && (
          <Badge variant="secondary" className="h-9 px-3 text-sm font-semibold tabular-nums">
            {selectedIds.size} selectați
          </Badge>
        )}

        <Button size="sm" className="h-9 gap-2 font-semibold" onClick={handleExport} disabled={selectedIds.size === 0}>
          <FontAwesomeIcon icon={exportFormat === "pdf" ? faFilePdf : faFileExcel} />
          Export {exportFormat === "pdf" ? "PDF" : "Excel"}
        </Button>
      </div>
    );
  }

  // ── Normal dropdown UI ────────────────────────────────────────────────────
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
        {/* Company picker */}
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

        {/* Include rapoarte */}
        <div
          className="px-1 py-2 select-none  hover:bg-accent hover:text-accent-foreground rounded-lg flex items-center"
          onClick={() => setIncludeRapoarte((prev) => !prev)}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <Checkbox className="w-5 h-5" checked={includeRapoarte} />
          <span className="ml-2 text-sm">Include și rapoartele</span>
        </div>

        <DropdownMenuSeparator />
        {/* Export all */}
        <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wide pb-1">Toată lumea ({usersForCompany.length})</DropdownMenuLabel>

        <DropdownMenuItem className="gap-2 cursor-pointer" disabled={selectedCompany == "all"} onClick={() => handleExportAll("pdf")}>
          <FontAwesomeIcon icon={faFilePdf} className="text-red-500 w-4" />
          Export PDF
        </DropdownMenuItem>
        <DropdownMenuItem className="gap-2 cursor-pointer" disabled={selectedCompany == "all"} onClick={() => handleExportAll("excel")}>
          <FontAwesomeIcon icon={faFileExcel} className="text-emerald-600 w-4" />
          Export Excel
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Select mode */}
        <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wide pb-1">Selectează utilizatori</DropdownMenuLabel>

        <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => enterSelectMode("pdf")}>
          <FontAwesomeIcon icon={faFilePdf} className="text-red-500 w-4" />
          Selectează → PDF
        </DropdownMenuItem>
        <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => enterSelectMode("excel")}>
          <FontAwesomeIcon icon={faFileExcel} className="text-emerald-600 w-4" />
          Selectează → Excel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
