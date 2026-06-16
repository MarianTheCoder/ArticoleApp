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
import ImagePreviewTooltip from "@/components/ui/ImagePreviewTooltip";
import NoImage from "@/assets/no-image-icon.png";
import OverflowTooltip from "@/components/ui/OverflowTooltip";
import { TooltipProvider } from "@/components/ui/tooltip";

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

const fmtTimeLocal = (d) =>
  new Intl.DateTimeFormat("ro-RO", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    // Lăsând timeZone gol, browserul folosește AUTOMAT fusul orar al telefonului/PC-ului
  }).format(d);

// computed once at module load, never changes within the same day
const todayIso = format(new Date(), "yyyy-MM-dd");

const COL = {
  poza: "w-[4.5rem] min-w-[4.5rem] max-w-[4.5rem] xxxl:w-[5rem] xxxl:min-w-[5rem] xxxl:max-w-[5rem]",
  nume: "w-[10.5rem] min-w-[10.5rem] max-w-[10.5rem] xxxl:w-[12rem] xxxl:min-w-[12rem] xxxl:max-w-[12rem]",
  firma: "w-[9rem] min-w-[9rem] max-w-[9rem] xxxl:w-[10rem] xxxl:min-w-[10rem] xxxl:max-w-[10rem]",
  santier: "w-[13rem] min-w-[13rem] max-w-[13rem] xxxl:w-[15rem] xxxl:min-w-[15rem] xxxl:max-w-[15rem]",
  specializare: "w-[9.5rem] min-w-[9.5rem] max-w-[9.5rem] xxxl:w-[11rem] xxxl:min-w-[11rem] xxxl:max-w-[11rem]",
  intrare: "w-[5.25rem] min-w-[5.25rem] max-w-[5.25rem] xxxl:w-[6rem] xxxl:min-w-[6rem] xxxl:max-w-[6rem]",
  iesire: "w-[5.25rem] min-w-[5.25rem] max-w-[5.25rem] xxxl:w-[6rem] xxxl:min-w-[6rem] xxxl:max-w-[6rem]",
  pauza: "w-[5.25rem] min-w-[5.25rem] max-w-[5.25rem] xxxl:w-[6rem] xxxl:min-w-[6rem] xxxl:max-w-[6rem]",
  totalOre: "w-[7rem] min-w-[7rem] max-w-[7rem] xxxl:w-[8rem] xxxl:min-w-[8rem] xxxl:max-w-[8rem]",
};

// ─── stable virtuoso components — defined OUTSIDE, never recreated ────────────

