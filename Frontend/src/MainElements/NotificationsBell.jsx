import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGetNotifications, useMarkRead, useMarkAllRead } from '@/hooks/useNotifications';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faBell,
    faCheckDouble,
    faCheck,
    faInfoCircle,
    faPenToSquare,
    faPlus,
    faTrash,
    faHistory,
    faCircleInfo
} from '@fortawesome/free-solid-svg-icons';
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const timeAgo = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = (now - date) / 1000;

    if (diff < 60) return 'Chiar acum';
    if (diff < 3600) return `${Math.floor(diff / 60)}m în urmă`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h în urmă`;
    return `${Math.floor(diff / 86400)}z în urmă`;
};

// 1. Link Helper
const getLink = (n) => {
    switch (n.tip_entitate) {
        case 'companie': return `/CRM/Companii/View/${n.entitate_id}`;
        case 'contact': return `/CRM/Companii`;
        default: return '#';
    }
};

// 2. Action Helper (The Logic You Requested)
const getActionType = (action) => {
    const lower = (action || "").toLowerCase();
    if (lower.includes('edit') || lower.includes('modif')) return 'edit';
    if (lower.includes('delet') || lower.includes('sters') || lower.includes('sterg')) return 'delete';
    if (lower.includes('creat') || lower.includes('adaug') || lower.includes('ad')) return 'create';
    return 'unknown';
};

// 3. Styles based on Action Type
const getActionStyles = (action, isRead) => {
    // If read, show gray/muted
    if (isRead) return "border-l-[0.25rem] border-l-muted hover:bg-muted/50";

    const type = getActionType(action);

    switch (type) {
        case 'delete':
            // Red for Delete
            return "border-l-[0.3rem] border-l-high ";
        case 'edit':
            // Orange for Edit
            return "border-l-[0.3rem] border-l-medium ";
        case 'create':
            // Emerald/Green for Create
            return "border-l-[0.3rem] border-l-low ";
        default:
            // Blue for Info/Unknown
            return "border-l-[0.3rem] border-l-primary ";
    }
};

// 4. Icons based on Action Type
const getActionIcon = (action) => {
    const type = getActionType(action);
    switch (type) {
        case 'delete': return <FontAwesomeIcon icon={faTrash} className="text-high " />;
        case 'edit': return <FontAwesomeIcon icon={faPenToSquare} className="text-medium " />;
        case 'create': return <FontAwesomeIcon icon={faPlus} className="text-low " />;
        default: return <FontAwesomeIcon icon={faCircleInfo} className="text-primary " />;
    }
};

export default function NotificationBell() {
    const navigate = useNavigate();
    const { data } = useGetNotifications();
    const markReadMutation = useMarkRead();
    const markAllReadMutation = useMarkAllRead();

    const notifications = data?.notifications || [];
    const unreadCount = data?.unreadCount || 0;
    const [isOpen, setIsOpen] = useState(false);

    const prevUnreadCountRef = useRef(0);
    const isFirstLoad = useRef(true);

    useEffect(() => {
        if (!data) return;
        if (isFirstLoad.current) {
            isFirstLoad.current = false;
            prevUnreadCountRef.current = unreadCount;
            return;
        }

        if (unreadCount > prevUnreadCountRef.current) {
            const diff = unreadCount - prevUnreadCountRef.current;
            toast.info("Notificare Nouă", {
                description: diff > 1 ? `Ai ${diff} notificări noi.` : "Ai primit o notificare nouă.",
            });
        }
        prevUnreadCountRef.current = unreadCount;
    }, [unreadCount, data]);

    const handleNotificationClick = (n) => {
        setIsOpen(false);
        if (!n.is_read) {
            markReadMutation.mutate(n.id);
        }
        const link = getLink(n);
        if (link && link !== '#') {
            navigate(link);
        }
    };

    const handleMarkRead = (e, n) => {
        e.stopPropagation();
        markReadMutation.mutate(n.id);
    };

    return (
        <div className='fixed top-4 right-4 z-50'>
            <Popover open={isOpen} onOpenChange={setIsOpen}>
                <PopoverTrigger asChild>
                    <Button variant="default" size="icon" className="relative h-12 w-12 text-white bg-emerald-500 hover:text-white hover:bg-emerald-500 shadow-md">
                        <FontAwesomeIcon icon={faBell} className="text-xl" />
                        {unreadCount > 0 && (
                            <span className="absolute top-3 right-3 flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                            </span>
                        )}
                    </Button>
                </PopoverTrigger>

                <PopoverContent align="end" className="w-[24rem] sm:w-[32rem] p-0 shadow-xl border-border overflow-hidden rounded-lg">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b bg-card">
                        <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-base">Notificări</h4>
                            {unreadCount > 0 && (
                                <span className="bg-red-100 text-red-600 text-sm font-bold px-2 py-0.5 rounded-full">
                                    {unreadCount} noi
                                </span>
                            )}
                        </div>
                        {unreadCount > 0 && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => markAllReadMutation.mutate()}
                            >
                                <FontAwesomeIcon className='mr-2' icon={faCheckDouble} />
                                Marchează tot
                            </Button>
                        )}
                    </div>

                    {/* List */}
                    <div className="max-h-[70vh] overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-3">
                                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                                    <FontAwesomeIcon icon={faBell} className="text-3xl opacity-50" />
                                </div>
                                <p className="text-base font-medium">Nu ai notificări noi.</p>
                            </div>
                        ) : (
                            <div className="flex flex-col">
                                {notifications.map((n) => (
                                    <div
                                        key={n.id}
                                        onClick={() => handleNotificationClick(n)}
                                        className={cn(
                                            "group flex w-full cursor-pointer transition-all border-b last:border-0 items-start",
                                            getActionStyles(n.actiune, n.is_read)
                                        )}
                                    >
                                        <div className="flex-1 flex gap-3 p-4">
                                            <div className="shrink-0 text-lg">
                                                {/* Use Action Icon */}
                                                {getActionIcon(n.actiune)}
                                            </div>

                                            <div className="flex flex-col gap-1">
                                                {/* Title / Action */}
                                                <div className="flex items-center gap-2">
                                                    <span className={cn(
                                                        "text-base font-bold uppercase tracking-wide",
                                                        n.is_read ? "text-muted-foreground" : "text-foreground"
                                                    )}>
                                                        {n.titlu || n.actiune || "Info"}
                                                    </span>
                                                </div>

                                                {/* Message */}
                                                <p className={cn(
                                                    "text-base leading-snug",
                                                    !n.is_read ? "font-medium text-foreground" : "font-normal text-muted-foreground"
                                                )}>
                                                    {n.mesaj}
                                                </p>

                                                {/* Time */}
                                                <span className="text-sm text-muted-foreground font-medium">
                                                    {timeAgo(n.created_at)}
                                                </span>
                                            </div>
                                        </div>

                                        {!n.is_read && (
                                            <div className="flex items-center self-center pr-4 pl-2">
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    className="h-10 w-10 text-emerald-600 hover:bg-emerald-200 hover:text-emerald-800 hover:border-emerald-500 rounded-full"
                                                    title="Marchează ca citit"
                                                    onClick={(e) => handleMarkRead(e, n)}
                                                >
                                                    <FontAwesomeIcon icon={faCheck} className="text-base" />
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    );
}