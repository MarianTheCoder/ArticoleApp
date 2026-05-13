// SelectedReteteModal.jsx
import React, { useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faUser,
    faTrowelBricks,
    faTruck,
    faCar,
    faFolder,
    faChevronDown,
    faX,
} from "@fortawesome/free-solid-svg-icons";
import { OverflowPopover } from "../../OverflowPopover";
import photoAPI from "../../../../api/photoAPI";
import api from "../../../../api/axiosAPI";

const fmtMoney = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n.toFixed(2) : "";
};
const fmtQty = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n.toFixed(3) : "0.000";
};

const TipIcon = ({ what, hasInterior }) => {
    if (what === "Manopera") return <FontAwesomeIcon icon={faUser} className="text-green-600" />;
    if (what === "Material") return <FontAwesomeIcon icon={faTrowelBricks} className="text-amber-600" />;
    if (what === "Utilaj") return <FontAwesomeIcon icon={faTruck} className="text-violet-600" />;
    if (what === "Transport") return <FontAwesomeIcon icon={faCar} className="text-pink-600" />;
    return <FontAwesomeIcon icon={faFolder} className={`${!hasInterior ? "text-gray-400" : ""} text-blue-600`} />;
};

const TipTextCell = ({ what }) => {
    if (what === "Manopera")
        return <td className="bg-green-600 text-center border border-gray-400 px-2 text-white">Manoperă</td>;
    if (what === "Material")
        return <td className="bg-amber-600 text-center border border-gray-400 px-2 text-white">Material</td>;
    if (what === "Utilaj")
        return <td className="bg-violet-600 text-center border border-gray-400 px-2 text-white">Utilaj</td>;
    if (what === "Transport")
        return <td className="bg-pink-600 text-center border border-gray-400 px-2 text-white">Transport</td>;
    return <td className="bg-blue-600 text-center border border-gray-400 px-2 text-white">Rețetă</td>;
};

