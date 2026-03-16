import React, { useContext, useEffect } from 'react';
import { Navigate, useLocation, useParams } from 'react-router-dom';
import { AuthContext } from '../context/TokenContext';
import SpinnerElement from './SpinnerElement';
import { toast } from 'sonner';

const ProtectedRoute = ({ children, module, action = 'v', friendlyName = "aceasta pagină/acțiune" }) => {
    const { user, loading } = useContext(AuthContext);

    const { limbaUser } = useParams();

    // Verificăm permisiunile
    const hasAccess = () => {
        if (!user || !user.id) return false;
        if (user.permissions?.superAdmin) return true;
        if (!module) return true;
        if (limbaUser && !user.permissions.limbi.includes(limbaUser)) return false; // Verificare limbă dacă e cazul

        const moduleActions = user.permissions?.permisiuni?.[module] || "";
        return moduleActions.includes(action);
    };

    const accessGranted = hasAccess();

    // Declanșăm toast-ul doar când accesul este refuzat și nu mai suntem în loading
    useEffect(() => {
        if (!loading && user?.id && !accessGranted) {
            toast.warning("Acces interzis", {
                description: `Nu ai permisiuni pentru ${friendlyName || "aceasta pagină/acțiune"}.`,
                duration: 4000,
            });
        }
    }, [loading, user?.id, accessGranted, module, action, friendlyName]);

    if (loading) {
        return <SpinnerElement text={3} />;
    }
    if (!user || !user.id) {
        return <Navigate to="/login" replace />;
    }

    if (!accessGranted) {
        // Redirectăm la home, useEffect-ul de mai sus se va ocupa de mesaj
        return <Navigate to="/" replace />;
    }

    return children;
};

export default ProtectedRoute;