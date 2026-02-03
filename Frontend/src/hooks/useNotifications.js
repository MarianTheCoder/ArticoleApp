import api from "@/api/axiosAPI";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useContext } from "react";
import { AuthContext } from "@/context/TokenContext";

// 1. GET Notifications
export const useGetNotifications = () => {
    const { user } = useContext(AuthContext);

    return useQuery({
        queryKey: ['notifications'],
        queryFn: async () => {
            const { data } = await api.get('/CRM/Notifications/getNotifications');
            return data;
        },
        enabled: !!user?.id,
        refetchInterval: 60000,
        refetchOnWindowFocus: false,
        retry: false,
    });
};

// 2. MARK READ (Single)
export const useMarkRead = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id) => {
            return api.post(`/CRM/Notifications/read/${id}`);
        },
        onSuccess: () => {
            // Invalidează lista de notificări pentru a face refetch
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        },
    });
};

// 3. MARK ALL READ
export const useMarkAllRead = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: () => {
            return api.post(`/CRM/Notifications/readAll`);
        },
        onSuccess: () => {
            // Invalidează lista de notificări
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        },
    });
};