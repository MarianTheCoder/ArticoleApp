import React, { useEffect, useState } from 'react'
import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCancel, faL, faPenToSquare } from '@fortawesome/free-solid-svg-icons';
import api from '../../../api/axiosAPI';
import { useNavigate, useParams } from 'react-router-dom';

export default function Prezentare() {

  const [formData, setFormData] = useState({
    nume:"",
    beneficiar:"",
    adresa:"",
    email:"",
    telefon:"",
    creatDe:"",
    aprobatDe:"",
    detalii_executie:"",
    latitudine:47.1690109360525,
    longitudine:27.594116580043583,
  });

  const {idSantier , limbaUser} = useParams();

  const navigate = useNavigate();


  useEffect(() => {
    fetchData();
  }, [])

    const fetchData = async () => {
        try {
            const response = await api.get(`/Santiere/getSantiereDetailsSantierID/${idSantier}`);
            let data = response.data.santierDetails[0];
            let name = response.data.name;
            // console.log(data);
            setFormData({
                nume: name,
                beneficiar: data.beneficiar,
                adresa: data.adresa,
                email: data.email,
                telefon: data.telefon,
                creatDe: data.creatDe,
                aprobatDe: data.aprobatDe,
                detalii_executie: data.detalii_executie,
                latitudine: data.latitudine != '' ? data.latitudine : 47.1690109360525,
                longitudine: data.longitudine != '' ? data.longitudine : 27.594116580043583,
            });
        } catch (error) {
            console.error("Error fetching data:", error);
        }
    }

   const [isDisabled, setIsDisabled] = useState(true);
   const [isDisabledDeleteSantier, setIsDisabledDeleteSantier] = useState(true);
   const [stergeSantierParola , setstergeSantierParola] = useState("");

    const handleDeleteSantier = async () =>{
        if(!isDisabled){
            setIsDisabled(true);
            fetchData();
        }
        if(isDisabledDeleteSantier == true){
            setIsDisabledDeleteSantier(false);
        }
        else if(stergeSantierParola == "53124"){
            try {
                const res = await api.delete(`/Santiere/deleteEntireSantier/${idSantier}`);
                navigate('/logedUser');
            } catch (error) {
                console.log(error);
            }
        }
        else{
            alert("Cod Incorect");
            return;
        }
    }


    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
        if (isDisabled) {
            setIsDisabled(false);
            return;
        }
        else {
            setIsDisabled(true);
        }
        try {
            await api.put(`/Santiere/updateSantierDetails/${idSantier}`, {
                ...formData,
            });
            fetchData();
            console.log("Data saved successfully!");
        } catch (error) {
            console.error("Error saving data:", error);
        }
    }

    const cancelEdit = () => {
        setIsDisabled(true);
        fetchData();
    };

    useEffect(() => {
        document.addEventListener('click', handleClickOutside);
        return () => {
            document.removeEventListener('click', handleClickOutside);
        };
    }, []);

    const handleClickOutside = (event) => {
        if (!event.target.closest('.dropdown-container')) {
            setstergeSantierParola("")
            setIsDisabledDeleteSantier(true);
        }
    };


  return (
    <div className='h-full w-full text-black p-8 grid grid-rows-[auto_1fr] gap-4'>
        <div className='w-full h-auto p-6 px-4 rounded-xl grid grid-cols-[auto_0.7fr_0.7fr_1fr_0.7fr_1fr_auto] gap-4 items-center  bg-white'>  
            {/* nume snatier , beneficiar, google maps, locatia scrisa , persoana responsabila , detalii executie care se pune la pdf */}
            <div className="flex flex-col items-center">
              <label htmlFor="code" className=" font-medium text-black">
                  Limbă
              </label>
              <input
                  disabled={true}
                  value={limbaUser}
                  className={`px-2 w-24 outline outline-1 text-center py-2 rounded-lg shadow-lg outline-gray-300 `}                  
              />
          </div>
            <div className="flex flex-col items-center">
              <label htmlFor="code" className=" font-medium text-black">
                  Nume șantier
              </label>
              <input
                  disabled={isDisabled}
                  type="text"
                  id="nume"
                  name="nume"
                  value={formData.nume}
                  onChange={handleChange}
                  className={`px-2 w-full outline outline-1 text-center py-2 rounded-lg shadow-lg ${isDisabled ? "outline-gray-300" : "outline-green-500"} `}                  
              />
          </div>
          <div className="flex flex-col items-center">
              <label htmlFor="code" className=" font-medium text-black">
                  Beneficiar
              </label>
              <input
                  disabled={isDisabled}
                  type="text"
                  id="beneficiar"
                  name="beneficiar"
                  value={formData.beneficiar}
                  onChange={handleChange}
                  className={`px-2 w-full outline outline-1 text-center py-2 rounded-lg shadow-lg ${isDisabled ? "outline-gray-300" : "outline-green-500"} `}              />
          </div>
          <div className="flex flex-col items-center">
              <label htmlFor="code" className=" font-medium text-black">
                  Email
              </label>
              <input
                  disabled={isDisabled}
                  type="text"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`px-2 w-full outline outline-1 text-center py-2 rounded-lg shadow-lg ${isDisabled ? "outline-gray-300" : "outline-green-500"} `}              />
          </div>
          <div className="flex flex-col items-center">
              <label htmlFor="code" className=" font-medium text-black">
                  Telefon
              </label>
              <input
                  disabled={isDisabled}
                  type="text"
                  id="telefon"
                  name="telefon"
                  value={formData.telefon}
                  onChange={handleChange}
                  className={`px-2 w-full outline outline-1 text-center py-2 rounded-lg shadow-lg ${isDisabled ? "outline-gray-300" : "outline-green-500"} `}              />
          </div>
          <div className="flex flex-col items-center">
              <label htmlFor="code" className=" font-medium text-black">
                  Adresa
              </label>
              <input
                  disabled={isDisabled}
                  type="text"
                  id="adresa"
                  name="adresa"
                  value={formData.adresa}
                  onChange={handleChange}
                  className={`px-2 w-full outline outline-1 text-center py-2 rounded-lg shadow-lg ${isDisabled ? "outline-gray-200" : "outline-green-400"} `}
              />
          </div>
          <div className='h-full flex items-end p-2 gap-4 text-3xl '>
            <FontAwesomeIcon className={`text-green-500 hover:text-green-600 cursor-pointer ${isDisabled ? "pr-12" : ""}`} onClick={() => handleSave()} icon={faPenToSquare}/>
            {!isDisabled ?           
                <FontAwesomeIcon className='text-red-500 hover:text-red-600 hover:cursor-pointer' onClick={() => cancelEdit()} icon={faCancel}/>
                :
                ""
            }
            </div>
        </div>
        <div className='w-full h-full rounded-xl grid grid-cols-[1fr_1fr] gap-4'>
            <div className='w-full h-full grid grid-rows-[1fr_auto]  rounded-lg  gap-4 '>
                <div className='bg-white rounded-lg  p-6 flex flex-col gap-4'>
                    <p className=' font-medium'>Detalii Șantier:</p>
                    <textarea  disabled={isDisabled} value={formData.detalii_executie} name='detalii_executie' onChange={handleChange}  className={`p-2 px-4 w-full h-full outline outline-1 resize-none rounded-lg shadow-lg ${isDisabled ? "outline-gray-200" : "outline-green-400"} `}
                    >
                    
                    </textarea>
                    <div className='w-full flex gap-4 items-center justify-center'>
                        <label htmlFor="latitudine" className="">Latitudine:</label>
                        <input
                            disabled={isDisabled}
                            type="text"
                            id="latitudine"
                            name="latitudine"
                            value={formData.latitudine}
                            onChange={handleChange}
                            className={`px-2 outline outline-1 text-center py-2 rounded-lg shadow-lg ${isDisabled ? "outline-gray-300" : "outline-green-500"} w-full`} 
                        />
                            <label htmlFor="latitudine" className="">Longitudine:</label>
                        <input
                            disabled={isDisabled}
                            type="text"
                            id="longitudine"
                            name="longitudine"
                            value={formData.longitudine}
                            onChange={handleChange}
                            className={`px-2 outline outline-1 text-center py-2 rounded-lg shadow-lg ${isDisabled ? "outline-gray-300" : "outline-green-500"} w-full`} 
                        />
                    </div>
                </div>
                <div className='grid  bg-white rounded-xl grid-cols-[1fr_auto] w-full'>
                    <div className='flex  flex-col  justify-between '>
                        <div className=' rounded-xl p-4 pb-0 flex  items-center  '>Creat de :&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                        <input
                            disabled={isDisabled}
                            type="text"
                            id="creatDe"
                            name="creatDe"
                            value={formData.creatDe}
                            onChange={handleChange}
                            className={`px-2 w-96 outline outline-1 text-center py-2 rounded-lg shadow-lg ${isDisabled ? "outline-gray-300" : "outline-green-500"} `}              />
                        </div>
                        <div className=' rounded-xl p-4 flex  items-center  '>Aprobat de:&nbsp;&nbsp;
                        <input
                            disabled={isDisabled}
                            type="text"
                            id="aprobatDe"
                            name="aprobatDe"
                            value={formData.aprobatDe}
                            onChange={handleChange}
                            className={`px-2 w-96 outline outline-1 text-center py-2 rounded-lg shadow-lg ${isDisabled ? "outline-gray-300" : "outline-green-500"} `}              />
                        </div>
                    </div>
                    <div className='p-4 flex gap-4 items-center'>
                        <input
                            disabled={isDisabledDeleteSantier}
                            type="text"
                            id="stergeSantierParola"
                            name="stergeSantierParola"
                            value={stergeSantierParola}
                            onChange={(e) => setstergeSantierParola(e.target.value)}
                            placeholder='Cod'
                            maxLength={10}
                            className={` dropdown-container  text-center transition-all duration-300 outline-red-500 rounded-lg ${isDisabledDeleteSantier ? "w-0" : "p-4 w-32 shadow-lg outline outline-1"} `}              />
                     
                        <button onClick={() => handleDeleteSantier()} className='bg-red-500 dropdown-container hover:bg-red-600 rounded-lg p-4'><FontAwesomeIcon className='pr-2' icon={faCancel}/>Șterge Șantier</button>
                    </div>
                </div>
            </div>
            <div className='w-full h-full '>
            <GoogleMap
                mapContainerStyle={{ height: '100%', width: '100%', borderRadius: '1rem' }}
                center={{ lat: parseFloat(formData.latitudine), lng: parseFloat(formData.longitudine) }}
                zoom={12}
            >
                <Marker position={{ lat: parseFloat(formData.latitudine), lng: parseFloat(formData.longitudine) }} />
                <div className='absolute top-0 right-0 m-2 bg-white p-2 rounded-lg shadow-md'>
                    <h1 className='text-lg font-bold'>Locația</h1>
                    <p>{formData.adresa}</p>
                </div>
            </GoogleMap>

            </div>
        </div>
    </div>
  )
}
