import { faCancel, faEdit, faPlus, faX } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React, { useContext, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom';
import api from '../../../api/axiosAPI';
import SantiereAddOfertaMain from './SantiereAddOfertaMain';



export default function Oferte_PartsWrapper({ofertaId}) {

    const [oferteParts, setOferteParts] = useState(null);
    //check sa vedem ce este selectat
    const [selectedPartId, setSelectedPartId] = useState("");

    
    //input true and value
    const [addOfertaPartInput, setAddOfertaPartInput] = useState(null);
    const [addOfertaPartInputValue, setAddOfertaPartInputValue] = useState("");

    //edit / delete
    const [deleteOfertaPart, setDeleteOfertaPart] = useState(false);
    const [editOfertaPart, setEditOfertaPart] = useState(false);

    const fetchOfertePartsForThisSantier = async () => { 
        try {
            const res = await api.get(`/Santiere/getOfertePartsForThisSantier/${ofertaId}`);
            setOferteParts(res.data.parts);
        } catch (error) {
            console.log(error);            
        }
    }

    const addOfertaPart = async () => { 
        if(addOfertaPartInputValue.trim() == ""){    
            alert("Numele lucrării nu trebuie sa fie gol");
            return;
        }
        const partExists = oferteParts.some(part => part.name.toLowerCase() === addOfertaPartInputValue.trim().toLowerCase());
        if (partExists && !editOfertaPart) {
          alert("Această lucrare există deja.");
          return;
        }
        try {
            if(editOfertaPart){
                const res = await api.put(`/Santiere/editOfertaPart/${selectedPartId}`, {name:addOfertaPartInputValue});
            }
            else{
                const res = await api.post(`/Santiere/addOfertaPartToTheSantier/${ofertaId}`, {name:addOfertaPartInputValue});
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
    const handleDelete = () =>{
        handleCancel();
        setDeleteOfertaPart(true);
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
    const handleEdit = () =>{
        console.log(oferteParts , selectedPartId)
        const part = oferteParts.find(part => part.id === parseInt(selectedPartId));
        if(part){
            setAddOfertaPartInputValue(part.name);
            setAddOfertaPartInput(true);
            setEditOfertaPart(true);
        }
        setDeleteOfertaPart(false);
    }

    const handleSelectPartID = (e) => { 
        setDeleteOfertaPart(false);
        if(editOfertaPart){
            setEditOfertaPart(false);
            setAddOfertaPartInputValue("");
            setAddOfertaPartInput(false);
        }
        setSelectedPartId(e.target.value);
    }

    const handleAddOfertaPart = () => { 
        if(addOfertaPartInput == true){
            addOfertaPart();
        }
        else{
            setDeleteOfertaPart(false);
            setEditOfertaPart(false)
            setAddOfertaPartInputValue("");
            setAddOfertaPartInput(true);
        }
    }

    const handleCancel = () => { 
        setDeleteOfertaPart(false);
        setEditOfertaPart(false);
        setAddOfertaPartInputValue("");
        setAddOfertaPartInput(false);
    }

    useEffect(() => {
        fetchOfertePartsForThisSantier();
    }, [])
    


  return (
    <div className='relative h-full w-full grid overflow-hidden p-4 grid-rows-[auto_1fr] '>
        <div className=' px-8 p-4 bg-[#26415f] rounded-xl flex w-full justify-between'>
            <div className='flex gap-4  items-center'>
                <label htmlFor="" className=''>Alege o lucrare:</label>
                <select
                    id="clasa_material"
                    name="clasa_material"
                    value={selectedPartId}
                    onChange={(e) => handleSelectPartID(e)} // Update the selected value
                    className="py-2 text-center min-w-32 px-2 text-black rounded-lg outline-none shadow-sm "
                    >
                    <option value="">Nimic Selectat</option>
                    {oferteParts && oferteParts.map(part => (
                        <option key={part.id} value={part.id}>
                            {part.name}
                        </option>
                    ))}
                </select>
                <input 
                    type="text"
                    value={addOfertaPartInputValue}
                    onChange={(e) => setAddOfertaPartInputValue(e.target.value)}
                    className={`py-2 transition-all duration-300 text-center ${addOfertaPartInput ? "w-64" : "w-0"} text-black rounded-lg outline-none shadow-sm`}
                />
                {!deleteOfertaPart && !editOfertaPart ?
                    <button onClick={() => handleAddOfertaPart()} className='bg-green-500 flex  items-center justify-center gap-2 text-white  hover:bg-green-600  px-4 py-2 rounded-xl'><FontAwesomeIcon className='' icon={faPlus}/>Adaugă Lucrare</button>
                :
                deleteOfertaPart ?
                    <div className='flex gap-4'>
                        <button onClick={() => setDeleteOfertaPart(false)} className='bg-green-500 flex  items-center justify-center gap-2 text-white  hover:bg-green-600  px-4 py-2 rounded-xl'>Anluează</button>
                        <button onClick={() => deleteLucrare()} className='bg-red-500 flex  items-center justify-center gap-2 text-white  hover:bg-red-600  px-4 py-2 rounded-xl'><FontAwesomeIcon className='' icon={faX}/><span className="leading-none">Șterge Lucrarea</span></button>
                    </div>
                : 
                    <div className='flex gap-4'>
                        <button onClick={() => handleAddOfertaPart()} className='bg-green-500 flex  items-center justify-center gap-2 text-white  hover:bg-green-600  px-4 py-2 rounded-xl'><FontAwesomeIcon className='' icon={faPlus}/>Editează Lucrarea</button>
                        <button onClick={() => handleCancel()} className='bg-red-500 flex  items-center justify-center gap-2 text-white  hover:bg-red-600  px-4 py-2 rounded-xl'><FontAwesomeIcon className='' icon={faX}/><span className="leading-none">Anulează</span></button>
                    </div>
                }
                { addOfertaPartInput && !editOfertaPart && !deleteOfertaPart ?
                        <button onClick={() => handleCancel()} className='bg-red-500 flex  items-center justify-center gap-2 text-white  hover:bg-red-600  px-4 py-2 rounded-xl'><FontAwesomeIcon className='' icon={faCancel}/>Anluează</button>
                    :
                        ""
                }
                </div>
                <div className='flex gap-4'>
                    {selectedPartId != "" && !deleteOfertaPart && !editOfertaPart ?
                            <div className='flex gap-4'>
                                <button onClick={() => handleEdit()} className='bg-green-500 flex  items-center justify-center gap-2  text-white  hover:bg-green-600  px-4 py-2 rounded-xl'><FontAwesomeIcon className='' icon={faEdit}/>Editează</button>
                                <button onClick={() => handleDelete()} className='bg-red-500 flex  items-center justify-center gap-2 text-white  hover:bg-red-600  px-4 py-2 rounded-xl'><FontAwesomeIcon className='' icon={faX}/><span className="leading-none">Șterge Lucrarea</span></button>
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
                    selectedPartId != "" ? <SantiereAddOfertaMain mainOfertaPartID = {selectedPartId}  key={`${selectedPartId}`}/>
                    :
                    ""
                }
    </div>

  )
}
