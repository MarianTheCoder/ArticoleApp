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
      articol_fr: "",
      descriere_reteta:"",
      descriere_reteta_fr:"",
      unitate_masura:"U",
      limba: "RO",
  });

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
        articol_fr: formData.articol_fr.trim(),
        descriere_reteta: formData.descriere_reteta.trim(),
        descriere_reteta_fr: formData.descriere_reteta_fr.trim(),
        limba: formData.limba.trim(),
      }
    };
  
    if(formDataToSend.formFirst.cod == '' || formDataToSend.formFirst.articol == '' || formDataToSend.formFirst.unitate_masura  == '' || formDataToSend.formFirst.clasa == '' || formDataToSend.formFirst.descriere_reteta == '' || formDataToSend.formFirst.limba == ''){
      alert("Toate campurile sunt obligatorii (fara FR daca nu e selectata limba FR)");
      return;
    }
    if(formDataToSend.formFirst.limba === "FR" && (formDataToSend.formFirst.articol_fr == '' || formDataToSend.formFirst.descriere_reteta_fr == '')){
      alert("Toate campurile sunt obligatorii (cu FR)");  
      return;
    }
      try {
        if(selectedEdit != null){
          await api.put(`/Retete/editReteta/${selectedEdit}`, formDataToSend);
          console.log('Reteta edited');
          setSelectedEdit(null);
        }
        else if(selectedDouble != null){
          await api.post(`/Retete/doubleReteta/${selectedDouble}`, formDataToSend);
          console.log('Reteta doubled');
          setSelectedDouble(null);
        }
        else{
          await api.post("/Retete/addReteta", formDataToSend);
        }
        setFormData({
          clasa: formData.clasa,
          cod:"",
          articol:"",
          articol_fr: "",
          descriere_reteta:"",
          descriere_reteta_fr:"",
          unitate_masura: formData.unitate_masura,
          limba: formData.limba,
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
    else if(name == "limba"){
      setFormData((prev) => ({ ...prev, [name]: value }));
      if(value == "RO"){
        setFormData((prev) => ({ ...prev, ["clasa"]: "Dezafectare"}));
      }
      else {
        setFormData((prev) => ({ ...prev, ["clasa"]: "Vrd"}));
      }
    }
    else setFormData((prev) => ({ ...prev, [name]: value }));
  };

  //
  // STATES FOR DELETE, EDIT
  //

  const [selectedDelete, setSelectedDelete] = useState(null);
  const [selectedEdit, setSelectedEdit] = useState(null);
  const [selectedDouble, setSelectedDouble] = useState(null);

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
      articol_fr: "",
      descriere_reteta:"",
      descriere_reteta_fr:"",
      unitate_masura:"U",
      limba: "RO",
    });
  }

  const cancelDouble = (e) => {
    e.preventDefault();
    setSelectedDouble(null);
    setFormData({
      clasa:"Regie",
      cod:"",
      articol:"",
      articol_fr: "",
      descriere_reteta:"",
      descriere_reteta_fr:"",
      unitate_masura:"U",
      limba: "RO",
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
        <div className="containerZ h-90h w-[97%] relative flex overflow-hidden  flex-col items-center rounded-lg">
            <div className='w-full containerWhiter '>
              <div className="flex justify-center flex-col items-center text-black  ">
                <form onSubmit={handleSubmit} className="w-full p-4 pt-4 px-2 md:px-4 xl:px-6 rounded-xl">
                  <div onClick={(console.log(selectedDelete , selectedEdit, selectedDouble))} className={`grid text-sm ${"grid-cols-[auto_auto_auto_1fr_1fr_1fr_1fr_auto_auto]"  } gap-2 md:gap-4 items-center`}>
                    {/* FR sau nu */}
                    <div className="flex flex-col items-center">
                      <label htmlFor="unit" className="col-span-1 font-medium text-black">
                        Limbă
                      </label>
                      <select
                        id="limba"
                        name="limba"
                        value={formData.limba}
                        onChange={handleChange}
                        className=" px-1 py-2 rounded-lg outline-none shadow-sm "
                      >
                        <option value="RO">RO</option>
                        <option value="FR">FR</option>
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
                          maxLength={20}
                          className="px-2 outline-none text-center py-2 max-w-40  rounded-lg shadow-sm "
                      />
                  </div>

                  {
                    formData.limba === "RO" ?
                    <div className="flex flex-col items-center">
                      <label htmlFor="unit" className="col-span-1 font-medium text-black">
                        Clasă
                      </label>
                      <select
                        id="clasa"
                        name="clasa"
                        value={formData.clasa}
                        onChange={handleChange}
                        className=" px-1 py-2 rounded-lg outline-none shadow-sm "
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
                      :
                    <div className="flex flex-col items-center">
                      <label htmlFor="unit" className="col-span-1 font-medium text-black">
                        Clasă
                      </label>
                      <select
                        id="clasa"
                        name="clasa"
                        value={formData.clasa}
                        onChange={handleChange}
                        className=" px-1 py-2 rounded-lg outline-none shadow-sm "
                      >
                        <option value="Gros œuvre - maçonnerie">Gros œuvre - maçonnerie</option>
                        <option value="Plâtrerie (plaque de plâtre)">Plâtrerie (plaque de plâtre)</option>
                        <option value="Vrd">Vrd</option>
                        <option value="Espace vert - aménagement extérieur">Espace vert - aménagement extérieur</option>
                        <option value="Charpente - bardage et couverture métallique">Charpente - bardage et couverture métallique</option>
                        <option value="Couverture - zinguerie">Couverture - zinguerie</option>
                        <option value="Étanchéité">Étanchéité</option>
                        <option value="Plomberie - sanitaire">Plomberie - sanitaire</option>
                        <option value="Chauffage">Chauffage</option>
                        <option value="Ventilation">Ventilation</option>
                        <option value="Climatisation">Climatisation</option>
                        <option value="Électricité">Électricité</option>
                        <option value="Charpente et ossature bois">Charpente et ossature bois</option>
                        <option value="Menuiserie extérieure">Menuiserie extérieure</option>
                        <option value="Menuiserie agencement intérieur">Menuiserie agencement intérieur</option>
                        <option value="Métallerie (acier - aluminium)">Métallerie (acier - aluminium)</option>
                        <option value="Store et fermeture">Store et fermeture</option>
                        <option value="Peinture - revêtement intérieur">Peinture - revêtement intérieur</option>
                        <option value="Ravalement peinture - revêtement extérieur">Ravalement peinture - revêtement extérieur</option>
                        <option value="Vitrerie - miroiterie">Vitrerie - miroiterie</option>
                        <option value="Carrelage et revêtement mural">Carrelage et revêtement mural</option>
                        <option value="Revêtement de sol (sauf carrelage)">Revêtement de sol (sauf carrelage)</option>
                        <option value="Ouvrages communs TCE">Ouvrages communs TCE</option>
                        <option value="Rénovation énergétique">Rénovation énergétique</option>
                      </select>
                  </div>
                  }
                  <div className="flex flex-col items-center">
                    <label  
                        className=" font-medium text-black"
                    >
                        Articol
                    </label>
                    <textarea
                        rows={3}
                        type="text"
                        id="articol"
                        name="articol"
                        value={formData.articol}
                        onChange={handleChange}
                        className="px-2 w-full outline-none resize-none   py-2  rounded-lg shadow-sm "
                  
                    />
                </div>
                <div className="flex flex-col items-center">
                    <label  
                        className=" font-medium text-black"
                    >
                        Descriere
                    </label>
                    <textarea
                        rows={3}
                        type="text"
                        id="descriere_reteta"
                        name="descriere_reteta"
                        value={formData.descriere_reteta}
                        onChange={handleChange}
                        className="px-2 w-full outline-none resize-none   py-2  rounded-lg shadow-sm "
                  
                    />
                </div>
                {/* PENTRU FRANCEZA SELECTED */}
                  <div className="flex flex-col items-center">
                    <label  
                        className=" font-medium text-black"
                    >
                        Articol FR
                    </label>
                    <textarea
                        rows={3}
                        type="text"
                        id="articol_fr"
                        name="articol_fr"
                        value={formData.articol_fr}
                        onChange={handleChange}
                        className="px-2 w-full outline-none resize-none   py-2  rounded-lg shadow-sm "
                  
                    />
                  </div>
                  <div className="flex flex-col items-center">
                      <label  
                          className=" font-medium text-black"
                      >
                          Descriere FR
                      </label>
                      <textarea
                          rows={3}
                          type="text"
                          id="descriere_reteta_fr"
                          name="descriere_reteta_fr"
                          value={formData.descriere_reteta_fr}
                          onChange={handleChange}
                          className="px-2 w-full outline-none resize-none   py-2  rounded-lg shadow-sm "
                    
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
                        <option value="Tonă">Tonă</option>
                        <option value="ens">ens</option>
                        <option value="j">j</option>
                      </select>
                  </div>
           
                  {
                      !selectedDelete && !selectedEdit && !selectedDouble ?

                      <div className="flex gap-2 items-center ">
                        <button type="submit" className="bg-green-500 hover:bg-green-600 text-black mt-6 px-4 py-2 flex  items-center rounded-lg"><FontAwesomeIcon icon={faPlus} className="pr-3"/> Încarcă</button>
                      </div>
                      :
                      selectedDelete ?
                        <div className="flex gap-2 items-center ">
                          <button onClick={(e) => deleteRow(e)} className="bg-red-500 hover:bg-red-600 text-black  mt-6 px-4 py-2 flex  items-center rounded-lg"><FontAwesomeIcon icon={faCancel} className="pr-3"/> Șterge</button>
                          <button onClick={(e) => cancelDelete(e)} className="bg-green-500 hover:bg-green-600 text-black  mt-6 px-4 py-2 flex  items-center rounded-lg">Anulează</button>
                        </div>
                      :
                      selectedDouble ? 

                        <div className="flex gap-2 items-center ">
                          <button type="submit"  className="bg-amber-500 hover:bg-amber-600 text-black  mt-6 px-4 py-2 flex  items-center rounded-lg"><FontAwesomeIcon icon={faPlus} className="pr-3"/>Dublează</button>
                          <button onClick={(e) => cancelDouble(e)} className="bg-red-500 hover:bg-red-600 text-black  mt-6 px-4 py-2 flex  items-center rounded-lg"> Anulează</button>
                        </div>
                      :
                        <div className="flex gap-2 items-center ">
                          <button  type="submit" className="bg-green-500 hover:bg-green-600 text-black  mt-6 px-4 py-2 flex  items-center rounded-lg"><FontAwesomeIcon icon={faPlus} className="pr-3"/>Editează</button>
                          <button  onClick={(e) => cancelEdit(e)} className="bg-red-500 hover:bg-red-600 text-black  mt-6 px-4 py-2 flex  items-center rounded-lg"> Anulează</button>
                        </div>
                  }
                  
                  </div>
                </form>
              </div>
              </div>
              {/* AICI JOS E TABELUL */}
              <div className="w-full h-full scrollbar-webkit overflow-hidden mt-6">
                  <RetetaTable cancelEdit = {cancelEdit} cancelDelete = {cancelDelete} selectedDouble = {selectedDouble} cancelDouble = {cancelDouble} setSelectedDouble = {setSelectedDouble} reloadKey = {reloadKey} selectedDelete = {selectedDelete} setFormData = {setFormData}  setSelectedDelete = {setSelectedDelete} selectedEdit = {selectedEdit}  setSelectedEdit = {setSelectedEdit}/>
              </div>
        </div>
      </div>
  );
}
