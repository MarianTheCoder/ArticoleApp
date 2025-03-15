import React from 'react'
import { UsersProvider } from '../context/UsersContex'
import SelectedUserType from './SelectedUserType'

export default function AddUsers({personType}) {
  return (
    <UsersProvider>
        <SelectedUserType personType={personType}/>
    </UsersProvider>
  )
}
