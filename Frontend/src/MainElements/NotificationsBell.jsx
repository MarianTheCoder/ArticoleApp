import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

import { useGetNotifications, useMarkRead, useMarkAllRead } from "@/hooks/useNotifications";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBell,
  faCheckDouble,
  faCheck,
  faPenToSquare,
  faPlus,
  faTrash,
  faCircleInfo,
  faUser,
  faUpload,
  faRotate,
  faUserTag,
  faTriangleExclamation,
  faCircleExclamation,
  faCircleCheck,
  faCity,
  faCodeBranch,
  faMapLocationDot,
  faComments,
  faReply,
} from "@fortawesome/free-solid-svg-icons";

import { cn } from "@/lib/utils";
import { toast } from "sonner";
import photoApi from "@/api/photoAPI";

const timeAgo = (dateStr) => {
  if (!dateStr) return "—";

  const date = new Date(dateStr);
  const now = new Date();
  const diff = (now - date) / 1000;

  if (diff < 60) return "Chiar acum";
  if (diff < 3600) return `${Math.floor(diff / 60)}m în urmă`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h în urmă`;

  return `${Math.floor(diff / 86400)}z în urmă`;
};

const normalizeMentions = (mentions) => {
  if (!mentions) return [];

  if (Array.isArray(mentions)) return mentions;

  if (typeof mentions === "string") {
    try {
      const parsed = JSON.parse(mentions);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
};

const toPositiveNumberOrNull = (value) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
};

const getActivityTargetFromNotification = (n) => {
  const entitateTip = String(n.entitate_tip || n.tip_entitate || "").toLowerCase();
  const parinteTip = String(n.parinte_tip || "").toLowerCase();

  if (entitateTip === "activitate") {
    const activityId = toPositiveNumberOrNull(n.entitate_id);

    return activityId
      ? {
          activityId,
          commentId: null,
        }
      : null;
  }

  if (entitateTip === "comentariu") {
    const commentId = toPositiveNumberOrNull(n.entitate_id);

    const activityId = parinteTip === "activitate" ? toPositiveNumberOrNull(n.parinte_id) : toPositiveNumberOrNull(n.activitate_id || n.activity_id);

    return activityId
      ? {
          activityId,
          commentId,
        }
      : null;
  }

  return null;
};

const getLink = (n) => {
  if (!n.companie_id) return "#";

  const activityTarget = getActivityTargetFromNotification(n);

  if (activityTarget?.activityId) {
    const params = new URLSearchParams();

    params.set("tab", "activitati");
    params.set("activityId", String(activityTarget.activityId));
    params.set("focus", String(Date.now()));

    if (activityTarget.commentId) {
      params.set("commentId", String(activityTarget.commentId));
    }

    return `/CRM/Companii/View/${n.companie_id}?${params.toString()}`;
  }

  if (n.istoric_id) {
    const params = new URLSearchParams();

    params.set("tab", "istoric");
    params.set("istoricId", String(n.istoric_id));

    return `/CRM/Companii/View/${n.companie_id}?${params.toString()}`;
  }

  if ((n.entitate_tip || n.tip_entitate) === "companie" && n.entitate_id) {
    return `/CRM/Companii/View/${n.entitate_id}`;
  }

  return "#";
};

const getActionType = (actiuneTip) => {
  const value = String(actiuneTip || "").toLowerCase();

  if (["adaugare", "create", "created", "adaugă", "adauga"].some((x) => value.includes(x))) return "create";
  if (["editare", "edit", "edited", "modif"].some((x) => value.includes(x))) return "edit";
  if (["stergere", "ștergere", "delete", "deleted", "sters", "șters"].some((x) => value.includes(x))) return "delete";
  if (["mentiune", "mențiune", "mention"].some((x) => value.includes(x))) return "mention";
  if (["upload"].some((x) => value.includes(x))) return "upload";
  if (["schimbare_status", "status"].some((x) => value.includes(x))) return "status";

  return "unknown";
};

const getNotificationSurface = (severity, isRead) => {
  if (isRead) return "bg-muted/25 opacity-70 hover:bg-muted/50";

  switch (severity) {
    case "critical":
      return "bg-red-700/[0.025] hover:bg-red-700/[0.04]";
    case "high":
      return "bg-red-500/[0.025] hover:bg-red-500/[0.04]";
    case "medium":
      return "bg-orange-500/[0.025] hover:bg-orange-500/[0.04]";
    case "low":
      return "bg-green-500/[0.025] hover:bg-green-500/[0.04]";
    default:
      return "bg-primary/[0.015] hover:bg-primary/[0.03]";
  }
};

const getSeverityMeta = (severity, isRead) => {
  if (isRead) {
    return {
      label: "Citit",
      icon: faCircleCheck,
      className: "text-muted-foreground bg-transparent border-muted",
    };
  }

  switch (severity) {
    case "critical":
      return {
        label: "Critic",
        icon: faTriangleExclamation,
        className: "text-red-700 bg-transparent border-red-700",
      };
    case "high":
      return {
        label: "Ridicat",
        icon: faCircleExclamation,
        className: "text-high bg-transparent border-high",
      };
    case "medium":
      return {
        label: "Mediu",
        icon: faCircleInfo,
        className: "text-medium bg-transparent border-medium",
      };
    case "low":
      return {
        label: "Scăzut",
        icon: faCircleCheck,
        className: "text-low bg-transparent border-low",
      };
    default:
      return {
        label: "Info",
        icon: faCircleInfo,
        className: "text-primary bg-transparent border-primary",
      };
  }
};

const getActionIcon = (actiuneTip) => {
  const type = getActionType(actiuneTip);

  switch (type) {
    case "delete":
      return <FontAwesomeIcon icon={faTrash} className="text-high" />;
    case "edit":
      return <FontAwesomeIcon icon={faPenToSquare} className="text-medium" />;
    case "create":
      return <FontAwesomeIcon icon={faPlus} className="text-low" />;
    case "mention":
      return <FontAwesomeIcon icon={faUserTag} className="text-primary" />;
    case "upload":
      return <FontAwesomeIcon icon={faUpload} className="text-primary" />;
    case "status":
      return <FontAwesomeIcon icon={faRotate} className="text-medium" />;
    default:
      return <FontAwesomeIcon icon={faCircleInfo} className="text-primary" />;
  }
};
const getActionLabel = (actiuneTip) => {
  const type = getActionType(actiuneTip);

  switch (type) {
    case "create":
      return "Adăugare";
    case "edit":
      return "Editare";
    case "delete":
      return "Ștergere";
    case "mention":
      return "Mențiune";
    case "upload":
      return "Upload";
    case "status":
      return "Status";
    default:
      return "Info";
  }
};

const getLevelMeta = (nivelTip) => {
  switch (nivelTip) {
    case "companie":
      return {
        label: "Companie",
        icon: faCity,
      };
    case "filiala":
      return {
        label: "Filială",
        icon: faCodeBranch,
      };
    case "santier":
      return {
        label: "Șantier",
        icon: faMapLocationDot,
      };
    case "contact":
      return {
        label: "Contact",
        icon: faUser,
      };
    case "activitate":
      return {
        label: "Activitate",
        icon: faComments,
      };
    case "comentariu":
      return {
        label: "Comentariu",
        icon: faReply,
      };
    default:
      return null;
  }
};

const getActionBadgeClass = (actiuneTip, isRead) => {
  if (isRead) return "border-muted text-muted-foreground bg-transparent";

  const type = getActionType(actiuneTip);

  switch (type) {
    case "create":
      return "border-low text-low bg-transparent";
    case "edit":
      return "border-medium text-medium bg-transparent";
    case "delete":
      return "border-high text-high bg-transparent";
    case "mention":
      return "border-primary text-primary bg-transparent";
    case "upload":
      return "border-primary text-primary bg-transparent";
    case "status":
      return "border-medium text-medium bg-transparent";
    default:
      return "border-primary text-primary bg-transparent";
  }
};

const getNeutralBadgeClass = (isRead) => {
  if (isRead) return "border-muted text-muted-foreground bg-muted/20";
  return "border-foreground text-foreground bg-transparent";
};

function SeverityIndicator({ severity, isRead }) {
  const meta = getSeverityMeta(severity, isRead);

  return (
    <div title={`Severitate: ${meta.label}`} className={cn("h-8 w-8 rounded-lg border flex items-center justify-center shrink-0", meta.className)}>
      <FontAwesomeIcon icon={meta.icon} className="text-base" />
    </div>
  );
}

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

    if (link && link !== "#") {
      navigate(link);
    }
  };

  const handleMarkRead = (e, n) => {
    e.stopPropagation();

    if (!n.is_read) {
      markReadMutation.mutate(n.id);
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="default" size="icon" className="relative h-12 w-12 text-white bg-emerald-500 hover:text-white hover:bg-emerald-500 shadow-md">
            <FontAwesomeIcon icon={faBell} className="text-xl" />

            {unreadCount > 0 && (
              <span className="absolute top-3 right-3 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
              </span>
            )}
          </Button>
        </PopoverTrigger>

        <PopoverContent align="end" className="w-[24rem] sm:w-[42rem] p-0 shadow-xl border-border overflow-hidden rounded-lg">
          <div className="flex items-center justify-between px-4 py-3 border-b bg-card">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-base">Notificări</h4>

              {unreadCount > 0 && <span className="bg-red-100 text-red-600 text-sm font-bold px-2 py-0.5 rounded-full">{unreadCount} noi</span>}
            </div>

            {unreadCount > 0 && (
              <Button variant="outline" size="sm" onClick={() => markAllReadMutation.mutate()}>
                <FontAwesomeIcon className="mr-2" icon={faCheckDouble} />
                Marchează tot
              </Button>
            )}
          </div>

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
                {notifications.map((n) => {
                  const actiuneTip = n.actiune_tip || n.actiune;
                  const nivelTip = n.nivel_tip || n.tip_entitate;
                  const nivelMeta = getLevelMeta(nivelTip);
                  const mentions = normalizeMentions(n.mentiuni || n.mentions);

                  return (
                    <div
                      key={n.id}
                      onClick={() => handleNotificationClick(n)}
                      className={cn("group grid  grid-cols-[1fr_auto] w-full p-4 gap-6 cursor-pointer transition-all border-b last:border-0", getNotificationSurface(n.severitate, n.is_read))}
                    >
                      <div className="flex-1 flex gap-4  min-w-0">
                        <div className="shrink-0 text-xl pt-1">{getActionIcon(actiuneTip)}</div>

                        <div className="flex flex-col gap-2 min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2 min-w-0">
                            <span className={cn("text-base font-bold uppercase tracking-wide", n.is_read ? "text-muted-foreground" : "text-foreground")}>{n.titlu || getActionLabel(actiuneTip)}</span>

                            <Badge variant="outline" className={cn("text-sm font-bold px-2.5 py-1 rounded-md border", getActionBadgeClass(actiuneTip, false))}>
                              {getActionLabel(actiuneTip)}
                            </Badge>

                            {nivelMeta && (
                              <Badge variant="outline" className={cn("text-sm font-bold px-2.5 py-1 rounded-md border flex items-center gap-1.5", getNeutralBadgeClass(false))}>
                                <FontAwesomeIcon icon={nivelMeta.icon} className="text-sm" />
                                {nivelMeta.label}
                              </Badge>
                            )}
                          </div>

                          <p className={cn("text-base leading-snug break-words", !n.is_read ? "font-medium text-foreground" : "font-normal text-muted-foreground")}>{n.mesaj}</p>

                          {/* Mențiunile mutate aici, imediat sub mesaj */}
                          {mentions.length > 0 && (
                            <div className="flex flex-wrap items-center gap-2 mt-0.5">
                              <span className="text-sm font-semibold text-muted-foreground">Mențiuni:</span>
                              {mentions.slice(0, 2).map((m) => {
                                const photo = m.poza || m.photo || m.photo_url || null;
                                const name = m.nume || m.name || "Utilizator";

                                return (
                                  <Badge key={m.id} variant="outline" className="text-sm font-bold px-2.5 py-1 rounded-md border flex items-center gap-1.5 shadow-sm">
                                    <Avatar className="h-5 w-5 rounded-md border border-border">
                                      <AvatarImage src={photo ? `${photoApi}/${photo}` : null} />
                                      <AvatarFallback className="rounded-md text-xs">
                                        <FontAwesomeIcon icon={faUser} />
                                      </AvatarFallback>
                                    </Avatar>
                                    @{name}
                                  </Badge>
                                );
                              })}

                              {mentions.length > 2 && (
                                <Badge variant="outline" className={cn("text-sm font-bold px-2.5 py-1 rounded-md border", getNeutralBadgeClass(n.is_read))}>
                                  +{mentions.length - 2}
                                </Badge>
                              )}
                            </div>
                          )}

                          <div className="flex items-center justify-between gap-3 pt-1">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                              <span>{timeAgo(n.created_at)}</span>
                              <span>•</span>
                              <span>{n.is_read ? "Citită" : "Necitită"}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 flex    flex-col h-full items-end justify-between gap-2 ">
                        <SeverityIndicator severity={n.severitate} isRead={false} />
                        {!n.is_read && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-foreground hover:bg-green-500/15  hover:border-green-500 rounded-md"
                            title="Marchează ca citit"
                            onClick={(e) => handleMarkRead(e, n)}
                          >
                            <FontAwesomeIcon icon={faCheck} className="mr-2 text-base" />
                            Citit
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
