import React, { useContext } from 'react'
import { AngajatiContext } from '../context/UsersContex';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPenToSquare, faTrashCan } from '@fortawesome/free-solid-svg-icons';

export default function FetchedUsers() {

const {angajati} = useContext(AngajatiContext);
    
 return (
     <div className=" w-full overflow-hidden text-black">
       <div className="flex flex-col h-full justify-start items-center  ">
         <div className="w-full h-full overflow-y-auto scrollbar-webkit  ">
         <div className={`w-full grid grid-cols-[1fr_1fr_1fr_1fr_1fr_auto] font-bold  gap-x-4 rounded-t-lg  bg-[rgb(255,255,255,1)] `}>
                         {/* Code Display */}
                         <div className=" col-span-2 px-2 text-center  py-1  overflow-hidden 
                       whitespace-nowrap">
                        das
                      </div>
                   {/* Description Display */}
                      <div className=" px- text-center  py-1  overflow-hidden text-ellipsis whitespace-nowrap">
                       sdDS
                      </div>
 
                   {/* Unit Display */}
                      <div className="px-4  py-1  text-center  overflow-hidden text-ellipsis whitespace-nowrap">
                       DAS
                      </div>
                   {/* Data Display */}
                      <div className=" px-4  py-1  text-center  overflow-hidden text-ellipsis whitespace-nowrap">
                       sdag
                      </div>
                  <div className=' pr-4  opacity-0 gap-6 justify-center items-center flex'>
                     <FontAwesomeIcon o className='hover:cursor-pointer text-xl text-green-500 hover:text-green-600' icon={faPenToSquare}/> 
                     <FontAwesomeIcon  className='hover:cursor-pointer hover:text-red-600 text-xl text-red-500' icon={faTrashCan}/>
                  </div>
            </div>
           {angajati &&
             angajati.map((angajat) => (
               <div
                 key={angajat.id}
                 className={`w-full grid grid-cols-[1fr_1fr_1fr_1fr_1fr_auto]  gap-x-4 rounded-b-lg bg-[rgb(255,255,255,1)] `}>
                
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
                      <div className="px-4  py-1  text-center  overflow-hidden text-ellipsis whitespace-nowrap">
                        {angajat.role}
                      </div>
                   {/* Data Display */}
                      <div className=" px-4  py-1  text-cente  overflow-hidden text-ellipsis whitespace-nowrap">
                        {angajat.created_at.split('T')[0]}
                      </div>
                  <div className=' pr-4 gap-6 justify-center items-center flex'>
                     <FontAwesomeIcon onClick={() => setEditArticle(angajat)}  className='hover:cursor-pointer text-xl text-green-500 hover:text-green-600' icon={faPenToSquare}/> 
                     <FontAwesomeIcon onClick={() => deleteArticle(angajat.id)} className='hover:cursor-pointer hover:text-red-600 text-xl text-red-500' icon={faTrashCan}/>
                   </div>
               </div>
             ))}
         </div>
       </div>
     </div>
   );
 }