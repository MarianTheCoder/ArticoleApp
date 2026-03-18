import React, { useEffect, useState } from "react";
import { format } from "date-fns";
import { GoogleMap, Marker } from "@react-google-maps/api";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faThumbTackSlash,
  faChevronLeft,
  faChevronRight,
  faMapLocationDot,
  faListUl,
  faUserAltSlash,
  faArrowRight,
  faExclamationTriangle,
  faExclamationCircle,
} from "@fortawesome/free-solid-svg-icons";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import photoAPI from "@/api/photoAPI";

// ─── constants ────────────────────────────────────────────────────────────────

const getContrastColor = (hexColor) => {
  if (!hexColor) return "white";
  const color = hexColor.replace("#", "");
  const r = parseInt(color.substr(0, 2), 16);
  const g = parseInt(color.substr(2, 2), 16);
  const b = parseInt(color.substr(4, 2), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 128 ? "black" : "white";
};

const RO_TZ = "Europe/Bucharest";
const fmtTimeRO = (d) =>
  new Intl.DateTimeFormat("ro-RO", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: RO_TZ,
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

const MAP_OPTIONS = {
  disableDefaultUI: true,
  mapTypeControl: true,
  fullscreenControl: true,
  streetViewControl: true,
  zoomControl: false,
  rotateControl: false,
};

const MAP_STYLE = { height: "100%", width: "100%", borderRadius: "0.5rem" };
const MAP_STYLE_ENTRY = {
  height: "12rem",
  width: "100%",
  borderRadius: "0.5rem",
};

// ─── NoLocation ───────────────────────────────────────────────────────────────

function NoLocation({ text }) {
  return (
    <div className="w-full h-full flex flex-col items-center bg-muted/30 rounded-lg justify-center p-6 text-muted-foreground">
      <div className="bg-muted border-destructive/30 border p-4 rounded-full mb-3">
        <FontAwesomeIcon icon={faThumbTackSlash} className="text-2xl text-destructive" />
      </div>
      <p className="text-sm text-center text-destructive font-medium w-fit">{text}</p>
    </div>
  );
}

// ─── SingleDayPanel ───────────────────────────────────────────────────────────

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

  if (!hasAny)
    return (
      <div className="flex items-center justify-center h-full w-full">
        <div className="text-center flex flex-col items-center opacity-60">
          <FontAwesomeIcon icon={faListUl} className="text-4xl mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold text-foreground">Nicio sesiune pontată</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-[200px]">Nu au fost înregistrate sesiuni pentru această zi.</p>
        </div>
      </div>
    );

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
    isSummary && hasAnyEdited ? { text: selectedUser.summary?.hasAnyEditedText, by: selectedUser.summary?.hasAnyEditedBy, photo: selectedUser.summary?.hasAnyEditedByPhoto } : null;
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
    <div className="flex flex-col selectedRow h-full overflow-hidden w-full gap-4">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-2 h-[4.5rem] pb-4 border-b">
        {/* Left: title */}
        <div className="flex flex-col gap-1 min-w-0">
          {!isSummary && s ? (
            <>
              <Badge variant="outline" className="w-fit px-1 py-1 text-sm bg-background shadow-sm whitespace-nowrap">
                {s.start_time ? fmtTimeRO(new Date(s.start_time)) : "--"}
                {" - "}
                {s.end_time ? fmtTimeRO(new Date(s.end_time)) : <span className="text-low font-semibold">&nbsp;Activ </span>}
              </Badge>
              <span className="text-base pl-1 font-semibold text-foreground truncate">{s.santier_name || "Fără șantier"}</span>
            </>
          ) : (
            <>
              <span className="text-xl font-bold tracking-tight flex gap-1 text-foreground">
                Rezumat Zi
                {hasAnyEdited && <FontAwesomeIcon icon={faExclamationTriangle} className={`${hasAnyEdited ? "dark:text-medium text-yellow-600" : ""} text-2xl`} />}
                {hasAnyCancelled && <FontAwesomeIcon icon={faExclamationCircle} className={`${hasAnyCancelled ? "text-destructive" : ""} text-2xl`} />}
              </span>
              {isSummary && (
                <p className="text-sm text-muted-foreground font-medium flex items-center gap-1.5">
                  Rating:
                  <Badge variant="secondary" className="px-1.5 py-0 text-xs">
                    {sessions[sessions.length - 1]?.rating || 5} / 5
                  </Badge>
                </p>
              )}
            </>
          )}
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant={showLocations ? "default" : "outline"}
            size="sm"
            onClick={() => setShowLocations((v) => !v)}
            disabled={locCount === 0}
            className={`gap-2 h-9 px-3 shadow-sm ${!showLocations ? "text-foreground" : ""}`}
          >
            <FontAwesomeIcon icon={showLocations ? faListUl : faMapLocationDot} />
            <span className="hidden sm:inline">{showLocations ? "Detalii" : "Locații"}</span>
          </Button>

          <div className="flex items-center bg-muted/50 h-9 rounded-md px-0.5 border shadow-sm">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-foreground rounded-sm hover:bg-background hover:shadow-sm"
              onClick={() => setSessionIdx((i) => Math.max(0, i - 1))}
              disabled={sessionIdx === 0}
            >
              <FontAwesomeIcon icon={faChevronLeft} className="text-xs" />
            </Button>
            <span className="text-sm font-semibold text-foreground tabular-nums select-none px-1  text-center">
              {sessionIdx} / {pageCount - 1}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-foreground rounded-sm hover:bg-background hover:shadow-sm"
              onClick={() => setSessionIdx((i) => Math.min(pageCount - 1, i + 1))}
              disabled={sessionIdx === pageCount - 1}
            >
              <FontAwesomeIcon icon={faChevronRight} className="text-xs" />
            </Button>
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col gap-4">
        {showLocations ? (
          <div className="flex flex-col h-full gap-3">
            {/* Location picker */}
            <div className="flex items-center gap-3 ">
              <Select value={String(safeLocIdx)} onValueChange={(v) => setLocIdx(Number(v))} disabled={locCount === 0}>
                <SelectTrigger className=" flex-1 h-9 focus:ring-0 selectedRow text-foreground ">
                  <SelectValue placeholder="Selectează punct" />
                </SelectTrigger>
                <SelectContent>
                  {locationPoints.map((p, i) => (
                    <SelectItem key={`${p.sesiune_id || "sum"}-${i}`} value={String(i)}>
                      {p.recorded_at ? fmtTimeRO(new Date(p.recorded_at)) : `Punct ${i + 1}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Badge variant="secondary" className="whitespace-nowrap h-9 shrink-0">
                {locCount} {locCount === 1 ? "punct" : "puncte"}
              </Badge>
            </div>

            <div className="w-full h-[400px] xl:h-full min-h-[300px] rounded-lg overflow-hidden border shadow-sm">
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
            {/* Maps grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { label: "Intrare", has: hasStart, center: startCenter },
                { label: "Ieșire", has: hasEnd, center: endCenter },
              ].map(({ label, has, center }) => (
                <div key={label} className="flex flex-col gap-2">
                  <h2 className="text-sm pl-1 font-bold text-muted-foreground uppercase tracking-widest">{label}</h2>
                  <div className="w-full rounded-lg overflow-hidden border shadow-sm bg-background">
                    {has ? (
                      <GoogleMap mapContainerStyle={MAP_STYLE_ENTRY} center={center} zoom={15} options={MAP_OPTIONS}>
                        <Marker position={center} />
                      </GoogleMap>
                    ) : (
                      <div className="h-48">
                        <NoLocation text={`Nu există locație ${label.toLowerCase()}.`} />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-4 pr-1">
              {/* Report */}
              <div className="flex flex-col gap-2 shrink-0">
                <h2 className="text-sm pl-1 font-bold text-muted-foreground uppercase tracking-widest">Raport Zi</h2>
                <div className="bg-muted/30 border rounded-lg p-4 text-sm leading-relaxed text-foreground shadow-inner min-h-28 overflow-y-auto">
                  <p className="whitespace-pre-line">{isSummary ? lastNote : s?.note?.trim() || "Nu a fost lăsat un raport pentru această sesiune."}</p>
                </div>
              </div>

              {/* Motiv editare */}
              {hasAnyEdited && (
                <div className="flex flex-col gap-2 shrink-0">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm pl-1 font-bold text-yellow-600 dark:text-medium uppercase tracking-widest">Motiv Pontaj Modificat</h2>
                    {hasAnyEditedDetails?.by && (
                      <div className="flex items-center gap-2">
                        {hasAnyEditedDetails?.photo && (
                          <Avatar className="w-10 h-10 border rounded-lg">
                            <AvatarImage className="rounded" src={photoAPI + "/" + hasAnyEditedDetails.photo} />
                            <AvatarFallback className="rounded">{hasAnyEditedDetails.by[0]}</AvatarFallback>
                          </Avatar>
                        )}
                        <span className="text-yellow-600 dark:text-medium">{hasAnyEditedDetails.by}</span>
                      </div>
                    )}
                  </div>
                  <div className="bg-muted/30 border min-h-20 max-h-32 overflow-y-auto rounded-lg p-4 py-2 text-sm leading-relaxed border-yellow-600 text-yellow-600 dark:text-medium dark:border-medium shadow-inner">
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
  const sessions = selectedUser?.sessions ?? [];
  const selectedIsoDates = selectedDates.map((d) => format(d, "yyyy-MM-dd"));

  const rapoarte = sessions.map((s) => (s.note?.trim() ? { date: s.session_date, note: s.note.trim() } : null)).filter(Boolean);

  const totalsBySite = new Map();
  for (const dateStr of selectedIsoDates) {
    const daySessions = sessions.filter((s) => s.session_date === dateStr);
    if (!daySessions.length) continue;
    const hasActive = daySessions.some((s) => !s.end_time && (s.status === "active" || s.status == null));
    if (hasActive) continue;
    const endedOnly = daySessions.filter((s) => s.start_time && s.end_time);
    if (!endedOnly.length) continue;
    for (const s of endedOnly) {
      const site = s.santier_name || "—";
      const color = s.santier_color || "#cbd5e1";
      const mins = minutesByClock(s.start_time, s.end_time);
      const prev = totalsBySite.get(site) || { minutes: 0, color };
      totalsBySite.set(site, {
        minutes: prev.minutes + mins,
        color: prev.color || color,
      });
    }
  }

  const rows = [...totalsBySite.entries()].sort((a, b) => b[1].minutes - a[1].minutes);

  return (
    <div className="w-full h-full selectedRow flex flex-col overflow-hidden">
      <div className="mb-4">
        <h2 className="text-xl text-foreground font-bold tracking-tight">Rezumat Perioadă</h2>
        <p className="text-sm text-muted-foreground">{selectedDates.length} zile selectate</p>
      </div>

      <Tabs defaultValue="ore" className="h-full w-full flex flex-col gap-4 overflow-hidden">
        <TabsList className="px-0 py-0 rounded-none justify-start h-auto w-full bg-transparent">
          <div className="border-b w-full flex gap-6">
            {["ore", "rapoarte"].map((tab) => (
              <TabsTrigger
                key={tab}
                value={tab}
                className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 !shadow-none data-[state=active]:border-b-primary data-[state=inactive]:border-t-2 border-t-transparent data-[state=active]:text-foreground rounded-none pb-3 px-1 text-base font-bold text-muted-foreground capitalize transition-all"
              >
                {tab}
              </TabsTrigger>
            ))}
          </div>
        </TabsList>

        <div className="flex-1 overflow-y-auto h-full rounded-lg pr-1">
          <TabsContent value="ore" className="h-full m-0 w-full outline-none">
            {rows.length ? (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="px-4 py-3 font-semibold text-foreground w-2/3">Șantier</th>
                      <th className="px-4 py-3 font-semibold text-foreground text-center">Ore Totale</th>
                    </tr>
                  </thead>
                  <tbody className="">
                    {rows.map(([site, { minutes, color }]) => (
                      <tr key={site} style={{ backgroundColor: color }} className=" transition-color">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <span
                              className="font-medium"
                              style={{
                                color: getContrastColor(color),
                              }}
                            >
                              {site}
                            </span>
                          </div>
                        </td>
                        <td
                          className="px-4 py-3 text-center tracking-wide font-bold tabular-nums"
                          style={{
                            color: getContrastColor(color),
                          }}
                        >
                          {fmtHHMM(minutes)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center p-8 border rounded-lg bg-muted/10">
                <p className="text-muted-foreground text-center font-medium">
                  Nu există ore pontate în perioada selectată
                  <span className="block text-xs opacity-70 mt-1">(zilele incomplete/active sunt omise)</span>
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="rapoarte" className="h-full m-0 w-full outline-none">
            {rapoarte.length ? (
              <div className="flex flex-col gap-3 pb-4">
                {rapoarte.map((r, i) => (
                  <div key={`${r.date}-${i}`} className="bg-background border rounded-lg p-3 shadow-sm relative overflow-hidden">
                    <Badge variant="secondary" className="mb-2 ">
                      {r.date}
                    </Badge>
                    <p className="text-sm text-foreground whitespace-pre-line leading-relaxed pl-1">{r.note}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center p-8 border  rounded-lg bg-muted/10">
                <p className="text-muted-foreground font-medium">Nu există rapoarte în perioada selectată.</p>
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
      <div className="flex items-center bg-card justify-center h-full w-full border rounded-xl shadow-sm p-6">
        <div className="text-center flex flex-col items-center opacity-60">
          <FontAwesomeIcon icon={faUserAltSlash} className="text-4xl mb-4 text-muted-foreground" />
          <h3 className="text-base xl:text-xl font-semibold text-foreground">Niciun utilizator selectat</h3>
          <p className="text-sm xl:text-base text-muted-foreground mt-1 max-w-[200px]">Selectează un rând din tabel pentru a vedea detaliile pontajelor.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-full bg-card border rounded-xl shadow-sm p-5 overflow-hidden transition-all">
      {isSingleDay ? <SingleDayPanel selectedUser={selectedUser} /> : <MultiDayPanel selectedUser={selectedUser} selectedDates={selectedDates} />}
    </div>
  );
}
