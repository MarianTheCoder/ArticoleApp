import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import photoApi from "@/api/photoAPI";
import { useCompanyHistory } from "@/hooks/useCompanies";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHistory,
  faUser,
  faPenToSquare,
  faPlus,
  faTrash,
  faArrowRight,
  faCalendarDays,
  faBuilding,
  faMapLocationDot,
  faCodeBranch,
  faImage,
  faCircleInfo,
  faCity,
  faComments,
  faReply,
} from "@fortawesome/free-solid-svg-icons";

export default function CompanyHistory({ companyId, filialaId = null, santierId = null }) {
  const { data: historyData, isLoading } = useCompanyHistory(companyId, filialaId, santierId);

  // --- HELPERS ---
  const formatDate = (dateString) => {
    if (!dateString) return "—";
    const d = new Date(dateString);
    return new Intl.DateTimeFormat("ro-RO", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(d);
  };

  const formatValue = (val) => {
    if (val === null || val === undefined || val === "") return "gol";
    if (val === true || val === "true" || val == 1) return "Da";
    if (val === false || val === "false" || val == 0) return "Nu";
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
  // --- ICONS & LABELS ---
  const getEntityIcon = (type) => {
    switch ((type || "").toLowerCase()) {
      case "contact":
        return faUser;
      case "santier":
        return faMapLocationDot;
      case "filiala":
        return faCodeBranch;
      case "companie":
        return faCity;
      default:
        return faCity;
    }
  };

  const getEntityLabel = (type) => {
    switch ((type || "").toLowerCase()) {
      case "contact":
        return "Contact";
      case "santier":
        return "Șantier";
      case "filiala":
        return "Filială";
      case "companie":
        return "Companie";
      default:
        return type;
    }
  };

  const getActionType = (action, title) => {
    const lowerTit = (title || "").toLowerCase();

    // Prindem comentariul
    if (lowerTit.includes("comentariu")) return "comentariu";
    // Prindem activitatea
    if (lowerTit.includes("activitate")) return "activitate";

    const lowerAct = (action || "").toLowerCase();
    if (lowerAct.includes("edit") || lowerAct.includes("modif")) return "edit";
    if (lowerAct.includes("delet") || lowerAct.includes("șter") || lowerAct.includes("ster")) return "delete";
    if (lowerAct.includes("creat") || lowerAct.includes("ad")) return "create";
    return "unknown";
  };

  const getActionIcon = (type) => {
    switch (type) {
      case "comentariu":
        return faReply; // Iconiță distinctă pentru răspuns/comentariu
      case "activitate":
        return faComments;
      case "edit":
        return faPenToSquare;
      case "delete":
        return faTrash;
      case "create":
        return faPlus;
      default:
        return faCircleInfo;
    }
  };

  const getActionLabel = (type) => {
    switch (type) {
      case "comentariu":
        return "Comentariu la activitate"; // Textul pe care l-ai cerut
      case "activitate":
        return "Activitate nouă";
      case "edit":
        return "Editat";
      case "delete":
        return "Șters";
      case "create":
        return "Adăugat";
      default:
        return "Info";
    }
  };

  const getActionBorderColor = (type) => {
    switch (type) {
      case "comentariu":
      case "activitate":
        return "border-blue-500"; // Aceeași culoare albastră pentru amândouă
      case "edit":
        return "border-medium";
      case "delete":
        return "border-high";
      case "create":
        return "border-low";
      default:
        return "border-primary";
    }
  };

  const getActionBadgeStyle = (type) => {
    switch (type) {
      case "comentariu":
      case "activitate":
        return "text-blue-500 border-blue-500 bg-blue-500/10"; // Același stil albastru
      case "edit":
        return "text-medium border-medium bg-transparent";
      case "delete":
        return "text-high border-high  bg-transparent";
      case "create":
        return "text-low border-low bg-transparent";
      default:
        return "text-primary border border-primary bg-transparent";
    }
  };

  // --- CONTENT RENDERER ---
  const renderHistoryContent = (details) => {
    if (!details) return null;

    if (typeof details === "object") {
      const visibleEntries = Object.entries(details).filter(
        ([key]) => !["id", "updated_by_user_id", "created_by_user_id", "root_entity_id", "root_entity_type", "created_at", "updated_at"].includes(key),
      );

      if (visibleEntries.length === 0) return null;

      return (
        <div className="flex flex-col gap-2 mt-1">
          {visibleEntries.map(([key, value], idx) => {
            if (key.includes("photo") || key.includes("logo")) {
              return (
                <div key={idx} className="text-base text-foreground flex items-center gap-2">
                  <FontAwesomeIcon icon={faImage} /> Fotografie actualizată
                </div>
              );
            }

            const oldValue = value?.old !== undefined ? value.old : null;
            const newValue = value?.new !== undefined ? value.new : value;
            const isDiff = value?.old !== undefined;

            return (
              <div key={idx} className="text-base flex flex-wrap items-center gap-2">
                <span className="font-medium text-foreground">{formatField(key)}:</span>
                {isDiff && (
                  <>
                    <span className="text-muted-foreground line-through decoration-muted-foreground/60">{formatValue(oldValue)}</span>
                    <FontAwesomeIcon icon={faArrowRight} className="text-sm text-muted-foreground/60" />
                  </>
                )}
                <span className="text-foreground">{formatValue(newValue)}</span>
              </div>
            );
          })}
        </div>
      );
    }
    return <div className="text-base text-muted-foreground">{JSON.stringify(details)}</div>;
  };

  return (
    <Card className="border-border shadow-sm h-full flex flex-col overflow-hidden">
      <CardHeader className="py-3 px-5 bg-muted/10 border-b shrink-0 z-10">
        <CardTitle className="text-base font-bold uppercase text-muted-foreground flex items-center gap-2">
          <FontAwesomeIcon icon={faHistory} />
          {santierId ? `Istoric Șantier` : filialaId ? `Istoric Filială` : `Istoric Companie`}
        </CardTitle>
      </CardHeader>

      <ScrollArea className="flex-1 w-full">
        <CardContent className="p-0">
          {!isLoading && historyData && historyData.length > 0 ? (
            <div className="flex flex-col p-5 gap-6">
              {historyData.map((item, index) => {
                const type = getActionType(item.action, item.title);
                const entityIcon = getEntityIcon(item.entity);
                const entityLabel = getEntityLabel(item.entity);
                const borderColor = getActionBorderColor(type);

                return (
                  <div key={item.id} className="flex flex-col">
                    {/* --- TOP ROW: Avatar + Header Info --- */}
                    <div className="flex items-center gap-3">
                      {/* Avatar (Fixed width 12 / 48px) */}
                      <Avatar className="h-12 w-12 border border-border rounded-lg z-10 shrink-0 bg-background">
                        <AvatarImage src={item.author?.photo ? `${photoApi}/${item.author.photo}` : null} />
                        <AvatarFallback className="bg-muted rounded-lg text-[12px] text-muted-foreground">
                          <FontAwesomeIcon icon={faUser} />
                        </AvatarFallback>
                      </Avatar>

                      {/* Header Info */}
                      <div className="flex gap-2 items-center justify-between w-full">
                        <div className="flex flex-wrap items-center gap-3 text-base">
                          <span className="font-bold text-foreground text-base">{item.author?.name || "Sistem"}</span>

                          <Badge variant="secondary" className="text-sm font-semibold shadow-sm flex items-center gap-2 py-1 border-foreground px-2 ">
                            <FontAwesomeIcon icon={entityIcon} className="" />
                            {entityLabel}
                          </Badge>

                          {/* Action Label - Now colored specifically */}
                          <Badge className={`text-sm font-bold p-1 px-2 flex items-center gap-1 border hover:bg-transparent ${getActionBadgeStyle(type)} `}>
                            <FontAwesomeIcon icon={getActionIcon(type)} className="text-sm" />
                            {getActionLabel(type)}
                          </Badge>
                        </div>

                        {/* Entity Badge - Far Right (More Visible) */}

                        <span className="text-foreground text-base font-medium tracking-wide">{formatDate(item.date)}</span>
                      </div>
                    </div>

                    <div className={`flex-1 ml-6 border-l-2 border-b-2 rounded-bl-3xl ${borderColor} pl-6 pb-6`}>
                      <div className=" text-lg font-bold text-foreground leading-relaxed">{item.title ? item.title : <span className="italic text-muted-foreground">Fără titlu.</span>}</div>
                      {/* Message Body */}
                      <div className=" text-base mt-1 text-foreground leading-relaxed">{item.message ? item.message : <span className="italic text-muted-foreground">Fără mesaj.</span>}</div>

                      {/* Diff Content (Context) */}
                      {item.content && <div className="mt-3 pl-3 border-l-2 ">{renderHistoryContent(item.content)}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground space-y-3">
              <div className="w-12 h-12 rounded-full bg-muted/30 flex items-center justify-center">
                <FontAwesomeIcon icon={faHistory} className="text-xl opacity-50" />
              </div>
              <p className="text-base">Nu există istoric disponibil.</p>
            </div>
          )}
        </CardContent>
        <ScrollBar orientation="vertical" />
      </ScrollArea>
    </Card>
  );
}
