import { faCancel, faPlus } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React, {  useRef, useState } from 'react'
import api from '../../api/axiosAPI';


export default function ManoperaForm() {

  const [formData, setFormData] = useState({
      cod_COR:"",
      ocupatie:"",
      unitate_masura:"ora",
      cost_unitar:"",
      cantitate:"",
  });

  const [reloadKey, setReloadKey] = useState(0);

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
    if(name === "cantitate"){
      if (/^\d*$/.test(value)) {
        setFormData((prev) => ({ ...prev, [name]: value }));
      }
    }
    else if(name === "cost_unitar"){
      if (/^\d*\.?\d{0,2}$/.test(value)) {
        setFormData((prev) => ({ ...prev, [name]: value }));
      }
    }
    else if(name === "cod_COR"){
        if(/^\d*$/.test(value)){
            setFormData((prev) => ({ ...prev, [name]: value }));
        }
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
        <div className='h-screen w-full flex items-center justify-center'>
            <div className="container  w-4/5 h-90h relative flex  flex-col items-center rounded-lg">


    <div className='w-full containerWhiter'>
      <div className="flex justify-center items-center text-black  ">
        <form onSubmit={handleSubmit} className="w-full p-6 pt-4 px-12 rounded-xl shadow-xl">
          <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] xxxl:gap-12 md:gap-6 xl:gap-8 items-center">
        {/* photourl */}
          <div className="flex flex-col items-center ">
              <label htmlFor="code" className=" font-medium text-black">
                  Cod COR
              </label>
              <input
                  ref={firstInputRef}
                  type="text"
                  id="cod_COR"
                  name="cod_COR"
                  value={formData.cod_COR}
                  onChange={handleChange}
                  maxLength={6}
                  className="px-2 outline-none text-center py-2 max-w-32  rounded-lg shadow-sm "
                  placeholder="Enter COR"
              />
          </div>
            {/* Description Input */}
            <div className="flex flex-col items-center">
              <label
                  htmlFor="description"
                  className=" font-medium text-black"
              >
                  Ocupatie
              </label>
              <input
                  type="text"
                  id="ocupatie"
                  name="ocupatie"
                  value={formData.ocupatie}
                  onChange={handleChange}
                  className="px-2 w-full outline-none text-center py-2  rounded-lg shadow-sm "
                  placeholder="Enter Ocupatie"
              />
          </div>
           <div className="flex flex-col items-center">
            {/* Unit Dropdown */}
              <label htmlFor="unit" className="col-span-1 font-medium text-black">
                Unitate
              </label>
              <select
                id="unitate_masura"
                name="unitate_masura"
                value={formData.unitate_masura}
                onChange={handleChange}
                className="px-4 py-2 border  rounded-lg outline-none shadow-sm "
              >
                <option value="unit1">Ora</option>
              </select>
            </div>
          <div className="flex flex-col items-center">
              <label
                  htmlFor="description"
                  className=" font-medium text-black"
              >
                  Cost Unitar
              </label>
              <input
                  type="text" 
                  id="cost_unitar"
                  name="cost_unitar"
                  maxLength={8}
                  value={formData.cost_unitar}
                  onChange={handleChange}
                  className=" px-2 py-2  text-center max-w-32 w-full outline-none rounded-lg shadow-sm "
                  placeholder="Cost"
              />
          </div>
          <div className="flex flex-col items-center">
              <label
                  htmlFor="description"
                  className=" font-medium text-black"
              >
                  Cantitate
              </label>
              <input
                  type="text"
                  maxLength={5}
                  inputMode="numeric"
                  id="cantitate"
                  name="cantitate"
                  value={formData.cantitate}
                  onChange={handleChange}
                  className=" px-2 py-2 max-w-32 text-center w-full outline-none rounded-lg shadow-sm  [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  placeholder="00"
              />
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
