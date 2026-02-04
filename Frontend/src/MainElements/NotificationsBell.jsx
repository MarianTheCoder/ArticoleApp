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
    faExclamationTriangle,
    faBomb
} from '@fortawesome/free-solid-svg-icons';
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Helper for "5m ago"
const timeAgo = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = (now - date) / 1000;

    if (diff < 60) return 'Chiar acum';
    if (diff < 3600) return `${Math.floor(diff / 60)}m în urmă`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h în urmă`;
    return `${Math.floor(diff / 86400)}z în urmă`;
};

// 1. Helper: Determine Link based on Entity
const getLink = (n) => {
    if (n.link) return n.link;
    switch (n.entity_type) {
        case 'companie': return `/CRM/Companii/View/${n.entity_id}`;
        case 'contact': return `/CRM/Companii`;
        default: return '#';
    }
};

// 2. Helper: Styling based on Severity
const getSeverityStyles = (severity, isRead) => {
    if (isRead) return "border-l-4 border-l-muted hover:bg-muted ";

    switch (severity) {
        case 'high':
            return "border-l-4 border-l-red-500 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30";
        case 'normal':
            return "border-l-4 border-l-orange-500 bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30";
        case 'low':
        default:
            return "border-l-4 border-l-blue-500 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30";
    }
};

// 3. Helper: Icon based on severity
const getSeverityIcon = (severity) => {
    switch (severity) {
        case 'high': return <FontAwesomeIcon icon={faBomb} className="text-red-500 mt-0.5" />;
        case 'normal': return <FontAwesomeIcon icon={faExclamationTriangle} className="text-orange-500 mt-0.5" />;
        default: return <FontAwesomeIcon icon={faInfoCircle} className="text-blue-500 mt-0.5" />;
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

    // TOAST LOGIC
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

    // HANDLERS
    const handleNotificationClick = (n) => {
        setIsOpen(false);

        // Mark as read when navigating
        if (!n.is_read) {
            markReadMutation.mutate(n.id);
        }

        // Navigate
        const link = getLink(n);
        if (link && link !== '#') {
            navigate(link);
        }
    };

    const handleMarkRead = (e, n) => {
        e.stopPropagation(); // Stop navigation
        markReadMutation.mutate(n.id);
    };

    return (
        // RESTORED: Fixed Position
        <div className='fixed top-4 right-4'>
            <Popover open={isOpen} onOpenChange={setIsOpen}>
                <PopoverTrigger asChild>
                    {/* RESTORED: Your Emerald Button Style */}
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

                <PopoverContent align="end" className="w-80 sm:w-[28rem] p-0 shadow-xl border-border overflow-hidden">
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
                                variant="default"
                                size="sm"
                                onClick={() => markAllReadMutation.mutate()}
                            >
                                <FontAwesomeIcon className='text-base' icon={faCheckDouble} />
                                Marchează tot
                            </Button>
                        )}
                    </div>

                    {/* Notification List */}
                    <div className="max-h-[70vh] overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-3">
                                <FontAwesomeIcon icon={faBell} className="text-3xl" />
                                <p className="text-base">Nu ai notificări noi.</p>
                            </div>
                        ) : (
                            <div className="flex flex-col">
                                {notifications.map((n) => (
                                    <div
                                        key={n.id}
                                        onClick={() => handleNotificationClick(n)}
                                        className={cn(
                                            "group flex  w-full cursor-pointer transition-all border-b last:border-0 items-start",
                                            getSeverityStyles(n.severity, n.is_read)
                                        )}
                                    >
                                        {/* Main Content Area */}
                                        <div className="flex-1  flex gap-3 p-4">
                                            {/* Icon based on severity */}
                                            <div className="shrink-0 pt-0.5">
                                                {getSeverityIcon(n.severity)}
                                            </div>

                                            <div className="flex flex-col gap-1">
                                                <p className={cn(
                                                    "text-base leading-snug",
                                                    !n.is_read ? "font-semibold text-foreground" : "font-normal text-muted-foreground"
                                                )}>
                                                    {n.message}
                                                </p>
                                                <span className="text-sm text-muted-foreground/70">
                                                    {timeAgo(n.created_at)}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Action Area (Right Side) */}
                                        {!n.is_read && (
                                            <div className="flex items-center self-center pr-4 pl-2">
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    // Changes: emerald text, subtle emerald border, light emerald bg on hover
                                                    className="h-8 w-8 text-emerald-600  hover:bg-emerald-200 hover:text-emerald-800 hover:border-emerald-500 rounded-full"
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