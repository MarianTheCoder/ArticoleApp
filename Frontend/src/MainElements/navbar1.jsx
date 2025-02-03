import React, { useContext } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBoxesStacked, faHandshake, faHouse, faPerson, faPersonShelter, faUser } from '@fortawesome/free-solid-svg-icons'
import { AuthContext } from '../context/TokenContext'

export default function Navbar() {

    const {user, logout, color} = useContext(AuthContext);

  return (
    <div className='h-full bg-gray-600 min-w-fit'>
        <div className='grid grid-rows-[1fr_auto] h-full p-4 gap-2'>
            <div className='flex flex-col items-center'>
                <button className='mb-16' onClick={() => navigate("/")}>Logo</button>
                <div className='flex gap-8 flex-col'>
                    <div onClick={() => navigate("/")} className={`flex text-xl p-4 min-w-40  justify-start  bg-gray-800 rounded-xl px-6 ${color} hover:bg-gray-900 hover:cursor-pointer  items-center gap-2`}>
                        <FontAwesomeIcon icon={faHouse}/>
                        <p className='select-none font-bold'>Home</p>
                    </div>
                    {user.role == "ofertant" ?
                    <>
                        <div onClick={() => navigate("/addArticles")} className={`flex text-xl p-4 min-w-40  justify-start  bg-gray-800 rounded-xl px-6 ${color} hover:bg-gray-900 hover:cursor-pointer  items-center gap-2`}>
                            <FontAwesomeIcon icon={faBoxesStacked}/>
                            <p className='select-none font-bold'>Articole</p>
                        </div>
                        <div className={`flex text-xl p-4 min-w-40  justify-start  bg-gray-800 rounded-xl px-6 ${color} hover:bg-gray-900 hover:cursor-pointer  items-center gap-2`}>
                            <FontAwesomeIcon icon={faPersonShelter}/>
                            <p className='select-none font-bold'>Angajati</p>
                        </div>
                        <div className={`flex text-xl p-4 min-w-40  justify-start  bg-gray-800 rounded-xl px-6 ${color} hover:bg-gray-900 hover:cursor-pointer  items-center gap-2`}>
                            <FontAwesomeIcon icon={faHandshake}/>
                            <p className='select-none  font-bold'>Clienti</p>
                        </div>
                    </>  
                        :
                        <div>

                        </div>
                    }
                </div>
            </div>
            <div className=' flex  gap-1 flex-col justify-center items-center p-2'>
                <FontAwesomeIcon className={`text-3xl ${color} bg-gray-800 p-5 rounded-full`} icon={faUser}/>
                {user.name && <p className=' text-lg mb-2'>{user.name}</p>}
            </div>
            {!user?.role ? 
                <div className='flex flex-col'>
                    <button onClick={() => navigate("/login")} className='p-2 text-lg bg-gray-800 rounded-xl px-4'>Log in</button>
                </div> 
            :
            <div className='flex flex-col gap-2'>
                <button onClick={() => navigate("/settings")} className='p-2 hover:bg-gray-900 text-lg bg-gray-800 rounded-xl px-4'>Settings</button>
                <button onClick={() => logout()} className='p-2 hover:bg-red-600 text-lg bg-red-500 rounded-xl px-4'>Log out</button>
            </div>}      
        </div>
    </div>
  )
}
