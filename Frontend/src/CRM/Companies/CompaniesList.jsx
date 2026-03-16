import React, { useState, useEffect, useContext, useRef, useLayoutEffect } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import photoApi from "@/api/photoAPI";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { toast } from "sonner";
import {
    faEllipsis,
    faPenToSquare,
    faTrash,
    faMapMarkerAlt,
    faLayerGroup,
    faUserTie,
    faUsers,
    faHardHat,
    faClock,
    faBuilding,
    faCity,
    faEnvelope,
    faPhone
} from "@fortawesome/free-solid-svg-icons";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import CompaniesAddDialog from "./CompaniesAddDialog";
import { useDeleteCompany, useEditCompany } from "@/hooks/useCompanies";
import { useLoading } from "@/context/LoadingContext";
import { AuthContext } from "@/context/TokenContext";
import { useNavigate } from "react-router-dom";
import DeleteDialog from "@/components/ui/delete-dialog";

export default function CompaniesList({
    companies = [],
}) {
    const { show, hide } = useLoading();
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();

    // --- 1. SCROLL PRESERVATION LOGIC ---
    const containerRef = useRef(null);
    const scrollPosRef = useRef(0);

    // Salvăm scroll-ul manual la evenimentul de scroll
    const handleScroll = (e) => {
        if (e.target) {
            scrollPosRef.current = e.target.scrollTop;
        }
    };

    // Restaurăm scroll-ul imediat după randare (înainte de paint)
    useLayoutEffect(() => {
        if (containerRef.current) {
            containerRef.current.scrollTop = scrollPosRef.current;
        }
    }, [companies]); // Se activează când lista se schimbă (ex: după editare)

    // --- STATE ---
    const [editOpen, setEditOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [selectedCompany, setSelectedCompany] = useState(null);

    const { mutateAsync: editCompany } = useEditCompany();
    const { mutateAsync: deleteCompany } = useDeleteCompany();

    const [draft, setDraft] = useState({
        id: null,
        nume_companie: "", grup_companie: "", domeniu_unitate_afaceri: "", forma_juridica: "", website: "",
        tara: "RO", regiune: "", oras: "", adresa: "", cod_postal: "", email: "", telefon: "",
        nivel_strategic: "Tinta", status_relatie: "Prospect", nivel_risc: "Mediu",
        nda_semnat: false, scor_conformitate: 0, note: "",
        logoFile: null, logoPreview: "",
    });

    useEffect(() => {
        return () => { if (draft.logoPreview && draft.logoFile) URL.revokeObjectURL(draft.logoPreview); };
    }, [draft.logoFile]);

    const handleEditClick = (c) => {
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
            email: c.email || "",
            telefon: c.telefon || "",
            nda_semnat: c.nda_semnat === 1 || c.nda_semnat === true,
            scor_conformitate: c.scor_conformitate || 0,
            note: c.note || "",
            logoFile: null,
            logoPreview: c.logo_url ? photoApi + "/" + c.logo_url : ""
        });
        setEditOpen(true);
    };

    const submitEdit = async () => {
        const fd = new FormData();
        if (draft.logoFile) fd.append("logo", draft.logoFile);
        fd.append("nume_companie", draft.nume_companie.trim());
        // ... restul append-urilor ...
        fd.append("grup_companie", draft.grup_companie || "");
        fd.append("domeniu_unitate_afaceri", draft.domeniu_unitate_afaceri || "");
        fd.append("forma_juridica", draft.forma_juridica || "");
        fd.append("website", draft.website || "");
        fd.append("tara", draft.tara || "RO");
        fd.append("regiune", draft.regiune || "");
        fd.append("oras", draft.oras || "");
        fd.append("adresa", draft.adresa || "");
        fd.append("email", draft.email || "");
        fd.append("telefon", draft.telefon || "");
        fd.append("cod_postal", draft.cod_postal || "");
        fd.append("nivel_strategic", draft.nivel_strategic || "Tinta");
        fd.append("status_relatie", draft.status_relatie || "Prospect");
        fd.append("nivel_risc", draft.nivel_risc || "Mediu");
        fd.append("nda_semnat", draft.nda_semnat ? "1" : "0");
        fd.append("scor_conformitate", String(Number(draft.scor_conformitate || 0)));
        fd.append("note", draft.note || "");
        fd.append("updated_by_user_id", user.id);

        show();
        try {
            await editCompany({ id: draft.id, formData: fd });
            toast.success("Compania a fost actualizată!");
            setEditOpen(false);

            // --- FIX FOCUS ---
            // Scoatem focusul de pe elementul activ ca să nu "sară" browserul după el
            if (document.activeElement) {
                document.activeElement.blur();
            }

        } catch (error) {
            const msg = error?.response?.data?.message || "A apărut o eroare la salvare.";
            toast.error(msg);
        } finally {
            hide();
        }
    };

    const handleDeleteClick = (company) => {
        setSelectedCompany(company);
        setDeleteOpen(true);
    };

    const handleConfirmDelete = async (code) => {
        const id = selectedCompany?.id;
        if (!id) return;
        try {
            show();
            await deleteCompany({ id, code });
            toast.success(`Compania ștearsă cu succes!`);
            setDeleteOpen(false);
            setSelectedCompany(null);
        } catch (error) {
            const msg = error?.response?.data?.message || "A apărut o eroare la ștergere.";
            toast.error(msg);
        } finally {
            hide();
        }
    }

    const safeText = (v) => (v && String(v).trim() ? String(v).trim() : "");
    const formatDate = (dateString) => {
        if (!dateString) return "—";
        const d = new Date(dateString);
        if (Number.isNaN(d.getTime())) return "—";
        const roDate = new Date(d.toLocaleString("en-US", { timeZone: "Europe/Bucharest" }));
        return new Intl.DateTimeFormat("ro-RO", {
            day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit"
        }).format(roDate);
    };
    const getRiskColor = (nivelRisc) => {
        const r = String(nivelRisc || "").toLowerCase();
        if (r.includes("rid")) return "bg-high";
        if (r.includes("med")) return "bg-medium";
        return "bg-low";
    };

    return (
        <div
            ref={containerRef}       // 1. Ref container
            onScroll={handleScroll}  // 2. Ascultă scroll
            className="w-full overflow-y-auto h-full relative  rounded-lg"
        >
            <div className="grid grid-cols-1 w-full sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 min-[1800px]:grid-cols-6 gap-4">
                {companies.map((raw) => {
                    const c = raw?.company ?? raw;
                    const key = c?.id ?? Math.random();

                    const name = safeText(c?.nume_companie) || "Companie";
                    const logoUrl = c?.logo_url ? photoApi + "/" + c.logo_url : null;
                    const grup = safeText(c?.grup_companie);
                    const locatie = `${c?.oras ? safeText(c.oras) + ", " : ""}${c?.regiune ? safeText(c.regiune) + ", " : ""}${c?.tara || ""}`;
                    const updatedAt = formatDate(c?.updated_at);
                    const ownerName = safeText(c?.responsabil_name && c?.responsabil_prenume ? `${c.responsabil_prenume} ${c.responsabil_name}` : "");
                    const ownerPhotoUrl = c?.responsabil_logo_url ? photoApi + "/" + c.responsabil_logo_url : null;

                    return (
                        <Card key={key} className="group flex flex-col justify-between shadow-sm border-4 border-border transition-all duration-200 bg-card">
                            <CardContent className="p-4 pb-3 flex-1">
                                <div className="flex gap-4 mb-4">
                                    <div className="h-12 w-12 shrink-0 rounded-lg border border-border bg-white flex items-center justify-center overflow-hidden">
                                        {logoUrl ? (
                                            <img src={logoUrl} alt={name} className="h-full w-full object-contain" />
                                        ) : (
                                            <FontAwesomeIcon icon={faCity} className="text-xl text-muted-foreground" />
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                                        <div className="flex justify-between items-start">
                                            <h3 className="font-bold text-base text-foreground truncate pr-1 leading-tight" title={name}>
                                                {name}
                                            </h3>

                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7 -mt-1 -mr-2 text-muted-foreground hover:text-foreground">
                                                        <FontAwesomeIcon icon={faEllipsis} className="text-base" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => handleEditClick(c)}>
                                                        <FontAwesomeIcon icon={faPenToSquare} className="mr-2 h-4 w-4" />
                                                        Editează
                                                    </DropdownMenuItem>

                                                    <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDeleteClick(c)}>
                                                        <FontAwesomeIcon icon={faTrash} className="mr-2 h-4 w-4" />
                                                        Șterge
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>

                                        <div className="flex items-center gap-2 mt-1">
                                            <div className={`h-2 w-2 rounded-full ${getRiskColor(c?.nivel_risc)}`} title={`Risc: ${c?.nivel_risc}`} />
                                            <span className="text-sm font-medium text-muted-foreground truncate">
                                                {c?.nivel_risc || "Nivel Risc: —"}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2 pt-1">
                                    {/* ... restul câmpurilor (Grup, Locație, Email, Telefon, Actualizat) ... */}
                                    <div className="flex items-center justify-between gap-2 text-base">
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <FontAwesomeIcon icon={faLayerGroup} className="w-3.5 text-sm opacity-70" />
                                            <span>Grup</span>
                                        </div>
                                        <span className="font-medium text-foreground truncate" title={grup}>{grup || "—"}</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-2 text-base">
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <FontAwesomeIcon icon={faMapMarkerAlt} className="w-3.5 text-sm opacity-70" />
                                            <span>Locație</span>
                                        </div>
                                        <span className="font-medium text-foreground truncate" title={locatie}>{locatie || "—"}</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-2 text-base">
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <FontAwesomeIcon icon={faEnvelope} className="w-3.5 text-sm opacity-70" />
                                            <span>Email</span>
                                        </div>
                                        <span className="font-medium text-foreground truncate" title={c?.email}>{c?.email || "—"}</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-2 text-base">
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <FontAwesomeIcon icon={faPhone} className="w-3.5 text-sm opacity-70" />
                                            <span>Telefon</span>
                                        </div>
                                        <span className="font-medium text-foreground truncate" title={c?.telefon}>{c?.telefon || "—"}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-base">
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <FontAwesomeIcon icon={faClock} className="w-3.5 text-sm opacity-70" />
                                            <span>Actualizat</span>
                                        </div>
                                        <span className="text-sm text-muted-foreground truncate">{updatedAt}</span>
                                    </div>
                                </div>

                                <div className="mt-4 flex items-center border-t gap-3 pt-3">
                                    <Avatar className="h-10 w-10 rounded-lg border border-border">
                                        <AvatarImage src={ownerPhotoUrl} />
                                        <AvatarFallback className="text-base bg-muted rounded-lg"><FontAwesomeIcon icon={faUserTie} /></AvatarFallback>
                                    </Avatar>
                                    <span className="text-base font-medium text-foreground/90 truncate">
                                        {ownerName || "Nealocat"}
                                    </span>
                                </div>
                            </CardContent>

                            <CardFooter className="p-3 border-t border-border grid grid-cols-[1fr_auto_auto_auto] gap-2">
                                <Button size="sm" variant="outline" className="h-10 text-base font-medium border-border bg-background hover:bg-primary hover:text-primary-foreground hover:border-primary w-full transition-colors" onClick={() => navigate(`View/${key}`)}>
                                    Detalii
                                </Button>
                                {/* ... butoane ghost Contacte/Santiere/Filiale ... */}
                                <Button size="sm" variant="ghost" className="h-10 w-10 px-0 text-muted-foreground hover:text-foreground" onClick={() => { }} title="Contacte">
                                    <FontAwesomeIcon icon={faUsers} className="text-base" />
                                </Button>
                                <Button size="sm" variant="ghost" className="h-10 w-10 px-0 text-muted-foreground hover:text-foreground" onClick={() => { }} title="Șantiere">
                                    <FontAwesomeIcon icon={faHardHat} className="text-base" />
                                </Button>
                                <Button size="sm" variant="ghost" className="h-10 w-10 px-0 text-muted-foreground hover:text-foreground" onClick={() => { }} title="Filiale">
                                    <FontAwesomeIcon icon={faBuilding} className="text-base" />
                                </Button>
                            </CardFooter>
                        </Card>
                    );
                })}
            </div>

            <CompaniesAddDialog
                open={editOpen}
                setOpen={setEditOpen}
                draft={draft}
                setDraft={setDraft}
                onSubmitCompany={submitEdit}
                resetDraft={() => setEditOpen(false)}
                buttonStyle={<div className="hidden"></div>}
                reset={false}
                title="Editează Companie"
            />
            <DeleteDialog
                open={deleteOpen}
                setOpen={setDeleteOpen}
                title="Șterge Compania"
                description={`Ești sigur că vrei să ștergi compania "${selectedCompany?.nume_companie}"?`}
                useCode={true}
                onSubmit={handleConfirmDelete}
            />

            {companies.length === 0 && (
                <div className="flex flex-col items-center justify-center h-48 text-center opacity-70 mt-10">
                    <p className="text-base text-muted-foreground">Nu există date.</p>
                </div>
            )}
        </div>
    );
}