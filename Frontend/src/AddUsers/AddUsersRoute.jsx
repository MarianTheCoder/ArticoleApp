import React from 'react'
import { UsersProvider } from '../context/UsersContex'
import SelectedUserType from './SelectedUserType'

export default function AddUsers() {
  return (
    <UsersProvider>
        <SelectedUserType/>
    </UsersProvider>
  )
}
