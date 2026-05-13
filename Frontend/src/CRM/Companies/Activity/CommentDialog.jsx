import React, { useContext, useState, useEffect } from "react";
import { Dialog, DialogClose, DialogContent, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faReply, faSave, faPlus, faCircleCheck, faCircleInfo, faCircleExclamation, faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { AuthContext } from "@/context/TokenContext";
import { useLoading } from "@/context/LoadingContext";
import { useAddActivitateComment, useEditActivitateComment } from "@/hooks/useActivitati";
import { Separator } from "@/components/ui/separator";

// IMPORTANT: Le imporți din fișierul unde ai definit ActivityDialog
import { MentionUserPicker, normalizeMentions } from "./ActivityDialog";

const SEVERITY_OPTIONS = [
  { id: "low", label: "Scăzut", icon: faCircleCheck, activeClasses: "bg-low text-white border-low hover:bg-low" },
  { id: "medium", label: "Mediu", icon: faCircleInfo, activeClasses: "bg-medium text-white border-medium hover:bg-medium" },
  { id: "high", label: "Ridicat", icon: faCircleExclamation, activeClasses: "bg-high text-white border-high hover:bg-high" },
  { id: "critical", label: "Critic", icon: faTriangleExclamation, activeClasses: "bg-red-700 text-white border-red-700 hover:bg-red-700" },
];

export function CommentDialog({ open, setOpen, mode = "add", initialData = null, parentSeverity = "medium", activitateId, usersList }) {
  const { show, hide } = useLoading();
  const { user } = useContext(AuthContext);
  const { mutateAsync: addComment } = useAddActivitateComment();
  const { mutateAsync: editComment } = useEditActivitateComment();

  const [draft, setDraft] = useState({
    mesaj: "",
    mentions: [],
    severitate: "medium",
  });

  useEffect(() => {
    if (open) {
      if (mode === "edit" && initialData) {
        setDraft({
          mesaj: initialData.mesaj || "",
          mentions: normalizeMentions(initialData.mentions || initialData.mentiuni),
          severitate: parentSeverity || "medium",
        });
      } else {
        setDraft({
          mesaj: "",
          mentions: [],
          severitate: parentSeverity || "medium", // Setează mereu severitatea curentă a părintelui
        });
      }
    }
  }, [open, mode, initialData, parentSeverity]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!draft.mesaj.trim()) return toast.warning("Comentariul nu poate fi gol.");

    show();
    try {
      if (mode === "edit") {
        await editComment({
          id: initialData.id,
          activitate_id: activitateId,
          mesaj: draft.mesaj.trim(),
          severitate: draft.severitate,
          mention_user_ids: draft.mentions.map((u) => u.id),
        });
        toast.success("Comentariu actualizat!");
      } else {
        await addComment({
          activitate_id: activitateId,
          mesaj: draft.mesaj.trim(),
          severitate: draft.severitate,
          created_by_user_id: user.id,
          mention_user_ids: draft.mentions.map((u) => u.id),
        });
        toast.success("Comentariu adăugat!");
      }
      setOpen(false);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Eroare la salvare.");
    } finally {
      hide();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[55rem] p-0 gap-0 overflow-hidden rounded-2xl shadow-2xl">
        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="px-8 pt-8 pb-6 bg-muted/30 border-b border-border">
            <div className="flex items-center gap-5">
              <div className="h-16 w-16 rounded-xl flex items-center justify-center shrink-0 bg-primary/10 border border-primary text-primary shadow-sm">
                <FontAwesomeIcon icon={faReply} className="text-3xl" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold tracking-tight text-foreground">{mode === "edit" ? "Editează Comentariu" : "Răspunde la Activitate"}</DialogTitle>
                <p className="text-base text-muted-foreground mt-1">Oferă feedback sau actualizări suplimentare.</p>
              </div>
            </div>
          </div>

          <div className="px-8 py-8 flex flex-col gap-6 bg-card">
            <div className="grid grid-cols-4 gap-2 bg-muted/30 p-1.5 rounded-xl border border-border shadow-sm">
              {SEVERITY_OPTIONS.map((opt) => {
                const isActive = draft.severitate === opt.id;
                return (
                  <Button
                    key={opt.id}
                    type="button"
                    onClick={() => setDraft((p) => ({ ...p, severitate: opt.id }))}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold transition-all border",
                      isActive ? `${opt.activeClasses} shadow-sm` : "bg-transparent border-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <FontAwesomeIcon icon={opt.icon} className="text-base" />
                    {opt.label}
                  </Button>
                );
              })}
            </div>

            <Separator className="bg-border" />

            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <MentionUserPicker users={usersList} selectedUsers={draft.mentions} onChange={(v) => setDraft((p) => ({ ...p, mentions: v }))} />
              </div>

              <Textarea
                value={draft.mesaj}
                onChange={(e) => setDraft((p) => ({ ...p, mesaj: e.target.value }))}
                placeholder="Scrie răspunsul tău aici..."
                className="resize-none h-40 text-lg p-5 leading-relaxed shadow-sm focus-visible:ring-primary"
                autoFocus
              />
            </div>
          </div>

          <DialogFooter className="px-8 py-5 border-t bg-muted/10 gap-3">
            <DialogClose asChild>
              <Button variant="outline" type="button" size="lg" className="h-12 px-6 text-base font-bold">
                Anulează
              </Button>
            </DialogClose>
            <Button type="submit" size="lg" className="h-12 px-10 text-base font-bold shadow-md">
              <FontAwesomeIcon icon={mode === "edit" ? faSave : faPlus} className="mr-3 text-lg" />
              {mode === "edit" ? "Salvează" : "Răspunde"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
