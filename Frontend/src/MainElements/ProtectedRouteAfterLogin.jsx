import React, { useContext, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/TokenContext';
import { useLoading } from '@/context/LoadingContext';

const GuestRoute = ({ children }) => {
    const { user, loading } = useContext(AuthContext);
    const { show, hide } = useLoading();

    useEffect(() => {
        if (loading) {
            show();
        } else {
            hide();
        }
    }, [loading]);

    if (loading) {
        return null; // or <Spinner />
    }
    // console.log("GuestRoute - user:", user);
    // 2. If User IS Logged In -> Kick them to Dashboard
    if (user && user.id) {
        return <Navigate to="/" replace />;
    }

    // 3. If User IS NOT Logged In -> Allow access to Login Page
    return children;
};

export default GuestRoute;