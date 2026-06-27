import React, { useContext, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faComments,
  faBuilding,
  faHelmetSafety,
  faUser,
  faChevronDown,
  faChevronUp,
  faReply,
  faPenToSquare,
  faPlus,
  faTriangleExclamation,
  faCircleExclamation,
  faCircleInfo,
  faCircleCheck,
} from "@fortawesome/free-solid-svg-icons";

import { cn } from "@/lib/utils";
import photoApi from "@/api/photoAPI";
import { AuthContext } from "@/context/TokenContext";
import { useActivitati, useActivitateComments } from "@/hooks/useActivitati";
import { useFilialeSelect } from "@/hooks/useFiliale";
import { useContacteSelect, useSantiereSelect } from "@/hooks/useContacts";
import { useConturi } from "@/hooks/useConturi";
import SpinnerElement from "@/MainElements/SpinnerElement";
import ImagePreviewTooltip from "@/components/ui/ImagePreviewTooltip";
import NoImage from "@/assets/no-user-image-square.jpg";

import { ActivityDialog, normalizeMentions } from "./ActivityDialog";
import { CommentDialog } from "./CommentDialog";

const formatDate = (dateString) => {
  if (!dateString) return "—";
  return new Intl.DateTimeFormat("ro-RO", { dateStyle: "short", timeStyle: "short" }).format(new Date(dateString));
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

function UserAvatarCard({ photo, altText, sizeClass = "h-10 w-10 xxxl:h-12 xxxl:w-12", iconClass = "text-sm xxxl:text-base" }) {
  return (
    <ImagePreviewTooltip
      src={photo ? `${photoApi}/${photo}` : null}
      alt={altText || "Avatar"}
      ringColor="ring-primary"
      previewMaxHeight="max-h-[18rem]"
      previewMaxWidth="max-w-[18rem]"
      fallback={<img src={NoImage} alt="No Image" className="h-full w-full object-cover opacity-50" />}
      containerClassName={cn("rounded-md border border-border bg-muted flex items-center justify-center overflow-hidden shrink-0", sizeClass)}
    />
  );
}

function MentionBadge({ mention }) {
  return (
    <Badge className="text-xs xxxl:text-sm font-semibold flex items-center gap-1.5 h-9 xxxl:h-10 border border-border text-foreground bg-transparent px-2 rounded-md hover:bg-transparent shadow-sm">
      <UserAvatarCard photo={mention.photo} altText={mention.name} sizeClass="h-6 w-6 xxxl:h-7 xxxl:w-7" />@{mention.name}
    </Badge>
  );
}

function ContextBadge({ icon, label }) {
  return (
    <Badge className="text-xs xxxl:text-sm font-bold px-2 xxxl:px-2.5 h-9 xxxl:h-10 flex items-center gap-1.5 border rounded-md hover:bg-transparent border-foreground text-foreground bg-transparent">
      <FontAwesomeIcon icon={icon} className="text-xs xxxl:text-sm" />
      {label}
    </Badge>
  );
}

function CommentItem({ comment, onEditComment, isContact = false }) {
  const mentions = normalizeMentions(comment.mentions || comment.mentiuni);

  return (
    <div id={`comment-${comment.id}`} className="flex flex-col pb-3 xxxl:pb-4 mb-3 xxxl:mb-4 border-b last:border-0 last:pb-0 last:mb-0">
      <div className="flex items-start justify-between gap-3 xxxl:gap-4">
        <div className="flex flex-col gap-2 min-w-0 flex-1">
          <div className="flex items-center gap-2.5 xxxl:gap-3 min-w-0">
            <UserAvatarCard photo={comment.author?.photo} altText={comment.author?.name} sizeClass="h-9 w-9 xxxl:h-10 xxxl:w-10" />
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <span className="font-bold text-foreground text-sm xxxl:text-base">{comment.author?.name || "Sistem"}</span>
            </div>
          </div>
        </div>

        {/* Acțiuni & Dată (dreapta) - Identic cu ActivityItemCard */}
        <div className="flex flex-wrap items-center justify-end gap-2 shrink-0">
          {/* Badge Creare */}
          <Badge
            className={`font-bold ${
              isContact ? "text-[10px] h-8 gap-1 px-2" : "px-2 xxxl:px-2.5 gap-1 xxxl:gap-1.5 h-9 xxxl:h-10 text-xs xxxl:text-sm"
            } flex items-center border border-border bg-transparent hover:bg-transparent shadow-sm`}
          >
            <span className="text-muted-foreground font-medium">Creat:</span>
            <span className="text-foreground">{formatDate(comment.created_at)}</span>
          </Badge>

          {/* Badge Editare cu Tooltip pe Hover */}
          {comment.editor?.name && (
            <div className="relative group flex items-center">
              <Badge
                className={`font-bold ${
                  isContact ? "text-[10px] h-8 gap-1 px-2" : "px-2 xxxl:px-2.5 gap-1 xxxl:gap-1.5 h-9 xxxl:h-10 text-xs xxxl:text-sm"
                } flex items-center border border-border bg-transparent hover:bg-transparent shadow-sm cursor-help transition-colors group-hover:bg-muted/50`}
              >
                <span className="text-muted-foreground font-medium">Editat:</span>
                <span className="text-foreground">{formatDate(comment.editor.edited_at)}</span>
                <FontAwesomeIcon icon={faCircleInfo} className={`text-primary ${isContact ? "text-sm" : "text-lg xxxl:text-xl"}`} />
              </Badge>

              {/* Tooltip-ul propriu-zis care apare doar la hover */}
              <div className="absolute right-0 top-full mt-2 hidden group-hover:flex items-center gap-2 xxxl:gap-3 bg-card border border-border shadow-lg p-2 xxxl:p-2.5 rounded-lg z-[100] min-w-[12rem] animate-in fade-in zoom-in-95 duration-200">
                <UserAvatarCard photo={comment.editor.photo} altText={comment.editor.name} sizeClass="h-8 w-8 xxxl:h-9 xxxl:w-9 rounded-md" />
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Editat de</span>
                  <span className="text-xs xxxl:text-sm font-bold text-foreground leading-tight">{comment.editor.name}</span>
                </div>
              </div>
            </div>
          )}

          {/* Buton Editare */}
          <Button variant="ghost" size="icon" onClick={() => onEditComment(comment)} className={`${isContact ? "h-8 w-8" : "h-9 w-9 xxxl:h-10 xxxl:w-10"} text-muted-foreground hover:text-primary`}>
            <FontAwesomeIcon icon={faPenToSquare} className={`${isContact ? "text-base" : "text-base xxxl:text-lg"}`} />
          </Button>
        </div>
      </div>

      {/* Mesaj + Mentiuni - Aliniate cu Avatarul */}
      <div className="pl-[3rem] xxxl:pl-[3.25rem] mt-1 flex flex-col gap-2">
        <p className="text-sm xxxl:text-base text-foreground/90 leading-relaxed whitespace-pre-wrap">{comment.mesaj}</p>

        {mentions.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap mt-1">
            <span className="text-xs xxxl:text-sm font-semibold text-muted-foreground">Mențiuni:</span>
            {mentions.map((m) => (
              <MentionBadge key={m.id} mention={m} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ActivityItemCard({ item, onEditActivity, onAddComment, onEditComment, usersList, isContact = false, targetFocus = null, clearFocus }) {
  const [openComments, setOpenComments] = useState(false);
  const { data: comments = [], isFetching } = useActivitateComments(item.id);

  const isTargetActivity = Number(targetFocus?.activityId) === Number(item.id);
  const targetCommentId = targetFocus?.commentId ? Number(targetFocus.commentId) : null;

  const mentions = normalizeMentions(item.mentions || item.mentiuni);

  useEffect(() => {
    if (!isTargetActivity) return;
    if (!targetCommentId) return;

    // Ca să poți da glow pe comentariu, comentariul trebuie randat în DOM.
    setOpenComments(true);
  }, [isTargetActivity, targetCommentId, targetFocus?.nonce]);

  useEffect(() => {
    if (!isTargetActivity || !targetFocus?.nonce) return;
    // Dacă vrem comentariu, așteptăm să fie deschisă zona de comentarii.
    if (targetCommentId && !openComments) return;
    // Dacă hook-ul încă încarcă comentariile, așteptăm.
    if (targetCommentId && isFetching) return;

    let cleanupTimer = null;
    const scrollTimer = window.setTimeout(() => {
      const commentElement = targetCommentId ? document.getElementById(`comment-${targetCommentId}`) : null;
      const activityElement = document.getElementById(`activity-${item.id}`);
      // Dacă nu găsește comentariul, cade elegant pe activitate.
      const element = commentElement || activityElement;

      if (!element) return;

      element.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });

      element.classList.add("ring-4", "ring-primary/60", "bg-primary/5", "transition-all", "duration-300", "rounded-xl");
      cleanupTimer = window.setTimeout(() => {
        if (commentElement) element.classList.remove("ring-4", "ring-primary/60", "bg-primary/5", "rounded-xl");
        else activityElement.classList.remove("ring-4", "ring-primary/60", "bg-primary/5");

        clearFocus?.();
      }, 2000);
    }, 150);

    return () => {
      window.clearTimeout(scrollTimer);
      if (cleanupTimer) window.clearTimeout(cleanupTimer);
    };
  }, [isTargetActivity, targetCommentId, openComments, isFetching, comments.length, targetFocus?.nonce, item.id, clearFocus]);

  return (
    <div
      id={`activity-${item.id}`}
      className={cn(
        "rounded-xl border border-border shadow-sm transition-all hover:shadow-md hover:bg-muted/10 p-3 xxxl:p-4 mb-3 xxxl:mb-4 scroll-mt-6 duration-500",
        getSeveritySurface(item.severitate || "medium"),
      )}
    >
      <div className="flex items-start justify-between gap-3 xxxl:gap-4">
        <div className="flex flex-col gap-2.5 xxxl:gap-3 min-w-0 flex-1">
          {/* Header Card */}
          <div className="flex items-center gap-2.5 xxxl:gap-3 min-w-0">
            <UserAvatarCard photo={item.author?.photo} altText={item.author?.name} />

            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <span className="font-bold text-foreground text-sm xxxl:text-base">{item.author?.name || "Sistem"}</span>
              {!isContact ? (
                <>
                  {item.filiala_nume && <ContextBadge icon={faBuilding} label={item.filiala_nume} />}
                  {item.santier_nume && <ContextBadge icon={faHelmetSafety} label={item.santier_nume} />}
                  {item.contact_nume && <ContextBadge icon={faUser} label={item.contact_nume} />}
                </>
              ) : null}
            </div>
          </div>
        </div>

        {/* Acțiuni & Dată (dreapta) - Badge-uri MARI */}
        <div className="flex flex-wrap items-center justify-end gap-2 shrink-0">
          {/* Badge Creare */}
          <Badge
            className={`text-xs xxxl:text-sm font-bold ${isContact ? "text-xs" : ""} px-2 xxxl:px-2.5 h-9 xxxl:h-10 flex items-center gap-1 xxxl:gap-1.5 border border-border bg-transparent hover:bg-transparent shadow-sm`}
          >
            <span className="text-muted-foreground font-medium">Creat la:</span>
            <span className="text-foreground">{formatDate(item.created_at)}</span>
          </Badge>

          {/* Badge Editare cu Tooltip pe Hover */}
          {item.editor?.name && (
            <div className="relative group flex items-center">
              <Badge
                className={`text-xs xxxl:text-sm font-bold ${isContact ? "text-xs" : ""} px-2 xxxl:px-2.5 h-9 xxxl:h-10 flex items-center gap-1 xxxl:gap-1.5 border border-border bg-transparent hover:bg-transparent shadow-sm transition-colors group-hover:bg-muted/50`}
              >
                <span className="text-muted-foreground font-medium">Editat la:</span>
                <span className="text-foreground">{formatDate(item.editor.edited_at)}</span>
                <FontAwesomeIcon icon={faCircleInfo} className={`text-primary ${isContact ? "text-base" : "text-lg xxxl:text-xl"}`} />
              </Badge>

              {/* Tooltip-ul propriu-zis care apare doar la hover */}
              <div className="absolute right-0 top-full mt-2 hidden group-hover:flex items-center gap-2 xxxl:gap-3 bg-card border border-border shadow-lg p-2 xxxl:p-2.5 rounded-lg z-[100] min-w-[12rem] animate-in fade-in zoom-in-95 duration-200">
                <UserAvatarCard photo={item.editor.photo} altText={item.editor.name} sizeClass="h-8 w-8 xxxl:h-9 xxxl:w-9 rounded-md" />
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Editat de</span>
                  <span className="text-xs xxxl:text-sm font-bold text-foreground leading-tight">{item.editor.name}</span>
                </div>
              </div>
            </div>
          )}

          {/* Buton Editare */}
          <Button variant="ghost" size="icon" onClick={() => onEditActivity(item)} className="h-9 w-9 xxxl:h-10 xxxl:w-10 text-muted-foreground hover:text-primary">
            <FontAwesomeIcon icon={faPenToSquare} className="text-lg xxxl:text-xl" />
          </Button>
        </div>
      </div>

      {/* Body Content (Mesaj + Mentiuni legate) */}
      <div className="pl-[3.25rem] xxxl:pl-[3.75rem] flex flex-col gap-1.5 mt-1">
        <p className="text-sm xxxl:text-base text-foreground/90 leading-relaxed whitespace-pre-wrap">{item.mesaj || <span className="italic text-muted-foreground">Fără mesaj.</span>}</p>

        {mentions.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap mt-0.5">
            <span className="text-xs xxxl:text-sm font-semibold text-muted-foreground">Mențiuni:</span>
            {mentions.map((mention) => (
              <MentionBadge key={mention.id} mention={mention} />
            ))}
          </div>
        )}
      </div>

      {/* Secțiune Bottom: Comments Toggle & Thread */}
      <div className="pl-[3.25rem] xxxl:pl-[3.75rem]">
        <div className="mt-3 xxxl:mt-4 pt-2.5 xxxl:pt-3 border-t">
          {/* Butoanele de comentarii */}
          <div className="flex items-center gap-3 xxxl:gap-4">
            <button
              type="button"
              onClick={() => setOpenComments(!openComments)}
              className="flex items-center gap-2 text-sm xxxl:text-base font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              <FontAwesomeIcon icon={openComments ? faChevronUp : faChevronDown} className="text-sm xxxl:text-base" />
              {openComments ? "Ascunde comentarii" : `Vezi comentarii (${item.comments_count || comments.length})`}
            </button>

            <Button variant="ghost" size="sm" onClick={() => onAddComment(item.id, item.severitate)} className="h-8 px-3 text-sm xxxl:text-base font-semibold text-primary hover:bg-card">
              <FontAwesomeIcon icon={faReply} className="" /> Răspunde
            </Button>
          </div>

          {/* Randarea Comentariilor - Indentat vizual */}
          {openComments && (
            <div className="pt-2.5 xxxl:pt-3">
              <div className="flex flex-col border-l-2 pl-3 xxxl:pl-4 ml-1">
                {isFetching && <SpinnerElement text={1} blurVisible={false} />}
                {!isFetching && comments.length === 0 && <p className="text-xs xxxl:text-sm text-muted-foreground italic pb-2">Nu există comentarii încă.</p>}
                {!isFetching && comments.map((c) => <CommentItem isContact={isContact} key={c.id} comment={c} onEditComment={(cToEdit) => onEditComment(cToEdit, item.severitate)} />)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ActivitatiMainCompany({ companyId = null, filialaId = null, santierId = null, contactId = null, targetFocus = null, clearFocus }) {
  const { user } = useContext(AuthContext);
  const { show, hide } = useContext(AuthContext);

  const { data: filialeList = [] } = useFilialeSelect(companyId);
  const { data: santiereList = [] } = useSantiereSelect(companyId);
  const { data: contacteList = [] } = useContacteSelect(companyId);
  const { data: utilizatoriRaw = [], isLoading: loadingUtilizatori } = useConturi();

  const usersList = useMemo(() => {
    if (loadingUtilizatori || !utilizatoriRaw.conturi) return [];
    return utilizatoriRaw.conturi
      .filter((u) => u.activ)
      .map((u) => ({
        id: Number(u.id),
        name: u.name || `${u.prenume || ""} ${u.nume || ""}`.trim() || "Utilizator",
        photo: u.photo || u.photo_url || null,
      }));
  }, [utilizatoriRaw.conturi, user?.id, loadingUtilizatori]);

  const { data: activitati = [], isFetching } = useActivitati({ companyId, filialaId, santierId, contactId });

  const [activitateDialogOpen, setActivitateDialogOpen] = useState(false);
  const [activitateDialogMode, setActivitateDialogMode] = useState("add");
  const [activitateDraftData, setActivitateDraftData] = useState(null);

  const [comentariuDialogOpen, setComentariuDialogOpen] = useState(false);
  const [comentariuDialogMode, setComentariuDialogMode] = useState("add");
  const [comentariuDraftData, setComentariuDraftData] = useState(null);
  const [activeCommentActId, setActiveCommentActId] = useState(null);
  const [activeCommentActSeverity, setActiveCommentActSeverity] = useState("medium"); // STATE NOU

  return (
    <>
      <Card className="border-0 shadow-sm h-full flex flex-col overflow-hidden">
        <CardHeader className="py-2 xxxl:py-3 px-4 xxxl:px-5 bg-muted/10 border-b shrink-0 z-10 flex flex-row items-center justify-between">
          <CardTitle className="text-sm xxxl:text-base font-bold uppercase text-muted-foreground flex items-center gap-2 m-0">
            <FontAwesomeIcon icon={faComments} /> Activități
          </CardTitle>
          <Button
            onClick={() => {
              setActivitateDialogMode("add");
              setActivitateDraftData(null);
              setActivitateDialogOpen(true);
            }}
            size="sm"
            className="h-10 xxxl:h-11 text-sm xxxl:text-base px-3 xxxl:px-4"
          >
            <FontAwesomeIcon icon={faPlus} className="mr-2" /> Adaugă Activitate
          </Button>
        </CardHeader>

        <ScrollArea className="flex-1 w-full">
          <CardContent className="p-4 xxxl:p-5">
            {isFetching && activitati.length === 0 ? (
              <SpinnerElement text={2} />
            ) : activitati.length > 0 ? (
              <div className="flex flex-col">
                {activitati.map((item) => (
                  <ActivityItemCard
                    key={item.id}
                    item={item}
                    usersList={usersList}
                    isContact={!!contactId}
                    targetFocus={targetFocus}
                    clearFocus={clearFocus}
                    onEditActivity={(itm) => {
                      setActivitateDialogMode("edit");
                      setActivitateDraftData(itm);
                      setActivitateDialogOpen(true);
                    }}
                    onAddComment={(actId, actSev) => {
                      setActiveCommentActId(actId);
                      setComentariuDialogMode("add");
                      setActiveCommentActSeverity(actSev);
                      setComentariuDraftData(null);
                      setComentariuDialogOpen(true);
                    }}
                    onEditComment={(comment, actSev) => {
                      setActiveCommentActId(comment.activitate_id);
                      setActiveCommentActSeverity(actSev);
                      setComentariuDialogMode("edit");
                      setComentariuDraftData(comment);
                      setComentariuDialogOpen(true);
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 xxxl:py-16 text-muted-foreground space-y-2 xxxl:space-y-3">
                <div className="w-10 h-10 xxxl:w-12 xxxl:h-12 rounded-full bg-muted/30 flex items-center justify-center">
                  <FontAwesomeIcon icon={faComments} className="text-lg xxxl:text-xl opacity-50" />
                </div>
                <p className="text-sm xxxl:text-base">Nu există activități înregistrate.</p>
              </div>
            )}
          </CardContent>
          <ScrollBar orientation="vertical" />
        </ScrollArea>
      </Card>

      <ActivityDialog
        open={activitateDialogOpen}
        setOpen={setActivitateDialogOpen}
        mode={activitateDialogMode}
        initialData={activitateDraftData}
        companyId={companyId}
        filialaIdParams={filialaId}
        santierIdParams={santierId}
        contactIdParams={contactId}
        usersList={usersList}
        filialeList={filialeList}
        santiereList={santiereList}
        contacteList={contacteList}
      />

      <CommentDialog
        open={comentariuDialogOpen}
        setOpen={setComentariuDialogOpen}
        mode={comentariuDialogMode}
        initialData={comentariuDraftData}
        activitateId={activeCommentActId}
        parentSeverity={activeCommentActSeverity}
        usersList={usersList}
      />
    </>
  );
}
