import React, { useRef } from "react";
import { format } from "date-fns";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faExclamationCircle } from "@fortawesome/free-solid-svg-icons";
import {
    TableBody, TableCell, TableHead,
    TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import photoApi from "@/api/photoAPI";
import SpinnerElement from "@/MainElements/SpinnerElement";
import { TableVirtuoso } from "react-virtuoso";

// ─── helpers ──────────────────────────────────────────────────────────────────

function normalizeText(str) {
    return (str || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

const RO_TZ = "Europe/Bucharest";
const fmtTimeRO = (d) =>
    new Intl.DateTimeFormat("ro-RO", {
        hour: "2-digit", minute: "2-digit", hour12: false, timeZone: RO_TZ,
    }).format(d);

// ─── stable virtuoso components (defined OUTSIDE, same as UtilizatoriList) ───

const virtuosoComponents = {
    Table: (props) => (
        <table {...props} className="w-full table-auto caption-bottom text-left min-w-max" />
    ),
    TableHead: React.forwardRef((props, ref) => (
        <TableHeader {...props} ref={ref} className="bg-background sticky top-0 z-20 shadow-sm" />
    )),
    TableBody: React.forwardRef((props, ref) => (
        <TableBody {...props} ref={ref} />
    )),
    TableRow: (props) => {
        const index = props["data-index"];
        const user = props.context?.filteredData?.[index];
        if (!user) return <TableRow {...props} />;

        const isSelected =
            props.context?.selectedUser?.id === user.id ||
            props.context?.selectedUserIds?.has(user.id);

        return (
            <TableRow
                {...props}
                className={`selectedRow cursor-pointer transition-colors border-b h-20 md:h-24 xl:h-28 ${isSelected ? "bg-primary/10 hover:bg-primary/10" : "hover:bg-muted"
                    } ${!user.activ ? "opacity-20 grayscale-[0.25]" : ""}`}
            />
        );
    },
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function PontajeList({
    filteredData = [],
    selectedDates = [],
    selectedUser,
    selectedUserIds,
    visibleColumns = {},
    isFetching,
    loading,
    onSelectUser,
    minutesByClock,
    fmtHHMM,
}) {
    const containerRef = useRef(null);

    const showCol = (key) => visibleColumns[key] !== false;

    const selectedIsoDates = selectedDates.map((d) => format(d, "yyyy-MM-dd"));
    const singleDay = selectedIsoDates.length === 1;
    const singleIso = singleDay ? selectedIsoDates[0] : null;
    const todayIso = format(new Date(), "yyyy-MM-dd");

    const virtuosoContext = React.useMemo(() => ({
        filteredData,
        selectedUser,
        selectedUserIds,
    }), [filteredData, selectedUser, selectedUserIds]);

    return (
        <div ref={containerRef} className="rounded-md border bg-card w-full h-full overflow-auto relative">
            <TableVirtuoso
                customScrollParent={containerRef.current}
                totalCount={filteredData.length}
                data={filteredData}
                style={{ height: "100%", width: "100%" }}
                components={virtuosoComponents}
                context={virtuosoContext}
                fixedHeaderContent={() => (
                    <TableRow className="hover:bg-transparent border-b ">
                        {showCol("poza") && <TableHead className="text-center py-4  px-2">Poză</TableHead>}
                        {showCol("nume") && <TableHead className="text-center py-4 px-4">Nume</TableHead>}
                        {showCol("firma") && <TableHead className="text-center px-4">Firmă</TableHead>}
                        {showCol("rol") && <TableHead className="text-center px-4">Rol</TableHead>}
                        {showCol("santier") && <TableHead className="text-center px-4">Șantier</TableHead>}
                        {showCol("intrare") && <TableHead className="text-center px-4">Intrare</TableHead>}
                        {showCol("iesire") && <TableHead className="text-center px-4">Ieșire</TableHead>}
                        {showCol("pauza") && <TableHead className="text-center px-4">Pauză</TableHead>}
                        {showCol("total_ore") && <TableHead className="text-center px-4">Total Ore</TableHead>}
                    </TableRow>
                )}
                itemContent={(index, user) => {
                    // ── sessions ─────────────────────────────────────────────
                    const dayBlock = singleDay
                        ? user.work_sessions.find((ws) => ws.session_date === singleIso)
                        : null;

                    const daySessions = singleDay
                        ? (dayBlock?.sessions ?? [])
                        : user.work_sessions
                            .filter((ws) => selectedIsoDates.includes(ws.session_date))
                            .flatMap((ws) => ws.sessions ?? []);

                    const activeSantier = daySessions.find((s) => !s.end_time && (s.status === "active" || s.status == null));
                    const anyOpen = singleDay && !!activeSantier;
                    const isTodaySelected = singleDay && singleIso === todayIso;
                    const hasAnyCancelled = singleDay && daySessions.some((s) => s.status === "cancelled");
                    const hasAnyStart = singleDay && daySessions.some((s) => !!s.start_time);
                    const hasAnyEnd = singleDay && daySessions.some((s) => !!s.end_time);

                    // ── totals ────────────────────────────────────────────────
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
                        const result = selectedIsoDates.reduce((totals, dateStr) => {
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
                        }, { totalMinutesRef: 0, totalMinutesPauzaRef: 0 });
                        totalMinutes = result.totalMinutesRef;
                        totalMinutesPauza = result.totalMinutesPauzaRef;
                    }

                    const totalHoursPauzaDisplay = fmtHHMM(totalMinutesPauza);
                    const totalHoursDisplay = fmtHHMM(totalMinutes - totalMinutesPauza);

                    // ── intrare / ieșire ──────────────────────────────────────
                    let intrare = "—";
                    let iesire = "—";
                    if (singleDay && daySessions.length) {
                        const starts = daySessions.map((s) => s.start_time ? new Date(s.start_time) : null).filter(Boolean);
                        if (starts.length) intrare = fmtTimeRO(starts.reduce((a, b) => (a < b ? a : b)));
                        if (!anyOpen) {
                            const ends = daySessions.map((s) => s.end_time ? new Date(s.end_time) : null).filter(Boolean);
                            if (ends.length) iesire = fmtTimeRO(ends.reduce((a, b) => (a > b ? a : b)));
                        }
                    }

                    // ── status cell ───────────────────────────────────────────
                    let statusCell;
                    if (singleDay) {
                        if (isTodaySelected && anyOpen) {
                            statusCell = <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-400/40 hover:bg-emerald-500/15">Activ</Badge>;
                        } else if (!hasAnyStart && !hasAnyEnd) {
                            statusCell = <Badge variant="outline" className="text-muted-foreground">Nepontat</Badge>;
                        } else {
                            statusCell = (
                                <span className={`font-bold flex items-center justify-center gap-1.5 ${hasAnyCancelled ? "text-destructive" : ""}`}>
                                    {totalHoursDisplay}
                                    {hasAnyCancelled && <FontAwesomeIcon icon={faExclamationCircle} className="text-xl" />}
                                </span>
                            );
                        }
                    } else {
                        statusCell = totalMinutes > 0
                            ? <span className="font-bold">{totalHoursDisplay}</span>
                            : <span className="text-muted-foreground">—</span>;
                    }

                    // ── row click ─────────────────────────────────────────────
                    const handleClick = () => {
                        const sorted = [...daySessions].sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
                        const summary = (() => {
                            if (!singleDay || !daySessions.length) return null;
                            const starts = daySessions.map((s) => s.start_time ? new Date(s.start_time) : null).filter(Boolean);
                            const ends = daySessions.map((s) => s.end_time ? new Date(s.end_time) : null).filter(Boolean);
                            const firstLoc = daySessions.find((s) => s.start_lat != null);
                            const lastLoc = [...daySessions].reverse().find((s) => s.end_lat != null);
                            return {
                                date: singleIso,
                                firstStart: starts.length ? starts.reduce((a, b) => (a < b ? a : b)) : null,
                                lastEnd: (!anyOpen && ends.length) ? ends.reduce((a, b) => (a > b ? a : b)) : null,
                                startLat: firstLoc?.start_lat ?? null, startLng: firstLoc?.start_lng ?? null,
                                endLat: lastLoc?.end_lat ?? null, endLng: lastLoc?.end_lng ?? null,
                            };
                        })();
                        const allLocations = singleDay
                            ? daySessions.flatMap((s) => (s.locations || []).map((p) => ({ ...p, sesiune_id: s.id })))
                            : [];
                        onSelectUser({ ...user, selectedDate: singleIso, sessions: sorted, allLocations, summary });
                    };

                    // ── cells ─────────────────────────────────────────────────
                    return (
                        <>
                            {showCol("poza") && (
                                <TableCell className="whitespace-nowrap px-2" onClick={handleClick}>
                                    <div className="flex items-center justify-center">
                                        <Avatar className="border rounded-lg h-16 w-16 md:h-20 md:w-20 xl:h-24 xl:w-24 border-border">
                                            <AvatarImage src={user.photo_url ? `${photoApi}/${user.photo_url}` : null} alt={user.name} />
                                            <AvatarFallback className="font-bold rounded-lg text-foreground bg-muted text-base">
                                                {user.name?.[0]?.toUpperCase()}
                                            </AvatarFallback>
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
                                    <span className="text-base text-foreground">{user.firma || "—"}</span>
                                </TableCell>
                            )}
                            {showCol("rol") && (
                                <TableCell className="whitespace-nowrap px-4 text-center" onClick={handleClick}>
                                    <span className="text-base text-foreground">{user.role || "—"}</span>
                                </TableCell>
                            )}
                            {showCol("santier") && (
                                <TableCell className="whitespace-nowrap px-4 text-center" onClick={handleClick}>
                                    {singleDay && activeSantier ? (
                                        <div
                                            className="p-2 rounded-full text-black inline-block"
                                            style={{ backgroundColor: activeSantier.santier_color || "" }}
                                        >
                                            {activeSantier.santier_name}
                                        </div>
                                    ) : "—"}
                                </TableCell>
                            )}
                            {showCol("intrare") && (
                                <TableCell className="whitespace-nowrap px-4 text-center font-semibold" onClick={handleClick}>
                                    {singleDay ? intrare : "—"}
                                </TableCell>
                            )}
                            {showCol("iesire") && (
                                <TableCell
                                    className={`whitespace-nowrap px-4 text-center font-semibold ${singleDay && !anyOpen && hasAnyCancelled ? "text-red-600" : ""}`}
                                    onClick={handleClick}
                                >
                                    {singleDay ? iesire : "—"}
                                </TableCell>
                            )}
                            {showCol("pauza") && (
                                <TableCell className="whitespace-nowrap px-4 text-center font-semibold" onClick={handleClick}>
                                    {totalMinutesPauza > 0 ? totalHoursPauzaDisplay : "—"}
                                </TableCell>
                            )}
                            {showCol("total_ore") && (
                                <TableCell className="whitespace-nowrap px-4 text-center" onClick={handleClick}>
                                    {statusCell}
                                </TableCell>
                            )}
                        </>
                    );
                }}
            />
            {isFetching && !loading && <SpinnerElement text={2} />}
        </div>
    );
}