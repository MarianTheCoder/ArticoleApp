import React, { useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFileArrowDown, faFilter } from "@fortawesome/free-solid-svg-icons";
import ExportPontajeSantiere from "./ExportPontajeSantiere";

export default function PontajeSantierTable({
    data = [],
    loading = false,
    selectedIsoDates = [],
    assignMeta = { sites: [], assignments: [], users: [] },
    minutesByClock = (a, b) => 0,
    fmtHHMM = (m) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`,
    onSelectSite = () => { },
    selectedSiteKey = null,
}) {
    const [siteFilter, setSiteFilter] = useState("");
    const isMultipleDays = selectedIsoDates.length > 1;

    const rows = useMemo(() => {
        const sites = assignMeta?.sites || [];
        const assignments = assignMeta?.assignments || [];
        const usersMeta = assignMeta?.users || [];

        const usersById = new Map(usersMeta.map(u => [u.id, u]));
        const assignedBySite = new Map();
        for (const a of assignments) {
            if (!assignedBySite.has(a.santier_id)) assignedBySite.set(a.santier_id, new Set());
            assignedBySite.get(a.santier_id).add(a.user_id);
        }

        const rowsByKey = new Map();
        for (const s of sites) {
            rowsByKey.set(s.id, {
                key: s.id,
                siteName: s.name,
                color: s.color_hex || "#ffffff",
                assignedUsers: new Set(assignedBySite.get(s.id) || []),
                startedUsers: new Set(),
                activeUsers: new Set(),
                loggedUsers: new Set(),
                dateBuckets: new Map(),
                sessions: [],
                assignedCount: 0,
                totalMinutes: 0,
            });
        }

        const ensureBucket = (row, date) => {
            if (!row.dateBuckets.has(date)) row.dateBuckets.set(date, { hasActive: false, minutes: 0 });
            return row.dateBuckets.get(date);
        };

        for (const u of (data || [])) {
            const userMeta = usersById.get(u.id);
            for (const ws of (u.work_sessions || [])) {
                if (!selectedIsoDates.includes(ws.session_date)) continue;

                for (const s of (ws.sessions || [])) {
                    const siteId = s.santier_id ?? null;
                    const key = siteId ?? `__name__${s.santier_name || "—"}`;
                    if (!rowsByKey.has(key)) {
                        rowsByKey.set(key, {
                            key,
                            siteName: s.santier_name || "—",
                            color: s.santier_color || "#ffffff",
                            assignedUsers: new Set(siteId ? (assignedBySite.get(siteId) || []) : []),
                            startedUsers: new Set(),
                            activeUsers: new Set(),
                            loggedUsers: new Set(),
                            dateBuckets: new Map(),
                            sessions: [],
                            assignedCount: 0,
                            totalMinutes: 0,
                        });
                    }
                    const row = rowsByKey.get(key);

                    row.sessions.push({
                        ...s,
                        session_date: ws.session_date,
                        user: { id: u.id, name: u.name, role: u.role, photo_url: u.photo_url || userMeta?.photo_url },
                    });

                    row.loggedUsers.add(u.id);
                    if (s.start_time) row.startedUsers.add(u.id);

                    const bucket = ensureBucket(row, ws.session_date);
                    const isActive = (!s.end_time && (s.status === "active" || s.status == null));
                    if (isActive) {
                        bucket.hasActive = true;
                        row.activeUsers.add(u.id);
                    } else if (s.start_time && s.end_time && (s.status === "completed" || s.status === "cancelled")) {
                        bucket.minutes += minutesByClock(s.start_time, s.end_time);
                    }
                }
            }
        }
        for (const row of rowsByKey.values()) {
            // minutes only on non-active days
            for (const [, b] of row.dateBuckets) {
                if (!b.hasActive) row.totalMinutes += b.minutes;
            }

            row.assignedCount = row.assignedUsers.size;

            // who showed up on this site (any session in the interval)
            const presentUsers = row.loggedUsers;

            // split present into assigned vs unassigned
            row.presentAssignedCount = 0;        // <-- base number you show
            row.unassignedPresent = 0;         // <-- red (+N)
            row.unassignedNames = [];

            for (const uid of presentUsers) {
                if (row.assignedUsers.has(uid)) {
                    row.presentAssignedCount++;
                } else {
                    row.unassignedPresent++;
                    const nm = usersById.get(uid)?.name;
                    if (nm) row.unassignedNames.push(nm);
                }
            }
        }

        let list = [...rowsByKey.values()];
        if (siteFilter.trim()) {
            const q = siteFilter.trim().toLowerCase();
            list = list.filter(r => (r.siteName || "").toLowerCase().includes(q));
        }
        console.log("Filtered rows:", list);
        return list;
    }, [data, selectedIsoDates, assignMeta, minutesByClock, siteFilter]);

    // EXPORT functionality
    // --- export/select state ---
    const [selectMode, setSelectMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [exportMenuOpen, setExportMenuOpen] = useState(false);

    // the list currently visible in the table (use your own source)
    const visible = rows || [];       // for SANTIERE table

    const hasSelection = selectedIds.size > 0;
    const allOnPageSelected = visible.length > 0 && visible.every(x => selectedIds.has(x.key));

    // enter/exit select mode
    const enterSelectMode = () => { setSelectMode(true); setExportMenuOpen(false); };
    const exitSelectMode = () => { setSelectMode(false); setSelectedIds(new Set()); setExportMenuOpen(false); };

    // select/deselect a single row
    const toggleOne = (key) => setSelectedIds(prev => {
        const next = new Set(prev);
        next.has(key) ? next.delete(key) : next.add(key);
        return next;
    });

    // select/deselect everything currently visible
    const toggleAllOnPage = () => setSelectedIds(prev => {
        const next = new Set(prev);
        const everySelected = visible.length > 0 && visible.every(x => next.has(x.key));
        if (everySelected) visible.forEach(x => next.delete(x.key));
        else visible.forEach(x => next.add(x.key));
        return next;
    });

    // keep selection in sync with filters/pagination
    useEffect(() => {
        if (!selectMode) return;
        setSelectedIds(prev => {
            const keep = new Set();
            const keysVisible = new Set(visible.map(x => x.key));
            prev.forEach(key => keysVisible.has(key) && keep.add(key));
            return keep;
        });
    }, [visible, selectMode]);

    return (
        <div className="h-full flex flex-col overflow-hidden bg-white shadow-md rounded-lg gap-4 p-6">
            {/* filters */}
            <div className="flex w-full items-center justify-between h-20">
                <div className="flex h-20 items-center">
                    <div className="flex h-full items-center pl-2 gap-2">
                        <FontAwesomeIcon icon={faFilter} className="text-blue-500 text-2xl" />
                        <h2 className="text-black text-xl font-semibold">Filtre</h2>
                        <div className="h-full w-1 rounded-full ml-6 bg-black" />
                    </div>
                    <div className="ml-6">
                        <input
                            type="search"
                            value={siteFilter}
                            onChange={(e) => setSiteFilter(e.target.value)}
                            placeholder="Caută activitate/șantier..."
                            className="border border-gray-300 text-black rounded-full p-2 px-4 w-72"
                        />
                    </div>
                </div>
                <div className="relative flex h-20 exportMenu gap-4 text-black items-center">
                    {selectMode && (
                        <>
                            <button
                                className="block bg-red-500 rounded-full text-white text-center px-6 py-2 hover:bg-red-600"
                                onClick={exitSelectMode}
                            >
                                Închide
                            </button>

                            <button
                                role="menuitem"
                                className="block w-56 text-center px-4 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600"
                                onClick={toggleAllOnPage}
                            >
                                {allOnPageSelected ? 'Deselectează toți' : 'Selectează toți'} ({selectedIds.size})
                            </button>
                        </>
                    )}

                    <button
                        className="px-4 py-2 border border-gray-300 w-40 flex items-center justify-center gap-2 rounded-full hover:bg-gray-100 text-black"
                        onClick={() => {
                            if (selectMode) {
                                if (!hasSelection) { alert("Selectează cel puțin o activitate pentru export."); return; }
                                ExportPontajeSantiere({
                                    selectedSantierIds: selectedIds,
                                    dates: selectedIsoDates,
                                });
                                // optional: exit after export
                                // exitSelectMode();
                                return;
                            }
                            setExportMenuOpen(v => !v);
                        }}
                        aria-haspopup="menu"
                        aria-expanded={exportMenuOpen}
                    >
                        <FontAwesomeIcon icon={faFileArrowDown} className="text-blue-500 text-lg" />
                        Export
                    </button>

                    {exportMenuOpen && !selectMode && (
                        <div role="menu" className="absolute right-0 top-16 mt-2 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-30">
                            <div className="absolute -top-2 left-8 w-0 h-0 border-l-8 border-r-8 border-b-8 border-b-gray-300 border-transparent" />

                            <button
                                role="menuitem"
                                className="block text-left w-full px-4 py-3 hover:bg-gray-50"
                                onClick={() => {
                                    ExportPontajeSantiere({
                                        selectedSantierIds: rows.map(r => r.key), // export currently visible
                                        dates: selectedIsoDates,
                                    });
                                    setExportMenuOpen(false);
                                }}
                            >
                                Export toți
                            </button>

                            <button
                                role="menuitem"
                                className="block w-full text-left px-4 py-3 hover:bg-gray-50"
                                onClick={enterSelectMode}
                            >
                                Selectează
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* table */}
            <div className="relative w-full overflow-auto rounded-xl shadow-md h-full flex flex-col">

                <table className="min-w-full table-fixed text-base text-center border border-gray-200 text-black">
                    <thead className="text-base sticky top-0 z-20 uppercase h-20 bg-gray-200">
                        <tr></tr>
                        <tr>
                            <th className="w-[260px] px-4 py-2">Activitate</th>
                            <th className="w-28 px-4 py-2">Atribuiți</th>
                            <th className="w-36 px-4 py-2">
                                {selectedIsoDates.length > 1 ? "Prezenți (interval)" : "Prezenți (zi)"}
                            </th>
                            {/* always keep header */}
                            <th className="w-28 px-4 py-2">Activ</th>
                            <th className="w-32 px-4 py-2">Total ore</th>
                        </tr>
                    </thead>

                    {(!loading && rows.length === 0) ? (
                        <tbody>
                            {/* 5 columns always */}
                            <tr>
                                <td colSpan={5} className="text-center py-6">
                                    Nu există date disponibile pentru această selecție.
                                </td>
                            </tr>
                        </tbody>
                    ) : (
                        <tbody className="overflow-auto">
                            {rows.map((r, idx) => (
                                <tr
                                    key={r.key ?? idx}
                                    onClick={() => {
                                        if (selectMode) { toggleOne(r.key); return; }
                                        onSelectSite(r);
                                    }}
                                    className={`border-t border-gray-300 selectedRow h-16 transition-colors  cursor-pointer ${selectedSiteKey === r.key || (selectMode && selectedIds.has(r.key)) ? "bg-blue-100" : "hover:bg-gray-50"}`}
                                >
                                    <td className="px-4 py-2 ">
                                        <span style={{ backgroundColor: r.color }} className="p-2 rounded-full px-12">{r.siteName}</span>
                                    </td>
                                    <td className={`px-4 py-2 font-semibold`}>
                                        {r.assignedCount}
                                    </td>
                                    <td className="px-4 py-2 font-semibold">
                                        {r.presentAssignedCount}
                                        {r.unassignedPresent > 0 && (
                                            <span className="ml-1 text-red-600 font-semibold">(+{r.unassignedPresent})</span>
                                        )}
                                    </td>                                  {/* show '-' when multiple days */}
                                    <td className="px-4 py-2 font-semibold">{selectedIsoDates.length > 1 ? '-' : r.activeUsers.size}</td>
                                    <td className="px-4 py-2 font-bold">{fmtHHMM(r.totalMinutes)}</td>
                                </tr>
                            ))}
                        </tbody>
                    )}
                </table>

                {loading && (
                    <div className="absolute inset-0 bg-white/50 z-50 flex items-center justify-center">
                        <div className="w-20 h-20 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                )}
            </div>
        </div>
    );
}