// src/components/Rezerve/SidebarRezerve.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../../../api/axiosAPI";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEdit, faEllipsisV, faFilePdf, faTrash } from '@fortawesome/free-solid-svg-icons';
import { AuthContext } from "../../../context/TokenContext";
import { useContext } from "react";

export default function SidebarRezerve({ onPlanUploaded, onSelectPlan, onSelectLucrare3D, selectedPlanSideBar }) {
    const { idSantier } = useParams();
    const { user } = useContext(AuthContext);


    const [unseenCounts, setUnseenCounts] = useState({});
    const [lucrari, setLucrari] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [openIds, setOpenIds] = useState(new Set());
    const [plansByLucrare, setPlansByLucrare] = useState({});
    const [loadingPlans, setLoadingPlans] = useState({});

    const [selectedLucrareId, setSelectedLucrareId] = useState(null);
    const selectedLucrare = useMemo(
        () => lucrari.find(l => l.id === selectedLucrareId) || null,
        [lucrari, selectedLucrareId]
    );

    // toggles
    const [showAdd, setShowAdd] = useState(false);
    const [showUpload, setShowUpload] = useState(false);
    const [showAdd3D, setShowAdd3D] = useState(false);

    // add/edit lucrare (2D)
    const [newName, setNewName] = useState("");
    const [newDesc, setNewDesc] = useState("");

    const [editingOpen, setEditingOpen] = useState(null);
    const [editingId, setEditingId] = useState(null);
    const [editName, setEditName] = useState("");
    const [editDesc, setEditDesc] = useState("");

    const [editingPlanOpen, setEditingPlanOpen] = useState(null);
    const [editingPlanId, setEditingPlanId] = useState(null);
    const [editingPlanName, setEditingPlanName] = useState("");

    // upload plan (PDF)
    const [title, setTitle] = useState("");
    const [scale, setScale] = useState("1:50");
    const [dpi, setDpi] = useState(300);
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);

    // add lucrare 3D
    const [new3DName, setNew3DName] = useState("");
    const [new3DDesc, setNew3DDesc] = useState("");
    const [file3D, setFile3D] = useState(null);
    const [uploading3D, setUploading3D] = useState(false);

    // initial load lucrari
    useEffect(() => {
        if (!idSantier) return;
        (async () => {
            try {
                setLoading(true);
                setError("");
                const { data } = await api.get("/Rezerve/lucrari", { params: { santier_id: idSantier } });
                const only3D = data?.lucrari?.filter(l => l.is_3d) || [];
                const only2D = data?.lucrari?.filter(l => !l.is_3d) || [];
                setLucrari(prev => [...only3D.sort((a, b) => a.name.localeCompare(b.name)), ...only2D.sort((a, b) => a.name.localeCompare(b.name))]);
            } catch (e) {
                setError(e?.response?.data?.error || "Failed to load lucrări");
            } finally {
                setLoading(false);
            }
        })();
    }, [idSantier]);

    // helpers
    const toggleOpen = async (lucrareId) => {
        const l = lucrari.find(x => x.id === lucrareId);
        if (!l) return;

        // If lucrare is 3D → do not drop down; just select and notify parent
        if (l.is_3d) {
            setSelectedLucrareId(lucrareId);
            setOpenIds(prev => {
                const next = new Set(prev);
                next.delete(lucrareId);
                return next;
            });
            onSelectLucrare3D?.(l);
            return;
        }

        // Normal 2D lucrare → expand/collapse and lazy-load plans
        const next = new Set(openIds);
        if (next.has(lucrareId)) {
            next.delete(lucrareId);
            setOpenIds(next);
            setSelectedLucrareId(lucrareId);
            return;
        }
        next.add(lucrareId);
        setOpenIds(next);
        setSelectedLucrareId(lucrareId);
        if (!plansByLucrare[lucrareId]) {
            try {
                setLoadingPlans(prev => ({ ...prev, [lucrareId]: true }));

                const { data } = await api.get("/Rezerve/plans", {
                    params: { lucrare_id: lucrareId }
                });

                const plans = Array.isArray(data) ? data : (data?.plans ?? []);
                console.log("Fetched plans:", plans);
                setPlansByLucrare(prev => ({ ...prev, [lucrareId]: plans }));

                // fetch unseen counts only if we have a user and at least one plan
                if (user?.id && plans.length > 0) {
                    const planIds = plans.map(p => p.id);

                    // send as CSV (backend should split), or send as array if your API supports arrays
                    const { data: seen } = await api.get("/Rezerve/pins/unseenPinsCount", {
                        params: { user_id: user.id, plan_ids: planIds.join(",") }
                    });

                    // expect { counts: { [planId]: number } }
                    const counts = seen?.counts || {};
                    console.log("Fetched unseen pin counts:", counts);
                    setUnseenCounts(prev => ({ ...prev, ...counts }));
                }
            } catch (e) {
                console.log(e);
                setError(e?.response?.data?.error || "Failed to load plans");
            } finally {
                setLoadingPlans(prev => ({ ...prev, [lucrareId]: false }));
            }
        }
    };

    // CRUD lucrari (2D)
    async function addLucrare() {
        if (!newName.trim()) return;
        try {
            const { data } = await api.post("/Rezerve/lucrari", {
                santier_id: idSantier,
                name: newName.trim(),
                description: newDesc?.trim() || null,
            });
            const created = data?.lucrare || data;
            setLucrari(prev => [created, ...prev]);
            setNewName(""); setNewDesc("");
            setShowAdd(false);
        } catch (e) {
            setError(e?.response?.data?.error || "Failed to add lucrare");
        }
    }

    async function saveEdit(id) {
        try {
            await api.put(`/Rezerve/lucrari/${id}`, {
                name: editName.trim(),
                description: editDesc.trim() || null,
            });
            setLucrari(prev => prev.map(l => (l.id === id ? { ...l, name: editName.trim(), description: editDesc.trim() || null } : l)));
            setEditingId(null);
        } catch (e) {
            setError(e?.response?.data?.error || "Failed to save lucrare");
        }
    }

    async function saveEditPlan(id, lucrareId) {
        try {
            await api.put(`/Rezerve/plans/${id}`, {
                name: editingPlanName.trim(),
            });
            setPlansByLucrare(prev => ({
                ...prev,
                [lucrareId]: (prev[lucrareId] || []).map(p => (p.id === id ? { ...p, title: editingPlanName.trim() } : p)),
            }));
            setEditingPlanId(null);
        } catch (e) {
            setError(e?.response?.data?.error || "Failed to save lucrare");
        }
    }

    async function deleteLucrare(id) {
        if (!confirm("Ștergi lucrarea? Se vor șterge și planurile ei.")) return;
        try {
            await api.delete(`/Rezerve/lucrari/${id}`);
            setLucrari(prev => prev.filter(l => l.id !== id));
            const nextOpen = new Set(openIds); nextOpen.delete(id); setOpenIds(nextOpen);
            setPlansByLucrare(prev => { const p = { ...prev }; delete p[id]; return p; });
            if (selectedLucrareId === id) setSelectedLucrareId(null);
        } catch (e) {
            setError(e?.response?.data?.error || "Failed to delete lucrare");
        }
    }

    // Upload plan (PDF)
    async function uploadPlan(e) {
        e.preventDefault();
        if (!selectedLucrareId || !file) return;
        try {
            setUploading(true);
            const fd = new FormData();
            fd.append("title", title || file.name.replace(/\.pdf$/i, "") || "Plan");
            fd.append("scale_label", scale || "1:50");
            fd.append("dpi", String(dpi || 300));
            fd.append("planPdf", file);
            const { data } = await api.post(`/Rezerve/plans/${selectedLucrareId}/upload`, fd, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            setTitle(""); setScale("1:50"); setDpi(300); setFile(null);
            setShowUpload(false);

            const plan = data?.plan || data;
            setPlansByLucrare(prev => ({
                ...prev,
                [selectedLucrareId]: [plan, ...(prev[selectedLucrareId] || [])],
            }));
            onPlanUploaded?.(plan);
        } catch (e) {
            setError(e?.response?.data?.error || "Upload failed");
        } finally {
            setUploading(false);
        }
    }

    async function deletePlan(planId, lucrareId) {
        if (!confirm("Ștergi planul (PDF + imagini)?")) return;
        try {
            await api.delete(`/Rezerve/plans/${planId}`);
            setPlansByLucrare(prev => ({
                ...prev,
                [lucrareId]: (prev[lucrareId] || []).filter(p => p.id !== planId),
            }));
        } catch (e) {
            setError(e?.response?.data?.error || "Failed to delete plan");
        }
    }

    function toApiUrl(pathLike) {
        if (!pathLike) return "";
        try {
            return new URL(pathLike, api.defaults.baseURL).href;
        } catch {
            return pathLike;
        }
    }

    async function downloadPdf(url, filename = "plan.pdf") {
        try {
            const absolute = toApiUrl(url);
            const res = await fetch(absolute, { credentials: "include" });
            if (!res.ok) throw new Error(`Failed to fetch PDF: ${res.status}`);
            const blob = await res.blob();
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(link.href);
        } catch (e) {
            console.error(e);
            setError("Nu am putut descărca PDF-ul.");
        }
    }

    // Add lucrare 3D
    async function addLucrare3D(e) {
        e?.preventDefault?.();
        if (!new3DName.trim() || !file3D) return;
        try {
            setUploading3D(true);
            const fd = new FormData();
            fd.append("santier_id", idSantier);
            fd.append("name", new3DName.trim());
            if (new3DDesc?.trim()) fd.append("description", new3DDesc.trim());
            fd.append("modelFile", file3D);
            const { data } = await api.post("/Rezerve/lucrari3d", fd, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            const created = data?.lucrare || data;
            setLucrari(prev => [created, ...prev]);
            setNew3DName(""); setNew3DDesc(""); setFile3D(null);
            setShowAdd3D(false);
        } catch (e) {
            setError(e?.response?.data?.error || "Failed to add 3D lucrare");
        } finally {
            setUploading3D(false);
        }
    }

    useEffect(() => {
        const onDocClick = (ev) => {
            const el = ev.target;
            if (el instanceof Element && el.closest('.editing-menu')) {
                setEditingPlanId(null);
                setEditingPlanOpen(null);
                return;
            }
            if (el instanceof Element && el.closest('.editing-plan')) {
                setEditingId(null);
                setEditingOpen(null);
                return;
            }
            setEditingId(null);
            setEditingOpen(null);
            setEditingPlanId(null);
            setEditingPlanOpen(null);
        };
        document.addEventListener('click', onDocClick);
        return () => {
            document.removeEventListener('click', onDocClick);
        };
    }, []);

    const canUploadPdf = !!selectedLucrare && !selectedLucrare.is_3d;

    return (
        <div className="h-full w-full flex flex-col text-black gap-2 p-3">
            {/* Header + add buttons */}
            <div className="flex items-center justify-between gap-2">
                <h3 className="text-lg font-semibold">Lucrări</h3>
                <div className="flex items-center gap-2">
                    <button
                        className="rounded-full bg-blue-600 text-white px-3 py-1 text-sm"
                        onClick={() => setShowAdd(v => !v)}
                    >
                        {showAdd ? "– Închide" : "Adaugă lucrare"}
                    </button>
                    <button
                        className="rounded-full bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 text-sm"
                        onClick={() => setShowAdd3D(v => !v)}
                    >
                        {showAdd3D ? "– Închide 3D" : "Adaugă 3D"}
                    </button>
                </div>
            </div>

            {/* Add lucrare (2D) */}
            <div className={`overflow-hidden transition-all duration-200 ${showAdd ? "max-h-96 opacity-100" : "max-h-0 opacity-0"}`}>
                <div className="mt-2 rounded-xl border border-black p-3 bg-white shadow-sm">
                    <div className="flex flex-col gap-2">
                        <input className="w-full rounded-lg border px-3 py-2" placeholder="Nume lucrare"
                            value={newName} onChange={e => setNewName(e.target.value)} />
                        <textarea className="w-full rounded-lg resize-none border px-3 py-2" placeholder="Descriere (opțional)" rows={2}
                            value={newDesc} onChange={e => setNewDesc(e.target.value)} />
                        <div className="flex gap-2">
                            <button onClick={addLucrare} className="rounded-full bg-blue-600 text-white px-4 py-2 disabled:opacity-50"
                                disabled={!newName.trim() || !idSantier}>Salvează</button>
                            <button className="rounded-full bg-red-500 hover:bg-red-600 text-white px-4 py-2" onClick={() => setShowAdd(false)}>Anulează</button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Add lucrare 3D */}
            <div className={`overflow-hidden transition-all duration-200 ${showAdd3D ? "max-h-[28rem] opacity-100" : "max-h-0 opacity-0"}`}>
                <div className="mt-2 rounded-xl border border-purple-700 p-3 bg-white shadow-sm">
                    <form className="flex flex-col gap-2" onSubmit={addLucrare3D}>
                        <div className="font-semibold text-purple-700">Lucrare 3D</div>
                        <input
                            className="w-full rounded-lg border px-3 py-2"
                            placeholder="Nume lucrare 3D"
                            value={new3DName}
                            onChange={e => setNew3DName(e.target.value)}
                        />
                        <textarea
                            className="w-full rounded-lg resize-none border px-3 py-2"
                            placeholder="Descriere (opțional)"
                            rows={2}
                            value={new3DDesc}
                            onChange={e => setNew3DDesc(e.target.value)}
                        />
                        <input
                            type="file"
                            accept=".glb,.gltf,.bin,.ifc,.fbx,model/gltf-binary,model/gltf+json,application/octet-stream"
                            onChange={e => setFile3D(e.target.files?.[0] || null)}
                            className="rounded-lg border px-3 py-2"
                        />
                        <div className="flex gap-2">
                            <button
                                type="submit"
                                className="rounded-full bg-purple-600 text-white px-4 py-2 hover:bg-purple-700 disabled:opacity-50"
                                disabled={!new3DName.trim() || !file3D || uploading3D || !idSantier}
                            >
                                {uploading3D ? "Se încarcă…" : "Salvează 3D"}
                            </button>
                            <button
                                type="button"
                                className="rounded-full bg-red-500 hover:bg-red-600 text-white px-4 py-2"
                                onClick={() => { setShowAdd3D(false); }}
                            >
                                Anulează
                            </button>
                        </div>
                        <div className="text-[11px] text-gray-500">
                            Formate acceptate: <span className="font-bold text-black">GLB</span>
                        </div>
                    </form>
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-auto rounded-xl border border-black bg-white">
                {loading ? (
                    <div className="p-4 text-sm text-gray-500">Loading…</div>
                ) : lucrari.length === 0 ? (
                    <div className="p-4 text-sm text-gray-500">Nicio lucrare încă.</div>
                ) : (
                    <ul className="divide-y divide-black">
                        {lucrari.map(l => {
                            const isOpen = openIds.has(l.id);
                            const isSelected = selectedLucrareId === l.id;
                            const plans = plansByLucrare[l.id] || [];

                            const handleRowClick = () => toggleOpen(l.id);

                            return (
                                <li key={l.id} className="p-0">
                                    {/* Row */}
                                    <div
                                        className={`p-3 flex items-start justify-between gap-2 ${isSelected ? "bg-blue-50" : "bg-white"}`}
                                    >
                                        <button className="flex items-center gap-2 flex-1 text-left" onClick={handleRowClick}>
                                            {/* Caret only for non-3D */}
                                            {!l.is_3d && <span className="text-lg">{isOpen ? "▾" : "▸"}</span>}
                                            <div>
                                                <div className="font-medium">
                                                    {l.name}
                                                    {l.is_3d ? (
                                                        <span className="ml-2 text-[11px] rounded bg-purple-100 text-purple-700 px-2 py-0.5">
                                                            3D
                                                        </span>
                                                    ) : null}
                                                </div>
                                                {l.description ? (
                                                    <div className="text-xs text-gray-500 mt-0.5">{l.description}</div>
                                                ) : null}
                                            </div>
                                        </button>

                                        <div className="relative editing-menu">
                                            <button
                                                className="p-2 hover:scale-125 transition-all duration-200 text-black"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (editingPlanOpen != null || editingPlanId != null) return;
                                                    setEditingOpen(l.id);
                                                }}
                                            >
                                                <FontAwesomeIcon icon={faEllipsisV} />
                                            </button>

                                            {editingOpen == l.id && (
                                                <div className="absolute editing-menu right-0 flex flex-col bg-white border rounded shadow-lg z-10">
                                                    <button
                                                        className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100"
                                                        onClick={() => {
                                                            setEditingOpen(null);
                                                            setEditDesc(l.description || "");
                                                            setEditName(l.name);
                                                            setEditingId(l.id);
                                                        }}
                                                    >
                                                        <FontAwesomeIcon icon={faEdit} className="text-green-600" /> Edit
                                                    </button>
                                                    <button
                                                        className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100"
                                                        onClick={() => { setEditingOpen(null); deleteLucrare(l.id); }}
                                                    >
                                                        <FontAwesomeIcon icon={faTrash} className="text-red-600" /> Delete
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Plans only for non-3D */}
                                    {!l.is_3d && (
                                        <div className={` transition-all ${isOpen ? "max-h-[1000px]" : "max-h-0 hidden"}`}>
                                            <div className=" pb-3">
                                                {loadingPlans[l.id] ? (
                                                    <div className="p-3 text-xs text-gray-500"> Se încarcă...</div>
                                                ) : plans.length === 0 ? (
                                                    <div className="p-3 text-xs text-gray-500">Niciun plan încă.</div>
                                                ) : (
                                                    <ul className="mt-1 space-y-2">
                                                        {plans.map(p => {
                                                            const count = unseenCounts[p.id] || 0;

                                                            return (
                                                                <div
                                                                    key={p.id}
                                                                    className="flex flex-col"
                                                                >
                                                                    <div
                                                                        onClick={() => {
                                                                            setSelectedLucrareId(l.id);
                                                                            onSelectPlan?.(p);
                                                                            setUnseenCounts(prev => ({ ...prev, [p.id]: 0 }));
                                                                        }}
                                                                        className={`flex items-center justify-between px-4 py-1 rounded hover:bg-gray-200 hover:cursor-pointer ${selectedPlanSideBar?.id === p.id ? 'bg-gray-200' : ''
                                                                            }`}
                                                                    >
                                                                        <div
                                                                            className="text-left"
                                                                        >
                                                                            <div className="text-sm font-medium">{p.title}</div>
                                                                            <div className="text-xs text-gray-500">
                                                                                {p.scale_label} • {p.dpi} DPI
                                                                            </div>
                                                                            <div className="text-xs text-gray-500">
                                                                                {p.width_px} x {p.height_px} px
                                                                            </div>

                                                                        </div>

                                                                        <div className="flex relative items-center editing-plan gap-2">
                                                                            {count > 0 && (
                                                                                <span className="inline-flex items-center gap-1 text-base rounded-full text-red-700 px-2 py-[2px] font-semibold">
                                                                                    {count} <span className="font-bold">!</span>
                                                                                </span>
                                                                            )}
                                                                            <button
                                                                                className="p-2 hover:scale-125 transition-all duration-200 text-black"
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    if (editingId != null || editingOpen != null) return;
                                                                                    setEditingPlanOpen(p.id)
                                                                                }}
                                                                            >
                                                                                <FontAwesomeIcon icon={faEllipsisV} />
                                                                            </button>

                                                                            {editingPlanOpen == p.id && (
                                                                                <div className="absolute editing-plan right-0 top-full flex flex-col bg-white border rounded shadow-lg z-10">
                                                                                    <button
                                                                                        className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100"
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                            downloadPdf(p.pdf_path, `${p.title}.pdf`);
                                                                                        }}
                                                                                    >
                                                                                        <FontAwesomeIcon icon={faFilePdf} className="text-blue-600" /> PDF
                                                                                    </button>
                                                                                    <button
                                                                                        className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100"
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                            setEditingPlanOpen(null);
                                                                                            setEditingPlanName(p.title);
                                                                                            setEditingPlanId(p.id);
                                                                                        }}
                                                                                    >
                                                                                        <FontAwesomeIcon icon={faEdit} className="text-green-600" /> Edit
                                                                                    </button>
                                                                                    <button
                                                                                        className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100"

                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                            deletePlan(p.id, l.id);
                                                                                        }}>
                                                                                        <FontAwesomeIcon icon={faTrash} className="text-red-600" /> Delete
                                                                                    </button>
                                                                                </div>
                                                                            )}


                                                                        </div>

                                                                    </div>
                                                                    {editingPlanId === p.id && (
                                                                        <div className="px-3 editing-plan pb-3">
                                                                            <div className="mt-2 rounded-xl border border-gray-200 p-3 bg-white">
                                                                                <div className="flex flex-col gap-2">
                                                                                    <input className="rounded-lg border px-3 py-2" value={editingPlanName} onChange={e => setEditingPlanName(e.target.value)} />
                                                                                    <div className="flex gap-2">
                                                                                        <button className="rounded-full bg-green-600 hover:bg-green-700 text-white px-3 py-1" onClick={() => saveEditPlan(p.id, l.id)}>Salvează</button>
                                                                                        <button className="rounded-full bg-red-600 hover:bg-red-700 text-white px-3 py-1" onClick={() => setEditingPlanId(null)}>Anulează</button>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>

                                                            )
                                                        })}
                                                    </ul>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                    {/* Inline edit */}
                                    {editingId === l.id && (
                                        <div className="px-3 editing-menu pb-3">
                                            <div className="mt-2 rounded-xl border border-gray-200 p-3 bg-white">
                                                <div className="flex flex-col gap-2">
                                                    <input className="rounded-lg border px-3 py-2" value={editName} onChange={e => setEditName(e.target.value)} />
                                                    <textarea className="rounded-lg resize-none border px-3 py-2" rows={2} value={editDesc} onChange={e => setEditDesc(e.target.value)} />
                                                    <div className="flex gap-2">
                                                        <button className="rounded-full bg-green-600 hover:bg-green-700 text-white px-3 py-1" onClick={() => saveEdit(l.id)}>Salvează</button>
                                                        <button className="rounded-full bg-red-600 hover:bg-red-700 text-white px-3 py-1" onClick={() => setEditingId(null)}>Anulează</button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>

            {/* Upload toggle (PDF) — hidden/disabled for 3D */}
            <div className={`flex items-center justify-between ${canUploadPdf ? "" : "opacity-50"}`}>
                <div className="font-medium">Încarcă plan (PDF)</div>
                <button
                    className="rounded-full bg-blue-600 text-white px-3 py-1 text-sm disabled:opacity-50"
                    onClick={() => canUploadPdf && setShowUpload(v => !v)}
                    disabled={!canUploadPdf}
                >
                    {showUpload ? "– Închide" : "Încarcă"}
                </button>
            </div>

            {/* Upload form (PDF) — render only when non-3D is selected */}
            {canUploadPdf && (
                <div className={`overflow-hidden transition-all duration-200 ${showUpload ? "max-h-96 opacity-100" : "max-h-0 opacity-0"}`}>
                    <div className="mt-2 rounded-xl border border-gray-200 p-3 bg-white">
                        <form className="flex flex-col gap-2" onSubmit={uploadPlan}>
                            <input className="rounded-lg border px-3 py-2" placeholder="Titlu plan (ex. Parter)"
                                value={title} onChange={e => setTitle(e.target.value)} />
                            <div className="flex gap-2">
                                <input className="rounded-lg border px-3 py-2 w-1/2" placeholder="Scară (ex. 1:50)"
                                    value={scale} onChange={e => setScale(e.target.value)} />
                                <input className="rounded-lg border px-3 py-2 w-1/2" placeholder="DPI (ex. 200)" type="number"
                                    value={dpi} onChange={e => setDpi(Number(e.target.value))} />
                            </div>
                            <input type="file" accept="application/pdf" onChange={e => setFile(e.target.files?.[0] || null)} className="rounded-lg border px-3 py-2" />
                            <button type="submit" className="self-start rounded-full bg-blue-600 text-white px-4 py-2 hover:bg-blue-700 disabled:opacity-50"
                                disabled={!file || uploading}>
                                {uploading ? "Se încarcă…" : "Încarcă PDF"}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {error ? <div className="text-red-600 text-sm">{error}</div> : null}
        </div>
    );
}