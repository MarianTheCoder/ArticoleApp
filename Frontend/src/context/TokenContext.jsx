import React, { createContext, useState, useEffect, useCallback } from 'react';
import api from '../api/axiosAPI';
import { jwtDecode } from "jwt-decode";
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const navigate = useNavigate();

    // 1. Minimal State
    const [token, setToken] = useState(localStorage.getItem('token') || null);
    const [refreshTrigger, setRefreshTrigger] = useState(0); // Trigger-ul nou

    const [user, setUser] = useState({
        id: null,
        name: null,
        company_id: null,
        permissions: null
    });
    const [loading, setLoading] = useState(true);

    // 2. Centralized Helper: Handles Decoding & Setting State
    // This removes duplicate code from login/checkToken
    const handleUserSession = useCallback((rawToken) => {
        if (!rawToken) {
            clearSession();
            return;
        }
        try {
            const decoded = jwtDecode(rawToken);
            // Set User
            setUser({
                id: decoded.id,
                name: decoded.user,
                company_id: decoded.company_id,
                permissions: decoded.permissions || null,
            });

            // Set Token
            setToken(rawToken);
            localStorage.setItem('token', rawToken);
        } catch (err) {
            toast.error("Eroare la procesarea token-ului. Te rugăm să te loghezi din nou.");
            clearSession();
        }
    }, []);

    // 3. Helper: Clear Session
    const clearSession = useCallback(() => {
        localStorage.removeItem('token');
        setToken(null);
        setUser({ id: null, company_id: null, name: null, permissions: null });
    }, []);

    // 4. On Mount: Check Validity
    useEffect(() => {
        const initAuth = async () => {
            // console.log("Inițializăm autentificarea...");
            const storedToken = localStorage.getItem('token');
            if (!storedToken) {
                setLoading(false);
                return;
            }
            try {
                // Verify with backend that token is still valid (not banned/expired)
                const res = await api.get('/auth/checkToken');
                if (res.data.token) {
                    handleUserSession(res.data.token);
                    if (refreshTrigger > 0) {
                        toast.success("Informațiile despre token au fost actualizate.");
                    }
                } else {
                    // Dacă backend-ul nu dă token nou, îl folosim pe cel vechi (deja stocat)
                    handleUserSession(storedToken);
                }
            } catch (err) {
                toast.error('Token check failed: ' + (err.response?.data?.message || err.message));
                clearSession();
            } finally {
                setLoading(false);
            }
        };

        initAuth();
    }, [handleUserSession, clearSession, refreshTrigger]);

    const triggerRefresh = () => {
        setRefreshTrigger(prev => prev + 1);
    };

    // 5. Login Action
    const login = async (email, password, roleIndex) => {
        try {
            const response = await api.post(`/auth/login`, {
                email,
                password,
            });

            const newToken = response.data.token;
            handleUserSession(newToken); // Re-use our centralized helper
            return { success: true };
        } catch (err) {
            return { success: false, error: err.response?.data?.message || err.message };
        }
    };

    // 6. Logout Action
    const logout = () => {
        clearSession();
        navigate('/login'); // Soft navigation instead of window.reload()
    };

    return (
        <AuthContext.Provider value={{
            token,
            user,
            loading,
            login,
            logout,
            triggerRefresh,
        }}>
            {children}
        </AuthContext.Provider>
    );
};