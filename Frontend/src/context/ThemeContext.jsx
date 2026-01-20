import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const ThemeContext = createContext(null);
const STORAGE_KEY = "theme"; // "light" | "dark"

function applyTheme(theme) {
    document.documentElement.classList.toggle("dark", theme === "dark");
}

export function ThemeProvider({ children, defaultTheme = "light" }) {
    const [theme, setTheme] = useState(() => {
        const saved = localStorage.getItem(STORAGE_KEY) || defaultTheme;
        applyTheme(saved); // apply immediately to avoid flash
        return saved;
    });

    useEffect(() => {
        applyTheme(theme);
        localStorage.setItem(STORAGE_KEY, theme);
    }, [theme]);

    const value = useMemo(() => ({ theme, setTheme }), [theme]);
    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
    return ctx;
}