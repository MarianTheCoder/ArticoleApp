import api from "@/api/axiosAPI";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";

// 1. GET Conturi (Utilizatori)
// Suportă căutare globală și filtrare după compania internă
export const useConturi = (searchName = "") => {
    return useQuery({
        queryKey: ['conturi', 'all', searchName],
        queryFn: async () => {
            const { data } = await api.get(`/users/GetAllUsers`, {
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

// 1. GET Conturi (Utilizatori)
// Suportă căutare globală și filtrare după compania internă
export const useRoleTemplates = () => {
    return useQuery({
        queryKey: ['conturi', 'role_templates'],
        queryFn: async () => {
            const { data } = await api.get(`/users/getAllTemplates`);
            return data;
        },
        placeholderData: (previousData) => previousData,
        staleTime: 1000 * 60 * 2, // 5 minute
    });
};


// 2. ADD Cont (Utilizator)
export const useAddCont = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (formData) => {
            const { data } = await api.post("/users/saveCont", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            return data;
        },
        onSuccess: () => {
            // Invalidează lista de conturi și datele din navbar (deoarece aparțin de utilizatori)
            queryClient.invalidateQueries({ queryKey: ['conturi'] });
            queryClient.invalidateQueries({ queryKey: ['companies', 'navbarData'] });
        }
    });
};

// 2. ADD Template
export const useAddTemplate = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (obj) => {
            // Folosim multipart/form-data pentru a permite și upload-ul photo_url (avatar)
            const { data } = await api.post("/users/saveTemplate", obj);
            return data;
        },
        onSuccess: () => {
            // Invalidează lista de conturi și datele din navbar (deoarece aparțin de utilizatori)
            queryClient.invalidateQueries({ queryKey: ['conturi'] });
            queryClient.invalidateQueries({ queryKey: ['companies', 'navbarData'] });
        }
    });
};

// 3. EDIT Cont (Utilizator)
export const useEditCont = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ userId, data }) => {
            // Trimitem ca FormData pentru a suporta actualizarea pozei de profil
            const { data: responseData } = await api.post(`/users/editCont/${userId}`, data, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            return responseData;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['conturi'] });
            queryClient.invalidateQueries({ queryKey: ['companies', 'navbarData'] });
        }
    });
};

// 3. EDIT Template
export const useEditTemplate = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (obj) => {
            // Trimitem ca FormData pentru a suporta actualizarea pozei de profil
            const { data } = await api.post(`/users/editTemplate/${obj.id}`, obj);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['conturi'] });
            queryClient.invalidateQueries({ queryKey: ['companies', 'navbarData'] });
        }
    });
};

// 4. DELETE Cont (Utilizator)
export const useDeleteCont = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ userId, code }) => {
            // Trimitem un cod de confirmare dacă sistemul o cere (conform DeleteDialog-ului tău)
            const { data } = await api.delete(`/users/deleteUser/${userId}`, {
                data: { code }
            });
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['conturi'] });
            queryClient.invalidateQueries({ queryKey: ['companies', 'navbarData'] });
        }
    });
};

export const useDeleteTemplate = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id: templateId, code }) => {
            // Trimitem un cod de confirmare dacă sistemul o cere (conform DeleteDialog-ului tău)
            const { data } = await api.delete(`/users/deleteTemplate/${templateId}`, {
                data: { code }
            });
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['conturi'] });
            queryClient.invalidateQueries({ queryKey: ['companies', 'navbarData'] });
        }
    });
};


// ------------ ATRIBUIRI ACTIVITATE ------------

export const useAtribuiriData = () =>
    useQuery({
        queryKey: ["santiere", "atribuiri"],
        queryFn: async () => {
            const { data } = await api.get("/users/getAtribuiri");
            return data; // { users, santiere, assignments }
        },
        staleTime: 1000 * 60 * 2,
    });

export const useSaveAtribuiri = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ utilizatorID, santier_ids }) => {
            const { data } = await api.post("/users/saveAtribuiri", { utilizatorID, santier_ids });
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['conturi'] });
            queryClient.invalidateQueries({ queryKey: ['companies', 'navbarData'] });
            queryClient.invalidateQueries({ queryKey: ["santiere"] })
        }

    });
};

