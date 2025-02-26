import { faCancel, faPlus } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React, {  useRef, useState } from 'react'
import api from '../../api/axiosAPI';
import RetetaManopera from './RetetaManopera';


export default function ManoperaForm() {

  const [formData, setFormData] = useState({
      clasa:"Regie",
      cod:"",
      articol:"",
      unitate_masura:""
  });

  const [reloadKey, setReloadKey] = useState(0);
  const [clicked, setClicked] = useState(0);

  const handleReload = () => {
    setReloadKey(prevKey => prevKey + 1);  // Trigger child re-render by changing the key
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    const form = {
      cod_COR: formData.cod_COR.trim(),
      ocupatie: formData.ocupatie.trim(),
      unitate_masura: formData.unitate_masura.trim(),
      cost_unitar: formData.cost_unitar.trim(),
      cantitate: formData.cantitate.trim(),
    };
    if(form.cod_COR === "" || form.ocupatie === "" || form.unitate_masura === "" || form.cost_unitar === "" || form.cantitate === ""){
      alert("All fields are required");
      return;
    }
    if(form.cod_COR.length !== 6){
      alert("Cod COR must have 6 digits");
      return;
    }
    try {
      if(selectedEdit != null){
        await api.post("/Manopera/EditManopera", {form:form, id:selectedEdit});
        console.log('Manopera edited');
        setSelectedEdit(null);
      }
      else{
        await api.post("/Manopera/SetManopera", {form:form});
        console.log('Manopera added');
      }
      setFormData({
        cod_COR:"",
        ocupatie:"",
        unitate_masura:"ora",
        cost_unitar:"",
        cantitate:"",
      });
      firstInputRef.current.focus();
      handleReload();
    } catch (error) {
      console.error('Upload error:', error);
      firstInputRef.current.focus();
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
      cod_COR:"",
      ocupatie:"",
      unitate_masura:"ora",
      cost_unitar:"",
      cantitate:"",
    });
  }

  const deleteRow = async (e) => {
    e.preventDefault();
    try {
        const response = await api.delete(`/Manopera/DeleteManopera/${selectedDelete}`);
        console.log(response);
        setSelectedDelete(null);
        handleReload();
        
    } catch (error) {
        console.error('Error deleting data:', error);
    }
  }

  //Refernce to focus back on first input after submiting
  const firstInputRef = useRef(null);

  return (
    <>
     <div className='h-screen w-full grid grid-cols-[1fr_2fr] gap-16 px-32 items-center justify-center'>
      <div className="container h-90h relative flex  flex-col items-center rounded-lg">
        <div className=' flex h-full flex-col items-center w-full'>
          <div className="flex containerWhiter py-4 w-full justify-evenly  gap-3 items-center">
                    <button onClick={() => setClicked((prev) => prev == 1 ? 0 : 1)} className={`bg-white text-black  px-3 py-2 rounded-xl ${clicked == 1 ? "bg-gray-200 outline-2 outline" : ""} hover:bg-gray-200`}>Manopera</button>
                    <button onClick={() => setClicked((prev) => prev == 2 ? 0 : 2)} className={`bg-white text-black  px-3 py-2 rounded-xl ${clicked == 2 ? "bg-gray-200 outline-2 outline" : ""} hover:bg-gray-200`}>Materiale</button>
                    <button onClick={() => setClicked((prev) => prev == 3 ? 0 : 3)} className={`bg-white text-black  px-3 py-2 rounded-xl ${clicked == 3 ? "bg-gray-200 outline-2 outline" : ""} hover:bg-gray-200`}>Transport</button>
                    <button onClick={() => setClicked((prev) => prev == 4 ? 0 : 4)} className={`bg-white text-black  px-3 py-2 rounded-xl ${clicked == 4 ? "bg-gray-200 outline-2 outline" : ""} hover:bg-gray-200`}>Utilaje</button>
              </div>
            
            {
              clicked == 1 ?
              <RetetaManopera/>
              :
              ""
            }
          </div>
        </div>
        <div className="container h-90h relative flex  flex-col items-center rounded-lg">
            <div className='w-full containerWhiter '>
              <div className="flex justify-center flex-col items-center text-black  ">
                <form onSubmit={handleSubmit} className="w-full p-6 pt-4 px-12 rounded-xl">
                  <div className="grid grid-cols-[auto_auto_1fr_auto_auto_auto] xxxl:gap-12 md:gap-6 xl:gap-8 items-center">
                    {/* Clasa Dropdown */}
                    <div className="flex flex-col items-center">
                      <label htmlFor="unit" className="col-span-1 font-medium text-black">
                        Clasa
                      </label>
                      <select
                        id="clasa"
                        name="clasa"
                        value={formData.clasa}
                        onChange={handleChange}
                        className=" px-1 py-2 border text-center rounded-lg outline-none shadow-sm "
                      >
                        <option value="Regie">Regie</option>
                        <option value="Dezafectare">Dezafectare</option>
                        <option value="Amenajari interioare">Amenajari interioare</option>
                        <option value="Electrice">Electrice</option>
                        <option value="Sanitare">Sanitare</option>
                        <option value="Termice">Termice</option>
                        <option value="Climatizare Ventilatie">Climatizare Ventilatie</option>
                        <option value="Amenajari exterioare">Amenajari exterioare</option>
                        <option value="Tamplarie">Tamplarie</option>
                        <option value="Mobila">Mobila</option>
                        <option value="Confectii Metalice">Confectii Metalice</option>
                        <option value="Prelucrari Ceramice/Piatra Naturala">Prelucrari Ceramice/Piatra Naturala</option>
                        <option value="Ofertare/Devizare">Ofertare/Devizare</option>
                        <option value="Management de proiect">Management de proiect</option>
                        <option value="Reparatii">Reparatii</option>
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
                          maxLength={6}
                          className="px-2 outline-none text-center py-2 max-w-32  rounded-lg shadow-sm "
                          placeholder="Enter Cod"
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
                          placeholder="Enter Articol"
                      />
                  </div>
                  <div className="flex flex-col items-center">
                      <label htmlFor="unit" className=" font-medium text-black">
                        Unitate Masura
                      </label>
                      <select
                        id="unitate_masura"
                        name="unitate_masura"
                        value={formData.unitate_masura}
                        onChange={handleChange}
                        className=" px-2 py-2 border  rounded-lg outline-none shadow-sm "
                      >
                        <option value="m^2">m^2</option>
                        <option value="m^3">m^3</option>
                      
                      </select>
                  </div>
           
                  {
                      !selectedDelete && !selectedEdit ?

                      <div className="flex gap-2 items-center ">
                        <button type="submit" className="bg-green-500 hover:bg-green-600 text-black text-lg mt-6 px-6 py-2 flex  items-center rounded-lg"><FontAwesomeIcon icon={faPlus} className="pr-3"/> Submit</button>
                      </div>
                      :
                      !selectedEdit ?

                      <div className="flex gap-2 items-center ">
                        <button onClick={(e) => deleteRow(e)} className="bg-red-500 hover:bg-red-600 text-black text-lg mt-6 px-4 py-2 flex  items-center rounded-lg"><FontAwesomeIcon icon={faCancel} className="pr-3"/> Delete</button>
                        <button onClick={(e) => cancelDelete(e)} className="bg-green-500 hover:bg-green-600 text-black text-lg mt-6 px-4 py-2 flex  items-center rounded-lg">Cancel</button>
                      </div>
                      :
                      <div className="flex gap-2 items-center ">
                        <button  type="submit" className="bg-green-500 hover:bg-green-600 text-black text-lg mt-6 px-6 py-2 flex  items-center rounded-lg"><FontAwesomeIcon icon={faPlus} className="pr-3"/> Submit</button>
                        <button  onClick={(e) => cancelEdit(e)} className="bg-red-500 hover:bg-red-600 text-black text-lg mt-6 px-6 py-2 flex  items-center rounded-lg"> Cancel</button>
                      </div>
                  }
                  
                  </div>
                </form>
              </div>
              </div>
              {/* AICI JOS E TABELUL */}
              <div className="w-full h-full scrollbar-webkit overflow-hidden mt-6">
                  {/* <ManoperaTable cancelEdit = {cancelEdit} cancelDelete = {cancelDelete} reloadKey = {reloadKey} selectedDelete = {selectedDelete} setFormData = {setFormData}  setSelectedDelete = {setSelectedDelete} selectedEdit = {selectedEdit}  setSelectedEdit = {setSelectedEdit}/> */}
              </div>
        </div>
      </div>
    </>
  );
}
