import React, { useCallback, useMemo, useRef } from "react";
import { TableVirtuoso } from "react-virtuoso";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faExclamationCircle } from "@fortawesome/free-solid-svg-icons";

import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import SpinnerElement from "@/MainElements/SpinnerElement";
import { useLoading } from "@/context/LoadingContext";
import OverflowTooltip from "@/components/ui/OverflowTooltip";

function normalizeText(str) {
  return (str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

const getSantierExportId = (row) => {
  return String(row?.santier_id ?? row?.id ?? row?.site_id ?? row?.key ?? row?.santier_name ?? "");
};

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

const fmtTimeLocal = (date) => {
  if (!date) return "—";
  return new Intl.DateTimeFormat("ro-RO", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
};

const COL = {
  santier: "w-[18rem] min-w-[18rem] max-w-[18rem] xxxl:w-[22rem] xxxl:min-w-[22rem] xxxl:max-w-[22rem]",
  atribuiti: "w-[7rem] min-w-[7rem] max-w-[7rem] xxxl:w-[8rem] xxxl:min-w-[8rem] xxxl:max-w-[8rem]",
  prezenti: "w-[7rem] min-w-[7rem] max-w-[7rem] xxxl:w-[8rem] xxxl:min-w-[8rem] xxxl:max-w-[8rem]",
  neatribuiti: "w-[8rem] min-w-[8rem] max-w-[8rem] xxxl:w-[9rem] xxxl:min-w-[9rem] xxxl:max-w-[9rem]",
  activi: "w-[7rem] min-w-[7rem] max-w-[7rem] xxxl:w-[8rem] xxxl:min-w-[8rem] xxxl:max-w-[8rem]",
  totalOre: "w-[8rem] min-w-[8rem] max-w-[8rem] xxxl:w-[9rem] xxxl:min-w-[9rem] xxxl:max-w-[9rem]",
};

const getArray = (source, keys = []) => {
  if (Array.isArray(source)) return source;

  for (const key of keys) {
    if (Array.isArray(source?.[key])) return source[key];
    if (Array.isArray(source?.data?.[key])) return source.data[key];
  }

  return [];
};

const getSiteId = (s) => s?.id ?? s?.santier_id ?? s?.site_id ?? s?.santierId ?? s?.siteId ?? null;

const getSiteName = (s) => s?.nume ?? s?.name ?? s?.santier_name ?? s?.site_name ?? s?.santierName ?? "—";

const getSiteColor = (s) => s?.culoare_hex ?? s?.color_hex ?? s?.santier_color ?? s?.color ?? "#64748b";

const getUserIdFromAssignment = (a) => a?.user_id ?? a?.utilizator_id ?? a?.userId ?? a?.utilizatorId ?? null;

const getSiteIdFromAssignment = (a) => a?.santier_id ?? a?.site_id ?? a?.santierId ?? a?.siteId ?? null;

const getUserName = (u) => u?.name ?? u?.nume ?? u?.user_name ?? "—";

const buildSantiereRows = ({ data, atribuiri, selectedIsoDates, minutesByClock, filterSantier }) => {
  const sitesRaw = getArray(atribuiri, ["sites", "santiere"]);
  const assignmentsRaw = Array.isArray(atribuiri) ? atribuiri : getArray(atribuiri, ["assignments", "atribuiri"]);
  const usersRaw = getArray(atribuiri, ["users", "utilizatori"]);

  const usersById = new Map();

  for (const u of usersRaw || []) {
    const id = u?.id ?? u?.user_id ?? u?.utilizator_id;
    if (id != null) {
      usersById.set(Number(id), {
        id: Number(id),
        name: getUserName(u),
        photo_url: u?.photo_url ?? null,
        firma: u?.firma ?? null,
      });
    }
  }

  for (const u of data || []) {
    if (u?.id != null) {
      usersById.set(Number(u.id), {
        id: Number(u.id),
        name: getUserName(u),
        photo_url: u?.photo_url ?? null,
        firma: u?.firma ?? null,
      });
    }
  }

  const assignedBySite = new Map();

  for (const a of assignmentsRaw || []) {
    const siteId = getSiteIdFromAssignment(a);
    const userId = getUserIdFromAssignment(a);

    if (siteId == null || userId == null) continue;

    const siteKey = String(siteId);
    const uid = Number(userId);

    if (!assignedBySite.has(siteKey)) assignedBySite.set(siteKey, new Map());

    assignedBySite.get(siteKey).set(uid, {
      id: uid,
      name: usersById.get(uid)?.name || a?.user_name || a?.nume_utilizator || "—",
      photo_url: usersById.get(uid)?.photo_url || a?.photo_url || null,
    });
  }

  const rowsByKey = new Map();

  const ensureRow = ({ siteId, siteName, siteColor }) => {
    const key = siteId != null ? String(siteId) : `name:${siteName}`;

    if (!rowsByKey.has(key)) {
      rowsByKey.set(key, {
        key,
        santier_id: siteId,
        santier_name: siteName || "—",
        santier_color: siteColor || "#64748b",

        assignedUsers: new Map(siteId != null ? assignedBySite.get(String(siteId)) || [] : []),
        presentUsers: new Map(),
        presentAssignedUsers: new Map(),
        unassignedPresentUsers: new Map(),
        activeUsers: new Map(),

        sessions: [],

        assignedCount: 0,
        presentCount: 0,
        presentAssignedCount: 0,
        unassignedPresentCount: 0,
        activeCount: 0,

        totalMinutes: 0,
        firstStart: null,
        lastEnd: null,

        hasActive: false,
        hasCancelled: false,
        hasEdited: false,
      });
    }

    return rowsByKey.get(key);
  };

  for (const s of sitesRaw || []) {
    const siteId = getSiteId(s);

    ensureRow({
      siteId,
      siteName: getSiteName(s),
      siteColor: getSiteColor(s),
    });
  }

  for (const u of data || []) {
    const uid = Number(u?.id);
    if (!uid) continue;

    const userMeta = {
      id: uid,
      name: getUserName(u),
      photo_url: u?.photo_url ?? null,
      firma: u?.firma ?? null,
    };

    for (const ws of u?.work_sessions || []) {
      if (!selectedIsoDates.includes(ws?.session_date)) continue;

      for (const session of ws?.sessions || []) {
        if (normalizeText(session?.santier_name) === "pauza") continue;

        const siteId = session?.santier_id ?? null;
        const siteName = session?.santier_name || "—";
        const siteColor = session?.santier_color || "#64748b";

        const row = ensureRow({
          siteId,
          siteName,
          siteColor,
        });

        const sessionWithUser = {
          ...session,
          session_date: ws.session_date,
          user: userMeta,
        };

        row.sessions.push(sessionWithUser);
        row.presentUsers.set(uid, userMeta);

        const isAssigned = row.assignedUsers.has(uid);

        if (isAssigned) {
          row.presentAssignedUsers.set(uid, userMeta);
        } else {
          row.unassignedPresentUsers.set(uid, userMeta);
        }

        const isActive = !session?.end_time && (session?.status === "active" || session?.status == null);

        if (isActive) {
          row.hasActive = true;
          row.activeUsers.set(uid, userMeta);
        }

        if (session?.status === "cancelled") row.hasCancelled = true;
        if (session?.edited == 1) row.hasEdited = true;

        if (session?.start_time) {
          const startDate = new Date(session.start_time);
          if (!row.firstStart || startDate < row.firstStart) row.firstStart = startDate;
        }

        if (session?.end_time) {
          const endDate = new Date(session.end_time);
          if (!row.lastEnd || endDate > row.lastEnd) row.lastEnd = endDate;
        }

        if (session?.start_time && session?.end_time) {
          row.totalMinutes += minutesByClock(session.start_time, session.end_time);
        }
      }
    }
  }

  for (const row of rowsByKey.values()) {
    row.assignedCount = row.assignedUsers.size;
    row.presentCount = row.presentUsers.size;
    row.presentAssignedCount = row.presentAssignedUsers.size;
    row.unassignedPresentCount = row.unassignedPresentUsers.size;
    row.activeCount = row.activeUsers.size;

    row.firstStartLabel = fmtTimeLocal(row.firstStart);
    row.lastEndLabel = row.hasActive ? "—" : fmtTimeLocal(row.lastEnd);
  }

  let rows = [...rowsByKey.values()];

  if (filterSantier?.trim()) {
    const q = normalizeText(filterSantier.trim());
    rows = rows.filter((r) => normalizeText(r.santier_name).includes(q));
  }

  rows.sort((a, b) => {
    if (b.activeCount !== a.activeCount) return b.activeCount - a.activeCount;
    if (b.presentCount !== a.presentCount) return b.presentCount - a.presentCount;
    if (b.totalMinutes !== a.totalMinutes) return b.totalMinutes - a.totalMinutes;
    return String(a.santier_name || "").localeCompare(String(b.santier_name || ""), "ro");
  });

  return rows;
};

const virtuosoComponents = {
  Table: (props) => <table {...props} className="w-full table-fixed caption-bottom text-left border-collapse" />,
  TableHead: React.forwardRef((props, ref) => <TableHeader {...props} ref={ref} className="bg-background sticky top-0 z-20 shadow-sm" />),
  TableBody: React.forwardRef((props, ref) => <TableBody {...props} ref={ref} />),
  TableRow: (props) => {
    const index = props["data-index"];
    const row = props.context?.rows?.[index];

    if (!row) return <TableRow {...props} />;

    const exportId = getSantierExportId(row);
    const exportSelectMode = props.context?.exportSelectMode;
    const isExportSelected = props.context?.exportSelectedIds?.has(exportId);
    const isSelected = props.context?.selectedSantier?.key === row.key;

    return (
      <TableRow
        {...props}
        className={`selectedRow cursor-pointer transition-colors border-b h-12 md:h-[3.25rem] xxxl:h-16 ${
          exportSelectMode && isExportSelected ? "bg-primary/15 hover:bg-primary/20" : exportSelectMode ? "hover:bg-muted/50" : isSelected ? "bg-primary/10 hover:bg-primary/20" : "hover:bg-muted"
        }`}
      />
    );
  },
};

export default function PontajeSantiereList({
  data = [],
  atribuiri,
  selectedIsoDates = [],
  selectedSantier,
  visibleColumns = {},
  filterSantier = "",
  isFetching,
  hourFormat,
  onSelectSantier,
  minutesByClock,
  fmtHHMM,
  exportSelectMode,
  exportSelectedIds,
  onExportToggleSantier,
}) {
  const { loading } = useLoading();
  const containerRef = useRef(null);

  const rows = useMemo(() => {
    return buildSantiereRows({
      data,
      atribuiri,
      selectedIsoDates,
      minutesByClock,
      filterSantier,
    });
  }, [data, atribuiri, selectedIsoDates, minutesByClock, filterSantier]);

  const showCol = useCallback((key) => visibleColumns[key] !== false, [visibleColumns]);

  const fmt = hourFormat ? fmtDecimal : fmtHHMM;

  const virtuosoContext = useMemo(
    () => ({
      rows,
      selectedSantier,
      onSelectSantier,
      exportSelectMode,
      exportSelectedIds,
      onExportToggleSantier,
    }),
    [rows, selectedSantier, onSelectSantier, exportSelectMode, exportSelectedIds, onExportToggleSantier],
  );

  const fixedHeaderContent = useCallback(
    () => (
      <TableRow className="hover:bg-transparent border-b bg-muted/25 h-12 xxxl:h-[3.5rem]">
        {showCol("santier") && <TableHead className={`text-center px-3 xxxl:px-4 text-xs xxxl:text-sm ${COL.santier}`}>Șantier</TableHead>}
        {showCol("atribuiti") && <TableHead className={`text-center px-3 xxxl:px-4 text-xs xxxl:text-sm ${COL.atribuiti}`}>Atribuiți</TableHead>}
        {showCol("prezenti") && <TableHead className={`text-center px-3 xxxl:px-4 text-xs xxxl:text-sm ${COL.prezenti}`}>Prezenți</TableHead>}
        {showCol("neatribuiti") && <TableHead className={`text-center px-3 xxxl:px-4 text-xs xxxl:text-sm ${COL.neatribuiti}`}>Neatribuiți</TableHead>}
        {showCol("activi") && <TableHead className={`text-center px-3 xxxl:px-4 text-xs xxxl:text-sm ${COL.activi}`}>Activi</TableHead>}
        {showCol("total_ore") && <TableHead className={`text-center px-3 xxxl:px-4 text-xs xxxl:text-sm ${COL.totalOre}`}>Total Ore</TableHead>}
      </TableRow>
    ),
    [showCol],
  );

  const itemContent = useCallback(
    (index, row) => {
      const handleClick = (e) => {
        if (exportSelectMode) {
          const exportId = getSantierExportId(row);
          if (exportId) {
            onExportToggleSantier?.(exportId);
          }
          return;
        }

        if (e.target.closest("a, button, input")) return;

        const selection = window.getSelection();
        if (selection.toString().length > 0) return;

        onSelectSantier?.(row);
      };

      return (
        <>
          {showCol("santier") && (
            <TableCell className={`px-3 xxxl:px-4 text-center ${COL.santier}`} onClick={handleClick}>
              <div className="flex justify-center w-full">
                <div
                  className="py-1.5 xxxl:py-2 px-3 xxxl:px-4 rounded-lg inline-flex items-center gap-2 max-w-full overflow-hidden"
                  style={{
                    backgroundColor: row.santier_color,
                    color: getContrastColor(row.santier_color),
                  }}
                >
                  <OverflowTooltip text={row.santier_name || "—"} className="text-sm xxxl:text-base font-medium whitespace-pre-wrap w-full leading-normal" maxLines={1} />
                </div>
              </div>
            </TableCell>
          )}

          {showCol("atribuiti") && (
            <TableCell className={`px-3 xxxl:px-4 text-center font-bold text-base xxxl:text-lg ${COL.atribuiti}`} onClick={handleClick}>
              {row.assignedCount || "—"}
            </TableCell>
          )}

          {showCol("prezenti") && (
            <TableCell className={`px-3 xxxl:px-4 text-center font-bold text-base xxxl:text-lg ${COL.prezenti}`} onClick={handleClick}>
              {row.presentCount || "—"}
            </TableCell>
          )}

          {showCol("neatribuiti") && (
            <TableCell className={`px-3 xxxl:px-4 text-center font-bold text-base xxxl:text-lg ${COL.neatribuiti}`} onClick={handleClick}>
              {row.unassignedPresentCount > 0 ? <span className="text-destructive">+{row.unassignedPresentCount}</span> : <span className="text-muted-foreground">—</span>}
            </TableCell>
          )}

          {showCol("activi") && (
            <TableCell className={`px-3 xxxl:px-4 text-center ${COL.activi}`} onClick={handleClick}>
              {row.activeCount > 0 ? (
                <Badge className="relative text-sm xxxl:text-base p-1.5 xxxl:p-2 px-3 xxxl:px-4 bg-green-700 hover:bg-green-700 shadow-md gap-2 overflow-hidden">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400"></span>
                  </span>
                  {row.activeCount}
                </Badge>
              ) : (
                <span className="text-muted-foreground text-sm xxxl:text-base">—</span>
              )}
            </TableCell>
          )}

          {showCol("total_ore") && (
            <TableCell className={`px-3 xxxl:px-4 text-center font-bold text-base xxxl:text-lg ${COL.totalOre}`} onClick={handleClick}>
              {row.totalMinutes > 0 ? fmt(row.totalMinutes) : <span className="text-muted-foreground">—</span>}
            </TableCell>
          )}
        </>
      );
    },
    [showCol, onSelectSantier, fmt, exportSelectMode, onExportToggleSantier],
  );

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-xl border-2 justify-center h-full gap-3 xxxl:gap-4">
        <FontAwesomeIcon icon={faExclamationCircle} className="text-destructive/80 text-4xl xxxl:text-5xl" />
        <span className="text-muted-foreground text-lg xxxl:text-xl">Nu s-au găsit șantiere</span>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="rounded-xl border bg-card w-full h-full overflow-auto relative">
      <TableVirtuoso
        customScrollParent={containerRef.current}
        totalCount={rows.length}
        data={rows}
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
