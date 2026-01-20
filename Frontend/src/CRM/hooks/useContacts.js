import api from "@/api/axiosAPI";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";

// 1. GET Contacts
export const useContactsByCompany = (companyId, searchName = "") => {
    return useQuery({
        // Cheia include searchName pentru a declanșa refetch automat la tastare
        queryKey: ['contactsByCompany', companyId, searchName],

        queryFn: async () => {
            // Pasăm 'q' (query) către backend
            const { data } = await api.get(`/CRM/Contacts/getContactsByCompany/${companyId}`, {
                params: { q: searchName }
            });
            return data;
        },
        // Nu face request dacă nu avem ID de companie
        enabled: !!companyId,
        placeholderData: (previousData) => previousData,
    });
}

// 2. ADD Contact
export const useAddContact = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ companyId, formData }) => {
            // companyId nu e neapărat necesar aici dacă e deja în formData, 
            // dar e util pentru consistență
            return api.post("/CRM/Contacts/postContact", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
        },
        onSuccess: (data, variables) => {
            // Invalidează lista specifică acelei companii
            // Funcționează perfect cu Fuzzy Matching (invalidează și căutările)
            queryClient.invalidateQueries({ queryKey: ['contactsByCompany', variables.companyId] });
        }
    });
};