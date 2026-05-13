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
import { useParams } from "react-router-dom";
import { useVirtualizer } from "@tanstack/react-virtual";
import api from "../../../../api/axiosAPI";
import { OverflowPopover } from "../../OverflowPopover";
import photoAPI from "../../../../api/photoAPI";
import TextAreaCell from "../../Ofertare/TextareaCell";
import SelectedReteteModal from "./SelectedReteteModal";

export default function SarciniReteteModal({
    setReteteModal,
    selectedRetete = [],
    onSelectionChange = () => { },
}) {
    const { limbaUser } = useParams();

    const [selectedReteteModal, setSelectedReteteModal] = useState(false);

    // data
    const [rows, setRows] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [openDropdowns, setOpenDropdowns] = useState(() => new Set());
    const [childrenByParent, setChildrenByParent] = useState({});

    // filters
    const [clasa, setClasa] = useState("");
    const [cod, setCod] = useState("");
    const [articol, setArticol] = useState("");

    // selection (saved values)
    const [allocationInputs, setAllocationInputs] = useState({});
    const [selectedIds, setSelectedIds] = useState(
        () => new Set(selectedRetete.map((r) => r.id))
    );

    // reper saved values (by row id)
    const [reperInputs, setReperInputs] = useState({}); // { [id]: { reper1: "", reper2: "" } }

    // editing state
    const [activeRowId, setActiveRowId] = useState(null); // row currently in edit mode
    const [editDraft, setEditDraft] = useState(null); // { rowId, reper1, reper2, alloc }

    // estimated time & cost
    const [estimatedTime, setEstimatedTime] = useState("00:00");
    const [estimatedCost, setEstimatedCost] = useState("0.00");

    const [selectedLimba, setSelectedLimba] = useState('RO');

    // virtualizer
    const ROW_H = 55;
    const parentRef = useRef(null);
    const rowVirtualizer = useVirtualizer({
        count: rows.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => ROW_H,
        overscan: 10,
    });
    const virtualItems = rowVirtualizer.getVirtualItems();

    // click-outside to cancel (revert)
    useEffect(() => {
        const onDocDown = (e) => {
            if (!parentRef.current) return;
            if (!parentRef.current.contains(e.target)) {
                setActiveRowId(null);
                setEditDraft(null);
            }
        };
        document.addEventListener("mousedown", onDocDown);
        return () => document.removeEventListener("mousedown", onDocDown);
    }, []);

    // helpers
    const fmtMoney = (v) => {
        const n = Number(v);
        return Number.isFinite(n) ? n.toFixed(2) : "";
    };
    const fmtQty = (v) => {
        const n = Number(v);
        return Number.isFinite(n) ? n.toFixed(3) : "0.000";
    };

    const TipIcon = ({ what, hasInterior }) => {
        if (what === "Manopera")
            return <FontAwesomeIcon icon={faUser} className="text-green-600" />;
        if (what === "Material")
            return <FontAwesomeIcon icon={faTrowelBricks} className="text-amber-600" />;
        if (what === "Utilaj")
            return <FontAwesomeIcon icon={faTruck} className="text-violet-600" />;
        if (what === "Transport")
            return <FontAwesomeIcon icon={faCar} className="text-pink-600" />;
        return (
            <FontAwesomeIcon
                icon={faFolder}
                className={`${!hasInterior ? "text-gray-400" : ""} text-blue-600`}
            />
        );
    };

    const TipTextCell = ({ what }) => {
        if (what === "Manopera")
            return (
                <td className="bg-green-600 text-center border border-gray-400 px-2 text-white">
                    Manoperă
                </td>
            );
        if (what === "Material")
            return (
                <td className="bg-amber-600 text-center border border-gray-400 px-2 text-white">
                    Material
                </td>
            );
        if (what === "Utilaj")
            return (
                <td className="bg-violet-600 text-center border border-gray-400 px-2 text-white">
                    Utilaj
                </td>
            );
        if (what === "Transport")
            return (
                <td className="bg-pink-600 text-center border border-gray-400 px-2 text-white">
                    Transport
                </td>
            );
        return (
            <td className="bg-blue-600 text-center border border-gray-400 px-2 text-white">
                Rețetă
            </td>
        );
    };

    // need ≥ 2 chars in any input
    const canFetch =
        clasa.trim().length >= 2 ||
        cod.trim().length >= 2 ||
        articol.trim().length >= 2;

    // fetch
    const fetchLight = async () => {
        if (!canFetch) {
            setRows([]);
            setIsLoading(false);
            return;
        }
        try {
            const res = await api.get(`/Retete/getReteteLight`, {
                params: {
                    clasa: clasa.trim(),
                    cod: cod.trim(),
                    articol: articol.trim(),
                    limba: limbaUser,
                },
            });
            console.log("fetchLight res:", res);
            const data = res?.data?.data || [];
            setRows(data);

            // seed from parent selection if present
            const seededAlloc = {};
            const seededReper = {};
            (selectedRetete || []).forEach((r) => {
                if (r && r.id != null) {
                    if (typeof r.alloc_input === "string") {
                        seededAlloc[r.id] = r.alloc_input;
                    }
                    if (r.reper1 || r.reper2) {
                        seededReper[r.id] = { reper1: r.reper1 || "", reper2: r.reper2 || "" };
                    }
                }
            });
            if (Object.keys(seededAlloc).length)
                setAllocationInputs((prev) => ({ ...seededAlloc, ...prev }));
            if (Object.keys(seededReper).length)
                setReperInputs((prev) => ({ ...seededReper, ...prev }));
        } catch (e) {
            console.error("fetchLight error:", e);
            setRows([]);
        } finally {
            setIsLoading(false);
        }
    };

    // debounce 1s after typing / limba changes
    useEffect(() => {
        setIsLoading(true);
        const t = setTimeout(fetchLight, 1000);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [clasa, cod, articol, limbaUser]);

    // mirror parent selection
    useEffect(() => {
        const nextIds = new Set((selectedRetete || []).map((s) => s.id));
        setSelectedIds(nextIds);

        const seededAlloc = {};
        const seededReper = {};
        (selectedRetete || []).forEach((s) => {
            if (s && s.id != null) {
                if (typeof s.alloc_input === "string") {
                    seededAlloc[s.id] = s.alloc_input;
                }
                if (s.reper1 || s.reper2) {
                    seededReper[s.id] = { reper1: s.reper1 || "", reper2: s.reper2 || "" };
                }
            }
        });

        if (Object.keys(seededAlloc).length) {
            setAllocationInputs((prev) => ({ ...prev, ...seededAlloc }));
        }
        if (Object.keys(seededReper).length) {
            setReperInputs((prev) => ({ ...prev, ...seededReper }));
        }
    }, [selectedRetete]);

    // emit (includes repers)
    const emitSelection = (idsSet, sourceRows, allocInputsLocal, reperInputsLocal = reperInputs) => {
        const byId = new Map(sourceRows.filter((r) => !r.parentId).map((r) => [r.id, r]));
        const bySelected = new Map((selectedRetete || []).map((r) => [r.id, r]));

        const payload = [...idsSet]
            .map((id) => {
                const base = byId.get(id) || bySelected.get(id);
                if (!base) return null;
                const rep = reperInputsLocal[id] || {};
                return {
                    ...base,
                    cost: Number(base?.pret_total || base?.cost || 0),
                    alloc_input: allocInputsLocal?.[id] ?? bySelected.get(id)?.alloc_input ?? "",
                    whatIs: base?.whatIs || "Reteta",
                    reper1: rep.reper1 || "",
                    reper2: rep.reper2 || "",
                };
            })
            .filter(Boolean);

        onSelectionChange(payload);
    };

    // helper: sanitize decimal string to 3 decimals
    const sanitizeQty = (value) => {
        let v = (value || "").replace(/,/g, ".").replace(/[^\d.]/g, "");
        const parts = v.split(".");
        if (parts.length > 2) v = parts[0] + "." + parts.slice(1).join("");
        if (parts[1]?.length > 3) v = parts[0] + "." + parts[1].slice(0, 3);
        return v;
    };

    // ensure row is active (turn green + show popovers) from anywhere (row or input)
    const ensureRowActive = (r) => {
        if (activeRowId === r.id) return;
        const savedRep = reperInputs[r.id] || { reper1: "", reper2: "" };
        const savedAlloc = allocationInputs[r.id] ?? "";
        setActiveRowId(r.id);
        setEditDraft({
            rowId: r.id,
            reper1: savedRep.reper1 || "",
            reper2: savedRep.reper2 || "",
            alloc: savedAlloc || "",
        });
    };

    // select/deselect (✔/✖). ✔ commits draft then saves selection.
    const toggleConfirmSelection = (row) => {
        if (row.parentId) return;

        const nextAlloc = { ...allocationInputs };
        if (activeRowId === row.id && editDraft) {
            nextAlloc[row.id] = editDraft.alloc ?? "";
        }
        setSelectedIds((prev) => {
            const next = new Set(prev);

            if (next.has(row.id)) {
                // ❌ deselect → clear everything
                next.delete(row.id);
                setReperInputs((prevReps) => {
                    const copy = { ...prevReps };
                    delete copy[row.id];
                    return copy;
                });
                const copyAlloc = { ...nextAlloc };
                delete copyAlloc[row.id];
                setAllocationInputs(copyAlloc);
                emitSelection(next, rows, copyAlloc);
            } else {
                // ✅ select
                const allocVal = Number(nextAlloc[row.id]);
                if (!Number.isFinite(allocVal) || allocVal <= 0) return prev;
                next.add(row.id);

                let repsAfter = reperInputs;
                if (activeRowId === row.id && editDraft) {
                    repsAfter = {
                        ...reperInputs,
                        [row.id]: {
                            reper1: editDraft.reper1 || "",
                            reper2: editDraft.reper2 || "",
                        },
                    };
                    setReperInputs(repsAfter);
                }
                setAllocationInputs(nextAlloc);
                emitSelection(next, rows, nextAlloc, repsAfter);
            }

            setActiveRowId(null);
            setEditDraft(null);
            return next;
        });
    };

    // qty input (saved, when NOT editing)
    const setAllocInput = (id, value) => {
        const v = sanitizeQty(value);
        setAllocationInputs((prev) => {
            const next = { ...prev, [id]: v };
            if (selectedIds.has(id)) emitSelection(selectedIds, rows, next);
            return next;
        });
    };

    // row click toggles edit mode (and seeds draft)
    const handleRowClick = (r, isChild) => {
        if (isChild) return;
        if (activeRowId === r.id) {
            setActiveRowId(null);
            setEditDraft(null);
            return;
        }
        ensureRowActive(r);
    };

    // update draft reper fields
    const handleReperDraftEdit = (field) => (rowId, _whatIs, newValue, _lang) => {
        if (activeRowId !== rowId) return;
        setEditDraft((prev) => (prev ? { ...prev, [field]: newValue } : prev));
    };

    // expand/collapse – uses /Retete/getSpecificReteta/:id
    const toggleChildren = async (parentId) => {
        const isOpen = openDropdowns.has(parentId);
        if (isOpen) {
            setRows((prev) => prev.filter((r) => r.parentId !== parentId));
            setOpenDropdowns((prev) => {
                const s = new Set(prev);
                s.delete(parentId);
                return s;
            });
            return;
        }
        try {
            if (!childrenByParent[parentId]) {
                const resp = await api.get(`/Retete/getSpecificReteta/${parentId}`);
                const normalize = (arr = [], whatIs) =>
                    (arr || []).map((x) => ({
                        ...x,
                        parentId,
                        whatIs,
                        photo: x.photo ?? x.material_photo ?? x.utilaj_photo ?? null,
                        cod: x.cod,
                        articol: x.articol,
                        articol_fr: x.articol_fr,
                        descriere_reteta: x.descriere_reteta,
                        descriere_reteta_fr: x.descriere_reteta_fr,
                        unitate_masura: x.unitate_masura,
                        cost: Number(x.cost ?? 0),
                        cantitate: Number(x.cantitate ?? 0),
                    }));

                const kids = [
                    ...normalize(resp.data?.manopera, "Manopera"),
                    ...normalize(resp.data?.materiale, "Material"),
                    ...normalize(resp.data?.utilaje, "Utilaj"),
                    ...normalize(resp.data?.transport, "Transport"),
                ];

                setChildrenByParent((prev) => ({ ...prev, [parentId]: kids }));
                setRows((prev) => {
                    const idx = prev.findIndex((r) => r.id === parentId && !r.parentId);
                    if (idx === -1) return prev;
                    const next = [...prev];
                    next.splice(idx + 1, 0, ...kids);
                    return next;
                });
            } else {
                const kids = childrenByParent[parentId];
                setRows((prev) => {
                    const idx = prev.findIndex((r) => r.id === parentId && !r.parentId);
                    if (idx === -1) return prev;
                    const next = [...prev];
                    next.splice(idx + 1, 0, ...kids);
                    return next;
                });
            }
            setOpenDropdowns((prev) => {
                const s = new Set(prev);
                s.add(parentId);
                return s;
            });
        } catch (err) {
            console.error("toggleChildren (DB) error:", err);
        }
    };

    const calculateEstimatedTime = () => {
        if (!selectedRetete || selectedRetete.length === 0) {
            setEstimatedTime("00:00");
            return;
        }

        let totalHours = 0;
        selectedRetete.forEach((sel) => {
            totalHours += Number(sel.manopera_cantitate || 0) * Number(sel.alloc_input || 0);
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

    // inside SarciniReteteModal component

    const handleRemoveSelected = (id) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            next.delete(id);

            const nextAlloc = { ...allocationInputs };
            delete nextAlloc[id];
            setAllocationInputs(nextAlloc);

            const nextReps = { ...reperInputs };
            delete nextReps[id];
            setReperInputs(nextReps);

            // reflect removal upward
            emitSelection(next, rows, nextAlloc);

            return next;
        });

        // if you were editing this row, close draft
        if (activeRowId === id) {
            setActiveRowId(null);
            setEditDraft(null);
        }
    };

    return (
        <div className="w-[95%] h-[88%] containerAdauga text-base flex flex-col bg-white rounded-xl">
            {/* header */}
            <div className="flex items-center justify-between p-3 border-b border-gray-400">
                <div className="flex items-center gap-3 min-w-0">
                    <h2 className="font-semibold whitespace-nowrap">Adaugă Rețetă din Baza de Date</h2>

                    <div className="h-8 w-[2px] bg-gray-300" />
                    <label className="text-sm">Cod:</label>
                    <input
                        className="border border-gray-300 rounded px-3 py-1 w-56"
                        value={cod}
                        onChange={(e) => setCod(e.target.value)}
                    />
                    <label className="text-sm">Clasa:</label>
                    <input
                        className="border border-gray-300 rounded px-3 py-1 w-80"
                        value={clasa}
                        onChange={(e) => setClasa(e.target.value)}
                    />

                    <label className="text-sm">Articol:</label>
                    <input
                        className="border border-gray-300 rounded px-3 py-1 w-[36rem]"
                        placeholder="Caută articol"
                        value={articol}
                        onChange={(e) => setArticol(e.target.value)}
                    />
                    <button
                        onClick={() => setSelectedReteteModal(!selectedReteteModal)}
                        className={`ml-3 px-3 py-2 rounded-lg text-white font-medium ${selectedReteteModal ? "bg-blue-600" : "bg-slate-600"
                            }`}
                        title="Arată rețetele selectate"
                    >
                        Selectate ({selectedRetete.length})
                    </button>
                </div>
                <button
                    onClick={() => setReteteModal(false)}
                    className="rounded-lg p-2 bg-red-500 text-white hover:bg-red-600"
                >
                    <FontAwesomeIcon icon={faX} />
                </button>
            </div>

            {/* content */}
            {selectedReteteModal ? (
                <div className="flex-1 p-4 overflow-hidden">
                    <SelectedReteteModal
                        selectedRetete={selectedRetete}
                        onRemove={handleRemoveSelected}
                    />
                </div>
            ) :
                !canFetch ? (
                    <div className="flex-1 flex items-center justify-center text-lg text-gray-500 italic">
                        Introdu minim 2 caractere într-unul din câmpurile de căutare.
                    </div>
                ) : isLoading ? (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="h-16 w-16 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
                    </div>
                ) : rows.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center text-lg text-gray-500 italic">
                        Nicio rețetă găsită.
                    </div>
                ) :
                    (
                        <div className="flex-1 p-4 overflow-hidden">
                            <div ref={parentRef} className="h-full overflow-y-auto overflow-x-hidden min-w-0">
                                <table className="w-full table-fixed text-sm">
                                    <thead className="sticky top-0 bg-gray-300 text-black z-10">
                                        <tr className="h-16">
                                            <th className="border border-gray-400 p-2 text-center w-[2.5rem]" />
                                            <th className="border border-gray-400 p-2 text-center w-[3rem]">Logo</th>
                                            <th className="border border-gray-400 p-2 text-center w-32">Reper 1</th>
                                            <th className="border border-gray-400 p-2 text-center w-32">Reper 2</th>
                                            <th className="border border-gray-400 p-2 text-center w-[8rem]">Cod</th>
                                            <th className="border border-gray-400 p-2 text-center w-[8rem]">Clasa</th>
                                            <th className="border border-gray-400 p-2 text-center w-[20%]">
                                                <div className="flex justify-between items-center">Articol
                                                    <span onClick={() => setSelectedLimba((prev) => prev === 'RO' ? 'FR' : 'RO')} className="mr-4 h-9 w-9 font-semibold  flex items-center justify-center select-none cursor-pointer rounded-full text-green-600 border-green-600 hover:border-green-700 hover:text-green-700 border">{selectedLimba}</span>
                                                </div>
                                            </th>
                                            <th className="border border-gray-400 p-2 text-center w-[18%]">Descriere</th>
                                            <th className="border border-gray-400 p-2 text-center w-[6rem]">Tip</th>
                                            <th className="border border-gray-400 p-2 text-center w-[7ch]">U.M.</th>
                                            <th className="border border-gray-400 p-2 text-center w-[6rem] hidden lg:table-cell">Poză</th>
                                            <th className="border border-gray-400 p-2 text-center w-[8ch]">Cantitate</th>
                                            <th className="border border-gray-400 p-2 text-center w-[10ch]">Preț Unitar</th>
                                            <th className="border border-gray-400 p-2 text-center w-[10ch]">Preț total</th>
                                            <th className="border border-gray-400 p-2 text-center w-[8ch]">Cost Alocare</th>
                                            <th className="border border-gray-400 p-2 text-center w-[9rem]">Alocare</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {virtualItems.length > 0 && (
                                            <tr>
                                                <td colSpan={16} style={{ height: virtualItems[0].start }} />
                                            </tr>
                                        )}

                                        {virtualItems.map((vi) => {
                                            const r = rows[vi.index];
                                            const isChild = !!r.parentId;
                                            const hasInside =
                                                !isChild &&
                                                (r.has_manopera > 0 ||
                                                    r.has_materiale > 0 ||
                                                    r.has_utilaje > 0 ||
                                                    r.has_transport > 0);

                                            const costUnit = Number(r?.pret_total ?? r?.cost ?? 0);

                                            const savedAlloc = allocationInputs[r.id] ?? "";
                                            const draftAlloc =
                                                activeRowId === r.id && editDraft ? editDraft.alloc ?? "" : null;
                                            const inputRaw = draftAlloc ?? savedAlloc;

                                            const chevronOpen = openDropdowns.has(r.id);
                                            const selected = !isChild && selectedIds.has(r.id);

                                            const rowTint = isChild
                                                ? "bg-white"
                                                : selected
                                                    ? "bg-blue-100"
                                                    : "bg-gray-100 hover:bg-gray-200";

                                            const rep = reperInputs[r.id] || { reper1: "", reper2: "" };
                                            const draftRep1 =
                                                activeRowId === r.id && editDraft ? editDraft.reper1 : rep.reper1;
                                            const draftRep2 =
                                                activeRowId === r.id && editDraft ? editDraft.reper2 : rep.reper2;

                                            return (
                                                <tr
                                                    key={`${r.parentId ? `c-${r.parentId}-` : ""}${r.id}-${vi.index}`}
                                                    className={` relative  ${!isChild ? "cursor-pointer" : ""} ${activeRowId === r.id && !isChild ? "bg-green-100" : rowTint}`}
                                                    style={{ height: ROW_H, position: "relative" }}
                                                    onClick={() => handleRowClick(r, isChild)}
                                                >
                                                    {/* expand/collapse */}
                                                    <td
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (!isChild) toggleChildren(r.id);
                                                        }}
                                                        className={`text-center ${!isChild ? "hover:cursor-pointer" : ""}`}
                                                        style={
                                                            isChild
                                                                ? {
                                                                    border: "1px solid",
                                                                    borderColor: "#99a1af",
                                                                    borderLeft: "none",
                                                                    borderTop: "none",
                                                                    borderBottom: "none",
                                                                }
                                                                : { border: "1px solid", borderColor: "#99a1af" }
                                                        }
                                                        title={isChild ? "" : chevronOpen ? "Închide" : "Deschide"}
                                                    >
                                                        {isChild ? (
                                                            <span />
                                                        ) : (
                                                            <FontAwesomeIcon
                                                                icon={faChevronDown}
                                                                className={`transition-transform text-lg ${chevronOpen ? "rotate-180" : ""}`}
                                                            />
                                                        )}
                                                    </td>

                                                    <td className="border border-gray-400 text-lg p-2 text-center">
                                                        <TipIcon what={r?.whatIs} hasInterior={hasInside} />
                                                    </td>

                                                    {/* Reper 1 (cell) */}
                                                    <td
                                                        className="border p-2 border-gray-400 h-full relative"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <OverflowPopover text={activeRowId === r.id && editDraft ? draftRep1 : rep.reper1 || ""} />
                                                        {activeRowId === r.id && (
                                                            <TextAreaCell
                                                                rowId={r.id}
                                                                whatIs={r.whatIs || "Reteta"}
                                                                initialValue={draftRep1 || ""}
                                                                isEditable={true}
                                                                onEdit={handleReperDraftEdit("reper1")}
                                                                absoluteWidth={"18rem"}
                                                                absoluteInput={true}
                                                                arrowPos={130}
                                                                fromTop={10}
                                                                translateX={-100}
                                                                maxLines={2}
                                                            />
                                                        )}
                                                    </td>

                                                    {/* Reper 2 (cell) */}
                                                    <td
                                                        className="border p-2 border-gray-400 text-center relative"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <OverflowPopover text={activeRowId === r.id && editDraft ? draftRep2 : rep.reper2 || ""} />
                                                        {activeRowId === r.id && (
                                                            <TextAreaCell
                                                                rowId={r.id}
                                                                whatIs={r.whatIs || "Reteta"}
                                                                initialValue={draftRep2 || ""}
                                                                isEditable={true}
                                                                onEdit={handleReperDraftEdit("reper2")}
                                                                absoluteWidth={"18rem"}
                                                                absoluteInput={true}
                                                                arrowPos={20}
                                                                fromTop={10}
                                                                translateX={50}
                                                                maxLines={2}
                                                            />
                                                        )}
                                                    </td>

                                                    <td className="border border-gray-400 p-2">
                                                        <div className="truncate" title={r?.cod || ""}>
                                                            {r?.cod || ""}
                                                        </div>
                                                    </td>

                                                    <td className="border border-gray-400 p-2 text-center">
                                                        {r?.clasa || ""}
                                                    </td>

                                                    <td className="border relative border-gray-400 p-2">
                                                        <OverflowPopover text={selectedLimba === 'RO' ? r.articol || "" : r.articol_fr || ""} />
                                                    </td>

                                                    <td className="border relative border-gray-400 p-2">
                                                        <OverflowPopover text={selectedLimba === 'RO' ? r.descriere_reteta || "" : r.descriere_reteta_fr || ""} />
                                                    </td>

                                                    <TipTextCell what={r?.whatIs} />

                                                    <td className="border border-gray-400 text-center p-2">
                                                        {r?.unitate_masura || ""}
                                                    </td>

                                                    <td className="border border-gray-400 p-2 text-center hidden lg:table-cell">
                                                        <div className="flex items-center justify-center">
                                                            {r?.photo ? <img src={photoAPI + "/" + r.photo} alt="" className="h-8 w-12 object-fit rounded" /> : ""}
                                                        </div>
                                                    </td>

                                                    <td className="border p-2 border-gray-400 font-semibold text-right">
                                                        {fmtQty(r?.cantitate || 1)}
                                                    </td>

                                                    <td className="border p-2 border-gray-400 font-semibold text-right">
                                                        {fmtMoney(costUnit)}
                                                    </td>

                                                    <td className="border p-2 border-gray-400 font-semibold text-right">
                                                        {fmtMoney(costUnit * (r?.cantitate || 1))}
                                                    </td>

                                                    {/* Alocat — real-time (draft or saved) */}
                                                    <td className="border p-2 text-blue-500 border-gray-400 font-semibold text-right">
                                                        {(inputRaw * costUnit).toFixed(2) || ""}
                                                    </td>

                                                    {/* Alocare */}
                                                    <td
                                                        className="border p-2 border-gray-400"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        {isChild ? (
                                                            <div className="text-center text-slate-400 text-xs"></div>
                                                        ) : (
                                                            <div className="flex items-center gap-2">
                                                                <input
                                                                    type="text"
                                                                    inputMode="decimal"
                                                                    value={inputRaw}
                                                                    onFocus={() => ensureRowActive(r)}
                                                                    onClick={() => ensureRowActive(r)}
                                                                    onChange={(e) => {
                                                                        if (selected) return;
                                                                        const v = sanitizeQty(e.target.value);
                                                                        if (activeRowId === r.id && editDraft) {
                                                                            setEditDraft((prev) =>
                                                                                prev ? { ...prev, alloc: v } : prev
                                                                            );
                                                                        } else {
                                                                            // if user types before row active, still mirror
                                                                            setAllocInput(r.id, v);
                                                                        }
                                                                    }}
                                                                    className={`w-24 rounded font-semibold text-blue-500 px-2 py-1 text-right text-xs ${selected
                                                                        ? "bg-gray-100 border border-gray-300 cursor-not-allowed"
                                                                        : "border border-gray-400"
                                                                        }`}
                                                                    readOnly={selected}
                                                                    placeholder="0.000"
                                                                />
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        toggleConfirmSelection(r);
                                                                    }}
                                                                    className={`px-2 py-1 rounded text-white text-xs ${selected
                                                                        ? "bg-rose-500 hover:bg-rose-600"
                                                                        : "bg-emerald-600 hover:bg-emerald-700"
                                                                        }`}
                                                                    title={
                                                                        selected
                                                                            ? "Deselectează"
                                                                            : "Selectează această alocare"
                                                                    }
                                                                >
                                                                    <FontAwesomeIcon icon={selected ? faX : faCheck} />
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
                                                    colSpan={16}
                                                    style={{
                                                        height:
                                                            rowVirtualizer.getTotalSize() -
                                                            virtualItems[virtualItems.length - 1].end,
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
                        emitSelection(new Set(), rows, {});
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
                <button onClick={() => setReteteModal(false)} disabled={selectedRetete.length === 0} className={`text-white flex-1 ${selectedRetete.length > 0 ? "bg-green-500 hover:bg-green-600" : "bg-gray-400 cursor-not-allowed"} p-4 font-semibold rounded-full`}>Confirmă Selecția</button>
            </div>
        </div>
    );
}