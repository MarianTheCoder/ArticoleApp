import React, { useContext, useState } from "react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser, faBuilding, faHelmetSafety, faPaperPlane, faChevronDown, faChevronUp, faReply, faComments } from "@fortawesome/free-solid-svg-icons";

import photoApi from "@/api/photoAPI";
import { useActivitati, useAddActivitate, useActivitateComments, useAddActivitateComment } from "@/hooks/useActivitati";
import { toast } from "sonner";
import { useLoading } from "@/context/LoadingContext";
import SpinnerElement from "@/MainElements/SpinnerElement";
import { AuthContext } from "@/context/TokenContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// ─── helpers ────────────────────────────────────────────────────────────────
const formatDate = (dateString) => {
  if (!dateString) return "—";
  return new Intl.DateTimeFormat("ro-RO", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(dateString));
};

// ─── Comment item ───────────────────────────────────────────────────────────
function CommentItem({ comment }) {
  return (
    <div className="flex flex-col mt-2">
      <div className="flex items-center gap-3">
        <Avatar className="h-8 w-8 border border-border rounded-lg z-10 shrink-0 bg-background">
          <AvatarImage src={comment.author?.photo ? `${photoApi}/${comment.author.photo}` : null} />
          <AvatarFallback className="bg-muted rounded-lg text-base text-muted-foreground">
            <FontAwesomeIcon icon={faUser} />
          </AvatarFallback>
        </Avatar>
        <div className="flex items-center justify-between w-full gap-2 flex-wrap">
          <span className="font-bold text-foreground text-base">{comment.author?.name || "Sistem"}</span>
          <span className="text-sm text-muted-foreground flex items-center gap-1.5">{formatDate(comment.created_at)}</span>
        </div>
      </div>
      <div className="flex-1 ml-4 border-l-2 border-b-2 rounded-bl-lg border-border pl-5 pb-2">
        <p className="text-base text-foreground leading-relaxed mt-1 whitespace-pre-wrap">{comment.mesaj}</p>
      </div>
    </div>
  );
}

// ─── Comment section ────────────────────────────────────────────────────────
function CommentSection({ activitateId, user }) {
  const { show, hide } = useLoading();
  const [mesaj, setMesaj] = useState("");
  const { data: comments = [], isLoading } = useActivitateComments(activitateId);
  const { mutateAsync: addComment } = useAddActivitateComment();

  const handleSubmit = async () => {
    if (!mesaj.trim()) return;
    show();
    try {
      await addComment({ activitate_id: activitateId, mesaj: mesaj.trim(), created_by_user_id: user.id });
      setMesaj("");
    } catch (e) {
      toast.error(e?.response?.data?.message || "Eroare la salvare.");
    } finally {
      hide();
    }
  };

  return (
    <div className="flex flex-col gap-3 pt-2">
      {!isLoading && comments.length > 0 && (
        <div className="flex flex-col gap-1">
          {comments.map((c) => (
            <CommentItem key={c.id} comment={c} />
          ))}
        </div>
      )}
      {!isLoading && comments.length === 0 && <p className="text-base text-muted-foreground italic">Niciun comentariu.</p>}
      <div className="flex gap-2 items-end">
        <Textarea
          value={mesaj}
          onChange={(e) => setMesaj(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSubmit();
          }}
          placeholder="Adaugă un comentariu… (Ctrl+Enter)"
          className="resize-none flex-1 min-h-[36px] h-[36px] max-h-24 text-base"
        />
        <Button onClick={handleSubmit} disabled={!mesaj.trim()} size="base" className="h-[36px] w-[36px] shrink-0">
          <FontAwesomeIcon icon={faPaperPlane} />
        </Button>
      </div>
    </div>
  );
}

