import React, { useContext, useState } from "react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser, faBuilding, faHelmetSafety, faPaperPlane, faChevronDown, faChevronUp, faReply, faComments, faPenToSquare, faFloppyDisk, faBan } from "@fortawesome/free-solid-svg-icons";

import photoApi from "@/api/photoAPI";
import { useActivitati, useAddActivitate, useEditActivitate, useActivitateComments, useAddActivitateComment, useEditActivitateComment } from "@/hooks/useActivitati";
import { toast } from "sonner";
import { useLoading } from "@/context/LoadingContext";
import SpinnerElement from "@/MainElements/SpinnerElement";
import { AuthContext } from "@/context/TokenContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const formatDate = (dateString) => {
  if (!dateString) return "—";
  return new Intl.DateTimeFormat("ro-RO", { dateStyle: "short", timeStyle: "short" }).format(new Date(dateString));
};

// ─── Comment item ────────────────────────────────────────────────────────────
function CommentItem({ comment, user, activitateId }) {
  const { show, hide } = useLoading();
  const { mutateAsync: editComment } = useEditActivitateComment();
  const [editing, setEditing] = useState(false);
  const [editMesaj, setEditMesaj] = useState(comment.mesaj);

  const handleSaveEdit = async () => {
    if (!editMesaj.trim()) return;
    show();
    try {
      await editComment({ id: comment.id, activitate_id: activitateId, mesaj: editMesaj.trim(), updated_by_user_id: user.id });
      setEditing(false);
      toast.success("Comentariu actualizat!");
    } catch (e) {
      toast.error(e?.response?.data?.message || "Eroare la salvare.");
    } finally {
      hide();
    }
  };

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
          <div className="flex items-center gap-2 shrink-0">
            {/* Editor chip */}
            {comment.editor?.name && (
              <div className="flex h-8 items-center gap-2 px-2.5 border border-border rounded-lg ">
                {/* <Avatar className="h-5 w-5 rounded-md border border-border shrink-0">
                  <AvatarImage src={comment.editor?.photo ? `${photoApi}/${comment.editor.photo}` : null} />
                  <AvatarFallback className="bg-muted rounded-md text-[10px]">
                    <FontAwesomeIcon icon={faUser} className="text-[10px]" />
                  </AvatarFallback>
                </Avatar> */}
                <div className="flex flex-col leading-none">
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Editat de</span>
                  <span className="text-xs font-semibold text-foreground">{comment.editor.name}</span>
                </div>
                <span className="text-xs text-muted-foreground">{formatDate(comment.editor.edited_at)}</span>
              </div>
            )}
            {/* Created at */}
            <div className="flex items-center gap-1.5 border border-border rounded-lg px-2.5 h-8 ">
              <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">Creat la</span>
              <span className="text-xs text-foreground">{formatDate(comment.created_at)}</span>
            </div>
            {/* Edit button — owner only */}
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-low"
              onClick={() => {
                setEditMesaj(comment.mesaj);
                setEditing(true);
              }}
            >
              <FontAwesomeIcon icon={faPenToSquare} className="text-xs" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 ml-4 border-l-2 border-b-2 rounded-bl-lg border-border pl-5 pb-2">
        {editing ? (
          <div className="flex flex-col gap-2 mt-1">
            <Textarea
              value={editMesaj}
              onChange={(e) => setEditMesaj(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSaveEdit();
              }}
              className="resize-none min-h-14 max-h-32 text-base"
              autoFocus
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSaveEdit} disabled={!editMesaj.trim()}>
                <FontAwesomeIcon icon={faFloppyDisk} className="mr-1.5" /> Salvează
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setEditing(false);
                  setEditMesaj(comment.mesaj);
                }}
              >
                <FontAwesomeIcon icon={faBan} className="mr-1.5" /> Anulează
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-base text-foreground leading-relaxed mt-1 whitespace-pre-wrap">{comment.mesaj}</p>
        )}
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

  if (isLoading) return <SpinnerElement text={1} blurVisible={false} />;

  return (
    <div className="flex flex-col gap-3 pt-2">
      {comments.length > 0 && (
        <div className="flex flex-col gap-1">
          {comments.map((c) => (
            <CommentItem key={c.id} comment={c} user={user} activitateId={activitateId} />
          ))}
        </div>
      )}
      {comments.length === 0 && <p className="text-base text-muted-foreground italic">Niciun comentariu.</p>}
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
        <Button onClick={handleSubmit} disabled={!mesaj.trim()} className="h-[36px] w-[36px] shrink-0">
          <FontAwesomeIcon icon={faPaperPlane} />
        </Button>
      </div>
    </div>
  );
}

