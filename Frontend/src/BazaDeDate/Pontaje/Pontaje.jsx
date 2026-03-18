import React, { useEffect, useState, useContext, useMemo, useCallback } from "react";
import { DayPicker, getDefaultClassNames } from "react-day-picker";
import api from "../../api/axiosAPI";
import photoApi from "../../api/photoAPI";
import { format } from "date-fns";
import "react-day-picker/style.css";
import "../../assets/customCalendar.css";
import { faClock } from "@fortawesome/free-regular-svg-icons";
import {
  faChevronDown,
  faUserSlash,
  faExclamationCircle,
  faFileArrowDown,
  faFileExcel,
  faFilePdf,
  faFilter,
  faLessThan,
  faMagnifyingGlass,
  faRetweet,
  faSkullCrossbones,
  faThumbTackSlash,
  faColumns,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { GoogleMap, Marker } from "@react-google-maps/api";
import ExportPontaje from "./Export/ExportPontaje";
import ExportPontajeExcel from "./Export/ExportPontajeExcel";
// import PontajeSantierLeftPanel from "./Deprecated/PontajeSantierLeftPanel";
// import PontajeSantierTable from "./Deprecated/PontajeSantierTable";
import { PontajeCalendar } from "./PontajCalendar";
import { useAtribuiri, addPontaj, usePontaje } from "@/hooks/usePontaje";
import { useLoading } from "@/context/LoadingContext";
import PontajeList from "./PontajeList";
import PontajeLeftPanel from "./PontajeLeftPanel";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import PontajAddDialog from "./PontajAddDialog";
import { toast } from "sonner";
import PontajeExportMenu from "./Export/PontajeExportMenu";
import { useCompaniiInterne } from "@/hooks/useCompaniiInterne";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AuthContext } from "@/context/TokenContext";

const EMPTY_ARR = [];

function normalizeText(str) {
  return (str || "")
    .toLowerCase()
    .normalize("NFD") // decompose characters
    .replace(/[\u0300-\u036f]/g, ""); // remove diacritics
}

const RO_TZ = "Europe/Bucharest";

// formatări în ora RO (fără să schimbi Date-ul)
const fmtTimeRO = (d) =>
  new Intl.DateTimeFormat("ro-RO", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: RO_TZ,
  }).format(d);

// minutes as a float (no per-session floor)
const minutesByClock = (startISO, endISO) => {
  if (!startISO || !endISO) return 0;
  const sMin = Math.floor(new Date(startISO).getTime() / 60000);
  const eMin = Math.floor(new Date(endISO).getTime() / 60000);
  return Math.max(0, eMin - sMin);
};

// format integer minutes -> "HH:MM"
const fmtHHMM = (totalMinutesInt) => {
  const hh = Math.floor(totalMinutesInt / 60);
  const mm = totalMinutesInt % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
};

