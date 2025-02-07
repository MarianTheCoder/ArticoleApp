import React, { useContext } from 'react'
import ListaAdaugareUsers from './Lista&AdaugareUsers'
import { AngajatiContext } from '../context/UsersContex';
import "../assets/customCSS.css"
import AddingUsersForm from './AddingUsersForm';
import FetchedUsers from './FetchedUsers';

export default function SelectedUserType() {
    const {clicked, setClicked } = useContext(AngajatiContext);
    
  return (
    <div className='h-screen flex items-center justify-center'>
        <div className="container  w-2/3 h-90h relative flex flex-col items-center rounded-lg">
          <div className='containerWhiter w-full  '>
            <div className = 'flex justify-around items-center p-4  text-2xl rounded-xl'>
              <button onClick={() => setClicked(1)} className={`bg-white text-black  px-5 py-3 rounded-xl ${clicked == 1 ? "bg-gray-200 outline-2 outline" : ""} hover:bg-gray-200`}>
                Ofertanti
              </button>
              <button onClick={() => setClicked(2)} className={`bg-white text-black  px-5 py-3 rounded-xl ${clicked == 2 ? "bg-gray-200 outline-2 outline" : ""} hover:bg-gray-200`}>
                Angajati
              </button>
              <button onClick={() => setClicked(3)} className={`bg-white text-black  px-5 py-3 rounded-xl ${clicked == 3 ? "bg-gray-200 outline-2 outline" : ""} hover:bg-gray-200`}>
                Beneficiari
              </button>
            </div>
            {
              clicked &&
              <div className={` rounded-xl `}>
                <AddingUsersForm />
              </div>
            }
          </div>
         {clicked && 
         <>
        
           <div className="w-full relative h-full  gap-2 rounded-xl flex flex-col overflow-hidden p-5 py-8">
              {/* FetchedArticles */}
              <div className="h-full grid grid-rows-1 w-full scrollbar-webkit overflow-hidden">
                 <FetchedUsers />
               </div>
            </div>
           </>
           }
        </div>
      </div>
  )
}
