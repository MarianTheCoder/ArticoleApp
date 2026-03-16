import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/api/axiosAPI";


export const useCompany = (id) => {
    return useQuery({
        queryKey: ["companies", Number(id)],
        queryFn: async () => {
            const { data } = await api.get(`/CRM/Companies/getCompany/${id}`);
            return data;
        },
        enabled: !!id, // Nu face request dacă id e falsy
        placeholderData: (previousData) => previousData, // Păstrează datele vechi ca să nu dea flash
    });
}

export const useCompaniesSelect = () => {
    return useQuery({
        queryKey: ['companies', 'select'],
        queryFn: async () => {
            const res = await api.get(`/CRM/Companies/getCompaniesSelect`);
            return res.data;
        },
        staleTime: 1000 * 60, // 1 minute
    });
}

// 1. GET - Doar aduce datele
export const useCompanies = (searchName) => {
    return useQuery({
        queryKey: ["companies", "company", { q: searchName }],
        queryFn: async () => {
            const { data } = await api.get("/CRM/Companies/getCompanies", {
                params: { q: searchName }
            });
            return data;
        },
        placeholderData: (previousData) => previousData, // Păstrează datele vechi ca să nu dea flash
    });
};

// 2. POST - Doar trimite datele
export const useAddCompany = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (formData) => {
            return api.post("/CRM/Companies/postCompany", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
        },
        onSuccess: () => {
            // Doar invalidăm lista ca să se actualizeze singură
            queryClient.invalidateQueries({ queryKey: ["companies"] });
        }
    });
};

export const useEditCompany = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, formData }) => {
            return api.put(`/CRM/Companies/editCompany/${id}`, formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
        },
        onSuccess: () => {
            // Doar invalidăm lista ca să se actualizeze singură
            queryClient.invalidateQueries({ queryKey: ["companies"] });

        }
    });
};

export const useDeleteCompany = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, code }) => {
            return api.delete(`/CRM/Companies/deleteCompany/${id}`, {
                data: { code } // Trimitem codul în body
            });
        },
        onSuccess: () => {
            // Invalidate the companies query to refresh the list
            queryClient.invalidateQueries({ queryKey: ["companies"] });
        }
    });
}

//
//
// HISTORY FOR COMPANIES

export const useCompanyHistory = (companyId, filialaId = null, santierId = null) => {
    return useQuery({
        // Cheia include searchName pentru a declanșa refetch automat la tastare
        queryKey: ['companies', 'history', companyId, filialaId, santierId],

        queryFn: async () => {
            const { data } = await api.get(`/CRM/Notifications/history/company/${companyId}`,
                { params: { filialaId, santierId } }
            );
            return data;
        },
        // Nu face request dacă nu avem ID de companie
        enabled: !!companyId,
        placeholderData: (previousData) => previousData,
    });
}