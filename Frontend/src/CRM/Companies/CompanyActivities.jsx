import React, { useContext, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faComments, faUser, faBuilding, faHelmetSafety, faPaperPlane, faCalendarDays, faXmark, faChevronDown, faChevronUp, faReply, faCheck, faSearch } from "@fortawesome/free-solid-svg-icons";

import { cn } from "@/lib/utils";
import photoApi from "@/api/photoAPI";
import { AuthContext } from "@/context/TokenContext";
import { useActivitati, useAddActivitate, useActivitateComments, useAddActivitateComment } from "@/hooks/useActivitati";
import { useFilialeSelect } from "@/hooks/useFiliale";
import { useContacteSelect, useSantiereSelect } from "@/hooks/useContacts";
import { toast } from "sonner";
import { useLoading } from "@/context/LoadingContext";
import SpinnerElement from "@/MainElements/SpinnerElement";

// ─── helpers ────────────────────────────────────────────────────────────────

const formatDate = (dateString) => {
  if (!dateString) return "—";
  return new Intl.DateTimeFormat("ro-RO", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(dateString));
};

// ─── Tag chip ───────────────────────────────────────────────────────────────

function TagChip({ icon, label, onRemove, removable = true }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-base font-medium px-2.5 py-1 rounded-full border border-border bg-muted/40 text-foreground">
      <FontAwesomeIcon icon={icon} className="text-muted-foreground text-base" />
      {label}
      {removable && (
        <button type="button" onClick={onRemove} className="ml-0.5 text-muted-foreground hover:text-destructive transition-colors">
          <FontAwesomeIcon icon={faXmark} className="text-base" />
        </button>
      )}
    </span>
  );
}

// ─── Custom Searchable Select (FĂRĂ componenta Command) ─────────────────────

