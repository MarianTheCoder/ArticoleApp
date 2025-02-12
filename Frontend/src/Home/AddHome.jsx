import React, { useContext, useState } from 'react'
import "../assets/customCSS.css"
import AddEchipa from '../Home/AddEchipa';
import AddNews from '../Home/AddNews';

export default function SelectedUserType() {
  
  const [clicked, setClicked] = useState(null);


  return (
    <div className='h-screen flex items-center justify-center'>
        <div className="container  w-2/3 h-90h relative flex flex-col items-center rounded-lg">
          <div className='containerWhiter w-full  '>
            <div className = 'flex justify-around items-center p-4  text-2xl rounded-xl'>
              <button onClick={() => setClicked(1)} className={`bg-white text-black  px-5 py-3 rounded-xl ${clicked == 1 ? "bg-gray-200 outline-2 outline" : ""} hover:bg-gray-200`}>
                News
              </button>
              <button onClick={() => setClicked(2)} className={`bg-white text-black  px-5 py-3 rounded-xl ${clicked == 2 ? "bg-gray-200 outline-2 outline" : ""} hover:bg-gray-200`}>
                Echipa
              </button>
      
            </div>
       
          </div>
         {clicked == 1 ?
            <div className={` w-full mt-8 rounded-xl `}>
              <AddNews />
            </div>
            :
           <div className="w-full relative h-full  gap-2 rounded-xl flex flex-col overflow-hidden p-5 py-8">
              {/* FetchedArticles */}
              <div className="h-full grid grid-rows-1 w-full scrollbar-webkit overflow-hidden">
                 <AddEchipa />
               </div>
            </div>
           }
        </div>
      </div>
  )
}