// ─── Activity item ──────────────────────────────────────────────────────────
function ActivityItem({ item, user }) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="flex flex-col">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 border border-border rounded-lg z-10 shrink-0 bg-background">
            <AvatarImage src={item.author?.photo ? `${photoApi}/${item.author.photo}` : null} />
            <AvatarFallback className="bg-muted rounded-lg text-base text-muted-foreground">
              <FontAwesomeIcon icon={faUser} />
            </AvatarFallback>
          </Avatar>
          <div className="flex items-center justify-between w-full gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-foreground text-base">{item.author?.name || "Sistem"}</span>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-base text-muted-foreground">{formatDate(item.created_at)}</span>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                  <FontAwesomeIcon icon={open ? faChevronUp : faChevronDown} />
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>
        </div>
        <div className="flex-1 ml-5 border-l-2 border-b-2 border-primary/70 rounded-bl-2xl pl-5 pb-3">
          <p className="text-base text-foreground leading-relaxed mt-1 whitespace-pre-wrap">{item.mesaj}</p>
          {!open && item.comments_count > 0 && (
            <button onClick={() => setOpen(true)} className="mt-1 text-base text-muted-foreground hover:text-primary flex items-center gap-1.5 transition-colors">
              <FontAwesomeIcon icon={faReply} />
              {item.comments_count} {item.comments_count === 1 ? "comentariu" : "comentarii"}
            </button>
          )}
          <CollapsibleContent className="mt-3">
            <CommentSection activitateId={item.id} user={user} />
          </CollapsibleContent>
        </div>
      </div>
    </Collapsible>
  );
}

// ─── MAIN COMPONENT PENTRU CONTACT ──────────────────────────────────────────
export default function ContactActivities({ contact }) {
  const { user } = useContext(AuthContext);
  const { show, hide, loading } = useLoading();
  const [mesaj, setMesaj] = useState("");

  const { data: activitati = [], isFetching } = useActivitati({
    companyId: contact.companie_id,
    filialaId: null,
    santierId: null,
    contactId: contact.id, // Forțăm doar activitățile acestui contact
  });

  console.log("Activități pentru contact", contact.id, activitati);

  const { mutateAsync: addActivitate } = useAddActivitate();

  const handleSubmit = async () => {
    if (!mesaj.trim()) return;
    try {
      show();
      await addActivitate({
        companie_id: contact.companie_id,
        filiala_id: contact.filiala_id || null,
        santier_id: contact.santier_id || null,
        contact_id: contact.id, // Salvăm legat de acest contact
        mesaj: mesaj.trim(),
        created_by_user_id: user.id,
      });
      setMesaj("");
      toast.success("Activitate adăugată!");
    } catch (e) {
      toast.error(e?.response?.data?.message || "Eroare la salvare.");
    } finally {
      hide();
    }
  };

  return (
    <Card className="border-border shadow-base h-full flex flex-col overflow-hidden relative">
      {/* Header-ul stă fix sus */}
      <CardHeader className="py-3 px-5 bg-muted/10 border-b shrink-0 z-10">
        <CardTitle className="text-base font-bold uppercase text-muted-foreground flex items-center gap-2">
          <FontAwesomeIcon icon={faComments} /> Activități
        </CardTitle>
      </CardHeader>

      {/* CardContent devine un container flexibil pe toată înălțimea rămasă.
        IMPORTANT: p-0 ca să controlăm padding-ul intern din elementele copil.
      */}
      <CardContent className="p-0 flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* ScrollArea ia tot spațiul (flex-1) și împinge input-ul în jos */}
        <ScrollArea className="flex-1 w-full">
          <div className="p-5">
            {activitati.length > 0 ? (
              <div className="flex flex-col gap-6">
                {activitati.map((item) => (
                  <ActivityItem key={item.id} item={item} user={user} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground space-y-3">
                <div className="w-12 h-12 rounded-full bg-muted/30 flex items-center justify-center">
                  <FontAwesomeIcon icon={faComments} className="text-xl opacity-50" />
                </div>
                <p className="text-base">Nu există activități pentru acest contact.</p>
              </div>
            )}
          </div>
          <ScrollBar orientation="vertical" />
        </ScrollArea>

        {/* INPUT-UL DE JOS - stă fix la bază, își calculează automat înălțimea în funcție de text */}
        <div className="shrink-0 border-t border-border bg-card p-4 flex gap-3 items-end">
          <Textarea
            value={mesaj}
            onChange={(e) => setMesaj(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSubmit();
            }}
            placeholder="Scrie o notiță rapidă... (Ctrl+Enter pentru trimitere)"
            className="resize-none flex-1 min-h-[2.5rem] max-h-32 text-base shadow-base"
          />
          <Button onClick={handleSubmit} disabled={!mesaj.trim()} className=" shadow-base">
            <FontAwesomeIcon icon={faPaperPlane} className="text-lg" />
          </Button>
        </div>
      </CardContent>

      {isFetching && !loading && <SpinnerElement text={2} />}
    </Card>
  );
}
