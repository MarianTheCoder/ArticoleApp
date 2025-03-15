import React, { useContext, useEffect } from 'react'
import { AngajatiContext } from '../context/UsersContex';
import "../assets/customCSS.css"
import AddingUsersForm from './AddingUsersForm';
import FetchedUsers from './FetchedUsers';

export default function SelectedUserType({personType}) {
    const {clicked, setClicked } = useContext(AngajatiContext);
    useEffect(() => {
      setClicked(personType);
    }, [personType])
    


  return (
    <div className='h-screen flex items-center justify-center'>
        <div className="container  w-4/5 h-90h relative flex flex-col items-center rounded-lg">
         {clicked && 
         <>
            <div className={` w-full mt-8 rounded-xl `}>
              <AddingUsersForm />
            </div>
           <div className="w-full relative h-full  gap-2 rounded-lg flex flex-col overflow-hidden p-5 py-8">
              {/* FetchedArticles */}
              <div className="h-full grid grid-rows-1 w-full rounded-lg scrollbar-webkit  overflow-hidden">
                 <FetchedUsers />
               </div>
            </div>
           </>
           }
        </div>
      </div>
  )
}
