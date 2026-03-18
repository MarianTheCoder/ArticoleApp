import React, { useEffect, useMemo, useState } from "react";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faTrash, faClock, faLocationDot } from "@fortawesome/free-solid-svg-icons";
import { toast } from "sonner";

// ─── helpers ──────────────────────────────────────────────────────────────────

const toLocalTime = (isoString) => {
  if (!isoString) return "";
  const d = new Date(isoString);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

const newSession = (startTime = "") => ({
  _id: Math.random().toString(36).slice(2),
  santier_id: "",
  start_time: startTime,
  end_time: "",
  start_lat: "",
  start_lng: "",
  end_lat: "",
  end_lng: "",
});

const DEFAULT_DRAFT = () => ({
  user_id: "",
  sessions: [newSession()],
  status: "completed",
  note: "",
  edited_text: "",
});

// ─── buildDraftFromUser ───────────────────────────────────────────────────────

export function buildDraftFromUser(user, sessionDate) {
  const dayBlock = user.work_sessions?.find((ws) => ws.session_date === sessionDate);
  const sessions = dayBlock?.sessions ?? [];

  if (sessions.length === 0) {
    const d = DEFAULT_DRAFT();
    d.user_id = String(user.id);
    return d;
  }

  const sorted = [...sessions].sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
  const last = sorted[sorted.length - 1];

  return {
    user_id: String(user.id),
    sessions: sorted.map((s) => ({
      _id: String(s.id),
      db_id: s.id,
      santier_id: String(s.santier_id),
      start_time: toLocalTime(s.start_time),
      end_time: toLocalTime(s.end_time),
      start_lat: s.start_lat ?? "",
      start_lng: s.start_lng ?? "",
      end_lat: s.end_lat ?? "",
      end_lng: s.end_lng ?? "",
    })),
    status: last.status ?? "completed",
    note: last.note ?? "",
    edited_text: last.edited_text ?? "",
  };
}

// ─── SessionRow ───────────────────────────────────────────────────────────────

function SessionRow({ session, index, total, santiere = [], onChange, onRemove }) {
  const set = (key, val) => onChange({ ...session, [key]: val });
  const isChained = index > 0;

  const endTimeInvalid = session.end_time && session.start_time && session.end_time <= session.start_time;

  return (
    <div className="rounded-xl border bg-muted/20 overflow-hidden">
      {/* Title bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <span className="text-base font-semibold text-foreground">Activitate {index + 1}</span>
        </div>
        {total > 1 && (
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={onRemove}>
            <FontAwesomeIcon icon={faTrash} className="text-base" />
          </Button>
        )}
      </div>

      <div className="p-4 grid gap-4">
        {/* Row 1: Șantier + Intrare + Ieșire */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="grid gap-1.5">
            <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Șantier <span className="text-destructive">*</span>
            </Label>
            <Select value={session.santier_id} onValueChange={(v) => set("santier_id", v)}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Selectează" />
              </SelectTrigger>
              <SelectContent>
                {santiere.length > 0 ? (
                  santiere.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      <div className="flex items-center gap-2">
                        {s.culoare_hex && <span className="w-2.5 h-2.5 rounded-full shrink-0 border border-muted-foreground" style={{ backgroundColor: s.culoare_hex }} />}
                        {s.nume}
                      </div>
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="null" disabled>
                    Nu ai șantiere atribuite
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Intrare <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Input
                type="time"
                className="h-10 pr-10 appearance-none [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                value={session.start_time}
                onChange={(e) => set("start_time", e.target.value)}
                disabled={isChained}
              />
              <FontAwesomeIcon icon={faClock} className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Ieșire <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Input
                type="time"
                className={`h-10 pr-10 appearance-none [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer ${endTimeInvalid ? "border-destructive focus-visible:ring-destructive" : ""}`}
                value={session.end_time}
                onChange={(e) => set("end_time", e.target.value)}
              />
              <FontAwesomeIcon icon={faClock} className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Row 2: Locație Intrare */}
        <div className="grid gap-1.5">
          <div className="flex items-center gap-1.5">
            <FontAwesomeIcon icon={faLocationDot} className="text-emerald-500 text-xs" />
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Locație Intrare</Label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input type="number" step="any" className="h-9 font-mono text-sm" placeholder="Latitudine (ex: 47.1691)" value={session.start_lat} onChange={(e) => set("start_lat", e.target.value)} />
            <Input type="number" step="any" className="h-9 font-mono text-sm" placeholder="Longitudine (ex: 27.5941)" value={session.start_lng} onChange={(e) => set("start_lng", e.target.value)} />
          </div>
        </div>

        {/* Row 3: Locație Ieșire */}
        <div className="grid gap-1.5">
          <div className="flex items-center gap-1.5">
            <FontAwesomeIcon icon={faLocationDot} className="text-destructive text-xs" />
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Locație Ieșire</Label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input type="number" step="any" className="h-9 font-mono text-sm" placeholder="Latitudine (ex: 47.1691)" value={session.end_lat} onChange={(e) => set("end_lat", e.target.value)} />
            <Input type="number" step="any" className="h-9 font-mono text-sm" placeholder="Longitudine (ex: 27.5941)" value={session.end_lng} onChange={(e) => set("end_lng", e.target.value)} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Dialog ──────────────────────────────────────────────────────────────

export default function PontajAddDialog({ open, setOpen, onSubmit, atribuiri = null, userId, sessionDate, initialDraft = null, buttonStyle = <div className="hidden" />, title = "Adaugă Pontaj" }) {
  const [draft, setDraft] = useState(DEFAULT_DRAFT);

  const santiereForUser = useMemo(() => {
    if (!atribuiri || !userId) return [];
    const { santiere, assignments } = atribuiri;
    const assignedIds = new Set(assignments.filter((a) => a.user_id === userId).map((a) => a.santier_id));
    return santiere.filter((s) => assignedIds.has(s.id));
  }, [atribuiri, userId]);

  useEffect(() => {
    if (!open) return;
    if (initialDraft) {
      setDraft(buildDraftFromUser(initialDraft, sessionDate));
    } else {
      const d = DEFAULT_DRAFT();
      d.user_id = userId ? String(userId) : "";
      setDraft(d);
    }
  }, [open, initialDraft, userId, sessionDate]);

  const setField = (key, val) => setDraft((prev) => ({ ...prev, [key]: val }));

  const updateSession = (idx, updated) => {
    setDraft((prev) => {
      const list = [...prev.sessions];
      list[idx] = updated;
      if (updated.end_time && idx < list.length - 1) {
        list[idx + 1] = { ...list[idx + 1], start_time: updated.end_time };
      }
      return { ...prev, sessions: list };
    });
  };

  const addSession = () => {
    setDraft((prev) => {
      const last = prev.sessions[prev.sessions.length - 1];
      return { ...prev, sessions: [...prev.sessions, newSession(last?.end_time || "")] };
    });
  };

  const removeSession = (idx) => {
    setDraft((prev) => {
      const list = prev.sessions.filter((_, i) => i !== idx);
      for (let i = 1; i < list.length; i++) {
        list[i] = { ...list[i], start_time: list[i - 1].end_time || "" };
      }
      return { ...prev, sessions: list };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!draft.user_id) {
      toast.warning("Utilizatorul este obligatoriu.");
      return;
    }
    for (let i = 0; i < draft.sessions.length; i++) {
      const s = draft.sessions[i];
      if (!s.santier_id) {
        toast.warning(`Activitate ${i + 1}: selectează un șantier.`);
        return;
      }
      if (!s.start_time) {
        toast.warning(`Activitate ${i + 1}: ora de intrare este obligatorie.`);
        return;
      }
      if (!s.end_time) {
        toast.warning(`Activitate ${i + 1}: ora de ieșire este obligatorie.`);
        return;
      }
      if (s.start_time >= s.end_time) {
        toast.warning(`Activitate ${i + 1}: ieșirea trebuie să fie după intrare.`);
        return;
      }
    }
    await onSubmit({ ...draft, session_date: sessionDate, tz_offset: -new Date().getTimezoneOffset() });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {buttonStyle}

      <DialogContent className="w-[35%] max-w-[35%] max-h-[95vh] p-0 gap-0 overflow-hidden flex flex-col">
        <form onSubmit={handleSubmit} className="flex flex-col h-full w-full overflow-hidden">
          {/* Header */}
          <div className="px-8 py-5 border-b bg-muted/30 shrink-0">
            <div className="grid items-center grid-cols-[auto_1fr_auto] gap-4">
              <div className="w-16 h-16 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center shrink-0">
                <FontAwesomeIcon icon={faClock} className="text-primary text-xl" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold">{title}</DialogTitle>
                <DialogDescription className="mt-0.5">
                  {sessionDate && (
                    <Badge variant="secondary" className="h-8 text-sm">
                      {sessionDate}
                    </Badge>
                  )}
                </DialogDescription>
              </div>
              <div className="flex flex-col justify-end h-full">
                <Badge variant="secondary" className="h-8 text-sm">
                  {draft?.sessions?.length ?? 0} {draft?.sessions?.length === 1 ? "activitate" : "activități"}
                </Badge>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-8 py-6 grid gap-6">
            <div className="grid gap-3">
              <p className="text-base font-bold text-muted-foreground uppercase tracking-widest">Activități</p>
              {draft.sessions.map((s, idx) => (
                <SessionRow
                  key={s._id}
                  session={s}
                  index={idx}
                  total={draft.sessions.length}
                  santiere={santiereForUser}
                  onChange={(updated) => updateSession(idx, updated)}
                  onRemove={() => removeSession(idx)}
                />
              ))}
              <Button type="button" variant="default" className="gap-2 h-10 font-semibold" onClick={addSession}>
                <FontAwesomeIcon icon={faPlus} />
                Adaugă activitate
              </Button>
            </div>

            <div className="grid gap-4">
              <p className="text-base font-bold text-muted-foreground uppercase tracking-widest">Detalii finale</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label className="text-base font-semibold">Status</Label>
                  <Select value={draft.status} onValueChange={(v) => setField("status", v)}>
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="completed">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-700" />
                          Completat
                        </div>
                      </SelectItem>
                      <SelectItem value="active">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-primary" />
                          Activ
                        </div>
                      </SelectItem>
                      <SelectItem value="cancelled">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-destructive" />
                          Anulat
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="note" className="text-base font-semibold">
                  Raport zi
                </Label>
                <Textarea
                  id="note"
                  value={draft.note}
                  onChange={(e) => setField("note", e.target.value)}
                  placeholder="Descriere activitate, observații, progres șantier..."
                  className="resize-none h-28 text-base leading-relaxed"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edited_text" className="text-base font-semibold">
                  Motiv editare <span className="text-muted-foreground font-normal text-sm">(opțional)</span>
                </Label>
                <Textarea
                  id="edited_text"
                  value={draft.edited_text}
                  onChange={(e) => setField("edited_text", e.target.value)}
                  placeholder="Dacă datele au fost corectate manual, explică motivul..."
                  className="resize-none h-20 text-base leading-relaxed"
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-8 py-4 border-t bg-muted/20 flex justify-end gap-3 shrink-0">
            <DialogClose asChild>
              <Button type="button" variant="outline" className="h-10 px-6 font-semibold">
                Anulează
              </Button>
            </DialogClose>
            <Button type="submit" className="h-10 px-8 font-semibold">
              Salvează
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