export default function Pontaje() {
  // --- OTHERS ---
  const { show, hide, loading } = useLoading();
  const { user } = useContext(AuthContext);

  const [showInactivi, setShowInactivi] = useState(false);

  // --- STATES OPEN ---

  const [selectedDates, setSelectedDates] = useState([new Date()]);

  const [open, setOpen] = useState(false);

  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedUserEdit, setSelectedUserEdit] = useState(null);

  const [hourFormat, setHourFormat] = useState(false);

  // Add these alongside exportSelectedIds:
  const [exportSelectMode, setExportSelectMode] = useState(false);
  const [exportSelectedIds, setExportSelectedIds] = useState(new Set());

  const [filterNume, setFilterNume] = useState("");
  const [filterNumbeDebounced, setFilterNumeDebounced] = useState("");
  const [filterFirma, setFilterFirma] = useState("all");

  const toggleExportUser = useCallback((id) => {
    setExportSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  // --- VISIBILITY STATE ---
  const [visibleColumns, setVisibleColumns] = useState({
    poza: true,
    nume: true,
    firma: true,
    specializare: true,
    santier: true,
    intrare: true,
    iesire: true,
    pauza: true,
    total_ore: true,
  });

  const toggleColumn = (key) => {
    setVisibleColumns((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };
  //-------------------------

  const { data: pontaje, isFetching: isFetchingPontaje } = usePontaje(selectedDates);
  const { data: atribuiri, isFetching: isFetchingAtribuiri } = useAtribuiri(selectedDates);
  const { mutateAsync: addEditPontaj } = addPontaj();

  const { data: companiiInterne } = useCompaniiInterne();

  const companiiInterneOptions = useMemo(() => {
    if (!user?.permissions?.firme || !companiiInterne?.companies) return [];
    return companiiInterne.companies.filter((c) => user.permissions.firme.includes(c.id));
  }, [companiiInterne?.companies, user.permissions.firme]);

  const isFetching = isFetchingPontaje || isFetchingAtribuiri;
  const data = pontaje || EMPTY_ARR;

  /// ------------------ Handlers pentru calendar -----------------

  // Seteaza zilele din calendar si reseteaza userul
  const handleCalendarSetDates = useCallback((dates) => {
    setSelectedUser(null);
    setSelectedDates(dates);
  }, []);

  // Reseteaza calendarul si userul
  const handleCalendarReset = useCallback(() => {
    setSelectedUser(null);
    setSelectedDates([new Date()]);
  }, []);

  const selectedIsoDates = useMemo(() => selectedDates.map((d) => format(d, "yyyy-MM-dd")), [selectedDates]);
  const singleDay = selectedIsoDates.length === 1;

  const userHasPontajInSelection = (u) => {
    if (!u?.work_sessions?.length) return false;
    if (singleDay) {
      const ws = u.work_sessions.find((w) => w.session_date === selectedIsoDates[0]);
      return !!(ws && ws.sessions?.length > 0);
    }
    return u.work_sessions.some((w) => selectedIsoDates.includes(w.session_date) && w.sessions?.length > 0);
  };

  const cmpFirmaThenName = (a, b) => {
    // dacă ai și numele firmei, folosește-l; altfel firma_id
    const fa = (a.firma || String(a.firma_id) || "").toLowerCase();
    const fb = (b.firma || String(b.firma_id) || "").toLowerCase();
    if (fa !== fb) return fa < fb ? -1 : 1;
    return (a.name || "").localeCompare(b.name || "", "ro");
  };

  // Replace filteredData useMemo
  const filteredData = useMemo(() => {
    const base = data || [];
    const q = filterNumbeDebounced.trim().toLowerCase();

    const withPontaj = [];
    const withoutPontaj = [];
    const inactivi = [];

    for (const u of base) {
      // name + firma filter first
      if (q && !normalizeText(u.name).includes(normalizeText(filterNumbeDebounced.trim()))) continue;
      if (filterFirma !== "all" && String(u.firma_id) !== String(filterFirma)) continue;

      if (!u.activ) {
        if (showInactivi) inactivi.push(u);
        continue;
      }
      (userHasPontajInSelection(u) ? withPontaj : withoutPontaj).push(u);
    }

    withPontaj.sort(cmpFirmaThenName);
    withoutPontaj.sort(cmpFirmaThenName);
    inactivi.sort(cmpFirmaThenName);

    return [...withPontaj, ...withoutPontaj, ...inactivi];
  }, [data, selectedIsoDates, singleDay, showInactivi, filterNumbeDebounced, filterFirma]);

  // ------------------ Add/Edit pontaje handlers -----------------
  const handleEditUser = useCallback((user) => {
    setSelectedUserEdit(user);
    setOpen(true);
  }, []);

  const handleSubmitPontaj = useCallback(async (draft) => {
    try {
      await addEditPontaj(draft);
      toast.success("Pontaj salvat.");
      setOpen(false);
      setSelectedUser(null);
    } catch (err) {
      console.error("Error saving pontaj:", err);
      toast.error(err.response?.data?.message || "Eroare la salvarea pontajului.");
    }
  }, []);

  // ------------- handlers pentru users -----------------
  useEffect(() => {
    if (selectedUser && !filteredData.some((u) => u.id === selectedUser.id)) {
      setSelectedUser(null);
    }
  }, [filteredData, selectedUser, setSelectedUser]);

  useEffect(() => {
    const onClickOutside = (e) => {
      const t = e.target;

      // Any Radix portal / floating content
      if (t.closest("[data-radix-popper-content-wrapper]")) return;
      if (t.closest("[data-radix-select-content]")) return;
      if (t.closest("[data-radix-select-viewport]")) return;
      if (t.closest("[data-radix-collection-item]")) return;
      if (t.closest("[role='option']")) return;
      if (t.closest("[role='listbox']")) return;
      // Radix adds this to the body when any overlay is open
      if (document.body.hasAttribute("data-scroll-locked")) return;

      if (!t.closest(".selectedRow")) {
        setSelectedUser(null);
      }
    };

    document.addEventListener("pointerdown", onClickOutside);
    return () => document.removeEventListener("pointerdown", onClickOutside);
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => setFilterNumeDebounced(filterNume), 500);
    return () => clearTimeout(handler);
  }, [filterNume]);
  // -------------------------------------------------------
  return (
    <div className="h-screen w-full flex overflow-hidden  items-center justify-center">
      <div className="w-[95%] xxl:h-[95%] h-90h overflow-hidden relative bg-background grid  grid-cols-[minmax(38rem,1fr)_3fr] rounded-lg">
        {/* Left column: calendar + right-panel maps */}
        <div className="flex flex-col p-6 pr-3 gap-6 overflow-hidden  h-full rounded-lg">
          <PontajeCalendar selectedDates={selectedDates} setSelectedDates={handleCalendarSetDates} onReset={handleCalendarReset} />
          <PontajeLeftPanel selectedUser={selectedUser} selectedDates={selectedDates} />
          <PontajAddDialog
            open={open}
            setOpen={setOpen}
            userId={selectedUserEdit?.id}
            sessionDate={selectedIsoDates[0]} // ← your already-selected date
            atribuiri={atribuiri} // pass your santiere array
            initialDraft={selectedUserEdit} // ← raw user object, NOT buildDraftFromUser(...)
            onSubmit={handleSubmitPontaj}
            title={
              selectedUserEdit ? (
                <span>
                  Pontaj - <span className="font-semibold">{selectedUserEdit.name}</span>
                </span>
              ) : (
                "Adaugă Pontaj"
              )
            }
          />
        </div>

        {/* Right column: table USERS */}
        <div className="flex flex-col gap-4 overflow-hidden p-6 pl-3 b w-full h-full">
          <div className="flex border bg-card shadow-md w-full p-6 rounded-lg justify-between items-center">
            <div className="flex items-center">
              <FontAwesomeIcon icon={faClock} className="text-primary text-3xl mr-2" />
              <h1 className="text-2xl font-bold text-foreground tracking-wide">Pontaje Utilizatori</h1>
            </div>
          </div>
          <div className="h-full flex flex-col overflow-hidden border  bg-card shadow-md rounded-lg gap-4 p-6">
            {/* filters */}
            <div className="flex w-full items-center justify-between h-14">
              <div className="grid grid-cols-[1fr_auto] w-full h-full items-center">
                <div className="flex h-full items-center pl-2 gap-2 ">
                  <FontAwesomeIcon icon={faFilter} className="text-primary text-2xl" />
                  <h2 className="text-foreground text-xl font-semibold">Filtre</h2>
                  <Separator orientation="vertical" className="h-full w-1 rounded-full" />
                  <div className="relative">
                    <Input placeholder="Caută nume..." value={filterNume} onChange={(e) => setFilterNume(e.target.value)} className="h-9 max-w-52 text-foreground text-sm" />
                    {filterNume && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className=" absolute right-1 top-1/2 hover:bg-transparent -translate-y-1/2 px-2 text-muted-foreground"
                        onClick={() => {
                          setFilterNume("");
                        }}
                      >
                        ✕
                      </Button>
                    )}
                  </div>

                  <Select value={filterFirma} onValueChange={setFilterFirma}>
                    <SelectTrigger className="h-9 w-40 text-foreground text-sm">
                      <SelectValue placeholder="Toate firmele" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toate firmele</SelectItem>
                      {companiiInterneOptions.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.nume}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {/* SOMWEHERE THERE THE DIALOG */}
                <div className="flex relative h-full items-center gap-4 ">
                  <Button variant={showInactivi ? "default" : "outline"} onClick={() => setShowInactivi((v) => !v)} className={`gap-2 h-9 ${!showInactivi ? "text-foreground" : ""}`}>
                    <FontAwesomeIcon icon={faUserSlash} />
                    Inactivi
                    {showInactivi && <Badge className="ml-1 bg-background text-foreground text-sm px-1.5 py-0">{data.filter((u) => !u.activ).length}</Badge>}
                  </Button>
                  <div className="flex items-center">
                    <Button
                      variant="outline"
                      onClick={() => setHourFormat(false)}
                      className={`gap-2 h-9 text-sm rounded-r-none ${!hourFormat ? "bg-accent text-accent-foreground font-bold" : "text-muted-foreground font-semibold"}`}
                    >
                      HH:MM
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => setHourFormat(true)}
                      className={`gap-2 h-9 text-sm rounded-l-none -ml-px ${hourFormat ? "bg-accent text-accent-foreground font-bold" : "text-muted-foreground font-semibold"}`}
                    >
                      HH.XX
                    </Button>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="gap-2 h-9">
                        <FontAwesomeIcon className="text-foreground" icon={faColumns} />
                        <span className="hidden text-foreground sm:inline">Coloane</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuLabel>Vizibilitate coloane</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {Object.keys(visibleColumns).map((colKey) => (
                        <DropdownMenuCheckboxItem
                          key={colKey}
                          checked={visibleColumns[colKey]}
                          onCheckedChange={(c) => toggleColumn(colKey, c)}
                          onSelect={(e) => e.preventDefault()}
                          className="capitalize"
                        >
                          {colKey}
                        </DropdownMenuCheckboxItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Separator orientation="vertical" className="h-full w-1 rounded-full" />
                  <PontajeExportMenu
                    data={filteredData}
                    companiiInterneOptions={companiiInterneOptions}
                    selectedDates={selectedIsoDates}
                    selectMode={exportSelectMode}
                    setSelectMode={setExportSelectMode}
                    selectedIds={exportSelectedIds}
                    setSelectedIds={setExportSelectedIds}
                  />
                </div>
              </div>
            </div>

            {/* table */}
            <div className="relative w-full overflow-auto rounded-xl shadow-md h-full flex flex-col">
              <PontajeList
                filteredData={filteredData}
                visibleColumns={visibleColumns}
                selectedIsoDates={selectedIsoDates} // ← was selectedDates
                hourFormat={hourFormat}
                selectedDates={selectedDates}
                selectedUser={selectedUser}
                isFetching={isFetching}
                onSelectUser={setSelectedUser}
                onEditUser={handleEditUser}
                minutesByClock={minutesByClock}
                fmtHHMM={fmtHHMM}
                ///
                exportSelectMode={exportSelectMode}
                exportSelectedIds={exportSelectedIds}
                onExportToggleUser={toggleExportUser}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
