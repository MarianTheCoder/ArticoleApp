import api from "@/api/axiosAPI";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";

// 1. GET Contacts
export const useContactsByCompany = (companyId, searchName = "") => {
    return useQuery({
        // Cheia include searchName pentru a declanșa refetch automat la tastare
        queryKey: ['contactsByCompany', companyId, searchName],

        queryFn: async () => {
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
        mutationFn: ({ companyId, formData, }) => {
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
            queryClient.invalidateQueries({ queryKey: ['company'] });
            queryClient.invalidateQueries({ queryKey: ['companies'] });

        }
    });
};

export const useEditContact = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ contactId, companyId, formData }) => {
            return api.post(`/CRM/Contacts/editContact/${contactId}`, formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
        },
        onSuccess: (data, variables) => {
            // Invalidează lista specifică acelei companii
            queryClient.invalidateQueries({ queryKey: ['contactsByCompany', variables.companyId] });
            queryClient.invalidateQueries({ queryKey: ['company'] });
            queryClient.invalidateQueries({ queryKey: ['companies'] });

        }
    });
}

export const useChangeOwner = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ contactId, companyId, user_id }) => {
            return api.post(`/CRM/Contacts/changeOwner`, {
                contactId,
                companyId,
                user_id
            });
        },
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['contactsByCompany', variables.companyId] });
            queryClient.invalidateQueries({ queryKey: ['company'] });
            queryClient.invalidateQueries({ queryKey: ['companies'] });
        }
    });
};


export const useRemoveOwner = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ contactId, companyId, user_id }) => {
            return api.post(`/CRM/Contacts/removeOwner`, {
                contactId,
                companyId,
                user_id
            });
        },
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['contactsByCompany', variables.companyId] });
            queryClient.invalidateQueries({ queryKey: ['company'] });
            queryClient.invalidateQueries({ queryKey: ['companies'] });
        }
    });
};

export const useDeleteContact = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ contactId, companyId }) => {
            return api.delete(`/CRM/Contacts/deleteContact/${contactId}`);
        },
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['contactsByCompany', variables.companyId] });
            queryClient.invalidateQueries({ queryKey: ['company'] });
            queryClient.invalidateQueries({ queryKey: ['companies'] });
        }
    });
}


