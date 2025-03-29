import { faArrowDown, faCancel, faL, faPlus } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React, {  useContext, useRef, useState } from 'react'
import api from '../../api/axiosAPI';
import {RetetaContext, RetetaProvider } from '../../context/RetetaContext';
import RetetaTable from './RetetaTable.jsx';


export default function ManoperaForm() {


  const [formData, setFormData] = useState({
      clasa:"Regie",
      cod:"",
      articol:"",
      unitate_masura:"U"
  });
  
  const [isOpen, setIsOpen] = useState(false);

  const [reloadKey, setReloadKey] = useState(0);
 

  const handleReload = () => {
    setReloadKey(prevKey => prevKey + 1);  // Trigger child re-render by changing the key
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log(formData)
    const formDataToSend = {
      formFirst:{
        cod: formData.cod.trim(),
        clasa: formData.clasa.trim(),
        unitate_masura: formData.unitate_masura.trim(),
        articol: formData.articol.trim(),
      }
    };
  
    if(formDataToSend.formFirst.cod === "" || formDataToSend.formFirst.clasa === "" || formDataToSend.formFirst.unitate_masura === "" || formDataToSend.formFirst.articol === ""){
      alert("All fields are required");
      return;
    }
      try {
        if(selectedEdit != null){
          await api.put(`/Retete/editReteta/${selectedEdit}`, formDataToSend);
          console.log('Reteta edited');
          setSelectedEdit(null);
        }
        else{
          await api.post("/Retete/addReteta", formDataToSend);
        }
        setFormData({
          clasa: "Regie",
          cod: "",
          articol: "",
          unitate_masura: "U",
        });
        handleReload();
    } catch (error) {
        console.error('Upload error:', error);
    }
  };
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    if(name === "cod"){
        setFormData((prev) => ({ ...prev, [name]: value.toUpperCase() }));
    }
    else setFormData((prev) => ({ ...prev, [name]: value }));
  };

  //
  // STATES FOR DELETE, EDIT
  //

  const [selectedDelete, setSelectedDelete] = useState(null);
  const [selectedEdit, setSelectedEdit] = useState(null);

  const cancelDelete = (e) => {
    e.preventDefault();
    setSelectedDelete(null);
  }

  const cancelEdit = (e) => {
    e.preventDefault();
    setSelectedEdit(null);
    setFormData({
      clasa:"Regie",
      cod:"",
      articol:"",
      unitate_masura:"U"
    });
  }

  const deleteRow = async (e) => {
    e.preventDefault();
    console.log(selectedDelete);
    try {
        const response = await api.delete(`/Retete/deleteReteta/${selectedDelete}`);
        console.log(response);
        setSelectedDelete(null);
        handleReload();
        
    } catch (error) {
        console.error('Error deleting data:', error);
    }
  }

  return (
  
     <div className='h-screen w-full flex items-center justify-center'>
        <div className="containerZ h-90h w-90w relative flex overflow-hidden  flex-col items-center rounded-lg">
            <div className='w-full containerWhiter '>
              <div className="flex justify-center flex-col items-center text-black  ">
                <form onSubmit={handleSubmit} className="w-full p-6 pt-4 px-2 md:px-4 xl:px-6 rounded-xl">
                  <div className="grid grid-cols-[auto_auto_1fr_auto_auto] gap-2 md:gap-4 xl:gap-6 items-center">

                    {/* Clasa Dropdown */}
                    <div className="flex flex-col items-center">
                      <label htmlFor="unit" className="col-span-1 font-medium text-black">
                        Clasă
                      </label>
                      <select
                        id="clasa"
                        name="clasa"
                        value={formData.clasa}
                        onChange={handleChange}
                        className=" px-1 py-2  text-center rounded-lg outline-none shadow-sm "
                      >
                        <option value="Regie">Regie</option>
                        <option value="Dezafectare">Dezafectare</option>
                        <option value="Amenajări interioare">Amenajări interioare</option>
                        <option value="Electrice">Electrice</option>
                        <option value="Sanitare">Sanitare</option>
                        <option value="Termice">Termice</option>
                        <option value="Climatizare Ventilație">Climatizare Ventilație</option>
                        <option value="Amenajări exterioare">Amenajări exterioare</option>
                        <option value="Tâmplărie">Tâmplărie</option>
                        <option value="Mobilă">Mobilă</option>
                        <option value="Confecții Metalice">Confecții Metalice</option>
                        <option value="Prelucrări Ceramice/Piatră Naturală">Prelucrări Ceramice/Piatră Naturală</option>
                        <option value="Ofertare/Devizare">Ofertare/Devizare</option>
                        <option value="Management de proiect">Management de proiect</option>
                        <option value="Reparații">Reparații</option>
                      </select>
                  </div>
                  <div className="flex flex-col items-center ">
                      <label className=" font-medium text-black">
                          Cod 
                      </label>
                      <input
                          type="text"
                          id="cod"
                          name="cod"
                          value={formData.cod}
                          onChange={handleChange}
                          maxLength={10}
                          className="px-2 outline-none text-center py-2 max-w-32  rounded-lg shadow-sm "
                      />
                  </div>
                    {/* Description Input */}
                    <div className="flex flex-col items-center">
                      <label className=" font-medium text-black">
                          Articol
                      </label>
                      <input
                          type="text"
                          id="articol"
                          name="articol"
                          value={formData.articol}
                          onChange={handleChange}
                          className="px-2 w-full outline-none text-center py-2  rounded-lg shadow-sm "
            
                      />
                  </div>
                  {/* input form */}
                  <div className="flex flex-col items-center">
                      <label htmlFor="unit" className=" font-medium text-black">
                        Unitate 
                      </label>
                      <select
                        id="unitate_masura"
                        name="unitate_masura"
                        value={formData.unitate_masura}
                        onChange={handleChange}
                        className=" px-2 py-2   rounded-lg outline-none shadow-sm "
                      >
                        <option value="U">U</option>
                        <option value="m">m</option>
                        <option value="m²">m²</option>
                        <option value="m³">m³</option>
                        <option value="kg">kg</option>
                        <option value="Set">Set</option>
                        <option value="Rolă">Rolă</option>
                      </select>
                  </div>
           
                  {
                      !selectedDelete && !selectedEdit ?

                      <div className="flex gap-2 items-center ">
                        <button type="submit" className="bg-green-500 hover:bg-green-600 text-black mt-6 px-6 py-2 flex  items-center rounded-lg"><FontAwesomeIcon icon={faPlus} className="pr-3"/> Încarcă</button>
                      </div>
                      :
                      !selectedEdit ?

                      <div className="flex gap-2 items-center ">
                        <button onClick={(e) => deleteRow(e)} className="bg-red-500 hover:bg-red-600 text-black text-lg mt-6 px-4 py-2 flex  items-center rounded-lg"><FontAwesomeIcon icon={faCancel} className="pr-3"/> Șterge</button>
                        <button onClick={(e) => cancelDelete(e)} className="bg-green-500 hover:bg-green-600 text-black text-lg mt-6 px-4 py-2 flex  items-center rounded-lg">Anulează</button>
                      </div>
                      :
                      <div className="flex gap-2 items-center ">
                        <button  type="submit" className="bg-green-500 hover:bg-green-600 text-black text-lg mt-6 px-6 py-2 flex  items-center rounded-lg"><FontAwesomeIcon icon={faPlus} className="pr-3"/>Editează</button>
                        <button  onClick={(e) => cancelEdit(e)} className="bg-red-500 hover:bg-red-600 text-black text-lg mt-6 px-6 py-2 flex  items-center rounded-lg"> Anulează</button>
                      </div>
                  }
                  
                  </div>
                </form>
              </div>
              </div>
              {/* AICI JOS E TABELUL */}
              <div className="w-full h-full scrollbar-webkit overflow-hidden mt-6">
                  <RetetaTable cancelEdit = {cancelEdit} cancelDelete = {cancelDelete} reloadKey = {reloadKey} selectedDelete = {selectedDelete} setFormData = {setFormData}  setSelectedDelete = {setSelectedDelete} selectedEdit = {selectedEdit}  setSelectedEdit = {setSelectedEdit}/>
              </div>
        </div>
      </div>
  );
}
