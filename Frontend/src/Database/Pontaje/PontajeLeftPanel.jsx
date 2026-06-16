// components/PontajeLeftPanel.jsx
import React, { useEffect, useState } from "react";
import { format } from "date-fns";
import { GoogleMap, Marker } from "@react-google-maps/api";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faThumbTackSlash,
  faChevronLeft,
  faChevronRight,
  faChevronDown,
  faMapLocationDot,
  faListUl,
  faUserAltSlash,
  faExclamationTriangle,
  faExclamationCircle,
} from "@fortawesome/free-solid-svg-icons";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import photoAPI from "@/api/photoAPI";
import OverflowTooltip from "@/components/ui/OverflowTooltip";

// ─── constants ────────────────────────────────────────────────────────────────

const getContrastColor = (hexColor) => {
  if (!hexColor) return "white";

  const color = String(hexColor).replace("#", "");
  if (color.length !== 6) return "white";

  const r = parseInt(color.substr(0, 2), 16);
  const g = parseInt(color.substr(2, 2), 16);
  const b = parseInt(color.substr(4, 2), 16);

  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 128 ? "black" : "white";
};

const fmtTimeLocal = (d) =>
  new Intl.DateTimeFormat("ro-RO", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);

const minutesByClock = (startISO, endISO) => {
  if (!startISO || !endISO) return 0;
  return Math.max(0, Math.floor(new Date(endISO).getTime() / 60000) - Math.floor(new Date(startISO).getTime() / 60000));
};

const fmtHHMM = (totalMinutesInt) => {
  const hh = Math.floor(totalMinutesInt / 60);
  const mm = totalMinutesInt % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
};

