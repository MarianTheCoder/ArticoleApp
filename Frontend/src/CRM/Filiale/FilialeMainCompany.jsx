import React, { useContext, useEffect, useState } from 'react';
import { useAddFiliale, useFilialeByCompany, useEditFiliale, useDeleteFiliale } from "@/hooks/useFiliale"; // You need to create this hook file
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
import FilialeAddDialog from './FilialeAddDialog';
import FilialeListByCompany from './FilialeListByCompany';

export default function FilialeMainCompany({ companyId = null }) {
    const { user } = useContext(AuthContext);
    const { hide, show, loading } = useLoading();
    // --- DIALOG STATES ---
    const [open, setOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [selectedFiliala, setSelectedFiliala] = useState(null);
    const [isCardView, setIsCardView] = useState(false);

    // --- VISIBILITY STATE ---
    const [visibleColumns, setVisibleColumns] = useState({
        ...(companyId ? {} : { companie: true }), // Afișăm numele companiei doar dacă suntem în view-ul general, nu în cel al unei companii
        nume: true,
        tip: true,
        locatie: true, // tara, regiune, oras combined
        email: true,
        telefon: true,
        decizie: true,
        note: true,
        creat: true,
        actualizat: true
    });

    // --- DRAFT STATE ---
    const [draft, setDraft] = useState({
        id: null,
        companie_id: null,
        nume_filiala: "",
        tip_unitate: "Filiale", // Default
        tara: "Romania", // Default
        regiune: "",
        oras: "",
        latitudine: "",
        longitudine: "",
        nivel_decizie: "Regional", // Default
        telefon: "",
        email: "",
        note: ""
    });

    const [searchName, setSearchName] = useState("");
    const [searchNameDebounced, setSearchNameDebounced] = useState("");

    // --- HOOKS ---
    // Assuming these hooks exist and return { data: { filiale: [], total: 0 }, isFetching }
    const { data, isFetching } = useFilialeByCompany(companyId, searchNameDebounced);
    const { mutateAsync: addFiliale } = useAddFiliale();
    const { mutateAsync: updateFiliale } = useEditFiliale();
    const { mutateAsync: deleteFiliale } = useDeleteFiliale();

    const filiale = data?.filiale || [];

    // --- EFFECTS ---
    useEffect(() => {
        const handler = setTimeout(() => setSearchNameDebounced(searchName), 500);
        return () => clearTimeout(handler);
    }, [searchName]);

    const resetDraft = () => {
        setDraft({
            id: null,
            companie_id: null,
            nume_filiala: "",
            tip_unitate: "Filiale",
            tara: "Romania",
            regiune: "",
            latitudine: "",
            longitudine: "",
            oras: "",
            nivel_decizie: "Regional",
            telefon: "",
            email: "",
            note: ""
        });
    }

    // --- ACTIONS ---
    const submitFiliale = async () => {
        if (!companyId && !draft.companie_id) return toast.error("Eroare: ID Companie lipsă.");
        if (!draft.nume_filiala) return toast.error("Numele filialei este obligatoriu.");

        const payload = {
            ...draft,
            companie_id: draft.companie_id || companyId,
            updated_by_user_id: user.id,
        }
        if (!draft.id) {
            payload.created_by_user_id = user.id;
        }
        show();
        try {
            if (draft.id) {
                await updateFiliale({ filialaId: draft.id, companyId: draft.companie_id || companyId, data: payload });
                toast.success("Filială actualizată cu succes!");
            } else {
                await addFiliale({ companyId: draft.companie_id || companyId, data: payload });
                toast.success("Filială adăugată cu succes!");
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

    const handleDeleteClick = ({ id, nume }) => {
        setSelectedFiliala({ id, nume });
        setDeleteOpen(true);
    };

    const handleConfirmDelete = async (code) => {
        if (!selectedFiliala) return;
        try {
            show();
            await deleteFiliale({ filialaId: selectedFiliala.id, companyId, code });
            toast.success(`Filiala "${selectedFiliala.nume}" a fost ștearsă!`);
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
                <FilialeAddDialog
                    companyId={companyId}
                    open={open}
                    reset={!draft.id ? true : false}
                    setOpen={setOpen}
                    draft={draft}
                    setDraft={setDraft}
                    resetDraft={resetDraft}
                    onSubmit={submitFiliale}
                    buttonStyle={
                        <Button variant="default" size="lg" className="gap-2">
                            <FontAwesomeIcon icon={faPlus} className="text-base" />
                            <p>Adaugă filială</p>
                        </Button>
                    }
                    title={draft.id ? "Editează filială" : "Adaugă filială nouă"}
                />

                <DeleteDialog
                    open={deleteOpen}
                    setOpen={setDeleteOpen}
                    title="Ștergere filială"
                    description={`Ești sigur că vrei să ștergi filiala "${selectedFiliala?.nume}"?`}
                    onSubmit={handleConfirmDelete}
                    useCode={true}
                />

                <div className="relative justify-end w-full gap-2 xxl:gap-4 flex items-center">
                    <div className="flex items-center">
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
                            placeholder="Caută filială..."
                            value={searchName}
                            onChange={(e) => setSearchName(e.target.value)}
                            className="pl-10"
                        />
                    </div>

                    <Separator orientation="vertical" className="h-full" />
                    <span className="text-muted-foreground whitespace-nowrap">
                        Filiale: {data?.total || filiale.length || 0}
                    </span>
                </div>
            </div>

            {/* --- LIST / LOADING --- */}
            {isFetching && !loading && <SpinnerElement text={2} />}

            {filiale.length > 0 ? (
                <div className={`p-5 ${companyId ? "pt-0" : ""} h-full w-full bg-card rounded-lg overflow-hidden relative`}>
                    <FilialeListByCompany
                        companyId={companyId}
                        filiale={filiale}
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
                                ? "Nu există nicio filială adăugată."
                                : `Niciun rezultat pentru: "${searchNameDebounced}"`}
                        </span>
                    </div>
                )
            )}
        </div>
    );
}