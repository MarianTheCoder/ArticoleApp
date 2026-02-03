import React, { useContext } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/TokenContext';

const ProtectedRoute = ({ children, allowedRoles }) => {
    // 1. Remove decodeToken. The Provider does this automatically on mount.
    const { user, loading } = useContext(AuthContext);
    const location = useLocation();

    if (loading) {
        return <div className="p-4">Loading...</div>; // Or your Spinner component
    }

    // 2. Not Logged In? -> Kick to Login
    if (!user || !user.role) {
        // 'state={{ from: location }}' allows you to redirect them back after login
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // 3. Wrong Role? -> Kick to Home
    if (allowedRoles && !allowedRoles.includes(user.role)) {
        return <Navigate to="/" replace />;
    }

    return children;
};

export default ProtectedRoute;