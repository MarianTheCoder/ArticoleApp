import React, { useContext, useState } from 'react'
import { AngajatiContext } from '../context/UsersContex';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPenToSquare, faTrashCan } from '@fortawesome/free-solid-svg-icons';
import photoAPI from '../api/photoAPI';


export default function FetchedUsers() {

const {angajati, clicked, deleteAngajat} = useContext(AngajatiContext);

  const [delButon, setDelButon] = useState(null);

  const delButtonPressed = async (idx, id) =>{
    if(delButon == null ) setDelButon(idx);
    else if(delButon != idx) setDelButon(idx);
    else{
      await deleteAngajat(id);
      setDelButon(null);
    }
  }
    
 return (
     <div className=" w-full overflow-hidden text-black">
       <div className="flex flex-col h-full justify-start items-center  ">
         <div className="w-full h-full overflow-y-auto scrollbar-webkit  ">
         <div className={`w-full grid grid-cols-[1fr_1fr_1fr_1fr_1fr_1fr_auto] text-xl font-extrabold tracking-wider p-3  gap-x-4 rounded-t-lg  bg-[rgb(255,255,255,1)] `}>
                         {/* Code Display */}
                         <div className=" px-2 text-center  py-1  overflow-hidden 
                       whitespace-nowrap">
                        Photo
                      </div>
                      <div className=" col-span-2 px-2 text-center  py-1  overflow-hidden 
                       whitespace-nowrap">
                        Email
                      </div>
                   {/* Description Display */}
                      <div className=" px- text-center  py-1  overflow-hidden text-ellipsis whitespace-nowrap">
                       Nume
                      </div>
 
                   {/* Unit Display */}
                      <div className="px-4  py-1  text-center  overflow-hidden text-ellipsis whitespace-nowrap">
                       Rol
                      </div>
                   {/* Data Display */}
                      <div className=" px-4  py-1  text-center  overflow-hidden text-ellipsis whitespace-nowrap">
                       Data
                      </div>
                  <div className=' pr-4  opacity-0 gap-6 justify-center items-center flex'>
                     <FontAwesomeIcon  className='hover:cursor-pointer text-xl text-green-500 hover:text-green-600' icon={faPenToSquare}/> 
                     <FontAwesomeIcon  className='hover:cursor-pointer hover:text-red-600 text-xl text-red-500' icon={faTrashCan}/>
                  </div>
            </div>
           { angajati && angajati.length != 0 ?
             angajati.map((angajat, index) => (
               <div
                 key={angajat.id}
                 className={`w-full p-3 grid grid-cols-[1fr_1fr_1fr_1fr_1fr_1fr_auto] items-center text-lg tracking-wide gap-x-4 ${delButon == index ? "bg-red-300" : ""} ${index === angajati.length - 1 ? "rounded-b-lg" : ""}  ${index % 2 == 1 ? "bg-[rgb(255,255,255,1)]" : "bg-[rgb(255,255,255,0.8)]"} `}>
                  <div className='flex justify-center'>
                     <div className="w-12 sm:w-14 md:w-16 lg:w-20 aspect-square ">
                          <img className='rounded-xl object-cover w-full h-full ' src={`${photoAPI}/${angajat.photo_url}`}></img>
                      </div>
                  </div>
                   {/* Code Display */}
                      <div className=" col-span-2 px-2 text-center  py-1  overflow-hidden 
                       whitespace-nowrap">
                        {angajat.email}
                      </div>
                   {/* Description Display */}
                      <div className=" px- text-center  py-1  overflow-hidden text-ellipsis whitespace-nowrap">
                        {angajat.name}
                      </div>
 
                   {/* Unit Display */}
                      <div className={`px-4 rounded-3xl ${clicked == 1 ? "bg-[#2563EB]" : clicked == 2 ? "bg-[#16A34A]" : "bg-[#F97316]"}  py-1  text-center  overflow-hidden text-ellipsis whitespace-nowrap`}>
                        {angajat.role.charAt(0).toUpperCase() + angajat.role.slice(1)}
                      </div>
                   {/* Data Display */}
                      <div className=" px-4  py-1  text-center  overflow-hidden text-ellipsis whitespace-nowrap">
                        {angajat.created_at.split('T')[0]}
                      </div>
                  <div className=' pr-4 text-2xl gap-6 justify-center items-center flex'>
                     <FontAwesomeIcon onClick={() => setEditArticle(angajat)}  className='hover:cursor-pointer  text-green-500 hover:text-green-600' icon={faPenToSquare}/> 
                     <FontAwesomeIcon onClick={() => delButtonPressed(index, angajat.id)} className='hover:cursor-pointer hover:text-red-600  text-red-500' icon={faTrashCan}/>
                   </div>
               </div>
             ))
            :
            <>
              <div className='w-full p-3 text-lg  rounded-b-lg flex justify-center  bg-[rgb(255,255,255,0.8)]'>
                Nu exista utilizatori
              </div>
            </>}
         </div>
       </div>
     </div>
   );
 }