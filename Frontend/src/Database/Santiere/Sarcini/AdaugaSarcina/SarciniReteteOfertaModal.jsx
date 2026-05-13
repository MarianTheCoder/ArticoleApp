import {
    faChevronDown,
    faX,
    faUser,
    faTrowelBricks,
    faTruck,
    faCar,
    faFolder,
    faCheck,
    faRotate,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { useEffect, useRef, useState } from "react";
import api from "../../../../api/axiosAPI";
import { useParams } from "react-router-dom";
import { useVirtualizer } from "@tanstack/react-virtual";
import { OverflowPopover } from "../../OverflowPopover";
import photoAPI from "../../../../api/photoAPI";

export default function SarciniReteteOfertaModal({
    setReteteOfertaModal,
    selectedRetete = [],
    onSelectionChange = () => { },
    // CONTROLLED by parent:
    ofertaId,
    setOfertaId,
    ofertaPartId,
    setOfertaPartId,
}) {
    const { idSantier } = useParams();

    const [viewMode, setViewMode] = useState("browse"); // "browse" | "selected"
    // ↓ add near other state
    const [selectedOpenDropdowns, setSelectedOpenDropdowns] = useState(() => new Set());
    const [selectedChildren, setSelectedChildren] = useState({}); // { [parentId]: ChildRow[] }

    const [selectedLimba, setSelectedLimba] = useState("RO");
    const [selectedLimbaMain, setSelectedLimbaMain] = useState("RO");

    const [oferte, setOferte] = useState([]);
    const [oferteParts, setOferteParts] = useState([]);
    const [retete, setRetete] = useState([]);

    const [reper1, setReper1] = useState("");
    const [reper2, setReper2] = useState("");

    const [openDropdowns, setOpenDropdowns] = useState(() => new Set());
    const [allocationInputs, setAllocationInputs] = useState({});
    const [selectedIds, setSelectedIds] = useState(() => new Set());

    const [estimatedTime, setEstimatedTime] = useState(null);
    const [estimatedCost, setEstimatedCost] = useState(null);

    const parentRef = useRef(null);

    // fetchers
    const fetchOferteForThisSantier = async () => {
        try {
            const res = await api.get(`/Santiere/getOferteForThisSantier/${idSantier}`);
            setOferte(res.data.offers);
        } catch (error) {
            console.log(error);
        }
    };
    const fetchOfertePartsForThisSantier = async () => {
        try {
            if (!ofertaId) { setOferteParts([]); return; }
            const res = await api.get(`/Santiere/getOfertePartsForThisSantier/${ofertaId}`);
            const sorted = (res.data.parts ?? [])
                .slice()
                .sort((a, b) => a.name.localeCompare(b.name, "ro", { sensitivity: "base" }));
            setOferteParts(sorted);
        } catch (error) {
            console.log(error);
        }
    };
    const fetchReteteFromLucrare = async () => {
        try {
            if (!ofertaPartId) { setRetete([]); return; }
            const res = await api.get(`/Sarcini/getFromLucrare/${ofertaPartId}`);
            console.log("Fetched retete:", res.data);
            setRetete(res.data?.data || []);
            setReper1(res.data?.reper?.reper1 || "Reper 1");
            setReper2(res.data?.reper?.reper2 || "Reper 2");
            setOpenDropdowns(new Set());

            // seed from parent (persist across opens)
            const idsFromParent = new Set((selectedRetete || []).map((s) => s.id));
            setSelectedIds(idsFromParent);

            const nextInputs = {};
            for (const s of selectedRetete) {
                if (s && s.id != null && typeof s.alloc_input === "string") {
                    nextInputs[s.id] = s.alloc_input;
                }
            }
            setAllocationInputs(nextInputs);
            emitSelection(idsFromParent, res.data?.data || [], nextInputs);
        } catch (error) {
            console.log(error);
        }
    };

    useEffect(() => { fetchOferteForThisSantier(); }, []);
    useEffect(() => { fetchOfertePartsForThisSantier(); }, [ofertaId]);
    useEffect(() => { fetchReteteFromLucrare(); }, [ofertaPartId]);

    // mirror parent updates
    useEffect(() => {
        const nextIds = new Set(selectedRetete.map((s) => s.id));
        setSelectedIds(nextIds);
        const nextInputs = {};
        for (const s of selectedRetete) {
            if (s && s.id != null && typeof s.alloc_input === "string") {
                nextInputs[s.id] = s.alloc_input;
            }
        }
        setAllocationInputs((prev) => ({ ...prev, ...nextInputs }));
    }, [selectedRetete]);

    // virtualizer
    const ROW_H = 55;
    const rowVirtualizer = useVirtualizer({
        count: retete.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => ROW_H,
        overscan: 10,
    });
    const virtualItems = rowVirtualizer.getVirtualItems();

    // helpers
    const fmtQty = (v) => {
        const n = Number(v);
        return Number.isFinite(n) ? n.toFixed(3) : "";
    };
    const fmtMoney = (v) => {
        const n = Number(v);
        return Number.isFinite(n) ? n.toFixed(2) : "";
    };

    const TipIcon = ({ what }) => {
        if (what === "Manopera") return <FontAwesomeIcon icon={faUser} className="text-green-600" />;
        if (what === "Material") return <FontAwesomeIcon icon={faTrowelBricks} className="text-amber-600" />;
        if (what === "Utilaj") return <FontAwesomeIcon icon={faTruck} className="text-violet-600" />;
        if (what === "Transport") return <FontAwesomeIcon icon={faCar} className="text-pink-600" />;
        return <FontAwesomeIcon icon={faFolder} className="text-blue-600" />;
    };

    const TipText = ({ what }) => {
        if (what === "Manopera") return <td className="bg-green-600 text-center border border-gray-400 px-2 text-white">Manoperă</td>;
        if (what === "Material") return <td className="bg-amber-600 text-center border border-gray-400 px-2 text-white">Material</td>;
        if (what === "Utilaj") return <td className="bg-violet-600 text-center border border-gray-400 px-2 text-white">Utilaj</td>;
        if (what === "Transport") return <td className="bg-pink-600 text-center border border-gray-400 px-2 text-white">Transport</td>;
        return <td className="bg-blue-600 text-center border border-gray-400 px-2 text-white">Rețetă</td>;
    };

    // expand/collapse
    const toggleChildren = async (parentId) => {
        const isOpen = openDropdowns.has(parentId);
        if (isOpen) {
            setRetete((prev) => {
                const updated = prev.filter((item) => item.parentId != parentId);
                emitSelection(selectedIds, updated, allocationInputs);
                return updated;
            });
            setOpenDropdowns((prev) => {
                const s = new Set(prev); s.delete(parentId); return s;
            });
            return;
        }
        try {
            const response = await api.get(`/Santiere/getSpecificRetetaForOfertaInitiala/${parentId}`);
            const children = [
                ...(response.data?.manopera || []).map((x) => ({ ...x, parentId, whatIs: x.whatIs || "Manopera" })),
                ...(response.data?.materiale || []).map((x) => ({ ...x, parentId, whatIs: x.whatIs || "Material" })),
                ...(response.data?.utilaje || []).map((x) => ({ ...x, parentId, whatIs: x.whatIs || "Utilaj" })),
                ...(response.data?.transport || []).map((x) => ({ ...x, parentId, whatIs: x.whatIs || "Transport" })),
            ];
            setRetete((prev) => {
                const idx = prev.findIndex((it) => it.id === parentId && !it.parentId);
                if (idx === -1) return prev;
                const next = [...prev];
                next.splice(idx + 1, 0, ...children);
                emitSelection(selectedIds, next, allocationInputs);
                return next;
            });
            setOpenDropdowns((prev) => {
                const s = new Set(prev); s.add(parentId); return s;
            });
        } catch (err) {
            console.error("Error fetching preview:", err);
        }
    };

    // ↓ add next to toggleChildren()
    const toggleSelectedChildren = async (parentId) => {
        const isOpen = selectedOpenDropdowns.has(parentId);
        if (isOpen) {
            setSelectedOpenDropdowns((prev) => {
                const s = new Set(prev); s.delete(parentId); return s;
            });
            return;
        }
        try {
            // fetch once per parent; then cache
            if (!selectedChildren[parentId]) {
                const response = await api.get(`/Santiere/getSpecificRetetaForOfertaInitiala/${parentId}`);
                const children = [
                    ...(response.data?.manopera || []).map((x) => ({ ...x, parentId, whatIs: x.whatIs || "Manopera" })),
                    ...(response.data?.materiale || []).map((x) => ({ ...x, parentId, whatIs: x.whatIs || "Material" })),
                    ...(response.data?.utilaje || []).map((x) => ({ ...x, parentId, whatIs: x.whatIs || "Utilaj" })),
                    ...(response.data?.transport || []).map((x) => ({ ...x, parentId, whatIs: x.whatIs || "Transport" })),
                ];
                setSelectedChildren((prev) => ({ ...prev, [parentId]: children }));
            }
            setSelectedOpenDropdowns((prev) => {
                const s = new Set(prev); s.add(parentId); return s;
            });
        } catch (err) {
            console.error("Error fetching selected children:", err);
        }
    };

    // selection emit
    const emitSelection = (idsSet, rows, allocInputs) => {
        const byId = new Map(rows.filter((r) => !r.parentId).map((r) => [r.id, r]));
        const bySelected = new Map((selectedRetete || []).map((r) => [r.id, r])); // fallback

        const { ofertaName, ofertaPartName } = getOfertaNames(ofertaId, ofertaPartId);

        const payload = [...idsSet]
            .map((id) => {
                const baseRow = byId.get(id) || bySelected.get(id);
                if (!baseRow) return null;

                // preserve previously stored origin if exists
                const prev = bySelected.get(id) || {};
                return {
                    ...baseRow,
                    alloc_input: allocInputs?.[id] ?? prev.alloc_input ?? "",
                    // origin stamp (kept across changes)
                    __ofertaId: prev.__ofertaId ?? ofertaId ?? "",
                    __ofertaName: prev.__ofertaName ?? ofertaName ?? "",
                    __ofertaPartId: prev.__ofertaPartId ?? ofertaPartId ?? "",
                    __ofertaPartName: prev.__ofertaPartName ?? ofertaPartName ?? "",
                    __reper1: prev.__reper1 || reper1 || "Reper 1",
                    __reper2: prev.__reper2 || reper2 || "Reper 2",
                };
            })
            .filter(Boolean);

        onSelectionChange(payload);
    };

    // select/deselect with ✔ / X
    const toggleConfirmSelection = (row) => {
        if (row.parentId) return;
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(row.id)) {
                // Deselect -> clear input so bar reverts to green-only immediately
                next.delete(row.id);
                setAllocationInputs((prevInp) => {
                    const ni = { ...prevInp };
                    delete ni[row.id];
                    emitSelection(next, retete, ni);
                    return ni;
                });
            } else {
                const val = Number(allocationInputs[row.id]);
                if (!Number.isFinite(val) || val <= 0) return prev;
                next.add(row.id);
                emitSelection(next, retete, allocationInputs);
            }
            return next;
        });
    };

    // input handling (text-only numbers, max 3 decimals) + live emit if selected
    const setAllocInput = (id, value) => {
        let v = (value || "")
            .replace(/,/g, ".")
            .replace(/[^\d.]/g, "");
        const parts = v.split(".");
        if (parts.length > 2) v = parts[0] + "." + parts.slice(1).join("");
        if (parts[1]?.length > 3) v = parts[0] + "." + parts[1].slice(0, 3);

        setAllocationInputs((prev) => {
            const next = { ...prev, [id]: v };
            // Live update to parent if already selected
            if (selectedIds.has(id)) emitSelection(selectedIds, retete, next);
            return next;
        });
    };

    const fillTot = (row) => {
        if (row.parentId) return;
        const qty = Number(row.cantitate || 0);
        const allocated = Number(row.allocated_total || 0);
        const remaining = Math.max(0, qty - allocated);
        const v = remaining > 0 ? remaining.toFixed(3) : "0.000";
        // allow only when not selected (input is read-only if selected)
        if (!selectedIds.has(row.id)) setAllocInput(row.id, v);
    };

    const calculateEstimatedTime = () => {
        if (!selectedRetete || selectedRetete.length === 0) {
            setEstimatedTime("00:00");
            return;
        }

        let totalHours = 0;
        selectedRetete.forEach((sel) => {
            totalHours += Number(sel.manopera_qty || 0) * Number(sel.alloc_input || 0);
        });

        if (totalHours <= 0) {
            setEstimatedTime("00:00");
            return;
        }

        const hours = Math.floor(totalHours);
        const minutes = Math.round((totalHours - hours) * 60);

        // pad with leading zeros for HH:MM
        const hh = String(hours).padStart(2, "0");
        const mm = String(minutes).padStart(2, "0");

        setEstimatedTime(`${hh}:${mm}`);
    };

    const calculateEstimatedCost = () => {
        if (!selectedRetete || selectedRetete.length === 0) {
            setEstimatedCost("0.00");
            return;
        }
        let totalCost = 0;
        selectedRetete.forEach((sel) => {
            const qty = Number(sel.alloc_input || 0);
            const costPerUnit = Number(sel.cost || 0);
            totalCost += qty * costPerUnit;
        });

        setEstimatedCost(totalCost.toFixed(2));
    }

    useEffect(() => {
        calculateEstimatedTime();
        calculateEstimatedCost();
    }, [selectedRetete]);

    // helper: get oferta / lucrare names (fallback to ids if unknown)
    const getOfertaNames = (ofId, ofPartId) => {
        const of = oferte.find((o) => String(o.id) === String(ofId));
        // note: oferteParts is only for the CURRENT oferta; for older selections we keep the name we stored
        const part = oferteParts.find((p) => String(p.id) === String(ofPartId));
        return {
            ofertaName: of?.name ?? "",
            ofertaPartName: part?.name ?? "",
        };
    };

    const removeSelected = (id) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            next.delete(id);
            const nextInputs = { ...allocationInputs };
            delete nextInputs[id];
            emitSelection(next, retete, nextInputs);
            setAllocationInputs(nextInputs);
            return next;
        });
    };

    return (
        <div className="w-[95%] h-[88%] containerAdauga text-base flex flex-col bg-white rounded-xl">
            {/* header */}
            <div className="flex items-center justify-between p-3 border-b border-gray-400">
                <div className="flex items-center gap-2 min-w-0">
                    <h2 className="font-semibold whitespace-nowrap">Adaugă Rețetă din Ofertă</h2>
                    <div className="h-8 w-[2px] bg-gray-400" />
                    <h2 className="font-medium pl-4 whitespace-nowrap">Oferta:</h2>
                    <select
                        value={ofertaId}
                        onChange={(e) => {
                            setOfertaId(e.target.value);     // parent state
                            setOfertaPartId("");             // reset part in parent
                            setRetete([]);
                            setOpenDropdowns(new Set());
                        }}
                        className="border border-gray-400 rounded-lg p-2"
                    >
                        <option value="">Selectează o ofertă</option>
                        {oferte.map((oferta) => (
                            <option key={oferta.id} value={oferta.id}>
                                {oferta.name}
                            </option>
                        ))}
                    </select>
                    <h2 className="font-medium pl-4 whitespace-nowrap">Lucrare:</h2>
                    <select
                        value={ofertaPartId}
                        onChange={(e) => setOfertaPartId(e.target.value)}
                        className="border border-gray-400 rounded-lg p-2"
                    >
                        <option value="">Selectează o lucrare</option>
                        {oferteParts.map((part) => (
                            <option key={part.id} value={part.id}>
                                {part.name}
                            </option>
                        ))}
                    </select>

                    <button
                        onClick={() => setViewMode((m) => (m === "browse" ? "selected" : "browse"))}
                        className={`ml-3 px-3 py-2 rounded-lg text-white font-medium ${viewMode === "selected" ? "bg-blue-600" : "bg-slate-600"
                            }`}
                        title="Arată rețetele selectate"
                    >
                        Selectate ({selectedRetete.length})
                    </button>
                </div>
                <button
                    onClick={() => setReteteOfertaModal(false)}
                    className="rounded-lg p-2 bg-red-500 text-white hover:bg-red-600"
                >
                    <FontAwesomeIcon icon={faX} />
                </button>
            </div>

            {/* table */}
            {!ofertaPartId ? (
                <div className="flex-1 flex items-center justify-center text-lg text-gray-500 italic">
                    Selectează o lucrare pentru a vedea rețetele disponibile.
                </div>
            ) : retete.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-lg text-gray-500 italic">
                    Nicio rețetă găsită pentru această lucrare.
                </div>
            ) : (
                <>
                    {/* TABLE AREA */}
                    {viewMode === "selected" ? (
                        // ---------- SELECTED VIEW ----------
                        <div className="flex-1 p-4 overflow-hidden">
                            {selectedRetete.length === 0 ? (
                                <div className="w-full h-full flex items-center justify-center text-gray-500 italic">
                                    Nicio rețetă selectată.
                                </div>
                            ) : (
                                <div className="h-full overflow-y-auto space-y-8">
                                    {/* group by ofertaPartId (origin) */}
                                    {Object.entries(
                                        selectedRetete.reduce((acc, r) => {
                                            const key = String(r.__ofertaId || "") + "::" + String(r.__ofertaPartId || "");
                                            if (!acc[key]) acc[key] = { header: r, items: [] };
                                            acc[key].items.push(r);
                                            return acc;
                                        }, {})
                                    ).map(([key, grp]) => {
                                        const h = grp.header || {};
                                        // prefer stored names, fallback to current lists if available
                                        const ofName = h.__ofertaName || getOfertaNames(h.__ofertaId, h.__ofertaPartId).ofertaName || `(Ofertă ${h.__ofertaId || "-"})`;
                                        const partName = h.__ofertaPartName || getOfertaNames(h.__ofertaId, h.__ofertaPartId).ofertaPartName || `(Lucrare ${h.__ofertaPartId || "-"})`;
                                        const reper1Name = h.__reper1 || "Reper 1";
                                        const reper2Name = h.__reper2 || "Reper 2";
                                        return (
                                            <div key={key} className="w-full">
                                                {/* group header with oferta/lucrare */}
                                                <div className="mb-2 flex items-center gap-3">
                                                    <div className="text-sm px-3 py-1 rounded-full bg-slate-200 text-slate-800">
                                                        <span className="font-semibold">Ofertă:</span> {ofName} <span className="opacity-60">#{h.__ofertaId}</span>
                                                    </div>
                                                    <div className="text-sm px-3 py-1 rounded-full bg-slate-200 text-slate-800">
                                                        <span className="font-semibold">Lucrare:</span> {partName} <span className="opacity-60">#{h.__ofertaPartId}</span>
                                                    </div>
                                                </div>

                                                {/* full-info table (no Alocat/Alocare) */}
                                                <table className="w-full table-fixed text-sm">
                                                    <thead className="sticky top-0 bg-gray-300 text-black z-10">
                                                        <tr className="h-14">
                                                            <th className="border border-gray-400 p-2 text-center w-[2.5rem]" /> {/* chevron */}
                                                            <th className="border border-gray-400 p-2 text-center w-[3rem]">Logo</th>
                                                            <th className="border border-gray-400 p-2 text-center w-[8%]">{reper1Name}</th>
                                                            <th className="border border-gray-400 p-2 text-center w-[8%]">{reper2Name}</th>
                                                            <th className="border border-gray-400 p-2 text-center w-[10%]">Furnizor</th>
                                                            <th className="border border-gray-400 p-2 text-center w-[120px]">Cod</th>
                                                            <th className="border border-gray-400 p-2 text-center w-[10%]">Articol Client</th>
                                                            <th className="border border-gray-400 p-2 text-center w-[15%]">
                                                                <div className="flex justify-between items-center">Articol
                                                                    <span onClick={() => setSelectedLimba((prev) => prev === 'RO' ? 'FR' : 'RO')} className="mr-4 h-9 w-9 font-semibold  flex items-center justify-center select-none cursor-pointer rounded-full text-green-600 border-green-600 hover:border-green-700 hover:text-green-700 border">{selectedLimba}</span>
                                                                </div>
                                                            </th>
                                                            <th className="border border-gray-400 p-2 text-center w-[15%]">Descriere</th>
                                                            <th className="border border-gray-400 p-2 text-center w-[12ch]">Tip</th>
                                                            <th className="border border-gray-400 p-2 text-center w-[7ch]">U.M.</th>
                                                            <th className="border border-gray-400 p-2 text-center w-[6rem] hidden lg:table-cell">Poză</th>
                                                            <th className="border border-gray-400 p-2 text-center w-[10ch]">Alocat</th>
                                                            <th className="border border-gray-400 p-2 text-center w-[10ch]">Preț unitar</th>
                                                            <th className="border border-gray-400 p-2 text-center w-[10ch]">Total</th>
                                                            <th className="border border-gray-400 p-2 text-center w-[4rem]">Șterge</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {grp.items.map((r) => {
                                                            const qtyAlloc = Number(r.alloc_input || 0);
                                                            const cost = Number(r.cost || 0);
                                                            const totalAlloc = qtyAlloc * cost;
                                                            const isOpen = selectedOpenDropdowns.has(r.id);
                                                            const kids = selectedChildren[r.id] || [];

                                                            return (
                                                                <React.Fragment key={`sel-${r.id}`}>
                                                                    {/* PARENT = Rețetă */}
                                                                    <tr className="bg-gray-100 hover:bg-gray-200" style={{ height: ROW_H }}>
                                                                        {/* chevron */}
                                                                        <td
                                                                            onClick={() => toggleSelectedChildren(r.id)}
                                                                            className="border border-gray-400 text-center hover:cursor-pointer"
                                                                            title={isOpen ? "Închide" : "Deschide"}
                                                                        >
                                                                            <FontAwesomeIcon
                                                                                icon={faChevronDown}
                                                                                className={`transition-transform text-lg ${isOpen ? "rotate-180" : ""}`}
                                                                            />
                                                                        </td>

                                                                        <td className="border border-gray-400 text-lg p-2 text-center">
                                                                            <TipIcon what={undefined /* parent shows folder/retetă icon */} />
                                                                        </td>
                                                                        <td className="border border-gray-400 p-2"><div className="truncate" title={r?.detalii_aditionale || ""}>{r?.detalii_aditionale || ""}</div></td>
                                                                        <td className="border border-gray-400 p-2"><div className="truncate" title={r?.reper_plan || ""}>{r?.reper_plan || ""}</div></td>
                                                                        <td className="border border-gray-400 p-2"><div className="truncate" title={r?.furnizor || ""}>{r?.furnizor || ""}</div></td>
                                                                        <td className="border border-gray-400 p-2"><div className="truncate" title={r?.cod || ""}>{r?.cod || ""}</div></td>
                                                                        <td className="border relative border-gray-400 p-2"><OverflowPopover text={r?.articol_client || ""} /></td>
                                                                        <td className="border relative border-gray-400 p-2"><OverflowPopover text={selectedLimba == "RO" ? r?.articol || "" : r?.articol_fr || ""} /></td>
                                                                        <td className="border relative border-gray-400 p-2"><OverflowPopover text={selectedLimba == "RO" ? r?.descriere || "" : r?.descriere_fr || ""} /></td>

                                                                        {/* Tip = Rețetă */}
                                                                        {TipText({ what: undefined })}

                                                                        <td className="border border-gray-400 p-2 text-center">{r?.unitate_masura || ""}</td>
                                                                        <td className="border border-gray-400 p-2 text-center hidden lg:table-cell">
                                                                            <div className="flex items-center justify-center">
                                                                                {r?.photo ? <img src={photoAPI + "/" + r.photo} alt="" className="h-8 w-12 object-fit rounded" /> : ""}
                                                                            </div>
                                                                        </td>
                                                                        <td className="border border-gray-400 p-2 text-right font-semibold">{fmtQty(qtyAlloc)}</td>
                                                                        <td className="border border-gray-400 p-2 text-right font-semibold">{fmtMoney(cost)}</td>
                                                                        <td className="border border-gray-400 p-2 text-right font-semibold">{fmtMoney(totalAlloc)}</td>
                                                                        <td className="border border-gray-400 p-2 text-center">
                                                                            <button
                                                                                onClick={() => removeSelected(r.id)}
                                                                                className="px-2 py-1 rounded text-white bg-rose-500 hover:bg-rose-600"
                                                                                title="Elimină rețeta din selecție"
                                                                            >
                                                                                <FontAwesomeIcon icon={faX} />
                                                                            </button>
                                                                        </td>
                                                                    </tr>

                                                                    {/* CHILDREN */}
                                                                    {isOpen && kids.map((c) => {
                                                                        const cq = Number(c?.cantitate ?? 0);
                                                                        const cc = Number(c?.cost ?? 0);
                                                                        const ctot = cq * cc * qtyAlloc;
                                                                        return (
                                                                            <tr key={`sel-child-${r.id}-${c.id || c.def_id}`} className="bg-white">
                                                                                {/* spacer under chevron col */}
                                                                                <td
                                                                                    className="text-center"
                                                                                    style={{ border: "1px solid", borderColor: "#d1d5db", borderLeft: "none", borderTop: "none", borderBottom: "none" }}
                                                                                />
                                                                                <td className="border border-gray-400 text-lg p-2 text-center">
                                                                                    <TipIcon what={c?.whatIs} />
                                                                                </td>
                                                                                <td className="border border-gray-400 p-2" />
                                                                                <td className="border border-gray-400 p-2" />
                                                                                <td className="border border-gray-400 p-2"><div className="truncate" title={c?.furnizor || ""}>{c?.furnizor || ""}</div></td>
                                                                                <td className="border border-gray-400 p-2"><div className="truncate" title={c?.cod || ""}>{c?.cod || ""}</div></td>
                                                                                <td className="border border-gray-400 p-2" />
                                                                                <td className="border relative border-gray-400 p-2"><OverflowPopover text={selectedLimba == "RO" ? c?.articol || "" : c?.articol_fr || ""} /></td>
                                                                                <td className="border relative border-gray-400 p-2"><OverflowPopover text={selectedLimba == "RO" ? c?.descriere || "" : c?.descriere_fr || ""} /></td>

                                                                                {TipText({ what: c?.whatIs })}

                                                                                <td className="border border-gray-400 p-2 text-center">{c?.unitate_masura || ""}</td>
                                                                                <td className="border border-gray-400 p-2 text-center hidden lg:table-cell">
                                                                                    <div className="flex items-center justify-center">
                                                                                        {c?.photo ? <img src={photoAPI + "/" + c.photo} alt="" className="h-8 w-12 object-fit rounded" /> : ""}
                                                                                    </div>
                                                                                </td>
                                                                                <td className="border border-gray-400 p-2 text-right font-semibold">{fmtQty(cq)}</td>
                                                                                <td className="border border-gray-400 p-2 text-right font-semibold">{fmtMoney(cc)}</td>
                                                                                <td className="border border-gray-400 p-2 text-right font-semibold">{fmtMoney(ctot)}</td>
                                                                                <td className="border border-gray-400 p-2 text-center" />
                                                                            </tr>
                                                                        );
                                                                    })}
                                                                </React.Fragment>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex-1 p-4 overflow-hidden">
                            <div ref={parentRef} className="h-full overflow-y-auto overflow-x-hidden min-w-0">
                                <table className="w-full table-fixed text-sm">
                                    <thead className="sticky top-0 bg-gray-300 text-black z-10">
                                        <tr className="h-16">
                                            <th className="border border-gray-400 p-2 text-center w-[2.5rem]" />
                                            <th className="border border-gray-400 p-2 text-center w-[3rem] whitespace-nowrap">Logo</th>
                                            <th className="border border-gray-400 p-2 text-center w-[5%]"><div className="truncate">{reper1 || "Reper 1"}</div></th>
                                            <th className="border border-gray-400 p-2 text-center w-[5%]"><div className="truncate">{reper2 || "Reper 2"}</div></th>
                                            <th className="border border-gray-400 p-2 text-center w-[5%] hidden xl:table-cell"><div className="truncate">Furnizor</div></th>
                                            <th className="border border-gray-400 p-2 text-center w-[6.5rem]"><div className="truncate">Cod</div></th>
                                            <th className="border border-gray-400 p-2 text-center w-[10%] hidden lg:table-cell"><div className="truncate">Articol Client</div></th>
                                            <th className="border border-gray-400 p-2 text-left w-[12%]">
                                                <div className="flex justify-between items-center">Articol
                                                    <span onClick={() => setSelectedLimbaMain((prev) => prev === 'RO' ? 'FR' : 'RO')} className="mr-4 h-9 w-9 font-semibold  flex items-center justify-center select-none cursor-pointer rounded-full text-green-600 border-green-600 hover:border-green-700 hover:text-green-700 border">{selectedLimbaMain}</span>
                                                </div>
                                            </th>
                                            <th className="border border-gray-400 p-2 text-center w-[12%] hidden xl:table-cell"><div className="truncate">Descriere</div></th>
                                            <th className="border border-gray-400 p-2 text-center w-[8ch] whitespace-nowrap">Tip</th>
                                            <th className="border border-gray-400 p-2 text-center w-[4rem] whitespace-nowrap">Unitate</th>
                                            <th className="border border-gray-400 p-2 text-center w-[5rem] hidden lg:table-cell whitespace-nowrap">Poză</th>
                                            <th className="border border-gray-400 p-2 text-center w-[10ch] whitespace-nowrap">Cantitate</th>
                                            <th className="border border-gray-400 p-2 text-center w-[10ch] whitespace-nowrap">Preț Unitar</th>
                                            <th className="border border-gray-400 p-2 text-center w-[10ch] whitespace-nowrap">Preț Total</th>
                                            <th className="border border-gray-400 p-2 text-center w-[7rem] whitespace-nowrap">Alocat</th>
                                            <th className="border border-gray-400 p-2 text-center w-[8.5rem] whitespace-nowrap">Alocare</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {virtualItems.length > 0 && (
                                            <tr><td colSpan={17} style={{ height: virtualItems[0].start }} /></tr>
                                        )}

                                        {virtualItems.map((vi) => {
                                            const r = retete[vi.index];
                                            const isChild = !!r.parentId;

                                            const qty = Number(r?.cantitate ?? 0);
                                            const cost = Number(r?.cost ?? 0);
                                            const total = qty * cost;

                                            const allocated = Number(r?.allocated_total ?? 0);
                                            const remaining = Math.max(0, qty - allocated);

                                            const inputRaw = allocationInputs[r.id] ?? "";
                                            const inputVal = Number(inputRaw) || 0;

                                            const chevronOpen = openDropdowns.has(r.id);
                                            const selected = !isChild && selectedIds.has(r.id);

                                            // LIVE bar preview
                                            const addPart = Math.max(0, Math.min(inputVal, remaining)); // blue
                                            const over = Math.max(0, inputVal - remaining);            // red
                                            const pctGreen = qty > 0 ? Math.min(100, (allocated / qty) * 100) : 0;
                                            const pctBlue = qty > 0 ? Math.min(100 - pctGreen, (addPart / qty) * 100) : 0;
                                            const showFullRed = over > 0;
                                            const totalShown = allocated + inputVal;

                                            const rowTint =
                                                isChild
                                                    ? "bg-white"
                                                    : showFullRed
                                                        ? "bg-red-100"
                                                        : selected
                                                            ? "bg-blue-100"
                                                            : "bg-gray-100 hover:bg-gray-200";

                                            return (
                                                <tr
                                                    key={`${r.parentId ? `c-${r.parentId}-` : ""}${r.id}-${vi.index}`}
                                                    className={rowTint}
                                                    style={{ height: ROW_H }}
                                                >
                                                    {/* expand/collapse */}
                                                    <td
                                                        onClick={() => { if (!isChild) toggleChildren(r.id); }}
                                                        className={`text-center ${!isChild ? "hover:cursor-pointer" : ""}`}
                                                        style={isChild
                                                            ? { border: "1px solid", borderColor: "#99a1af", borderLeft: "none", borderTop: "none", borderBottom: "none" }
                                                            : { border: "1px solid", borderColor: "#99a1af" }}
                                                    >
                                                        {isChild ? (
                                                            <span />
                                                        ) : (
                                                            <div className="w-full h-full rounded" title={chevronOpen ? "Închide" : "Deschide"}>
                                                                <FontAwesomeIcon
                                                                    icon={faChevronDown}
                                                                    className={`transition-transform text-lg ${chevronOpen ? "rotate-180" : ""}`}
                                                                />
                                                            </div>
                                                        )}
                                                    </td>

                                                    <td className="border border-gray-400 text-lg p-2 text-center">
                                                        <TipIcon what={r?.whatIs} />
                                                    </td>

                                                    <td className="border border-gray-400 p-2">
                                                        <div className="truncate" title={r?.detalii_aditionale || ""}>{r?.detalii_aditionale || ""}</div>
                                                    </td>

                                                    <td className="border border-gray-400 p-2">
                                                        <div className="truncate" title={r?.reper_plan || ""}>{r?.reper_plan || ""}</div>
                                                    </td>

                                                    <td className="border border-gray-400 p-2 hidden xl:table-cell">
                                                        <div className="truncate" title={r?.furnizor || ""}>{r?.furnizor || ""}</div>
                                                    </td>

                                                    <td className="border p-2 border-gray-400">
                                                        <div className="truncate" title={r?.cod || ""}>{r?.cod || ""}</div>
                                                    </td>

                                                    <td className="border p-2 relative border-gray-400 hidden lg:table-cell">
                                                        <OverflowPopover text={r?.articol_client || ""} />
                                                    </td>

                                                    <td className="border p-2 relative border-gray-400">
                                                        <OverflowPopover text={selectedLimbaMain === 'RO' ? r?.articol || "" : r?.articol_fr || ""} />
                                                    </td>

                                                    <td className="border relative border-gray-400 p-2 hidden xl:table-cell">
                                                        <OverflowPopover text={selectedLimbaMain === 'RO' ? r?.descriere || "" : r?.descriere_fr || ""} />
                                                    </td>

                                                    <TipText what={r?.whatIs} />

                                                    <td className="border border-gray-400 text-center p-2">{r?.unitate_masura || ""}</td>

                                                    <td className="border border-gray-400 p-2 hidden lg:table-cell">
                                                        <div className="flex items-center justify-center h-full">
                                                            {r?.photo ? (
                                                                <img src={photoAPI + "/" + r.photo} alt="" className="h-8 w-12 object-fit rounded" />
                                                            ) : ("")}
                                                        </div>
                                                    </td>

                                                    <td className="border p-2 border-gray-400 font-semibold text-left">{fmtQty(qty)}</td>
                                                    <td className="border p-2 border-gray-400 font-semibold text-left">{fmtMoney(cost)}</td>
                                                    <td className="border p-2 border-gray-400 font-semibold text-left">{fmtMoney(total)}</td>

                                                    {/* Alocat (green) + LIVE blue preview + full red if over */}
                                                    <td className="border p-2 border-gray-400">
                                                        {!isChild ? (
                                                            <div className="w-full">
                                                                {showFullRed ? (
                                                                    <>
                                                                        <div className="w-full h-2 rounded bg-red-500" />
                                                                        <div className="mt-1 text-left font-medium text-xs text-red-600">
                                                                            {fmtQty(totalShown)} / {fmtQty(qty)}
                                                                        </div>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <div className="w-full h-2 rounded bg-slate-400 overflow-hidden flex">
                                                                            <div className="h-full bg-green-500" style={{ width: `${pctGreen}%` }} />
                                                                            {addPart > 0 && (
                                                                                <div className="h-full bg-blue-500" style={{ width: `${pctBlue}%` }} />
                                                                            )}
                                                                        </div>
                                                                        <div className="mt-1 text-left font-medium text-xs">
                                                                            {fmtQty(totalShown)} / {fmtQty(qty)}
                                                                        </div>
                                                                    </>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <div className="text-center text-slate-400 text-xs"></div>
                                                        )}
                                                    </td>

                                                    {/* Alocare (Tot + text input + ✔/X). Input is read-only if selected */}
                                                    <td className="border p-2 border-gray-400">
                                                        {isChild ? (
                                                            <div className="text-center text-slate-400 text-xs"></div>
                                                        ) : (
                                                            <div className="flex items-center gap-2">
                                                                <button
                                                                    onClick={() => fillTot(r)}
                                                                    className={`px-2 py-1 rounded text-white text-xs ${selected ? "bg-blue-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
                                                                        }`}
                                                                    title="Completează cu tot ce a rămas"
                                                                    disabled={selected}
                                                                >
                                                                    Tot
                                                                </button>
                                                                <input
                                                                    type="text"
                                                                    inputMode="decimal"
                                                                    value={allocationInputs[r.id] ?? ""}
                                                                    onChange={(e) => { if (!selected) setAllocInput(r.id, e.target.value); }}
                                                                    className={`w-20 rounded px-2 py-1 text-right text-xs ${selected
                                                                        ? "bg-gray-100 border border-gray-300 cursor-not-allowed"
                                                                        : "border border-gray-400"
                                                                        }`}
                                                                    readOnly={selected}
                                                                />
                                                                <button
                                                                    onClick={() => toggleConfirmSelection(r)}
                                                                    className={`px-2 py-1 rounded text-white text-xs ${selected ? "bg-rose-500 hover:bg-rose-600" : "bg-emerald-600 hover:bg-emerald-700"
                                                                        }`}
                                                                    title={selected ? "Deselectează" : "Selectează această alocare"}
                                                                >
                                                                    {selected ? <FontAwesomeIcon icon={faX} /> : <FontAwesomeIcon icon={faCheck} />}
                                                                </button>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}

                                        {virtualItems.length > 0 && (
                                            <tr>
                                                <td
                                                    colSpan={17}
                                                    style={{
                                                        height:
                                                            rowVirtualizer.getTotalSize() - virtualItems[virtualItems.length - 1].end,
                                                    }}
                                                />
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                    <div className=" w-full text-base items-center flex gap-4  p-4">
                        <button
                            onClick={() => {
                                // Reset all allocations and selections
                                setAllocationInputs({});
                                setSelectedIds(new Set());
                                emitSelection(new Set(), retete, {});
                            }}
                            disabled={selectedRetete.length === 0}
                            className={`w-12 h-12 flex items-center justify-center rounded-full text-white font-semibold 
                            ${selectedRetete.length === 0 ? "bg-gray-400 cursor-not-allowed" : "bg-blue-500 hover:bg-blue-600"}`}
                        >
                            <FontAwesomeIcon icon={faRotate} className="text-lg" />
                        </button>
                        <div className="flex justify-center items-center gap-2 p-4 bg-gray-200 rounded-full px-12">Rețete selectate: <span className=" font-semibold">{selectedRetete.length}</span></div>
                        <div className="flex justify-center items-center gap-2 p-4 bg-gray-200 rounded-full px-12">Timp estimat: <span className=" font-semibold">{estimatedTime ? estimatedTime : "N/A"}</span></div>
                        <div className="flex justify-center items-center gap-2 p-4 bg-gray-200 rounded-full px-12">Cost estimat: <span className=" font-semibold">{estimatedCost ? estimatedCost : "N/A"}</span></div>
                        <button onClick={() => setReteteOfertaModal(false)} disabled={selectedRetete.length === 0} className={`text-white flex-1 ${selectedRetete.length > 0 ? "bg-green-500 hover:bg-green-600" : "bg-gray-400 cursor-not-allowed"} p-4 font-semibold rounded-full`}>Confirmă Selecția</button>
                    </div>
                </>
            )}
        </div>
    );
}