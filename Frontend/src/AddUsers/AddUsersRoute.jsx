import React from 'react'
import "../assets/customCSS.css"
import FetchedUsers from './FetchedUsers';



export default function AddUsers({ }) {
  return (
    <div className='h-screen flex items-center justify-center'>
      <div className="bg-gray-200 w-[90%] h-90h relative flex flex-col p-8 overflow-hidden items-center rounded-lg">
        <FetchedUsers />
      </div>
    </div>
  )
}
