// src/components/Rezerve/MenuRezerve.jsx
import React, { useMemo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAddressCard, faLocationDot, faCalendar, faUser, faFilePdf, faFileExcel } from "@fortawesome/free-solid-svg-icons";
import RezerveExportPDF from "./RezerveExportPDF";
import RezerveExportExcel from "./RezerveExportExcel";
import { useLoading } from "../../../../context/LoadingContext";
import { useState } from "react";

const STATUS_LABELS = {
    new: "Nou",
    in_progress: "În lucru",
    done: "Finalizat",
    blocked: "Blocat",
    cancelled: "Anulat",
    checked: "Validat",
};
const STATUS_COLORS = {
    new: "#8B5CF6",
    in_progress: "#F59E0B",
    done: "#22C55E",
    blocked: "#E11D48",
    cancelled: "#6B7280",
    checked: "#3B82F6",
};

export default function MenuRezerve({
    open,
    onClose,
    pins = [],
    filters,
    onChangeFilters,
    onSelectPin,
    planId = null,
    exportVisibleStagePNG = null,
    onJumpToPin = null,
}) {

    const [limba, setLimba] = useState("RO");
    const { hide, show } = useLoading();

    // unique dropdown data
    const assignedOptions = useMemo(() => {
        const map = new Map();
        pins.forEach((p) => {
            if (p.assigned_user_id)
                map.set(String(p.assigned_user_id), p.assigned_user_name || `#${p.assigned_user_id}`);
        });
        return Array.from(map, ([id, name]) => ({ id, name }));
    }, [pins]);

    const creators = useMemo(() => {
        const s = new Set();
        pins.forEach((p) => { if (p.user_name) s.add(p.user_name); });
        return Array.from(s);
    }, [pins]);

    // same filter as canvas
    const filteredPins = useMemo(() => {
        const f = (pins || []).filter((p) => {
            if (filters.status && p.status !== filters.status) return false;
            if (filters.assignedId && String(p.assigned_user_id || "") !== String(filters.assignedId)) return false;

            if (filters.createdBy) {
                const needle = filters.createdBy.toLowerCase();
                if (!(p.user_name || "").toLowerCase().includes(needle)) return false;
            }

            if (filters.title) {
                const needle = filters.title.toLowerCase();
                if (!(p.title || "").toLowerCase().includes(needle) &&
                    !(p.code || "").toLowerCase().includes(needle)) return false;
            }

            if (filters.reper) {
                const hay = (p.landmark || p.reper || p.reference || "").toLowerCase();
                if (!hay.includes(filters.reper.toLowerCase())) return false;
            }

            // include items with no due_date automatically; only exclude if due exists and is after "until"
            if (filters.dueUntil) {
                const due = p.due_date ? new Date(p.due_date) : null;
                const until = new Date(filters.dueUntil + "T23:59:59");
                if (due && due > until) return false;
            }
            if (filters.lastUpdated) {
                if (!p.updated_at) return false;

                const updatedDate = new Date(p.updated_at);
                if (Number.isNaN(updatedDate.getTime())) return false;

                // normalize to YYYY-MM-DD
                const updatedStr = updatedDate.toISOString().slice(0, 10); // "2025-02-10"
                if (updatedStr !== filters.lastUpdated) return false;
            }
            // checkbox: show only the ones WITHOUT a due date
            if (filters.noUntil) {
                if (!p.due_date) return false;
            }

            return true;
        });
        f.sort(
            (a, b) =>
                (new Date(b.updated_at) - new Date(a.updated_at)) || (b.id - a.id)
        );
        return f;
    }, [pins, filters]);

    const set = (patch) => onChangeFilters((prev) => ({ ...prev, ...patch }));

    const handleExportPDF = async () => {
        show();
        try {
            await RezerveExportPDF({
                planId,
                pins: filteredPins,
                exportVisibleStagePNG,
                limba: limba,
            });
        } finally {
            hide();
        }
    };

    const handleExportExcel = async () => {
        show();
        try {
            await RezerveExportExcel({
                planId: planId,
                pins: filteredPins,
                planImageDataURLfunction: exportVisibleStagePNG,
                limba: limba,
            });
        } finally {
            hide();
        }
    };

    return (
        <div className="absolute inset-0 z-40 pointer-events-none overflow-hidden">
            {/* Backdrop */}
            <div
                className={[
                    "absolute inset-0 bg-black/30  transition-opacity duration-300",
                    open ? "opacity-100 pointer-events-auto" : "opacity-0",
                ].join(" ")}
                onClick={onClose}
                aria-hidden
            />

            {/* Drawer */}
            <div
                className={[
                    "absolute right-0 top-0 bottom-0 h-full",
                    "transition-transform duration-300 ease-out",
                    open ? "translate-x-0" : "translate-x-full",
                    "pointer-events-none",
                ].join(" ")}
                style={{ width: 650, maxWidth: "90vw" }}
            >
                <div
                    className={[
                        "h-full bg-white text-black p-4 pl-6 text-base overflow-y-auto flex flex-col",
                        "border-l border-slate-200",
                        open ? "pointer-events-auto shadow-2xl" : "pointer-events-none",
                    ].join(" ")}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-300">
                        <button
                            className="text-white bg-red-600 hover:bg-red-700 text-2xl rounded-xl w-10 h-10 grid place-items-center shadow-sm"
                            onClick={onClose}
                            aria-label="Închide"
                            title="Închide"
                        >
                            ✕
                        </button>

                        <div className="flex flex-col items-center gap-0.5">
                            <h3 className="text-xl font-semibold tracking-wide">Meniu Rezerve</h3>
                            <span className="text-xs uppercase tracking-[0.2em] text-slate-500">
                                gestionare pin-uri
                            </span>
                        </div>

                        {/* spacer */}
                        <div className="w-10" />
                    </div>

                    {/* Filters */}
                    <div className="mb-3">
                        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 shadow-sm p-4">
                            <div className="flex items-center justify-between mb-3 gap-2">
                                <div>
                                    <div className="text-lg font-semibold uppercase tracking-[0.18em] text-slate-500">
                                        Filtre
                                    </div>

                                </div>
                                <span className="px-3 py-1 rounded-full text-sm bg-slate-900 text-white font-semibold">
                                    {filteredPins.length} rezultate
                                </span>
                            </div>

                            {/* 2 per line on >=sm */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {/* Status */}
                                <div className="flex gap-3 items-end col-span-2 flex-nowrap">
                                    <label className="block min-w-52">
                                        <span className="text-base font-semibold text-slate-700">Status</span>
                                        <select
                                            className="mt-1 w-full border border-black rounded-lg px-3 py-2 text-base bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/60"
                                            value={filters.status}
                                            onChange={(e) => set({ status: e.target.value })}
                                        >
                                            <option value="">Toate</option>
                                            {Object.keys(STATUS_LABELS).map((k) => (
                                                <option key={k} value={k}>
                                                    {STATUS_LABELS[k]}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                    <label className="block ">
                                        <span className="text-base font-semibold text-slate-700">
                                            Ultima Actualizare
                                        </span>
                                        <input
                                            type="date"
                                            className="mt-1 w-full border border-black rounded-lg px-3 py-2 text-base bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/60"
                                            value={filters.lastUpdated}
                                            onChange={(e) => set({ lastUpdated: e.target.value })}
                                        />
                                    </label>
                                    <label className="block ">
                                        <span className="text-base font-semibold text-slate-700">
                                            Până la termen
                                        </span>
                                        <input
                                            type="date"
                                            className="mt-1 w-full border border-black rounded-lg px-3 py-2 text-base bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/60"
                                            value={filters.dueUntil}
                                            onChange={(e) => set({ dueUntil: e.target.value })}
                                        />
                                    </label>
                                    <label className="flex items-center gap-2 mb-1 select-none whitespace-nowrap text-base">
                                        <input
                                            type="checkbox"
                                            className="h-5 w-5 rounded border-slate-400"
                                            checked={!!filters.noUntil}
                                            onChange={(e) => set({ noUntil: e.target.checked })}
                                        />
                                    </label>
                                </div>

                                {/* Reper */}
                                <label className="block">
                                    <span className="text-base font-semibold text-slate-700">Reper</span>
                                    <input
                                        className="mt-1 w-full border border-black rounded-lg px-3 py-2 text-base bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/60"
                                        value={filters.reper}
                                        onChange={(e) => set({ reper: e.target.value })}
                                        placeholder="căutare text"
                                    />
                                </label>

                                {/* Atribuit */}
                                <label className="block">
                                    <span className="text-base font-semibold text-slate-700">Atribuit</span>
                                    <select
                                        className="mt-1 w-full border border-black rounded-lg px-3 py-2 text-base bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/60"
                                        value={filters.assignedId}
                                        onChange={(e) => set({ assignedId: e.target.value })}
                                    >
                                        <option value="">Toți</option>
                                        {assignedOptions.map((o) => (
                                            <option key={o.id} value={o.id}>
                                                {o.name}
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                {/* Titlu / Cod */}
                                <label className="block">
                                    <span className="text-base font-semibold text-slate-700">Titlu / Cod</span>
                                    <input
                                        className="mt-1 w-full border border-black rounded-lg px-3 py-2 text-base bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/60"
                                        value={filters.title}
                                        onChange={(e) => set({ title: e.target.value })}
                                        placeholder="căutare text"
                                    />
                                </label>

                                {/* Creat de */}
                                <label className="block">
                                    <span className="text-base font-semibold text-slate-700">Creat de</span>
                                    <select
                                        className="mt-1 w-full border border-black rounded-lg px-3 py-2 text-base bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/60"
                                        value={filters.createdBy}
                                        onChange={(e) => set({ createdBy: e.target.value })}
                                    >
                                        <option value="">Toți</option>
                                        {creators.map((k) => (
                                            <option key={k} value={k}>
                                                {k}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                            </div>

                            {/* Bottom filter actions */}
                            <div className="flex gap-2 justify-between pt-4 mt-2 border-t border-slate-200">
                                <button
                                    className="rounded-full bg-red-600 cursor-pointer hover:bg-red-700 text-white px-4 py-2 text-base font-semibold shadow-sm"
                                    onClick={() =>
                                        onChangeFilters({
                                            status: "",
                                            dueUntil: "",
                                            reper: "",
                                            assignedId: "",
                                            title: "",
                                            createdBy: "",
                                            noUntil: false,
                                        })
                                    }
                                >
                                    Resetează filtrele
                                </button>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setLimba(limba === "RO" ? "FR" : "RO")}
                                        className="rounded-full border border-green-500 h-10 w-10 flex items-center justify-center text-xs font-bold hover:bg-green-500 hover:text-white transition-colors"
                                    >
                                        {limba === "RO" ? "RO" : "FR"}
                                    </button>
                                    <button
                                        className="rounded-full bg-blue-600 cursor-pointer flex items-center gap-2 hover:bg-blue-700 text-white px-6 py-2 text-base font-semibold shadow-sm"
                                        onClick={handleExportExcel}
                                    >
                                        <FontAwesomeIcon className="text-base" icon={faFileExcel} /> Export Excel
                                    </button>
                                    <button
                                        className="rounded-full bg-blue-600 cursor-pointer flex items-center gap-2 hover:bg-blue-700 text-white px-6 py-2 text-base font-semibold shadow-sm"
                                        onClick={handleExportPDF}
                                    >
                                        <FontAwesomeIcon className="text-base" icon={faFilePdf} /> Export PDF
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* List */}
                    <div className="pt-2 flex-1 overflow-y-auto">
                        <div className="flex items-center justify-between mb-2">
                            <div className="font-semibold text-slate-800 text-base">
                                Pin-uri ({filteredPins.length})
                            </div>
                            {filteredPins.length > 0 && (
                                <span className="text-xs text-slate-500">
                                    Click pe un pin pentru detalii
                                </span>
                            )}
                        </div>

                        <div className="flex flex-col gap-2">
                            {filteredPins.map((p) => {
                                const dueText = p.due_date
                                    ? new Date(p.due_date).toLocaleDateString()
                                    : "Fără termen";
                                const reperText = p.landmark || p.reper || p.reference || "Fără reper";
                                const assignedName = p.assigned_user_name || "Neatribuit";

                                return (
                                    <button
                                        key={p.id}
                                        type="button"
                                        onClick={() => {
                                            if (onJumpToPin) onJumpToPin(p);  // 🔥 zoom & center on plan
                                            onSelectPin(p);                   // open viewer
                                        }}
                                        className={[
                                            "text-left border border-slate-300 rounded-xl p-4",
                                            "bg-white hover:bg-slate-50 hover:shadow-md transition-all",
                                            "focus:outline-none focus:ring-2 focus:ring-blue-500/50",
                                        ].join(" ")}
                                    >
                                        {/* Top row: title + status */}
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className="h-10 w-10 rounded-full text-white text-lg font-bold grid place-items-center"
                                                    style={{ backgroundColor: STATUS_COLORS[p.status] || "#3B82F6" }}
                                                >
                                                    {p.code ?? "—"}
                                                </div>
                                                <div className="flex flex-col">
                                                    <div className="text-xl font-extrabold text-slate-800">
                                                        {p.title || `Pin ${p.code ?? "—"}`}
                                                    </div>
                                                    <div className="text-base text-slate-600">
                                                        Creat de {p.user_name || "—"}
                                                    </div>
                                                </div>
                                            </div>

                                            <div
                                                className="px-4 py-1 rounded-full text-white font-bold text-base shadow-sm whitespace-nowrap"
                                                style={{
                                                    backgroundColor: STATUS_COLORS[p.status] || "#3B82F6",
                                                }}
                                            >
                                                {STATUS_LABELS[p.status] || p.status}
                                            </div>
                                        </div>

                                        {/* Description */}
                                        <div className="mt-2 text-base text-gray-600">
                                            {p.description || "Fără descriere"}
                                        </div>

                                        {/* Pills */}
                                        <div className="mt-4 flex flex-col gap-2">
                                            {/* Creat de */}
                                            <div className="inline-flex items-center gap-2">
                                                <span className="text-gray-900 px-4 py-1.5 rounded-full bg-gray-100 border border-gray-200 font-medium text-base">
                                                    <FontAwesomeIcon
                                                        icon={faAddressCard}
                                                        className="mr-2 text-slate-500"
                                                    />
                                                    {`Creat de ${p.user_name || "—"}`}
                                                </span>
                                            </div>

                                            {/* Reper, Termen, Atribuit */}
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="text-gray-900 px-4 py-1.5 rounded-full bg-gray-100 border border-gray-200 font-medium text-base">
                                                    <FontAwesomeIcon
                                                        icon={faLocationDot}
                                                        className="mr-2 text-slate-500"
                                                    />
                                                    {reperText}
                                                </span>
                                                <span className="text-gray-900 px-4 py-1.5 rounded-full bg-gray-100 border border-gray-200 font-medium text-base">
                                                    <FontAwesomeIcon
                                                        icon={faCalendar}
                                                        className="mr-2 text-slate-500"
                                                    />
                                                    {dueText}
                                                </span>
                                                <span className="text-gray-900 px-4 py-1.5 rounded-full bg-gray-100 border border-gray-200 font-medium text-base">
                                                    <FontAwesomeIcon
                                                        icon={faUser}
                                                        className="mr-2 text-slate-500"
                                                    />
                                                    {assignedName}
                                                </span>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}

                            {filteredPins.length === 0 && (
                                <div className="text-gray-500 text-base italic">
                                    Nimic de afișat cu filtrele curente.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}