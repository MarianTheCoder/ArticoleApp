import React, { useContext, useMemo, useState, useEffect } from "react";
import { Dialog, DialogClose, DialogContent, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faComments,
  faBuilding,
  faHelmetSafety,
  faUser,
  faSave,
  faPlus,
  faSearch,
  faCheck,
  faChevronDown,
  faXmark,
  faCircleCheck,
  faCircleInfo,
  faCircleExclamation,
  faTriangleExclamation,
} from "@fortawesome/free-solid-svg-icons";

import { cn } from "@/lib/utils";
import photoApi from "@/api/photoAPI";
import { AuthContext } from "@/context/TokenContext";
import { useLoading } from "@/context/LoadingContext";
import { useAddActivitate, useEditActivitate } from "@/hooks/useActivitati";
import { toast } from "sonner";
import ImagePreviewTooltip from "@/components/ui/ImagePreviewTooltip";
import NoImage from "@/assets/no-user-image-square.jpg";
import { Separator } from "@/components/ui/separator";

const parseMaybeJson = (value, fallback) => {
  if (value === null || value === undefined) return fallback;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

export const normalizeMentions = (mentions) => {
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

// --- OPTIUNILE DE SEVERITATE (Folosind culorile tale custom, fara opacitate) ---
const SEVERITY_OPTIONS = [
  { id: "low", label: "Scăzut", icon: faCircleCheck, activeClasses: "bg-low text-white border-low hover:bg-low" },
  { id: "medium", label: "Mediu", icon: faCircleInfo, activeClasses: "bg-medium text-white border-medium hover:bg-medium" },
  { id: "high", label: "Ridicat", icon: faCircleExclamation, activeClasses: "bg-high text-white border-high hover:bg-high" },
  { id: "critical", label: "Critic", icon: faTriangleExclamation, activeClasses: "bg-red-700 text-white border-red-700 hover:bg-red-700" },
];

// ==========================================
// SHARED UI - SELECT & MENTIONS
// ==========================================

export function MentionUserPicker({ users = [], selectedUsers = [], onChange, disabled = false }) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const selectedIds = useMemo(() => selectedUsers.map((u) => Number(u.id)), [selectedUsers]);

  const availableUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return users
      .filter((u) => !selectedIds.includes(Number(u.id)))
      .filter(
        (u) =>
          !q ||
          String(u.name || "")
            .toLowerCase()
            .includes(q),
      );
  }, [users, selectedIds, searchQuery]);

  const addUser = (u) => {
    if (!u?.id) return;
    onChange([...selectedUsers, u]);
    setSearchQuery("");
    setOpen(false);
  };

  const removeUser = (id) => {
    onChange(selectedUsers.filter((u) => Number(u.id) !== Number(id)));
  };

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <Popover
        open={open}
        onOpenChange={(isOpen) => {
          setOpen(isOpen);
          if (!isOpen) setSearchQuery("");
        }}
        modal={true}
      >
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" disabled={disabled} className="h-11 px-5 gap-3 text-base font-medium  transition-colors">
            <FontAwesomeIcon icon={faUser} className="text-muted-foreground text-lg" />
            Tag utilizator
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-80 p-4 shadow-xl rounded-xl" align="start">
          <div className="flex flex-col gap-4">
            <div className="relative">
              <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground opacity-50" />
              <input
                type="text"
                placeholder="Caută utilizator..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex h-12 w-full rounded-lg border border-input bg-transparent pl-11 pr-3 py-2 text-base shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
            </div>

            <div className="max-h-72 overflow-y-auto overscroll-contain flex flex-col gap-1.5 custom-scrollbar pr-2" onWheel={(e) => e.stopPropagation()}>
              {availableUsers.length === 0 && <div className="py-6 text-center text-base text-muted-foreground">Nu am găsit utilizatori.</div>}

              {availableUsers.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  className="flex items-center gap-4 rounded-lg px-3 py-2.5 text-base outline-none hover:bg-accent hover:text-accent-foreground transition-colors w-full text-left"
                  onClick={() => addUser(u)}
                >
                  <Avatar className="h-10 w-10 rounded-md border border-border shrink-0">
                    <AvatarImage src={u.photo ? `${photoApi}/${u.photo}` : null} />
                    <AvatarFallback className="rounded-md bg-muted text-sm font-bold">
                      <FontAwesomeIcon icon={faUser} />
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate font-medium">{u.name}</span>
                </button>
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {selectedUsers.map((u) => (
        <Badge key={u.id} variant="secondary" className="text-base h-11 font-medium flex border-border items-center gap-3 py-2 px-4 rounded-lg shadow-sm">
          <ImagePreviewTooltip
            src={u.photo ? `${photoApi}/${u.photo}` : null}
            alt={u.name}
            ringColor="ring-primary"
            fallback={<img src={NoImage} alt="No Image" className="h-full w-full object-cover opacity-50" />}
            containerClassName="h-8 w-8 rounded-md border border-border bg-muted flex items-center justify-center overflow-hidden shrink-0"
          />
          <span className="max-w-48 truncate">{u.name}</span>
          <button type="button" onClick={() => removeUser(u.id)} className="ml-1 text-muted-foreground hover:text-destructive transition-colors">
            <FontAwesomeIcon icon={faXmark} className="text-lg" />
          </button>
        </Badge>
      ))}
    </div>
  );
}

