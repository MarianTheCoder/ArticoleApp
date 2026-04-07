import React, { useContext, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSantiereByCompany, useEditSantier, useSantier } from "@/hooks/useSantiere";
import { useFiliala } from "@/hooks/useFiliale";
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
  faUser,
  faCity,
  faMapPin,
  faArrowUpRightFromSquare,
  faStickyNote,
  faHelmetSafety,
  faCalendarCheck,
  faPhone,
  faEnvelope,
  faFlag,
  faUserTie,
  faHourglassStart,
  faHourglassEnd,
} from "@fortawesome/free-solid-svg-icons";

import { toast } from "sonner";
import ContactsMainCompany from "../../../CRM/Contacts/ContactsMainCompany";
import SantiereAddDialog from "../../../CRM/Santiere/SantiereAddDialog";
import { Building } from "lucide-react";
import { GoogleMap, Marker } from "@react-google-maps/api";
import CompanyHistory from "@/CRM/Companies/CompanyHistory";
import CompanyActivities from "@/CRM/Companies/CompanyActivities";

export default function SantierView() {
  const { idSantier } = useParams();
  const navigate = useNavigate();
  const { show, hide } = useLoading();
  const { user } = useContext(AuthContext);

  // --- DATA FETCHING ---
  const { mutateAsync: editSantier } = useEditSantier();
  const { data: santierData, isFetching: loadingSantier } = useSantier(idSantier);

  const s = santierData?.santier || null;
  // Hierarchy Data
  const { data: filialaData, isFetching: loadingFiliala } = useFiliala(s?.filiala_id);
  const { data: companyData, isFetching: loadingCompany } = useCompany(s?.companie_id);

  const f = filialaData?.filiala || null;
  const c = companyData?.company || null;
  const isFetching = loadingSantier || loadingFiliala || loadingCompany;

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({
    id: null,
    nume: "",
    culoare_hex: "#FFFFFF",
    companie_id: null,
    filiala_id: null,
    activ: 1,
    notita: "",
    data_inceput: "",
    data_sfarsit: "",
    adresa: "",
    latitudine: "",
    longitudine: "",
  });

  const handleEditClick = () => {
    if (!s) return;
    setDraft({
      id: s.id,
      nume: s.nume || "",
      culoare_hex: s.culoare_hex || "#FFFFFF",
      companie_id: s.companie_id,
      filiala_id: s.filiala_id || null,
      activ: s.activ ?? 1,
      notita: s.notita || "",
      data_inceput: s.data_inceput || "",
      data_sfarsit: s.data_sfarsit || "",
      adresa: s.adresa || "",
      latitudine: s.latitudine || "",
      longitudine: s.longitudine || "",
    });
    setOpen(true);
  };

  const submitEdit = async () => {
    show();
    try {
      await editSantier({ santierId: draft.id, data: { ...draft, updated_by_user_id: user.id } });
      toast.success("Șantierul a fost actualizat!");
      setOpen(false);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Eroare la salvare.");
    } finally {
      hide();
    }
  };

  useEffect(() => {
    if (isFetching) show();
    else hide();
  }, [isFetching]);

  const safeText = (v) => (v && String(v).trim() ? String(v).trim() : "—");

  // Updated to accept optional time display
  const formatDate = (dateString, includeTime = true) => {
    if (!dateString) return "—";
    const d = new Date(dateString);
    return new Intl.DateTimeFormat("ro-RO", {
      dateStyle: "long",
      ...(includeTime && { timeStyle: "short" }),
    }).format(d);
  };

  if (!isFetching && !s) {
    return <div className="flex h-full items-center justify-center text-muted-foreground text-lg">Șantierul nu a fost găsit.</div>;
  }

  const companyLogoUrl = c?.logo_url ? `${photoApi}/${c.logo_url}` : null;

  return (
    <div className="h-full w-full flex overflow-hidden justify-center items-center">
      <div className="w-full h-full bg-background p-4 rounded-lg grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* --- LEFT SIDEBAR (1/5) --- */}
        <aside className="w-full lg:col-span-1 flex flex-col gap-4 overflow-y-auto">
          {c && (
            <Card className="border-border shadow-sm shrink-0 transition-colors group hover:shadow-md">
              <CardContent className="p-4">
                {/* Grid: logo | content */}
                <div className="grid grid-cols-[auto_1fr] gap-4">
                  {/* Logo column */}
                  <div className="h-full flex gap-2 flex-col items-center">
                    <div className="h-14 w-14 rounded-lg border bg-white flex items-center justify-center  p-1 shadow-sm">
                      {companyLogoUrl ? (
                        <img src={companyLogoUrl} alt="Logo" className="h-full w-full object-contain" />
                      ) : (
                        <FontAwesomeIcon icon={faCity} className="text-2xl flex-shrink-0 text-muted-foreground" />
                      )}
                    </div>
                    <div className="h-full bg-muted-foreground w-px"></div>
                  </div>

                  {/* Content column */}
                  <div className="flex flex-col min-w-0">
                    {/* Top row with title and arrow */}
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Companie Mamă</span>
                        <h3 className="text-base font-bold text-foreground truncate">{c.nume_companie}</h3>
                      </div>
                      <button onClick={() => navigate(`/CRM/Companii/View/${c.id}`)} className="p-1 -mt-1 -mr-1 text-muted-foreground hover:text-primary transition-colors">
                        <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="text-xl" />
                      </button>
                    </div>

                    {/* Details stacked vertically */}
                    <div className="mt-3 space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <FontAwesomeIcon icon={faFlag} className="w-4 shrink-0" />
                        <span className="truncate text-foreground">{c?.tara || "—"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <FontAwesomeIcon icon={faEnvelope} className="w-4 shrink-0" />
                        <span className="truncate text-foreground">{c?.email || "—"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <FontAwesomeIcon icon={faPhone} className="w-4 shrink-0" />
                        <span className="truncate text-foreground">{c?.telefon || "—"}</span>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-3 p-2 rounded-lg border border-border bg-muted/30">
                      <Avatar className="h-10 w-10 rounded-lg border border-background shadow-sm">
                        <AvatarImage src={c?.responsabil_logo_url ? `${photoApi}/${c.responsabil_logo_url}` : null} />
                        <AvatarFallback className="bg-muted rounded-lg">
                          <FontAwesomeIcon icon={faUserTie} className="text-sm" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Responsabil Extern</div>
                        <div className="text-sm font-semibold text-foreground truncate">{c?.responsabil_nume ? `${c?.responsabil_prenume || ""} ${c?.responsabil_nume || ""}` : "Nealocat"}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          {f && (
            <Card className="border-border shadow-sm shrink-0 transition-colors group hover:shadow-md">
              <CardContent className="p-4">
                {/* Grid: logo | content */}
                <div className="grid grid-cols-[auto_1fr] gap-4">
                  {/* Logo column */}
                  <div className="h-full flex gap-2 flex-col items-center">
                    <div className="h-14 flex-shrink-0 w-14 rounded-lg border bg-white flex items-center justify-center  p-1 shadow-sm">
                      <FontAwesomeIcon icon={faBuilding} className="text-lg h-full text-muted-foreground" />
                    </div>
                    <div className="h-full bg-muted-foreground w-px"></div>
                  </div>

                  {/* Content column */}
                  <div className="flex flex-col min-w-0">
                    {/* Top row with title and arrow */}
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Filială</span>
                        <h3 className="text-base font-bold text-foreground truncate">{f.nume_filiala}</h3>
                      </div>
                      <button onClick={() => navigate(`/CRM/Filiale/View/${f.companie_id}/${f.id}`)} className="p-1 -mt-1 -mr-1 text-muted-foreground hover:text-primary transition-colors">
                        <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="text-xl" />
                      </button>
                    </div>

                    {/* Details stacked vertically */}
                    {(f?.tara || f?.email || f?.telefon) && (
                      <div className="mt-3 space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <FontAwesomeIcon icon={faEnvelope} className="w-4 shrink-0" />
                          <span className="truncate text-foreground">{f?.email || "—"}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <FontAwesomeIcon icon={faPhone} className="w-4 shrink-0" />
                          <span className="truncate text-foreground">{f?.telefon || "—"}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 2. SANTIER IDENTITY CARD */}
          <Card className="border-border shadow-sm shrink-0">
            <CardContent className="p-5 relative flex flex-col items-center text-center">
              <div
                className={`h-20 w-20  mb-3 rounded-xl border flex items-center justify-center overflow-hidden shadow-sm`}
                style={{
                  backgroundColor: s?.culoare_hex ? s.culoare_hex : "#fff",
                }}
              ></div>

              <h1 className="text-xl font-bold text-foreground leading-tight mb-1">{safeText(s?.nume)}</h1>

              {s?.activ ? (
                <Badge className="text-low hover:bg-transparent bg-transparent border-low shadow-none">Activ</Badge>
              ) : (
                <Badge variant="destructive" className="shadow-none">
                  Inactiv
                </Badge>
              )}

              <div className="absolute top-0 p-2 right-0">
                <Button variant="ghost" onClick={handleEditClick} size="iconLg" className="text-muted-foreground hover:text-low">
                  <FontAwesomeIcon icon={faPenToSquare} className="text-lg" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 3. DETAILS CARD */}
          <Card className="border-border shadow-sm">
            <CardHeader className="py-3 px-5">
              <CardTitle className="text-base font-bold uppercase text-muted-foreground flex items-center gap-2">
                <FontAwesomeIcon icon={faFileContract} /> Detalii Șantier
              </CardTitle>
            </CardHeader>
            <Separator />
            <CardContent className="p-5 flex flex-col gap-4">
              <div className="space-y-3">
                {/* Address */}
                <div className="flex items-start gap-3 text-base">
                  <div className="w-5 flex justify-center text-muted-foreground mt-0.5">
                    <FontAwesomeIcon icon={faLocationDot} />
                  </div>
                  <span className="text-foreground leading-snug font-medium">{safeText(s?.adresa)}</span>
                </div>
                <div className="flex items-start gap-3 text-base">
                  <div className="w-5 flex justify-center text-muted-foreground mt-0.5">
                    <FontAwesomeIcon icon={faHourglassStart} />
                  </div>
                  <span className="text-foreground leading-snug font-medium">
                    <span className="text-muted-foreground">
                      Început: <span className="text-foreground">{formatDate(s?.data_inceput, false)}</span>
                    </span>
                  </span>
                </div>
                <div className="flex items-start gap-3 text-base">
                  <div className="w-5 flex justify-center text-muted-foreground mt-0.5">
                    <FontAwesomeIcon icon={faHourglassEnd} />
                  </div>
                  <span className="text-foreground leading-snug font-medium">
                    <span className="text-muted-foreground">
                      Sfârșit: <span className="text-foreground">{formatDate(s?.data_sfarsit, false)}</span>
                    </span>
                  </span>
                </div>
              </div>
              {/* Notita Removed */}
            </CardContent>
          </Card>

          {/* 4. HISTORY CARD */}
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
                <Avatar className="h-10 w-10 rounded-lg border">
                  <AvatarImage src={s?.updated_by_photo_url ? `${photoApi}/${s.updated_by_photo_url}` : null} />
                  <AvatarFallback className="bg-muted rounded-lg text-sm font-medium">
                    <FontAwesomeIcon icon={faUser} />
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-muted-foreground uppercase">Ultima actualizare</span>
                  <div className="text-sm">
                    <span className="font-semibold text-foreground">{s?.updated_by_name || "Sistem"}</span>
                    <div className="text-muted-foreground text-sm flex items-center gap-1 mt-0.5">
                      <FontAwesomeIcon icon={faCalendarDays} className="w-2.5" />
                      {formatDate(s?.updated_at)}
                    </div>
                  </div>
                </div>
              </div>

              <Separator className="opacity-40" />

              {/* CREATED BY */}
              <div className="flex gap-3 items-start opacity-80">
                <Avatar className="h-8 w-8 rounded-lg border">
                  <AvatarImage src={s?.created_by_photo_url ? `${photoApi}/${s.created_by_photo_url}` : null} />
                  <AvatarFallback className="bg-muted rounded-lg text-sm font-medium">
                    <FontAwesomeIcon icon={faUser} />
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-muted-foreground uppercase">Creat inițial</span>
                  <div className="text-sm">
                    <span className="font-medium text-foreground">{s?.created_by_name || "Sistem"}</span>
                    <span className="text-muted-foreground text-sm ml-2">{formatDate(s?.created_at)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </aside>

        {/* --- RIGHT MAIN AREA (4/5) --- */}
        <main className="w-full lg:col-span-4 h-full overflow-hidden">
          <Tabs defaultValue="locatie" className="h-full w-full flex flex-col gap-4">
            <TabsList className="bg-card px-6 py-4 rounded-lg justify-start h-auto w-full">
              <div className="border-b w-full flex gap-6">
                {["locatie", "istoric", "activitati", "contacte", "fișiere"].map((tab) => (
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
              <TabsContent value="locatie" className="h-full m-0 relative w-full">
                <div className="w-full h-full  p-4">
                  <div className="w-full h-full border-border border-2 rounded-[1rem]">
                    <GoogleMap
                      mapContainerStyle={{ height: "100%", width: "100%", borderRadius: "1rem" }}
                      center={{ lat: parseFloat(s?.latitudine || 0), lng: parseFloat(s?.longitudine || 0) }}
                      zoom={12}
                    >
                      <Marker position={{ lat: parseFloat(s?.latitudine || 0), lng: parseFloat(s?.longitudine || 0) }} />
                      <div className="absolute top-0 right-0 m-2 bg-white p-2 rounded-lg shadow-md">
                        <h1 className="text-lg text-black font-bold">Locația</h1>
                        <p className="text-black">{safeText(s?.adresa)}</p>
                      </div>
                    </GoogleMap>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="contacte" className="h-full m-0 relative w-full">
                <ContactsMainCompany companyId={s?.companie_id} filialaId={s?.filiala_id} santierId={s?.id} />
              </TabsContent>
              <TabsContent value="istoric" className="h-full m-0 relative w-full">
                <CompanyHistory companyId={s?.companie_id} santierId={s?.id} />
              </TabsContent>
              <TabsContent value="activitati" className="h-full m-0 relative w-full">
                <CompanyActivities companyId={s?.companie_id} santierId={s?.id} filialaId={s?.filiala_id} />
              </TabsContent>
              {/* Other tabs follow the placeholder pattern */}
            </div>
          </Tabs>
        </main>
      </div>

      <SantiereAddDialog open={open} setOpen={setOpen} draft={draft} setDraft={setDraft} onSubmit={submitEdit} title="Editează Șantier" />
    </div>
  );
}
