import { faCancel, faPlus } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React, {  useRef, useState } from 'react'
import api from '../../api/axiosAPI';
import ManoperaTable from './ManoperaTable';

export default function ManoperaForm() {

  const [formData, setFormData] = useState({
      cod_COR:"",
      ocupatie:"",
      ocupatie_fr:"",
      unitate_masura:"h",
      cost_unitar:"",
      cantitate:"",
      limba: "RO",
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
      ocupatie_fr: formData.ocupatie_fr.trim(),
      unitate_masura: formData.unitate_masura.trim(),
      cost_unitar: formData.cost_unitar.trim(),
      cantitate: formData.cantitate.trim(),
      limba: formData.limba.trim(),
    };
    if(form.cod_COR === "" || form.ocupatie === "" || form.limba === "" || form.unitate_masura === "" || form.cost_unitar === "" || form.cantitate === ""){
      alert("Toate campurile sunt obligatorii (fara FR daca nu e selectata limba FR)");
      return;
    }
    if(form.limba === "FR" && form.ocupatie_fr === ""){
      alert("Toate campurile sunt obligatorii (cu FR)");  
      return;
    }
    if(form.cod_COR.length !== 6){
      alert("Codul COR trebuie sa aiba 6 caracatere!");
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
        if(selectedDouble != null){
          setSelectedDouble(null);  
        }
      }
      setFormData({
        cod_COR:"",
        ocupatie:"",
        unitate_masura:"h",
        cost_unitar:"",
        cantitate:"",
        limba: form.limba,
        ocupatie_fr:"",
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
      if (/^\d*\.?\d{0,3}$/.test(value)) {
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
  const [selectedDouble, setSelectedDouble] = useState(null);
  

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
      unitate_masura:"h",
      cost_unitar:"",
      cantitate:"",
      limba: "RO",
      ocupatie_fr:"",
    });
  }

  const cancelDouble = (e) => {
    e.preventDefault();
    setSelectedDouble(null);
    setFormData({
      cod_COR:"",
      ocupatie:"",
      unitate_masura:"h",
      cost_unitar:"",
      cantitate:"",
      limba: "RO",
      ocupatie_fr:"",
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
    <div className='w-full containerWhiter'>
      <div className="flex justify-center items-center text-black  ">
        <form onSubmit={handleSubmit} className="w-full p-6 pt-4 md:px-4 xl:px-8 rounded-xl shadow-xl">
          <div className="grid grid-cols-[auto_auto_1fr_1fr_auto_auto_auto_auto] xxxl:gap-6 md:gap-2 xl:gap-4 items-center">
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
              />
          </div>
            {/* Description Input */}
            <div className="flex flex-col items-center">
              <label
                  htmlFor="description"
                  className=" font-medium text-black"
              >
                  Ocupație
              </label>
              <input
                  type="text"
                  id="ocupatie"
                  name="ocupatie"
                  value={formData.ocupatie}
                  onChange={handleChange}
                  className="px-2 w-full outline-none text-center py-2  rounded-lg shadow-sm "
              />
          </div>
          <div className="flex flex-col items-center">
              <label
                  htmlFor="description"
                  className=" font-medium text-black"
              >
                  Ocupație FR
              </label>
              <input
                  type="text"
                  id="ocupatie_fr"
                  name="ocupatie_fr"
                  value={formData.ocupatie_fr}
                  onChange={handleChange}
                  className="px-2 w-full outline-none text-center py-2  rounded-lg shadow-sm "
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
                <option value="h">h</option>
                <option value="j">j</option>
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
                  className=" px-2 py-2 max-w-24 text-center w-full outline-none rounded-lg shadow-sm  [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
          </div>
          {
              !selectedDelete && !selectedEdit && !selectedDouble ?

              <div className="flex gap-2 items-center ">
                <button type="submit" className="bg-green-500 hover:bg-green-600 text-black text-lg mt-6 px-6 py-2 flex  items-center rounded-lg"><FontAwesomeIcon icon={faPlus} className="pr-3"/>Încarcă</button>
              </div>
              :
              selectedDelete ?
                <div className="flex gap-2 items-center ">
                  <button onClick={(e) => deleteRow(e)} className="bg-red-500 hover:bg-red-600 text-black text-lg mt-6 px-4 py-2 flex  items-center rounded-lg"><FontAwesomeIcon icon={faCancel} className="pr-3"/>Șterge</button>
                  <button onClick={(e) => cancelDelete(e)} className="bg-green-500 hover:bg-green-600 text-black text-lg mt-6 px-4 py-2 flex  items-center rounded-lg">Anulează</button>
                </div>
              :
              selectedDouble ?
                <div className="flex gap-2 items-center ">
                  <button type="submit"  className="bg-amber-500 hover:bg-amber-600 text-black  mt-6 px-4 py-2 flex  items-center rounded-lg"><FontAwesomeIcon icon={faPlus} className="pr-3"/>Dublează</button>
                  <button onClick={(e) => cancelDouble(e)} className="bg-red-500 hover:bg-red-600 text-black  mt-6 px-4 py-2 flex  items-center rounded-lg"> Anulează</button>
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
          <ManoperaTable cancelEdit = {cancelEdit} selectedDouble = {selectedDouble} cancelDouble = {cancelDouble} setSelectedDouble = {setSelectedDouble}  cancelDelete = {cancelDelete} reloadKey = {reloadKey} selectedDelete = {selectedDelete} setFormData = {setFormData}  setSelectedDelete = {setSelectedDelete} selectedEdit = {selectedEdit}  setSelectedEdit = {setSelectedEdit}/>
      </div>
    </>
  );
}
