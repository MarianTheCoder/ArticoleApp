import { useContext, useState } from 'react';
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from './context/TokenContext';
import Login from './Login/Login.jsx';
import RoutesDOM from './RoutesDom.jsx';
import ProtectedRouteAfterLogin from './MainElements/ProtectedRouteAfterLogin.jsx'
import { LoadScript } from '@react-google-maps/api';

function App() {
  return (
    <div className='w-full h-full '>
     <LoadScript googleMapsApiKey="AIzaSyCDs0sewwk9xpKKexCOhem7yCPicxef5gY">
      <BrowserRouter basename="/DataBase">
      <AuthProvider>
        <Routes>
            <Route path="/login" element={<ProtectedRouteAfterLogin ><Login/></ProtectedRouteAfterLogin>} /> 
            <Route path='*' element={<RoutesDOM/>}/>
        </Routes>
      </AuthProvider>
      </BrowserRouter>
    </LoadScript>
    </div>
  );
}

export default App;