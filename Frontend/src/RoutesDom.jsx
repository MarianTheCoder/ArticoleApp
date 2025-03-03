import React from 'react'
import { Routes ,Route, useLocation } from 'react-router-dom'
import Navbar from './MainElements/Navbar'
import Homepage from './MainPages/HomePage';
import ProtectedRoute from './MainElements/ProtectedRoute';
import Settings from './UserSettings/SettingsPage';
import AddUsers from './AddUsers/AddUsersRoute';
import { ArticlesProvider } from './context/ArticlesContext';
import Echipa from './Home/Echipa';
import News from './Home/News';
import AddEchipa from './Home/AddHome';
import NavbarDefaultHome from './MainElements/NavbarDefaultHome';
import Contact from './MainPages/Contact';
import Test from './test/Test';
import DatabaseMainCategories from './BazaDeDate/DatabaseMainCategories';
import RetetaForm from './BazaDeDate/Retete/RetetaForm'
import { RetetaProvider } from './context/RetetaContext';

export default function RoutesDom() {

  const location = useLocation();

  return (
    <div className=' grid h-screen text-white  w-full relative grid-cols-[auto_1fr]'>
      <ArticlesProvider>
      {location.pathname.includes("/defaultHome") ? <NavbarDefaultHome/> : <Navbar/>}
       <div className='w-[80px]'></div>
        <Routes>
          <Route path="/" element={<Homepage/>} />
          <Route path="/addArticles" element={<ProtectedRoute allowedRoles = {['ofertant']}><RetetaProvider><RetetaForm/></RetetaProvider></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute allowedRoles = {["ofertant","angajat","beneficiar"]}><Settings/></ProtectedRoute>}/>
          <Route path="/addAngajati" element={<ProtectedRoute allowedRoles = {["ofertant"]}><AddUsers/></ProtectedRoute>}/>
          <Route path="/AddEchipa" element={<ProtectedRoute allowedRoles = {["ofertant"]}><AddEchipa/></ProtectedRoute>}/>
          <Route path="/AddHome" element={<ProtectedRoute allowedRoles = {["ofertant"]}><AddEchipa/></ProtectedRoute>}/>
          <Route path="/Baza_de_date" element={<ProtectedRoute allowedRoles = {["ofertant"]}><DatabaseMainCategories/></ProtectedRoute>}/>
          <Route path="/Echipa" element={<Echipa/>}/>
          <Route path="/News" element={<News/>}/>
          <Route path="/Contact" element={<Contact/>}/>
          <Route path="/test" element={<Test/>}/>
          {/* default home if loged */}
          <Route path="/defaultHome" element={null}>
            <Route path="" element={<Homepage/>}/>
            <Route path="Echipa" element={<Echipa/>}/>
            <Route path="News" element={<News/>}/>
            <Route path="Contact" element={<Contact/>}/>
          </Route>

        </Routes>
        </ArticlesProvider>
    </div>
  )
}