// ─── Activity item ──────────────────────────────────────────────────────────
function ActivityItem({ item, user, onEditRequest, isBeingEdited = false }) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className={`flex flex-col p-5 ${isBeingEdited ? "bg-primary/20" : ""}`}>
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

            <div className="flex items-center gap-2 shrink-0">
              {/* Editor chip */}
              {item.editor?.name && (
                <div className="flex h-10 items-center gap-2 px-3 border border-border rounded-lg">
                  {/* <Avatar className="h-6 w-6 rounded-md border border-border shrink-0">
                    <AvatarImage src={item.editor?.photo ? `${photoApi}/${item.editor.photo}` : null} />
                    <AvatarFallback className="bg-muted rounded-md text-[10px]">
                      <FontAwesomeIcon icon={faUser} className="text-[10px]" />
                    </AvatarFallback>
                  </Avatar> */}
                  <div className="flex flex-col leading-none">
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Editat de</span>
                    <span className="text-xs font-semibold text-foreground">{item.editor.name}</span>
                  </div>
                  <span className="text-xs text-foreground">{formatDate(item.editor.edited_at)}</span>
                </div>
              )}

              {/* Created at */}
              <div className="flex items-center gap-1.5 border border-border rounded-lg px-3 h-8 ">
                <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">Creat la</span>
                <span className="text-xs text-foreground">{formatDate(item.created_at)}</span>
              </div>

              {/* Edit — owner only */}
              <Button variant="outline" onClick={() => onEditRequest(item)} className="text-muted-foreground hover:text-low h-8 w-8">
                <FontAwesomeIcon icon={faPenToSquare} className="text-sm" />
              </Button>

              <CollapsibleTrigger asChild>
                <Button variant="outline" className="text-muted-foreground hover:text-low h-8 w-8">
                  <FontAwesomeIcon icon={open ? faChevronUp : faChevronDown} className="text-sm" />
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

// ─── MAIN ───────────────────────────────────────────────────────────────────
export default function ContactActivities({ contact }) {
  const { user } = useContext(AuthContext);
  const { show, hide, loading } = useLoading();
  const [mesaj, setMesaj] = useState("");
  const [editingActivity, setEditingActivity] = useState(null);

  const { data: activitati = [], isFetching } = useActivitati({
    companyId: contact.companie_id,
    filialaId: null,
    santierId: null,
    contactId: contact.id,
  });

  const { mutateAsync: addActivitate } = useAddActivitate();
  const { mutateAsync: editActivitate } = useEditActivitate();

  const handleEditRequest = (item) => {
    setEditingActivity(item);
    setMesaj(item.mesaj);
  };

  const handleCancelEdit = () => {
    setEditingActivity(null);
    setMesaj("");
  };

  const handleSubmit = async () => {
    if (!mesaj.trim()) return;
    show();
    try {
      if (editingActivity) {
        await editActivitate({
          id: editingActivity.id,
          mesaj: mesaj.trim(),
          filiala_id: editingActivity.filiala_id || null,
          santier_id: editingActivity.santier_id || null,
          contact_id: contact.id,
          updated_by_user_id: user.id,
        });
        toast.success("Activitate actualizată!");
        setEditingActivity(null);
      } else {
        await addActivitate({
          companie_id: contact.companie_id,
          filiala_id: contact.filiala_id || null,
          santier_id: contact.santier_id || null,
          contact_id: contact.id,
          mesaj: mesaj.trim(),
          created_by_user_id: user.id,
        });
        toast.success("Activitate adăugată!");
      }
      setMesaj("");
    } catch (e) {
      toast.error(e?.response?.data?.message || "Eroare la salvare.");
    } finally {
      hide();
    }
  };

  return (
    <Card className="border-border shadow-base h-full flex flex-col overflow-hidden relative">
      <CardHeader className="py-3 px-5 bg-muted/10 border-b shrink-0 z-10">
        <CardTitle className="text-base font-bold uppercase text-muted-foreground flex items-center gap-2">
          <FontAwesomeIcon icon={faComments} /> Activități
        </CardTitle>
      </CardHeader>

      <CardContent className="p-0 flex-1 flex flex-col min-h-0 overflow-hidden">
        <ScrollArea className="flex-1 w-full">
          {activitati.length > 0 ? (
            <div className="flex flex-col">
              {activitati.map((item) => (
                <ActivityItem key={item.id} item={item} user={user} onEditRequest={handleEditRequest} isBeingEdited={editingActivity?.id === item.id} />
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
          <ScrollBar orientation="vertical" />
        </ScrollArea>

        <div className="shrink-0 border-t border-border bg-card px-4 py-3 flex flex-col gap-2">
          <div className="flex gap-3 items-end">
            <Textarea
              value={mesaj}
              onChange={(e) => setMesaj(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSubmit();
              }}
              placeholder={editingActivity ? "Modifică activitatea…" : "Scrie o notiță rapidă... (Ctrl+Enter)"}
              className="resize-none flex-1 h-24 max-h-24 text-base shadow-base"
            />
            <div className="flex flex-col gap-1">
              <Button onClick={handleSubmit} disabled={!mesaj.trim()} className="shadow-base">
                <FontAwesomeIcon icon={editingActivity ? faFloppyDisk : faPaperPlane} className="text-lg" />
              </Button>
              {editingActivity && (
                <Button variant="outline" onClick={handleCancelEdit}>
                  <FontAwesomeIcon icon={faBan} />
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>

      {isFetching && !loading && <SpinnerElement text={2} />}
    </Card>
  );
}
