import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/api/axiosAPI";


export const useCompany = (id) => {
    return useQuery({
        queryKey: ["company", id],
        queryFn: async () => {
            const { data } = await api.get(`/CRM/Companies/getCompany/${id}`);
            return data;
        },
        placeholderData: (previousData) => previousData, // Păstrează datele vechi ca să nu dea flash
    });
}

// 1. GET - Doar aduce datele
export const useCompanies = (searchName) => {
    return useQuery({
        queryKey: ["companies", { q: searchName }],
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
        onSuccess: (data, variables) => {
            // Doar invalidăm lista ca să se actualizeze singură
            queryClient.invalidateQueries({ queryKey: ["companies"] });
            queryClient.invalidateQueries({ queryKey: ["company", String(variables.id)] });
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