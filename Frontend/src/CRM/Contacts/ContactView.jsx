import React from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import photoApi from "@/api/photoAPI";
import CompanyActivities from "../Companies/CompanyActivities";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPhone,
  faEnvelope,
  faBuilding,
  faMapLocationDot,
  faCrown,
  faCommentDots,
  faCalendarDays,
  faGlobe,
  faBriefcase,
  faAddressCard,
  faHistory,
  faUser,
  faPenToSquare,
  faPlus,
  faTrash,
  faArrowRight,
  faImage,
  faCircleInfo,
  faCity,
  faHelmetSafety,
  faComments,
  faReply,
} from "@fortawesome/free-solid-svg-icons";
import { faLinkedin } from "@fortawesome/free-brands-svg-icons";
import { useNavigate, useParams } from "react-router-dom";
import { useContactHistory } from "@/hooks/useContacts";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import ContactActivities from "./ContactActivities";

export default function ContactView({ open, setOpen }) {
  const contact = open;

  // Fetch History Data
  const { data: historyData } = useContactHistory(contact?.id);

  if (!contact) return null;

  const navigate = useNavigate();

  // --- HELPERS ---
  const safeText = (v) => (v && String(v).trim() ? String(v).trim() : "");

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
    if (val === true || val === "true") return "Da";
    if (val === false || val === "false") return "Nu";
    return String(val);
  };

  const formatField = (field) => {
    return field.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  // --- ACTION HELPERS ---
  const getActionType = (action, title) => {
    const lowerTit = (title || "").toLowerCase();

    // Prindem comentariul și activitatea
    if (lowerTit.includes("comentariu")) return "comentariu";
    if (lowerTit.includes("activitate")) return "activitate";

    const lowerAct = (action || "").toLowerCase();
    if (lowerAct.includes("edit") || lowerAct.includes("modif")) return "edit";
    if (lowerAct.includes("delet") || lowerAct.includes("sters") || lowerAct.includes("sterg")) return "delete";
    if (lowerAct.includes("creat") || lowerAct.includes("adaug") || lowerAct.includes("ad")) return "create";
    return "unknown";
  };

  const getActionIcon = (type) => {
    switch (type) {
      case "comentariu":
        return faReply;
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
        return "Comentariu la activitate";
      case "activitate":
        return "Notă nouă";
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
        return "border-blue-500";
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
        return "text-blue-500 border-blue-500 bg-blue-500/10";
      case "edit":
        return "text-medium border-medium bg-transparent";
      case "delete":
        return "text-high border-high bg-transparent";
      case "create":
        return "text-low border-low bg-transparent";
      default:
        return "text-primary border-primary bg-transparent";
    }
  };

  // --- CONTENT RENDERER ---
  const renderHistoryContent = (details) => {
    if (!details) return null;

    // 1. Single Field
    if (details.field && details.hasOwnProperty("old") && details.hasOwnProperty("new")) {
      if (["updated_by_user_id", "created_by_user_id", "id"].includes(details.field)) return null;

      if (details.field.includes("photo") || details.field.includes("logo")) {
        return (
          <div className="text-base text-foreground flex items-center gap-2">
            <FontAwesomeIcon icon={faImage} /> Fotografie actualizată
          </div>
        );
      }

      return (
        <div className="mt-1 text-base flex flex-wrap items-center gap-2">
          <span className="font-medium text-foreground">{formatField(details.field)}:</span>
          <span className="text-muted-foreground line-through decoration-muted-foreground/50">{formatValue(details.old)}</span>
          <FontAwesomeIcon icon={faArrowRight} className="text-sm text-muted-foreground" />
          <span className="text-foreground font-medium">{formatValue(details.new)}</span>
        </div>
      );
    }

    // 2. Multiple Fields (Object)
    if (typeof details === "object") {
      const visibleEntries = Object.entries(details).filter(([key]) => !["id", "updated_by_user_id", "created_by_user_id", "companie_id"].includes(key));

      if (visibleEntries.length === 0) return null;

      return (
        <div className="mt-1 flex flex-col gap-1">
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
                    <span className="text-muted-foreground line-through decoration-muted-foreground/50">{formatValue(oldValue)}</span>
                    <FontAwesomeIcon icon={faArrowRight} className="text-sm text-muted-foreground" />
                  </>
                )}
                <span className="text-foreground font-medium">{formatValue(newValue)}</span>
              </div>
            );
          })}
        </div>
      );
    }

    return <div className="text-base text-muted-foreground truncate max-w-md">{JSON.stringify(details)}</div>;
  };

  return (
    <Sheet open={!!open} onOpenChange={(val) => !val && setOpen(null)}>
      <SheetContent side="right" className="w-full sm:w-[50rem] gap-0 p-0 border-l border-border bg-background flex flex-col">
        {/* Header */}
        <SheetHeader className="px-5 py-4 border-b border-border bg-card flex flex-row items-center gap-3 space-y-0 shrink-0">
          <SheetTitle className="text-lg font-bold text-foreground">Fișă Contact</SheetTitle>
          {contact.activ ? (
            <Badge variant="outline" className="text-base font-medium text-low border-low bg-low/10 px-3 py-0.5">
              Activ
            </Badge>
          ) : (
            <Badge variant="destructive" className="text-base px-3 py-0.5">
              Inactiv
            </Badge>
          )}
        </SheetHeader>

        {/* Tabs Container */}
        <Tabs defaultValue="detalii" className="flex-1 flex flex-col overflow-hidden">
          {/* Tabs List */}
          <div className="bg-card px-5 pt-2 shrink-0">
            <TabsList className="bg-transparent p-0 justify-start h-auto w-full">
              <div className="border-b w-full flex gap-6">
                {["detalii", "activități", "istoric"].map((tab) => (
                  <TabsTrigger
                    key={tab}
                    value={tab}
                    className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 !shadow-none data-[state=active]:border-b-primary data-[state=inactive]:border-t-2 border-t-transparent data-[state=active]:text-foreground rounded-none pb-3 px-1 text-base font-bold text-muted-foreground capitalize transition-all"
                  >
                    {tab}
                  </TabsTrigger>
                ))}
              </div>
            </TabsList>
          </div>

          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto bg-background p-5">
            {/* --- TAB 1: DETALII --- */}
            <TabsContent value="detalii" className="mt-0 flex flex-col gap-4">
              {/* ... (Existing Tab 1 Content - Unchanged) ... */}
              <Card className="border-border shadow-sm">
                <CardContent className="p-4 flex flex-col items-center text-center relative">
                  <div className="h-20 w-20 mb-2 rounded-lg border-4 border-border shadow-sm relative">
                    <Avatar className="h-full rounded-none w-full">
                      <AvatarImage src={contact.logo_url ? `${photoApi}/${contact.logo_url}` : null} className="object-cover" />
                      <AvatarFallback className="text-xl font-bold bg-muted rounded-none text-foreground">
                        {contact.prenume?.[0]}
                        {contact.nume?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    {contact.is_responsible && (
                      <div className="absolute -top-1 -right-1 bg-background rounded-full p-1.5 shadow-sm border border-border flex items-center justify-center" title="Responsabil Principal">
                        <FontAwesomeIcon icon={faCrown} className="text-yellow-500 text-base" />
                      </div>
                    )}
                  </div>

                  <h1 className="text-xl font-bold text-foreground leading-tight mb-2">
                    {contact.prenume} {contact.nume}
                  </h1>

                  <div className="flex flex-wrap justify-center items-center gap-2 mb-2">
                    <Badge variant="secondary" className="text-base font-medium px-3 py-1 bg-muted text-foreground hover:bg-muted border border-border">
                      <FontAwesomeIcon icon={faBriefcase} className="mr-2 text-muted-foreground" />
                      {safeText(contact.categorie_rol)}
                    </Badge>
                  </div>

                  <p className="text-base text-muted-foreground font-medium mb-6">{safeText(contact.functie)}</p>

                  <div className="flex w-full gap-2">
                    {contact.nume_filiala ? (
                      <Button
                        variant="outline"
                        className="text-base flex-1 font-medium p-5 border-border bg-background hover:bg-primary hover:text-primary-foreground hover:border-primary  transition-colors"
                        onClick={(e) => navigate(`/CRM/Filiale/View/${contact.companie_id}/${contact.filiala_id}`)}
                      >
                        <FontAwesomeIcon icon={faBuilding} className="" />
                        <span>{contact.nume_filiala}</span>
                      </Button>
                    ) : (
                      <Button variant="outline" className="flex-1 justify-center text-base font-medium p-5 text-foreground border-border gap-2 hover:bg-muted">
                        <FontAwesomeIcon icon={faBuilding} className="text-muted-foreground" />
                        <span className="italic text-muted-foreground">Neasociat</span>
                      </Button>
                    )}
                    {contact.nume_santier ? (
                      <Button
                        variant="outline"
                        className="text-base flex-1 font-medium p-5 border-border bg-background hover:bg-primary hover:text-primary-foreground hover:border-primary  transition-colors"
                        onClick={(e) => navigate(`/Santiere/${contact.tara_companie}/${contact.companie_id}/${contact.santier_id}`)}
                      >
                        <FontAwesomeIcon icon={faHelmetSafety} className="" />
                        <span>{contact.nume_santier}</span>
                      </Button>
                    ) : (
                      <Button variant="outline" className="flex-1 justify-center text-base font-medium p-5 text-foreground border-border gap-2 hover:bg-muted">
                        <FontAwesomeIcon icon={faHelmetSafety} className="text-muted-foreground" />
                        <span className="italic text-muted-foreground">Neasociat</span>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border shadow-sm">
                <CardHeader className="py-3 px-5 bg-muted/10 border-b">
                  <CardTitle className="text-base font-bold uppercase text-muted-foreground flex whitespace-pre-line items-center justify-between ">
                    <div className="flex items-center gap-2">
                      <FontAwesomeIcon icon={faAddressCard} />
                      <span>Detalii & Strategie</span>
                    </div>
                    <Badge variant="secondary" className="flex items-center gap-2 text-base font-medium px-3 py-1 bg-muted text-foreground hover:bg-muted border border-border">
                      <FontAwesomeIcon icon={faGlobe} className="text-muted-foreground" />
                      <span>{safeText(contact.limba)}</span>
                    </Badge>
                  </CardTitle>
                </CardHeader>

                <CardContent className="p-4 flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-3 text-base">
                      <div className="w-5 flex justify-center text-muted-foreground">
                        <FontAwesomeIcon icon={faEnvelope} />
                      </div>
                      {contact.email ? (
                        <a href={`mailto:${contact.email}`} className="text-foreground hover:text-primary hover:underline truncate font-medium">
                          {contact.email}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-base">
                      <div className="w-5 flex justify-center text-muted-foreground">
                        <FontAwesomeIcon icon={faPhone} />
                      </div>
                      {contact.telefon ? (
                        <a href={`tel:${contact.telefon}`} className="text-foreground hover:text-primary hover:underline font-medium">
                          {contact.telefon}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-base">
                      <div className="w-5 flex justify-center text-muted-foreground">
                        <FontAwesomeIcon icon={faLinkedin} />
                      </div>
                      {contact.linkedin_url ? (
                        <a href={contact.linkedin_url} target="_blank" rel="noreferrer" className="text-foreground hover:text-primary hover:underline font-medium truncate">
                          Vezi Profil
                        </a>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <div className="space-y-1">
                      <div className="flex justify-between text-base">
                        <span className="text-foreground font-medium">Putere Decizie</span>
                        <span className="font-bold">{contact.putere_decizie}/5</span>
                      </div>
                      <Progress value={(contact.putere_decizie / 5) * 100} className="h-1.5" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-base">
                        <span className="text-foreground font-medium">Nivel Influență</span>
                        <span className="font-bold">{contact.nivel_influenta}/5</span>
                      </div>
                      <Progress value={(contact.nivel_influenta / 5) * 100} className="h-1.5" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-base font-bold text-muted-foreground uppercase">Canal Preferat</span>
                    <Badge variant="secondary" className="font-semibold text-foreground bg-muted hover:bg-muted">
                      {safeText(contact.canal_preferat)}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border shadow-sm">
                <CardHeader className="py-3 px-5 bg-muted/10 border-b">
                  <CardTitle className="text-base font-bold uppercase text-muted-foreground flex items-center gap-2">
                    <FontAwesomeIcon icon={faCommentDots} /> Notiță
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  {contact.note ? (
                    <div className="dark:bg-yellow-900/20 bg-yellow-50 p-3 rounded border border-border text-foreground text-base leading-relaxed whitespace-pre-line">{contact.note}</div>
                  ) : (
                    <div className="text-center text-base text-muted-foreground italic py-1">Nu există notițe salvate.</div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-border shadow-sm shrink-0">
                <CardHeader className="py-3 px-5 bg-muted/10 border-b">
                  <CardTitle className="text-base font-bold uppercase text-muted-foreground flex items-center gap-2">
                    <FontAwesomeIcon icon={faHistory} /> Info Sistem
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  <div className="flex gap-3 items-start">
                    <Avatar className="h-10 w-10 rounded-lg border border-border">
                      <AvatarImage src={contact.updated_by_photo_url ? `${photoApi}/${contact.updated_by_photo_url}` : null} />
                      <AvatarFallback className="bg-muted text-base font-medium rounded-lg">
                        <FontAwesomeIcon icon={faUser} />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-base font-bold text-muted-foreground uppercase">Ultima actualizare</span>
                      <div className="text-base">
                        <span className="font-semibold text-foreground">{contact.updated_by_name || "Sistem"}</span>
                        <div className="text-muted-foreground text-base flex items-center gap-2 mt-0.5">
                          <FontAwesomeIcon icon={faCalendarDays} className="w-3" />
                          {formatDate(contact.updated_at)}
                        </div>
                      </div>
                    </div>
                  </div>
                  <Separator className="opacity-40" />
                  <div className="flex gap-3 items-start opacity-80">
                    <Avatar className="h-8 w-8 rounded-lg border border-border">
                      <AvatarImage src={contact.created_by_photo_url ? `${photoApi}/${contact.created_by_photo_url}` : null} />
                      <AvatarFallback className="bg-muted text-sm font-medium rounded-lg">
                        <FontAwesomeIcon icon={faUser} />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-base font-bold text-muted-foreground uppercase">Creat inițial</span>
                      <div className="text-base">
                        <span className="font-medium text-foreground">{contact.created_by_name || "Sistem"}</span>
                        <span className="text-muted-foreground text-base ml-2">{formatDate(contact.created_at)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* --- TAB 2: ACTIVITĂȚI --- */}
            <TabsContent value="activități" className="mt-0 h-full">
              <ContactActivities contact={contact} />
            </TabsContent>

            <TabsContent value="istoric" className="mt-0 h-full min-h-0">
              <Card className="border-border shadow-sm h-full flex flex-col overflow-hidden">
                <CardHeader className="py-3 px-5 bg-muted/10 border-b shrink-0 z-10">
                  <CardTitle className="text-base font-bold uppercase text-muted-foreground flex items-center gap-2">
                    <FontAwesomeIcon icon={faHistory} /> Jurnal Modificări
                  </CardTitle>
                </CardHeader>

                <ScrollArea className="flex-1 w-full">
                  <CardContent className="p-0">
                    {historyData && historyData.length > 0 ? (
                      <div className="flex flex-col p-5 gap-6">
                        {historyData.map((item) => {
                          const type = getActionType(item.action, item.title);
                          const borderColor = getActionBorderColor(type);

                          return (
                            <div key={item.id} className="flex flex-col">
                              {/* --- TOP ROW: Avatar + Header Info --- */}
                              <div className="flex items-center gap-3">
                                {/* Avatar */}
                                <Avatar className="h-12 w-12 border rounded-lg border-border z-10 shrink-0 bg-background">
                                  <AvatarImage src={item.author?.photo ? `${photoApi}/${item.author.photo}` : null} />
                                  <AvatarFallback className="bg-muted text-sm rounded-lg text-muted-foreground">
                                    <FontAwesomeIcon icon={faUser} />
                                  </AvatarFallback>
                                </Avatar>

                                {/* Header Info */}
                                <div className="flex gap-2 items-center justify-between w-full">
                                  <div className="flex flex-wrap items-center gap-3 text-base">
                                    <span className="font-bold text-foreground text-base">{item.author?.name || "Sistem"}</span>

                                    {/* Entity Badge (For Contact View, mostly redundant but requested for structure) */}
                                    <Badge variant="secondary" className="text-sm font-semibold shadow-sm flex items-center gap-2 py-1 border-foreground/10 px-2">
                                      <FontAwesomeIcon icon={faUser} className="" />
                                      Contact
                                    </Badge>

                                    {/* Action Label */}
                                    <Badge className={`text-sm font-bold p-1 px-2 flex items-center gap-1 border hover:bg-transparent ${getActionBadgeStyle(type)}`}>
                                      <FontAwesomeIcon icon={getActionIcon(type)} className="text-sm" />
                                      {getActionLabel(type)}
                                    </Badge>
                                  </div>

                                  {/* Date - Far Right */}
                                  <span className="text-foreground text-base font-medium tracking-wide">{formatDate(item.date)}</span>
                                </div>
                              </div>

                              {/* --- BOTTOM ROW: Content with Borders --- */}
                              {/* ml-6 aligns with center of 48px avatar */}
                              <div className={`flex-1 ml-6 border-l-2 border-b-2 rounded-bl-3xl ${borderColor} pl-6 pb-6`}>
                                {item.title && <div className="text-lg font-bold text-foreground leading-relaxed">{item.title}</div>}

                                {/* Message Body */}
                                {item.message && <div className="text-base mt-1 text-foreground leading-relaxed">{item.message}</div>}

                                {/* Diff Content (Context) */}
                                {item.content && <div className="mt-3 pl-3 border-l-2">{renderHistoryContent(item.content)}</div>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground space-y-3">
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
            </TabsContent>
          </div>
        </Tabs>

        <SheetFooter className="p-4 border-t border-border bg-card shrink-0">
          <SheetClose asChild>
            <Button variant="outline" className="w-full sm:w-auto">
              Închide
            </Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
