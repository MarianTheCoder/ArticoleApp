import api from '@/api/axiosAPI';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// --- FETCH ---
export const useFilialeByCompany = (companyId, search = "") => {
    return useQuery({
        queryKey: ['filiale', companyId ? 'company' : 'all', companyId, search],
        queryFn: async () => {
            // 2. Dynamic URL: Handle the endpoint difference
            const url = companyId
                ? `/CRM/Filiale/getFilialeForCompanies/${companyId}` // Get specific
                : `/CRM/Filiale/getAllFiliale`;

            const res = await api.get(url, {
                params: { q: search }
            });
            return res.data;
        },
        placeholderData: (previousData) => previousData, // Prevents flashing when searching
    });
};

export const useFilialeSelect = (companyId) => {
    return useQuery({
        queryKey: ['filiale', 'select', companyId],
        queryFn: async () => {
            const res = await api.get(`/CRM/Filiale/getFilialeForSantiere/${companyId}`);
            return res.data.filiale;
        },
        staleTime: 1000 * 60, // 1 minute
    });
}

// --- ADD ---
export const useAddFiliale = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ companyId, data }) => {
            const res = await api.post(`/CRM/Filiale/postFiliala`, data);
            return res.data;
        },
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['contacts'] });
            queryClient.invalidateQueries({ queryKey: ['companies'] });
            queryClient.invalidateQueries({ queryKey: ['santiere'] });
            queryClient.invalidateQueries({ queryKey: ['filiale'] });

        },
    });
};

// --- EDIT ---
export const useEditFiliale = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ filialaId, companyId, data }) => {
            const res = await api.post(`/CRM/Filiale/editFiliala/${filialaId}`, data);
            return res.data;
        },
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['contacts'] });
            queryClient.invalidateQueries({ queryKey: ['companies'] });
            queryClient.invalidateQueries({ queryKey: ['santiere'] });
            queryClient.invalidateQueries({ queryKey: ['filiale'] });
        },
    });
};

// --- DELETE ---
export const useDeleteFiliale = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ filialaId, companyId, code }) => {
            console.log(`Deleting Filiala ID ${filialaId} with code:`, code);
            const res = await api.delete(`/CRM/Filiale/deleteFiliala/${filialaId}`,
                { data: { code } }
            );
            return res.data;
        },
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['contacts'] });
            queryClient.invalidateQueries({ queryKey: ['companies'] });
            queryClient.invalidateQueries({ queryKey: ['santiere'] });
            queryClient.invalidateQueries({ queryKey: ['filiale'] });
        }
    });
};