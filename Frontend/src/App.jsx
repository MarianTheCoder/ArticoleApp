import { useContext, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from './context/TokenContext';
import Login from './Login/Login.jsx';
import RoutesDOM from './RoutesDom.jsx';
import ProtectedRouteAfterLogin from './MainElements/ProtectedRouteAfterLogin.jsx'


function App() {
  return (
    <div className='w-full h-full '>
    <Router>
    <AuthProvider>
      <Routes>
          <Route path="/login" element={<ProtectedRouteAfterLogin ><Login/></ProtectedRouteAfterLogin>} /> 
          <Route path='*' element={<RoutesDOM/>}/>;
      </Routes>
    </AuthProvider>
    </Router>
    </div>
  );
}

export default App;