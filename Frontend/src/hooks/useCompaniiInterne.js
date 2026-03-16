import api from "@/api/axiosAPI";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";

// 1. GET Companii Interne
// Suportă căutare globală
export const useCompaniiInterne = (searchName = "") => {
    return useQuery({
        queryKey: ['companii_interne', 'all', searchName],
        queryFn: async () => {
            // Ajustează ruta de API conform backend-ului tău
            const { data } = await api.get(`/CRM/Companies/getCompaniesInterne`, {
                params: {
                    q: searchName,
                }
            });
            return data;
        },
        placeholderData: (previousData) => previousData,
        staleTime: 1000 * 60 * 2, // 2 minute
    });
};

// 2. ADD Companie Internă
export const useAddCompanieInterna = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (formData) => {
            // Dacă ai upload de logo, poți lăsa ca multipart/form-data. 
            // Altfel, poți scoate headers-urile dacă trimiți doar JSON.
            return api.post("/CRM/Companies/postCompanieInterna", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['companii_interne'] });
            queryClient.invalidateQueries({ queryKey: ['conturi'] });
            queryClient.invalidateQueries({ queryKey: ['companies', 'navbarData'] });
        }
    });
};

// 3. EDIT Companie Internă
export const useEditCompanieInterna = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ companieId, data }) => {
            return api.put(`/CRM/Companies/editCompanieInterna/${companieId}`, data, {
                headers: { "Content-Type": "multipart/form-data" },
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['companii_interne'] });
            queryClient.invalidateQueries({ queryKey: ['conturi'] });
            queryClient.invalidateQueries({ queryKey: ['companies', 'navbarData'] });
        }
    });
};

// 4. DELETE Companie Internă
export const useDeleteCompanieInterna = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ companieId, code }) => {
            return api.delete(`/CRM/Companies/deleteCompanieInterna/${companieId}`, {
                data: { code }
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['companii_interne'] });
            queryClient.invalidateQueries({ queryKey: ['conturi'] });
            queryClient.invalidateQueries({ queryKey: ['companies', 'navbarData'] });
        }
    });
};