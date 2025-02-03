import React, { useContext, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/TokenContext';

const ProtectedRoute = ({ children, allowedRoles }) => {
    const { user , loading , decodeToken } = useContext(AuthContext);

    useEffect(() => {
        decodeToken();
    }, [])

    if(loading) 
        return <div>Loading...</div>
    // If the user is not logged in, redirect to the login page
    if (!user.role) {
        console.log(user);
        return <Navigate to="/" />;
    }

    // If the user's role is not allowed, redirect to the home page
    if (!allowedRoles.includes(user.role)) {
        return <Navigate to="/" />;
    }

    // If the user is authenticated and authorized, render the children
    return children;
};

export default ProtectedRoute;
