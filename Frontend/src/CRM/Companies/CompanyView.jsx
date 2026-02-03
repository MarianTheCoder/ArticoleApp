import React, { useContext, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useCompany, useEditCompany } from "@/hooks/useCompanies";
import { useLoading } from "@/context/LoadingContext";
import { AuthContext } from "@/context/TokenContext";
import photoApi from "@/api/photoAPI";

// UI Components
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faGlobe, faLocationDot, faBuilding, faFileContract,
    faCalendarDays, faPenToSquare, faHistory,
    faEnvelope, faCheckCircle, faTimesCircle, faPhone, faFlag,
    faUser, faUserTie
} from "@fortawesome/free-solid-svg-icons";
import CompaniesAddDialog from "./CompaniesAddDialog";
import { toast } from "sonner";
import ContactsMainCompany from "../Contacts/ContactsMainCompany";

export default function CompanyView() {

    const { companyId } = useParams();
    const { show, hide } = useLoading();
    // eslint-disable-next-line no-unused-vars
    const { user } = useContext(AuthContext);

    // --- DATA FETCHING ---
    const { mutateAsync: editCompany } = useEditCompany();
    const { data, isFetching } = useCompany(companyId);
    console.log("Company data:", isFetching, companyId);

    const c = data?.company || null;

    const [open, setOpen] = useState(false);
    // State formular (Draft)
    const [draft, setDraft] = useState({
        id: null, // ID-ul e critic pentru editare
        nume_companie: "", grup_companie: "", domeniu_unitate_afaceri: "", forma_juridica: "", website: "",
        tara: "RO", regiune: "", oras: "", adresa: "", cod_postal: "",
        nivel_strategic: "Tinta", status_relatie: "Prospect", nivel_risc: "Mediu",
        nda_semnat: false, scor_conformitate: 0, note: "",
        logoFile: null, logoPreview: "",
    });

    const handleEditClick = () => {
        if (!c) return;
        setDraft({
            id: c.id,
            nume_companie: c.nume_companie || "",
            grup_companie: c.grup_companie || "",
            domeniu_unitate_afaceri: c.domeniu_unitate_afaceri || "",
            forma_juridica: c.forma_juridica || "",
            website: c.website || "",
            tara: c.tara || "RO",
            regiune: c.regiune || "",
            oras: c.oras || "",
            adresa: c.adresa || "",
            cod_postal: c.cod_postal || "",
            nivel_strategic: c.nivel_strategic || "Tinta",
            status_relatie: c.status_relatie || "Prospect",
            nivel_risc: c.nivel_risc || "Mediu",
            nda_semnat: c.nda_semnat === 1 || c.nda_semnat === true,
            scor_conformitate: c.scor_conformitate || 0,
            note: c.note || "",
            logoFile: null, // Nu avem fișier nou selectat încă
            // Construim URL-ul pentru logo-ul existent
            logoPreview: c.logo_url ? photoApi + c.logo_url : ""
        });
        setOpen(true);
    };

    // --- 2. SALVARE MODIFICĂRI (Submit) ---
    const submitEdit = async () => {
        const fd = new FormData();

        // Adăugăm logo doar dacă userul a încărcat unul nou
        if (draft.logoFile) fd.append("logo", draft.logoFile);

        fd.append("nume_companie", draft.nume_companie.trim());
        fd.append("grup_companie", draft.grup_companie || "");
        fd.append("domeniu_unitate_afaceri", draft.domeniu_unitate_afaceri || "");
        fd.append("forma_juridica", draft.forma_juridica || "");
        fd.append("website", draft.website || "");
        fd.append("tara", draft.tara || "RO");
        fd.append("regiune", draft.regiune || "");
        fd.append("oras", draft.oras || "");
        fd.append("adresa", draft.adresa || "");
        fd.append("cod_postal", draft.cod_postal || "");
        fd.append("nivel_strategic", draft.nivel_strategic || "Tinta");
        fd.append("status_relatie", draft.status_relatie || "Prospect");
        fd.append("nivel_risc", draft.nivel_risc || "Mediu");
        fd.append("nda_semnat", draft.nda_semnat ? "1" : "0");
        fd.append("scor_conformitate", String(Number(draft.scor_conformitate || 0)));
        fd.append("note", draft.note || "");

        // La editare setăm doar updated_by
        fd.append("updated_by_user_id", user.id);

        show(); // Loading manual
        try {
            // Apelăm hook-ul de EDITARE cu ID și Date
            await editCompany({ id: draft.id, formData: fd });

            toast.success("Compania a fost actualizată!");
            setOpen(false);
            // Lista se actualizează automat datorită React Query (invalidateQueries)
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

    // Cleanup pentru preview logo
    useEffect(() => {
        return () => { if (draft.logoPreview && draft.logoFile) URL.revokeObjectURL(draft.logoPreview); };
    }, [draft.logoFile]);

    // Helpers
    const safeText = (v) => (v && String(v).trim() ? String(v).trim() : "—");

    const formatDate = (dateString) => {
        if (!dateString) return "—";
        const d = new Date(dateString);
        return new Intl.DateTimeFormat("ro-RO", {
            dateStyle: "long", timeStyle: "short"
        }).format(d);
    };

    const getRiskColor = (nivel) => {
        const r = String(nivel || "").toLowerCase();
        if (r.includes("rid")) return "text-high border-high";
        if (r.includes("med")) return "text-medium border-medium";
        return "text-low border-low";
    };

    if (!isFetching && !c) {
        return <div className="flex h-full items-center justify-center text-muted-foreground text-lg">Compania nu a fost găsită.</div>;
    }

    const logoUrl = c?.logo_url ? photoApi + c.logo_url : null;
    const countryName = c?.tara ? new Intl.DisplayNames(['ro'], { type: 'region' }).of(c.tara) : c?.tara;

    // Construct full address string for single line display
    const addressParts = [c?.adresa, c?.cod_postal, c?.oras, c?.regiune].filter(Boolean);
    const fullAddress = addressParts.length > 0 ? addressParts.join(", ") : "—";

    const fullResponsabilName = c?.responsabil_prenume && c?.responsabil_name ? `${c.responsabil_prenume} ${c.responsabil_name}` : null;

    return (
        <div className="h-full w-full flex overflow-hidden justify-center items-center">
            <div className="w-[95%] h-[95%] bg-background p-4  rounded-lg grid grid-cols-1 lg:grid-cols-5 gap-4">

                {/* --- LEFT SIDEBAR (1/5) --- */}
                <aside className="w-full lg:col-span-1 flex flex-col gap-4 overflow-y-auto">
                    {/* 1. IDENTITY CARD */}
                    <Card className="border-border shadow-sm shrink-0">
                        <CardContent className="p-5 relative flex flex-col items-center text-center">
                            <div className="h-20 w-20 mb-3 rounded-xl border bg-white flex items-center justify-center overflow-hidden shadow-sm">
                                {logoUrl ? (
                                    <img src={logoUrl} alt="Logo" className="h-full w-full object-contain" />
                                ) : (
                                    <FontAwesomeIcon icon={faBuilding} className="text-4xl text-muted-foreground" />
                                )}
                            </div>

                            <h1 className="text-xl font-bold text-foreground leading-tight mb-1">
                                {safeText(c?.nume_companie)}
                            </h1>

                            {c?.grup_companie && (
                                <p className="text-base text-muted-foreground font-medium mb-4">
                                    {c.grup_companie}
                                </p>
                            )}

                            {/* --- OWNER SECTION (NOU) --- */}
                            <div className="w-full rounded-lg p-3  border border-border flex items-center gap-3 text-left">
                                <Avatar className="h-10 w-10 border border-background shadow-sm">
                                    <AvatarImage src={c?.responsabil_logo_url ? photoApi + c.responsabil_logo_url : null} />
                                    <AvatarFallback className="bg-muted font-bold">
                                        <FontAwesomeIcon icon={faUserTie} />
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col overflow-hidden">
                                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Responsabil Extern</span>
                                    <span className="text-sm font-semibold text-foreground truncate">
                                        {fullResponsabilName || "Nealocat"}
                                    </span>
                                </div>
                            </div>
                            <div className="absolute top-0 p-2 right-0">
                                <Button variant="ghost" disabled={!c} onClick={() => handleEditClick()} size="iconLg" className="text-muted-foreground hover:text-low">
                                    <FontAwesomeIcon icon={faPenToSquare} className="text-lg " />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* 2. DETAILS CARD */}
                    <Card className="border-border shadow-sm">
                        <CardHeader className="py-3 px-5">
                            <CardTitle className="text-base font-bold uppercase text-muted-foreground flex items-center gap-2">
                                <FontAwesomeIcon icon={faFileContract} /> Detalii Companie
                            </CardTitle>
                        </CardHeader>
                        <Separator />
                        <CardContent className="p-5 flex flex-col gap-4">

                            {/* -- TOP CONTACT INFO -- */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-3 text-base">
                                    <div className="w-5 flex justify-center text-muted-foreground">
                                        <FontAwesomeIcon icon={faFlag} />
                                    </div>
                                    <span className="font-bold text-foreground">{countryName}</span>
                                </div>

                                <div className="flex items-center gap-3 text-base">
                                    <div className="w-5 flex justify-center text-muted-foreground">
                                        <FontAwesomeIcon icon={faGlobe} />
                                    </div>
                                    {c?.website ? (
                                        <a href={c?.website.startsWith('http') ? c.website : `https://${c.website}`} target="_blank" rel="noreferrer" className="text-foreground hover:text-primary hover:underline truncate">
                                            {c.website}
                                        </a>
                                    ) : <span>—</span>}
                                </div>

                                <div className="flex items-start gap-3 text-base">
                                    <div className="w-5 flex justify-center text-muted-foreground mt-0.5">
                                        <FontAwesomeIcon icon={faLocationDot} />
                                    </div>
                                    <span className="text-foreground leading-snug">{fullAddress}</span>
                                </div>
                            </div>

                            <Separator className="opacity-40" />

                            {/* -- BUSINESS INFO -- */}
                            <div className="grid grid-cols-2 gap-2">
                                <div className="flex flex-col">
                                    <span className="text-sm font-bold text-muted-foreground uppercase mb-0.5">Domeniu</span>
                                    <span className="text-base font-medium text-foreground">{safeText(c?.domeniu_unitate_afaceri)}</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-sm font-bold text-muted-foreground uppercase mb-0.5">Formă Juridică</span>
                                    <span className="text-base font-medium text-foreground">{safeText(c?.forma_juridica)}</span>
                                </div>
                            </div>

                            <Separator className="opacity-40" />

                            {/* -- BADGES -- */}
                            <div className="flex flex-wrap gap-2">
                                <Badge variant="outline" className="text-sm font-medium px-2 py-0.5 text-foreground border-border">
                                    {safeText(c?.nivel_strategic)}
                                </Badge>
                                <Badge variant="outline" className="text-sm font-medium px-2 py-0.5 text-foreground border-border">
                                    {safeText(c?.status_relatie)}
                                </Badge>
                            </div>

                            {/* -- RISK & COMPLIANCE -- */}
                            <div className="space-y-3 pt-1">
                                <div className="flex items-center justify-between p-2 rounded bg-muted/40 border">
                                    <span className="text-sm font-medium text-foreground">Nivel Risc</span>
                                    <span className={`text-sm px-2 py-0.5 rounded border ${getRiskColor(c?.nivel_risc)} font-bold`}>
                                        {c?.nivel_risc}
                                    </span>
                                </div>

                                <div className="space-y-1">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-foreground">Scor Conformitate</span>
                                        <span className="font-bold">{c?.scor_conformitate}/100</span>
                                    </div>
                                    <Progress value={c?.scor_conformitate} className="h-1.5" />
                                </div>

                                <div className="flex justify-end pt-1">
                                    {c?.nda_semnat ? (
                                        <span className="text-low text-sm font-semibold flex items-center gap-1">
                                            <FontAwesomeIcon icon={faCheckCircle} /> NDA Semnat
                                        </span>
                                    ) : (
                                        <span className="text-muted-foreground text-sm font-semibold flex items-center gap-1">
                                            <FontAwesomeIcon icon={faTimesCircle} /> NDA Nesemnat
                                        </span>
                                    )}
                                </div>
                            </div>

                        </CardContent>
                    </Card>

                    {/* 3. HISTORY / UPDATES CARD */}
                    <Card className="border-border shadow-sm shrink-0">
                        <CardHeader className="py-3 px-5">
                            <CardTitle className="text-base font-bold uppercase text-muted-foreground flex items-center gap-2">
                                <FontAwesomeIcon icon={faHistory} /> Actualizări
                            </CardTitle>
                        </CardHeader>
                        <Separator />
                        <CardContent className="p-5 space-y-5">

                            {/* UPDATED BY */}
                            <div className="flex gap-3 items-center">
                                <Avatar className="h-9 w-9 border">
                                    <AvatarImage src={c?.updated_by_photo_url ? photoApi + "/" + c.updated_by_photo_url : null} />
                                    <AvatarFallback className="bg-muted text-base font-medium"><FontAwesomeIcon icon={faUser} /></AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col">
                                    <span className="text-sm font-bold text-muted-foreground uppercase">Ultima actualizare</span>
                                    <div className="text-base">
                                        <span className="font-semibold text-foreground">{c?.updated_by_name || "Sistem"}</span>
                                        <div className="text-muted-foreground text-sm flex items-center gap-2 mt-0.5">
                                            <FontAwesomeIcon icon={faCalendarDays} className="w-3" />
                                            {formatDate(c?.updated_at)}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <Separator className="opacity-40" />

                            {/* CREATED BY */}
                            <div className="flex gap-3 items-center opacity-80">
                                <Avatar className="h-7 w-7 border">
                                    <AvatarImage src={c?.created_by_photo_url ? photoApi + "/" + c.created_by_photo_url : null} />
                                    <AvatarFallback className="bg-muted text-base font-medium"><FontAwesomeIcon icon={faUser} /></AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col">
                                    <span className="text-sm font-bold text-muted-foreground uppercase">Creat inițial</span>
                                    <div className="text-base">
                                        <span className="font-medium text-foreground">{c?.created_by_name || "Sistem"}</span>
                                        <span className="text-muted-foreground text-sm ml-2">
                                            {formatDate(c?.created_at)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                        </CardContent>
                    </Card>

                </aside>

                {/* --- RIGHT MAIN AREA (4/5) --- */}
                <main className="w-full lg:col-span-4 h-full overflow-hidden">
                    <Tabs defaultValue="activitati" className="h-full w-full flex flex-col gap-4">
                        <TabsList className="bg-card px-6 py-4 rounded-lg justify-start h-auto  w-full">
                            <div className="border-b  w-full flex gap-6">
                                {["activitati", "contacte", "santiere", "filiale", "fișiere"].map((tab) => (
                                    <TabsTrigger
                                        key={tab}
                                        value={tab}
                                        className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 !shadow-none data-[state=active]:border-b-primary  data-[state=inactive]:border-t-2 border-t-transparent  data-[state=active]:text-foreground rounded-none pb-3 px-1 text-base font-bold text-muted-foreground capitalize transition-all"
                                    >
                                        {tab}
                                    </TabsTrigger>
                                ))}
                            </div>
                        </TabsList>

                        <div className="flex-1 bg-card overflow-y-auto  h-full  rounded-lg">
                            <TabsContent value="activitati" className="h-full m-0 w-full">

                            </TabsContent>

                            <TabsContent value="contacte" className="h-full m-0 relative  w-full">
                                <ContactsMainCompany companyId={c?.id || null} companyLimba={c?.tara || null} />
                            </TabsContent>

                            <TabsContent value="santiere" className="h-full m-0 w-full">

                            </TabsContent>

                            <TabsContent value="filiale" className="h-full m-0 w-full">

                            </TabsContent>

                            {/* TAB: FISIERE */}
                            <TabsContent value="files" className="h-full m-0 w-full">

                            </TabsContent>
                        </div>
                    </Tabs>
                </main>

            </div>
            <CompaniesAddDialog open={open} setOpen={setOpen} draft={draft} setDraft={setDraft} onSubmitCompany={submitEdit} />
        </div>
    );
}