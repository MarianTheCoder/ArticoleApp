import React, { useMemo } from "react";

export default function PontajeSantierLeftPanel({
    selectedSite,                // row object from table (includes .key, .siteName, .color)
    selectedIsoDates = [],       // ['yyyy-MM-dd', ...]
    assignMeta = { sites: [], assignments: [], users: [] },
    data = [],                   // your fetched users with work_sessions
    minutesByClock = (a, b) => 0,
    fmtHours = (m) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`,
}) {
    if (!selectedSite) {
        return (
            <div className="flex items-center justify-center w-full text-gray-600">
                Selectează un șantier din tabelul din dreapta.
            </div>
        );
    }

    const isMultiDay = selectedIsoDates.length > 1;

    const { users, assignments } = assignMeta || {};
    const usersById = useMemo(
        () => new Map((users || []).map((u) => [u.id, u])),
        [users]
    );

    // identify site by id if possible; else fall back to name
    const siteKey = selectedSite.key;
    const siteId =
        typeof siteKey === "number" || /^\d+$/.test(String(siteKey))
            ? Number(siteKey)
            : null;
    const siteNameFallback = selectedSite.siteName;

    // assigned -> Set of user ids
    const assignedSet = useMemo(() => {
        if (!assignments) return new Set();
        const out = new Set();
        for (const a of assignments) {
            if (a.santier_id === siteId) out.add(a.user_id);
        }
        return out;
    }, [assignments, siteId]);

    const sessionBelongsToSite = (s) => {
        if (siteId != null) return s.santier_id === siteId;
        return (s.santier_name || "—") === siteNameFallback; // for sessions without id
    };

    // Role ordering
    const ROLE_ORDER = ["administrator", "manager", "ofertant", "angajat", "intern"];
    const roleRank = (r = "") => {
        const i = ROLE_ORDER.indexOf(String(r).toLowerCase());
        return i === -1 ? 999 : i;
    };
    const statusRank = (s) => (s === "Activ" ? 0 : s === "Pontat" ? 1 : 2);

    // Collect all users who logged anything on this site in the selected dates
    const presentUserIds = useMemo(() => {
        const set = new Set();
        for (const u of data || []) {
            for (const ws of u.work_sessions || []) {
                if (!selectedIsoDates.includes(ws.session_date)) continue;
                for (const s of ws.sessions || []) {
                    if (sessionBelongsToSite(s)) {
                        set.add(u.id);
                        break;
                    }
                }
            }
        }
        return set;
    }, [data, selectedIsoDates, sessionBelongsToSite]);

    // Build rows for: (assigned ∪ present) users
    const rows = useMemo(() => {
        const uidSet = new Set([...assignedSet, ...presentUserIds]);
        const rowsAcc = [];

        for (const uid of uidSet) {
            // prefer meta from assignMeta; fallback to what exists in 'data'
            let meta = usersById.get(uid);
            if (!meta) {
                const found = (data || []).find((u) => u.id === uid);
                meta = found || { id: uid, name: "—", role: "" };
            }

            // gather this user's sessions for the selected site & dates
            const userData = (data || []).find((u) => u.id === uid);
            const dayMap = new Map(selectedIsoDates.map((d) => [d, { hasActive: false, minutes: 0 }]));

            if (userData) {
                for (const ws of userData.work_sessions || []) {
                    if (!selectedIsoDates.includes(ws.session_date)) continue;
                    const bucket = dayMap.get(ws.session_date);
                    for (const s of ws.sessions || []) {
                        if (!sessionBelongsToSite(s)) continue;
                        const active = !s.end_time && (s.status === "active" || s.status == null);
                        if (active) {
                            bucket.hasActive = true; // poison this day
                        } else if (
                            s.start_time &&
                            s.end_time &&
                            (s.status === "completed" || s.status === "cancelled")
                        ) {
                            bucket.minutes += minutesByClock(s.start_time, s.end_time);
                        }
                    }
                }
            }

            // aggregate with the “skip active day” rule
            let totalMinutes = 0;
            let anyActive = false;
            for (const [, b] of dayMap) {
                if (b.hasActive) {
                    anyActive = true;
                    continue; // skip minutes for that day
                }
                totalMinutes += b.minutes;
            }

            // status
            let status = "Nepontat";
            if (isMultiDay) status = "—";
            else if (anyActive) status = "Activ";
            else if (totalMinutes > 0) status = "Pontat";

            rowsAcc.push({
                id: uid,
                name: meta.name || "—",
                role: meta.role || "",
                isAssigned: assignedSet.has(uid),
                status,
                minutes: totalMinutes,
            });
        }

        // sort: by role → by (assigned first) → by status → by name
        rowsAcc.sort(
            (a, b) =>
                roleRank(a.role) - roleRank(b.role) ||
                (a.isAssigned === b.isAssigned ? 0 : a.isAssigned ? -1 : 1) ||
                statusRank(a.status) - statusRank(b.status) ||
                a.name.localeCompare(b.name)
        );

        return rowsAcc;
    }, [
        assignedSet,
        presentUserIds,
        usersById,
        data,
        selectedIsoDates,
        sessionBelongsToSite,
        minutesByClock,
        isMultiDay,
    ]);

    // counts in header — ONLY for assigned users (unchanged behavior)
    const counts = useMemo(() => {
        let activ = 0,
            pontat = 0,
            nep = 0,
            totalMin = 0;
        for (const r of rows) {
            if (!r.isAssigned) continue; // only assigned count in header
            if (r.status === "Activ") activ++;
            else if (r.status === "Pontat") pontat++;
            else if (r.status === "Nepontat") nep++;
            totalMin += r.minutes;
        }
        return { assigned: assignedSet.size, activ, pontat, nep, totalMin };
    }, [rows, assignedSet]);

    const badge = (status) => {
        if (status === "Activ")
            return (
                <span className="px-2 py-1 rounded-full text-xs bg-green-600 text-white">
                    Activ
                </span>
            );
        if (status === "Pontat")
            return (
                <span className="px-2 py-1 rounded-full text-xs bg-blue-600 text-white">
                    Pontat
                </span>
            );
        if (status === "Nepontat")
            return (
                <span className="px-2 py-1 rounded-full text-xs bg-gray-600 text-white">
                    Nepontat
                </span>
            );
        return <span className="text-xs text-gray-500">—</span>;
    };

    const roleLabel = (r = "") => (r ? r[0].toUpperCase() + r.slice(1) : "—");

    return (
        <div className="flex flex-col w-full p-2">
            {/* header */}
            <div className="flex items-center justify-between gap-2 mb-3 w-full">
                {/* LEFT: shrinks, ellipsizes */}
                <div className="flex items-center gap-2 flex-1 min-w-0 w-0">
                    <h2
                        className="text-base font-semibold rounded-full px-6 py-2 truncate"
                        style={{ backgroundColor: selectedSite.color || "#ffffff" }}
                        title={selectedSite.siteName}
                    >
                        {selectedSite.siteName}
                    </h2>
                </div>

                {/* RIGHT: single line, no wrap, clipped if too long */}
                <div className="flex flex-nowrap items-center gap-4 overflow-hidden ">
                    <span className="shrink-0 whitespace-nowrap">
                        Atribuiți: <b>{counts.assigned}</b>
                    </span>
                    <span className="shrink-0 whitespace-nowrap">
                        Activ: <b>{counts.activ}</b>
                    </span>
                    <span className="shrink-0 whitespace-nowrap">
                        Pontat: <b>{counts.pontat}</b>
                    </span>
                    <span className="shrink-0 whitespace-nowrap">
                        Nepontat: <b>{counts.nep}</b>
                    </span>
                </div>
            </div>

            {/* list */}
            <div className="border border-black rounded-lg overflow-auto">
                <table className="min-w-full  text-sm">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="text-left px-3 py-2">Nume</th>
                            <th className="text-center px-3 py-2">Rol</th>
                            <th className="text-center px-3 py-2">Status</th>
                            <th className="text-center px-3 py-2">Total ore</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="text-center py-6 text-gray-500">
                                    Nu există utilizatori pentru acest șantier.
                                </td>
                            </tr>
                        ) : (
                            rows.map((u) => (
                                <tr
                                    key={u.id}
                                    className={`border-t ${u.isAssigned ? "" : "bg-red-50"}`}
                                    title={u.isAssigned ? "" : "Utilizator nealocat (a pontat pe acest șantier)"}
                                >
                                    <td className="px-3 py-2">{u.name}</td>
                                    <td className="px-3 py-2 text-center">{roleLabel(u.role)}</td>
                                    <td className="px-3 py-2 text-center">
                                        {isMultiDay ? <span className="text-xs text-gray-500">—</span> : badge(u.status)}
                                    </td>
                                    <td className="px-3 py-2 text-center font-semibold">
                                        {fmtHours(u.minutes)}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}