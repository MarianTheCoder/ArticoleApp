import React, { useContext, useEffect, useState } from 'react'
import { AngajatiContext } from '../../context/UsersContex';
import { AuthContext } from '../../context/TokenContext';
import { useParams } from 'react-router-dom';
import SantiereAddOfertaMain from './SantiereAddOfertaMain';
import Prezentare from './Prezentare/Prezentare';


export default function SantiereRoutes() {
    
    const [loading, setLoading] = useState(true);

    const { limbaUser, idUser, idSantier } = useParams();
    const [selectedButton,  setSelectedButton] = useState(1);

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
            <div className="absolute -top-9 left-8 -space-x-2 select-none  ">
                    <button onClick={() => setSelectedButton(1)} className={` relative  hover:-translate-y-2  transition-all duration-[150ms]   z-40 text-white px-6 p-3 xxxl:px-4 rounded-tr-[4rem] rounded-tl-2xl  ${selectedButton == 1 ? "bg-[#26415f] -translate-y-2 shadow-[8px_8px_15px_rgba(0,0,0,1)] " : "bg-blue-500 shadow-[4px_4px_10px_rgba(0,0,0,1)]"}`}>Prezentare</button>
                    <button onClick={() => setSelectedButton(2)} className={` relative  hover:-translate-y-2  transition-all duration-[150ms]   z-30 text-white px-6 p-3 xxxl:px-4 rounded-tr-[4rem] rounded-tl-2xl  ${selectedButton == 2 ? "bg-[#26415f] -translate-y-2 shadow-[8px_8px_15px_rgba(0,0,0,1)] " : "bg-blue-500 shadow-[4px_4px_10px_rgba(0,0,0,1)]"}`}>Oferta Initiala</button>
                    <button onClick={() => setSelectedButton(3)} className={` relative  hover:-translate-y-2  transition-all duration-[150ms]   z-20 text-white px-6 p-3 xxxl:px-4 rounded-tr-[4rem] rounded-tl-2xl  ${selectedButton == 3 ? "bg-[#26415f] -translate-y-2 shadow-[8px_8px_15px_rgba(0,0,0,1)] " : "bg-blue-500 shadow-[4px_4px_10px_rgba(0,0,0,1)]"}`}>Urmarire executie</button>
                    <button onClick={() => setSelectedButton(4)} className={` relative  hover:-translate-y-2  transition-all duration-[150ms]   z-10 text-white px-6 p-3 xxxl:px-4 rounded-tr-[4rem] rounded-tl-2xl  ${selectedButton == 4 ? "bg-[#26415f] -translate-y-2 shadow-[8px_8px_15px_rgba(0,0,0,1)] " : "bg-blue-500 shadow-[4px_4px_10px_rgba(0,0,0,1)]"}`}>Oferta Finala</button>
            </div>
            <div className=" containerNoGlass relative z-50  w-full h-full  flex  flex-col items-center rounded-lg ">
                {
                    selectedButton == 1 ? <Prezentare key={`${idUser}-${idSantier}`} />
                    :
                    selectedButton == 2 ? <SantiereAddOfertaMain  key={`${idUser}-${idSantier}`} />
                    :
                    ""
                }
            </div>


        </div>
    </div>

  )
}
