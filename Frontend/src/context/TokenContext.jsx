import React, { createContext, useState, useEffect } from 'react';
import api from '../api/axiosAPI'
import { jwtDecode } from "jwt-decode";
import { useNavigate } from 'react-router-dom';

// Create AuthContext
export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {

    const navigate = useNavigate();

    const [token, setToken] = useState(null);
    const [user, setUser] = useState({ id: null, role: null, name: null });
    const [loading, setLoading] = useState(true); // New loading state
    const [color, setColor] = useState("");

    const getDecodedToken = (token) => {
        if (token) {
            try {
                return jwtDecode(token); // Decode the token
            } catch (err) {
                console.error('Error decoding token:', err);
                return null; // Return null if the token is invalid
            }
        }
        return null; // Return null if no token exists
    };
    
    useEffect(() => {
      decodeToken();
    }, [])
    

    const decodeToken = () =>{
        const storedToken = localStorage.getItem('token');
        console.log("check" , storedToken);
        if (storedToken) {
            const decoded = getDecodedToken(storedToken);
            if (decoded) {
                if (decoded.role === 'angajat') {
                    setColor('text-emerald-500');
                } else if (decoded.role === 'ofertant') {
                    setColor('text-blue-600');
                } else {
                    setColor('text-amber-500');
                }
                setToken(storedToken);
                setUser({
                    id: decoded.id,
                    role: decoded.role,
                    name: decoded.user,
                });
            } else {
                localStorage.removeItem('token'); // Remove invalid token
                localStorage.removeItem('photoUser');
            }
        }
        else{
            setToken(null);
            setUser({ id: null, role: null, user: null });
        }
        setLoading(false);
    }

    // Login function
    const login = async (email, password, role) => {
        const users = ["angajat", "beneficiar", "ofertant"];
        try {
            const response = await api.post(`/auth/login`, {
                email,
                password,
                role:users[role],
            });

            const newToken = response.data.token;

            // Store the token and decode user info
            localStorage.setItem('token', newToken);
            const decoded = getDecodedToken(newToken);
            if (decoded.role === 'angajat') {
                setColor('text-emerald-500');
            } else if (decoded.role === 'ofertant') {
                setColor('text-blue-600');
            } else {
                setColor('text-amber-500');
            }
            setToken(newToken);
            localStorage.setItem('photoUser', decoded.photo);
            console.log(decoded);
            setUser({
                id: decoded.id,
                role: decoded.role,
                name: decoded.user,
            });
        } catch (err) {
            console.error('Login failed:', err.response?.data?.message || err.message);
            return err; // Re-throw error for frontend handling
        }
    };

    // Logout function
    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('photoUser');
        setToken(null);
        setUser({ id: null, role: null, user: null });
        window.location.reload();
    };

    return (
        <AuthContext.Provider value={{ token, user, login, logout, getDecodedToken, decodeToken, loading , color}}>
            {children}
        </AuthContext.Provider>
    );
};