export function SearchableSelect({ value, onValueChange, options, placeholder, icon, disabled }) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const selectedOption = options.find((opt) => opt.value === value);

  const filteredOptions = useMemo(() => {
    if (!searchQuery) return options;
    const lowerQuery = searchQuery.toLowerCase();
    return options.filter((opt) => opt.label.toLowerCase().includes(lowerQuery));
  }, [options, searchQuery]);

  return (
    <Popover
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) setSearchQuery("");
      }}
      modal={true}
    >
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} disabled={disabled} className="flex-1 min-w-[14rem] justify-between text-base h-11 px-5   transition-colors shadow-sm">
          <div className="flex items-center gap-3 overflow-hidden">
            {icon && <FontAwesomeIcon icon={icon} className="text-muted-foreground text-lg shrink-0" />}
            <span className="truncate font-medium">{selectedOption ? selectedOption.label : placeholder}</span>
          </div>
          <FontAwesomeIcon icon={faChevronDown} className="ml-3 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[20rem] p-4 shadow-xl rounded-xl" align="start">
        <div className="flex flex-col gap-4">
          <div className="relative">
            <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground opacity-50" />
            <input
              type="text"
              placeholder="Caută..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex h-12 w-full rounded-lg border border-input bg-transparent pl-11 pr-3 py-2 text-base shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
          </div>

          <div className="max-h-72 overflow-y-auto overscroll-contain flex flex-col gap-1.5 custom-scrollbar pr-2" onWheel={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="flex items-center rounded-lg px-3 py-3 text-base font-medium outline-none hover:bg-accent hover:text-accent-foreground transition-colors w-full text-left"
              onClick={() => {
                onValueChange("0");
                setOpen(false);
              }}
            >
              <FontAwesomeIcon icon={faCheck} className={cn("mr-3 text-lg", value === "0" || !value ? "opacity-100" : "opacity-0")} />
              {placeholder}
            </button>

            {filteredOptions.length === 0 && searchQuery && <div className="py-6 text-center text-base text-muted-foreground">Nu am găsit rezultate.</div>}

            {filteredOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className="flex items-center rounded-lg px-3 py-3 text-base font-medium outline-none hover:bg-accent hover:text-accent-foreground transition-colors w-full text-left"
                onClick={() => {
                  onValueChange(opt.value);
                  setOpen(false);
                }}
              >
                <FontAwesomeIcon icon={faCheck} className={cn("mr-3 text-lg", value === opt.value ? "opacity-100" : "opacity-0")} />
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ==========================================
// DIALOG ACTIVITATE
// ==========================================

export function ActivityDialog({
  open,
  setOpen,
  mode = "add",
  initialData = null,
  companyId,
  filialaIdParams = null,
  santierIdParams = null,
  contactIdParams = null,
  usersList,
  filialeList,
  santiereList,
  contacteList,
}) {
  const { show, hide } = useLoading();
  const { user } = useContext(AuthContext);
  const { mutateAsync: addActivitate } = useAddActivitate();
  const { mutateAsync: editActivitate } = useEditActivitate();

  const [draft, setDraft] = useState({
    mesaj: "",
    filiala_id: filialaIdParams ? String(filialaIdParams) : null,
    santier_id: santierIdParams ? String(santierIdParams) : null,
    contact_id: contactIdParams ? String(contactIdParams) : null,
    mentions: [],
    severitate: "medium",
  });

  const isFilialaLocked = !!filialaIdParams;
  const isSantierLocked = !!santierIdParams;
  const isContactLocked = !!contactIdParams;

  useEffect(() => {
    if (open) {
      if (mode === "edit" && initialData) {
        setDraft({
          mesaj: initialData.mesaj || "",
          filiala_id: initialData.filiala_id ? String(initialData.filiala_id) : null,
          santier_id: initialData.santier_id ? String(initialData.santier_id) : null,
          contact_id: initialData.contact_id ? String(initialData.contact_id) : null,
          mentions: normalizeMentions(initialData.mentions || initialData.mentiuni),
          severitate: initialData.severitate || "medium",
        });
      } else {
        setDraft({
          mesaj: "",
          filiala_id: filialaIdParams ? String(filialaIdParams) : null,
          santier_id: santierIdParams ? String(santierIdParams) : null,
          contact_id: contactIdParams ? String(contactIdParams) : null,
          mentions: [],
          severitate: "medium",
        });
      }
    }
  }, [open, mode, initialData, filialaIdParams, santierIdParams, contactIdParams]);

  const setField = (key, value) => setDraft((prev) => ({ ...prev, [key]: value }));

  const filteredSantiere = useMemo(() => {
    if (!draft.filiala_id) return santiereList;
    return santiereList.filter((s) => String(s.filiala_id) === String(draft.filiala_id));
  }, [santiereList, draft.filiala_id]);

  const filteredContacte = useMemo(() => {
    if (draft.santier_id) return contacteList.filter((c) => String(c.santier_id) === String(draft.santier_id));
    if (draft.filiala_id) return contacteList.filter((c) => String(c.filiala_id) === String(draft.filiala_id));
    return contacteList;
  }, [contacteList, draft.santier_id, draft.filiala_id]);

  const handleFilialaChange = (val) => {
    const real = val === "0" ? null : val;
    setField("filiala_id", real);
    if (real && draft.santier_id) {
      const s = santiereList.find((x) => String(x.id) === String(draft.santier_id));
      if (s && String(s.filiala_id) !== String(real)) {
        setField("santier_id", null);
        setField("contact_id", null);
      }
    }
    if (!real) {
      setField("santier_id", null);
      setField("contact_id", null);
    }
  };

  const handleSantierChange = (val) => {
    const real = val === "0" ? null : val;
    setField("santier_id", real);
    if (real) {
      const s = santiereList.find((x) => String(x.id) === String(real));
      if (s?.filiala_id) setField("filiala_id", String(s.filiala_id));
    }
    setField("contact_id", null);
  };

  const handleContactChange = (val) => {
    const real = val === "0" ? null : val;
    setField("contact_id", real);
    if (real) {
      const c = contacteList.find((x) => String(x.id) === String(real));
      if (c?.santier_id) {
        setField("santier_id", String(c.santier_id));
        const s = santiereList.find((x) => String(x.id) === String(c.santier_id));
        if (s?.filiala_id) setField("filiala_id", String(s.filiala_id));
      } else if (c?.filiala_id) {
        setField("filiala_id", String(c.filiala_id));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!draft.mesaj.trim()) return toast.warning("Mesajul activității este obligatoriu.");

    show();
    try {
      if (mode === "edit") {
        await editActivitate({
          id: initialData.id,
          mesaj: draft.mesaj.trim(),
          filiala_id: draft.filiala_id || null,
          santier_id: draft.santier_id || null,
          contact_id: draft.contact_id || null,
          severitate: draft.severitate,
          mention_user_ids: draft.mentions.map((u) => u.id),
        });
        toast.success("Activitate actualizată!");
      } else {
        await addActivitate({
          companie_id: companyId,
          filiala_id: draft.filiala_id || null,
          santier_id: draft.santier_id || null,
          contact_id: draft.contact_id || null,
          mesaj: draft.mesaj.trim(),
          severitate: draft.severitate,
          created_by_user_id: user.id,
          mention_user_ids: draft.mentions.map((u) => u.id),
        });
        toast.success("Activitate adăugată!");
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
      <DialogContent className="sm:max-w-[64rem] p-0 gap-0 overflow-hidden rounded-2xl shadow-2xl">
        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="px-8 pt-8 pb-6 bg-muted/30 border-b border-border">
            <div className="flex items-center gap-5">
              <div className="h-16 w-16 rounded-xl flex items-center justify-center shrink-0 bg-primary/10 border border-primary text-primary shadow-sm">
                <FontAwesomeIcon icon={faComments} className="text-3xl" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold tracking-tight text-foreground">{mode === "edit" ? "Editează Activitate" : "Adaugă Activitate Nouă"}</DialogTitle>
                <p className="text-base text-muted-foreground mt-1">Selectează contextul și detaliază mesajul.</p>
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
                    onClick={() => setField("severitate", opt.id)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold transition-all border",
                      isActive ? `${opt.activeClasses}  shadow-sm` : "bg-transparent border-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <FontAwesomeIcon icon={opt.icon} className="text-base" />
                    {opt.label}
                  </Button>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-5">
              <SearchableSelect
                value={draft.filiala_id || "0"}
                onValueChange={handleFilialaChange}
                options={filialeList.map((f) => ({ value: String(f.id), label: f.nume_filiala || f.nume }))}
                placeholder="Toate filialele"
                icon={faBuilding}
                disabled={isFilialaLocked || isSantierLocked || isContactLocked}
              />
              <SearchableSelect
                value={draft.santier_id || "0"}
                onValueChange={handleSantierChange}
                options={filteredSantiere.map((s) => ({ value: String(s.id), label: s.nume }))}
                placeholder="Toate șantierele"
                icon={faHelmetSafety}
                disabled={isSantierLocked || isContactLocked}
              />
              <SearchableSelect
                value={draft.contact_id || "0"}
                onValueChange={handleContactChange}
                options={filteredContacte.map((c) => ({ value: String(c.id), label: `${c.prenume} ${c.nume}` }))}
                placeholder="Toate contactele"
                icon={faUser}
                disabled={isContactLocked}
              />
            </div>

            <Separator className="bg-border" />

            <div className="flex flex-col gap-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <MentionUserPicker users={usersList} selectedUsers={draft.mentions} onChange={(v) => setField("mentions", v)} />
              </div>

              <Textarea
                value={draft.mesaj}
                onChange={(e) => setField("mesaj", e.target.value)}
                placeholder="Descrie în detaliu vizita sau activitatea..."
                className="resize-none h-48 text-lg p-5 leading-relaxed shadow-sm  focus-visible:ring-primary"
              />
            </div>
          </div>

          <DialogFooter className="px-8 py-5 border-t bg-muted/10 gap-3">
            <DialogClose asChild>
              <Button variant="outline" type="button" size="lg" className="h-11 px-6 text-base ">
                Anulează
              </Button>
            </DialogClose>
            <Button type="submit" size="lg" className="h-11 px-10 text-base shadow-md">
              <FontAwesomeIcon icon={mode === "edit" ? faSave : faPlus} className="mr-3 text-lg" />
              {mode === "edit" ? "Salvează Modificările" : "Salvează Activitatea"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
