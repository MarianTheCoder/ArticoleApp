import React, { useRef, useCallback, useMemo } from "react";
import { format } from "date-fns";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faExclamationCircle, faExclamationTriangle, faPenToSquare } from "@fortawesome/free-solid-svg-icons";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import photoApi from "@/api/photoAPI";
import SpinnerElement from "@/MainElements/SpinnerElement";
import { TableVirtuoso } from "react-virtuoso";
import { useLoading } from "@/context/LoadingContext";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger, ContextMenuSeparator } from "@/components/ui/context-menu";

// ─── helpers — defined OUTSIDE, never recreated ───────────────────────────────

function normalizeText(str) {
  return (str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

const fmtDecimal = (totalMinutesInt) => {
  const val = totalMinutesInt / 60;
  return val.toFixed(2).replace(".", ",");
};

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

// computed once at module load, never changes within the same day
const todayIso = format(new Date(), "yyyy-MM-dd");

// ─── stable virtuoso components — defined OUTSIDE, never recreated ────────────

const virtuosoComponents = {
  Table: (props) => <table {...props} className="w-full table-auto caption-bottom text-left min-w-max" />,
  TableHead: React.forwardRef((props, ref) => <TableHeader {...props} ref={ref} className="bg-background sticky top-0 z-20 shadow-sm" />),
  TableBody: React.forwardRef((props, ref) => <TableBody {...props} ref={ref} />),
  TableRow: (props) => {
    const index = props["data-index"];
    const user = props.context?.filteredData?.[index];
    if (!user) return <TableRow {...props} />;
    const isSelected = props.context?.selectedUser?.id === user.id;
    const hasSessions = user.work_sessions.some((ws) => ws.hasSessions);
    // Export
    const isExportSelected = props.context?.exportSelectedIds?.has(user.id);
    const exportSelectMode = props.context?.exportSelectMode;

    return (
      <ContextMenu>
        <ContextMenuTrigger asChild disabled={exportSelectMode}>
          <TableRow
            {...props}
            className={`selectedRow cursor-pointer transition-colors border-b h-12 md:h-[3.5rem] xl:h-16 ${
              exportSelectMode && isExportSelected
                ? "bg-primary/15 hover:bg-primary/20"
                : exportSelectMode
                  ? "hover:bg-muted/50"
                  : isSelected && user.activ
                    ? "bg-primary/10 hover:bg-primary/20"
                    : isSelected && !user.activ
                      ? "bg-destructive/25 opacity-80 hover:bg-destructive/30"
                      : !user.activ
                        ? "opacity-50 bg-destructive/10 hover:bg-destructive/20"
                        : "hover:bg-muted"
            }`}
          />
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem className="gap-3 " disabled={!props.context?.singleDay || !user.activ} onClick={() => props.context?.onEditUser?.(user)}>
            <FontAwesomeIcon icon={faPenToSquare} /> {hasSessions ? "Editează Pontaj" : "Adaugă Pontaj"}
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    );
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function PontajeList({
  filteredData = [],
  selectedIsoDates = [], // ← receive pre-computed from parent, don't recompute
  selectedUser,
  visibleColumns = {},
  isFetching,
  hourFormat,
  onSelectUser,
  onEditUser,
  minutesByClock,
  fmtHHMM,
  ///
  exportSelectMode,
  exportSelectedIds,
  onExportToggleUser,
}) {
  const { loading } = useLoading();
  const containerRef = useRef(null);

  const singleDay = useMemo(() => selectedIsoDates.length == 1, [selectedIsoDates]);
  const singleIso = useMemo(() => (singleDay ? selectedIsoDates[0] : null), [singleDay, selectedIsoDates]);

  // stable — only changes when columns change
  const showCol = useCallback((key) => visibleColumns[key] !== false, [visibleColumns]);

  // stable context — Virtuoso uses this for TableRow, only changes when selection or data changes
  const virtuosoContext = useMemo(
    () => ({
      filteredData,
      selectedUser,
      onEditUser,
      singleDay,
      exportSelectMode,
      exportSelectedIds,
      onExportToggleUser,
    }),
    [filteredData, selectedUser, onEditUser, singleDay, exportSelectMode, exportSelectedIds, onExportToggleUser],
  );

  // stable header — only changes when visibleColumns changes
  const fixedHeaderContent = useCallback(
    () => (
      <TableRow className="hover:bg-transparent border-b">
        {showCol("poza") && <TableHead className="text-center py-4 px-2">Poză</TableHead>}
        {showCol("nume") && <TableHead className="text-center py-4 px-4">Nume</TableHead>}
        {showCol("firma") && <TableHead className="text-center px-4">Firmă</TableHead>}
        {showCol("santier") && <TableHead className="text-center min-w-48 px-4">Șantier</TableHead>}
        {showCol("specializare") && <TableHead className="text-center px-4">Specializare</TableHead>}
        {showCol("intrare") && <TableHead className="text-center px-4">Intrare</TableHead>}
        {showCol("iesire") && <TableHead className="text-center px-4">Ieșire</TableHead>}
        {showCol("pauza") && <TableHead className="text-center px-4">Pauză</TableHead>}
        {showCol("total_ore") && <TableHead className="text-center px-4">Total Ore</TableHead>}
      </TableRow>
    ),
    [showCol],
  );

  // stable itemContent — only recreated when dependencies actually change
  // this is the key perf win: Virtuoso won't re-render visible rows on unrelated state changes
  const itemContent = useCallback(
    (index, user) => {
      // ── sessions ──────────────────────────────────────────────────────────────
      const dayBlock = singleDay ? user.work_sessions.find((ws) => ws.session_date == singleIso) : null;

      const daySessions = singleDay ? (dayBlock?.sessions ?? []) : user.work_sessions.filter((ws) => selectedIsoDates.includes(ws.session_date)).flatMap((ws) => ws.sessions ?? []);

      const activeSantier = daySessions.find((s) => !s.end_time && (s.status == "active" || s.status == null));
      const anyOpen = singleDay && !!activeSantier;
      const isTodaySelected = singleDay && singleIso === todayIso;
      const hasAnyCancelled = singleDay && daySessions.some((s) => s.status === "cancelled");
      const hasAnyEdited = singleDay && daySessions.some((s) => s.edited == 1);
      const hasAnyStart = singleDay && daySessions.some((s) => !!s.start_time);
      const hasAnyEnd = singleDay && daySessions.some((s) => !!s.end_time);

      // ── totals ────────────────────────────────────────────────────────────────
      let totalMinutes = 0;
      let totalMinutesPauza = 0;

      if (singleDay) {
        if (!anyOpen) {
          const ended = daySessions.filter((s) => s.start_time && s.end_time);
          const pauza = daySessions.filter((s) => normalizeText(s.santier_name) === "pauza" && s.start_time && s.end_time);
          totalMinutesPauza = pauza.reduce((acc, s) => acc + minutesByClock(s.start_time, s.end_time), 0);
          totalMinutes = ended.reduce((acc, s) => acc + minutesByClock(s.start_time, s.end_time), 0);
        }
      } else {
        const result = selectedIsoDates.reduce(
          (totals, dateStr) => {
            const sessionsOfDay = user.work_sessions.find((ws) => ws.session_date === dateStr)?.sessions || [];
            if (!sessionsOfDay.length) return totals;
            const hasActive = sessionsOfDay.some((s) => !s.end_time && (s.status === "active" || s.status == null));
            if (hasActive) return totals;
            const ended = sessionsOfDay.filter((s) => s.start_time && s.end_time);
            if (!ended.length) return totals;
            for (const s of ended) {
              const m = minutesByClock(s.start_time, s.end_time);
              totals.totalMinutesRef += m;
              if (normalizeText(s.santier_name) === "pauza") totals.totalMinutesPauzaRef += m;
            }
            return totals;
          },
          { totalMinutesRef: 0, totalMinutesPauzaRef: 0 },
        );
        totalMinutes = result.totalMinutesRef;
        totalMinutesPauza = result.totalMinutesPauzaRef;
      }

      const fmt = hourFormat ? fmtDecimal : fmtHHMM;
      const totalHoursPauzaDisplay = fmt(totalMinutesPauza);
      const totalHoursDisplay = fmt(totalMinutes - totalMinutesPauza);

      // ── intrare / ieșire ──────────────────────────────────────────────────────
      let intrare = "—";
      let iesire = "—";
      if (singleDay && daySessions.length) {
        const starts = daySessions.map((s) => (s.start_time ? new Date(s.start_time) : null)).filter(Boolean);
        if (starts.length) intrare = fmtTimeRO(starts.reduce((a, b) => (a < b ? a : b)));
        if (!anyOpen) {
          const ends = daySessions.map((s) => (s.end_time ? new Date(s.end_time) : null)).filter(Boolean);
          if (ends.length) iesire = fmtTimeRO(ends.reduce((a, b) => (a > b ? a : b)));
        }
      }

      // ── status cell ───────────────────────────────────────────────────────────
      let statusCell;
      if (singleDay) {
        if (anyOpen) {
          statusCell = <Badge className="text-base p-2 px-4 bg-green-700">Activ</Badge>;
        } else if (!hasAnyStart && !hasAnyEnd) {
          statusCell = (
            <Badge variant="default" className=" text-base p-2 px-4">
              Nepontat
            </Badge>
          );
        } else {
          statusCell = (
            <span className={`font-bold text-lg flex items-center justify-center gap-1.5 ${hasAnyCancelled ? "text-destructive" : hasAnyEdited ? "dark:text-medium text-yellow-600" : ""}`}>
              {totalHoursDisplay}
              {hasAnyCancelled && <FontAwesomeIcon icon={faExclamationCircle} className={`${hasAnyCancelled ? "text-destructive" : ""} text-2xl`} />}
              {hasAnyEdited && <FontAwesomeIcon icon={faExclamationTriangle} className={`${hasAnyEdited ? "dark:text-medium text-yellow-600" : ""} text-2xl`} />}
            </span>
          );
        }
      } else {
        statusCell = totalMinutes > 0 ? <span className="font-bold text-base">{totalHoursDisplay}</span> : <span className="text-muted-foreground text-base">—</span>;
      }
      // ── row click ─────────────────────────────────────────────────────────────
      const handleClick = (e) => {
        if (exportSelectMode) {
          onExportToggleUser(user.id);
          return;
        }
        if (e.target.closest("a, button, input")) return;
        const selection = window.getSelection();
        if (selection.toString().length > 0) return;
        const sorted = [...daySessions].sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

        const summary = (() => {
          if (!singleDay || !daySessions.length) return null;
          const starts = daySessions.map((s) => (s.start_time ? new Date(s.start_time) : null)).filter(Boolean);
          const ends = daySessions.map((s) => (s.end_time ? new Date(s.end_time) : null)).filter(Boolean);
          const firstLoc = daySessions.find((s) => s.start_lat != null);
          const lastLoc = [...daySessions].reverse().find((s) => s.end_lat != null);

          // Find the last edited session chronologically
          const lastEditedSession = [...daySessions]
            .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
            .reverse()
            .find((s) => s.edited == 1);

          return {
            date: singleIso,
            firstStart: starts.length ? starts.reduce((a, b) => (a < b ? a : b)) : null,
            lastEnd: !anyOpen && ends.length ? ends.reduce((a, b) => (a > b ? a : b)) : null,
            startLat: firstLoc?.start_lat ?? null,
            startLng: firstLoc?.start_lng ?? null,
            endLat: lastLoc?.end_lat ?? null,
            endLng: lastLoc?.end_lng ?? null,
            hasAnyCancelled: hasAnyCancelled,
            // verificam daca are orice sesiune editata, daca da, afisam textul editarii, cine a editat si poza lui
            hasAnyEdited: hasAnyEdited,
            hasAnyEditedText: hasAnyEdited ? lastEditedSession.edited_text : null,
            hasAnyEditedBy: hasAnyEdited ? lastEditedSession.updated_by_name : null,
            hasAnyEditedByPhoto: hasAnyEdited ? lastEditedSession.updated_by_photo_url : null,
          };
        })();

        const allLocations = singleDay ? daySessions.flatMap((s) => (s.locations || []).map((p) => ({ ...p, sesiune_id: s.id }))) : [];

        onSelectUser({
          ...user,
          selectedDate: singleIso,
          sessions: sorted,
          allLocations,
          summary,
        });
      };

      // ── cells ─────────────────────────────────────────────────────────────────
      return (
        <>
          {showCol("poza") && (
            <TableCell className="whitespace-nowrap px-2" onClick={handleClick}>
              <div className="flex items-center justify-center">
                <Avatar className="border  rounded-lg  h-10 w-10 xl:w-[3.5rem] xl:h-[3.5rem] lg:h-12 lg:w-12 border-border">
                  <AvatarImage className="object-cover" src={user.photo_url ? `${photoApi}/${user.photo_url}` : null} alt={user.name} />
                  <AvatarFallback className="font-bold rounded-lg text-foreground bg-muted text-base">{user.name?.[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
              </div>
            </TableCell>
          )}
          {showCol("nume") && (
            <TableCell className="whitespace-nowrap pl-6" onClick={handleClick}>
              <div className="flex items-center justify-center">
                <span className="font-semibold text-foreground text-base">{user.name}</span>
              </div>
            </TableCell>
          )}
          {showCol("firma") && (
            <TableCell className="whitespace-nowrap px-4 text-center" onClick={handleClick}>
              <span
                style={{
                  backgroundColor: user?.firma_color,
                  color: getContrastColor(user?.firma_color),
                }}
                className="text-base p-4 py-2 rounded-lg"
              >
                {user.firma || "—"}
              </span>
            </TableCell>
          )}
          {showCol("santier") && (
            <TableCell className="whitespace-nowrap px-4 text-center" onClick={handleClick}>
              {singleDay && activeSantier ? (
                <div
                  className="py-2 p-4 rounded-lg text-black inline-block"
                  style={{
                    backgroundColor: activeSantier?.santier_color,
                    color: getContrastColor(activeSantier?.santier_color),
                  }}
                >
                  {activeSantier.santier_name}
                </div>
              ) : (
                "—"
              )}
            </TableCell>
          )}
          {showCol("specializare") && (
            <TableCell className="whitespace-nowrap px-4 text-center" onClick={handleClick}>
              <span className="text-base text-foreground">{user.specializare || "—"}</span>
            </TableCell>
          )}

          {showCol("intrare") && (
            <TableCell className="whitespace-nowrap px-4 text-lg text-center font-semibold" onClick={handleClick}>
              {singleDay ? intrare : "—"}
            </TableCell>
          )}
          {showCol("iesire") && (
            <TableCell className={`whitespace-nowrap px-4 text-center text-lg font-semibold ${singleDay && !anyOpen && hasAnyCancelled ? "text-red-600" : ""}`} onClick={handleClick}>
              {singleDay ? iesire : "—"}
            </TableCell>
          )}
          {showCol("pauza") && (
            <TableCell className="whitespace-nowrap px-4 text-lg text-center font-semibold" onClick={handleClick}>
              {totalMinutesPauza > 0 ? totalHoursPauzaDisplay : "—"}
            </TableCell>
          )}
          {showCol("total_ore") && (
            <TableCell className="whitespace-nowrap px-4 text-lg text-center font-semibold" onClick={handleClick}>
              {statusCell}
            </TableCell>
          )}
        </>
      );
    },
    [selectedIsoDates, singleDay, singleIso, showCol, hourFormat, minutesByClock, fmtHHMM, onSelectUser, exportSelectMode, onExportToggleUser],
  );

  if (filteredData.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-xl border-2 justify-center h-full gap-4">
        <FontAwesomeIcon icon={faExclamationCircle} className="text-destructive/80 text-5xl" />
        <span className="text-muted-foreground text-xl">Nu s-au găsit pontaje</span>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="rounded-xl border-2 bg-card w-full h-full overflow-auto relative">
      <TableVirtuoso
        customScrollParent={containerRef.current}
        totalCount={filteredData.length}
        data={filteredData}
        style={{ height: "100%", width: "100%" }}
        components={virtuosoComponents}
        context={virtuosoContext}
        fixedHeaderContent={fixedHeaderContent}
        itemContent={itemContent}
      />
      {isFetching && !loading && <SpinnerElement text={2} />}
    </div>
  );
}
