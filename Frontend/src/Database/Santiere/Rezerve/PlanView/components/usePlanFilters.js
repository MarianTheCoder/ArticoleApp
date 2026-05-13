import { useState, useMemo } from 'react';

export const usePlanFilters = (pins) => {
    const [filters, setFilters] = useState({
        status: "",
        assignedId: "",
        createdBy: "",
        title: "",
        reper: "",
        dueUntil: "",
        lastUpdated: "",
        noUntil: false,
    });

    const filteredPins = useMemo(() => {
        return (pins || []).filter((p) => {
            if (filters.status && p.status !== filters.status) return false;
            if (filters.assignedId && String(p.assigned_user_id || "") !== String(filters.assignedId)) return false;
            if (filters.createdBy) {
                const needle = filters.createdBy.toLowerCase();
                if (!(p.user_name || "").toLowerCase().includes(needle)) return false;
            }
            if (filters.title) {
                const needle = filters.title.toLowerCase();
                if (!(p.title || "").toLowerCase().includes(needle) && !(p.code || "").toLowerCase().includes(needle)) return false;
            }
            if (filters.reper) {
                const hay = (p.landmark || p.reper || p.reference || "").toLowerCase();
                if (!hay.includes(filters.reper.toLowerCase())) return false;
            }
            if (filters.dueUntil) {
                const due = p.due_date ? new Date(p.due_date) : null;
                const until = new Date(filters.dueUntil + "T23:59:59");
                if (due && due > until) return false;
            }
            if (filters.noUntil && !p.due_date) return false;
            if (filters.lastUpdated) {
                if (!p.updated_at) return false;
                const updatedDate = new Date(p.updated_at);
                if (Number.isNaN(updatedDate.getTime())) return false;
                const updatedStr = updatedDate.toISOString().slice(0, 10);
                if (updatedStr !== filters.lastUpdated) return false;
            }
            return true;
        });
    }, [pins, filters]);

    return { filters, setFilters, filteredPins };
};