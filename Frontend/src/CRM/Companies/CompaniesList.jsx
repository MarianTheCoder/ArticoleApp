import React, { useState, useEffect, useContext } from "react";
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
    faBuilding
} from "@fortawesome/free-solid-svg-icons";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// --- IMPORTURI NOI NECESARE ---
import CompaniesAddDialog from "./CompaniesAddDialog";
import { useDeleteCompany, useEditCompany } from "@/CRM/hooks/useCompanies";
import { useLoading } from "@/context/LoadingContext";
import { AuthContext } from "@/context/TokenContext";
import DeleteConfirmationDialog from "@/components/ui/delete-dialog";
import { useNavigate } from "react-router-dom";

export default function CompaniesList({
    companies = [],
}) {
    // Contexts
    const { show, hide } = useLoading();
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();

    // --- STATE PENTRU EDITARE ---
    const [editOpen, setEditOpen] = useState(false);
    // --- STATE PENTRU ȘTERGERE ---
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [selectedCompany, setSelectedCompany] = useState(null);

    // Hook-ul de editare (React Query)
    const { mutateAsync: editCompany } = useEditCompany();
    const { mutateAsync: deleteCompany } = useDeleteCompany();

    // State formular (Draft)
    const [draft, setDraft] = useState({
        id: null, // ID-ul e critic pentru editare
        nume_companie: "", grup_companie: "", domeniu_unitate_afaceri: "", forma_juridica: "", website: "",
        tara: "RO", regiune: "", oras: "", adresa: "", cod_postal: "",
        nivel_strategic: "Tinta", status_relatie: "Prospect", nivel_risc: "Mediu",
        nda_semnat: false, scor_conformitate: 0, note: "",
        logoFile: null, logoPreview: "",
    });

    // Cleanup pentru preview logo
    useEffect(() => {
        return () => { if (draft.logoPreview && draft.logoFile) URL.revokeObjectURL(draft.logoPreview); };
    }, [draft.logoFile]);

    // --- 1. POPULARE FORMULAR (Când dai click pe Editează) ---
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
            nda_semnat: c.nda_semnat === 1 || c.nda_semnat === true,
            scor_conformitate: c.scor_conformitate || 0,
            note: c.note || "",
            logoFile: null, // Nu avem fișier nou selectat încă
            // Construim URL-ul pentru logo-ul existent
            logoPreview: c.logo_url ? photoApi + c.logo_url : ""
        });
        setEditOpen(true);
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
            setEditOpen(false);
            // Lista se actualizează automat datorită React Query (invalidateQueries)
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
        if (!id) {
            toast.error("ID-ul companiei nu este valid.");
            return;
        }
        try {
            show();
            await deleteCompany({ id, code });
            toast.success(`Compania "${selectedCompany?.nume_companie}" a fost ștearsă cu succes!`);
            setDeleteOpen(false);
            setSelectedCompany(null);
        } catch (error) {
            const msg = error?.response?.data?.message || "A apărut o eroare la ștergere.";
            toast.error(msg);
            return;
        } finally {
            hide();
        }
    }

    // --- HELPERE UI ---
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
        if (r.includes("rid")) return "bg-high"; // sau bg-high daca ai clase custom
        if (r.includes("med")) return "bg-medium"; // sau bg-medium
        return "bg-low"; // sau bg-low
    };

    return (
        <div className="w-full h-full mt-4 overflow-y-auto px-2 pb-10 scrollbar-hide">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 min-[1800px]:grid-cols-6 gap-4">
                {companies.map((raw) => {
                    const c = raw?.company ?? raw;
                    const key = c?.id ?? Math.random();

                    const name = safeText(c?.nume_companie) || "Companie";
                    const logoUrl = c?.logo_url ? photoApi + c.logo_url : null;
                    const grup = safeText(c?.grup_companie);
                    const locatie = `${c?.oras ? safeText(c.oras) + ", " : ""}${c?.regiune ? safeText(c.regiune) + ", " : ""}${c?.tara || ""}`;
                    const updatedAt = formatDate(c?.updated_at);
                    const ownerName = safeText(c?.owner_name || c?.utilizator_responsabil_name);
                    const ownerPhoto = c?.owner_photo_url || c?.utilizator_responsabil_photo_url;
                    const ownerPhotoUrl = ownerPhoto ? photoApi + ownerPhoto : null;

                    return (
                        <Card
                            key={key}
                            className="group flex flex-col justify-between shadow-sm border border-border transition-all duration-200 bg-card"
                        >
                            <CardContent className="p-4 pb-3 flex-1">
                                <div className="flex gap-4 mb-4">
                                    <div className="h-12 w-12 shrink-0 rounded-lg border border-border bg-white flex items-center justify-center overflow-hidden">
                                        {logoUrl ? (
                                            <img src={logoUrl} alt={name} className="h-full w-full object-contain" />
                                        ) : (
                                            <FontAwesomeIcon icon={faBuilding} className="text-xl text-muted-foreground" />
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
                                                    {/* AICI LEGAM HANDLER-UL DE EDITARE */}
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
                                    <div className="flex items-center justify-between text-base">
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <FontAwesomeIcon icon={faLayerGroup} className="w-3.5 text-sm opacity-70" />
                                            <span>Grup</span>
                                        </div>
                                        <span className="font-medium text-foreground truncate max-w-[140px]" title={grup}>{grup || "—"}</span>
                                    </div>

                                    <div className="flex items-center justify-between text-base">
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <FontAwesomeIcon icon={faMapMarkerAlt} className="w-3.5 text-sm opacity-70" />
                                            <span>Locație</span>
                                        </div>
                                        <span className="font-medium text-foreground truncate max-w-[140px]">
                                            {locatie || "—"}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between text-base">
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <FontAwesomeIcon icon={faClock} className="w-3.5 text-sm opacity-70" />
                                            <span>Actualizat</span>
                                        </div>
                                        <span className="font-mono text-sm text-muted-foreground truncate">{updatedAt}</span>
                                    </div>
                                </div>
                                <div className="mt-4 flex items-center border-t gap-3 pt-3">
                                    <Avatar className="h-8 w-8 border border-border">
                                        <AvatarImage src={ownerPhotoUrl} />
                                        <AvatarFallback className="text-base bg-muted"><FontAwesomeIcon icon={faUserTie} /></AvatarFallback>
                                    </Avatar>
                                    <span className="text-base font-medium text-foreground/90 truncate">
                                        {ownerName || "Nealocat"}
                                    </span>
                                </div>
                            </CardContent>

                            <CardFooter className="p-3 bg-muted/15 border-t border-border grid grid-cols-[1fr_auto_auto] gap-2">
                                <Button size="sm" variant="outline" className="h-10 text-base font-medium border-border bg-background hover:bg-primary hover:text-primary-foreground hover:border-primary w-full transition-colors" onClick={() => navigate(`View/${key}`)}>
                                    Detalii
                                </Button>
                                <Button size="sm" variant="ghost" className="h-10 w-10 px-0 text-muted-foreground hover:text-foreground" onClick={() => { }} title="Contacte">
                                    <FontAwesomeIcon icon={faUsers} className="text-base" />
                                </Button>
                                <Button size="sm" variant="ghost" className="h-10 w-10 px-0 text-muted-foreground hover:text-foreground" onClick={() => { }} title="Șantiere">
                                    <FontAwesomeIcon icon={faHardHat} className="text-base" />
                                </Button>
                            </CardFooter>
                        </Card>
                    );
                })}
            </div>

            {/* --- DIALOGUL DE EDITARE (ASCUNS, în afara loop-ului) --- */}
            <CompaniesAddDialog
                open={editOpen}
                setOpen={setEditOpen}
                draft={draft}
                setDraft={setDraft}
                onSubmitCompany={submitEdit}
                resetDraft={() => setEditOpen(false)}
                // Trimitem div gol ca să nu afișeze butonul de trigger
                buttonStyle={<div className="hidden"></div>}
                reset={false}
                title="Editează Companie"
            />
            <DeleteConfirmationDialog
                open={deleteOpen}
                setOpen={setDeleteOpen}
                title="Șterge Companie"
                description={`Ești sigur că vrei să ștergi compania "${selectedCompany?.nume_companie}"? Această acțiune nu poate fi anulată.`}

                // Activezi codul
                useCode={true}
                onSubmit={handleConfirmDelete}
                onCancel={() => console.log("Userul a anulat")}
            />

            {companies.length === 0 && (
                <div className="flex flex-col items-center justify-center h-48 text-center opacity-70 mt-10">
                    <p className="text-base text-muted-foreground">Nu există date.</p>
                </div>
            )}
        </div>
    );
}