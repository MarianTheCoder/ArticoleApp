import { useEffect, useState } from "react";
import api from "../../api/axiosAPI";
import photoAPI from "../../api/photoAPI";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLink } from "@fortawesome/free-solid-svg-icons";

export default function AssignSantiere() {
    const [users, setUsers] = useState([]);
    const [santiere, setSantiere] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);

    // Popup state
    const [showModal, setShowModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [tempSelected, setTempSelected] = useState([]);
    const [saving, setSaving] = useState(false); // disable Confirm while saving
    const [saveError, setSaveError] = useState("");

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const res = await api.get("/users/getAtribuiri");
                setUsers(res.data?.users || []);
                setSantiere(res.data?.santiere || []);
                setAssignments(res.data?.assignments || []);
            } catch (err) {
                console.error("❌ Eroare la fetch:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const getUserAssignments = (userId) => {
        return assignments
            .filter((a) => a.user_id === userId)
            .map((a) => a.santier_id);
    };

    const openEditModal = (user) => {
        setEditingUser(user);
        setTempSelected(getUserAssignments(user.id));
        setSaveError("");
        setShowModal(true);
    };

    const toggleTempSelection = (santierId) => {
        setTempSelected((prev) =>
            prev.includes(santierId)
                ? prev.filter((id) => id !== santierId)
                : [...prev, santierId]
        );
    };

    const confirmEdit = async () => {
        if (!editingUser) return;
        setSaving(true);
        setSaveError("");

        try {
            // Call backend to persist
            const payload = {
                user_id: editingUser.id,
                santier_ids: tempSelected, // array of IDs
            };
            const res = await api.post("/users/saveAtribuiri", payload);

            // If backend returns the full assignments list for the user, use it
            // Expecting shape: { ok: true, assignmentsForUser: [{id, user_id, santier_id}, ...] }
            if (res.data?.ok) {
                const serverUserAssignments = res.data.assignmentsForUser || [];

                setAssignments((prev) => {
                    // remove old rows for this user, add the new ones from server
                    const withoutUser = prev.filter((a) => a.user_id !== editingUser.id);
                    return [...withoutUser, ...serverUserAssignments];
                });

                setShowModal(false);
                setEditingUser(null);
                setSaving(false);
                return;
            }

            // Fallback: if server didn't return new rows, rebuild locally from tempSelected
            setAssignments((prev) => {
                const withoutUser = prev.filter((a) => a.user_id !== editingUser.id);
                const newAssignments = tempSelected.map((sid) => ({
                    id: Date.now() + Math.random(), // temp client id
                    user_id: editingUser.id,
                    santier_id: sid,
                }));
                return [...withoutUser, ...newAssignments];
            });

            setShowModal(false);
            setEditingUser(null);
        } catch (err) {
            console.error("❌ Eroare la salvare:", err);
            setSaveError("Nu s-a putut salva. Încearcă din nou.");
        } finally {
            setSaving(false);
        }
    };

    const cancelEdit = () => {
        if (saving) return; // prevent closing while saving
        setShowModal(false);
        setEditingUser(null);
        setTempSelected([]);
        setSaveError("");
    };

    if (loading) {
        return (
            <div className="absolute inset-0  z-50 flex items-center justify-center">
                <div className="w-20 h-20 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="h-screen w-full flex items-center justify-center">
            <div className="w-[80%] h-[80%] relative bg-gray-200 p-10 flex flex-col items-center rounded-lg gap-6">
                <div className="w-full bg-white p-4 shadow rounded-lg flex items-center justify-center">
                    <h1 className="text-2xl flex items-center text-black font-bold gap-2">
                        <FontAwesomeIcon icon={faLink} className="text-blue-500" />
                        Asignare Activități cǎtre Utilizatori
                    </h1>
                </div>

                <div className="relative w-full rounded-xl overflow-auto bg-white shadow-md h-full">
                    <div className=" rounded-lg">
                        {/* YOUR TABLE (unchanged structure) */}
                        <table className="min-w-full table-fixed text-base text-center rounded-lg border border-gray-200 text-black">
                            <thead className="text-base uppercase h-20 sticky top-0 bg-gray-100">
                                <tr></tr>
                                <tr>
                                    <th className="w-[70px] rounded-lg px-4 py-2">Poză</th>
                                    <th className="w-44 px-4 py-2 text-left">Utilizator</th>
                                    <th className="w-1/2 px-4 py-2">Santiere asignate</th>
                                    <th className="w-28 px-4 py-2">Acțiuni</th>
                                </tr>
                            </thead>

                            <tbody>
                                {users.map((user) => {
                                    const assignedIds = getUserAssignments(user.id);
                                    return (
                                        <tr
                                            key={user.id}
                                            className="border-t border-gray-300 hover:bg-gray-50 transition-colors"
                                        >
                                            {/* Poză */}
                                            <td className="p-2">
                                                <img
                                                    src={photoAPI + "/" + user.photo_url}
                                                    alt="poza"
                                                    className="w-12 h-12 rounded-full object-cover border border-gray-400 mx-auto"
                                                />
                                            </td>

                                            {/* Utilizator */}
                                            <td className="p-2 text-left font-semibold">{user.name}</td>

                                            {/* Santiere asignate */}
                                            <td className="p-2">{santiere.filter((s) => assignedIds.includes(s.id)).map((s) => {
                                                return <span key={s.id} style={{ borderColor: s.color_hex || "#000000" }} className="inline-block text-sm px-2 py-2 rounded-full m-1 border-2">{s.name}</span>

                                            })}</td>

                                            {/* Acțiuni */}
                                            <td className="p-2">
                                                <button
                                                    className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                                                    onClick={() => openEditModal(user)}
                                                >
                                                    Edit
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>


                {/* Modal */}
                {/* Modal */}
                {showModal && editingUser && (
                    <div className="fixed inset-0 text-black bg-black/50 flex justify-center items-center z-50">
                        <div className="bg-white rounded-lg shadow-lg p-6 w-[800px] h-[70vh] flex flex-col">
                            <div>
                                <h2 className="text-lg font-bold mb-1">Editare activitǎți pentru:</h2>
                                <div className="text-base mb-4">{editingUser.name} </div>

                                {/* 2 columns: RO / FR */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto max-h-[44vh] pr-2">
                                    {/* Column RO */}
                                    <div>
                                        <div className="font-semibold text-sm uppercase tracking-wide text-gray-600 mb-2">
                                            Santiere – RO
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            {santiere
                                                .filter(s => (s.limba || 'RO').toUpperCase() === 'RO')
                                                .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
                                                .map(s => (
                                                    <label key={s.id} className="flex text-base items-center gap-3 px-2 py-1 rounded hover:bg-gray-50">
                                                        <input
                                                            className="w-5 h-5"
                                                            type="checkbox"
                                                            checked={tempSelected.includes(s.id)}
                                                            onChange={() => toggleTempSelection(s.id)}
                                                            disabled={saving}
                                                        />
                                                        <span
                                                            className="inline-block w-3 h-3 rounded-full border"
                                                            style={{ backgroundColor: s.color_hex || '#fff', borderColor: 'black' }}
                                                            aria-hidden
                                                        />
                                                        <span className="truncate">{s.name}</span>
                                                    </label>
                                                ))}
                                        </div>
                                    </div>

                                    {/* Column FR */}
                                    <div>
                                        <div className="font-semibold text-sm uppercase tracking-wide text-gray-600 mb-2">
                                            Santiere – FR
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            {santiere
                                                .filter(s => (s.limba || 'RO').toUpperCase() === 'FR')
                                                .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
                                                .map(s => (
                                                    <label key={s.id} className="flex text-base items-center gap-3 px-2 py-1 rounded hover:bg-gray-50">
                                                        <input
                                                            className="w-5 h-5"
                                                            type="checkbox"
                                                            checked={tempSelected.includes(s.id)}
                                                            onChange={() => toggleTempSelection(s.id)}
                                                            disabled={saving}
                                                        />
                                                        <span
                                                            className="inline-block w-3 h-3 rounded-full border"
                                                            style={{ backgroundColor: s.color_hex || '#fff', borderColor: 'black' }}
                                                            aria-hidden
                                                        />
                                                        <span className="truncate">{s.name}</span>
                                                    </label>
                                                ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Divider + actions */}
                            <div className="mt-4">
                                <div className="w-full h-px bg-gray-300 mb-4" />
                                <div className="flex justify-end gap-3">
                                    <button
                                        className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded disabled:opacity-60"
                                        onClick={cancelEdit}
                                        disabled={saving}
                                    >
                                        Anulează
                                    </button>
                                    <button
                                        className="px-4 py-2 bg-green-600 hover:bg-green-500 w-48 text-white rounded disabled:opacity-60"
                                        onClick={confirmEdit}
                                        disabled={saving}
                                    >
                                        {saving ? "Se salvează..." : "Confirmă"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div >
    );
}