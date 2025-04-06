import { faCancel, faPlus } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React, {  useRef, useState } from 'react'
import api from '../../api/axiosAPI';
import defaultPhoto from '../../assets/no-image-icon.png';
import MaterialeTable from './MaterialeTable'


export default function MaterialeForm() {

  const [formData, setFormData] = useState({
      furnizor:"",
      tip_material:"De Bază",
      clasa_material:"Dezafectare",
      cod_produs:"",
      denumire_produs:"",
      descriere_produs:"",
      unitate_masura:"U",
      cost_unitar:"",
      cost_preferential:"",
      pret_vanzare:"",
  });

  //Photo handlers
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(defaultPhoto);

  const [reloadKey, setReloadKey] = useState(0);

  const handleReload = () => {
    setReloadKey(prevKey => prevKey + 1);  // Trigger child re-render by changing the key
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    const formDataSend = new FormData();
    formDataSend.append("furnizor", formData.furnizor.trim())
    formDataSend.append("tip_material", formData.tip_material.trim())
    formDataSend.append("clasa_material", formData.clasa_material.trim())
    formDataSend.append("cod_produs", formData.cod_produs.trim())
    formDataSend.append("denumire_produs", formData.denumire_produs.trim())
    formDataSend.append("descriere_produs", formData.descriere_produs.trim())
    formDataSend.append("poza", selectedFile)
    formDataSend.append("unitate_masura", formData.unitate_masura.trim())
    formDataSend.append("cost_unitar", formData.cost_unitar.trim())
    formDataSend.append("cost_preferential", formData.cost_preferential.trim())
    formDataSend.append("pret_vanzare", formData.pret_vanzare.trim())
    if(formData.furnizor.trim() === "" || formData.clasa_material.trim() === "" || formData.cod_produs.trim() === "" ||
       formData.denumire_produs.trim() === "" || formData.descriere_produs.trim() === "" || formData.unitate_masura.trim() === "" ||
       formData.cost_unitar.trim() === "" || formData.cost_preferential.trim() === "" || formData.pret_vanzare.trim() === "" || formData.tip_material.trim() === ""
      )
    {
      alert("All fields are required");
      return;
    }

    try {
      if(selectedEdit != null){
        await api.put(`/Materiale/api/materiale/${selectedEdit}`, formDataSend, {
          headers: {
              'Content-Type': 'multipart/form-data',
          },
        })
        console.log('Manopera edited');
        setSelectedEdit(null);
      }
      else{
        await api.post('/Materiale/api/Materiale', formDataSend, {
          headers: {
              'Content-Type': 'multipart/form-data',
          },
        });
        console.log("material added")
      }
      setFormData({
        furnizor:"",
        tip_material:"De Bază",
        clasa_material:"Dezafectare",
        cod_produs:"",
        denumire_produs:"",
        descriere_produs:"",
        unitate_masura:"U",
        cost_unitar:"",
        cost_preferential:"",
        pret_vanzare:"",
      });
      setSelectedFile(null);
      setPreview(defaultPhoto);
      handleReload();
    } catch (error) {
      console.error('Upload error:', error);
    }
  };
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    if(name === "cost_preferential"){
      if (/^\d*\.?\d{0,2}$/.test(value)){
        setFormData((prev) => ({ ...prev, [name]: value }));
      }
    }
    else if(name === "cost_unitar"){
      if (/^\d*\.?\d{0,2}$/.test(value)) {
        setFormData((prev) => ({ ...prev, [name]: value }));
      }
    }
    else if(name === "pret_vanzare"){
      if (/^\d*\.?\d{0,2}$/.test(value)){
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
      furnizor:"",
      tip_material:"De Bază",
      clasa_material:"Dezafectare",
      cod_produs:"",
      denumire_produs:"",
      descriere_produs:"",
      unitate_masura:"U",
      cost_unitar:"",
      cost_preferential:"",
      pret_vanzare:"",
    });
    setPreview(defaultPhoto);
    setSelectedFile(null);
  }

  const deleteRow = async (e) => {
    e.preventDefault();
    try {
        const response = await api.delete(`/Materiale/api/materiale/${selectedDelete}`);
        console.log(response);
        setSelectedDelete(null);
        handleReload();
        
    } catch (error) {
        console.error('Error deleting data:', error);
    }
  }


  //Handle Photo preview and saving
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    console.log(file);
    if (file) {
      setSelectedFile(file);
      setPreview(URL.createObjectURL(file)); // Show image preview
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    console.log(file);
    if (file && file.type.startsWith("image/")) {
      setSelectedFile(file)
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleButtonClick = () => {
    document.getElementById('hiddenFileInput').click();
  };


  return (
    <>
    <div className='w-full containerWhiter'>
      <div className="flex justify-center items-center text-black  ">
        <form onSubmit={handleSubmit} className="w-full text-sm xxxl:text-[0.8rem] p-4  rounded-lg shadow-xl">
          <div className="grid grid-cols-[auto_auto_auto_auto_auto_auto_1fr_auto_auto_auto_auto_auto]  md:gap-2 xl:gap-3 items-center">
            
          {/* photourl */}
          <div className="flex flex-col items-center ">
            <div className=' items-center gap-4 flex w-full'>
              <div className="w-10 sm:w-12 relative   md:w-12 lg:w-14 xl:w-16 xxl:w-20 xxxl:w-24 aspect-square">
                <img onClick={handleButtonClick} onDragOver={(e) => e.preventDefault()} onDrop={handleDrop}  className='rounded-xl  cursor-pointer object-contain w-full h-full ' src={preview == null ? "" : preview}></img>
              </div>
                
                <input  id="hiddenFileInput" type="file" onChange={handleFileChange} className="hidden"/>
              </div>
            </div>
            {/* clasa materiale */}
            <div className="flex flex-col items-center">
                      <label htmlFor="unit" className="col-span-1 font-medium text-black">
                        Clasă Materiale
                      </label>
                      <select
                        id="clasa_material"
                        name="clasa_material"
                        value={formData.clasa_material}
                        onChange={handleChange}
                        className="  py-2   text-center rounded-lg outline-none shadow-sm "
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
            <div className="flex flex-col items-center">
              <label htmlFor="unit" className="font-medium text-black">
                Tip
              </label>
              <select
                id="tip_material"
                name="tip_material"
                value={formData.tip_material}
                onChange={handleChange}
                className=" py-2 border text-center  rounded-lg outline-none shadow-sm "
              >
                <option value="De Bază">De Bază</option>
                <option value="De Finisaj">De Finisaj</option>
                <option value="Auxiliar">Auxiliare</option>
                <option value="Consumabil">Consumabile</option>
              </select>
            </div>
          {/* Furnizor */}
          <div className="flex flex-col items-center ">
              <label htmlFor="code" className=" font-medium text-black">
                  Furnizor
              </label>
              <input
                  
                  type="text"
                  id="furnizor"
                  name="furnizor"
                  value={formData.furnizor}
                  onChange={handleChange}
                  className="px-2 outline-none text-center py-2 max-w-40  rounded-lg shadow-sm "
              />
          </div>
          {/* cod produs */}
          <div className="flex flex-col items-center ">
              <label htmlFor="code" className=" font-medium text-black">
                  Cod Produs
              </label>
              <input
                  type="text"
                  id="cod_produs"
                  name="cod_produs"
                  value={formData.cod_produs}
                  onChange={handleChange}
                  className="px-2 outline-none text-center py-2 max-w-32  rounded-lg shadow-sm "
              />
          </div>

          {/* Denumire Input */}
          <div className="flex flex-col items-center">
              <label
                  
                  className=" font-medium text-black"
              >
                  Denumire
              </label>
              <textarea
                  rows={3}
                  type="text"
                  id="denumire_produs"
                  name="denumire_produs"
                  value={formData.denumire_produs}
                  onChange={handleChange}
                  className="px-2 w-full outline-none resize-none   py-2  rounded-lg shadow-sm "
            
              />
          </div>

          {/* Descriere */}
          <div className="flex flex-col items-center">
              <label
                  
                  className=" font-medium text-black"
              >
                  Descriere
              </label>
              <textarea
                  type="text"
                  rows={3}
                  id="descriere_produs"
                  name="descriere_produs"
                  value={formData.descriere_produs}
                  onChange={handleChange}
                  className="px-2 w-full resize-none outline-none py-2  rounded-lg shadow-sm "
              />
          </div>

            {/* Unit Dropdown */}
           <div className="flex flex-col items-center">
              <label htmlFor="unit" className="font-medium text-black">
                Unitate
              </label>
              <select
                id="unitate_masura"
                name="unitate_masura"
                value={formData.unitate_masura}
                onChange={handleChange}
                className=" py-2 border text-center  rounded-lg outline-none shadow-sm "
              >
                <option value="U">U</option>
                <option value="m">m</option>
                <option value="m²">m²</option>
                <option value="m³">m³</option>
                <option value="kg">kg</option>
                <option value="Set">Set</option>
                <option value="Rola">Rola</option>
           
              </select>
            </div>

            {/* cost unitar */}
          <div className="flex flex-col items-center">
              <label
                  
                  className=" font-medium text-black"
              >
                  Cost 
              </label>
              <input
                  type="text" 
                  id="cost_unitar"
                  name="cost_unitar"
                  maxLength={8}
                  value={formData.cost_unitar}
                  onChange={handleChange}
                  className=" px-2 py-2  text-center max-w-24 w-full outline-none rounded-lg shadow-sm "
                  placeholder="Unitar"
              />
          </div>

           {/* cost unitar */}
            <div className="flex flex-col items-center">
              <label
                  
                  className=" font-medium text-black"
              >
                Cost 
              </label>
              <input
                  type="text" 
                  id="cost_preferential"
                  name="cost_preferential"
                  maxLength={8}
                  value={formData.cost_preferential}
                  onChange={handleChange}
                  className=" px-2 py-2  text-center max-w-24 w-full outline-none rounded-lg shadow-sm "
                  placeholder="Preferential"
              />
            </div>

            {/* cost unitar */}
            <div className="flex flex-col items-center">
            <label
                  
                  className=" font-medium text-black"
              >
                  Preț
              </label>
              <input
                  type="text" 
                  id="pret_vanzare"
                  name="pret_vanzare"
                  maxLength={8}
                  value={formData.pret_vanzare}
                  onChange={handleChange}
                  className=" px-2 py-2  text-center max-w-24 w-full outline-none rounded-lg shadow-sm "
              />
          </div>
          {
              !selectedDelete && !selectedEdit ?

              <div className="flex text-base xxxl:text-[0.8rem]  justify-center items-center ">
                <button type="submit" className="bg-green-500 hover:bg-green-600 text-black  mt-6 px-2 py-2 flex justify-center  items-center rounded-lg"><FontAwesomeIcon icon={faPlus} className="pr-2"/> Încarcă</button>
              </div>
              :
              !selectedEdit ?

              <div className="flex gap-2 text-base justify-center xxxl:text-[0.8rem] items-center ">
                <button onClick={(e) => deleteRow(e)} className="bg-red-500 hover:bg-red-600 text-black  mt-6 px-4 py-2 flex  items-center rounded-lg"><FontAwesomeIcon icon={faCancel} className="pr-2"/>Șterge</button>
                <button onClick={(e) => cancelDelete(e)} className="bg-green-500 hover:bg-green-600 text- text mt-6 px-4 py-2 flex  items-center rounded-lg">Anulează</button>
              </div>
              :
              <div className="flex gap-2  text-base justify-center items-center xxxl:text-[0.8rem] ">
                <button  type="submit" className="bg-green-500 hover:bg-green-600 text-black  mt-6 px-2 py-2 flex  items-center rounded-lg"><FontAwesomeIcon icon={faPlus} className="pr-2"/> Editează</button>
                <button  onClick={(e) => cancelEdit(e)} className="bg-red-500 hover:bg-red-600 text-black  mt-6 px-2 py-2 flex  items-center rounded-lg"> Anulează</button>
              </div>
          }
          
          </div>
        </form>
      </div>
      </div>
      {/* AICI JOS E TABELUL */}
      <div className="w-full h-full scrollbar-webkit overflow-hidden mt-6">
          <MaterialeTable setSelectedFile ={setSelectedFile} setPreview = {setPreview} cancelEdit = {cancelEdit} cancelDelete = {cancelDelete} reloadKey = {reloadKey} selectedDelete = {selectedDelete} setFormData = {setFormData}  setSelectedDelete = {setSelectedDelete} selectedEdit = {selectedEdit}  setSelectedEdit = {setSelectedEdit}/>
      </div>
    </>
  );
}
