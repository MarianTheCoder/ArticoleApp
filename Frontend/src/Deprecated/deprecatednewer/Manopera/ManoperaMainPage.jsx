import React, { useCallback, useContext, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronLeft, faChevronRight } from "@fortawesome/free-solid-svg-icons";

import { useLoading } from "@/context/LoadingContext";
import { AuthContext } from "@/context/TokenContext";

// --- HOOK-URI ---
import { useCatalog, useDeleteCatalogDef } from "@/hooks/Database/useCatalog";

// --- COMPONENTE COPIL ---
import ManoperaFilters from "./ManoperaFilters";
import ManoperaList from "./ManoperaList";
import ManoperaDefDialog from "./ManoperaDefDialog";
import SpinnerElement from "@/MainElements/SpinnerElement";
import DeleteDialog from "@/components/ui/delete-dialog";
import { toast } from "sonner";

export default function ManoperaMainPage() {
  const { loading, show, hide } = useLoading();
  const { user } = useContext(AuthContext);

  // --- STATE DIALOGURI ---
  const [openAddDef, setOpenAddDef] = useState(false);
  const [draft, setDraft] = useState(null);

  // --- STATE PENTRU DIALOGUL DE ȘTERGERE ---
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  // --- VISIBILITY STATE (COLOANE) ---
  const [visibleColumns, setVisibleColumns] = useState({
    limba: true,
    variante: true,
    cod: true,
    denumire: true,
    descriere: true,
    unitate: true,
    cost: true,
    creat: false,
    actualizat: false,
  });

  // --- STATE FILTRE & PAGINARE ---
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");

  const [page, setPage] = useState(1);
  const [limitInput, setLimitInput] = useState("50");
  const [limitDebounced, setLimitDebounced] = useState(50);

  const [displayLang, setDisplayLang] = useState("RO"); // UI Toggle RO/FR

  // STATE FILTRE AVANSATE
  const [advancedFilters, setAdvancedFilters] = useState({
    cod: "",
    denumire: "",
    variante: "0",
    cost: "",
    unitate: "all",
    limba: "all",
    sortBy: "updated_at",
    sortOrder: "desc",
  });
  const [advancedFiltersDebounced, setAdvancedFiltersDebounced] = useState(advancedFilters);

  // --- DEBOUNCE PENTRU TOATE FILTRELE ---
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchDebounced(search);
      setAdvancedFiltersDebounced(advancedFilters);

      let parsedLimit = parseInt(limitInput);
      if (isNaN(parsedLimit) || parsedLimit < 1) parsedLimit = 50;
      setLimitDebounced(parsedLimit);

      setPage(1); // Resetează pagina la orice modificare de filtru
    }, 500);
    return () => clearTimeout(handler);
  }, [search, limitInput, advancedFilters]);

  const toggleCol = (key, val) => {
    setVisibleColumns((prev) => ({ ...prev, [key]: val }));
  };

  // --- DATA FETCHING (GET) DIN BACKEND ---
  const { data, isFetching } = useCatalog("manopera", {
    search: searchDebounced,
    page,
    limit: limitDebounced,
    // Trimitem noile filtre avansate
    cod: advancedFiltersDebounced.cod,
    denumire: advancedFiltersDebounced.denumire,
    variante: advancedFiltersDebounced.variante,
    descriere: advancedFiltersDebounced.descriere,
    cost: advancedFiltersDebounced.cost,
    unitate: advancedFiltersDebounced.unitate === "all" ? "" : advancedFiltersDebounced.unitate,
    limba: advancedFiltersDebounced.limba === "all" ? "" : advancedFiltersDebounced.limba,
    sortBy: advancedFiltersDebounced.sortBy,
    sortOrder: advancedFiltersDebounced.sortOrder,
  });
  const { mutateAsync: deleteDefinitie } = useDeleteCatalogDef();

  const manopereList = data?.items || [];
  const totalItems = data?.total || 0;
  const totalPages = data?.totalPages || 1;
  // --- ACȚIUNI ---

  const handleAddClick = () => {
    setDraft(null);
    setOpenAddDef(true);
  };

  // Deschide dialogul și setează item-ul
  const handleDeleteClick = useCallback((parent) => {
    setItemToDelete(parent);
    setDeleteDialogOpen(true);
  }, []);

  // Rulează când userul apasă pe "Șterge" în dialog
  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    show();
    try {
      console.log("Ștergem manopera cu ID:", itemToDelete.id);
      await deleteDefinitie({
        id: itemToDelete.id,
        tip_resursa: "manopera", // Trimitem asta ca să știe React Query ce cache să invalideze
      });
      toast.success("Manopera a fost ștearsă cu succes.");
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Eroare la ștergerea manoperei.");
    } finally {
      hide();
    }
  };

  const handleDuplicateClick = useCallback((parent) => {
    setDraft({
      ...parent,
      cod_definitie: "",
      isDuplicate: true, // Un flag ascuns ca să știe dialogul că dublăm, nu edităm
    });
    setOpenAddDef(true);
  }, []);

  return (
    <div className="h-full w-full flex justify-center overflow-hidden items-center">
      <div className="w-[95%] h-[95%] flex flex-col p-4 gap-4 overflow-hidden bg-background relative rounded-lg">
        {/* --- 1. HEADER (EXTRAS ÎN COMPONENTĂ) --- */}
        <ManoperaFilters
          search={search}
          setSearch={setSearch}
          totalItems={totalItems}
          onAddClick={handleAddClick}
          displayLang={displayLang}
          onDisplayLangToggle={() => setDisplayLang((prev) => (prev === "RO" ? "FR" : "RO"))}
          visibleColumns={visibleColumns}
          toggleCol={toggleCol}
          advancedFilters={advancedFilters}
          setAdvancedFilters={setAdvancedFilters}
        />

        {/* --- 2. LISTA ȘI PAGINAREA (MEREU VIZIBILE) --- */}
        <div className="flex-1 w-full bg-card rounded-lg overflow-hidden relative shadow-base border border-border flex flex-col">
          <div className="flex-1 p-5 overflow-hidden flex flex-col relative">
            {manopereList.length > 0 ? (
              <ManoperaList
                manopere={manopereList}
                visibleColumns={visibleColumns}
                setDraft={setDraft}
                setOpen={setOpenAddDef}
                handleDeleteClick={handleDeleteClick}
                handleDuplicateClick={handleDuplicateClick}
                displayLang={displayLang}
              />
            ) : (
              <div className="flex-1 w-full flex justify-center items-center rounded-lg border border-border bg-muted/10">
                <span className="text-xl text-muted-foreground italic">
                  {searchDebounced.trim() === "" && advancedFiltersDebounced.cod === ""
                    ? "Nu am găsit nicio manoperă conform criteriilor de căutare."
                    : "Nu am găsit nicio manoperă conform criteriilor de căutare."}
                </span>
              </div>
            )}

            {isFetching && !loading && <SpinnerElement text={2} />}
          </div>

          {/* PAGINARE BAZĂ */}
          <div className="shrink-0 border-t border-border bg-muted/10 p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base text-foreground font-medium">Arată:</span>
              <Input
                type="text"
                value={limitInput}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "" || (/^\d+$/.test(val) && parseInt(val) <= 999)) setLimitInput(val);
                }}
                onBlur={() => {
                  if (limitInput === "" || parseInt(limitInput) < 1) setLimitInput("50");
                }}
                className="w-[60px] h-8 text-center bg-background text-foreground px-2"
              />
              <span className="text-base text-foreground font-medium">rânduri</span>
            </div>

            <div className="flex items-center gap-4">
              <Button className="bg-indigo-600 hover:bg-indigo-700" variant="default" size="lg" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                <FontAwesomeIcon icon={faChevronLeft} className="text-sm " /> Înapoi
              </Button>
              <span className="text-base font-semibold text-foreground">
                Pagina {page} / {totalPages || 1}
              </span>
              <Button className="bg-indigo-600 hover:bg-indigo-700" variant="default" size="lg" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= (totalPages || 1)}>
                Înainte <FontAwesomeIcon icon={faChevronRight} className="text-sm" />
              </Button>
            </div>
          </div>
        </div>
      </div>
      <DeleteDialog
        open={deleteDialogOpen}
        setOpen={setDeleteDialogOpen}
        title="Șterge Manopera"
        description={`Ești sigur că vrei să ștergi manopera "${itemToDelete?.denumire}"? Această acțiune va șterge și variantele asociate.`}
        onSubmit={handleConfirmDelete}
        useCode={false} // Cum ai cerut, fără cod
      />
      <ManoperaDefDialog open={openAddDef} setOpen={setOpenAddDef} mode={draft ? "edit" : "add"} initialData={draft} />
    </div>
  );
}
