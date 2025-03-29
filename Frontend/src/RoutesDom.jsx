import React, { useContext } from 'react'
import { Routes ,Route, useLocation } from 'react-router-dom'
import Navbar from './MainElements/Navbar'
import Homepage from './MainPages/HomePage';
import ProtectedRoute from './MainElements/ProtectedRoute';
import Settings from './UserSettings/SettingsPage';
import AddUsers from './AddUsers/AddUsersRoute';
import { ArticlesProvider } from './context/ArticlesContext';
import Echipa from './Home/Echipa';
import News from './Home/News';
import AddEchipa from './Home/AddEchipa';
import AddNews from './Home/AddNews';
import NavbarDefaultHome from './MainElements/NavbarDefaultHome';
import Contact from './MainPages/Contact';
import Test from './test/Test';
import DatabaseMainCategories from './BazaDeDate/DatabaseMainCategories';
import RetetaForm from './BazaDeDate/Retete/RetetaForm'
import { RetetaProvider } from './context/RetetaContext';
import { AuthContext } from './context/TokenContext';
import SantiereRoutes from './BazaDeDate/Santiere/SantiereRoutes';

export default function RoutesDom() {

  const location = useLocation();
  const {user} = useContext(AuthContext);
  

  return (
    <div className=' grid h-screen text-white  w-full relative grid-cols-[auto_1fr]'>
      {location.pathname.includes("/defaultHome") ? <NavbarDefaultHome/> : !user.name ? <NavbarDefaultHome/> : <Navbar/>}
        <Routes>
          <Route path="/" element={<Homepage/>} />
          <Route path="/addArticles" element={<ProtectedRoute allowedRoles = {['ofertant']}><RetetaProvider><RetetaForm/></RetetaProvider></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute allowedRoles = {["ofertant","angajat","beneficiar"]}><Settings/></ProtectedRoute>}/>
          <Route path="/Santiere/:idUser/:idSantier" element={<ProtectedRoute allowedRoles = {["ofertant"]}><SantiereRoutes/></ProtectedRoute>}/>
          <Route path="/Echipa" element={<Echipa/>}/>
          <Route path="/News" element={<News/>}/>
          <Route path="/Contact" element={<Contact/>}/>

          <Route path="/AddEchipa" element={<ProtectedRoute allowedRoles = {["ofertant"]}><AddEchipa/></ProtectedRoute>}/>
          <Route path="/AddNews" element={<ProtectedRoute allowedRoles = {["ofertant"]}><AddNews/></ProtectedRoute>}/>

          <Route path="/addManopere" element={<ProtectedRoute allowedRoles = {["ofertant"]}><DatabaseMainCategories dateType={1}/></ProtectedRoute>}/>
          <Route path="/addMateriale" element={<ProtectedRoute allowedRoles = {["ofertant"]}><DatabaseMainCategories dateType={2}/></ProtectedRoute>}/>
          <Route path="/addTransport" element={<ProtectedRoute allowedRoles = {["ofertant"]}><DatabaseMainCategories dateType={3}/></ProtectedRoute>}/>
          <Route path="/addUtilaje" element={<ProtectedRoute allowedRoles = {["ofertant"]}><DatabaseMainCategories dateType={4}/></ProtectedRoute>}/>

          <Route path="/manageOfertanti" element={<ProtectedRoute allowedRoles = {["ofertant"]}><AddUsers personType = {1} /></ProtectedRoute>}/>
          <Route path="/manageAngajati" element={<ProtectedRoute allowedRoles = {["ofertant"]}><AddUsers personType = {2} /></ProtectedRoute>}/>
          <Route path="/manageBeneficiari" element={<ProtectedRoute allowedRoles = {["ofertant"]}><AddUsers personType = {3} /></ProtectedRoute>}/>
          {/* default home if loged */}
          <Route path="/defaultHome" element={null}>
            <Route path="" element={<Homepage/>}/>
            <Route path="Echipa" element={<Echipa/>}/>
            <Route path="News" element={<News/>}/>
            <Route path="Contact" element={<Contact/>}/>
          </Route>

        </Routes>
    </div>
  )
}