const fmtDateShort = (isoDate) => {
  if (!isoDate) return "—";

  return new Intl.DateTimeFormat("ro-RO", {
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(`${isoDate}T00:00:00`));
};

const MAP_OPTIONS = {
  disableDefaultUI: true,
  mapTypeControl: true,
  fullscreenControl: true,
  streetViewControl: true,
  zoomControl: false,
  rotateControl: false,
};

const MAP_STYLE = { height: "100%", width: "100%", borderRadius: "0.5rem" };

// ─── NoLocation ───────────────────────────────────────────────────────────────

function NoLocation({ text }) {
  return (
    <div className="w-full h-full flex flex-col items-center bg-muted/30 rounded-lg justify-center p-4 xxxl:p-6 text-muted-foreground">
      <div className="bg-muted border-destructive/30 border p-3 xxxl:p-4 rounded-full mb-2 xxxl:mb-3">
        <FontAwesomeIcon icon={faThumbTackSlash} className="text-xl xxxl:text-2xl text-destructive" />
      </div>

      <p className="text-xs xxxl:text-sm text-center text-destructive font-medium w-fit">{text}</p>
    </div>
  );
}

// ─── SingleDayPanel ───────────────────────────────────────────────────────────
// NU AM SCHIMBAT LOGICA DE SINGLE DAY

function SingleDayPanel({ selectedUser }) {
  const [sessionIdx, setSessionIdx] = useState(0);
  const [showLocations, setShowLocations] = useState(false);
  const [locIdx, setLocIdx] = useState(0);

  useEffect(() => {
    setSessionIdx(0);
    setShowLocations(false);
    setLocIdx(0);
  }, [selectedUser?.id, selectedUser?.selectedDate]);

  useEffect(() => {
    setLocIdx(0);
  }, [sessionIdx]);

  const sessions = selectedUser.sessions ?? [];
  const hasAny = sessions.length > 0 || !!selectedUser.summary;

  if (!hasAny) {
    return (
      <div className="flex items-center justify-center h-full w-full">
        <div className="text-center flex flex-col items-center opacity-60">
          <FontAwesomeIcon icon={faListUl} className="text-3xl xxxl:text-4xl mb-3 xxxl:mb-4 text-muted-foreground" />
          <h3 className="text-base xxxl:text-lg font-semibold text-foreground">Nicio sesiune pontată</h3>
          <p className="text-xs xxxl:text-sm text-muted-foreground mt-1 max-w-[200px]">Nu au fost înregistrate sesiuni pentru această zi.</p>
        </div>
      </div>
    );
  }

  const isSummary = sessionIdx === 0;
  const pageCount = sessions.length + 1;
  const s = isSummary ? null : sessions[sessionIdx - 1];
  const sum = selectedUser.summary || null;

  const locationPoints = isSummary ? (selectedUser.allLocations ?? []) : (s?.locations ?? []);
  const locCount = locationPoints.length;
  const safeLocIdx = Math.min(locIdx, Math.max(0, locCount - 1));
  const currentPoint = locationPoints[safeLocIdx];

  const lastEnd = isSummary ? selectedUser?.summary?.lastEnd : s?.end_time;
  const hasAnyCancelled = isSummary ? selectedUser.summary?.hasAnyCancelled : null;
  const hasAnyEdited = isSummary ? selectedUser.summary?.hasAnyEdited : null;

  const hasAnyEditedDetails =
    isSummary && hasAnyEdited
      ? {
          text: selectedUser.summary?.hasAnyEditedText,
          by: selectedUser.summary?.hasAnyEditedBy,
          photo: selectedUser.summary?.hasAnyEditedByPhoto,
        }
      : null;

  const hasStart = isSummary ? sum?.startLat != null && sum?.startLng != null : s?.start_lat != null && s?.start_lng != null;
  const hasEnd = isSummary ? Boolean(lastEnd) && sum?.endLat != null && sum?.endLng != null : s?.end_lat != null && s?.end_lng != null;

  const startCenter = isSummary
    ? { lat: parseFloat(sum.startLat), lng: parseFloat(sum.startLng) }
    : {
        lat: parseFloat(s?.start_lat || "0"),
        lng: parseFloat(s?.start_lng || "0"),
      };

  const endCenter = isSummary
    ? { lat: parseFloat(sum.endLat), lng: parseFloat(sum.endLng) }
    : {
        lat: parseFloat(s?.end_lat || "0"),
        lng: parseFloat(s?.end_lng || "0"),
      };

  const lastNote = (() => {
    const lastWithEnd = sessions.filter((ses) => ses.end_time).reduce((latest, cur) => (new Date(cur.end_time) > new Date(latest.end_time) ? cur : latest), sessions[0]);

    return lastWithEnd?.note?.trim() || "Nu există un raport disponibil.";
  })();

  return (
    <div className="flex flex-col selectedRow h-full overflow-hidden w-full gap-3 xxxl:gap-4">
      <div className="flex flex-wrap items-start justify-between gap-2 h-[4rem] xxxl:h-[4.5rem] pb-3 xxxl:pb-4 border-b">
        <div className="flex flex-col gap-1 min-w-0">
          {!isSummary && s ? (
            <>
              <Badge variant="outline" className="w-fit px-1 py-1 text-xs xxxl:text-sm bg-background shadow-sm whitespace-nowrap">
                {s.start_time ? fmtTimeLocal(new Date(s.start_time)) : "--"}
                {" - "}
                {s.end_time ? fmtTimeLocal(new Date(s.end_time)) : <span className="text-low font-semibold">&nbsp;Activ </span>}
              </Badge>

              <span className="text-sm xxxl:text-base pl-1 font-semibold text-foreground truncate">{s.santier_name || "Fără șantier"}</span>
            </>
          ) : (
            <>
              <span className="text-lg xxxl:text-xl font-bold tracking-tight flex gap-1 text-foreground">
                Rezumat Zi
                {hasAnyEdited && <FontAwesomeIcon icon={faExclamationTriangle} className="dark:text-medium text-yellow-600 text-xl xxxl:text-2xl" />}
                {hasAnyCancelled && <FontAwesomeIcon icon={faExclamationCircle} className="text-destructive text-xl xxxl:text-2xl" />}
              </span>

              {isSummary && (
                <p className="text-xs xxxl:text-sm text-muted-foreground font-medium flex items-center gap-1.5">
                  Rating:
                  <Badge variant="secondary" className="px-1.5 py-0 text-xs">
                    {sessions[sessions.length - 1]?.rating || 5} / 5
                  </Badge>
                </p>
              )}
            </>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant={showLocations ? "default" : "outline"}
            size="sm"
            onClick={() => setShowLocations((v) => !v)}
            disabled={locCount === 0}
            className={`gap-2 h-8 xxxl:h-9 px-2.5 xxxl:px-3 text-xs xxxl:text-sm shadow-sm ${!showLocations ? "text-foreground" : ""}`}
          >
            <FontAwesomeIcon icon={showLocations ? faListUl : faMapLocationDot} />
            <span className="hidden sm:inline">{showLocations ? "Detalii" : "Locații"}</span>
          </Button>

          <div className="flex items-center bg-muted/50 h-8 xxxl:h-9 rounded-md px-0.5 border shadow-sm">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 xxxl:h-8 xxxl:w-8 text-foreground rounded-sm hover:bg-background hover:shadow-sm"
              onClick={() => setSessionIdx((i) => Math.max(0, i - 1))}
              disabled={sessionIdx === 0}
            >
              <FontAwesomeIcon icon={faChevronLeft} className="text-xs" />
            </Button>

            <span className="text-xs xxxl:text-sm font-semibold text-foreground tabular-nums select-none px-1 text-center">
              {sessionIdx} / {pageCount - 1}
            </span>

            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 xxxl:h-8 xxxl:w-8 text-foreground rounded-sm hover:bg-background hover:shadow-sm"
              onClick={() => setSessionIdx((i) => Math.min(pageCount - 1, i + 1))}
              disabled={sessionIdx === pageCount - 1}
            >
              <FontAwesomeIcon icon={faChevronRight} className="text-xs" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden flex flex-col gap-3 xxxl:gap-4">
        {showLocations ? (
          <div className="flex flex-col h-full gap-2.5 xxxl:gap-3">
            <div className="flex items-center gap-2 xxxl:gap-3">
              <Select value={String(safeLocIdx)} onValueChange={(v) => setLocIdx(Number(v))} disabled={locCount === 0}>
                <SelectTrigger className="flex-1 h-8 xxxl:h-9 focus:ring-0 selectedRow text-foreground text-sm">
                  <SelectValue placeholder="Selectează punct" />
                </SelectTrigger>

                <SelectContent>
                  {locationPoints.map((p, i) => (
                    <SelectItem key={`${p.sesiune_id || "sum"}-${i}`} value={String(i)}>
                      {p.recorded_at ? fmtTimeLocal(new Date(p.recorded_at)) : `Punct ${i + 1}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Badge variant="secondary" className="whitespace-nowrap h-8 xxxl:h-9 shrink-0 text-xs xxxl:text-sm">
                {locCount} {locCount === 1 ? "punct" : "puncte"}
              </Badge>
            </div>

            <div className="w-full h-[360px] xl:h-full min-h-[260px] xxxl:min-h-[300px] rounded-lg overflow-hidden border shadow-sm">
              {currentPoint ? (
                <GoogleMap
                  mapContainerStyle={MAP_STYLE}
                  center={{
                    lat: parseFloat(currentPoint.lat),
                    lng: parseFloat(currentPoint.lng),
                  }}
                  zoom={15}
                  options={MAP_OPTIONS}
                >
                  <Marker
                    position={{
                      lat: parseFloat(currentPoint.lat),
                      lng: parseFloat(currentPoint.lng),
                    }}
                  />
                </GoogleMap>
              ) : (
                <NoLocation text="Nu există puncte de locație pentru pagina curentă." />
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 xxxl:gap-4">
              {[
                { label: "Intrare", has: hasStart, center: startCenter },
                { label: "Ieșire", has: hasEnd, center: endCenter },
              ].map(({ label, has, center }) => (
                <div key={label} className="flex flex-col gap-1.5 xxxl:gap-2">
                  <h2 className="text-xs xxxl:text-sm pl-1 font-bold text-muted-foreground uppercase tracking-widest">{label}</h2>

                  <div className="w-full h-40 xxxl:h-48 rounded-lg overflow-hidden border shadow-sm bg-background">
                    {has ? (
                      <GoogleMap mapContainerStyle={MAP_STYLE} center={center} zoom={15} options={MAP_OPTIONS}>
                        <Marker position={center} />
                      </GoogleMap>
                    ) : (
                      <NoLocation text={`Nu există locație ${label.toLowerCase()}.`} />
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-3 xxxl:gap-4 pr-1">
              <div className="flex flex-col gap-1.5 xxxl:gap-2 shrink-0">
                <h2 className="text-xs xxxl:text-sm pl-1 font-bold text-muted-foreground uppercase tracking-widest">Raport Zi</h2>

                <div className="bg-muted/30 border rounded-lg p-3 xxxl:p-4 text-xs xxxl:text-sm leading-relaxed text-foreground shadow-inner min-h-24 xxxl:min-h-28 overflow-y-auto">
                  <p className="whitespace-pre-line">{isSummary ? lastNote : s?.note?.trim() || "Nu a fost lăsat un raport pentru această sesiune."}</p>
                </div>
              </div>

              {hasAnyEdited && (
                <div className="flex flex-col gap-1.5 xxxl:gap-2 shrink-0">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xs xxxl:text-sm pl-1 font-bold text-yellow-600 dark:text-medium uppercase tracking-widest">Motiv Pontaj Modificat</h2>

                    {hasAnyEditedDetails?.by && (
                      <div className="flex items-center gap-2">
                        {hasAnyEditedDetails?.photo && (
                          <Avatar className="w-9 h-9 xxxl:w-10 xxxl:h-10 border rounded-lg">
                            <AvatarImage className="rounded" src={`${photoAPI}/${hasAnyEditedDetails.photo}`} />
                            <AvatarFallback className="rounded">{hasAnyEditedDetails.by[0]}</AvatarFallback>
                          </Avatar>
                        )}

                        <span className="text-sm xxxl:text-base text-yellow-600 dark:text-medium">{hasAnyEditedDetails.by}</span>
                      </div>
                    )}
                  </div>

                  <div className="bg-muted/30 border min-h-16 xxxl:min-h-20 max-h-28 xxxl:max-h-32 overflow-y-auto rounded-lg p-3 xxxl:p-4 py-2 text-xs xxxl:text-sm leading-relaxed border-yellow-600 text-yellow-600 dark:text-medium dark:border-medium shadow-inner">
                    <p className="whitespace-pre-line">{hasAnyEditedDetails?.text || "Nu există un motiv al modificării."}</p>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── MultiDayPanel ────────────────────────────────────────────────────────────

function MultiDayPanel({ selectedUser, selectedDates }) {
  const [expandedSites, setExpandedSites] = useState(() => new Set());

  const sessions = selectedUser?.sessions ?? [];
  const selectedIsoDates = selectedDates.map((d) => format(d, "yyyy-MM-dd"));

  const rapoarte = sessions.map((s) => (s.note?.trim() ? { date: s.session_date, note: s.note.trim() } : null)).filter(Boolean);

  const toggleSite = (siteKey) => {
    setExpandedSites((prev) => {
      const next = new Set(prev);
      next.has(siteKey) ? next.delete(siteKey) : next.add(siteKey);
      return next;
    });
  };

  const siteRows = (() => {
    const sites = new Map();

    const ensureSite = (s) => {
      const siteId = s.santier_id ?? null;
      const siteName = s.santier_name || "—";
      const siteKey = siteId != null ? `id-${siteId}` : `name-${siteName}`;
      const color = s.santier_color || "#cbd5e1";

      if (!sites.has(siteKey)) {
        sites.set(siteKey, {
          key: siteKey,
          siteId,
          siteName,
          color,
          totalMinutes: 0,
          active: false,
          hasCancelled: false,
          hasEdited: false,
          days: new Map(),
        });
      }

      return sites.get(siteKey);
    };

    const ensureDay = (site, date) => {
      if (!site.days.has(date)) {
        site.days.set(date, {
          date,
          firstStart: null,
          lastEnd: null,
          totalMinutes: 0,
          active: false,
          hasCancelled: false,
          hasEdited: false,
        });
      }

      return site.days.get(date);
    };

    for (const s of sessions) {
      if (!selectedIsoDates.includes(s.session_date)) continue;

      const site = ensureSite(s);
      const day = ensureDay(site, s.session_date);

      const isActive = !s.end_time && (s.status === "active" || s.status == null);

      if (s.start_time) {
        const start = new Date(s.start_time);
        if (!day.firstStart || start < day.firstStart) day.firstStart = start;
      }

      if (s.end_time) {
        const end = new Date(s.end_time);
        if (!day.lastEnd || end > day.lastEnd) day.lastEnd = end;
      }

      if (isActive) {
        site.active = true;
        day.active = true;
      }

      if (s.status === "cancelled") {
        site.hasCancelled = true;
        day.hasCancelled = true;
      }

      if (s.edited == 1) {
        site.hasEdited = true;
        day.hasEdited = true;
      }

      if (s.start_time && s.end_time) {
        const mins = minutesByClock(s.start_time, s.end_time);
        site.totalMinutes += mins;
        day.totalMinutes += mins;
      }
    }

    return [...sites.values()]
      .map((site) => ({
        ...site,
        dayRows: [...site.days.values()].sort((a, b) => String(a.date).localeCompare(String(b.date))),
      }))
      .sort((a, b) => {
        if (Number(b.active) !== Number(a.active)) return Number(b.active) - Number(a.active);
        if (b.totalMinutes !== a.totalMinutes) return b.totalMinutes - a.totalMinutes;
        return String(a.siteName).localeCompare(String(b.siteName), "ro");
      });
  })();

  const renderTotal = (row, { child = false } = {}) => {
    if (row.active && row.totalMinutes <= 0) {
      return (
        <Badge className={`${child ? "text-[0.65rem]" : "text-xs"} bg-green-700 hover:bg-green-700 shadow-md gap-1.5 px-2 py-1 overflow-hidden`}>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400"></span>
          </span>
          Activ
        </Badge>
      );
    }

    if (row.totalMinutes <= 0) {
      return <span className={child ? "text-muted-foreground" : ""}>—</span>;
    }

    if (!child) {
      return <span>{fmtHHMM(row.totalMinutes)}</span>;
    }

    return <span className={row.hasCancelled ? "text-destructive" : row.hasEdited ? "text-yellow-600 dark:text-yellow-400" : "text-foreground"}>{fmtHHMM(row.totalMinutes)}</span>;
  };

  return (
    <div className="w-full h-full selectedRow flex flex-col overflow-hidden">
      <div className="mb-3 xxxl:mb-4">
        <h2 className="text-lg xxxl:text-xl text-foreground font-bold tracking-tight">Rezumat Perioadă</h2>
        <p className="text-xs xxxl:text-sm text-muted-foreground">{selectedDates.length} zile selectate</p>
      </div>

      <Tabs defaultValue="ore" className="h-full w-full flex flex-col gap-3 xxxl:gap-4 overflow-hidden">
        <TabsList className="px-0 py-0 rounded-none justify-start h-auto w-full bg-transparent">
          <div className="border-b w-full flex gap-4 xxxl:gap-6">
            {["ore", "rapoarte"].map((tab) => (
              <TabsTrigger
                key={tab}
                value={tab}
                className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 !shadow-none data-[state=active]:border-b-primary data-[state=inactive]:border-t-2 border-t-transparent data-[state=active]:text-foreground rounded-none pb-2 xxxl:pb-3 px-1 text-sm xxxl:text-base font-bold text-muted-foreground capitalize transition-all"
              >
                {tab}
              </TabsTrigger>
            ))}
          </div>
        </TabsList>

        <div className="flex-1 overflow-hidden h-full rounded-lg">
          <TabsContent value="ore" className="h-full m-0 w-full outline-none">
            {siteRows.length ? (
              <div className="h-full overflow-auto rounded-lg border">
                <Table className="w-full table-fixed text-left border-collapse">
                  <TableHeader className="sticky top-0 z-10 bg-muted shadow-sm">
                    <TableRow className="h-9 border-b hover:bg-muted">
                      <TableHead className="w-[8%] px-1 text-center text-[0.7rem] xxxl:text-xs font-bold"></TableHead>
                      <TableHead className="w-[40%] px-2 text-[0.7rem] text-foreground xxxl:text-xs font-bold">Șantier</TableHead>
                      <TableHead className="w-[18%] px-1 text-center text-[0.7rem] text-foreground xxxl:text-xs font-bold">Data</TableHead>
                      <TableHead className="w-[14%] px-1 text-center text-[0.7rem] text-foreground xxxl:text-xs font-bold">Început</TableHead>
                      <TableHead className="w-[14%] px-1 text-center text-[0.7rem] text-foreground xxxl:text-xs font-bold">Final</TableHead>
                      <TableHead className="w-[16%] px-1 text-center text-[0.7rem] text-foreground xxxl:text-xs font-bold">Total</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {siteRows.map((site) => {
                      const isExpanded = expandedSites.has(site.key);
                      const canExpand = site.dayRows.length > 0;
                      const rowTextColor = getContrastColor(site.color);
                      return (
                        <React.Fragment key={site.key}>
                          <TableRow
                            className="h-12 border-b cursor-pointer transition-colors hover:brightness-95"
                            style={{
                              backgroundColor: site.color,
                              color: rowTextColor,
                            }}
                            onClick={() => canExpand && toggleSite(site.key)}
                          >
                            <TableCell className="px-1 py-1 text-center">
                              {canExpand && (
                                <FontAwesomeIcon icon={isExpanded ? faChevronDown : faChevronRight} className="text-sm xxxl:text-base font-black drop-shadow-sm" style={{ color: rowTextColor }} />
                              )}
                            </TableCell>

                            <TableCell className="px-2 py-1 min-w-0">
                              <OverflowTooltip align="left" text={site.siteName || "—"} className={`font-black text-${rowTextColor} truncate text-xs xxxl:text-sm leading-tight`} maxLines={1} />
                            </TableCell>

                            <TableCell style={{ color: rowTextColor }} className="px-1 py-1 text-center text-xs xxxl:text-sm font-black tabular-nums">
                              {site.dayRows.length ? `${site.dayRows.length} zile` : "—"}
                            </TableCell>

                            <TableCell style={{ color: rowTextColor }} className="px-1 py-1 text-center text-xs xxxl:text-sm font-semibold">
                              —
                            </TableCell>

                            <TableCell style={{ color: rowTextColor }} className="px-1 py-1 text-center text-xs xxxl:text-sm font-semibold">
                              {site.active ? <span className="font-black">Activ</span> : "—"}
                            </TableCell>

                            <TableCell style={{ color: rowTextColor }} className="px-1 py-1 text-center text-xs xxxl:text-sm font-black tabular-nums">
                              {renderTotal(site, { child: false })}
                            </TableCell>
                          </TableRow>

                          {isExpanded &&
                            site.dayRows.map((day) => (
                              <TableRow key={`${site.key}-${day.date}`} className="h-9 border-b bg-muted/50 hover:bg-muted">
                                <TableCell className="px-1 py-1"></TableCell>

                                <TableCell className="px-2 py-1 min-w-0"></TableCell>

                                <TableCell className="px-1 py-1 text-center text-xs xxxl:text-sm font-black tabular-nums">{fmtDateShort(day.date)}</TableCell>

                                <TableCell className="px-1 py-1 text-center text-xs xxxl:text-sm font-semibold tabular-nums">{day.firstStart ? fmtTimeLocal(day.firstStart) : "—"}</TableCell>

                                <TableCell className="px-1 py-1 text-center text-xs xxxl:text-sm font-semibold tabular-nums">
                                  {day.active ? <span className="text-green-700 font-black">Activ</span> : day.lastEnd ? fmtTimeLocal(day.lastEnd) : "—"}
                                </TableCell>

                                <TableCell className="px-1 py-1 text-center text-xs xxxl:text-sm font-black tabular-nums">{renderTotal(day, { child: true })}</TableCell>
                              </TableRow>
                            ))}
                        </React.Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center p-6 xxxl:p-8 border rounded-lg bg-muted/10">
                <p className="text-muted-foreground text-center text-sm xxxl:text-base font-medium">Nu există ore pontate în perioada selectată</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="rapoarte" className="h-full m-0 w-full outline-none overflow-auto">
            {rapoarte.length ? (
              <div className="flex flex-col gap-2.5 xxxl:gap-3 pb-3 xxxl:pb-4 pr-1">
                {rapoarte.map((r, i) => (
                  <div key={`${r.date}-${i}`} className="bg-background border rounded-lg p-2.5 xxxl:p-3 shadow-sm relative overflow-hidden">
                    <Badge variant="secondary" className="mb-2 text-xs xxxl:text-sm">
                      {r.date}
                    </Badge>

                    <p className="text-xs xxxl:text-sm text-foreground whitespace-pre-line leading-relaxed pl-1">{r.note}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center p-6 xxxl:p-8 border rounded-lg bg-muted/10">
                <p className="text-muted-foreground text-sm xxxl:text-base font-medium">Nu există rapoarte în perioada selectată.</p>
              </div>
            )}
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function PontajeLeftPanel({ selectedUser, selectedDates }) {
  const isSingleDay = selectedDates.length === 1;

  if (!selectedUser) {
    return (
      <div className="flex items-center bg-card justify-center h-full w-full border rounded-xl shadow-sm p-4 xxxl:p-6">
        <div className="text-center flex flex-col items-center opacity-60">
          <FontAwesomeIcon icon={faUserAltSlash} className="text-3xl xxxl:text-4xl mb-3 xxxl:mb-4 text-muted-foreground" />
          <h3 className="text-base xxxl:text-xl font-semibold text-foreground">Niciun utilizator selectat</h3>
          <p className="text-sm xxxl:text-base text-muted-foreground mt-1 max-w-[200px]">Selectează un rând din tabel pentru a vedea detaliile pontajelor.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-full bg-card border rounded-xl shadow-sm p-4 xxxl:p-5 overflow-hidden transition-all">
      {isSingleDay ? <SingleDayPanel selectedUser={selectedUser} /> : <MultiDayPanel selectedUser={selectedUser} selectedDates={selectedDates} />}
    </div>
  );
}
