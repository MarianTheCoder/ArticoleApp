import React, { useState } from 'react'
import RetetaManopera from './RetetaManopera'
import RetetaMateriale from './RetetaMateriale'
import RetetaUtilaje from './RetetaUtilaje'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faX } from '@fortawesome/free-solid-svg-icons';
import RetetaTransport from './RetetaTransport';

export default function ReteteAdaugareObiecte({parentProps}) {

    const [clicked, setClicked] = useState(1);

  return (
        <div className=" containerZ  absolute top-0 left-0 right-0 bottom-0 z-[200] h-full w-full flex flex-col items-center rounded-lg">
            <div className='flex text-lg font-medium w-full justify-evenly containerWhiter py-4 '>
                <button onClick={() => setClicked((prev) => prev == 1 ? 0 : 1)} className={`bg-white text-black  px-6 py-2 rounded-xl ${clicked == 1 ? "bg-gray-200 outline-2 outline" : ""} hover:bg-gray-200`}>
                    Manopera
                </button>
                <button onClick={() => setClicked((prev) => prev == 2 ? 0 : 2)} className={`bg-white text-black  px-6 py-2 rounded-xl ${clicked == 2 ? "bg-gray-200 outline-2 outline" : ""} hover:bg-gray-200`}>
                    Materiale
                </button>
                <button onClick={() => setClicked((prev) => prev == 3 ? 0 : 3)} className={`bg-white text-black  px-6 py-2 rounded-xl ${clicked == 3 ? "bg-gray-200 outline-2 outline" : ""} hover:bg-gray-200`}>
                    Transport
                </button>
                <button onClick={() => setClicked((prev) => prev == 4 ? 0 : 4)} className={`bg-white text-black  px-6 py-2 rounded-xl ${clicked == 4 ? "bg-gray-200 outline-2 outline" : ""} hover:bg-gray-200`}>
                    Utilaje
                </button> 
                <button className=' absolute right-6 top-5'>
                 <FontAwesomeIcon onClick={() => parentProps.setIsPopupOpen(null)} className=' cursor-pointer text-4xl text-red-600 hover:text-red-700' icon={faX}/>
                </button>
            </div>
            <div className=' mt-4 overflow-auto flex h-full flex-col items-center w-full'>
                {
                clicked == 1 ? <RetetaManopera {...parentProps}/>
                :
                clicked == 2 ? <RetetaMateriale {...parentProps}/>
                :
                clicked == 3 ? <RetetaTransport {...parentProps}/>
                :
                clicked == 4 ? <RetetaUtilaje {...parentProps}/>
                :
                ""
                }
            </div>
        </div> 
  )
}
