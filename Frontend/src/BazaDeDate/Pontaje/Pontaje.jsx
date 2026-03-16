import React, { useEffect, useState, useContext, useMemo, useCallback } from 'react';
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
import ExportPontaje from './Export/ExportPontaje';
import ExportPontajeExcel from './Export/ExportPontajeExcel';
import PontajeSantierLeftPanel from './PontajeSantierLeftPanel';
import PontajeSantierTable from './PontajeSantierTable';
import { PontajeCalendar } from './PontajCalendar';
import SpinnerElement from '@/MainElements/SpinnerElement';
import { usePontaje } from '@/hooks/usePontaje';
import { useLoading } from '@/context/LoadingContext';
import PontajeList from './PontajeList';

const EMPTY_ARR = [];

function normalizeText(str) {
    return (str || "")
        .toLowerCase()
        .normalize("NFD")              // decompose characters
        .replace(/[\u0300-\u036f]/g, ""); // remove diacritics
}

const RO_TZ = "Europe/Bucharest";

// formatări în ora RO (fără să schimbi Date-ul)
const fmtTimeRO = (d) => new Intl.DateTimeFormat("ro-RO", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: RO_TZ }).format(d);


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


export default function Pontaje() {
    // Loading pentru fetch
    const { show, hide, loading } = useLoading();
    // datele afișate în tabel (filtrate după calendar)
    const [selectedDates, setSelectedDates] = useState([new Date()]);

    const [showOreRapoarte, setShowOreRapoarte] = useState(false);
    const [selectedUsersTable, setSelectedUsersTable] = useState(true);


    const { data: pontaje, isFetching } = usePontaje(selectedDates);
    const data = pontaje || EMPTY_ARR;


    const [selectedUser, setSelectedUser] = useState(null);

    const [sessionIdx, setSessionIdx] = useState(0);

    const [showLocations, setShowLocations] = useState(false);
    const [locIdx, setLocIdx] = useState(0);

    /// ------------------ Handlers pentru calendar -----------------
    // Seteaza zilele din calendar si reseteaza userul
    const handleCalendarSetDates = useCallback((dates) => {
        setSelectedUser(null);
        setSelectedDates(dates);
    }, []);

    // Reseteaza calendarul si userul
    const handleCalendarReset = useCallback(() => {
        setSelectedUser(null);
        setSelectedDates([new Date()]);
    }, []);

    const selectedIsoDates = useMemo(
        () => selectedDates.map(d => format(d, "yyyy-MM-dd")),
        [selectedDates]
    );
    const singleDay = selectedIsoDates.length === 1;



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

        // păstrezi TOATE filtrele existente (nume, rol, firma_id)
        const base = (data || [])

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
    }, [data, selectedIsoDates, singleDay]);

    // (opțional) dacă userul selectat iese din filtrare, îl deselectezi
    useEffect(() => {
        if (selectedUser && !filteredData.some(u => u.id === selectedUser.id)) {
            setSelectedUser(null);
        }
    }, [filteredData, selectedUser, setSelectedUser]);





    return (
        <div className="h-screen w-full flex overflow-hidden  items-center justify-center">
            <div className="w-[95%] xxl:h-[95%] h-90h overflow-hidden relative bg-background grid p-6 grid-cols-[1fr_3fr] rounded-lg gap-6">
                {/* Left column: calendar + right-panel maps */}
                <div className="flex flex-col gap-6 overflow-hidden h-full rounded-lg">
                    <PontajeCalendar
                        selectedDates={selectedDates}
                        setSelectedDates={handleCalendarSetDates}
                        onReset={handleCalendarReset}
                    />

                    {/* Right panel: maps + summary/sessions/locations */}
                    <div className="flex flex-1 bg-white h-full overflow-hidden relative selectedRow text-black rounded-lg shadow-md p-4">
                        {selectedUser && selectedDates.length === 1 ? (() => {
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
                                                className="px-3 py-1  rounded-lg border disabled:opacity-50"
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
                        })() : null}
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
                                            {/* de refacut cu tabs */}
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
                    </div>
                    <div className="h-full flex flex-col overflow-hidden  bg-white shadow-md rounded-lg gap-4 p-6">
                        {/* filters */}
                        <div className="flex w-full items-center justify-between h-20">
                            <div className='flex h-20 items-center'>
                                <div className="flex h-full items-center pl-2 gap-2 ">
                                    <FontAwesomeIcon icon={faFilter} className="text-blue-500 text-2xl" />
                                    <h2 className="text-black text-xl font-semibold">Filtre</h2>
                                    <div className="h-full w-1 rounded-full mx-2 bg-black" />
                                </div>


                            </div>

                        </div>

                        {/* table */}
                        <div className="relative w-full overflow-auto rounded-xl shadow-md h-full flex flex-col">
                            <PontajeList
                                filteredData={filteredData}
                                selectedDates={selectedDates}
                                selectedUser={selectedUser}
                                selectedUserIds={selectedUserIds}
                                isFetching={isFetching}
                                loading={loading}
                                toggleUser={toggleUser}
                                onSelectUser={setSelectedUser}
                                minutesByClock={minutesByClock}
                                fmtHHMM={fmtHHMM}
                            />
                        </div>
                    </div>
                </div>
                {isFetching && !loading && (
                    <SpinnerElement text={2} />
                )}
            </div>
        </div >
    );
}