import { faCancel, faCheck, faEdit, faPlus, faRotate, faScrewdriverWrench, faTrash, faX, faXmark, faXmarksLines } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React, { useContext, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom';
import api from '../../../api/axiosAPI';
import SantiereAddOfertaMain from './SantiereAddOfertaMain';
import SantiereAllPartsForExport from './SantiereAllPartsForExport';
import { faCopy } from '@fortawesome/free-regular-svg-icons';
import { set } from 'date-fns';



export default function Oferte_PartsWrapper({ ofertaId }) {

    const [oferteParts, setOferteParts] = useState(null);
    //check sa vedem ce este selectat
    const [selectedPartId, setSelectedPartId] = useState("");
    //refresh in main to force re-render
    const [refreshKey, setRefreshKey] = useState(0);

    const [editRepere, setEditRepere] = useState(false);
    const [reper1, setReper1] = useState("");
    const [reper2, setReper2] = useState("");


    //input true and value
    const [addOfertaPartInput, setAddOfertaPartInput] = useState(null);
    const [addOfertaPartInputValue, setAddOfertaPartInputValue] = useState("");

    //edit / delete / actualizeaza retete / dubleaza retete
    const [deleteOfertaPart, setDeleteOfertaPart] = useState(false);
    const [editOfertaPart, setEditOfertaPart] = useState(false);
    const [actualizeazaRetete, setActualizeazaRetete] = useState(false);
    //dubleaza states
    const [dubleazaRetete, setDubleazaRetete] = useState(false);
    const [selectedRowIds, setSelectedRowIds] = useState([]); // rows selected in child
    //sterge retete
    const [deleteRetete, setDeleteRetete] = useState(false);
    const [selectedRowIdsDelete, setSelectedRowIdsDelete] = useState([]); // rows selected in child
    const [acceptDelete, setAcceptDelete] = useState(false);

    //schimbare de detalii/reper/articol
    const [ovDetalii, setOvDetalii] = useState(false);
    const [detaliiVal, setDetaliiVal] = useState("");
    const [ovReper, setOvReper] = useState(false);
    const [reperVal, setReperVal] = useState("");
    const [ovArticol, setOvArticol] = useState(false);
    const [articolVal, setArticolVal] = useState("");
    const [chooseAnchor, setChooseAnchor] = useState(false);
    const [anchorId, setAnchorId] = useState(null);

    //furnizori states for dropdonw
    const [showFurnizori, setShowFurnizori] = useState(false);
    const [furnizoriType, setFurnizoriType] = useState('materiale'); // 'materiale' | 'utilaje'
    const [furnizori, setFurnizori] = useState([]);
    const [furnizoriLoading, setFurnizoriLoading] = useState(false);
    const [selectedFurnizor, setSelectedFurnizor] = useState('');



    useEffect(() => {
        if (showFurnizori && selectedPartId) {
            fetchFurnizori(furnizoriType);
        } else {
            setFurnizori([]);
            setSelectedFurnizor('');
        }
    }, [showFurnizori, selectedPartId]);

    const fetchFurnizori = async (type) => {
        if (!selectedPartId) return;
        try {
            setFurnizoriLoading(true);
            const res = await api.get(`/Santiere/getFurnizoriForOfertaPart/${selectedPartId}`, {
                params: { type }
            });
            setFurnizori(res.data?.furnizori || []);
        } catch (err) {
            console.error("❌ Eroare la fetch furnizori:", err);
            setFurnizori([]);
        } finally {
            setFurnizoriLoading(false);
        }
    };

    useEffect(() => {
        // console.log("Selected Part ID changed:", selectedPartId);
        handleCancel();
    }, [selectedPartId]);

    const fetchOfertePartsForThisSantier = async () => {
        try {
            const res = await api.get(`/Santiere/getOfertePartsForThisSantier/${ofertaId}`);
            const sorted = (res.data.parts ?? []).slice()
                .sort((a, b) => a.name.localeCompare(b.name, 'ro', { sensitivity: 'base' }));
            setOferteParts(sorted);
        } catch (error) {
            console.log(error);
        }
    }

    const addOfertaPart = async () => {
        if (addOfertaPartInputValue.trim() == "") {
            alert("Numele lucrării nu trebuie sa fie gol");
            return;
        }
        const partExists = oferteParts.some(part => part.name.toLowerCase() === addOfertaPartInputValue.trim().toLowerCase());
        if (partExists && !editOfertaPart) {
            alert("Această lucrare există deja.");
            return;
        }
        try {
            if (editOfertaPart) {
                const res = await api.put(`/Santiere/editOfertaPart/${selectedPartId}`, { name: addOfertaPartInputValue });
            }
            else {
                const res = await api.post(`/Santiere/addOfertaPartToTheSantier/${ofertaId}`, { name: addOfertaPartInputValue });
            }
            setDeleteOfertaPart(false);
            setEditOfertaPart(false);
            setAddOfertaPartInputValue("");
            setAddOfertaPartInput(false);
            fetchOfertePartsForThisSantier();
        } catch (error) {
            console.log(error);
        }
    }

    //delete and handle
    const handleDelete = () => {
        handleCancel();
        setDeleteOfertaPart(true);
    }

    const handleActualizeazaRetete = () => {
        handleCancel();
        setActualizeazaRetete(true);
    }

    const deleteLucrare = async () => {
        try {
            const res = await api.delete(`/Santiere/deleteOfertaPart/${selectedPartId}`);
            setSelectedPartId("");
            setDeleteOfertaPart(false);
            fetchOfertePartsForThisSantier();
        } catch (error) {
            console.log(error);
        }
    }

    //edit handle
    const handleEdit = () => {
        // console.log(oferteParts, selectedPartId)
        const part = oferteParts.find(part => part.id === parseInt(selectedPartId));
        if (part) {
            setAddOfertaPartInputValue(part.name);
            setAddOfertaPartInput(true);
            setEditOfertaPart(true);
        }
        setDeleteOfertaPart(false);
    }

    const handleSelectPartID = (e) => {
        setDeleteOfertaPart(false);
        if (editOfertaPart) {
            setEditOfertaPart(false);
            setAddOfertaPartInputValue("");
            setAddOfertaPartInput(false);
        }
        setSelectedPartId(e.target.value);
    }

    const handleAddOfertaPart = () => {
        if (addOfertaPartInput == true) {
            addOfertaPart();
        }
        else {
            setDeleteOfertaPart(false);
            setEditOfertaPart(false)
            setAddOfertaPartInputValue("");
            setAddOfertaPartInput(true);
        }
    }

    const acceptActualizare = async () => {
        try {
            await api.post(`/Santiere/actualizeReteteForOfertaPart/${selectedPartId}`);
            console.log("Actualizare rețete pentru ofertă:", selectedPartId);
            setRefreshKey(prevKey => prevKey + 1); // Force re-render
        } catch (error) {
            console.error("❌ Eroare la actualizarea rețetelor:", error);
        }
        finally {
            setActualizeazaRetete(false);
        }
    }

    const handleCancel = () => {
        setEditRepere(false);
        setActualizeazaRetete(false);
        setDeleteOfertaPart(false);
        setEditOfertaPart(false);
        setAddOfertaPartInputValue("");
        setAddOfertaPartInput(false);
        setDubleazaRetete(false);
        setDeleteRetete(false);
        setSelectedRowIdsDelete([]);
        setSelectedRowIds([]);
        setShowFurnizori(false);
        setFurnizori([]);
        setSelectedFurnizor('');
        setOvDetalii(false); setDetaliiVal("");
        setOvReper(false); setReperVal("");
        setOvArticol(false); setArticolVal("");
        setChooseAnchor(false);
        setAnchorId(null);
    }

    const handleFurnizori = () => {
        handleCancel();
        setShowFurnizori(true);
        setFurnizoriType('materiale');
    };

    const changeFurnizoriType = (t) => {
        setFurnizoriType(t);
        setSelectedFurnizor('');
        fetchFurnizori(t);
    };

    const handleEditRepere = () => {
        handleCancel();
        const part = oferteParts.find(part => part.id === parseInt(selectedPartId));
        if (part) {
            setReper1(part.reper1 || "");
            setReper2(part.reper2 || "");
            setEditRepere(true);
        }
    };

    const saveRepere = async () => {
        try {
            await api.put(`/Santiere/editOfertaPart/${selectedPartId}`, {
                reper1,
                reper2
            });
            setEditRepere(false);
            fetchOfertePartsForThisSantier();
        } catch (error) {
            console.error("❌ Eroare la salvare repere:", error);
        }
    };

    const cancelRepere = () => {
        setEditRepere(false);
        setReper1("");
        setReper2("");
    };

    useEffect(() => {
        fetchOfertePartsForThisSantier();
    }, [])

    const handleDubleazaRetete = () => {
        handleCancel();
        setDubleazaRetete(true);
        setSelectedRowIds([]);
    };


    const duplicateSelectedRows = async () => {
        if (selectedRowIds.length === 0) {
            alert("Selectează cel puțin un rând.");
            return;
        }
        try {
            // Adjust the endpoint/body to your backend.
            await api.post(`/Santiere/dubleazaRetete/${selectedPartId}`, {
                ids: selectedRowIds,
                anchor_id: anchorId || null,
                overrides: {
                    use_detalii: ovDetalii,
                    detalii_aditionale: detaliiVal,
                    use_reper_plan: ovReper,
                    reper_plan: reperVal,
                    use_articol_client: ovArticol,
                    articol_client: articolVal,
                },
            });
            setDubleazaRetete(false);
            setSelectedRowIds([]);
            setOvDetalii(false); setDetaliiVal("");
            setOvReper(false); setReperVal("");
            setOvArticol(false); setArticolVal("");
            setChooseAnchor(false);
            setAnchorId(null);
            setRefreshKey(prev => prev + 1); // refresh child
        } catch (err) {
            console.error("❌ Eroare la dublarea rețetelor:", err);
        }
    };

    const handleDeleteRetete = () => {
        handleCancel();
        setDeleteRetete(true);
        setSelectedRowIdsDelete([]);
    };

    const handleAcceptDeleteRetete = () => {
        if (selectedRowIdsDelete.length === 0) {
            alert("Selectează cel puțin un rând pentru ștergere.");
            return;
        }
        setAcceptDelete(true);
        setDeleteRetete(false);
    }


    return (
        <div className='relative h-full w-full grid overflow-hidden p-4 grid-rows-[auto_1fr] '>
            <div className=' px-8 p-3 bg-[#26415f] rounded-xl flex w-full justify-between'>
                <div className='flex gap-4  items-center'>
                    <label htmlFor="" className=''>Alege o lucrare:</label>
                    <select
                        id="clasa_material"
                        name="clasa_material"
                        value={selectedPartId}
                        onChange={(e) => handleSelectPartID(e)} // Update the selected value
                        className="py-2 text-center min-w-52 px-2 text-black rounded-lg outline-none shadow-sm "
                    >
                        <option value="">Toate Lucrările</option>
                        {oferteParts && oferteParts.map(part => (
                            <option key={part.id} value={part.id}>
                                {part.name}
                            </option>
                        ))}
                    </select>
                    {editRepere && (
                        <div className='flex gap-4 items-center'>
                            <input
                                type="text"
                                placeholder="Reper 1"
                                value={reper1}
                                onChange={(e) => setReper1(e.target.value)}
                                className='py-2 w-64 px-2 text-black rounded-lg outline-none shadow-sm'
                            />
                            <input
                                type="text"
                                placeholder="Reper 2"
                                value={reper2}
                                onChange={(e) => setReper2(e.target.value)}
                                className='py-2 w-64 px-2 text-black rounded-lg outline-none shadow-sm'
                            />
                            <button onClick={saveRepere} className='bg-green-500 text-white px-4 py-2 rounded-xl hover:bg-green-600'>
                                Salvează Reperele
                            </button>
                            <button onClick={cancelRepere} className='bg-red-500 text-white px-4 py-2 rounded-xl hover:bg-red-600'>
                                Anulează
                            </button>
                        </div>
                    )}
                    {actualizeazaRetete && (
                        <div className='flex gap-4 items-center'>
                            <span className='text-white text-lg'>Ești sigur cǎ vrei să actualizezi rețetele pentru această lucrare?</span>
                            <button onClick={acceptActualizare} className='bg-purple-500 flex  items-center justify-center gap-2 text-white  hover:bg-purple-600  px-4 py-3 rounded-xl'><FontAwesomeIcon className='' icon={faRotate} /><span className="leading-none">Actualizează!</span></button>
                            <button onClick={handleCancel} className='bg-red-500 text-white px-4 py-3 flex items-center justify-center rounded-xl hover:bg-red-600'>
                                <span className='leading-none'>Anulează</span>
                            </button>
                        </div>
                    )}
                    {selectedPartId != "" && dubleazaRetete && (
                        <div className='flex gap-4'>
                            <div className='text-white self-center'>{selectedRowIds.length} selectate</div>
                            <div className='flex items-center justify-center'>
                                <button
                                    onClick={() => setChooseAnchor(true)}
                                    className='bg-blue-500 text-white px-4 py-3 rounded-xl hover:bg-blue-600'
                                >
                                    Alege poziția
                                </button>
                            </div>
                            <div className='flex items-center justify-center'>
                                <button onClick={duplicateSelectedRows} className='bg-amber-500 flex items-center justify-center gap-2 text-white hover:bg-amber-600 px-4 py-3 rounded-xl'>
                                    <FontAwesomeIcon icon={faCheck} /><span className="leading-none">Dublează</span>
                                </button>
                            </div>
                            {/* detalii_aditionale */}
                            <label className='flex items-center gap-2 text-white'>
                                <input type="checkbox" className='h-5 w-5' checked={ovDetalii} onChange={e => setOvDetalii(e.target.checked)} />
                                {(() => {
                                    const part = oferteParts.find(part => part.id === parseInt(selectedPartId));
                                    return part ? part.reper1 : 'Detalii aditionale';
                                })()}
                            </label>
                            <textarea
                                disabled={!ovDetalii}
                                value={detaliiVal}
                                onChange={e => setDetaliiVal(e.target.value)}
                                className={`py-2 w-52 h-[4.5rem] px-2 rounded-lg resize-none outline-none shadow-sm ${ovDetalii ? 'text-black bg-white' : 'bg-gray-300 text-gray-600 cursor-not-allowed'}`}
                            />

                            {/* reper_plan */}
                            <label className='flex items-center gap-2 text-white'>
                                <input type="checkbox" className='h-5 w-5' checked={ovReper} onChange={e => setOvReper(e.target.checked)} />
                                {(() => {
                                    const part = oferteParts.find(part => part.id === parseInt(selectedPartId));
                                    return part ? part.reper2 : 'reper_plan';
                                })()}
                            </label>
                            <textarea
                                disabled={!ovReper}
                                value={reperVal}
                                onChange={e => setReperVal(e.target.value)}
                                className={`py-2 w-52 h-[4.5rem] px-2 rounded-lg resize-none outline-none shadow-sm ${ovReper ? 'text-black bg-white' : 'bg-gray-300 text-gray-600 cursor-not-allowed'}`}
                            />
                            {/* articol_client */}
                            <label className='flex items-center gap-2 text-white'>
                                <input type="checkbox" className='h-5 w-5' checked={ovArticol} onChange={e => setOvArticol(e.target.checked)} />
                                Articol Client
                            </label>
                            <textarea
                                disabled={!ovArticol}
                                value={articolVal}
                                onChange={e => setArticolVal(e.target.value)}
                                className={`py-2 w-64 h-[4.5rem] px-2 resize-none rounded-lg outline-none shadow-sm ${ovArticol ? 'text-black bg-white' : 'bg-gray-300 text-gray-600 cursor-not-allowed'}`}
                            />
                            <div className='flex items-center justify-center'>
                                <button onClick={handleCancel} className='bg-red-500 text-white px-4 py-3 rounded-xl hover:bg-red-600'>
                                    Anulează
                                </button>
                            </div>
                        </div>
                    )}
                    {selectedPartId != "" && deleteRetete && (
                        <div className='flex gap-4'>
                            <div className='text-white self-center'>{selectedRowIdsDelete.length} selectate</div>
                            <div className='flex items-center justify-center'>
                                <button onClick={handleAcceptDeleteRetete} className='bg-rose-500 flex items-center justify-center gap-2 text-white hover:bg-rose-600 px-4 py-3 rounded-xl'>
                                    <FontAwesomeIcon icon={faX} /><span className="leading-none">Sterge</span>
                                </button>
                            </div>

                            <div className='flex items-center justify-center'>
                                <button onClick={handleCancel} className='bg-red-500 text-white px-4 py-3 rounded-xl hover:bg-red-600'>
                                    Anulează
                                </button>
                            </div>
                        </div>
                    )}
                    {selectedPartId != "" && showFurnizori && (
                        <div className='flex gap-4 items-center'>
                            <div className='text-white'>Tip:</div>
                            <div className='flex gap-2'>
                                <button
                                    onClick={() => changeFurnizoriType('materiale')}
                                    className={`px-3 py-2 rounded-lg ${furnizoriType === 'materiale' ? 'bg-cyan-600 text-white' : 'bg-white text-black'}`}
                                >
                                    Materiale
                                </button>
                                <button
                                    onClick={() => changeFurnizoriType('utilaje')}
                                    className={`px-3 py-2 rounded-lg ${furnizoriType === 'utilaje' ? 'bg-cyan-600 text-white' : 'bg-white text-black'}`}
                                >
                                    Utilaje
                                </button>
                            </div>

                            <div onClick={() => console.log(furnizori)} className='text-white'>Furnizor:</div>
                            <select
                                disabled={furnizoriLoading}
                                value={selectedFurnizor}
                                onChange={(e) => setSelectedFurnizor(e.target.value)}
                                className="py-2 min-w-56 px-2 text-black rounded-lg outline-none shadow-sm"
                            >
                                <option value="">{furnizoriLoading ? 'Se încarcă...' : 'Alege furnizor'}</option>
                                {furnizori.map(f => (
                                    <option key={`${f.id ?? f.name}`} value={f.id ?? f.name}>
                                        {f.name}
                                    </option>
                                ))}
                            </select>

                            {/* Placeholder – îl folosim în pasul următor pentru 'aplică pe toate' */}
                            <button
                                disabled={!selectedFurnizor}
                                className={`px-4 py-2 rounded-xl ${selectedFurnizor ? 'bg-green-500 hover:bg-green-600 text-white' : 'bg-gray-400 text-white cursor-not-allowed'}`}
                                onClick={async () => {
                                    try {
                                        await api.post(`/Santiere/aplicaFurnizorPeToate/${selectedPartId}`, {
                                            furnizor: selectedFurnizor
                                        }, { params: { type: furnizoriType } });
                                        // refresh UI
                                        setRefreshKey(prev => prev + 1);
                                    } catch (e) {
                                        console.error("❌ Eroare aplicare furnizor:", e);
                                    }
                                }}
                            >
                                Aplică pe toate
                            </button>

                            <button onClick={handleCancel} className='bg-red-500 text-white px-4 py-2 rounded-xl hover:bg-red-600'>
                                Anulează
                            </button>
                        </div>
                    )}
                    <input
                        type="text"
                        value={addOfertaPartInputValue}
                        onChange={(e) => setAddOfertaPartInputValue(e.target.value)}
                        className={`py-2 transition-all duration-300 text-center ${addOfertaPartInput ? "w-64" : "w-0"} text-black rounded-lg outline-none shadow-sm`}
                    />
                    {!deleteOfertaPart && !editOfertaPart && !editRepere && !actualizeazaRetete && !dubleazaRetete && !showFurnizori && !deleteRetete ?
                        <button onClick={() => handleAddOfertaPart()} className='bg-green-500 flex  items-center justify-center gap-2 text-white  hover:bg-green-600  px-4 py-2 rounded-xl'><FontAwesomeIcon className='' icon={faPlus} />Adaugă Lucrare</button>
                        :
                        deleteOfertaPart ?
                            <div className='flex gap-4'>
                                <button onClick={() => setDeleteOfertaPart(false)} className='bg-green-500 flex  items-center justify-center gap-2 text-white  hover:bg-green-600  px-4 py-2 rounded-xl'>Anluează</button>
                                <button onClick={() => deleteLucrare()} className='bg-red-500 flex  items-center justify-center gap-2 text-white  hover:bg-red-600  px-4 py-2 rounded-xl'><FontAwesomeIcon className='' icon={faX} /><span className="leading-none">Șterge Lucrarea</span></button>
                            </div>
                            :
                            editOfertaPart ?
                                <div className='flex gap-4'>
                                    <button onClick={() => handleAddOfertaPart()} className='bg-green-500 flex  items-center justify-center gap-2 text-white  hover:bg-green-600  px-4 py-2 rounded-xl'><FontAwesomeIcon className='' icon={faPlus} />Editează Lucrarea</button>
                                    <button onClick={() => handleCancel()} className='bg-red-500 flex  items-center justify-center gap-2 text-white  hover:bg-red-600  px-4 py-2 rounded-xl'><FontAwesomeIcon className='' icon={faX} /><span className="leading-none">Anulează</span></button>
                                </div>
                                :
                                ""
                    }
                    {addOfertaPartInput && !editOfertaPart && !deleteOfertaPart ?
                        <button onClick={() => handleCancel()} className='bg-red-500 flex  items-center justify-center gap-2 text-white  hover:bg-red-600  px-4 py-2 rounded-xl'><FontAwesomeIcon className='' icon={faCancel} />Anluează</button>
                        :
                        ""
                    }
                </div>
                <div className='flex gap-4'>
                    {selectedPartId != "" && !deleteOfertaPart && !editOfertaPart && !editRepere && !actualizeazaRetete && !dubleazaRetete && !showFurnizori && !deleteRetete ?
                        <div className='flex gap-4'>
                            <button onClick={() => handleFurnizori()} className='bg-cyan-600 flex items-center justify-center gap-2 text-white hover:bg-cyan-700 px-4 py-2 rounded-xl'><FontAwesomeIcon className='' icon={faScrewdriverWrench} /><span className="leading-none">Furnizori</span></button>
                            <button onClick={() => handleDubleazaRetete()} className='bg-amber-500 flex  items-center justify-center gap-2 text-white  hover:bg-amber-600  px-4 py-2 rounded-xl'><FontAwesomeIcon className='' icon={faCopy} /><span className="leading-none">Dubleazǎ Rețetele</span></button>
                            <button onClick={() => handleActualizeazaRetete()} className='bg-purple-500 flex  items-center justify-center gap-2 text-white  hover:bg-purple-600  px-4 py-2 rounded-xl'><FontAwesomeIcon className='' icon={faRotate} /><span className="leading-none">Actualizează Rețetele</span></button>
                            <button onClick={() => handleEditRepere()} className='bg-blue-500 flex  items-center justify-center gap-2 text-white  hover:bg-blue-600  px-4 py-2 rounded-xl'><FontAwesomeIcon className='' icon={faEdit} /><span className="leading-none">Editează Reperele</span></button>
                            <button onClick={() => handleEdit()} className='bg-green-500 flex  items-center justify-center gap-2  text-white  hover:bg-green-600  px-4 py-2 rounded-xl'><FontAwesomeIcon className='' icon={faEdit} />Editează</button>
                            <button onClick={() => handleDeleteRetete()} className='bg-rose-500 flex  items-center justify-center gap-2 text-white  hover:bg-rose-600  px-4 py-2 rounded-xl'><FontAwesomeIcon className='' icon={faTrash} /><span className="leading-none">Șterge Rețetele</span></button>
                            <button onClick={() => handleDelete()} className='bg-red-800 flex  items-center justify-center gap-2 text-white  hover:bg-red-900  px-4 py-2 rounded-xl'><FontAwesomeIcon className='' icon={faX} /><span className="leading-none">Șterge Lucrarea</span></button>
                        </div>
                        :
                        ""
                    }
                    {/* {!deleteOfertaPart &&
                        <button className='bg-red-500 flex  items-center justify-center gap-2 text-white  hover:bg-red-600  px-4 py-2 rounded-xl'><FontAwesomeIcon className='' icon={faX}/><span className="leading-none">Șterge Oferta</span></button>
                    } */}
                </div>
            </div>
            {
                selectedPartId != "" ?
                    <SantiereAddOfertaMain
                        //duvleazaRetete={dubleazaRetete}
                        selectedRowIds={selectedRowIds}
                        setSelectedRowIds={setSelectedRowIds}
                        dubleazaRetete={dubleazaRetete}
                        //delete
                        deleteRetete={deleteRetete}
                        selectedRowIdsDelete={selectedRowIdsDelete}
                        setSelectedRowIdsDelete={setSelectedRowIdsDelete}
                        setAcceptDelete={setAcceptDelete}
                        acceptDelete={acceptDelete}
                        //ofertare 
                        oferteParts={oferteParts}
                        ofertaId={ofertaId}
                        mainOfertaPartID={selectedPartId}
                        //ancora pentru dublare
                        chooseAnchor={chooseAnchor}
                        onAnchorChosen={(id) => { setAnchorId(id); setChooseAnchor(false); }}
                        anchorId={anchorId}
                        key={`${selectedPartId}-${refreshKey}`}
                    />
                    :
                    <SantiereAllPartsForExport
                        // oferteParts={oferteParts}
                        ofertaId={ofertaId}
                        key={`${ofertaId}`}
                    />
            }
        </div>

    )
}
