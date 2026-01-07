import React, { createContext, useContext, useMemo, useState, useRef, useCallback } from "react";
import SpinnerElement from "../MainElements/SpinnerElement";

const LoadingContext = createContext(null);

export function LoadingProvider({ children }) {
    // ref-count so multiple async ops can overlap safely
    const counterRef = useRef(0);
    const [loading, setLoading] = useState(false);

    const show = useCallback(() => {
        counterRef.current += 1;
        if (!loading) setLoading(true);
    }, [loading]);

    const hide = useCallback(() => {
        counterRef.current = Math.max(0, counterRef.current - 1);
        if (counterRef.current === 0) setLoading(false);
    }, []);

    // direct setter if you really want boolean control
    const set = useCallback((v) => {
        counterRef.current = v ? 1 : 0;
        setLoading(!!v);
    }, []);

    // helper to wrap a promise/async fn
    const withLoader = useCallback(async (promiseOrFn) => {
        show();
        try {
            const p = typeof promiseOrFn === "function" ? promiseOrFn() : promiseOrFn;
            return await p;
        } finally {
            hide();
        }
    }, [show, hide]);

    const value = useMemo(() => ({ loading, show, hide, set, withLoader }), [loading, show, hide, set, withLoader]);

    return (
        <LoadingContext.Provider value={value}>
            {/* overlay spinner lives here, globally */}
            {loading && <SpinnerElement text={3} />}
            {children}
        </LoadingContext.Provider>
    );
}

export function useLoading() {
    const ctx = useContext(LoadingContext);
    if (!ctx) throw new Error("useLoading must be used inside <LoadingProvider>");
    return ctx;
}