const virtuosoComponents = {
  Table: (props) => <table {...props} className="w-full table-fixed caption-bottom text-left border-collapse" />,
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
            className={`selectedRow cursor-pointer transition-colors border-b h-12 md:h-[3.25rem] xxxl:h-16 ${
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
          <ContextMenuItem className="gap-3" disabled={!props.context?.singleDay || !user.activ} onClick={() => props.context?.onEditUser?.(user)}>
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
      <TableRow className="hover:bg-transparent border-b bg-muted/25 h-12 xxxl:h-[3.5rem]">
        {showCol("poza") && <TableHead className={`text-center px-2 text-xs xxxl:text-sm ${COL.poza}`}>Poză</TableHead>}
        {showCol("nume") && <TableHead className={`text-center px-3 xxxl:px-4 text-xs xxxl:text-sm ${COL.nume}`}>Nume</TableHead>}
        {showCol("firma") && <TableHead className={`text-center px-3 xxxl:px-4 text-xs xxxl:text-sm ${COL.firma}`}>Firmă</TableHead>}
        {showCol("santier") && <TableHead className={`text-center px-3 xxxl:px-4 text-xs xxxl:text-sm ${COL.santier}`}>Șantier</TableHead>}
        {showCol("specializare") && <TableHead className={`text-center px-3 xxxl:px-4 text-xs xxxl:text-sm ${COL.specializare}`}>Specializare</TableHead>}
        {showCol("intrare") && <TableHead className={`text-center px-3 xxxl:px-4 text-xs xxxl:text-sm ${COL.intrare}`}>Intrare</TableHead>}
        {showCol("iesire") && <TableHead className={`text-center px-3 xxxl:px-4 text-xs xxxl:text-sm ${COL.iesire}`}>Ieșire</TableHead>}
        {showCol("pauza") && <TableHead className={`text-center px-3 xxxl:px-4 text-xs xxxl:text-sm ${COL.pauza}`}>Pauză</TableHead>}
        {showCol("total_ore") && <TableHead className={`text-center px-3 xxxl:px-4 text-xs xxxl:text-sm ${COL.totalOre}`}>Total Ore</TableHead>}
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

      let displaySantier = activeSantier;

      if (singleDay) {
        if (!anyOpen) {
          const ended = daySessions.filter((s) => s.start_time && s.end_time);
          const pauza = daySessions.filter((s) => normalizeText(s.santier_name) === "pauza" && s.start_time && s.end_time);
          totalMinutesPauza = pauza.reduce((acc, s) => acc + minutesByClock(s.start_time, s.end_time), 0);
          totalMinutes = ended.reduce((acc, s) => acc + minutesByClock(s.start_time, s.end_time), 0);
        }

        //verificam daca s-a depontant, punem un santier ( cel cu orele cele mai multe )
        if (!activeSantier && daySessions.length > 0) {
          const santierTotals = {};

          daySessions.forEach((s) => {
            // Ignorăm pauza
            if (normalizeText(s.santier_name) === "pauza") return;

            if (s.start_time && s.end_time) {
              const m = minutesByClock(s.start_time, s.end_time);
              if (!santierTotals[s.santier_id]) {
                santierTotals[s.santier_id] = {
                  name: s.santier_name,
                  color: s.santier_color,
                  totalMins: 0,
                };
              }
              santierTotals[s.santier_id].totalMins += m;
            }
          });

          const sortedSantiere = Object.values(santierTotals).sort((a, b) => b.totalMins - a.totalMins);
          if (sortedSantiere.length > 0) {
            displaySantier = sortedSantiere[0];
          }
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
        if (starts.length) intrare = fmtTimeLocal(starts.reduce((a, b) => (a < b ? a : b)));
        if (!anyOpen) {
          const ends = daySessions.map((s) => (s.end_time ? new Date(s.end_time) : null)).filter(Boolean);
          if (ends.length) iesire = fmtTimeLocal(ends.reduce((a, b) => (a > b ? a : b)));
        }
      }

      // ── status cell ───────────────────────────────────────────────────────────
      let statusCell;
      if (singleDay) {
        if (anyOpen) {
          statusCell = (
            <Badge className="relative text-sm xxxl:text-base p-1.5 xxxl:p-2 px-3 xxxl:px-4 bg-green-700 hover:bg-green-700 shadow-md gap-2 overflow-hidden">
              {/* Bulina mică Live */}
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400"></span>
              </span>
              Activ
            </Badge>
          );
        } else if (!hasAnyStart && !hasAnyEnd) {
          statusCell = (
            <Badge variant="default" className="text-sm xxxl:text-base p-1.5 xxxl:p-2 px-3 xxxl:px-4">
              Nepontat
            </Badge>
          );
        } else {
          statusCell = (
            <span
              className={`font-bold text-base xxxl:text-lg flex items-center justify-center gap-1.5 ${hasAnyCancelled ? "text-destructive" : hasAnyEdited ? "dark:text-medium text-yellow-600" : ""}`}
            >
              {totalHoursDisplay}
              {hasAnyCancelled && <FontAwesomeIcon icon={faExclamationCircle} className={`${hasAnyCancelled ? "text-destructive" : ""} text-xl xxxl:text-2xl`} />}
              {hasAnyEdited && <FontAwesomeIcon icon={faExclamationTriangle} className={`${hasAnyEdited ? "dark:text-medium text-yellow-600" : ""} text-xl xxxl:text-2xl`} />}
            </span>
          );
        }
      } else {
        statusCell = totalMinutes > 0 ? <span className="font-bold text-sm xxxl:text-base">{totalHoursDisplay}</span> : <span className="text-muted-foreground text-sm xxxl:text-base">—</span>;
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
            <TableCell className={`px-2 ${COL.poza}`} onClick={handleClick}>
              <div className="flex justify-center h-[3.25rem] xxxl:h-[3.5rem] items-center">
                <ImagePreviewTooltip
                  src={user.photo_url ? `${photoApi}/${user.photo_url}` : null}
                  alt={user.name}
                  previewMaxHeight="max-h-[20rem]"
                  previewMaxWidth="max-w-[20rem]"
                  ringColor="ring-primary"
                  fallback={<img src={NoImage} alt="No Image" className="h-full w-full object-cover opacity-50" />}
                  containerClassName="h-12 w-12 xxxl:h-14 xxxl:w-14 rounded-md border border-border bg-muted flex items-center justify-center overflow-hidden shrink-0"
                />
              </div>
            </TableCell>
          )}
          {showCol("nume") && (
            <TableCell className={`px-3 xxxl:px-4 ${COL.nume}`} onClick={handleClick}>
              <div className="flex items-center justify-center">
                <OverflowTooltip text={user.name} className="text-sm xxxl:text-base whitespace-pre-wrap text-foreground leading-normal" maxLines={1} />
              </div>
            </TableCell>
          )}

          {showCol("firma") && (
            <TableCell className={`px-3 xxxl:px-4 text-center ${COL.firma}`} onClick={handleClick}>
              <div className="flex justify-center">
                <span
                  style={{
                    backgroundColor: user?.firma_color,
                    color: getContrastColor(user?.firma_color),
                  }}
                  className="text-sm xxxl:text-base px-2.5 xxxl:px-3 py-1.5 xxxl:py-2 rounded-lg truncate block w-full"
                  title={user.firma}
                >
                  {user.firma || "—"}
                </span>
              </div>
            </TableCell>
          )}

          {showCol("santier") && (
            <TableCell className={`px-3 xxxl:px-4 text-center ${COL.santier}`} onClick={handleClick}>
              <div className="flex justify-center w-full">
                {singleDay && displaySantier ? (
                  <div
                    className="py-1.5 xxxl:py-2 px-3 xxxl:px-4 rounded-lg text-black inline-flex items-center gap-2 max-w-full overflow-hidden"
                    style={{
                      backgroundColor: displaySantier.santier_color || displaySantier.color,
                      color: getContrastColor(displaySantier.santier_color || displaySantier.color),
                    }}
                  >
                    {/* Bulina Live aici */}
                    <OverflowTooltip text={displaySantier.santier_name || displaySantier.name} className="text-sm xxxl:text-base font-medium whitespace-pre-wrap w-full leading-normal" maxLines={1} />
                  </div>
                ) : (
                  "—"
                )}
              </div>
            </TableCell>
          )}
          {showCol("specializare") && (
            <TableCell className={`px-3 xxxl:px-4 text-center ${COL.specializare}`} onClick={handleClick}>
              <OverflowTooltip text={user.specializare || "—"} className="text-sm xxxl:text-base whitespace-pre-wrap w-full text-foreground leading-normal" maxLines={1} />
            </TableCell>
          )}

          {showCol("intrare") && (
            <TableCell className={`whitespace-nowrap px-3 xxxl:px-4 text-base xxxl:text-lg text-center font-semibold ${COL.intrare}`} onClick={handleClick}>
              {singleDay ? intrare : "—"}
            </TableCell>
          )}
          {showCol("iesire") && (
            <TableCell
              className={`whitespace-nowrap px-3 xxxl:px-4 text-center text-base xxxl:text-lg font-semibold ${COL.iesire} ${singleDay && !anyOpen && hasAnyCancelled ? "text-red-600" : ""}`}
              onClick={handleClick}
            >
              {singleDay ? iesire : "—"}
            </TableCell>
          )}
          {showCol("pauza") && (
            <TableCell className={`whitespace-nowrap px-3 xxxl:px-4 text-base xxxl:text-lg text-center font-semibold ${COL.pauza}`} onClick={handleClick}>
              {totalMinutesPauza > 0 ? totalHoursPauzaDisplay : "—"}
            </TableCell>
          )}
          {showCol("total_ore") && (
            <TableCell className={`whitespace-nowrap px-3 xxxl:px-4 text-base xxxl:text-lg text-center font-semibold ${COL.totalOre}`} onClick={handleClick}>
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
      <div className="flex flex-col items-center rounded-xl border-2 justify-center h-full gap-3 xxxl:gap-4">
        <FontAwesomeIcon icon={faExclamationCircle} className="text-destructive/80 text-4xl xxxl:text-5xl" />
        <span className="text-muted-foreground text-lg xxxl:text-xl">Nu s-au găsit pontaje</span>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card w-full h-full overflow-auto relative">
      <TableVirtuoso
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
