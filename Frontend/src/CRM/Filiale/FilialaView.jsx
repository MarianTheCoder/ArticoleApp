import React, { useContext, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useFiliala, useEditFiliale } from "@/hooks/useFiliale";
import { useCompany } from "@/hooks/useCompanies";
import { useLoading } from "@/context/LoadingContext";
import { AuthContext } from "@/context/TokenContext";
import photoApi from "@/api/photoAPI";

// UI Components
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faLocationDot,
  faBuilding,
  faFileContract,
  faCalendarDays,
  faPenToSquare,
  faHistory,
  faEnvelope,
  faPhone,
  faFlag,
  faUser,
  faCity,
  faMapPin,
  faArrowUpRightFromSquare,
  faStickyNote,
  faCircleArrowRight,
} from "@fortawesome/free-solid-svg-icons";

import FilialeAddDialog from "./FilialeAddDialog";
import { toast } from "sonner";
import ContactsMainCompany from "../Contacts/ContactsMainCompany";
import SantiereMainCompany from "../Santiere/SantiereMainCompany";
import CompanyHistory from "../Companies/CompanyHistory";
import CompanyActivities from "../Companies/CompanyActivities";

export default function FilialaView() {
  const { filialaId, companyId } = useParams();
  const navigate = useNavigate();
  const { show, hide } = useLoading();
  // eslint-disable-next-line no-unused-vars
  const { user } = useContext(AuthContext);

  // --- DATA FETCHING ---
  const { mutateAsync: editFiliala } = useEditFiliale();

  // 1. Fetch Filiala
  const { data: filialaData, isFetching: loadingFiliala } = useFiliala(filialaId);

  // 2. Fetch Company
  const targetCompanyId = companyId || filialaData?.filiala?.companie_id;
  const { data: companyData, isFetching: loadingCompany } = useCompany(targetCompanyId);

  const f = filialaData?.filiala || null;
  const c = companyData?.company || null;

  const isFetching = loadingFiliala || loadingCompany;

  const [open, setOpen] = useState(false);
  // State formular (Draft)
  const [draft, setDraft] = useState({
    id: null,
    companie_id: null,
    nume_filiala: "",
    tip_unitate: "",
    telefon: "",
    email: "",
    tara: "",
    regiune: "",
    oras: "",
    latitudine: "",
    longitudine: "",
    nivel_decizie: "Local",
    note: "",
  });

  const handleEditClick = () => {
    if (!f) return;
    setDraft({
      id: f.id,
      companie_id: f.companie_id,
      nume_filiala: f.nume_filiala || "",
      tip_unitate: f.tip_unitate || "",
      telefon: f.telefon || "",
      email: f.email || "",
      tara: f.tara || "",
      regiune: f.regiune || "",
      oras: f.oras || "",
      latitudine: f.latitudine || "",
      longitudine: f.longitudine || "",
      nivel_decizie: f.nivel_decizie || "Local",
      note: f.note || "",
    });
    setOpen(true);
  };

  const submitEdit = async () => {
    const payload = {
      ...draft,
      updated_by_user_id: user.id,
    };

    show();
    try {
      await editFiliala({ filialaId: draft.id, companyId: draft.companie_id, data: payload });
      toast.success("Filiala a fost actualizată!");
      setOpen(false);
    } catch (error) {
      const msg = error?.response?.data?.message || "A apărut o eroare la salvare.";
      toast.error(msg);
    } finally {
      hide();
    }
  };

  useEffect(() => {
    if (isFetching) show();
    else hide();
  }, [isFetching]);

  // Helpers
  const safeText = (v) => (v && String(v).trim() ? String(v).trim() : "—");

  const formatDate = (dateString) => {
    if (!dateString) return "—";
    const d = new Date(dateString);
    return new Intl.DateTimeFormat("ro-RO", {
      dateStyle: "long",
      timeStyle: "short",
    }).format(d);
  };

  const getDecisionBadgeColor = (level) => {
    switch (level) {
      case "Regional":
        return "text-blue-700 border-blue-200 bg-blue-50";
      case "National":
        return "text-purple-700 border-purple-200 bg-purple-50";
      default:
        return "text-gray-700 border-gray-200 bg-gray-50"; // Local
    }
  };

  if (!isFetching && !f) {
    return <div className="flex h-full items-center justify-center text-muted-foreground text-lg">Filiala nu a fost găsită.</div>;
  }
  const companyLogoUrl = c?.logo_url ? `${photoApi}/${c.logo_url}` : null;

  // Prepare Location String
  const locationParts = [f?.oras, f?.regiune, f?.tara].filter(Boolean);
  const fullLocation = locationParts.length > 0 ? locationParts.join(", ") : "—";

  return (
    <div className="h-full w-full flex overflow-hidden justify-center items-center">
      <div className="w-[95%] h-[95%] bg-background p-4 rounded-lg grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* --- LEFT SIDEBAR (1/5) --- */}
        <aside className="w-full lg:col-span-1 flex flex-col gap-4 overflow-y-auto">
          {/* 1. PARENT COMPANY CARD (UPDATED: Big Arrow Right) */}
          {c && (
            <Card className="border-border shadow-sm shrink-0 cursor-pointer  transition-colors group" onClick={() => navigate(`/CRM/Companii/View/${c.id}`)} title="Mergi la compania mamă">
              <CardContent className="p-4 flex items-center gap-4">
                {/* Logo */}
                <div className="h-14 w-14 shrink-0 rounded border bg-white flex items-center justify-center overflow-hidden p-1 shadow-sm">
                  {companyLogoUrl ? (
                    <img src={companyLogoUrl} alt="Company Logo" className="h-full w-full object-contain" />
                  ) : (
                    <FontAwesomeIcon icon={faCity} className="text-2xl text-muted-foreground" />
                  )}
                </div>

                {/* Name */}
                <div className="flex flex-col overflow-hidden min-w-0">
                  <span className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Companie Mamă</span>
                  <span className="text-base font-bold text-foreground truncate leading-tight">{c.nume_companie}</span>
                </div>

                {/* Big Arrow To The Right */}
                <FontAwesomeIcon
                  icon={faArrowUpRightFromSquare}
                  className="ml-auto text-xl text-muted-foreground group-hover:text-primary transition-all group-hover:opacity-100 group-hover:scale-110"
                />
              </CardContent>
            </Card>
          )}

          {/* 2. FILIALA IDENTITY CARD */}
          <Card className="border-border shadow-sm shrink-0">
            <CardContent className="p-5 relative flex flex-col items-center text-center">
              <div className="h-20 w-20 mb-3 rounded-xl border bg-muted/30 flex items-center justify-center overflow-hidden shadow-sm text-primary/80">
                <FontAwesomeIcon icon={faBuilding} className="text-4xl" />
              </div>

              <h1 className="text-xl font-bold text-foreground leading-tight mb-1">{safeText(f?.nume_filiala)}</h1>

              {f?.tip_unitate && (
                <Badge variant="secondary" className="mb-4 text-sm font-semibold uppercase tracking-wide">
                  {f.tip_unitate}
                </Badge>
              )}

              <div className="absolute top-0 p-2 right-0">
                <Button variant="ghost" disabled={!f} onClick={() => handleEditClick()} size="iconLg" className="text-muted-foreground hover:text-low">
                  <FontAwesomeIcon icon={faPenToSquare} className="text-lg" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 3. DETAILS CARD */}
          <Card className="border-border shadow-sm">
            <CardHeader className="py-3 px-5">
              <CardTitle className="text-base font-bold uppercase text-muted-foreground flex items-center gap-2">
                <FontAwesomeIcon icon={faFileContract} /> Detalii Filială
              </CardTitle>
            </CardHeader>
            <Separator />
            <CardContent className="p-5 flex flex-col gap-4">
              {/* -- LOCATION & CONTACT -- */}
              <div className="space-y-3">
                <div className="flex items-start gap-3 text-base">
                  <div className="w-5 flex justify-center text-muted-foreground mt-0.5">
                    <FontAwesomeIcon icon={faLocationDot} />
                  </div>
                  <span className="text-foreground leading-snug font-medium">{fullLocation}</span>
                </div>

                <div className="flex items-center gap-3 text-base">
                  <div className="w-5 flex justify-center text-muted-foreground">
                    <FontAwesomeIcon icon={faEnvelope} />
                  </div>
                  <span className="text-foreground">{safeText(f?.email)}</span>
                </div>

                <div className="flex items-center gap-3 text-base">
                  <div className="w-5 flex justify-center text-muted-foreground">
                    <FontAwesomeIcon icon={faPhone} />
                  </div>
                  <span className="text-foreground">{safeText(f?.telefon)}</span>
                </div>

                {/* -- COORDINATES (Same Row) -- */}
                <div className="flex items-center gap-3 text-base">
                  <div className="w-5 flex justify-center text-muted-foreground">
                    <FontAwesomeIcon icon={faMapPin} />
                  </div>
                  <div className="grid grid-cols-2 gap-4 w-full">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Lat:</span>
                      <span className="font-mono text-foreground font-medium">{safeText(f?.latitudine)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Long:</span>
                      <span className="font-mono text-foreground font-medium">{safeText(f?.longitudine)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* -- DECISION LEVEL BADGE -- */}
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className={`text-sm font-medium px-2 py-0.5 border ${getDecisionBadgeColor(f?.nivel_decizie)}`}>
                  Nivel Decizie: {safeText(f?.nivel_decizie)}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* 4. HISTORY / UPDATES CARD */}
          <Card className="border-border shadow-sm shrink-0">
            <CardHeader className="py-3 px-5">
              <CardTitle className="text-base font-bold uppercase text-muted-foreground flex items-center gap-2">
                <FontAwesomeIcon icon={faHistory} /> Actualizări
              </CardTitle>
            </CardHeader>
            <Separator />
            <CardContent className="p-5 space-y-5">
              {/* UPDATED BY */}
              <div className="flex gap-3 items-start">
                <Avatar className="h-10 w-10 border rounded-lg">
                  <AvatarImage src={f?.updated_by_photo_url ? `${photoApi}/${f.updated_by_photo_url}` : null} />
                  <AvatarFallback className="bg-muted text-sm font-medium rounded-lg">
                    <FontAwesomeIcon icon={faUser} />
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-muted-foreground uppercase">Ultima actualizare</span>
                  <div className="text-sm">
                    <span className="font-semibold text-foreground">{f?.updated_by_name || "Sistem"}</span>
                    <div className="text-muted-foreground text-sm flex items-center gap-1 mt-0.5">
                      <FontAwesomeIcon icon={faCalendarDays} className="w-2.5" />
                      {formatDate(f?.updated_at)}
                    </div>
                  </div>
                </div>
              </div>

              <Separator className="opacity-40" />

              {/* CREATED BY */}
              <div className="flex gap-3 items-start opacity-80">
                <Avatar className="h-8 w-8 border rounded-lg">
                  <AvatarImage src={f?.created_by_photo_url ? `${photoApi}/${f.created_by_photo_url}` : null} />
                  <AvatarFallback className="bg-muted text-sm font-medium rounded-lg">
                    <FontAwesomeIcon icon={faUser} />
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-muted-foreground uppercase">Creat inițial</span>
                  <div className="text-sm">
                    <span className="font-medium text-foreground">{f?.created_by_name || "Sistem"}</span>
                    <span className="text-muted-foreground text-sm ml-2">{formatDate(f?.created_at)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </aside>

        {/* --- RIGHT MAIN AREA (4/5) --- */}
        <main className="w-full lg:col-span-4 h-full overflow-hidden">
          <Tabs defaultValue="contacte" className="h-full w-full flex flex-col gap-4">
            <TabsList className="bg-card px-6 py-4 rounded-lg justify-start h-auto w-full">
              <div className="border-b w-full flex gap-6">
                {["istoric", "activitati", "contacte", "santiere", "fișiere"].map((tab) => (
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

            <div className="flex-1 bg-card overflow-y-auto h-full rounded-lg">
              <TabsContent value="istoric" className="h-full m-0 w-full">
                <CompanyHistory filialaId={f?.id} companyId={f?.companie_id} />
              </TabsContent>
              <TabsContent value="activitati" className="h-full m-0 w-full">
                <CompanyActivities companyId={c?.id || null} filialaId={f?.id} />
              </TabsContent>
              <TabsContent value="contacte" className="h-full m-0 relative w-full">
                <ContactsMainCompany companyId={f?.companie_id} filialaId={f?.id} />
              </TabsContent>
              <TabsContent value="santiere" className="h-full m-0 w-full">
                <SantiereMainCompany companyId={f?.companie_id} filialaId={f?.id} />
              </TabsContent>

              <TabsContent value="fișiere" className="h-full m-0 w-full">
                <div className="p-10 text-center text-muted-foreground">Fișiere</div>
              </TabsContent>
            </div>
          </Tabs>
        </main>
      </div>

      <FilialeAddDialog open={open} setOpen={setOpen} draft={draft} setDraft={setDraft} onSubmit={submitEdit} resetDraft={() => setOpen(false)} title="Editează Filiala" companyId={f?.companie_id} />
    </div>
  );
}
