import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/TokenContext';

const GuestRoute = ({ children }) => {
    const { user, loading } = useContext(AuthContext);

    // 1. Wait for Auth Check to finish
    if (loading) {
        return null; // or <Spinner />
    }

    // 2. If User IS Logged In -> Kick them to Dashboard
    if (user && user.id) {
        return <Navigate to="/" replace />;
    }

    // 3. If User IS NOT Logged In -> Allow access to Login Page
    return children;
};

export default GuestRoute;