export default function SelectedReteteModal({ selectedRetete = [], onRemove = () => { } }) {
    // expand/collapse state
    const [openDropdowns, setOpenDropdowns] = useState(() => new Set());
    const [childrenByParent, setChildrenByParent] = useState({});
    const [selectedLimba, setSelectedLimba] = useState('RO');

    // normalize children like in the main modal
    const normalizeKids = (arr = [], parentId, whatIs) =>
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

    const toggleChildren = async (parentId) => {
        const isOpen = openDropdowns.has(parentId);
        if (isOpen) {
            // close: remove children rows
            // because selectedRetete is immutable prop, we just track open state here;
            // the rows we render are computed below from selectedRetete + childrenByParent
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
                const kids = [
                    ...normalizeKids(resp.data?.manopera, parentId, "Manopera"),
                    ...normalizeKids(resp.data?.materiale, parentId, "Material"),
                    ...normalizeKids(resp.data?.utilaje, parentId, "Utilaj"),
                    ...normalizeKids(resp.data?.transport, parentId, "Transport"),
                ];
                setChildrenByParent((prev) => ({ ...prev, [parentId]: kids }));
            }
            setOpenDropdowns((prev) => {
                const s = new Set(prev);
                s.add(parentId);
                return s;
            });
        } catch (err) {
            console.error("toggleChildren (Selected) error:", err);
        }
    };

    // Build the list to render: each selected retetă followed by its children if open
    const rowsToRender = useMemo(() => {
        const out = [];
        for (const r of selectedRetete) {
            out.push(r);
            if (openDropdowns.has(r.id) && childrenByParent[r.id]) {
                out.push(...childrenByParent[r.id]);
            }
        }
        return out;
    }, [selectedRetete, openDropdowns, childrenByParent]);

    if (!selectedRetete?.length) {
        return (
            <div className="w-full h-full flex items-center justify-center text-gray-500 italic">
                Nicio rețetă selectată.
            </div>
        );
    }

    return (
        <div className="h-full w-full overflow-hidden">


            <div className="h-[calc(100%-3rem)] overflow-y-auto overflow-x-hidden min-w-0">
                <table className="w-full table-fixed text-sm">
                    <thead className="sticky top-0 bg-gray-300 text-black z-10">
                        <tr className="h-16">
                            <th className="border border-gray-400 p-2 text-center w-[2.5rem]" />{/* chevron */}
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
                            <th className="border border-gray-400 p-2 text-center w-[10ch]">Cantitate</th>
                            <th className="border border-gray-400 p-2 text-center w-[10ch]">Preț Unitar</th>
                            <th className="border border-gray-400 p-2 text-center w-[10ch]">Preț total</th>
                            <th className="border border-gray-400 p-2 text-center w-[5rem]">Cost Alocare</th>
                            <th className="border border-gray-400 p-2 text-center w-[5rem]">Alocat</th>
                            <th className="border border-gray-400 p-2 text-center w-[3rem]" />{/* X at far right */}
                        </tr>
                    </thead>

                    <tbody>
                        {rowsToRender.map((r) => {
                            const isChild = !!r.parentId;
                            const costUnit = Number(r?.pret_total ?? r?.cost ?? 0);
                            const allocQty = Number(r?.alloc_input ?? 0);
                            const cantitate = Number(r?.cantitate || 1);
                            const rep1 = r?.reper1 || "";
                            const rep2 = r?.reper2 || "";
                            const hasInside =
                                !isChild &&
                                (r.has_manopera > 0 || r.has_materiale > 0 || r.has_utilaje > 0 || r.has_transport > 0);
                            const chevronOpen = !isChild && openDropdowns.has(r.id);

                            return (
                                <tr key={`sel-${isChild ? `c-${r.parentId}-` : ""}${r.id}`} className={`${isChild ? "bg-white" : "bg-gray-100"}`}>
                                    {/* chevron */}
                                    <td
                                        onClick={() => {
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

                                    <td className="border p-2 border-gray-400">
                                        <OverflowPopover text={rep1} />
                                    </td>

                                    <td className="border p-2 border-gray-400">
                                        <OverflowPopover text={rep2} />
                                    </td>

                                    <td className="border border-gray-400 p-2">
                                        <div className="truncate" title={r?.cod || ""}>{r?.cod || ""}</div>
                                    </td>

                                    <td className="border border-gray-400 p-2 text-center">
                                        {r?.clasa || ""}
                                    </td>

                                    <td className="border relative border-gray-400 p-2">
                                        <OverflowPopover text={selectedLimba === 'RO' ? r?.articol || "" : r?.articol_fr || ""} />
                                    </td>

                                    <td className="border relative border-gray-400 p-2">
                                        <OverflowPopover text={selectedLimba === 'RO' ? r?.descriere_reteta || "" : r?.descriere_reteta_fr || ""} />
                                    </td>

                                    <TipTextCell what={r?.whatIs} />

                                    <td className="border border-gray-400 text-center p-2">
                                        {r?.unitate_masura || ""}
                                    </td>

                                    <td className="border border-gray-400 p-2 hidden lg:table-cell">
                                        <div className="flex items-center justify-center h-full">
                                            {r?.photo ? (
                                                <img
                                                    src={photoAPI + "/" + r.photo}
                                                    alt=""
                                                    className="h-8 w-12 object-fit rounded"
                                                />
                                            ) : (
                                                ""
                                            )}
                                        </div>
                                    </td>


                                    <td className="border p-2 border-gray-400 font-semibold text-right">
                                        {fmtQty(cantitate || 1)}
                                    </td>
                                    <td className="border p-2 border-gray-400 font-semibold text-right">
                                        {fmtMoney(costUnit)}
                                    </td>

                                    <td className="border p-2 border-gray-400 font-semibold text-right">
                                        {fmtMoney(costUnit * (r?.cantitate || 1))}
                                    </td>

                                    <td className="border p-2 border-gray-400 text-blue-500 font-semibold text-right">
                                        {fmtMoney(costUnit * allocQty)}
                                    </td>
                                    <td className="border p-2 border-gray-400 text-blue-500 font-semibold text-right">
                                        {fmtQty(allocQty || 1)}
                                    </td>

                                    {/* X at far right for top-level ONLY */}
                                    <td className="border border-gray-400 p-2 text-center">
                                        {!isChild ? (
                                            <button
                                                className="px-2 py-1 rounded bg-rose-500 hover:bg-rose-600 text-white"
                                                title="Elimină din selecție"
                                                onClick={() => onRemove(r.id)}
                                            >
                                                <FontAwesomeIcon icon={faX} />
                                            </button>
                                        ) : (
                                            ""
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}