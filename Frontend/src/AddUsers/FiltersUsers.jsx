// --- NEW: FiltersBar.jsx (same folder) ---
import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRotateRight, faSliders, faPlus, faUsers } from "@fortawesome/free-solid-svg-icons";

const ROLE_OPTIONS = ['ofertant', 'angajat', 'beneficiar'];
const LIMBA_OPTIONS = ['RO', 'FR'];

function FilterField({ label, children }) {
    return (
        <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-black/70">{label}</label>
            {children}
        </div>
    );
}

function FiltersBar({ f, setF, meta, loadUsers, setMetaOpen, startAdd, editingId }) {
    return (
        <div className="flex flex-col rounded-xl bg-white gap-6 p-6">
            <div className="flex items-center gap-3">
                <FontAwesomeIcon icon={faUsers} className="text-blue-500 text-2xl" />
                <h2 className="text-2xl font-bold">Utilizatori</h2>
            </div>
            <div className="flex items-end gap-4 whitespace-nowrap">
                <FilterField label="Limbă">
                    <select
                        className="bg-white rounded-lg px-3 py-2 shadow border border-black"
                        value={f.limba}
                        onChange={(e) => setF((p) => ({ ...p, limba: e.target.value }))}
                    >
                        <option value="">Toate</option>
                        {LIMBA_OPTIONS.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                </FilterField>

                <FilterField label="Email">
                    <input
                        className="bg-white rounded-lg px-3 py-2 shadow border border-black"
                        value={f.email}
                        onChange={(e) => setF((p) => ({ ...p, email: e.target.value }))}
                    />
                </FilterField>

                <FilterField label="Nume">
                    <input
                        className="bg-white rounded-lg px-3 py-2 shadow border border-black"
                        value={f.name}
                        onChange={(e) => setF((p) => ({ ...p, name: e.target.value }))}
                    />
                </FilterField>

                <FilterField label="Firmă">
                    <select
                        className="bg-white rounded-lg px-3 py-2 shadow border border-black"
                        value={f.firma}
                        onChange={(e) => setF((p) => ({ ...p, firma: e.target.value }))}
                    >
                        <option value="">Toate</option>
                        {meta.firma.map(x => (
                            <option key={x.id} value={x.id}>{x.name}</option>
                        ))}
                    </select>
                </FilterField>

                <FilterField label="Departament">
                    <select
                        className="bg-white rounded-lg px-3 py-2 shadow border border-black"
                        value={f.departament}
                        onChange={(e) => setF((p) => ({ ...p, departament: e.target.value }))}
                    >
                        <option value="">Toate</option>
                        {meta.departament.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
                    </select>
                </FilterField>

                <FilterField label="Specializare">
                    <select
                        className="bg-white rounded-lg px-3 py-2 shadow border border-black"
                        value={f.specializare}
                        onChange={(e) => setF((p) => ({ ...p, specializare: e.target.value }))}
                    >
                        <option value="">Toate</option>
                        {meta.specializare.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
                    </select>
                </FilterField>

                <FilterField label="Rol">
                    <select
                        className="bg-white rounded-lg px-3 py-2 shadow border border-black"
                        value={f.role}
                        onChange={(e) => setF((p) => ({ ...p, role: e.target.value }))}
                    >
                        <option value="all">Toate</option>
                        {ROLE_OPTIONS.map(r => (
                            <option key={r} value={r}>
                                {r.charAt(0).toUpperCase() + r.slice(1)}
                            </option>
                        ))}
                    </select>
                </FilterField>

                <div className="flex items-end gap-2 ml-auto">
                    <button
                        onClick={loadUsers}
                        className="bg-white rounded-lg px-3 py-2 shadow border border-black hover:bg-gray-50"
                        type="button"
                        title="Reload users"
                    >
                        <FontAwesomeIcon icon={faRotateRight} />
                    </button>

                    <button
                        onClick={() => setMetaOpen(true)}
                        className="bg-white hover:bg-gray-50 text-black border-black border rounded-lg px-3 py-2 shadow flex items-center gap-2"
                        type="button"
                        title="Gestionare meta"
                    >
                        <FontAwesomeIcon icon={faSliders} />
                        Meta
                    </button>

                    <button
                        onClick={startAdd}
                        className="bg-green-500 hover:bg-green-600 text-white rounded-lg px-4 py-2 shadow flex border border-black items-center gap-2"
                        type="button"
                        disabled={!!editingId}
                    >
                        <FontAwesomeIcon icon={faPlus} />
                        Adaugă Rând
                    </button>
                </div>
            </div>
        </div>
    );
}

export default React.memo(FiltersBar);