function SearchableSelect({ value, onValueChange, options, placeholder, icon, disabled }) {
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
        if (!isOpen) setSearchQuery(""); // Resetăm căutarea când închidem
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="flex-1 min-w-40 justify-between text-base h-9 px-3 bg-muted/20 hover:bg-muted/40 transition-colors"
        >
          <div className="flex items-center gap-2 overflow-hidden">
            {icon && <FontAwesomeIcon icon={icon} className="text-muted-foreground text-base shrink-0" />}
            <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
          </div>
          <FontAwesomeIcon icon={faChevronDown} className="ml-2 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-64 p-2 shadow-lg" align="start">
        <div className="flex flex-col gap-2">
          {/* Search Box Nativ */}
          <div className="relative">
            <FontAwesomeIcon icon={faSearch} className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground opacity-50" />
            <input
              type="text"
              placeholder="Caută..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent pl-8 pr-3 py-1 text-base shadow-base transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          <div className="max-h-60 overflow-y-auto flex flex-col gap-0.5 custom-scrollbar pr-1">
            {/* Opțiunea "Reset / Toate" */}
            <button
              type="button"
              className={cn("flex items-center rounded-base px-2 py-1.5 text-base outline-none hover:bg-accent hover:text-accent-foreground transition-colors w-full text-left")}
              onClick={() => {
                onValueChange("0");
                setOpen(false);
              }}
            >
              <FontAwesomeIcon icon={faCheck} className={cn("mr-2 text-base", value === "0" || !value ? "opacity-100" : "opacity-0")} />
              {placeholder}
            </button>

            {/* Mesaj de Empty State */}
            {filteredOptions.length === 0 && searchQuery && <div className="py-4 text-center text-base text-muted-foreground">Nu am găsit rezultate.</div>}

            {/* Opțiunile filtrate */}
            {filteredOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={cn("flex items-center rounded-base px-2 py-1.5 text-base outline-none hover:bg-accent hover:text-accent-foreground transition-colors w-full text-left")}
                onClick={() => {
                  onValueChange(opt.value);
                  setOpen(false);
                }}
              >
                <FontAwesomeIcon icon={faCheck} className={cn("mr-2 text-base", value === opt.value ? "opacity-100" : "opacity-0")} />
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ─── Comment item (nested) ───────────────────────────────────────────────────

function CommentItem({ comment }) {
  return (
    <div className="flex flex-col mt-2">
      {/* Top row: Avatar, Nume și Dată (aliniate identic ca la ActivityItem) */}
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10 border border-border rounded-lg z-10 shrink-0 bg-background">
          <AvatarImage src={comment.author?.photo ? `${photoApi}/${comment.author.photo}` : null} />
          <AvatarFallback className="bg-muted rounded-lg text-base text-muted-foreground">
            <FontAwesomeIcon icon={faUser} />
          </AvatarFallback>
        </Avatar>

        <div className="flex items-center justify-between w-full gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-foreground text-base">{comment.author?.name || "Sistem"}</span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className="text-base text-foreground flex items-center gap-1.5">{formatDate(comment.created_at)}</span>
          </div>
        </div>
      </div>

      {/* Thread line + message (Același layout cu border pe stânga ca la ActivityItem) */}
      {/* ml-5 centrează linia exact pe mijlocul avatarului de w-10 */}
      <div className="flex-1 ml-5 border-l-2 border-b-2 rounded-bl-lg border-border pl-6 pb-2">
        <p className="text-base text-foreground leading-relaxed mt-1 whitespace-pre-wrap">{comment.mesaj}</p>
      </div>
    </div>
  );
}
// ─── Comment section (collapsible content) ───────────────────────────────────

function CommentSection({ activitateId, user }) {
  const { show, hide } = useLoading();
  const [mesaj, setMesaj] = useState("");

  const { data: comments = [], isLoading } = useActivitateComments(activitateId);
  const { mutateAsync: addComment } = useAddActivitateComment();
  const handleSubmit = async () => {
    if (!mesaj.trim()) return;

    show();
    try {
      await addComment({
        activitate_id: activitateId,
        mesaj: mesaj.trim(),
        created_by_user_id: user.id,
      });
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
        <div className="flex flex-col gap-2">
          {comments.map((c) => (
            <CommentItem key={c.id} comment={c} />
          ))}
        </div>
      )}

      {!isLoading && comments.length === 0 && <p className="text-base text-muted-foreground italic">Niciun comentariu încă.</p>}

      <div className="flex gap-2 items-end">
        <Textarea
          value={mesaj}
          onChange={(e) => setMesaj(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSubmit();
          }}
          placeholder="Adaugă un comentariu… (Ctrl+Enter)"
          className="resize-none flex-1 min-h-14 max-h-32 text-base"
        />
        <Button onClick={handleSubmit} disabled={!mesaj.trim()} className="h-10 w-10 shrink-0">
          <FontAwesomeIcon className="text-lg" icon={faPaperPlane} />
        </Button>
      </div>
    </div>
  );
}

// ─── Activity item with collapsible comments ────────────────────────────────

function ActivityItem({ item, user }) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="flex flex-col">
        {/* Top row */}
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12 border border-border rounded-lg z-10 shrink-0 bg-background">
            <AvatarImage src={item.author?.photo ? `${photoApi}/${item.author.photo}` : null} />
            <AvatarFallback className="bg-muted rounded-lg text-base text-muted-foreground">
              <FontAwesomeIcon icon={faUser} />
            </AvatarFallback>
          </Avatar>

          <div className="flex items-center justify-between w-full gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-foreground text-base">{item.author?.name || "Sistem"}</span>
              {item.filiala_nume && (
                <Badge variant="secondary" className="text-base flex border-foreground items-center gap-1 py-1 px-2">
                  <FontAwesomeIcon icon={faBuilding} /> {item.filiala_nume}
                </Badge>
              )}
              {item.santier_nume && (
                <Badge variant="secondary" className="text-base flex border-foreground items-center gap-1 py-1 px-2">
                  <FontAwesomeIcon icon={faHelmetSafety} /> {item.santier_nume}
                </Badge>
              )}
              {item.contact_nume && (
                <Badge variant="secondary" className="text-base flex border-foreground items-center gap-1 py-1 px-2">
                  <FontAwesomeIcon icon={faUser} /> {item.contact_nume}
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <span className="text-base text-foreground flex items-center gap-1.5">{formatDate(item.created_at)}</span>

              <CollapsibleTrigger asChild>
                <Button variant="outline" size="iconbase" className="text-muted-foreground hover:text-foreground h-10 w-10">
                  <FontAwesomeIcon icon={open ? faChevronUp : faChevronDown} className="text-base transition-transform" />
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>
        </div>

        {/* Thread line + message */}
        <div className="flex-1 ml-5 border-l-2 border-b-2 border-primary/70 rounded-bl-3xl pl-6 pb-3">
          <p className="text-base text-foreground leading-relaxed mt-1 whitespace-pre-wrap">{item.mesaj || <span className="italic text-muted-foreground">Fără mesaj.</span>}</p>

          {!open && item.comments_count > 0 && (
            <button onClick={() => setOpen(true)} className="mt-1 text-base text-muted-foreground hover:text-primary flex items-center gap-1.5 transition-colors">
              <FontAwesomeIcon className="text-lg" icon={faReply} />
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

// ─── MAIN COMPONENT ─────────────────────────────────────────────────────────

export default function ActivitatiMainCompany({ companyId = null, filialaId = null, santierId = null, contactId = null }) {
  const { user } = useContext(AuthContext);
  const { show, hide, loading } = useLoading();

  const { data: filialeList = [], isLoading: loadingFiliale } = useFilialeSelect(companyId);
  const { data: santiereList = [], isLoading: loadingSantiere } = useSantiereSelect(companyId);
  const { data: contacteList = [], isLoading: loadingContacte } = useContacteSelect(companyId);

  const [filterFiliala, setFilterFiliala] = useState(filialaId ? String(filialaId) : null);
  const [filterSantier, setFilterSantier] = useState(santierId ? String(santierId) : null);
  const [filterContact, setFilterContact] = useState(contactId ? String(contactId) : null);

  const isFilialaLocked = !!filialaId;
  const isSantierLocked = !!santierId;
  const isContactLocked = !!contactId;

  const filteredSantiere = useMemo(() => {
    if (!filterFiliala) return santiereList;
    return santiereList.filter((s) => String(s.filiala_id) === String(filterFiliala));
  }, [santiereList, filterFiliala]);

  const filteredContacte = useMemo(() => {
    if (filterSantier) return contacteList.filter((c) => String(c.santier_id) === String(filterSantier));
    if (filterFiliala) return contacteList.filter((c) => String(c.filiala_id) === String(filterFiliala));
    return contacteList;
  }, [contacteList, filterSantier, filterFiliala]);

  const handleFilialaChange = (val) => {
    const real = val === "0" ? null : val;
    setFilterFiliala(real);
    if (real && filterSantier) {
      const s = santiereList.find((s) => String(s.id) === String(filterSantier));
      if (s && String(s.filiala_id) !== String(real)) {
        setFilterSantier(null);
        setFilterContact(null);
      }
    }
    if (!real) {
      setFilterSantier(null);
      setFilterContact(null);
    }
  };

  const handleSantierChange = (val) => {
    const real = val === "0" ? null : val;
    setFilterSantier(real);
    if (real) {
      const s = santiereList.find((s) => String(s.id) === String(real));
      if (s?.filiala_id) setFilterFiliala(String(s.filiala_id));
    }
    setFilterContact(null);
  };

  const handleContactChange = (val) => {
    const real = val === "0" ? null : val;
    setFilterContact(real);
    if (real) {
      const c = contacteList.find((c) => String(c.id) === String(real));
      if (c?.santier_id) {
        setFilterSantier(String(c.santier_id));
        const s = santiereList.find((s) => String(s.id) === String(c.santier_id));
        if (s?.filiala_id) setFilterFiliala(String(s.filiala_id));
      } else if (c?.filiala_id) {
        setFilterFiliala(String(c.filiala_id));
      }
    }
  };

  const [mesaj, setMesaj] = useState("");

  const { mutateAsync: addActivitate } = useAddActivitate();
  const { data: activitati = [], isFetching: activityFetching } = useActivitati({
    companyId,
    filialaId,
    santierId,
    contactId,
  });

  const handleSubmit = async () => {
    if (!mesaj.trim()) {
      toast.warning("Scrie un mesaj înainte de a trimite.");
      return;
    }
    try {
      show();
      await addActivitate({
        companie_id: companyId,
        filiala_id: filterFiliala || null,
        santier_id: filterSantier || null,
        contact_id: filterContact || null,
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

  const filialaLabel = filialeList.find((f) => String(f.id) === String(filterFiliala))?.nume_filiala || filialeList.find((f) => String(f.id) === String(filterFiliala))?.nume;
  const santierLabel = santiereList.find((s) => String(s.id) === String(filterSantier))?.nume;
  const contactFound = filteredContacte.find((c) => String(c.id) === String(filterContact));
  const contactLabel = contactFound ? `${contactFound.prenume} ${contactFound.nume}` : null;

  return (
    <Card className="border-border relative shadow-base h-full flex flex-col overflow-hidden">
      <CardHeader className="py-3 px-5 bg-card border-b shrink-0 z-10">
        <CardTitle className="text-base font-bold uppercase text-muted-foreground flex items-center gap-2">
          <FontAwesomeIcon icon={faComments} /> Activități
        </CardTitle>
      </CardHeader>

      {/* ADDED classes to force every nested radix container to height 100% */}
      <ScrollArea className="flex-1 w-full [&>[data-radix-scroll-area-viewport]]:h-full [&>[data-radix-scroll-area-viewport]>div]:h-full">
        <CardContent className="p-0 h-full flex flex-col">
          {activitati.length > 0 ? (
            <div className="flex flex-col p-5 gap-6">
              {activitati.map((item) => (
                <ActivityItem key={item.id} item={item} user={user} />
              ))}
            </div>
          ) : (
            // flex-1 will now correctly push this to the center of the available space
            <div className="flex-1 flex flex-col items-center justify-center py-16 text-muted-foreground space-y-3">
              <div className="lg:w-16 lg:h-16 w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <FontAwesomeIcon icon={faComments} className="text-2xl opacity-50" />
              </div>
              <p className="text-base">Nu există activități înregistrate.</p>
            </div>
          )}
        </CardContent>
        <ScrollBar orientation="vertical" />
      </ScrollArea>

      <div className="shrink-0 border-t bg-card px-5 py-4 flex flex-col gap-3">
        {/* Dropdowns Row - FĂRĂ CHIP-URI, doar dropdown-uri disabled când e nevoie */}
        <div className="flex flex-wrap gap-2">
          {/* 1. FILIALA */}
          <SearchableSelect
            value={filterFiliala || "0"}
            onValueChange={handleFilialaChange}
            options={filialeList.map((f) => ({ value: String(f.id), label: f.nume_filiala || f.nume }))}
            placeholder="Toate filialele"
            icon={faBuilding}
            disabled={loadingFiliale || isFilialaLocked || isSantierLocked}
            // Dacă suntem pe un șantier, sigur aparține de o filială, deci blocăm și filiala.
          />

          {/* 2. ȘANTIER */}
          <SearchableSelect
            value={filterSantier || "0"}
            onValueChange={handleSantierChange}
            options={filteredSantiere.map((s) => ({ value: String(s.id), label: s.nume }))}
            placeholder="Toate șantierele"
            icon={faHelmetSafety}
            disabled={loadingSantiere || isSantierLocked}
          />

          {/* 3. CONTACT */}
          <SearchableSelect
            value={filterContact || "0"}
            onValueChange={handleContactChange}
            options={filteredContacte.map((c) => ({ value: String(c.id), label: `${c.prenume} ${c.nume}` }))}
            placeholder="Toate contactele"
            icon={faUser}
            disabled={loadingContacte || isContactLocked}
          />
        </div>

        {/* Textbox-ul principal */}
        <div className="grid grid-cols-[1fr_auto] gap-3 items-end mt-1">
          <Textarea
            value={mesaj}
            onChange={(e) => setMesaj(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSubmit();
            }}
            placeholder="Scrie o activitate… (Ctrl+Enter pentru a trimite)"
            className="resize-none flex-1 min-h-20 max-h-40"
          />
          <Button onClick={handleSubmit} disabled={!mesaj.trim()} className="h-[calc(100%-4px)] w-16 md:w-20 lg:w-28 shrink-0">
            <FontAwesomeIcon className="text-xl" icon={faPaperPlane} />
          </Button>
        </div>
        {activityFetching && !loading && <SpinnerElement text={2} />}
      </div>
    </Card>
  );
}
