import React, { useEffect, useState, useContext, useMemo } from 'react';
import { DayPicker, getDefaultClassNames } from "react-day-picker";
import api from "../../api/axiosAPI";
import photoApi from "../../api/photoAPI";
import { format } from "date-fns";
import "react-day-picker/style.css";
import "../../assets/customCalendar.css";
import { faClock } from "@fortawesome/free-regular-svg-icons";
import { faChevronDown, faExclamationCircle, faFileArrowDown, faFileExcel, faFilePdf, faFilter, faLessThan, faMagnifyingGlass, faRetweet, faSkullCrossbones, faThumbTackSlash } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { GoogleMap, Marker } from "@react-google-maps/api";
import ExportPontaje from './ExportPontaje';
import ExportPontajeExcel from './ExportPontajeExcel';
import PontajeSantierLeftPanel from './PontajeSantierLeftPanel';
import PontajeSantierTable from './PontajeSantierTable';

export default function Pontaje() {
    const defaultClassNames = getDefaultClassNames();
    const [selectedDates, setSelectedDates] = useState([new Date()]);
    const [lastSelectedDate, setLastSelectedDate] = useState(null);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [loading, setLoading] = useState(true);
    const [showOreRapoarte, setShowOreRapoarte] = useState(false);

    const [selectedUsersTable, setSelectedUsersTable] = useState(true);

    function normalizeText(str) {
        return (str || "")
            .toLowerCase()
            .normalize("NFD")              // decompose characters
            .replace(/[\u0300-\u036f]/g, ""); // remove diacritics
    }

    const RO_TZ = "Europe/Bucharest";

    // offsetul (minute de adăugat la LOCAL ca să ajungi la UTC) pentru RO la o anumită dată
    function getTzOffsetMinutesFor(date, timeZone) {
        const dtf = new Intl.DateTimeFormat("en-US", {
            timeZone,
            year: "numeric", month: "2-digit", day: "2-digit",
            hour: "2-digit", minute: "2-digit", second: "2-digit",
            hour12: false,
        });
        const parts = Object.fromEntries(dtf.formatToParts(date).map(p => [p.type, p.value]));
        const asUTC = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
        // minutes to add to LOCAL (RO) to get UTC — exact definiția lui getTimezoneOffset
        return (asUTC - date.getTime()) / 60000;
    }

    // formatări în ora RO (fără să schimbi Date-ul)
    const fmtTimeRO = (d) =>
        new Intl.DateTimeFormat("ro-RO", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: RO_TZ }).format(d);

    // main data
    const [data, setData] = useState([]);

    // selected row/user (plus prepared bits for the right panel)
    const [selectedUser, setSelectedUser] = useState(null);

    // pagination index (0 = daily summary)
    const [sessionIdx, setSessionIdx] = useState(0);

    // locations UI
    const [showLocations, setShowLocations] = useState(false);
    const [locIdx, setLocIdx] = useState(0);

    // reset panel indices when user/date changes
    useEffect(() => {
        setSessionIdx(0);
        setShowLocations(false);
        setLocIdx(0);
    }, [selectedUser?.id, selectedUser?.selectedDate]);

    // also reset location index when paging sessions
    useEffect(() => {
        setLocIdx(0);
    }, [sessionIdx]);

    // --- helpers ---
    const modifiers = { selected: selectedDates };

    const isSameDay = (a, b) =>
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate();

    const getDatesInRange = (start, end) => {
        const range = [];
        const current = new Date(start);
        const final = new Date(end);
        const direction = current < final ? 1 : -1;
        while ((direction === 1 && current <= final) || (direction === -1 && current >= final)) {
            range.push(new Date(current));
            current.setDate(current.getDate() + direction);
        }
        return range;
    };

    const getAllDatesInMonth = (monthDate) => {
        const year = monthDate.getFullYear();
        const month = monthDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        return getDatesInRange(firstDay, lastDay);
    };

    // fetch
    useEffect(() => {
        if (!selectedDates.length) return;
        const timeout = setTimeout(async () => {
            try {
                const res = await api.post("/users/getWorkSessionsForDates", {
                    dates: selectedDates.map((d) => format(d, "yyyy-MM-dd")),
                    tzOffsetMin: getTzOffsetMinutesFor(selectedDates[0] ?? new Date(), RO_TZ),
                });
                setData(res.data);
            } catch (err) {
                console.error("❌ Eroare la axios:", err);
            } finally {
                setLoading(false);
            }
        }, 800);
        return () => clearTimeout(timeout);
    }, [selectedDates]);

    //Handle Click Outside!
    useEffect(() => {
        document.addEventListener("click", handleClickOutside);
        return () => {
            document.removeEventListener("click", handleClickOutside);
        };
    }, []);

    const handleClickOutside = (event) => {
        if (!event.target.closest(".selectedRow")) {
            setSelectedSite(null);
            setSelectedUser(null);
            setLocIdx(0);
            setSessionIdx(0);
            setShowLocations(false);
        }
        if (!event.target.closest(".exportMenu")) {
            setExportMenuOpen(false);
        }
    };

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
        return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    };


    //
    //filters
    //
    const [filterName, setFilterName] = useState('');
    const [filterRole, setFilterRole] = useState('all');
    const [filterFirma, setFilterFirma] = useState('all');

    const firmaOptions = useMemo(() => {
        // collect unique firms that actually appear in the current payload
        const map = new Map();
        (data || []).forEach(u => {
            // console.log(u);
            if (u.firma_id) {
                map.set(String(u.firma_id), {
                    id: String(u.firma_id),
                    name: u.firma || '(Fără nume)',
                    color_hex: u.firma_color || null,
                });
            }
        });
        const list = Array.from(map.values()).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        return [{ id: 'all', name: 'Toate Firmele' }, ...list];
    }, [data]);


    const roleOptions = useMemo(() => {
        const roles = Array.from(new Set((data || []).map(u => u.role).filter(Boolean)));
        return ['all', ...roles];
    }, [data]);


    const selectedIsoDates = useMemo(
        () => selectedDates.map(d => format(d, "yyyy-MM-dd")),
        [selectedDates]
    );
    const singleDay = selectedIsoDates.length === 1;

    const userHasPontajInSelection = (u) => {
        if (!u?.work_sessions?.length) return false;
        if (singleDay) {
            const ws = u.work_sessions.find(w => w.session_date === selectedIsoDates[0]);
            return !!(ws && (ws.sessions?.length > 0));
        }
        return u.work_sessions.some(w =>
            selectedIsoDates.includes(w.session_date) &&
            (w.sessions?.length > 0)
        );
    };

    const cmpFirmaThenName = (a, b) => {
        // dacă ai și numele firmei, folosește-l; altfel firma_id
        const fa = (a.firma || String(a.firma_id) || '').toLowerCase();
        const fb = (b.firma || String(b.firma_id) || '').toLowerCase();
        if (fa !== fb) return fa < fb ? -1 : 1;
        return (a.name || '').localeCompare(b.name || '', 'ro');
    };

    const filteredData = useMemo(() => {
        const q = filterName.trim().toLowerCase();

        // păstrezi TOATE filtrele existente (nume, rol, firma_id)
        const base = (data || []).filter(u => {
            const matchName = q === '' || (u.name || '').toLowerCase().includes(q);
            const matchRole = filterRole === 'all' || u.role === filterRole;
            const matchFirma = filterFirma === 'all' || String(u.firma_id) === String(filterFirma);
            return matchName && matchRole && matchFirma;
        });

        // spargi în 2 grupe: cu pontaj / fără pontaj
        const withPontaj = [];
        const withoutPontaj = [];
        for (const u of base) {
            (userHasPontajInSelection(u) ? withPontaj : withoutPontaj).push(u);
        }

        // sortezi fiecare grup: pe firmă, apoi alfabetic
        withPontaj.sort(cmpFirmaThenName);
        withoutPontaj.sort(cmpFirmaThenName);

        // le pui cap la cap: cu pontaj sus, fără jos
        return [...withPontaj, ...withoutPontaj];
    }, [data, filterName, filterRole, filterFirma, selectedIsoDates, singleDay]);

    // (opțional) dacă userul selectat iese din filtrare, îl deselectezi
    useEffect(() => {
        if (selectedUser && !filteredData.some(u => u.id === selectedUser.id)) {
            setSelectedUser(null);
        }
    }, [filteredData, selectedUser, setSelectedUser]);



    //
    //export
    //

    const [selectMode, setSelectMode] = useState(false);
    const [selectedUserIds, setSelectedUserIds] = useState(new Set());
    const [exportMenuOpen, setExportMenuOpen] = useState(false);

    const visibleUsers = filteredData || []; // lista încărcată (deja filtrată pe backend)
    const hasSelection = selectedUserIds.size > 0;
    const allOnPageSelected = visibleUsers.length > 0 && visibleUsers.every(u => selectedUserIds.has(u.id));

    const enterSelectMode = () => { setSelectMode(true); setExportMenuOpen(false); };
    const exitSelectMode = () => { setSelectMode(false); setSelectedUserIds(new Set()); setExportMenuOpen(false); };

    const toggleUser = (id) => {
        setSelectedUserIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };
    const toggleAllOnPage = () => {
        setSelectedUserIds(prev => {
            const next = new Set(prev);
            if (allOnPageSelected) visibleUsers.forEach(u => next.delete(u.id));
            else visibleUsers.forEach(u => next.add(u.id));
            return next;
        });
    };

    // dacă se schimbă lista (filtre/pagină), păstrează doar id-urile vizibile
    useEffect(() => {
        if (!selectMode) return;
        setSelectedUserIds(prev => {
            const keep = new Set();
            const idsVisible = new Set(visibleUsers.map(u => u.id));
            prev.forEach(id => { if (idsVisible.has(id)) keep.add(id); });
            return keep;
        });
    }, [visibleUsers, selectMode]);

    // *------------ SANTIERE HANDLERS ------------*
    //
    //
    const [selectedSite, setSelectedSite] = useState(null);
    const [assignMeta, setAssignMeta] = useState({ sites: [], assignments: [], users: [] });

    useEffect(() => {
        (async () => {
            try {
                const res = await api.get("/users/getAtribuiri"); // sau ruta ta reală
                // ideal: include și color_hex în query-ul de santiere
                setAssignMeta({
                    sites: res.data.santiere,        // [{id,name,color_hex?}]
                    assignments: res.data.assignments, // [{user_id, santier_id}]
                    users: res.data.users // [{id, name, photo_url}]
                });
                // console.log("Assign meta loaded:", res.data);
            } catch (e) { console.error(e); }
        })();
    }, []);

    return (
        <div className="h-screen w-full flex overflow-hidden  items-center justify-center">
            <div className="w-[90%] h-90h overflow-hidden relative bg-gray-200 grid p-6 grid-cols-[1.2fr_3fr] rounded-lg gap-6">
                {/* Left column: calendar + right-panel maps */}
                <div className="flex flex-col gap-6 overflow-hidden h-full rounded-lg">
                    {/* Calendar */}
                    <div className="rounded-lg select-none shadow-md bg-white flex justify-center p-4 py-6 items-center w-full">
                        <DayPicker
                            modifiers={modifiers}
                            selected={selectedDates}
                            month={currentMonth}
                            fixedWeeks
                            showWeekNumber
                            weekStartsOn={1}
                            onMonthChange={setCurrentMonth}
                            onDayClick={(day, modifiers, e) => {
                                setLoading(true);
                                setData([]);
                                setSelectedUser(null);
                                const exists = selectedDates.some((d) => isSameDay(d, day));
                                e.preventDefault();

                                if (e.shiftKey && lastSelectedDate) {
                                    const range = getDatesInRange(lastSelectedDate, day);
                                    setSelectedDates(range);
                                    return;
                                } else if (e.ctrlKey || e.metaKey) {
                                    if (exists) {
                                        const updated = selectedDates.filter((d) => !isSameDay(d, day));
                                        setSelectedDates(updated);
                                        if (updated.length === 0) setLastSelectedDate(null);
                                    } else {
                                        setSelectedDates([...selectedDates, day]);
                                        setLastSelectedDate(day);
                                    }
                                    return;
                                }

                                if (exists) {
                                    const updated = selectedDates.filter((d) => !isSameDay(d, day));
                                    setSelectedDates(updated);
                                    if (updated.length === 0) setLastSelectedDate(null);
                                } else {
                                    setSelectedDates([day]);
                                    setLastSelectedDate(day);
                                }
                            }}
                            classNames={{
                                root: `${defaultClassNames.root} border-2 shadow-md border-black text-black text-lg rounded-lg p-4`,
                            }}
                            footer={
                                <div className="text-center flex mt-4 text-base gap-4 ">
                                    <button
                                        onClick={() => {
                                            setData([]);
                                            setLoading(true);
                                            setSelectedUser(null);
                                            setSelectedDates([new Date()]);
                                            setLastSelectedDate(null);
                                            setCurrentMonth(new Date());
                                        }}
                                        className="bg-blue-500 hover:bg-blue-400 text-black font-semibold rounded-lg p-2 w-full"
                                    >
                                        Reset
                                    </button>
                                    <button
                                        onClick={() => {
                                            setData([]);
                                            setLoading(true);
                                            setSelectedUser(null);
                                            setSelectedDates(getAllDatesInMonth(currentMonth));
                                        }}
                                        className="bg-blue-500 hover:bg-blue-400 text-black font-semibold rounded-lg p-2 w-full"
                                    >
                                        Toată Luna
                                    </button>
                                </div>
                            }
                        />
                    </div>

                    {/* Right panel: maps + summary/sessions/locations */}
                    <div className="flex flex-1 bg-white h-full overflow-hidden relative selectedRow text-black rounded-lg shadow-md p-4">
                        {selectedUsersTable ?
                            (selectedUser && selectedDates.length === 1 ? (() => {
                                // console.log(selectedUser)
                                // sessions for that day (already sorted when we set selectedUser)
                                const sessions = selectedUser.sessions ?? [];
                                const hasAny = sessions.length > 0 || !!selectedUser.summary;

                                if (!hasAny) return null;

                                const isSummary = sessionIdx === 0; // 0 page = day summary
                                const pageCount = sessions.length + 1;
                                const s = isSummary ? null : sessions[sessionIdx - 1]; // asta e atunci cand nu sunt pe rezumat si luam data pe indexul respectiv.
                                const sum = selectedUser.summary || null;

                                // which set of location points to show in "Locations" mode
                                //punctele de locatie directe , luam din sessions daca nu avem summary
                                const locationPoints = isSummary
                                    ? (selectedUser.allLocations ?? [])
                                    : (s?.locations ?? []);

                                // clamp (no hook here!)
                                const locCount = locationPoints.length;
                                const safeLocIdx = Math.min(locIdx, Math.max(0, locCount - 1));
                                const currentPoint = locationPoints[safeLocIdx];

                                const lastEnd = isSummary ? selectedUser?.summary?.lastEnd : s?.end_time;

                                const hasStart = isSummary
                                    ? sum?.startLat != null && sum?.startLng != null
                                    : s?.start_lat != null && s?.start_lng != null;
                                const hasEnd = isSummary
                                    ? Boolean(lastEnd) && sum?.endLat != null && sum?.endLng != null
                                    : s?.end_lat != null && s?.end_lng != null;
                                return (
                                    <div className="grid grid-cols-2 grid-rows-[auto_auto_1fr] overflow-hidden gap-4 w-full">
                                        {/* Header: title + locations toggle + pager */}
                                        <div className="col-span-2 flex items-center justify-between">
                                            <h1 className="text-xl font-semibold">
                                                {!isSummary && s ? (
                                                    <>
                                                        {s.start_time ? fmtTimeRO(new Date(s.start_time)) + "-" : "--"}
                                                        {s.end_time ? (
                                                            fmtTimeRO(new Date(s.end_time))
                                                        ) : (
                                                            <span className="text-red-500">X</span>
                                                        )}
                                                        <span className="pl-2">{s.santier_name || ""}</span>
                                                    </>
                                                ) : (
                                                    <p>Rezumat zi <span className='font-normal'>{sessions[sessions.length - 1]?.rating || 5}/5</span></p>
                                                )}
                                            </h1>

                                            <div className="flex items-center gap-3">
                                                <button
                                                    className={`px-3 py-1 rounded-lg border ${showLocations ? "bg-blue-600 text-white" : ""}`}
                                                    onClick={() => setShowLocations((v) => !v)}
                                                    disabled={locCount === 0}
                                                    title={locCount ? "Afișează locațiile" : "Fără puncte de locație"}
                                                >
                                                    Locații
                                                </button>

                                                <button
                                                    className="px-3 py-1 rounded-lg border disabled:opacity-50"
                                                    onClick={() => setSessionIdx((i) => Math.max(0, i - 1))}
                                                    disabled={sessionIdx === 0}
                                                >
                                                    ◀
                                                </button>
                                                <div className="text-sm tabular-nums">
                                                    {sessionIdx}/{pageCount - 1}
                                                </div>
                                                <button
                                                    className="px-3 py-1 rounded-lg border disabled:opacity-50"
                                                    onClick={() => setSessionIdx((i) => Math.min(pageCount - 1, i + 1))}
                                                    disabled={sessionIdx === pageCount - 1}
                                                >
                                                    ▶
                                                </button>
                                            </div>
                                        </div>

                                        {/* Locations mode */}
                                        {showLocations ? (
                                            <>
                                                <div className="col-span-2 flex items-center gap-3">
                                                    <label className="text-sm font-medium">Punct locație:</label>
                                                    <select
                                                        className="border rounded-lg px-3 py-1"
                                                        value={String(safeLocIdx)}
                                                        onChange={(e) => setLocIdx(Number(e.target.value))}
                                                        disabled={locCount === 0}
                                                    >
                                                        {locationPoints.map((p, i) => (
                                                            <option key={`${p.sesiune_id || "sum"}-${i}`} value={String(i)}>
                                                                {p.recorded_at ? fmtTimeRO(new Date(p.recorded_at)) : `Punct ${i + 1}`}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <span className="text-sm text-gray-600">
                                                        {locCount ? `${locCount} puncte` : "Fără puncte"}
                                                    </span>
                                                </div>

                                                <div className="col-span-2 w-full h-full">
                                                    {currentPoint ? (
                                                        <GoogleMap
                                                            mapContainerStyle={{ height: "100%", width: "100%", borderRadius: "1rem", border: "1px solid #000" }}
                                                            center={{ lat: parseFloat(currentPoint.lat), lng: parseFloat(currentPoint.lng) }}
                                                            zoom={15}
                                                            options={{
                                                                disableDefaultUI: true,
                                                                mapTypeControl: true,
                                                                fullscreenControl: true,
                                                                streetViewControl: true,
                                                                zoomControl: false,
                                                                rotateControl: false,
                                                            }}
                                                        >
                                                            <Marker position={{ lat: parseFloat(currentPoint.lat), lng: parseFloat(currentPoint.lng) }} />
                                                        </GoogleMap>
                                                    ) : (
                                                        <div className="w-full h-full flex flex-col items-center border gap-4 border-black rounded-lg justify-center">
                                                            <p className="max-w-36 text-center">Nu există puncte de locație pentru pagina curentă.</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                {/* Intrare */}
                                                <div className="w-full h-full flex flex-col gap-2">
                                                    <h2 className="text-xl text-center font-semibold">Intrare</h2>
                                                    {hasStart ? (
                                                        <GoogleMap
                                                            mapContainerStyle={{ height: "12rem", width: "100%", borderRadius: "1rem", border: "1px solid #000" }}
                                                            center={
                                                                isSummary
                                                                    ? { lat: parseFloat(selectedUser.summary.startLat), lng: parseFloat(selectedUser.summary.startLng) }
                                                                    : { lat: parseFloat(s.start_lat), lng: parseFloat(s.start_lng) }
                                                            }
                                                            zoom={15}
                                                            options={{
                                                                disableDefaultUI: true,
                                                                mapTypeControl: true,
                                                                fullscreenControl: true,
                                                                streetViewControl: true,
                                                                zoomControl: false,
                                                                rotateControl: false,
                                                            }}
                                                        >
                                                            <Marker
                                                                position={
                                                                    isSummary
                                                                        ? { lat: parseFloat(selectedUser.summary.startLat), lng: parseFloat(selectedUser.summary.startLng) }
                                                                        : { lat: parseFloat(s.start_lat), lng: parseFloat(s.start_lng) }
                                                                }
                                                            />
                                                        </GoogleMap>
                                                    ) : (
                                                        <div className="w-full h-full flex flex-col items-center border gap-4 border-black rounded-lg justify-center">
                                                            <FontAwesomeIcon icon={faThumbTackSlash} className="text-red-500 text-6xl" />
                                                            <p className="max-w-36 text-center">Nu există o locație de intrare disponibilă.</p>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Ieșire */}
                                                <div className="w-full h-full flex flex-col gap-2">
                                                    <h2 className="text-xl text-center font-semibold">Ieșire</h2>
                                                    {hasEnd ? (
                                                        <GoogleMap
                                                            mapContainerStyle={{ height: "100%", width: "100%", borderRadius: "1rem", border: "1px solid #000" }}
                                                            center={
                                                                isSummary
                                                                    ? { lat: parseFloat(selectedUser.summary.endLat), lng: parseFloat(selectedUser.summary.endLng) }
                                                                    : { lat: parseFloat(s.end_lat), lng: parseFloat(s.end_lng) }
                                                            }
                                                            zoom={15}
                                                            options={{
                                                                disableDefaultUI: true,
                                                                mapTypeControl: true,
                                                                fullscreenControl: true,
                                                                streetViewControl: true,
                                                                zoomControl: false,
                                                                rotateControl: false,
                                                            }}
                                                        >
                                                            <Marker
                                                                position={
                                                                    isSummary
                                                                        ? { lat: parseFloat(selectedUser.summary.endLat), lng: parseFloat(selectedUser.summary.endLng) }
                                                                        : { lat: parseFloat(s.end_lat), lng: parseFloat(s.end_lng) }
                                                                }
                                                            />
                                                        </GoogleMap>
                                                    ) : (
                                                        <div className="w-full h-full flex flex-col items-center border gap-4 border-black rounded-lg justify-center">
                                                            <FontAwesomeIcon icon={faThumbTackSlash} className="text-red-500 text-6xl" />
                                                            <p className="max-w-36 text-center">Nu există o locație de ieșire disponibilă.</p>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Raport */}
                                                <div className="w-full h-full p-4 flex overflow-auto flex-col gap-2 col-span-2">
                                                    <h2 className="text-xl font-bold">Raport:</h2>
                                                    <p className="pl-4 whitespace-pre-line">
                                                        {isSummary
                                                            ? (() => {
                                                                // find the session with the latest end_time
                                                                const lastSessionWithEnd = sessions
                                                                    .filter(session => session.end_time)
                                                                    .reduce((latest, current) => {
                                                                        return new Date(current.end_time) > new Date(latest.end_time) ? current : latest;
                                                                    }, sessions[0]);

                                                                return lastSessionWithEnd?.note?.trim() || "Nu există un raport disponibil.";
                                                            })()
                                                            : s && s.note ? s.note.trim() : ("Nu există un raport disponibil.")}
                                                    </p>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                );
                            })() : null)
                            // asta e pentru santier
                            : <PontajeSantierLeftPanel
                                selectedSite={selectedSite}
                                selectedIsoDates={selectedDates.map(d => format(d, "yyyy-MM-dd"))}
                                assignMeta={assignMeta}
                                data={data}
                                minutesByClock={minutesByClock}
                                fmtHours={fmtHHMM}
                            />

                        }
                        {/* Totals by șantier when MULTIPLE days are selected */}
                        {selectedUser && selectedDates.length > 1 ? (() => {
                            const sessions = selectedUser?.sessions ?? [];
                            const selectedIsoDates = selectedDates.map(d => format(d, "yyyy-MM-dd"));

                            const rapoarte = sessions.map((s) => {
                                if (s.note && s.note.trim() !== '') {
                                    return {
                                        date: s.session_date,
                                        note: s.note.trim()
                                    }
                                }
                                return null;
                            }).filter(Boolean);

                            const totalsBySite = new Map();

                            for (const dateStr of selectedIsoDates) {
                                const daySessions = sessions.filter(s => s.session_date === dateStr);
                                if (!daySessions.length) continue;

                                const hasActive = daySessions.some(s => !s.end_time && (s.status === 'active' || s.status == null));
                                if (hasActive) continue;
                                const endedOnly = daySessions.filter(s => s.start_time && s.end_time);
                                if (!endedOnly.length) continue;

                                for (const s of endedOnly) {
                                    const site = s.santier_name || "—";
                                    // încearcă mai multe chei posibile; pune un fallback
                                    const color = s.santier_color || "#ffffff";
                                    const mins = minutesByClock(s.start_time, s.end_time);

                                    const prev = totalsBySite.get(site) || { minutes: 0, color };
                                    totalsBySite.set(site, { minutes: prev.minutes + mins, color: prev.color || color });
                                }
                            }

                            const rows = [...totalsBySite.entries()].sort((a, b) => b[1].minutes - a[1].minutes);

                            return (
                                <div className="w-full h-full flex flex-col bg-white text-black rounded-lg shadow-md p-4">
                                    <div className='flex items-center gap-4 justify-between mb-6 '>
                                        <h2 className="text-lg w-full font-semibold whitespace-nowrap">
                                            Total pe activitate (interval selectat)
                                        </h2>
                                        <div className='flex justify-left gap-2 w-full'>
                                            <button onClick={() => setShowOreRapoarte(false)} className={`${!showOreRapoarte ? "bg-blue-500 font-semibold" : "bg-gray-300 hover:bg-gray-400"} py-2 px-6 rounded-full`}>Ore</button>
                                            <button onClick={() => setShowOreRapoarte(true)} className={`${showOreRapoarte ? "bg-blue-500 font-semibold" : "bg-gray-300 hover:bg-gray-400"} py-2 px-6 rounded-full`}>Rapoarte</button>
                                        </div>
                                    </div>
                                    {rows.length ? (
                                        <div className='gap-3 overflow-hidden w-full  flex flex-col h-full'>
                                            {!showOreRapoarte ? (
                                                <div className='h-full overflow-auto'>
                                                    <table className="min-w-full text-base text-center border border-black">
                                                        <thead className="bg-gray-100">
                                                            <tr>
                                                                <th className="px-4 py-2 border border-gray-300">Șantier</th>
                                                                <th className="px-4 py-2 border border-gray-300">Ore totale</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {rows.map(([site, { minutes, color }]) => (
                                                                <tr key={site} className="border-t border-gray-300">
                                                                    <td
                                                                        style={{ backgroundColor: color }}
                                                                        className={`px-4 py-2 border border-gray-300 text-left`}>
                                                                        {site}
                                                                    </td>
                                                                    <td className="px-4 py-2 border border-gray-300 font-medium">
                                                                        {fmtHHMM(minutes)}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>) : (

                                                rapoarte.length ? (
                                                    <div className='h-full'>
                                                        <div className="my-2 border-t border-gray-300" />
                                                        <div className="flex overflow-auto flex-col h-full">
                                                            {rapoarte.map(r => (
                                                                <div className='h-full' key={r.date}>
                                                                    <h3 className=' font-bold'>{r.date}</h3>
                                                                    <p className="pl-4 whitespace-pre-line">{r.note}</p>
                                                                    <div className="my-2 border-t border-gray-300" />
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>) : null
                                            )}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-gray-600">
                                            Nu există ore pontate (zile incomplete sunt omise).
                                        </p>
                                    )}
                                </div>
                            );
                        })() : null}
                    </div>
                </div>

                {/* Right column: table USERS */}
                <div className="flex flex-col gap-4 overflow-hidden w-full h-full">
                    <div className="flex bg-white shadow-md w-full p-6 rounded-lg justify-between items-center">
                        <div className='flex items-center'>
                            <FontAwesomeIcon icon={faClock} className="text-blue-500 text-3xl mr-2" />
                            <h1 className="text-2xl font-bold text-black">Pontaje {selectedUsersTable ? 'Utilizatori' : 'Activitati'}</h1>
                        </div>
                        <div className='flex items-center'>
                            <FontAwesomeIcon onClick={() => setSelectedUsersTable((prev) => !prev)} icon={faRetweet} className="text-blue-500 hover:rotate-180 cursor-pointer transition-transform duration-300 text-3xl mr-2" />
                        </div>
                    </div>

                    {selectedUsersTable ?
                        (
                            <div className="h-full flex flex-col overflow-hidden  bg-white shadow-md rounded-lg gap-4 p-6">
                                {/* filters */}
                                <div className="flex w-full items-center justify-between h-20">
                                    <div className='flex h-20 items-center'>
                                        <div className="flex h-full items-center pl-2 gap-2 ">
                                            <FontAwesomeIcon icon={faFilter} className="text-blue-500 text-2xl" />
                                            <h2 className="text-black text-xl font-semibold">Filtre</h2>
                                            <div className="h-full w-1 rounded-full mx-2 bg-black" />
                                        </div>

                                        <div className="flex-1 h-full flex text-black items-center px-2 gap-2">
                                            <label htmlFor="filter-name" className=" font-semibold">Nume:</label>

                                            <div className='w-56 relative'>
                                                <input
                                                    type="search"
                                                    value={filterName}
                                                    onChange={(e) => setFilterName(e.target.value)}
                                                    className="border border-gray-300 rounded-full p-2 px-4 w-full"
                                                />
                                                {/* <FontAwesomeIcon icon={faMagnifyingGlass} className='absolute top-3 right-3 text-blue-500' /> */}
                                            </div>

                                            <label htmlFor="filter-role" className=" font-semibold">Rol:</label>
                                            {/* Rol */}
                                            <div className="relative inline-block">
                                                <FontAwesomeIcon
                                                    icon={faChevronDown}
                                                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                                                />
                                                <select
                                                    value={filterRole}
                                                    onChange={(e) => setFilterRole(e.target.value)}
                                                    className="appearance-none border border-gray-300 rounded-full p-2 pl-10 pr-2 w-44 max-w-44 bg-white"
                                                    aria-label="Filtru rol"
                                                >
                                                    {roleOptions.map(r => (
                                                        <option key={r} value={r}>
                                                            {r === 'all' ? 'Toate rolurile' : r[0].toUpperCase() + r.slice(1)}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <label htmlFor="filter-role" className=" font-semibold">Firma:</label>

                                            <div className="relative inline-block">
                                                <FontAwesomeIcon
                                                    icon={faChevronDown}
                                                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                                                />
                                                <select
                                                    value={filterFirma}
                                                    onChange={(e) => setFilterFirma(e.target.value)}
                                                    className="appearance-none border border-gray-300 rounded-full p-2 pl-10 pr-2 w-44 max-w-44 bg-white"
                                                    aria-label="Filtru firma"
                                                >
                                                    {firmaOptions.map(opt => (
                                                        <option key={opt.id} value={opt.id}>
                                                            {opt.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            {/* Reset (opțional) */}
                                            {(filterName || filterRole !== 'all') && (
                                                <button
                                                    type="button"
                                                    onClick={() => { setFilterName(''); setFilterRole('all'); }}
                                                    className="px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-100"
                                                >
                                                    Resetează
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <div className="relative flex h-20 exportMenu gap-4  text-black items-center">
                                        {selectMode &&
                                            (
                                                <>
                                                    <button
                                                        className="block bg-red-500 rounded-full text-white text-center px-6 py-2 hover:bg-red-600"
                                                        onClick={exitSelectMode}
                                                    >
                                                        Închide
                                                    </button>
                                                    <button
                                                        role="menuitem"
                                                        className="block  w-56 text-center px-4 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600"
                                                        onClick={toggleAllOnPage}
                                                    >
                                                        {allOnPageSelected ? 'Deselectează toți' : 'Selectează toți'} ({selectedUserIds.size})
                                                    </button>
                                                    <button
                                                        className="px-4 py-2 border border-gray-300 w-32 flex items-center justify-center gap-2 rounded-full hover:bg-gray-100 text-black"
                                                        onClick={() => {
                                                            ExportPontajeExcel({ selectedUserIds, dates: selectedDates.map(d => format(d, "yyyy-MM-dd")) });
                                                            setExportMenuOpen(v => !v);
                                                        }}
                                                    >
                                                        <FontAwesomeIcon icon={faFileExcel} className="text-blue-500 text-lg" />
                                                        Export
                                                    </button>
                                                </>

                                            )}

                                        <button
                                            className="px-4 py-2 border border-gray-300 w-32 flex items-center justify-center gap-2 rounded-full hover:bg-gray-100 text-black"
                                            onClick={() => {
                                                if (selectMode) {
                                                    if (selectedUserIds.size === 0) {
                                                        alert("Selectează cel puțin un utilizator pentru export.");
                                                        return;
                                                    }
                                                    ExportPontaje({ selectedUserIds, dates: selectedDates.map(d => format(d, "yyyy-MM-dd")) });
                                                }
                                                setExportMenuOpen(v => !v);
                                            }}
                                            aria-haspopup="menu"
                                            aria-expanded={exportMenuOpen}
                                        >
                                            <FontAwesomeIcon icon={!selectMode ? faFileArrowDown : faFilePdf} className="text-blue-500 text-lg" />
                                            Export
                                        </button>

                                        {exportMenuOpen && !selectMode && (
                                            <div
                                                role="menu"
                                                className="absolute right-0 top-16 mt-2  w-44  bg-white border border-gray-200 rounded-lg shadow-lg z-30"
                                            >
                                                <div className="absolute -top-2 left-8 w-0 h-0 border-l-8 border-r-8 border-b-8 border-b-gray-300 border-transparent" />
                                                <button
                                                    role="menuitem"
                                                    className="block text-left w-full px-4 py-3 hover:bg-gray-50"
                                                    onClick={() => {
                                                        ExportPontajeExcel({ selectedUserIds: new Set(visibleUsers.map(u => u.id)), dates: selectedDates.map(d => format(d, "yyyy-MM-dd")) });
                                                        setExportMenuOpen(false);
                                                    }}
                                                >
                                                    Export toți Excel
                                                </button>
                                                <button
                                                    role="menuitem"
                                                    className="block text-left w-full px-4 py-3 hover:bg-gray-50"
                                                    onClick={() => {
                                                        ExportPontaje({ selectedUserIds: new Set(visibleUsers.map(u => u.id)), dates: selectedDates.map(d => format(d, "yyyy-MM-dd")) });
                                                        setExportMenuOpen(false);
                                                    }}
                                                >
                                                    Export toți PDF
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
                                                <th className="w-[70px] px-4 py-2">Poză</th>
                                                <th className="w-44 px-4 py-2">Nume</th>
                                                <th className="w-24 px-4 py-2">Firma</th>
                                                <th className="w-20 px-4 py-2">Rol</th>
                                                <th className="w-24 px-4 py-2">Șantier</th>
                                                <th className="w-28 px-4 py-2">Intrare</th>
                                                <th className="w-28 px-4 py-2">Ieșire</th>
                                                <th className="w-28 px-4 py-2">Pauză</th>
                                                <th className="w-32 px-4 py-2">Total Ore</th>
                                            </tr>
                                        </thead>

                                        {!loading && data.length > 0 ? (
                                            <tbody className="overflow-auto ">
                                                {filteredData.map((user) => {
                                                    // dates selected
                                                    const selectedIsoDates = selectedDates.map((d) => format(d, "yyyy-MM-dd"));
                                                    const singleDay = selectedIsoDates.length === 1;
                                                    const singleIso = singleDay ? selectedIsoDates[0] : null;

                                                    //afisam firma
                                                    const firma = user?.firma ?? null;
                                                    const firmaColor = user?.firma_color ?? null;

                                                    // sessions for selection
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

                                                    const todayIso = format(new Date(), "yyyy-MM-dd");
                                                    const isTodaySelected = singleDay && singleIso === todayIso;

                                                    const hasAnyCancelled = singleDay && daySessions.some((s) => s.status === "cancelled");
                                                    const hasAnyStart = singleDay && daySessions.some((s) => !!s.start_time);
                                                    const hasAnyEnd = singleDay && daySessions.some((s) => !!s.end_time);

                                                    let totalMinutes = 0;
                                                    let totalMinutesPauza = 0;

                                                    if (singleDay) {
                                                        // dacă există sesiune activă azi -> nu adunăm nimic
                                                        if (anyOpen) {
                                                            totalMinutes = 0;
                                                        } else {
                                                            const endedSessions = daySessions.filter(s => s.start_time && s.end_time);
                                                            const pauzaSessions = daySessions.filter(s => {
                                                                const name = normalizeText(s.santier_name);
                                                                return name == "pauza" && s.start_time && s.end_time;
                                                            });
                                                            totalMinutesPauza = pauzaSessions.reduce((acc, s) => acc + minutesByClock(s.start_time, s.end_time), 0);
                                                            totalMinutes = endedSessions.reduce((acc, s) => acc + minutesByClock(s.start_time, s.end_time), 0);
                                                        }
                                                    } else {
                                                        const { totalMinutesRef, totalMinutesPauzaRef } = selectedIsoDates.reduce((totals, dateStr) => {
                                                            const sessionsOfDay = user.work_sessions.find(ws => ws.session_date === dateStr)?.sessions || [];
                                                            if (!sessionsOfDay.length) return totals;

                                                            // skip the whole day if any session is active
                                                            const hasActive = sessionsOfDay.some(s => !s.end_time && (s.status === 'active' || s.status == null));
                                                            if (hasActive) return totals;

                                                            // only ended sessions
                                                            const ended = sessionsOfDay.filter(s => s.start_time && s.end_time);
                                                            if (!ended.length) return totals;

                                                            let minutesAll = 0;
                                                            let minutesPauza = 0;

                                                            for (const s of ended) {
                                                                const m = minutesByClock(s.start_time, s.end_time);
                                                                minutesAll += m;
                                                                if (normalizeText(s.santier_name) === "pauza") {
                                                                    minutesPauza += m;
                                                                }
                                                            }

                                                            totals.totalMinutesRef += minutesAll;
                                                            totals.totalMinutesPauzaRef += minutesPauza;
                                                            return totals;
                                                        }, { totalMinutesRef: 0, totalMinutesPauzaRef: 0 });
                                                        totalMinutes = totalMinutesRef;
                                                        totalMinutesPauza = totalMinutesPauzaRef;
                                                    }

                                                    const totalHoursPauzaDisplay = fmtHHMM(totalMinutesPauza);
                                                    const totalHoursDisplay = fmtHHMM(totalMinutes - totalMinutesPauza);

                                                    // first in, last out (display)
                                                    let intrare = "—";
                                                    let iesire = "—";
                                                    if (singleDay && daySessions.length) {
                                                        const starts = daySessions
                                                            .map((s) => (s.start_time ? new Date(s.start_time) : null))
                                                            .filter(Boolean);

                                                        if (starts.length) {
                                                            const firstStart = starts.reduce((a, b) => (a < b ? a : b));
                                                            intrare = fmtTimeRO(firstStart);
                                                        }

                                                        // Only show last end if the day is NOT active
                                                        if (!anyOpen) {
                                                            const ends = daySessions
                                                                .map((s) => (s.end_time ? new Date(s.end_time) : null))
                                                                .filter(Boolean);
                                                            if (ends.length) {
                                                                const lastEnd = ends.reduce((a, b) => (a > b ? a : b));
                                                                iesire = fmtTimeRO(lastEnd);
                                                            }
                                                            else {
                                                                iesire = "—"; // suppress showing end time while day is active
                                                            }
                                                        }
                                                    }

                                                    let statusCell = <div>—</div>;

                                                    if (singleDay) {
                                                        if (isTodaySelected && anyOpen) {
                                                            statusCell = <div><span className="p-2 px-6 w-full bg-green-600 text-white rounded-full">Activ</span></div>;
                                                        } else if (!hasAnyStart && !hasAnyEnd) {
                                                            statusCell = <div><span className="p-2 px-6 w-full bg-blue-600 text-white rounded-full">Nepontat</span></div>;
                                                        } else {
                                                            // totalul include completed + cancelled (dacă ziua NU e activă)
                                                            const cls = hasAnyCancelled ? "text-red-600 font-bold flex items-center justify-center" : "font-bold";
                                                            statusCell = <div className={cls}>{totalHoursDisplay}{hasAnyCancelled && <FontAwesomeIcon icon={faExclamationCircle} className="ml-2 text-2xl" />}</div>;
                                                        }
                                                    } else {
                                                        // Multi-day: arată suma orelor dacă > 0
                                                        statusCell = totalMinutes > 0
                                                            ? <div className="font-bold">{totalHoursDisplay}</div>
                                                            : <div>—</div>;
                                                    }

                                                    // build summary + allLocations for right panel
                                                    const summary = (() => {
                                                        if (!singleDay || !daySessions.length) return null;
                                                        const starts = daySessions.map((s) => (s.start_time ? new Date(s.start_time) : null)).filter(Boolean);
                                                        const ends = daySessions.map((s) => (s.end_time ? new Date(s.end_time) : null)).filter(Boolean);
                                                        const firstStart = starts.length ? starts.reduce((a, b) => (a < b ? a : b)) : null;
                                                        const lastEnd = (!anyOpen && ends.length) ? ends.reduce((a, b) => (a > b ? a : b)) : null;
                                                        const firstLoc = daySessions.find((s) => s.start_lat != null && s.start_lng != null);
                                                        const lastLoc = [...daySessions].reverse().find((s) => s.end_lat != null && s.end_lng != null);
                                                        return {
                                                            date: singleIso,
                                                            firstStart,
                                                            lastEnd,
                                                            startLat: firstLoc?.start_lat ?? null,
                                                            startLng: firstLoc?.start_lng ?? null,
                                                            endLat: lastLoc?.end_lat ?? null,
                                                            endLng: lastLoc?.end_lng ?? null,
                                                        };
                                                    })();

                                                    const allLocations = singleDay
                                                        ? daySessions.flatMap((s) => (s.locations || []).map((p) => ({ ...p, sesiune_id: s.id })))
                                                        : [];

                                                    return (
                                                        <tr
                                                            key={user.id}
                                                            onClick={() => {
                                                                if (selectMode) {
                                                                    toggleUser(user.id);
                                                                    return;
                                                                }
                                                                const sorted = [...daySessions].sort(
                                                                    (a, b) => new Date(a.start_time) - new Date(b.start_time)
                                                                );
                                                                setSelectedUser({
                                                                    ...user,
                                                                    selectedDate: singleIso,
                                                                    sessions: sorted,      // each session carries .locations from backend
                                                                    allLocations,          // flattened points for locations mode (summary)
                                                                    summary,               // used on index 0
                                                                });
                                                            }}
                                                            className={`border-t selectedRow border-gray-300 cursor-pointer transition-colors ${selectedUser?.id === user.id || selectedUserIds.has(user.id) ? "bg-blue-100" : "hover:bg-gray-50 "}`}
                                                        >
                                                            <td className="p-2">
                                                                <img
                                                                    src={photoApi + "/" + user.photo_url}
                                                                    alt="poza"
                                                                    className="w-12 h-12 rounded-full object-cover border border-gray-400 mx-auto"
                                                                />
                                                            </td>
                                                            <td className="p-2">{user.name}</td>
                                                            <td className="p-2">{firma ? <div className='p-2 rounded-full text-white' style={{ backgroundColor: firmaColor || "white" }}>{firma}</div> : "—"}</td>
                                                            <td className="p-2">
                                                                <div
                                                                    className={`p-2 rounded-full text-white ${user.role === "ofertant" ? "bg-[#2563EB]" : user.role === "angajat" ? "bg-[#16A34A]" : ""
                                                                        }`}
                                                                >
                                                                    {user.role[0].toUpperCase() + user.role.slice(1)}
                                                                </div>
                                                            </td>
                                                            <td className="p-2">{singleDay && activeSantier ? <div className='p-2 rounded-full text-black' style={{ backgroundColor: activeSantier ? activeSantier.santier_color : "" }}>{activeSantier.santier_name}</div> : "—"}</td>
                                                            <td className="p-2 font-semibold">{singleDay ? intrare : "—"}</td>
                                                            <td className={`p-2 font-semibold ${singleDay && !anyOpen && hasAnyCancelled ? "text-red-600" : ""}`}>
                                                                {singleDay ? iesire : "—"}
                                                            </td>
                                                            <td className="p-2 font-semibold">{totalMinutesPauza > 0 ? totalHoursPauzaDisplay : "—"}</td>
                                                            <td className="p-2 font-semibold">{statusCell}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        ) : data.length === 0 && !loading ? (
                                            <tbody>
                                                <tr>
                                                    <td colSpan="8" className="text-center py-4">
                                                        Nu există date disponibile pentru această selecție.
                                                    </td>
                                                </tr>
                                            </tbody>
                                        ) : null}
                                    </table>

                                    {loading && (
                                        <div className="absolute inset-0 bg-white/50 z-50 flex items-center justify-center">
                                            <div className="w-20 h-20 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : <PontajeSantierTable
                            data={data}                              // payload-ul existent (utilizatori + work_sessions)
                            loading={loading}
                            selectedIsoDates={selectedDates.map(d => format(d, "yyyy-MM-dd"))}
                            assignMeta={assignMeta}                  // { sites, assignments, users }
                            minutesByClock={minutesByClock}
                            fmtHHMM={fmtHHMM}
                            onSelectSite={setSelectedSite}
                            selectedSiteKey={selectedSite?.key ?? null}
                        />}
                </div>
            </div>
        </div >
    );
}