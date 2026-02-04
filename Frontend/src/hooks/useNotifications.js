import api from "@/api/axiosAPI";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useContext } from "react";
import { AuthContext } from "@/context/TokenContext";

// 1. GET Notifications (Keeps the 1-minute auto-refresh)
export const useGetNotifications = () => {
    const { user } = useContext(AuthContext);

    return useQuery({
        queryKey: ['notifications'],
        queryFn: async () => {
            const { data } = await api.get('/CRM/Notifications/getNotifications');
            return data;
        },
        enabled: !!user?.id,
        refetchInterval: 60000, // Refetch every 60s
        refetchOnWindowFocus: false,
        retry: false,
    });
};

// 2. MARK READ (Manual Update - No Refetch)
export const useMarkRead = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id) => {
            return api.post(`/CRM/Notifications/read/${id}`);
        },
        onSuccess: (response, variables) => {
            // 'variables' contains the ID we just marked as read
            const notificationId = variables;

            // Update the cache directly without calling the server
            queryClient.setQueryData(['notifications'], (oldData) => {
                if (!oldData) return oldData;

                // Check if it was actually unread (to avoid messing up the count)
                const target = oldData.notifications.find(n => n.id === notificationId);
                const wasUnread = target && !target.is_read;

                return {
                    ...oldData,
                    // Decrease count only if it was unread
                    unreadCount: wasUnread ? Math.max(0, oldData.unreadCount - 1) : oldData.unreadCount,
                    // Mark specific item as read
                    notifications: oldData.notifications.map(n =>
                        n.id === notificationId ? { ...n, is_read: true } : n
                    )
                };
            });
        },
    });
};

// 3. MARK ALL READ (Manual Update - No Refetch)
export const useMarkAllRead = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: () => {
            return api.post(`/CRM/Notifications/readAll`);
        },
        onSuccess: () => {
            // Instantly mark everything as read locally
            queryClient.setQueryData(['notifications'], (oldData) => {
                if (!oldData) return oldData;

                return {
                    ...oldData,
                    unreadCount: 0,
                    notifications: oldData.notifications.map(n => ({ ...n, is_read: true }))
                };
            });
        },
    });
};