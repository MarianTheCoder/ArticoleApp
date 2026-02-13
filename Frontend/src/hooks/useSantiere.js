import api from '@/api/axiosAPI';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// --- FETCH ---
export const useSantiereByCompany = (companyId, search = "") => {
    return useQuery({
        queryKey: ['santiere', companyId ? 'company' : "all", companyId, search],
        queryFn: async () => {

            const url = companyId
                ? `/CRM/Santiere/getSantiereForCompanies/${companyId}` // Get specific
                : `/CRM/Santiere/getAllSantiere`;
            const res = await api.get(url, {
                params: { q: search }
            });
            return res.data;
        },
        placeholderData: (previousData) => previousData, // Păstrează datele vechi ca să nu dea flash
    });
};

// --- ADD ---
export const useAddSantier = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ companyId, data }) => {
            console.log("Adding Santier with data:", data); // Debug log for payload
            const res = await api.post(`/CRM/Santiere/postSantier`, data);
            return res.data;
        },
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['contacts'] });
            queryClient.invalidateQueries({ queryKey: ['santiere'] });
            queryClient.invalidateQueries({ queryKey: ['filiale'] });
            queryClient.invalidateQueries({ queryKey: ['companies'] });
        },
    });
};

// --- EDIT ---
export const useEditSantier = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ santierId, companyId, data }) => {
            const res = await api.post(`/CRM/Santiere/editSantier/${santierId}`, data);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['santiere'] });
            queryClient.invalidateQueries({ queryKey: ['companies'] });
            queryClient.invalidateQueries({ queryKey: ['contacts'] });
            queryClient.invalidateQueries({ queryKey: ['filiale'] });
        },
    });
};

// --- DELETE ---
export const useDeleteSantier = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ santierId, companyId, code }) => {
            console.log(`Deleting Santier ID ${santierId} with code:`, code); // Debug log for delete action
            const res = await api.delete(`/CRM/Santiere/deleteSantier/${santierId}`,
                { data: { code } }
            );
            return res.data;
        },
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['santiere'] });
            queryClient.invalidateQueries({ queryKey: ['contacts'] });
            queryClient.invalidateQueries({ queryKey: ['filiale'] });
            queryClient.invalidateQueries({ queryKey: ['companies'] });

        }
    });
};