import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import photoApi from "@/api/photoAPI";
import { useCompanyHistory } from "@/hooks/useCompanies";
import { cn } from "@/lib/utils";
import NoImage from "@/assets/no-user-image-square.jpg";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHistory,
  faUser,
  faPenToSquare,
  faPlus,
  faTrash,
  faArrowRight,
  faMapLocationDot,
  faCodeBranch,
  faImage,
  faCircleInfo,
  faCity,
  faComments,
  faReply,
  faBell,
  faUpload,
  faRotate,
  faUserTag,
  faChevronDown,
  faChevronUp,
  faTriangleExclamation,
  faCircleExclamation,
  faCircleCheck,
  faCircleXmark,
  faCrown,
} from "@fortawesome/free-solid-svg-icons";
import ImagePreviewTooltip from "@/components/ui/ImagePreviewTooltip";
import SpinnerElement from "@/MainElements/SpinnerElement";

const parseMaybeJson = (value, fallback) => {
  if (value === null || value === undefined) return fallback;
  if (typeof value !== "string") return value;

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const normalizeMentions = (mentions) => {
  const parsed = parseMaybeJson(mentions, []);

  if (!Array.isArray(parsed)) return [];

  return parsed
    .map((m) => ({
      id: m.id,
      name: m.nume || m.name || "Utilizator",
      photo: m.poza || m.photo || m.photo_url || null,
    }))
    .filter((m) => m.id);
};

const normalizeDetails = (details) => {
  const parsed = parseMaybeJson(details, {});

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};

  return parsed;
};

const formatDate = (dateString) => {
  if (!dateString) return "—";

  return new Intl.DateTimeFormat("ro-RO", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(dateString));
};

const formatValue = (val) => {
  if (val === null || val === undefined || val === "") return "gol";
  if (val === true || val === "true" || val == 1) return "Da";
  if (val === false || val === "false" || val == 0) return "Nu";

  if (typeof val === "object") {
    try {
      return JSON.stringify(val);
    } catch {
      return String(val);
    }
  }

  return String(val);
};

