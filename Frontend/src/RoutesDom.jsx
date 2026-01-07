import React, { useContext } from 'react'
import { Routes, Route, useLocation, Outlet } from 'react-router-dom'
import Navbar from './MainElements/Navbar'
import ProtectedRoute from './MainElements/ProtectedRoute';
import Settings from './UserSettings/SettingsPage';
import AddUsers from './AddUsers/AddUsersRoute';
import AddEchipa from './Home/AddEchipa';
import AddNews from './Home/AddNews';
// import NavbarDefaultHome from './MainElements/NavbarDefaultHome';
import DatabaseMainCategories from './BazaDeDate/DatabaseMainCategories';
import RetetaForm from './BazaDeDate/Retete/RetetaForm'
import { RetetaProvider } from './context/RetetaContext';
import { AuthContext } from './context/TokenContext';
import SantiereRoutes from './BazaDeDate/Santiere/SantiereRoutes';
import { useEffect } from 'react';
import NoPage from './MainElements/NoPage';
import Pontaje from './BazaDeDate/Pontaje/Pontaje';
import AtribuiriActivitate from './BazaDeDate/Pontaje/AtribuiriActivitate';

function AppLayout() {
  // This layout only renders when a valid child route matches.
  return (
    <>
      <Navbar />
      <Outlet />
    </>
  );
}

export default function RoutesDom() {

  const location = useLocation();
  const { user, loading } = useContext(AuthContext);

  useEffect(() => {
    // console.log("sda", user);
  }, [user])

  if (loading) {
    return (
      <div className="absolute w-full h-full bg-opacity-90 z-50 flex items-center justify-center">
        <div className="w-20 h-20 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }




  return (
    <div className=' grid h-screen text-white  w-full relative grid-cols-1'>
      {/* {location.pathname.includes("logedUser") && user.role ?  <Navbar/> : <NavbarDefaultHome/>} */}
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="" element={<ProtectedRoute allowedRoles={["ofertant", "angajat", "beneficiar"]}></ProtectedRoute>} />
          <Route path="addArticles" element={<ProtectedRoute allowedRoles={['ofertant']}><RetetaProvider><RetetaForm /></RetetaProvider></ProtectedRoute>} />
          <Route path="settings" element={<ProtectedRoute allowedRoles={["ofertant", "angajat", "beneficiar"]}><Settings /></ProtectedRoute>} />
          <Route path="Santiere/:limbaUser/:idUser/:idSantier" element={<ProtectedRoute allowedRoles={["ofertant"]}><SantiereRoutes /></ProtectedRoute>} />
          <Route path="Pontaje" element={<ProtectedRoute allowedRoles={["ofertant"]}><Pontaje /></ProtectedRoute>} />
          <Route path="AtribuiriActivitate" element={<ProtectedRoute allowedRoles={["ofertant"]}><AtribuiriActivitate /></ProtectedRoute>} />

          {/* <Route path="Echipa" element={<Echipa/>}/>
            <Route path="News" element={<News/>}/>
            <Route path="Contact" element={<Contact/>}/> */}
          <Route path="AddEchipa" element={<ProtectedRoute allowedRoles={["ofertant"]}><AddEchipa /></ProtectedRoute>} />
          <Route path="AddNews" element={<ProtectedRoute allowedRoles={["ofertant"]}><AddNews /></ProtectedRoute>} />
          <Route path="addManopere" element={<ProtectedRoute allowedRoles={["ofertant"]}><DatabaseMainCategories dateType={1} /></ProtectedRoute>} />
          <Route path="addMateriale" element={<ProtectedRoute allowedRoles={["ofertant"]}><DatabaseMainCategories dateType={2} /></ProtectedRoute>} />
          <Route path="addTransport" element={<ProtectedRoute allowedRoles={["ofertant"]}><DatabaseMainCategories dateType={3} /></ProtectedRoute>} />
          <Route path="addUtilaje" element={<ProtectedRoute allowedRoles={["ofertant"]}><DatabaseMainCategories dateType={4} /></ProtectedRoute>} />
          <Route path="ManageConturi" element={<ProtectedRoute allowedRoles={["ofertant"]}><AddUsers /></ProtectedRoute>} />
        </Route>
        {/* default home if loged */}
        {/* <Route path="" element={<Homepage/>}/>
            <Route path="Echipa" element={<Echipa/>}/>
            <Route path="News" element={<News/>}/>
            <Route path="Contact" element={<Contact/>}/> */}
        <Route path="*" element={<NoPage />} />
      </Routes>
    </div>
  )
}
