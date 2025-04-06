import { faCancel, faPlus } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React, {  useRef, useState } from 'react'
import api from '../../api/axiosAPI';
import defaultPhoto from '../../assets/no-image-icon.png';
import UtilajeTable from './UtilajeTable'


export default function UtilajeForm() {

  const [formData, setFormData] = useState({
    clasa_utilaj:"",
    utilaj:"",
    descriere_utilaj:"",
    status_utilaj:"Ca Nou",
    cost_amortizare:"",
    pret_utilaj:"",
    unitate_masura:"oră",
    cantitate:""
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
    formDataSend.append("clasa_utilaj", formData.clasa_utilaj.trim())
    formDataSend.append("utilaj", formData.utilaj.trim())
    formDataSend.append("descriere_utilaj", formData.descriere_utilaj.trim())
    formDataSend.append("status_utilaj", formData.status_utilaj.trim())
    formDataSend.append("cost_amortizare", formData.cost_amortizare.trim())
    formDataSend.append("pret_utilaj", formData.pret_utilaj.trim())
    formDataSend.append("unitate_masura", formData.unitate_masura.trim())
    formDataSend.append("cantitate", formData.cantitate.trim())
    formDataSend.append("poza", selectedFile)
    if(formData.clasa_utilaj.trim() === "" || formData.utilaj.trim() === "" || formData.descriere_utilaj.trim() === "" ||
       formData.status_utilaj.trim() === "" || formData.cost_amortizare.trim() === "" || formData.pret_utilaj.trim() === "" ||
       formData.cantitate.trim() === "")
    {
      alert("All fields are required");
      return;
    }
    // if(form.cod_COR.length !== 6){
    //   alert("Cod COR must have 6 digits");
    //   return;
    // }
    try {
      if(selectedEdit != null){
        await api.put(`/Utilaje/api/utilaje/${selectedEdit}`, formDataSend, {
          headers: {
              'Content-Type': 'multipart/form-data',
          },
        })
        console.log('Utilaj edited');
        setSelectedEdit(null);
      }
      else{
        await api.post('/Utilaje/api/utilaje', formDataSend, {
          headers: {
              'Content-Type': 'multipart/form-data',
          },
        });
        console.log("Utilaj added")
      }
      setFormData({
        clasa_utilaj:"",
        utilaj:"",
        descriere_utilaj:"",
        status_utilaj:"Ca Nou",
        cost_amortizare:"",
        pret_utilaj:"",
        unitate_masura:"oră",
        cantitate:""
      });
      setSelectedFile(null);
      setPreview(defaultPhoto);
      handleReload();
    } catch (error) {
      console.error('Upload error:', error);
      firstInputRef.current.focus();
    }
  };
  

  const handleChange = (e) => {
    const { name, value } = e.target;
    if(name === "cost_amortizare"){
      if (/^\d*\.?\d{0,2}$/.test(value)){
        setFormData((prev) => ({ ...prev, [name]: value }));
      }
    }
    else if(name === "pret_utilaj"){
      if (/^\d*\.?\d{0,2}$/.test(value)){
            setFormData((prev) => ({ ...prev, [name]: value }));
        }
    }
    else if(name === "cantitate"){
      if (/^\d*$/.test(value)){
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
        clasa_utilaj:"",
        utilaj:"",
        descriere_utilaj:"",
        status_utilaj:"Ca Nou",
        cost_amortizare:"",
        pret_utilaj:"",
        unitate_masura:"oră",
        cantitate:""
    });
    setPreview(defaultPhoto);
    setSelectedFile(null);
  }

  const deleteRow = async (e) => {
    e.preventDefault();
    try {
        const response = await api.delete(`/Utilaje/api/utilaje/${selectedDelete}`);
        console.log(response);
        setSelectedDelete(null);
        handleReload();
        
    } catch (error) {
        console.error('Error deleting data:', error);
    }
  }

  //Refernce to focus back on first input after submiting
  const firstInputRef = useRef(null);

  //Handle Photo preview and saving
  const handleFileChange = (e) => {
    const file = e.target.files[0];
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
        <form onSubmit={handleSubmit} className="w-full text-base p-4 px-6 rounded-lg shadow-xl">
          <div className="grid grid-cols-[auto_auto_auto_1fr_auto_auto_auto_auto_auto_auto] xxxl:gap-4 md:gap-2 xl:gap-3 items-center">
            
          {/* photourl */}
          <div className="flex flex-col items-center ">
            <div className=' items-center gap-4 flex w-full'>
              <div className="w-10 sm:w-12  md:w-12 lg:w-14 xl:w-16 xxl:w-20 xxxl:w-24 aspect-square">
                 <img onClick={handleButtonClick} onDragOver={(e) => e.preventDefault()} onDrop={handleDrop}  className='rounded-xl  cursor-pointer object-contain w-full h-full ' src={preview == null ? "" : preview}></img>
              </div>
                <input id="hiddenFileInput" type="file" onChange={handleFileChange} className="hidden"/>
              </div>
            </div>

          {/* Clasa Utilaj */}
          <div className="flex flex-col items-center ">
              <label htmlFor="code" className=" font-medium text-black">
                  Clasă Utilaj
              </label>
              <input
                  type="text"
                  id="clasa_utilaj"
                  name="clasa_utilaj"
                  value={formData.clasa_utilaj}
                  onChange={handleChange}
                  className="px-2 outline-none text-center py-2 max-w-40  rounded-lg shadow-sm "
              />
          </div>

            {/* Utilaj */}
            <div className="flex flex-col items-center ">
              <label htmlFor="code" className=" font-medium text-black">
                  Utilaj
              </label>
              <textarea
                  rows={3}
                  type="text"
                  id="utilaj"
                  name="utilaj"
                  value={formData.utilaj}
                  onChange={handleChange}
                  className="px-2 w-full outline-none resize-none   py-2  rounded-lg shadow-sm "
            
              />
            </div>
            {/* Descriere */}
            <div className="flex flex-col items-center ">
                <label htmlFor="code" className=" font-medium text-black">
                    Descriere
                </label>
                <textarea
                  type="text"
                  rows={3}
                  id="descriere_utilaj"
                  name="descriere_utilaj"
                  value={formData.descriere_utilaj}
                  onChange={handleChange}
                  className="px-2 w-full resize-none outline-none py-2  rounded-lg shadow-sm "
              />
            </div>

          {/* Status Input */}
          <div className="flex flex-col items-center">
              <label htmlFor="unit" className="font-medium text-black">
                Status
              </label>
              <select
                id="status_utilaj"
                name="status_utilaj"
                value={formData.status_utilaj}
                onChange={handleChange}
                className=" py-2 border text-center  rounded-lg outline-none shadow-sm "
              >
                <option value="Nou">Nou</option>
                <option value="Ca Nou">Ca Nou</option>
                <option value="Bun">Bun</option>
                <option value="Recondiționat">Recondiționat</option>
                <option value="Utilizat">Utilizat</option>
                <option value="Defect">Defect</option>
              </select>
            </div>
          <div className="flex flex-col items-center">
              <label htmlFor="unit" className="font-medium text-black">
                Unitate
              </label>
              <select
                id="unitate_masura"
                name="unitate_masura"
                value={formData.unitate_masura}
                onChange={handleChange}
                className="px-4 py-2 border  rounded-lg outline-none shadow-sm "
              >
                <option value="U">U</option>
                <option value="oră">Oră</option>
              </select>
            </div>
            {/* cost amortizare */}
          <div className="flex flex-col items-center">
              <label className=" font-medium text-black">
                  Cost Amortizare
              </label>
              <input
                  type="text" 
                  id="cost_amortizare"
                  name="cost_amortizare"
                  maxLength={8}
                  value={formData.cost_amortizare}
                  onChange={handleChange}
                  className=" px-2 py-2  text-center max-w-40 w-full outline-none rounded-lg shadow-sm "
              />
          </div>

           {/* Pret */}
            <div className="flex flex-col items-center">
              <label className=" font-medium text-black">
                 Preț
              </label>
              <input
                  type="text" 
                  id="pret_utilaj"
                  name="pret_utilaj"
                  maxLength={8}
                  value={formData.pret_utilaj}
                  onChange={handleChange}
                  className=" px-2 py-2  text-center max-w-32 w-full outline-none rounded-lg shadow-sm "
              />
            </div>

            {/* Cantitate */}
            <div className="flex flex-col items-center">
            <label className=" font-medium text-black">
                  Cantitate
              </label>
              <input
                  type="text" 
                  id="cantitate"
                  name="cantitate"
                  maxLength={8}
                  value={formData.cantitate}
                  onChange={handleChange}
                  className=" px-2 py-2  text-center max-w-32 w-full outline-none rounded-lg shadow-sm "
              />
          </div>
          {
              !selectedDelete && !selectedEdit ?

              <div className="flex text-base  justify-center items-center ">
                <button type="submit" className="bg-green-500 hover:bg-green-600 text-black  mt-6 px-2 py-2 flex justify-center  items-center rounded-lg"><FontAwesomeIcon icon={faPlus} className="pr-2"/>Încarcă</button>
              </div>
              :
              !selectedEdit ?

              <div className="flex gap-2 text-base justify-center items-center ">
                <button onClick={(e) => deleteRow(e)} className="bg-red-500 hover:bg-red-600 text-black  mt-6 px-4 py-2 flex  items-center rounded-lg"><FontAwesomeIcon icon={faCancel} className="pr-2"/>Șterge</button>
                <button onClick={(e) => cancelDelete(e)} className="bg-green-500 hover:bg-green-600 text- text mt-6 px-4 py-2 flex  items-center rounded-lg">Anulează</button>
              </div>
              :
              <div className="flex gap-2  text-base justify-center items-center ">
                <button  type="submit" className="bg-green-500 hover:bg-green-600 text-black  mt-6 px-2 py-2 flex  items-center rounded-lg"><FontAwesomeIcon icon={faPlus} className="pr-2"/>Editează</button>
                <button  onClick={(e) => cancelEdit(e)} className="bg-red-500 hover:bg-red-600 text-black  mt-6 px-2 py-2 flex  items-center rounded-lg">Anulează</button>
              </div>
          }
          
          </div>
        </form>
      </div>
      </div>
      {/* AICI JOS E TABELUL */}
      <div className="w-full h-full scrollbar-webkit overflow-hidden mt-6">
          <UtilajeTable setSelectedFile ={setSelectedFile} setPreview = {setPreview} cancelEdit = {cancelEdit} cancelDelete = {cancelDelete} reloadKey = {reloadKey} selectedDelete = {selectedDelete} setFormData = {setFormData}  setSelectedDelete = {setSelectedDelete} selectedEdit = {selectedEdit}  setSelectedEdit = {setSelectedEdit}/>
      </div>
    </>
  );
}