const formatField = (field) => {
  if (!field) return "";

  return field
    .replace(/_/g, " ")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

const ENTITY_REGISTRY = {
  companie: {
    label: "Companie",
    icon: faCity,
  },
  filiala: {
    label: "Filială",
    icon: faCodeBranch,
  },
  santier: {
    label: "Șantier",
    icon: faMapLocationDot,
  },
  contact: {
    label: "Contact",
    icon: faUser,
  },
  activitate: {
    label: "Activitate",
    icon: faComments,
    className: "border-primary text-primary bg-transparent",
  },
  comentariu: {
    label: "Comentariu",
    icon: faReply,
    className: "border-primary text-primary bg-transparent",
  },
};

const ACTION_REGISTRY = {
  adaugare: {
    label: "Adăugare",
    icon: faPlus,
    className: "border-low text-low bg-transparent",
  },
  editare: {
    label: "Editare",
    icon: faPenToSquare,
    className: "border-medium text-medium bg-transparent",
  },
  stergere: {
    label: "Ștergere",
    icon: faTrash,
    className: "border-high text-high bg-transparent",
  },
  mentiune: {
    label: "Mențiune",
    icon: faUserTag,
    className: "border-primary text-primary bg-transparent",
  },
  upload: {
    label: "Upload",
    icon: faUpload,
    className: "border-primary text-primary bg-transparent",
  },
  schimbare_status: {
    label: "Status",
    icon: faRotate,
    className: "border-medium text-medium bg-transparent",
  },
  atribuire: {
    label: "Atribuire",
    icon: faCrown,
    className: "border-yellow-500 text-yellow-500 bg-transparent",
  },
  info: {
    label: "Info",
    icon: faCircleInfo,
    className: "border-primary text-primary bg-transparent",
  },
};

const getEntityMeta = (type) => {
  return (
    ENTITY_REGISTRY[type] || {
      label: type || "Entitate",
      icon: faCircleInfo,
    }
  );
};

const getActionMeta = (type) => {
  return ACTION_REGISTRY[type] || ACTION_REGISTRY.info;
};

const getSeveritySurface = (severity) => {
  switch (severity) {
    case "critical":
      return "bg-card border-l-4 border-l-red-700";
    case "high":
      return "bg-card border-l-4 border-l-high";
    case "medium":
      return "bg-card border-l-4 border-l-medium";
    case "low":
      return "bg-card border-l-4 border-l-low";
    default:
      return "bg-card border-l-4 border-l-border";
  }
};

const getSeverityMeta = (severity) => {
  switch (severity) {
    case "critical":
      return {
        label: "Critic",
        icon: faTriangleExclamation,
        className: "text-red-700 border-red-700",
      };
    case "high":
      return {
        label: "Ridicat",
        icon: faCircleExclamation,
        className: "text-high border-high",
      };
    case "medium":
      return {
        label: "Mediu",
        icon: faCircleInfo,
        className: "text-medium border-medium",
      };
    case "low":
      return {
        label: "Scăzut",
        icon: faCircleCheck,
        className: "text-low border-low",
      };
    default:
      return {
        label: "Info",
        icon: faCircleInfo,
        className: "text-primary border-primary",
      };
  }
};

function SeverityIndicator({ severity }) {
  const meta = getSeverityMeta(severity);

  return (
    <div title={`Severitate: ${meta.label}`} className={cn("h-9 w-9 xxxl:h-10 xxxl:w-10 rounded-lg border flex items-center justify-center shrink-0", meta.className)}>
      <FontAwesomeIcon icon={meta.icon} className="text-sm xxxl:text-base" />
    </div>
  );
}

function HistoryUserAvatar({ photo }) {
  return (
    <ImagePreviewTooltip
      src={photo ? `${photoApi}/${photo}` : null}
      alt="User Avatar"
      ringColor="ring-primary"
      previewMaxHeight="max-h-[18rem]"
      previewMaxWidth="max-w-[18rem]"
      fallback={<img src={NoImage} alt="No Image" className="h-full w-full object-cover opacity-50" />}
      containerClassName="h-10 w-10 xxxl:h-12 xxxl:w-12 rounded-md border border-border bg-muted flex items-center justify-center overflow-hidden shrink-0"
    />
  );
}

function MentionUserAvatar({ photo }) {
  return (
    <ImagePreviewTooltip
      src={photo ? `${photoApi}/${photo}` : null}
      alt="User Avatar"
      ringColor="ring-primary"
      previewMaxHeight="max-h-[18rem]"
      previewMaxWidth="max-w-[18rem]"
      fallback={<img src={NoImage} alt="No Image" className="h-full w-full object-cover opacity-50" />}
      containerClassName="h-6 w-6 xxxl:h-7 xxxl:w-7 rounded-md border border-border bg-muted flex items-center justify-center overflow-hidden shrink-0"
    />
  );
}

function HistoryBadge({ meta }) {
  const className = meta.className || "border-foreground text-foreground bg-transparent";

  return (
    <Badge className={cn("text-xs xxxl:text-sm font-bold px-2 xxxl:px-2.5 h-9 xxxl:h-10 flex items-center gap-1.5 border rounded-md hover:bg-transparent", className)}>
      <FontAwesomeIcon icon={meta.icon} className="text-xs xxxl:text-sm" />
      {meta.label}
    </Badge>
  );
}

function MentionBadge({ mention }) {
  return (
    <Badge className="text-xs xxxl:text-sm font-semibold flex items-center gap-1.5 h-9 xxxl:h-10 border border-border text-foreground bg-transparent px-2 xxxl:px-2.5 rounded-md hover:bg-transparent shadow-sm">
      <MentionUserAvatar photo={mention.photo} />@{mention.name}
    </Badge>
  );
}

function HistoryDetails({ details }) {
  const [open, setOpen] = useState(false);

  const normalizedDetails = normalizeDetails(details);

  const hiddenKeys = [
    "id",
    "updated_by_user_id",
    "created_by_user_id",
    "root_entity_id",
    "root_entity_type",
    "created_at",
    "updated_at",
    "companie_id",
    "filiala_id",
    "santier_id",
    "contact_id",
    "activitate_id",
    "comentariu_id",
  ];

  const visibleEntries = Object.entries(normalizedDetails).filter(([key]) => !hiddenKeys.includes(key));

  if (visibleEntries.length === 0) return null;

  return (
    <div className="mt-2 xxxl:mt-3">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
        className="flex items-center gap-2 text-sm xxxl:text-base font-semibold text-muted-foreground hover:text-foreground transition-colors"
      >
        <FontAwesomeIcon icon={open ? faChevronUp : faChevronDown} className="text-sm xxxl:text-base" />
        {open ? "Ascunde detaliile" : `Vezi detalii (${visibleEntries.length})`}
      </button>

      {open && (
        <div className="mt-2 xxxl:mt-3 flex flex-col gap-2 border-t pt-2 xxxl:pt-3">
          {visibleEntries.map(([key, value], idx) => {
            const loweredKey = String(key).toLowerCase();

            if (loweredKey.includes("photo") || loweredKey.includes("poza") || loweredKey.includes("logo")) {
              return (
                <div key={idx} className="text-sm xxxl:text-base text-foreground flex items-center gap-2">
                  <FontAwesomeIcon icon={faImage} className="text-sm xxxl:text-base text-muted-foreground" />
                  <span className="font-semibold">{formatField(key)}:</span>
                  <span>Fotografie actualizată</span>
                </div>
              );
            }

            const hasDiff = value && typeof value === "object" && ("vechi" in value || "nou" in value || "old" in value || "new" in value);

            const oldValue = hasDiff ? (value.vechi ?? value.old ?? null) : null;
            const newValue = hasDiff ? (value.nou ?? value.new ?? null) : value;

            return (
              <div key={idx} className="text-sm xxxl:text-base flex flex-wrap items-center gap-2">
                <span className="font-semibold text-foreground">{formatField(key)}:</span>

                {hasDiff && (
                  <>
                    <span className="text-muted-foreground line-through decoration-muted-foreground/60 break-words max-w-full">{formatValue(oldValue)}</span>
                    <FontAwesomeIcon icon={faArrowRight} className="text-sm xxxl:text-base text-muted-foreground/70" />
                  </>
                )}

                <span className="text-foreground break-words max-w-full">{formatValue(newValue)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function HistoryItemCard({ rawItem, isContactView = false, onNavigateToActivity }) {
  const toPositiveNumberOrNull = (value) => {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : null;
  };

  const getActivityTargetFromHistoryItem = (item) => {
    const details = normalizeDetails(item.content);

    const entitateTip = String(item.entitate_tip || "").toLowerCase();
    const parinteTip = String(item.parinte_tip || "").toLowerCase();

    if (entitateTip === "activitate") {
      const activityId = toPositiveNumberOrNull(item.entitate_id);

      return activityId
        ? {
            activityId,
            commentId: null,
          }
        : null;
    }

    if (entitateTip === "comentariu") {
      const commentId = toPositiveNumberOrNull(item.entitate_id);

      const activityId = parinteTip === "activitate" ? toPositiveNumberOrNull(item.parinte_id) : toPositiveNumberOrNull(details.activitate_id || details.activity_id || details.parent_activity_id);

      return activityId
        ? {
            activityId,
            commentId,
          }
        : null;
    }

    const fallbackActivityId = toPositiveNumberOrNull(details.activitate_id || details.activity_id);

    const fallbackCommentId = toPositiveNumberOrNull(details.comentariu_id || details.comment_id);

    return fallbackActivityId
      ? {
          activityId: fallbackActivityId,
          commentId: fallbackCommentId,
        }
      : null;
  };

  const item = {
    id: rawItem.id,

    nivel_tip: rawItem.nivel_tip || rawItem.level_type,
    nivel_id: rawItem.nivel_id || rawItem.level_id,

    entitate_tip: rawItem.entitate_tip || rawItem.entity_type || rawItem.entity,
    entitate_id: rawItem.entitate_id || rawItem.entity_id,

    parinte_tip: rawItem.parinte_tip || rawItem.parent_type,
    parinte_id: rawItem.parinte_id || rawItem.parent_id,

    actiune_tip: rawItem.actiune_tip || rawItem.action_type || rawItem.action || "info",

    title: rawItem.title || rawItem.titlu,
    message: rawItem.message || rawItem.mesaj,

    severity: rawItem.severity || rawItem.severitate || "medium",

    content: rawItem.content || rawItem.detalii || {},
    mentions: normalizeMentions(rawItem.mentions || rawItem.mentiuni),

    date: rawItem.date || rawItem.creat_la || rawItem.created_at,

    author: rawItem.author || {
      name: rawItem.author_name || "Sistem",
      photo: rawItem.author_photo || null,
    },
  };

  const levelMeta = getEntityMeta(item.nivel_tip);
  const entityMeta = getEntityMeta(item.entitate_tip);
  const actionMeta = getActionMeta(item.actiune_tip);

  const showEntityBadge = !isContactView && item.entitate_tip && item.entitate_tip !== item.nivel_tip;

  const activityTarget = getActivityTargetFromHistoryItem(item);
  const canNavigateToActivity = Boolean(activityTarget?.activityId && onNavigateToActivity);

  const handleNavigateClick = () => {
    if (!canNavigateToActivity) return;
    onNavigateToActivity(activityTarget);
  };

  return (
    <div
      onClick={canNavigateToActivity ? handleNavigateClick : undefined}
      className={cn(
        `rounded-xl border ${canNavigateToActivity ? "cursor-pointer hover:bg-primary/5" : "hover:bg-muted/10"} border-border shadow-sm transition-all hover:shadow-md p-3 xxxl:p-4`,
        getSeveritySurface(item.severity),
      )}
    >
      <div className="flex items-start justify-between gap-3 xxxl:gap-4">
        <div className="flex flex-col gap-2.5 xxxl:gap-3 min-w-0 flex-1">
          <div className="flex items-center gap-2.5 xxxl:gap-3 min-w-0">
            <HistoryUserAvatar photo={item.author?.photo} />

            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <span className="font-bold text-foreground text-sm xxxl:text-base">{item.author?.name || "Sistem"}</span>

              {!isContactView && <HistoryBadge meta={levelMeta} />}
              {showEntityBadge && <HistoryBadge meta={entityMeta} />}
              <HistoryBadge meta={actionMeta} />
            </div>
          </div>

          <div className="pl-[3.25rem] xxxl:pl-[3.75rem]">
            <div className="text-base xxxl:text-lg font-bold text-foreground leading-snug">{item.title || <span className="italic text-muted-foreground">Fără titlu.</span>}</div>
            <div className="text-sm xxxl:text-base mt-1 text-foreground/90 leading-relaxed">{item.message || <span className="italic text-muted-foreground">Fără mesaj.</span>}</div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 pt-1 xxxl:pt-2">
          <SeverityIndicator severity={item.severity} />
          <div className="text-sm xxxl:text-base font-medium text-foreground">{formatDate(item.date)}</div>
        </div>
      </div>

      <div className="pl-[3.25rem] xxxl:pl-[3.75rem]">
        <HistoryDetails details={item.content} />

        {item.mentions && item.mentions.length > 0 && (
          <div className="mt-2 xxxl:mt-3 flex items-center gap-2 xxxl:gap-3 flex-wrap border-t pt-2 xxxl:pt-3">
            <span className="text-xs xxxl:text-sm font-semibold text-muted-foreground">Mențiuni:</span>
            {item.mentions.map((mention) => (
              <MentionBadge key={mention.id} mention={mention} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function HistoryTab({ companyId, filialaId = null, santierId = null, contactId = null, onNavigateToActivity = null }) {
  const { data: historyData, isLoading } = useCompanyHistory(companyId, filialaId, santierId, contactId);

  return (
    <Card className="border-0 shadow-sm h-full flex flex-col overflow-hidden">
      <CardHeader className="py-2 xxxl:py-3 px-4 xxxl:px-5 bg-muted/10 border-b shrink-0 z-10">
        <CardTitle className="text-sm xxxl:text-base font-bold uppercase text-muted-foreground flex items-center gap-2">
          <FontAwesomeIcon icon={faHistory} />

          {contactId ? "Istoric Contact" : santierId ? "Istoric Șantier" : filialaId ? "Istoric Filială" : "Istoric Companie"}
        </CardTitle>
      </CardHeader>

      <ScrollArea className="flex-1 w-full">
        <CardContent className="p-4 xxxl:p-5">
          {isLoading ? (
            <SpinnerElement text={2} />
          ) : historyData && historyData.length > 0 ? (
            <div className="flex flex-col gap-3 xxxl:gap-4">
              {historyData.map((item) => (
                <HistoryItemCard key={item.id} rawItem={item} isContactView={!!contactId} onNavigateToActivity={onNavigateToActivity} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 xxxl:py-16 text-muted-foreground space-y-2 xxxl:space-y-3">
              <div className="w-10 h-10 xxxl:w-12 xxxl:h-12 rounded-full bg-muted/30 flex items-center justify-center">
                <FontAwesomeIcon icon={faHistory} className="text-lg xxxl:text-xl opacity-50" />
              </div>

              <p className="text-sm xxxl:text-base">Nu există istoric disponibil.</p>
            </div>
          )}
        </CardContent>

        <ScrollBar orientation="vertical" />
      </ScrollArea>
    </Card>
  );
}
