import React from 'react'
import { Routes ,Route } from 'react-router-dom'
import Navbar from './MainElements/Navbar'
import Homepage from './MainPages/HomePage';
import ProtectedRoute from './MainElements/ProtectedRoute';
import Settings from './UserSettings/SettingsPage';
import AddArticol from './AddArticole/TheRouteAddArticle';
import AddUsers from './AddUsers/AddUsersRoute';
import { ArticlesProvider } from './context/ArticlesContext';
import Echipa from './MainPages/Echipa';
import AddEchipa from './MainPages/AddEchipa';

export default function RoutesDom() {
  return (
    <div className=' grid h-screen text-white  w-full relative grid-cols-[auto_1fr]'>
      <ArticlesProvider>
      <Navbar/>
       <div className='w-[80px]'></div>
        <Routes>
          <Route path="/" element={<Homepage/>} />
          <Route path="/addArticles" element={<ProtectedRoute allowedRoles = {['ofertant']}><AddArticol/></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute allowedRoles = {["ofertant","angajat","beneficiar"]}><Settings/></ProtectedRoute>}/>
          <Route path="/addAngajati" element={<ProtectedRoute allowedRoles = {["ofertant"]}><AddUsers/></ProtectedRoute>}/>
          <Route path="/Echipa" element={<Echipa/>}/>
          <Route path="/AddEchipa" element={<AddEchipa/>}/>
        </Routes>
        </ArticlesProvider>
    </div>
  )
}
