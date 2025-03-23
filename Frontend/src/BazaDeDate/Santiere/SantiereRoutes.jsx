import React, { useContext, useEffect, useState } from 'react'
import { AngajatiContext } from '../../context/UsersContex';
import { AuthContext } from '../../context/TokenContext';
import { useParams } from 'react-router-dom';


export default function SantiereRoutes() {
    
    const [loading, setLoading] = useState(true);

    const { idUser, idSantier } = useParams();
    const [selectedButton,  setSelectedButton] = useState(0);

    const {beneficiari, santiere } = useContext(AuthContext);

    useEffect(() => {
        const existsUser = beneficiari.some(item => item.id == idUser);
        const existsSantier = santiere.some(item => item.id == idSantier);
        if(existsSantier && existsUser) setLoading(false);
    }, [beneficiari])
    

  return (
    !loading &&
    <div className='relative h-screen w-full flex items-center justify-center'>
        <div className=" w-[95%] h-90h relative flex justify-center rounded-lg ">
            <div className="absolute -top-9 left-8 w-full space-x-4  h-full">
            
                    <button onClick={() => setSelectedButton(1)} className={`bg-blue-500 hover:-translate-y-3  transition-transform duration-[150ms]  text-white px-6 p-3 xxxl:px-4 rounded-t-[30px] ${selectedButton == 1 ? "bg-[#2C265E] -translate-y-3" : ""}`}>Prezentare</button>
                    <button onClick={() => setSelectedButton(2)} className={`bg-blue-500 hover:-translate-y-3  transition-transform duration-[150ms]  text-white px-6 p-3 xxxl:px-4 rounded-t-[30px] ${selectedButton == 2 ? "bg-[#2C265E] -translate-y-3" : ""}`}>Oferta Initiala</button>
                    <button onClick={() => setSelectedButton(3)} className={`bg-blue-500 hover:-translate-y-3  transition-transform duration-[150ms]  text-white px-6 p-3 xxxl:px-4 rounded-t-[30px] ${selectedButton == 3 ? "bg-[#2C265E] -translate-y-3" : ""}`}>Urmarire executie</button>
                    <button onClick={() => setSelectedButton(4)} className={`bg-blue-500 hover:-translate-y-3  transition-transform duration-[150ms]  text-white px-6 p-3 xxxl:px-4 rounded-t-[30px] ${selectedButton == 4 ? "bg-[#2C265E] -translate-y-3" : ""}`}>Oferta Finala</button>
                
            </div>
            <div className="absolute top-0 left-0 bg-red-400 w-full h-full opacity-0 bg-transparent z-20 pointer-events-auto"></div>
            <div className=" containerNoGlass relative  w-full h-full  flex  flex-col items-center rounded-lg ">
                <div>{idUser}</div>
            </div>
        </div>
    </div>

  )
}
