import React, { useContext, useEffect, useState } from 'react';
import { useAddContact, useContactsByCompany } from "@/CRM/hooks/useContacts";
import { Button } from "@/components/ui/button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faMagnifyingGlass,
    faPlus,
    faColumns
} from "@fortawesome/free-solid-svg-icons";
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import ContactsAddDialog from './ContactsAddDialog';
import { useLoading } from '@/context/LoadingContext';
import SpinnerElement from '@/MainElements/SpinnerElement';
import { AuthContext } from '@/context/TokenContext';
import { toast } from 'sonner';
import ContactsListByCompany from './ContactsListByCompany';

import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function ContactsMainCompany({ companyLimba, companyId }) {
    const { user } = useContext(AuthContext);
    const { hide, show, loading } = useLoading();
    const [open, setOpen] = useState(false);

    // --- 1. STATE PENTRU VIZIBILITATE COLOANE (ALL FIELDS) ---
    const [visibleColumns, setVisibleColumns] = useState({
        // DEFAULT VISIBLE
        nume: true,
        functie: true,
        email: true,
        telefon: true,
        santier: true,
        filiala: true,
        limba: true,
        activ: true, // Usually good to see status

        // DEFAULT HIDDEN
        categorie_rol: false,
        linkedin: false,
        decizie: false, // Putere decizie
        influenta: false, // Nivel influenta
        canal: false, // Canal preferat
        note: false,
        created: false,
        updated: false
    });

    const [draft, setDraft] = useState({
        prenume: "",
        nume: "",
        functie: "",
        categorie_rol: "",
        email: "",
        telefon: "",
        linkedin_url: "",
        putere_decizie: 1,
        nivel_influenta: 1,
        canal_preferat: "Email",
        note: "",
        logoFile: null,
        logoPreview: "",
    });

    const [searchName, setSearchName] = useState("");
    const [searchNameDebounced, setSearchNameDebounced] = useState("");

    const { data, isFetching } = useContactsByCompany(companyId, searchNameDebounced);
    const { mutateAsync: addContact } = useAddContact();
    const contacts = data?.contacts || [];

    useEffect(() => {
        const handler = setTimeout(() => setSearchNameDebounced(searchName), 500);
        return () => clearTimeout(handler);
    }, [searchName]);

    useEffect(() => {
        return () => {
            if (draft.logoPreview) {
                URL.revokeObjectURL(draft.logoPreview);
            }
        };
    }, []);

    const resetDraft = () => {
        if (draft.logoPreview) URL.revokeObjectURL(draft.logoPreview);
        setDraft({
            prenume: "",
            nume: "",
            functie: "",
            categorie_rol: "",
            email: "",
            telefon: "",
            linkedin_url: "",
            putere_decizie: 1,
            nivel_influenta: 1,
            canal_preferat: "Email",
            note: "",
            logoFile: null,
            logoPreview: "",
        });
    }

    const submitContact = async () => {
        const fd = new FormData();
        if (!companyId) {
            toast.error("ID-ul companiei este necesar pentru a adăuga un contact.");
            return;
        }
        if (draft.logoFile) fd.append("logo", draft.logoFile);
        fd.append("prenume", draft.prenume.trim());
        fd.append("nume", draft.nume.trim());
        fd.append("functie", draft.functie.trim());
        fd.append("categorie_rol", draft.categorie_rol.trim());
        fd.append("email", draft.email.trim());
        fd.append("telefon", draft.telefon.trim());
        fd.append("linkedin_url", draft.linkedin_url.trim());
        fd.append("putere_decizie", draft.putere_decizie);
        fd.append("nivel_influenta", draft.nivel_influenta);
        fd.append("canal_preferat", draft.canal_preferat);
        fd.append("note", draft.note.trim());
        fd.append("limba", companyLimba);
        fd.append("companie_id", companyId);
        fd.append("created_by_user_id", user.id);
        fd.append("updated_by_user_id", user.id);

        show();
        try {
            await addContact({ companyId, formData: fd });
            toast.success("Contactul a fost adăugat cu succes!");
            setOpen(false);
            resetDraft();
        } catch (error) {
            const msg = error?.response?.data?.message || "A apărut o eroare la salvare.";
            toast.error(msg);
        } finally {
            hide();
        }
    };

    // Helper to toggle state
    const toggleCol = (key, val) => {
        setVisibleColumns(prev => ({ ...prev, [key]: val }));
    };

    return (
        <div className="h-full w-full relative flex flex-col items-center overflow-hidden">
            <div className="w-full bg-card grid grid-cols-[auto_1fr] rounded-lg px-8 p-6 shrink-0 z-10">
                <ContactsAddDialog
                    companyId={companyId}
                    open={open}
                    setOpen={setOpen}
                    buttonStyle={
                        <Button variant="default" size="lg" className="gap-2">
                            <FontAwesomeIcon icon={faPlus} className="text-base" />
                            <p>Adaugă un contact</p>
                        </Button>
                    }
                    onSubmitContact={submitContact}
                    draft={draft}
                    setDraft={setDraft}
                    resetDraft={resetDraft}
                    reset={true}
                />

                <div className="relative justify-end w-full gap-2 xxl:gap-4 flex items-center">
                    {/* --- TOGGLE COLOANE --- */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="gap-2">
                                <FontAwesomeIcon className='text-foreground' icon={faColumns} />
                                <span className="hidden text-foreground sm:inline">Coloane</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 max-h-[80vh] overflow-y-auto">
                            <DropdownMenuLabel>Vizibilitate coloane</DropdownMenuLabel>
                            <DropdownMenuSeparator />

                            {/* CORE */}
                            <DropdownMenuCheckboxItem
                                checked={visibleColumns.nume}
                                onCheckedChange={(c) => toggleCol('nume', c)}
                                onSelect={(e) => e.preventDefault()}
                            >
                                Nume & Foto
                            </DropdownMenuCheckboxItem>
                            <DropdownMenuCheckboxItem
                                checked={visibleColumns.functie}
                                onCheckedChange={(c) => toggleCol('functie', c)}
                                onSelect={(e) => e.preventDefault()}
                            >
                                Funcție
                            </DropdownMenuCheckboxItem>
                            <DropdownMenuCheckboxItem
                                checked={visibleColumns.email}
                                onCheckedChange={(c) => toggleCol('email', c)}
                                onSelect={(e) => e.preventDefault()}
                            >
                                Email
                            </DropdownMenuCheckboxItem>
                            <DropdownMenuCheckboxItem
                                checked={visibleColumns.telefon}
                                onCheckedChange={(c) => toggleCol('telefon', c)}
                                onSelect={(e) => e.preventDefault()}
                            >
                                Telefon
                            </DropdownMenuCheckboxItem>

                            {/* LOCATIONS */}
                            <DropdownMenuCheckboxItem
                                checked={visibleColumns.santier}
                                onCheckedChange={(c) => toggleCol('santier', c)}
                                onSelect={(e) => e.preventDefault()}
                            >
                                Șantier
                            </DropdownMenuCheckboxItem>
                            <DropdownMenuCheckboxItem
                                checked={visibleColumns.filiala}
                                onCheckedChange={(c) => toggleCol('filiala', c)}
                                onSelect={(e) => e.preventDefault()}
                            >
                                Filială
                            </DropdownMenuCheckboxItem>

                            <DropdownMenuSeparator />

                            {/* DETAILS */}
                            <DropdownMenuCheckboxItem
                                checked={visibleColumns.activ}
                                onCheckedChange={(c) => toggleCol('activ', c)}
                                onSelect={(e) => e.preventDefault()}
                            >
                                Status (Activ)
                            </DropdownMenuCheckboxItem>
                            <DropdownMenuCheckboxItem
                                checked={visibleColumns.categorie_rol}
                                onCheckedChange={(c) => toggleCol('categorie_rol', c)}
                                onSelect={(e) => e.preventDefault()}
                            >
                                Categorie Rol
                            </DropdownMenuCheckboxItem>
                            <DropdownMenuCheckboxItem
                                checked={visibleColumns.linkedin}
                                onCheckedChange={(c) => toggleCol('linkedin', c)}
                                onSelect={(e) => e.preventDefault()}
                            >
                                LinkedIn
                            </DropdownMenuCheckboxItem>
                            <DropdownMenuCheckboxItem
                                checked={visibleColumns.canal}
                                onCheckedChange={(c) => toggleCol('canal', c)}
                                onSelect={(e) => e.preventDefault()}
                            >
                                Canal Preferat
                            </DropdownMenuCheckboxItem>
                            <DropdownMenuCheckboxItem
                                checked={visibleColumns.limba}
                                onCheckedChange={(c) => toggleCol('limba', c)}
                                onSelect={(e) => e.preventDefault()}
                            >
                                Limbă
                            </DropdownMenuCheckboxItem>

                            {/* SCORES */}
                            <DropdownMenuCheckboxItem
                                checked={visibleColumns.decizie}
                                onCheckedChange={(c) => toggleCol('decizie', c)}
                                onSelect={(e) => e.preventDefault()}
                            >
                                Putere Decizie
                            </DropdownMenuCheckboxItem>
                            <DropdownMenuCheckboxItem
                                checked={visibleColumns.influenta}
                                onCheckedChange={(c) => toggleCol('influenta', c)}
                                onSelect={(e) => e.preventDefault()}
                            >
                                Nivel Influență
                            </DropdownMenuCheckboxItem>

                            <DropdownMenuSeparator />

                            {/* META */}
                            <DropdownMenuCheckboxItem
                                checked={visibleColumns.note}
                                onCheckedChange={(c) => toggleCol('note', c)}
                                onSelect={(e) => e.preventDefault()}
                            >
                                Notițe
                            </DropdownMenuCheckboxItem>
                            <DropdownMenuCheckboxItem
                                checked={visibleColumns.created}
                                onCheckedChange={(c) => toggleCol('created', c)}
                                onSelect={(e) => e.preventDefault()}
                            >
                                Creat la
                            </DropdownMenuCheckboxItem>
                            <DropdownMenuCheckboxItem
                                checked={visibleColumns.updated}
                                onCheckedChange={(c) => toggleCol('updated', c)}
                                onSelect={(e) => e.preventDefault()}
                            >
                                Actualizat la
                            </DropdownMenuCheckboxItem>

                        </DropdownMenuContent>
                    </DropdownMenu>
                    <div className="max-w-md relative w-full">
                        <FontAwesomeIcon
                            icon={faMagnifyingGlass}
                            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                        />
                        <Input
                            placeholder="Caută contact..."
                            value={searchName}
                            onChange={(e) => setSearchName(e.target.value)}
                            className="pl-10"
                        />
                    </div>

                    <Separator orientation="vertical" className="h-full" />
                    <span className="text-muted-foreground whitespace-nowrap">
                        Contacte: {data?.total || contacts.length || 0}
                    </span>
                </div>
            </div>

            <div className="flex-1 w-full relative overflow-hidden mt-4">
                {isFetching && !loading && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/50 backdrop-blur-[1px] transition-all duration-300">
                        <SpinnerElement text={2} />
                    </div>
                )}

                <div className="w-full h-full overflow-auto px-1">
                    {contacts.length > 0 ? (
                        <div className='p-5'>
                            <ContactsListByCompany
                                contacts={contacts}
                                visibleColumns={visibleColumns}
                            />
                        </div>
                    ) : (
                        !isFetching && (
                            <div className="flex w-full h-full justify-center items-center">
                                <span className="text-2xl text-muted-foreground italic">
                                    {searchNameDebounced.trim() === ""
                                        ? "Nu există nici un contact adăugat."
                                        : `Niciun contact găsit pentru: "${searchNameDebounced.trim()}"`}
                                </span>
                            </div>
                        )
                    )}
                </div>
            </div>
        </div>
    );
}