import React, { useEffect, useState } from 'react'
import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPenToSquare } from '@fortawesome/free-solid-svg-icons';
import api from '../../../api/axiosAPI';
import { useParams } from 'react-router-dom';

export default function Prezentare() {

  const [formData, setFormData] = useState({
    nume:"",
    beneficiar:"",
    adresa:"",
    email:"",
    telefon:"",
    persoanaResponsabila:"",
    detaliiExecutie:"",
    latitudine:47.1690109360525,
    longitudine:27.594116580043583,
  });

  const {idSantier} = useParams();



  useEffect(() => {
    fetchData();
  }, [])

    const fetchData = async () => {
        try {
            const response = await api.get(`/Santiere/getSantiereDetails/${idSantier}`);
            let data = response.data.santierDetails[0];
            let name = response.data.name;
            console.log(data);
            setFormData({
                nume: name,
                beneficiar: data.beneficiar,
                adresa: data.adresa,
                email: data.email,
                telefon: data.telefon,
                persoanaResponsabila: data.persoanaResponsabila,
                detaliiExecutie: data.detaliiExecutie,
                latitudine: data.latitudine != '' ? data.latitudine : 47.1690109360525,
                longitudine: data.longitudine != '' ? data.longitudine : 27.594116580043583,
            });
        } catch (error) {
            console.error("Error fetching data:", error);
        }
    }

   const [isDisabled, setIsDisabled] = useState(true);

  const handleChange = (e) => {
      const { name, value } = e.target;
      setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className='h-full w-full text-black p-8 grid grid-rows-[auto_1fr] gap-4'>
        <div className='w-full h-auto p-6 px-4 rounded-xl grid grid-cols-[1fr_1fr_1fr_1fr_1fr_auto] gap-4 items-center  bg-white'>  
            {/* nume snatier , beneficiar, google maps, locatia scrisa , persoana responsabila , detalii executie care se pune la pdf */}
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
                  className="px-2 w-full outline-none text-center py-2  rounded-lg shadow-sm  "
                  
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
                  className="px-2 w-full outline-none text-center py-2  rounded-lg shadow-sm "
              />
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
                  className="px-2 w-full outline-none text-center py-2  rounded-lg shadow-sm "
              />
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
                  className="px-2 w-full outline-none text-center py-2  rounded-lg shadow-sm "
              />
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
                  className="px-2 w-full outline-none text-center py-2  rounded-lg shadow-sm "
              />
          </div>
          <div className='h-full flex items-end p-2 text-3xl bg-'>
            <FontAwesomeIcon icon={faPenToSquare}/>
          </div>
        </div>
        <div className='w-full h-full rounded-xl grid grid-cols-[1fr_1fr] gap-4'>
            <div className='w-full h-full grid grid-rows-[1fr_auto] rounded-xl gap-4 '>
                <textarea  disabled={true} className='bg-white  outline-none rounded-lg  w-full '>
                   
                </textarea>
                <div className='flex bg-white rounded-xl flex-col  justify-between '>
                    <div className=' rounded-xl p-4 pb-0 flex  items-center  '>Creat de:&nbsp;<span className=' font-bold'>Mircea Alexandru</span></div>
                    <div className=' rounded-xl p-4 flex  items-center  '>Aprobat de:&nbsp;<span className=' font-bold'>Andrei Costin</span></div>
                </div>
            </div>
            <div className='w-full h-full '>
            <LoadScript googleMapsApiKey="AIzaSyCDs0sewwk9xpKKexCOhem7yCPicxef5gYY">
              <GoogleMap
                center={{ lat: formData.latitudine, lng: formData.longitudine }}
                zoom={12}
              >
                {/* Use AdvancedMarkerElement instead of Marker */}
                <google.maps.marker.AdvancedMarkerElement
                  position={{ lat: formData.latitudine, lng: formData.longitudine }}
                />
              </GoogleMap>
            </LoadScript>
            </div>
        </div>
    </div>
  )
}
