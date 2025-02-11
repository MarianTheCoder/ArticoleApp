import React, { useContext } from 'react'
import { AngajatiContext } from '../context/UsersContex'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faLongArrowAltLeft, faLongArrowRight } from '@fortawesome/free-solid-svg-icons'
import AddingUsersForm from './AddingUsersForm'
import FetchedUsers from './FetchedUsers'

export default function ListaAdaugareUsers() {
 
  return (
    <>
    <div className="w-full relative h-full  gap-2 rounded-xl flex flex-col overflow-hidden    mt-4">
      {/* HorizontalForm */}
      <div className={` rounded-xl  bg-gray-800 `}>
        <AddingUsersForm />
      </div>

      {/* FetchedArticles */}
        <div className="h-full grid grid-rows-1 w-full scrollbar-webkit rounded-lg overflow-hidden">
          <FetchedUsers />
        </div>
      </div>
     
    </>
  )
}
