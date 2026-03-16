import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAddSantier, useSantiereByCompany, useEditSantier, useDeleteSantier } from "@/hooks/useSantiere";
import { Button } from "@/components/ui/button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faMagnifyingGlass,
    faPlus,
    faColumns,
    faBuilding,
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
import SantiereAddDialog from './SantiereAddDialog';
import SantiereListByCompany from './SantiereListByCompany';

export default function SantiereMainCompany({ companyId = null, filialaId = null }) {
    const { user } = useContext(AuthContext);
    const { hide, show, loading } = useLoading();

    // --- DIALOG STATES ---
    const [open, setOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [selectedSantier, setSelectedSantier] = useState(null);
    const [isCardView, setIsCardView] = useState(false);

    // --- VISIBILITY STATE ---
    const [visibleColumns, setVisibleColumns] = useState({
        companie: true,
        filiala: true,
        nume: true,
        culoare: true,
        status: true, // activ
        adresa: true,
        inceput: true,
        sfarsit: true,// start & end date
        notita: true,
        creat: true,
        actualizat: true
    });

    // --- DRAFT STATE ---
    const [draft, setDraft] = useState({
        id: null,
        nume: "",
        companie_id: companyId,
        filiala_id: filialaId, // Selectable logic if you have Filiale
        culoare_hex: "#FFFFFF",
        activ: true,
        notita: "",
        data_inceput: "",
        data_sfarsit: "",
        adresa: "",
        longitudine: "",
        latitudine: ""
    });

    const [searchName, setSearchName] = useState("");
    const [searchNameDebounced, setSearchNameDebounced] = useState("");

    // --- HOOKS ---
    const { data, isFetching } = useSantiereByCompany(companyId, searchNameDebounced, filialaId);
    const { mutateAsync: addSantier } = useAddSantier();
    const { mutateAsync: updateSantier } = useEditSantier();
    const { mutateAsync: deleteSantier } = useDeleteSantier();

    const santiere = data?.santiere || [];

    // --- EFFECTS ---
    useEffect(() => {
        const handler = setTimeout(() => setSearchNameDebounced(searchName), 500);
        return () => clearTimeout(handler);
    }, [searchName]);

    const resetDraft = () => {
        setDraft({
            id: null,
            companie_id: companyId || null,
            filiala_id: filialaId || null,
            nume: "",
            culoare_hex: "#ffffff", // Default nice blue or white
            activ: true,
            notita: "",
            data_inceput: "",
            data_sfarsit: "",
            adresa: "",
            longitudine: "",
            latitudine: ""
        });
    }


    useEffect(() => {
        setVisibleColumns(prev => {
            const next = { ...prev };

            if (filialaId) delete next.filiala;
            if (companyId) delete next.companie;

            return next;
        });
    }, [filialaId, companyId]);

    // --- ACTIONS ---
    const submitSantier = async () => {
        if (!companyId && !draft.companie_id) return toast.error("Eroare: ID Companie lipsă.");
        if (!draft.nume) return toast.error("Numele șantierului este obligatoriu.");
        const payload = {
            ...draft,
            companie_id: draft.companie_id || companyId,
            filiala_id: draft.filiala_id || filialaId,
            updated_by_user_id: user.id,
        }
        if (!draft.id) {
            payload.created_by_user_id = user.id;
        }

        show();
        try {
            if (draft.id) {
                await updateSantier({ santierId: draft.id, companyId: draft.companie_id || companyId, data: payload });
                toast.success("Șantier actualizat cu succes!");
            } else {
                await addSantier({ companyId: draft.companie_id || companyId, data: payload });
                toast.success("Șantier adăugat cu succes!");
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

    const handleDeleteClick = useCallback(({ id, nume }) => {
        setSelectedSantier({ id, nume });
        setDeleteOpen(true);
    }, []);

    const handleConfirmDelete = async (code) => {
        if (!selectedSantier) return;
        try {
            show();
            await deleteSantier({ santierId: selectedSantier.id, companyId, code });
            toast.success(`Șantierul "${selectedSantier.nume}" a fost șters!`);
            setDeleteOpen(false);
        } catch (error) {
            const msg = error?.response?.data?.message || "Eroare la ștergere.";
            toast.error(msg);
        } finally {
            hide();
        }
    };

    const toggleCol = (key, val) => {
        setVisibleColumns(prev => ({ ...prev, [key]: val }));
    };


    return (
        <div className="h-full w-full relative flex gap-4 flex-col items-center overflow-hidden">
            {/* --- HEADER CONTROLS --- */}
            <div className="w-full bg-card grid grid-cols-[auto_1fr] rounded-lg px-8 p-6 shrink-0 z-10">
                <SantiereAddDialog
                    filialaId={filialaId}
                    companyId={companyId}
                    open={open}
                    reset={!draft.id ? true : false}
                    setOpen={setOpen}
                    draft={draft}
                    setDraft={setDraft}
                    resetDraft={resetDraft}
                    onSubmit={submitSantier}
                    buttonStyle={
                        <Button variant="default" size="lg" className="gap-2">
                            <FontAwesomeIcon icon={faPlus} className="text-base" />
                            <p>Adaugă șantier</p>
                        </Button>
                    }
                    title={draft.id ? "Editează șantier" : "Adaugă șantier nou"}
                />

                <DeleteDialog
                    open={deleteOpen}
                    setOpen={setDeleteOpen}
                    title="Ștergere șantier"
                    description={`Ești sigur că vrei să ștergi șantierul "${selectedSantier?.nume}"?`}
                    onSubmit={handleConfirmDelete}
                    useCode={true}
                />

                <div className="relative justify-end w-full gap-2 xxl:gap-4 flex items-center">
                    <div>
                        <Button
                            variant="outline"
                            onClick={() => setIsCardView(false)}
                            className={`gap-2 rounded-r-none ${!isCardView ? "bg-accent text-accent-foreground" : "text-muted-foreground"}`}
                        >
                            <FontAwesomeIcon icon={faList} />
                        </Button>

                        <Button
                            variant="outline"
                            onClick={() => setIsCardView(true)}
                            className={`gap-2 rounded-l-none -ml-px ${isCardView ? "bg-accent text-accent-foreground" : "text-muted-foreground"}`}
                        >
                            <FontAwesomeIcon icon={faGrip} />
                        </Button>
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="gap-2">
                                <FontAwesomeIcon className='text-foreground' icon={faColumns} />
                                <span className="hidden text-foreground sm:inline">Coloane</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
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
                                    {colKey}
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
                            placeholder="Caută șantier..."
                            value={searchName}
                            onChange={(e) => setSearchName(e.target.value)}
                            className="pl-10"
                        />
                    </div>

                    <Separator orientation="vertical" className="h-full" />
                    <span className="text-muted-foreground whitespace-nowrap">
                        Șantiere: {data?.total || santiere.length || 0}
                    </span>
                </div>
            </div>

            {/* --- LIST / LOADING --- */}
            {isFetching && !loading && <SpinnerElement text={2} />}

            {santiere.length > 0 ? (
                <div className={`p-5 ${companyId ? "pt-0" : ""} h-full w-full bg-card rounded-lg overflow-hidden relative`}>
                    <SantiereListByCompany
                        companyId={companyId}
                        filialaId={filialaId}
                        santiere={santiere}
                        draft={draft}
                        setDraft={setDraft}
                        setOpen={setOpen}
                        handleDeleteClick={handleDeleteClick}
                        visibleColumns={visibleColumns}
                        isCardView={isCardView}
                    />
                </div>
            ) : (
                !isFetching && (
                    <div className="flex w-full h-full justify-center items-center flex-col gap-4">
                        <span className="text-2xl text-muted-foreground italic">
                            {searchNameDebounced.trim() === ""
                                ? "Nu există nici un șantier adăugat."
                                : `Niciun rezultat pentru: "${searchNameDebounced}"`}
                        </span>
                    </div>
                )
            )}
        </div>
    );
}