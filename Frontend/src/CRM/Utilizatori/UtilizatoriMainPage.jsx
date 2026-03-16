import React, { useCallback, useContext, useEffect, useState } from 'react';
import { useConturi, useAddCont, useEditCont, useDeleteCont, useRoleTemplates, useAddTemplate, useEditTemplate, useDeleteTemplate, useSaveAtribuiri } from "@/hooks/useConturi";
import { Button } from "@/components/ui/button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faMagnifyingGlass, faColumns, faList, faGrip, faPlus, faEye
} from "@fortawesome/free-solid-svg-icons";
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useLoading } from '@/context/LoadingContext';
import SpinnerElement from '@/MainElements/SpinnerElement';
import { AuthContext } from '@/context/TokenContext';
import { toast } from 'sonner';
import {
    DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import DeleteDialog from '@/components/ui/delete-dialog';
import UtilizatoriAddDialog from './UtilizatoriAddDialog';
import UtilizatoriList from './UtilizatoriList';
import { useNavigate } from 'react-router-dom';
import { useCompaniiInterne } from '@/hooks/useCompaniiInterne';
import UtilizatoriAtribuiriDialog from './UtilizatoriAtribuiriDialog';


const EMPTY_ARRAY = [];

export default function UtilizatoriMainPage() {
    const { user } = useContext(AuthContext);
    const { hide, show, loading } = useLoading();
    const navigate = useNavigate();

    // --- DIALOG STATES ---
    const [open, setOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [atribuiriOpen, setAtribuiriOpen] = useState(false);

    //Delete / Edit
    const [selectedUserDelete, setselectedUserDelete] = useState(null);
    const [selectedUserEdit, setSelectedUserEdit] = useState(null);


    const [isCardView, setIsCardView] = useState(false);

    // --- VISIBILITY STATE ---
    const [visibleColumns, setVisibleColumns] = useState({
        fotografie: true, nume: true, email: true, specializare: true,
        telefon_munca: true, telefon_personal: true, status: true,
        companie: true, data_nastere: true, actualizat: true, creat: true,
    });

    const [searchName, setSearchName] = useState("");
    const [searchNameDebounced, setSearchNameDebounced] = useState("");

    // --- HOOKS ---
    const { data, isFetching } = useConturi(searchNameDebounced);
    const { data: companiiInterne } = useCompaniiInterne();
    const { data: role_templates } = useRoleTemplates();

    const { mutateAsync: addCont } = useAddCont();
    const { mutateAsync: updateCont } = useEditCont();
    const { mutateAsync: deleteCont } = useDeleteCont();

    const { mutateAsync: addTemplate } = useAddTemplate();
    const { mutateAsync: editTemplate } = useEditTemplate();
    const { mutateAsync: deleteTemplate } = useDeleteTemplate();

    const { mutateAsync: saveAtribuiri } = useSaveAtribuiri();

    const conturi = data?.conturi || EMPTY_ARRAY;
    const companiiInterneOptions = companiiInterne?.companies || EMPTY_ARRAY;
    const templates = role_templates?.templates || EMPTY_ARRAY;

    // --- DEBOUNCE SEARCH ---
    useEffect(() => {
        const handler = setTimeout(() => setSearchNameDebounced(searchName), 500);
        return () => clearTimeout(handler);
    }, [searchName]);


    // EDIT handler for user
    const handleEdit = useCallback((cont) => {
        setSelectedUserEdit(cont);
        setOpen(true);
    }, []);

    // EDIT ACCEPT for template

    const handleConfirmEditRole = async ({ id, nume_rol, descriere, json_permisiuni }) => {
        const obj = { id, nume_rol, descriere, json_permisiuni };
        try {
            show();
            await editTemplate?.(obj);
        } catch (error) {
            console.log("Error editing role:", error);
            toast.error(error?.response?.data?.message || "Eroare la editarea template-ului de Rol.");
        } finally {
            hide();
        }
    };

    // --- SUBMIT ---

    //Submite template
    const handleTemplateSave = async ({ id, nume_rol, descriere, json_permisiuni }) => {
        const obj = { id, nume_rol, descriere, json_permisiuni };
        try {
            show();
            const res = await addTemplate?.(obj);
            return res;
        } catch (error) {
            console.log("Error saving role:", error);
            toast.error(error?.response?.data?.message || "Eroare la salvarea template-ului de Rol.");
            throw error; // Propagate error to handle it in the dialog if needed
        } finally {
            hide();
        }
    };

    //Submit cont 
    const submitCont = async (finalDraft) => {
        show();
        try {
            const formData = new FormData();
            const fields = [
                "email", "name", "specializare", "password",
                "telephone", "telephone_1", "data_nastere",
                "permissions", "activ", "companie_interna_id", "permissions_template_id"
            ];

            fields.forEach((key) => {
                const val = finalDraft[key];
                if (val === null || val === undefined) return;
                if (key === "permissions") {
                    formData.append(key, typeof val === "string" ? val : JSON.stringify(val));
                } else {
                    formData.append(key, val);
                }
            });

            if (finalDraft.photoFile) {
                formData.append("photo_url", finalDraft.photoFile);
            }

            if (finalDraft.id) {
                await updateCont({ userId: finalDraft.id, data: formData });
                toast.success("Cont actualizat cu succes!");
            } else {
                await addCont(formData);
                toast.success("Cont creat cu succes!");
            }

            setOpen(false);
        } catch (error) {
            toast.error(error?.response?.data?.message || "Eroare la salvare.");
        } finally {
            hide();
        }
    };

    // --- DELETE ---
    const handleDeleteClick = useCallback(({ id, nume }) => {
        setselectedUserDelete({ id, nume });
        setDeleteOpen(true);
    }, []);

    const handleConfirmDelete = async (code) => {
        try {
            show();
            await deleteCont({ userId: selectedUserDelete.id, code });
            setDeleteOpen(false);
        } catch (error) {
            toast.error(error?.response?.data?.message || "Eroare la ștergere.");
        } finally {
            hide();
        }
    };

    const handleConfirmDeleteRole = async ({ id, code }) => {
        try {
            show();
            await deleteTemplate({ id: id, code });
        } catch (error) {
            console.log("Error deleting template:", error);
            throw error; // Test error handling
        } finally {
            hide();
        }
    };

    /// --- ATRIBUIRI ---


    const handleSaveAtribuiri = async (open, assignedSantierIdsArray) => {
        try {
            show();
            await saveAtribuiri({ utilizatorID: open, santier_ids: assignedSantierIdsArray });
        } catch (error) {
            throw error; // Throw so the dialog knows to stop the loading spinner
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
                        <div className='flex gap-4'>
                            <UtilizatoriAddDialog
                                open={open}
                                setOpen={setOpen}

                                onSubmitUtilizator={submitCont}

                                selectedUser={selectedUserEdit}
                                setSelectedUserEdit={setSelectedUserEdit}

                                companiiInterneOptions={companiiInterneOptions}
                                predefinedRoles={templates}

                                //add/edit/delete roles
                                onSavePredefinedRole={handleTemplateSave}
                                onEditPredefinedRole={handleConfirmEditRole}
                                onDeletePredefinedRole={handleConfirmDeleteRole}

                                buttonStyle={
                                    <Button variant="default" size="lg" className="gap-2">
                                        <FontAwesomeIcon icon={faPlus} className="text-base" />
                                        <p>Adaugă Utilizator</p>
                                    </Button>
                                }
                            />
                            <UtilizatoriAtribuiriDialog
                                open={atribuiriOpen}
                                setOpen={setAtribuiriOpen}
                                onSaveAtribuiri={handleSaveAtribuiri}
                                buttonStyle={<span></span>}
                            />

                            <Button onClick={() => navigate("/Companii-interne")} variant="default" size="lg" className="gap-2">
                                <FontAwesomeIcon icon={faEye} className="text-base" />
                                <p>Vizualizează Companiile</p>
                            </Button>

                            <DeleteDialog
                                open={deleteOpen}
                                setOpen={setDeleteOpen}
                                title="Ștergere Utilizator"
                                description={`Ești sigur că vrei să ștergi utilizatorul "${selectedUserDelete?.nume}"?`}
                                onSubmit={handleConfirmDelete}
                                useCode={true}
                            />
                        </div>

                        <div className="relative justify-end w-full gap-4 flex items-center">
                            {/* List / Card view toggle */}
                            <div className="flex items-center">
                                <Button variant="outline" onClick={() => setIsCardView(false)} className={`rounded-r-none ${!isCardView ? "bg-accent text-foreground" : "text-muted-foreground"}`}>
                                    <FontAwesomeIcon icon={faList} />
                                </Button>
                                <Button variant="outline" onClick={() => setIsCardView(true)} className={`rounded-l-none -ml-px ${isCardView ? "bg-accent text-foreground " : "text-muted-foreground"}`}>
                                    <FontAwesomeIcon icon={faGrip} />
                                </Button>
                            </div>

                            {/* Column visibility */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" className="gap-2 text-foreground">
                                        <FontAwesomeIcon icon={faColumns} />
                                        <span>Coloane</span>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    {Object.keys(visibleColumns).map((col) => (
                                        <DropdownMenuCheckboxItem
                                            key={col} checked={visibleColumns[col]}
                                            onCheckedChange={(v) => setVisibleColumns((prev) => ({ ...prev, [col]: v }))}
                                            onSelect={(e) => e.preventDefault()} className="capitalize"
                                        >
                                            {col}
                                        </DropdownMenuCheckboxItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>

                            {/* Search */}
                            <div className="max-w-md relative w-full">
                                <FontAwesomeIcon icon={faMagnifyingGlass} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <Input placeholder="Caută utilizator (nume, email, specializare)..." value={searchName} onChange={(e) => setSearchName(e.target.value)} className="pl-10" />
                            </div>

                            <Separator orientation="vertical" className="h-full" />
                            <span className="text-muted-foreground whitespace-nowrap">
                                Utilizatori: {data?.total ?? conturi.length}
                            </span>
                        </div>
                    </div>

                    {/* --- LOADING SPINNER --- */}
                    {isFetching && !loading && <SpinnerElement text={2} />}

                    {/* --- CONTENT --- */}
                    <div className="p-5 h-full w-full bg-card rounded-lg overflow-hidden relative">
                        {conturi.length > 0 ? (
                            <UtilizatoriList
                                conturi={conturi}
                                handleEdit={handleEdit}
                                handleDeleteClick={handleDeleteClick}
                                handleAtribuiriClick={setAtribuiriOpen}
                                visibleColumns={visibleColumns}
                                isCardView={isCardView}
                            />
                        ) : (
                            !isFetching && (
                                <div className="h-full flex items-center justify-center text-muted-foreground italic text-xl">
                                    Nu s-au găsit conturi.
                                </div>
                            )
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}