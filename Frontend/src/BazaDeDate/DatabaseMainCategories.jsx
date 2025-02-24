import React, { useState } from 'react'
import ManoperaForm from './Manopera/ManoperaForm';
import MaterialeForm from './Materiale/MaterialePost';

export default function DatabaseMainCategories() {

    const [clicked, setClicked] = useState(0);

return (
    <div className='h-screen w-full flex items-center justify-center'>
        <div className="container  w-4/5 h-90h relative flex  flex-col items-center rounded-lg">
          <div className='containerWhiter w-full  '>
            <div className = 'flex justify-around items-center p-4  text-lg xxl:text-xl xxxl:text-2xl rounded-xl'>
              <button onClick={() => setClicked(1)} className={`bg-white text-black  px-6 py-2 rounded-xl ${clicked == 1 ? "bg-gray-200 outline-2 outline" : ""} hover:bg-gray-200`}>
                Manopera
              </button>
              <button onClick={() => setClicked(2)} className={`bg-white text-black  px-6 py-2 rounded-xl ${clicked == 2 ? "bg-gray-200 outline-2 outline" : ""} hover:bg-gray-200`}>
                Materiale
              </button>
              <button onClick={() => setClicked(3)} className={`bg-white text-black  px-6 py-2 rounded-xl ${clicked == 3 ? "bg-gray-200 outline-2 outline" : ""} hover:bg-gray-200`}>
                Transport
              </button>
              <button onClick={() => setClicked(4)} className={`bg-white text-black  px-6 py-2 rounded-xl ${clicked == 4 ? "bg-gray-200 outline-2 outline" : ""} hover:bg-gray-200`}>
                Utilaje
              </button>
            </div>
          </div>
        {
            clicked == 1 ? <ManoperaForm/>
            
            :
            clicked == 2 ? <MaterialeForm/>
            :
            ""
        }
        </div>
      </div>
  )
}
