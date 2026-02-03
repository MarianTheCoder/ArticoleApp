import React, { useState, useEffect, useRef } from 'react';
// IMPORT THE 3 SEPARATE HOOKS
import { useGetNotifications, useMarkRead, useMarkAllRead } from '@/hooks/useNotifications';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBell, faCheckDouble } from '@fortawesome/free-solid-svg-icons';
import { cn } from "@/lib/utils";
import { toast } from "sonner"; // IMPORT TOAST

// Helper for "5m ago"
const timeAgo = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = (now - date) / 1000; // seconds

    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
};

export default function NotificationBell() {
    // 1. USE THE SEPARATE HOOKS
    const { data } = useGetNotifications();
    const { mutateAsync: markReadMutation } = useMarkRead();
    const markAllReadMutation = useMarkAllRead();

    const notifications = data?.notifications || [];
    const unreadCount = data?.unreadCount || 0;

    const [isOpen, setIsOpen] = useState(false);

    // 2. TOAST LOGIC (Moved here because we removed the main hook)
    const prevUnreadCountRef = useRef(0);
    const isFirstLoad = useRef(true);

    useEffect(() => {
        if (!data) return;

        // Skip first load
        if (isFirstLoad.current) {
            isFirstLoad.current = false;
            prevUnreadCountRef.current = unreadCount;
            return;
        }

        // Check for new items
        if (unreadCount > prevUnreadCountRef.current) {
            const diff = unreadCount - prevUnreadCountRef.current;
            toast.info("Notificare Nouă", {
                description: diff > 1
                    ? `Ai ${diff} notificări noi.`
                    : "Ai primit o notificare nouă.",
            });
        }

        // Update ref
        prevUnreadCountRef.current = unreadCount;
    }, [unreadCount, data]);


    const handleItemClick = (n) => {
        if (!n.is_read) {
            markReadMutation.mutate(n.id);
        }
        setIsOpen(false);
    };

    return (
        <div className='fixed top-4 right-4'>
            <Popover open={isOpen} onOpenChange={setIsOpen}>
                <PopoverTrigger asChild>
                    <Button variant="default" size="icon" className="relative text-white bg-emerald-500 hover:text-white hover:bg-emerald-500 px-5 py-5">
                        <FontAwesomeIcon icon={faBell} className="text-xl" />
                        {/* RED DOT BADGE */}
                        {unreadCount > 0 && (
                            <span className="absolute top-2 right-2 flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                            </span>
                        )}
                    </Button>
                </PopoverTrigger>

                <PopoverContent align="end" className="w-80 sm:w-[30rem] p-0 shadow-xl border-border">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b bg-muted">
                        <h4 className="font-semibold text-base">Notificări</h4>
                        {unreadCount > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-auto text-base text-muted-foreground hover:text-primary gap-1.5 px-2"
                                onClick={() => markAllReadMutation.mutate()}
                            >
                                <FontAwesomeIcon icon={faCheckDouble} />
                                Mark all read
                            </Button>
                        )}
                    </div>

                    {/* Notification List */}
                    <div className="h-96 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-3">
                                <FontAwesomeIcon icon={faBell} className="text-3xl" />
                                <p className="text-base">Nu ai notificări noi.</p>
                            </div>
                        ) : (
                            <div className="flex flex-col">
                                {notifications.map((n) => (
                                    <button
                                        key={n.id}
                                        onClick={() => handleItemClick(n)}
                                        className={cn(
                                            "flex flex-col items-start gap-1 p-4 text-left transition-all hover:bg-muted/50 border-b last:border-0",
                                            !n.is_read && "bg-blue-50/40 dark:bg-blue-900/20"
                                        )}
                                    >
                                        <div className="flex w-full justify-between items-start gap-2">
                                            <p className={cn(
                                                "text-base leading-snug",
                                                !n.is_read ? "font-medium text-foreground" : "text-muted-foreground"
                                            )}>
                                                {n.message}
                                            </p>
                                            {!n.is_read && (
                                                <span className="h-2 w-2 shrink-0 rounded-full bg-blue-500 mt-1.5" />
                                            )}
                                        </div>
                                        <span className="text-base text-muted-foreground/70 font-medium mt-1">
                                            {timeAgo(n.created_at)}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    );
}