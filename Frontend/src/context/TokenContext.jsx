import React, { createContext, useState, useEffect, useCallback } from 'react';
import api from '../api/axiosAPI';
import { jwtDecode } from "jwt-decode";
import { useNavigate } from 'react-router-dom';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const navigate = useNavigate();

    // 1. Minimal State
    const [token, setToken] = useState(localStorage.getItem('token') || null);
    const [user, setUser] = useState({ id: null, role: null, name: null });
    const [color, setColor] = useState("");
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
                role: decoded.role,
                name: decoded.user || decoded.sub, // Fallback if 'user' key varies
            });

            // Set Color
            const roleColors = {
                'angajat': 'text-emerald-500',
                'ofertant': 'text-blue-600',
                'beneficiar': 'text-amber-500' // Default fallback
            };
            setColor(roleColors[decoded.role] || 'text-amber-500');

            // Set Token
            setToken(rawToken);
            localStorage.setItem('token', rawToken);
            if (decoded.photo) localStorage.setItem('photoUser', decoded.photo);

        } catch (err) {
            console.error("Token decode failed", err);
            clearSession();
        }
    }, []);

    // 3. Helper: Clear Session
    const clearSession = useCallback(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('photoUser');
        setToken(null);
        setUser({ id: null, role: null, name: null });
        setColor("");
    }, []);

    // 4. On Mount: Check Validity
    useEffect(() => {
        const initAuth = async () => {
            const storedToken = localStorage.getItem('token');
            if (!storedToken) {
                setLoading(false);
                return;
            }

            try {
                // Verify with backend that token is still valid (not banned/expired)
                await api.get('/auth/checkToken');
                // If success, load data into state
                console.log("Token valid");
                handleUserSession(storedToken);
            } catch (err) {
                console.log('Token check failed:', err);
                clearSession();
            } finally {
                setLoading(false);
            }
        };

        initAuth();
    }, [handleUserSession, clearSession]);

    // 5. Login Action
    const login = async (email, password, roleIndex) => {
        const roles = ["angajat", "beneficiar", "ofertant"]; // Map index to string
        try {
            const response = await api.post(`/auth/login`, {
                email,
                password,
                role: roles[roleIndex],
            });

            const newToken = response.data.token;
            handleUserSession(newToken); // Re-use our centralized helper
            return { success: true };
        } catch (err) {
            console.error('Login failed:', err);
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
            color,
            login,
            logout,
            // Removed getters/setters that shouldn't be exposed
            // Removed santiere/beneficiari (Move these to a DataContext or specialized hook)
        }}>
            {children}
        </AuthContext.Provider>
    );
};