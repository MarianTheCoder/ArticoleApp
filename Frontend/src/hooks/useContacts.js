import api from "@/api/axiosAPI";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";

// 1. GET Contacts
export const useContactsByCompany = (companyId, searchName = "") => {
    return useQuery({
        // Cheia include searchName pentru a declanșa refetch automat la tastare
        queryKey: ['contacts', 'company', companyId, searchName],

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

export const useContacteSelect = (companyId) => {
    return useQuery({
        queryKey: ['contacts', 'select', companyId],
        queryFn: async () => {
            const res = await api.get(`/CRM/Santiere/getSantiereForContacte/${companyId}`);
            return res.data;
        },
        staleTime: 1000 * 60, // 1 minute
        enabled: !!companyId,
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
            queryClient.invalidateQueries({ queryKey: ['contacts'] });
            queryClient.invalidateQueries({ queryKey: ['santiere'] });
            queryClient.invalidateQueries({ queryKey: ['filiale'] });
            queryClient.invalidateQueries({ queryKey: ['companies'] });
        }
    });
};

// 3. EDIT Contact
export const useEditContact = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ contactId, companyId, formData }) => {
            return api.post(`/CRM/Contacts/editContact/${contactId}`, formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
        },
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['contacts'] });
            queryClient.invalidateQueries({ queryKey: ['santiere'] });
            queryClient.invalidateQueries({ queryKey: ['filiale'] });
            queryClient.invalidateQueries({ queryKey: ['companies'] });
        }
    });
}
// 4. CHANGE OWNER
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
            queryClient.invalidateQueries({ queryKey: ['contacts'] });
            queryClient.invalidateQueries({ queryKey: ['santiere'] });
            queryClient.invalidateQueries({ queryKey: ['filiale'] });
            queryClient.invalidateQueries({ queryKey: ['companies'] });
        }
    });
};

// 5. REMOVE OWNER
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
            queryClient.invalidateQueries({ queryKey: ['contacts'] });
            queryClient.invalidateQueries({ queryKey: ['santiere'] });
            queryClient.invalidateQueries({ queryKey: ['filiale'] });
            queryClient.invalidateQueries({ queryKey: ['companies'] });
        }
    });
};

// 6. DELETE Contact
export const useDeleteContact = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ contactId, companyId }) => {
            return api.delete(`/CRM/Contacts/deleteContact/${contactId}`);
        },
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['contacts'] });
            queryClient.invalidateQueries({ queryKey: ['santiere'] });
            queryClient.invalidateQueries({ queryKey: ['filiale'] });
            queryClient.invalidateQueries({ queryKey: ['companies'] });
        }
    });
}





// 
//
// HISTORY FOR CONTACTS
export const useContactHistory = (contactId) => {
    return useQuery({
        // Cheia include searchName pentru a declanșa refetch automat la tastare
        queryKey: ['contacts', 'history', contactId],

        queryFn: async () => {
            const { data } = await api.get(`/CRM/Notifications/history/contact/${contactId}`);
            return data;
        },
        // Nu face request dacă nu avem ID de companie
        enabled: !!contactId,
        placeholderData: (previousData) => previousData,
    });
}

