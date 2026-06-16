import React, { useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBolt, faChevronDown, faChevronRight, faClock, faHelmetSafety, faUserCheck, faUsers } from "@fortawesome/free-solid-svg-icons";

import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import OverflowTooltip from "@/components/ui/OverflowTooltip";

const fmtDecimal = (totalMinutesInt) => {
  const val = totalMinutesInt / 60;
  return val.toFixed(2).replace(".", ",");
};

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

const fmtTimeLocal = (isoOrDate) => {
  if (!isoOrDate) return "—";

  return new Intl.DateTimeFormat("ro-RO", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(isoOrDate));
};

const fmtDateShort = (isoDate) => {
  if (!isoDate) return "—";

  return new Intl.DateTimeFormat("ro-RO", {
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(`${isoDate}T00:00:00`));
};

const mapToArray = (value) => {
  if (!value) return [];
  if (value instanceof Map) return [...value.values()];
  if (value instanceof Set) return [...value.values()];
  if (Array.isArray(value)) return value;
  if (typeof value === "object") return Object.values(value);
  return [];
};

const getUserId = (user) => {
  if (typeof user === "number" || typeof user === "string") return Number(user);
  return Number(user?.id ?? user?.user_id ?? user?.utilizator_id);
};

const getUserName = (user, fallbackId) => {
  if (typeof user === "number" || typeof user === "string") return `Utilizator #${user}`;
  return user?.name || user?.nume || user?.user_name || (fallbackId ? `Utilizator #${fallbackId}` : "—");
};

const getSessionIsActive = (session) => !session?.end_time && (session?.status === "active" || session?.status == null);

export default function PontajeSantierLeftPanel({ selectedSantier, selectedDates = [], hourFormat, minutesByClock, fmtHHMM }) {
  const fmt = hourFormat ? fmtDecimal : fmtHHMM;
  const [expandedRows, setExpandedRows] = useState(() => new Set());

  const selectedDatesCount = Array.isArray(selectedDates) ? selectedDates.length : 0;

  const { rows, isMultiDay } = useMemo(() => {
    if (!selectedSantier) return { rows: [], isMultiDay: false };

    const sessions = selectedSantier.sessions || [];
    const distinctSessionDates = new Set(sessions.map((s) => s.session_date).filter(Boolean));

    const multiDay = selectedDatesCount > 1 || distinctSessionDates.size > 1;

    const sessionsByUserId = new Map();

    for (const session of sessions) {
      const userId = Number(session?.user?.id ?? session?.user_id);
      if (!userId) continue;

      if (!sessionsByUserId.has(userId)) sessionsByUserId.set(userId, []);
      sessionsByUserId.get(userId).push(session);
    }

    const assignedUsers = mapToArray(selectedSantier.assignedUsers);
    const unassignedUsers = mapToArray(selectedSantier.unassignedPresentUsers);

    const buildDailyRows = (userSessions) => {
      const byDate = new Map();

      for (const session of userSessions) {
        const date = session?.session_date || "—";

        if (!byDate.has(date)) {
          byDate.set(date, {
            date,
            firstStart: null,
            lastEnd: null,
            totalMinutes: 0,
            active: false,
            hasPontaj: false,
            hasCancelled: false,
            hasEdited: false,
          });
        }

        const day = byDate.get(date);
        const isActive = getSessionIsActive(session);

        if (session?.start_time) {
          day.hasPontaj = true;

          const start = new Date(session.start_time);
          if (!day.firstStart || start < day.firstStart) day.firstStart = start;
        }

        if (session?.end_time) {
          const end = new Date(session.end_time);
          if (!day.lastEnd || end > day.lastEnd) day.lastEnd = end;
        }

        if (isActive) day.active = true;
        if (session?.status === "cancelled") day.hasCancelled = true;
        if (session?.edited == 1) day.hasEdited = true;

        if (session?.start_time && session?.end_time) {
          day.totalMinutes += minutesByClock(session.start_time, session.end_time);
        }
      }

      return [...byDate.values()].sort((a, b) => String(a.date).localeCompare(String(b.date)));
    };

    const buildRow = (user, isAssigned) => {
      const id = getUserId(user);
      const userSessions = sessionsByUserId.get(id) || [];

      let firstStart = null;
      let lastEnd = null;
      let totalMinutes = 0;
      let active = false;
      let hasPontaj = false;
      let hasCancelled = false;
      let hasEdited = false;

      const dailyRows = buildDailyRows(userSessions);
      const zilePrezente = dailyRows.filter((d) => d.hasPontaj || d.active).length;

      for (const session of userSessions) {
        const isActive = getSessionIsActive(session);

        if (session?.start_time) {
          hasPontaj = true;

          const start = new Date(session.start_time);
          if (!firstStart || start < firstStart) firstStart = start;
        }

        if (session?.end_time) {
          const end = new Date(session.end_time);
          if (!lastEnd || end > lastEnd) lastEnd = end;
        }

        if (isActive) active = true;
        if (session?.status === "cancelled") hasCancelled = true;
        if (session?.edited == 1) hasEdited = true;

        if (session?.start_time && session?.end_time) {
          totalMinutes += minutesByClock(session.start_time, session.end_time);
        }
      }

      return {
        id,
        name: getUserName(user, id),
        isAssigned,
        sessions: userSessions,
        dailyRows,
        zilePrezente,
        firstStart,
        lastEnd,
        totalMinutes,
        active,
        hasPontaj,
        hasCancelled,
        hasEdited,
      };
    };

    const assignedRows = assignedUsers.map((user) => buildRow(user, true));
    const unassignedRows = unassignedUsers.map((user) => buildRow(user, false));

    const sortRows = (a, b) => {
      if (Number(b.active) !== Number(a.active)) return Number(b.active) - Number(a.active);
      if (Number(b.hasPontaj) !== Number(a.hasPontaj)) return Number(b.hasPontaj) - Number(a.hasPontaj);
      if (b.totalMinutes !== a.totalMinutes) return b.totalMinutes - a.totalMinutes;
      return String(a.name).localeCompare(String(b.name), "ro");
    };

    assignedRows.sort(sortRows);
    unassignedRows.sort(sortRows);

    const assignedWithPontaj = assignedRows.filter((r) => r.hasPontaj || r.active);
    const assignedNepontati = assignedRows.filter((r) => !r.hasPontaj && !r.active);

    return {
      rows: [...assignedWithPontaj, ...unassignedRows, ...assignedNepontati],
      isMultiDay: multiDay,
    };
  }, [selectedSantier, selectedDatesCount, minutesByClock]);

  const toggleExpanded = (rowId) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      next.has(rowId) ? next.delete(rowId) : next.add(rowId);
      return next;
    });
  };

  if (!selectedSantier) {
    return (
      <div className="flex items-center bg-card justify-center h-full w-full border rounded-xl shadow-sm p-4 xxxl:p-6">
        <div className="text-center flex flex-col items-center opacity-60">
          <FontAwesomeIcon icon={faHelmetSafety} className="text-3xl xxxl:text-4xl mb-3 xxxl:mb-4 text-muted-foreground" />
          <h3 className="text-base xxxl:text-xl font-semibold text-foreground">Niciun santier selectat</h3>
          <p className="text-sm xxxl:text-base text-muted-foreground mt-1 max-w-[200px]">Selectează un rând din tabel pentru a vedea detaliile pontajelor.</p>
        </div>
      </div>
    );
  }

  const assignedCount = selectedSantier.assignedCount || 0;
  const presentCount = selectedSantier.presentCount || 0;
  const activeCount = selectedSantier.activeCount || 0;
  const totalMinutes = selectedSantier.totalMinutes || 0;
  const unassignedCount = selectedSantier.unassignedPresentCount || 0;

  const renderTotalCell = (row, { isChild = false, allowWarningColor = false } = {}) => {
    const isNepontat = !row.hasPontaj && !row.active;

    if (row.active) {
      return (
        <Badge className={`${isChild ? "text-[0.65rem]" : "text-xs"} bg-green-700 hover:bg-green-700 shadow-md gap-1.5 px-2 py-1 overflow-hidden`}>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400"></span>
          </span>
          Activ
        </Badge>
      );
    }

    if (isNepontat) {
      return (
        <Badge variant="default" className={`${isChild ? "text-[0.65rem]" : "text-xs"}`}>
          Nepontat
        </Badge>
      );
    }

    if (!allowWarningColor) {
      return <span className="text-foreground">{fmt(row.totalMinutes)}</span>;
    }

    return <span className={row.hasCancelled ? "text-destructive" : row.hasEdited ? "text-yellow-600 dark:text-yellow-400" : "text-foreground"}>{fmt(row.totalMinutes)}</span>;
  };

  return (
    <div className="border bg-card selectedRow shadow-md rounded-lg h-full overflow-hidden flex flex-col">
      <div className="p-3 xxxl:p-4 border-b bg-muted/20">
        <div
          className="rounded-md border px-3 py-2 shadow-sm"
          style={{
            backgroundColor: selectedSantier.santier_color,
            color: getContrastColor(selectedSantier.santier_color),
          }}
        >
          <OverflowTooltip text={selectedSantier.santier_name || "—"} className="font-bold text-base xxxl:text-lg leading-tight" maxLines={1} />
        </div>

        <div className="flex flex-wrap gap-1.5 mt-3">
          <Badge variant="outline" className="gap-1.5 px-2 py-1 text-[0.7rem] xxxl:text-xs bg-background">
            <FontAwesomeIcon icon={faClock} className="text-muted-foreground" />
            Ore: <span className="font-black">{totalMinutes > 0 ? fmt(totalMinutes) : "—"}</span>
          </Badge>

          <Badge variant="outline" className="gap-1.5 px-2 py-1 text-[0.7rem] xxxl:text-xs bg-background">
            <FontAwesomeIcon icon={faUserCheck} className="text-muted-foreground" />
            Prezenți: <span className="font-black">{presentCount}</span>
          </Badge>

          <Badge variant="outline" className="gap-1.5 px-2 py-1 text-[0.7rem] xxxl:text-xs bg-background">
            <FontAwesomeIcon icon={faUsers} className="text-muted-foreground" />
            Atribuiți: <span className="font-black">{assignedCount}</span>
          </Badge>

          <Badge className="gap-1.5 px-2 py-1 text-[0.7rem] xxxl:text-xs bg-green-700 hover:bg-green-700">
            <FontAwesomeIcon icon={faBolt} />
            Activi: <span className="font-black">{activeCount}</span>
          </Badge>

          {unassignedCount > 0 && (
            <Badge variant="destructive" className="gap-1.5 px-2 py-1 text-[0.7rem] xxxl:text-xs">
              Neatribuiți: <span className="font-black">+{unassignedCount}</span>
            </Badge>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden p-3 xxxl:p-4">
        <div className="h-full overflow-auto rounded-lg border">
          <Table className="w-full table-fixed text-left border-collapse">
            <TableHeader className="sticky hover:bg-muted top-0 z-10 shadow-sm">
              {!isMultiDay ? (
                <TableRow className="h-9  hover:bg-muted  bg-muted">
                  <TableHead className="w-[45%] px-2 text-[0.7rem] xxxl:text-xs font-bold">Nume</TableHead>
                  <TableHead className="w-[17%] px-1 text-center text-[0.7rem] xxxl:text-xs font-bold">Început</TableHead>
                  <TableHead className="w-[17%] px-1 text-center text-[0.7rem] xxxl:text-xs font-bold">Final</TableHead>
                  <TableHead className="w-[21%] px-1 text-center text-[0.7rem] xxxl:text-xs font-bold">Total</TableHead>
                </TableRow>
              ) : (
                <TableRow className="h-9  hover:bg-muted  bg-muted">
                  <TableHead className="w-[7%] px-1 text-center text-[0.7rem] xxxl:text-xs font-bold"></TableHead>
                  <TableHead className="w-[31%] px-2 text-[0.7rem] xxxl:text-xs font-bold">Nume</TableHead>
                  <TableHead className="w-[16%] px-1 text-center text-[0.7rem] xxxl:text-xs font-bold">Data</TableHead>
                  <TableHead className="w-[15%] px-1 text-center text-[0.7rem] xxxl:text-xs font-bold">Început</TableHead>
                  <TableHead className="w-[15%] px-1 text-center text-[0.7rem] xxxl:text-xs font-bold">Final</TableHead>
                  <TableHead className="w-[16%] px-1 text-center text-[0.7rem] xxxl:text-xs font-bold">Total</TableHead>
                </TableRow>
              )}
            </TableHeader>

            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isMultiDay ? 6 : 4} className="h-20 text-center text-sm text-muted-foreground">
                    Nu există utilizatori.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => {
                  const isNepontat = !row.hasPontaj;
                  const isActive = row.active;
                  const isUnassigned = !row.isAssigned;
                  const isExpanded = expandedRows.has(row.id);
                  const canExpand = isMultiDay && row.dailyRows.length > 0;

                  const rowClass = `h-10 border-b transition-colors ${
                    isUnassigned
                      ? "bg-destructive/10 hover:bg-destructive/20"
                      : isActive
                        ? "bg-green-700/10 hover:bg-green-700/20"
                        : isNepontat
                          ? "opacity-75 text-muted-foreground hover:bg-muted/40"
                          : "hover:bg-primary/10"
                  }`;

                  if (!isMultiDay) {
                    return (
                      <TableRow key={`${row.isAssigned ? "assigned" : "unassigned"}-${row.id}`} className={rowClass}>
                        <TableCell className="px-2 py-1 min-w-0">
                          <div className="flex items-center min-w-0">
                            <OverflowTooltip
                              text={row.name}
                              align="left"
                              className={`text-xs xxxl:text-sm font-semibold truncate ${isUnassigned ? "text-destructive" : isNepontat ? "text-muted-foreground" : "text-foreground"}`}
                              maxLines={1}
                            />
                          </div>
                        </TableCell>

                        <TableCell className="px-1 py-1 text-center text-xs xxxl:text-sm font-semibold tabular-nums">{row.firstStart ? fmtTimeLocal(row.firstStart) : "—"}</TableCell>

                        <TableCell className="px-1 py-1 text-center text-xs xxxl:text-sm font-semibold tabular-nums">
                          {isActive ? <span className="text-green-700 font-black">Activ</span> : row.lastEnd ? fmtTimeLocal(row.lastEnd) : "—"}
                        </TableCell>

                        <TableCell className="px-1 py-1 text-center text-xs xxxl:text-sm font-black tabular-nums">{renderTotalCell(row, { allowWarningColor: true })}</TableCell>
                      </TableRow>
                    );
                  }

                  return (
                    <React.Fragment key={`${row.isAssigned ? "assigned" : "unassigned"}-${row.id}`}>
                      <TableRow className={`${rowClass} cursor-pointer `} onClick={() => canExpand && toggleExpanded(row.id)}>
                        <TableCell className="px-1 py-1 text-center">
                          {canExpand ? <FontAwesomeIcon icon={isExpanded ? faChevronDown : faChevronRight} className="text-sm xxxl:text-base text-foreground font-black" /> : null}
                        </TableCell>

                        <TableCell className="px-2 py-1 min-w-0">
                          <div className="flex items-center min-w-0">
                            <OverflowTooltip
                              text={row.name}
                              align="left"
                              className={`text-xs xxxl:text-sm font-semibold truncate ${isUnassigned ? "text-destructive" : isNepontat ? "text-muted-foreground" : "text-foreground"}`}
                              maxLines={1}
                            />
                          </div>
                        </TableCell>

                        <TableCell className="px-1 py-1 text-center text-xs xxxl:text-sm font-black tabular-nums">{row.zilePrezente ? `${row.zilePrezente} zile` : "—"}</TableCell>

                        <TableCell className="px-1 py-1 text-center text-xs xxxl:text-sm font-semibold tabular-nums">{row.firstStart ? fmtTimeLocal(row.firstStart) : "—"}</TableCell>

                        <TableCell className="px-1 py-1 text-center text-xs xxxl:text-sm font-semibold tabular-nums">
                          {isActive ? <span className="text-green-700 font-black">Activ</span> : row.lastEnd ? fmtTimeLocal(row.lastEnd) : "—"}
                        </TableCell>

                        <TableCell className="px-1 py-1 text-center text-xs xxxl:text-sm font-black tabular-nums">{renderTotalCell(row, { allowWarningColor: false })}</TableCell>
                      </TableRow>

                      {isExpanded &&
                        row.dailyRows.map((day) => {
                          const childIsActive = day.active;
                          const childIsNepontat = !day.hasPontaj && !day.active;

                          return (
                            <TableRow key={`${row.id}-${day.date}`} className="h-9 border-b bg-muted/50 hover:bg-muted">
                              <TableCell className="px-1 py-1"></TableCell>

                              <TableCell className="px-2 py-1 min-w-0"></TableCell>

                              <TableCell className="px-1 py-1 text-center text-xs xxxl:text-sm font-black tabular-nums">{fmtDateShort(day.date)}</TableCell>

                              <TableCell className="px-1 py-1 text-center text-xs xxxl:text-sm font-semibold tabular-nums">{day.firstStart ? fmtTimeLocal(day.firstStart) : "—"}</TableCell>

                              <TableCell className="px-1 py-1 text-center text-xs xxxl:text-sm font-semibold tabular-nums">
                                {childIsActive ? <span className="text-green-700 font-black">Activ</span> : day.lastEnd ? fmtTimeLocal(day.lastEnd) : "—"}
                              </TableCell>

                              <TableCell className="px-1 py-1 text-center text-xs xxxl:text-sm font-black tabular-nums">
                                {childIsActive ? (
                                  <Badge className="text-[0.65rem] bg-green-700 hover:bg-green-700 px-2 py-1">Activ</Badge>
                                ) : childIsNepontat ? (
                                  <Badge variant="default" className="text-[0.65rem]">
                                    Nepontat
                                  </Badge>
                                ) : (
                                  <span className={day.hasCancelled ? "text-destructive" : day.hasEdited ? "text-yellow-600 dark:text-yellow-400" : "text-foreground"}>{fmt(day.totalMinutes)}</span>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                    </React.Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
