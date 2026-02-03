import React, { act, useContext, useEffect, useState } from 'react';
// 1. Asigură-te că imporți și hook-ul de Update
import { useAddContact, useContactsByCompany, useEditContact, useChangeOwner, useRemoveOwner, useDeleteContact } from "@/hooks/useContacts";
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
import AskDialog from '@/components/ui/ask-dialog';
import DeleteConfirmationDialog from '@/components/ui/delete-dialog';
import WarningDialog from '@/components/ui/warning-dialog';
import DeleteDialog from '@/components/ui/delete-dialog';

export default function ContactsMainCompany({ companyLimba, companyId }) {
    const { user } = useContext(AuthContext);
    const { hide, show, loading } = useLoading();
    const [open, setOpen] = useState(false);
    const [openAsk, setOpenAsk] = useState(false);
    const [openAskRemove, setOpenAskRemove] = useState(false);

    const [deleteOpen, setDeleteOpen] = useState(false);
    const [selectedContact, setSelectedContact] = useState(null);

    // --- 1. STATE VIZIBILITATE ---
    const [visibleColumns, setVisibleColumns] = useState({
        nume: true,
        functie: true,
        email: true,
        telefon: true,
        santier: true,
        filiala: true,
        limba: true,
        activ: true,
        categorie_rol: false,
        linkedin: false,
        decizie: false,
        influenta: false,
        canal: false,
        note: false,
        creat: false,
        actualizat: false
    });

    // --- 2. DRAFT STATE (Include id și delete_logo) ---
    const [draft, setDraft] = useState({
        id: null, // Null = Add, ID = Edit
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
        delete_logo: false // Flag pentru ștergere poză
    });

    const [searchName, setSearchName] = useState("");
    const [searchNameDebounced, setSearchNameDebounced] = useState("");

    // Hooks
    const { data, isFetching } = useContactsByCompany(companyId, searchNameDebounced);
    const { mutateAsync: addContact } = useAddContact();
    const { mutateAsync: updateContact } = useEditContact(); // Hook-ul de editare
    const { mutateAsync: changeOwner } = useChangeOwner();
    const { mutateAsync: removeOwner } = useRemoveOwner(); /// de facut functia
    const { mutateAsync: deleteContact } = useDeleteContact();


    const contacts = data?.contacts || [];

    useEffect(() => {
        const handler = setTimeout(() => setSearchNameDebounced(searchName), 500);
        return () => clearTimeout(handler);
    }, [searchName]);

    // Cleanup pentru URL-uri blob
    useEffect(() => {
        return () => {
            if (draft.logoPreview && draft.logoPreview.startsWith('blob:')) {
                URL.revokeObjectURL(draft.logoPreview);
            }
        };
    }, []);

    const resetDraft = () => {
        if (draft.logoPreview && draft.logoPreview.startsWith('blob:')) {
            URL.revokeObjectURL(draft.logoPreview);
        }
        setDraft({
            id: null,
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
            delete_logo: false
        });
    }

    // --- 3. SUBMIT LOGIC (ADD vs EDIT) ---
    const submitContact = async () => {
        if (!companyId) {
            toast.error("Eroare: ID Companie lipsă.");
            return;
        }

        const fd = new FormData();

        // Logica Foto:
        if (draft.logoFile) {
            fd.append("logo", draft.logoFile); // Upload poză nouă
        } else if (draft.delete_logo) {
            fd.append("delete_logo", "true"); // Șterge poză veche
        }

        // Câmpuri text
        fd.append("prenume", draft.prenume?.trim() || "");
        fd.append("nume", draft.nume?.trim() || "");
        fd.append("functie", draft.functie?.trim() || "");
        fd.append("categorie_rol", draft.categorie_rol?.trim() || "");
        fd.append("email", draft.email?.trim() || "");
        fd.append("telefon", draft.telefon?.trim() || "");
        fd.append("linkedin_url", draft.linkedin_url?.trim() || "");
        fd.append("putere_decizie", draft.putere_decizie);
        fd.append("nivel_influenta", draft.nivel_influenta);
        fd.append("canal_preferat", draft.canal_preferat);
        fd.append("note", draft.note?.trim() || "");
        fd.append("limba", companyLimba);
        fd.append("companie_id", companyId);
        fd.append("updated_by_user_id", user.id);

        // Doar la creare avem nevoie de created_by, dar la update e ignorat de obicei
        if (!draft.id) {
            fd.append("created_by_user_id", user.id);
        }

        show();
        try {
            if (draft.id) {
                // --- UPDATE ---
                // Presupunem că updateContact primește { id, companyId, formData }
                await updateContact({ contactId: draft.id, companyId, formData: fd });
                toast.success("Contact actualizat cu succes!");
            } else {
                // --- ADD ---
                await addContact({ companyId, formData: fd });
                toast.success("Contact adăugat cu succes!");
            }

            setOpen(false);
            resetDraft();
        } catch (error) {
            console.error(error);
            const msg = error?.response?.data?.message || "A apărut o eroare la salvare.";
            toast.error(msg);
        } finally {
            hide();
        }
    };

    const toggleCol = (key, val) => {
        setVisibleColumns(prev => ({ ...prev, [key]: val }));
    };

    const handleSetOwner = async () => {
        if (!openAsk) return;
        const id = openAsk;
        setOpenAsk(false);
        show();
        try {
            await changeOwner({ contactId: id, companyId, user_id: user.id });
            toast.success("Contactul a fost setat ca responsabil extern.");
        } catch (error) {
            console.error(error);
            const msg = error?.response?.data?.message || "A apărut o eroare la setarea responsabilului.";
            toast.error(msg);
        } finally {
            hide();
        }
    }

    const handleRemoveOwner = async () => {
        if (!openAskRemove) return;
        const id = openAskRemove;
        setOpenAskRemove(false);
        show();
        try {
            await removeOwner({ contactId: id, companyId, user_id: user.id });
            toast.success("Contactul a fost setat ca responsabil extern.");
        } catch (error) {
            console.error(error);
            const msg = error?.response?.data?.message || "A apărut o eroare la setarea responsabilului.";
            toast.error(msg);
        } finally {
            hide();
        }
    }

    const handleDeleteClick = ({ id, nume }) => {
        setSelectedContact({ id, nume });
        setDeleteOpen(true);
    }

    const handleConfirmDelete = async () => {
        if (!selectedContact) {
            toast.error("ID-ul Contactului nu este valid.");
            return;
        }
        try {
            show();
            await deleteContact({ contactId: selectedContact.id, companyId });
            toast.success(`Contactul "${selectedContact?.nume}" a fost șters cu succes!`);
            setDeleteOpen(false);
        } catch (error) {
            const msg = error?.response?.data?.message || "A apărut o eroare la ștergere.";
            toast.error(msg);
            return;
        } finally {
            hide();
        }
    }


    return (
        <div className="h-full w-full relative  flex flex-col items-center overflow-hidden">
            <div className="w-full bg-card grid grid-cols-[auto_1fr] rounded-lg px-8 p-6 shrink-0 z-10">
                <ContactsAddDialog
                    companyId={companyId}
                    open={open}
                    setOpen={setOpen}
                    buttonStyle={
                        <Button
                            variant="default"
                            size="lg"
                            className="gap-2"
                        >
                            <FontAwesomeIcon icon={faPlus} className="text-base" />
                            <p>Adaugă un contact</p>
                        </Button>
                    }
                    onSubmitContact={submitContact}
                    draft={draft}
                    setDraft={setDraft}
                    resetDraft={resetDraft}
                    reset={!draft.id} // Arată butonul de reset doar dacă NU edităm
                    title={draft.id ? "Editează contact" : "Adaugă un contact"}
                />
                <AskDialog
                    open={openAsk}
                    setOpen={setOpenAsk}
                    title="Setezi contactul ca responsabil extern?"
                    description="Acest contact va fi marcat ca responsabil pentru această companie."
                    onSubmit={() => handleSetOwner()}
                />
                <WarningDialog
                    open={openAskRemove}
                    setOpen={setOpenAskRemove}
                    title="Elimini responsabilul extern?"
                    description="Acest contact nu va mai fi responsabil pentru această companie."
                    onSubmit={() => handleRemoveOwner()}
                />
                <DeleteDialog
                    open={deleteOpen}
                    setOpen={setDeleteOpen}
                    title="Ștergere contact"
                    description={`Ești sigur că vrei să ștergi contactul "${selectedContact?.nume}"? Această acțiune este ireversibilă.`}
                    onSubmit={handleConfirmDelete}
                    useCode={false}
                />
                {/* ... RESTUL JSX-ULUI (DROPDOWN COLOANE, SEARCH, ETC) ... */}
                <div className="relative justify-end w-full gap-2 xxl:gap-4 flex items-center">
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
                            {Object.keys(visibleColumns).map((colKey) => (
                                <DropdownMenuCheckboxItem
                                    key={colKey}
                                    checked={visibleColumns[colKey]}
                                    onCheckedChange={(c) => toggleCol(colKey, c)}
                                    onSelect={(e) => e.preventDefault()}
                                    className="capitalize"
                                >
                                    {colKey.replace('_', ' ')}
                                </DropdownMenuCheckboxItem>
                            ))}
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

            {isFetching && !loading && (
                <SpinnerElement text={2} />
            )}
            {contacts.length > 0 ? (
                <div className='p-5 pt-0 h-full w-full overflow-hidden relative'>
                    <ContactsListByCompany
                        draft={draft}
                        setDraft={setDraft}

                        setOpen={setOpen}
                        openAsk={openAsk}
                        setOpenAsk={setOpenAsk}

                        openAskRemove={openAskRemove}
                        setOpenAskRemove={setOpenAskRemove}

                        handleDeleteClick={handleDeleteClick}

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
    );
}