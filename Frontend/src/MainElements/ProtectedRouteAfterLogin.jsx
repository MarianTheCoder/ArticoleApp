import React, { useContext, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/TokenContext';

const ProtectedRoute = ({ children, allowedRoles }) => {
    const { user , decodeToken } = useContext(AuthContext);

    useEffect(() => {
        decodeToken();
    }, [])
    
    
    // If the user is not logged in, redirect to the login page
    if (user.role) {
        return <Navigate to="/" />;
    }

    // If the user is authenticated and authorized, render the children
    return children;
};

export default ProtectedRoute;
