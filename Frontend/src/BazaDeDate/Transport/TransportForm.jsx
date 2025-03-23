import { faCancel, faPlus } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React, {  useRef, useState } from 'react'
import api from '../../api/axiosAPI';
import TransportTable from './TransportTable';

export default function TransportForm() {

  const [formData, setFormData] = useState({
      cod_transport:"",
      clasa_transport:"",
      transport:"",
      unitate_masura:"oră",
      cost_unitar:""
  });

  const [reloadKey, setReloadKey] = useState(0);

  const handleReload = () => {
    setReloadKey(prevKey => prevKey + 1);  // Trigger child re-render by changing the key
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    const form = {
      cod_transport: formData.cod_transport.trim(),
      clasa_transport: formData.clasa_transport.trim(),
      transport: formData.transport.trim(),
      cost_unitar: formData.cost_unitar.trim(),
      unitate_masura:formData.unitate_masura.trim(),
    };
    if(form.cod_transport === "" || form.transport === "" || form.cost_unitar === "" || form.clasa_transport === "" || form.unitate_masura === ""){
      alert("All fields are required");
      return;
    }
    try {
      if(selectedEdit != null){
        await api.post("/Transport/EditTransport", {form:form, id:selectedEdit});
        console.log('Transport edited');
        setSelectedEdit(null);
      }
      else{
        await api.post("/Transport/SetTransport", {form:form});
        console.log('Transport added');
      }
      setFormData({
        cod_transport:"",
        clasa_transport:"",
        transport:"",
        cost_unitar:"",
        unitate_masura:"oră",
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
     if(name === "cost_unitar"){
      if (/^\d*\.?\d{0,2}$/.test(value)) {
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
      cod_transport:"",
      clasa_transport:"",
      transport:"",
      cost_unitar:"",
      unitate_masura:"oră",
    });
  }

  const deleteRow = async (e) => {
    e.preventDefault();
    try {
        const response = await api.delete(`/Transport/DeleteTransport/${selectedDelete}`);
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
        <form onSubmit={handleSubmit} className="w-full p-6 pt-4 px-12 rounded-xl shadow-xl">
          <div className="grid grid-cols-[auto_auto_1fr_auto_auto_auto_auto] xxxl:gap-12 md:gap-6 xl:gap-8 items-center">
        {/* photourl */}
          <div className="flex flex-col items-center ">
              <label htmlFor="code" className=" font-medium text-black">
                  Cod
              </label>
              <input
                  ref={firstInputRef}
                  type="text"
                  id="cod_transport"
                  name="cod_transport"
                  value={formData.cod_transport}
                  onChange={handleChange}
                  maxLength={12}
                  className="px-2 outline-none text-center py-2 max-w-48  rounded-lg shadow-sm "
                  placeholder=""
              />
          </div>
          <div className="flex flex-col items-center ">
              <label htmlFor="code" className=" font-medium text-black">
                  Clasă
              </label>
              <input
                  ref={firstInputRef}
                  type="text"
                  id="clasa_transport"
                  name="clasa_transport"
                  value={formData.clasa_transport}
                  onChange={handleChange}
                  maxLength={55}
                  className="px-2 outline-none text-center py-2 max-w-64  rounded-lg shadow-sm "
              />
          </div>
            {/* Description Input */}
            <div className="flex flex-col items-center">
              <label
                  htmlFor="description"
                  className=" font-medium text-black"
              >
                  Transport
              </label>
                <textarea
                  rows={3}
                  type="text"
                  id="transport"
                  name="transport"
                  value={formData.transport}
                  onChange={handleChange}
                  className="px-2 w-full outline-none resize-none   py-2  rounded-lg shadow-sm "
            
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
                <option value="oră">Oră</option>
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
          {
              !selectedDelete && !selectedEdit ?

              <div className="flex gap-2 items-center ">
                <button type="submit" className="bg-green-500 hover:bg-green-600 text-black text-lg mt-6 px-6 py-2 flex  items-center rounded-lg"><FontAwesomeIcon icon={faPlus} className="pr-3"/>Încarcă</button>
              </div>
              :
              !selectedEdit ?

              <div className="flex gap-2 items-center ">
                <button onClick={(e) => deleteRow(e)} className="bg-red-500 hover:bg-red-600 text-black text-lg mt-6 px-4 py-2 flex  items-center rounded-lg"><FontAwesomeIcon icon={faCancel} className="pr-3"/> Șterge</button>
                <button onClick={(e) => cancelDelete(e)} className="bg-green-500 hover:bg-green-600 text-black text-lg mt-6 px-4 py-2 flex  items-center rounded-lg">Anulează</button>
              </div>
              :
              <div className="flex gap-2 items-center ">
                <button  type="submit" className="bg-green-500 hover:bg-green-600 text-black text-lg mt-6 px-6 py-2 flex  items-center rounded-lg"><FontAwesomeIcon icon={faPlus} className="pr-3"/> Editează</button>
                <button  onClick={(e) => cancelEdit(e)} className="bg-red-500 hover:bg-red-600 text-black text-lg mt-6 px-6 py-2 flex  items-center rounded-lg"> Anulează</button>
              </div>
          }
          
          </div>
        </form>
      </div>
      </div>
      {/* AICI JOS E TABELUL */}
      <div className="w-full h-full scrollbar-webkit overflow-hidden mt-6">
          <TransportTable cancelEdit = {cancelEdit} cancelDelete = {cancelDelete} reloadKey = {reloadKey} selectedDelete = {selectedDelete} setFormData = {setFormData}  setSelectedDelete = {setSelectedDelete} selectedEdit = {selectedEdit}  setSelectedEdit = {setSelectedEdit}/>
      </div>
    </>
  );
}
