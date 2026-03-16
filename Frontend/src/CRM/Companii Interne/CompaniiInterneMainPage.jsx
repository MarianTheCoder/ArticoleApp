import React, { useContext, useEffect, useState } from 'react';
import {
    useCompaniiInterne,
    useAddCompanieInterna,
    useEditCompanieInterna,
    useDeleteCompanieInterna
} from "@/hooks/useCompaniiInterne";
import { Button } from "@/components/ui/button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faMagnifyingGlass,
    faPlus,
    faColumns,
    faList,
    faGrip
} from "@fortawesome/free-solid-svg-icons";
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useLoading } from '@/context/LoadingContext';
import SpinnerElement from '@/MainElements/SpinnerElement';
import { AuthContext } from '@/context/TokenContext';
import { toast } from 'sonner';

import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import DeleteDialog from '@/components/ui/delete-dialog';
import CompaniiInterneAddDialog from './CompaniiInterneAddDialog';
import CompaniiInterneList from './CompaniiInterneList'; // Ai grijă să creezi și acest fișier/componentă

export default function CompaniiInterneMainPage() {
    const { user } = useContext(AuthContext);
    const { hide, show, loading } = useLoading();

    // --- DIALOG STATES ---
    const [open, setOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [selectedCompanie, setSelectedCompanie] = useState(null);

    // --- DRAFT STATE ---
    const [draft, setDraft] = useState({
        id: null,
        nume: "",
        culoare_hex: "#3b82f6",
        logo_url: "",
        actualizat_de: null,
        creat_de: null,
    });

    const [searchName, setSearchName] = useState("");
    const [searchNameDebounced, setSearchNameDebounced] = useState("");

    // --- HOOKS ---
    const { data, isFetching } = useCompaniiInterne(searchNameDebounced);
    const { mutateAsync: addCompanie } = useAddCompanieInterna();
    const { mutateAsync: updateCompanie } = useEditCompanieInterna();
    const { mutateAsync: deleteCompanie } = useDeleteCompanieInterna();

    // Presupunem că API-ul returnează o listă de companii direct sau pe cheia "data"
    const companiiInterne = data?.companies || data || [];
    const totalCompanii = data?.total || companiiInterne.length || 0;

    // --- EFFECTS ---
    useEffect(() => {
        const handler = setTimeout(() => setSearchNameDebounced(searchName), 500);
        return () => clearTimeout(handler);
    }, [searchName]);

    const resetDraft = () => {
        setDraft({
            id: null,
            nume: "",
            culoare_hex: "#3b82f6",
            logo_url: "",
            actualizat_de: null,
            creat_de: null,
        });
    }

    // --- ACTIONS ---
    const submitCompanie = async () => {
        if (!draft.nume?.trim()) return toast.error("Numele companiei este obligatoriu.");
        console.log("Submitting companie with data:", draft);

        const formData = new FormData();
        formData.append("nume", draft.nume);
        formData.append("culoare_hex", draft.culoare_hex || "#3b82f6");
        formData.append("updated_by_user_id", user.id);
        formData.append("created_by_user_id", user.id);
        formData.append("delete_logo", draft.delete_logo ? "true" : "false");
        if (draft.logo_file) formData.append("logo", draft.logo_file);

        show();
        try {
            if (draft.id) {
                await updateCompanie({ companieId: draft.id, data: formData });
                toast.success("Companie actualizată cu succes!");
            } else {
                await addCompanie(formData);
                toast.success("Companie adăugată cu succes!");
            }
            setOpen(false);
            resetDraft();
        } catch (error) {
            console.log(error);
            const msg = error?.response?.data?.message || "A apărut o eroare la salvare.";
            toast.error(msg);
        } finally {
            hide();
        }
    };

    const handleDeleteClick = ({ id, nume }) => {
        setSelectedCompanie({ id, nume });
        setDeleteOpen(true);
    };

    const handleConfirmDelete = async (code) => {
        if (!selectedCompanie) return;
        try {
            show();
            await deleteCompanie({ companieId: selectedCompanie.id, code });
            toast.success(`Compania "${selectedCompanie.nume}" a fost ștearsă!`);
            setDeleteOpen(false);
            setSelectedCompanie(null);
        } catch (error) {
            const msg = error?.response?.data?.message || "Eroare la ștergere.";
            toast.error(msg);
        } finally {
            hide();
        }
    };

    return (
        <div className="h-full w-full flex justify-center overflow-hidden items-center">
            <div className="w-[95%] h-[95%] flex flex-col p-4 gap-4 overflow-hidden bg-background relative rounded-lg">
                <div className="h-full w-full relative flex gap-4 flex-col items-center overflow-hidden">
                    {/* --- HEADER CONTROLS --- */}
                    <div className="w-full bg-card grid grid-cols-[auto_1fr] rounded-lg px-8 p-6 shrink-0 z-10">
                        <CompaniiInterneAddDialog
                            open={open}
                            reset={!draft.id}
                            setOpen={setOpen}
                            draft={draft}
                            setDraft={setDraft}
                            resetDraft={resetDraft}
                            onSubmit={submitCompanie}
                            buttonStyle={
                                <Button variant="default" size="lg" className="gap-2">
                                    <FontAwesomeIcon icon={faPlus} className="text-base" />
                                    <p>Adaugă companie</p>
                                </Button>
                            }
                            title={draft.id ? "Editează companie internă" : "Adaugă companie nouă"}
                        />

                        <DeleteDialog
                            open={deleteOpen}
                            setOpen={setDeleteOpen}
                            title="Ștergere companie internă"
                            description={`Ești sigur că vrei să ștergi compania "${selectedCompanie?.nume}"?`}
                            onSubmit={handleConfirmDelete}
                            useCode={true}
                        />

                        <div className="relative justify-end w-full gap-2 xxl:gap-4 flex items-center">
                            <div className="max-w-md relative w-full">
                                <FontAwesomeIcon
                                    icon={faMagnifyingGlass}
                                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                                />
                                <Input
                                    placeholder="Caută companie..."
                                    value={searchName}
                                    onChange={(e) => setSearchName(e.target.value)}
                                    className="pl-10"
                                />
                            </div>

                            <Separator orientation="vertical" className="h-full" />
                            <span className="text-muted-foreground whitespace-nowrap">
                                Companii: {totalCompanii}
                            </span>
                        </div>
                    </div>

                    {/* --- LIST / LOADING --- */}
                    {isFetching && !loading && <SpinnerElement text={2} />}

                    {companiiInterne.length > 0 ? (
                        <div className="p-5 h-full w-full bg-card rounded-lg overflow-hidden relative">
                            <CompaniiInterneList
                                companii={companiiInterne}
                                draft={draft}
                                setDraft={setDraft}
                                setOpen={setOpen}
                                handleDeleteClick={handleDeleteClick}
                            />
                        </div>
                    ) : (
                        !isFetching && (
                            <div className="flex w-full h-full justify-center items-center flex-col gap-4">
                                <span className="text-2xl text-muted-foreground italic">
                                    {searchNameDebounced.trim() === ""
                                        ? "Nu există nicio companie internă adăugată."
                                        : `Niciun rezultat pentru: "${searchNameDebounced}"`}
                                </span>
                            </div>
                        )
                    )}
                </div>
            </div>
        </div>
    );
}