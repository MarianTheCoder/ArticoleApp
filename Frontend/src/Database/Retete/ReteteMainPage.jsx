import React, { useCallback, useContext, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronLeft, faChevronRight, faDatabase } from "@fortawesome/free-solid-svg-icons";

import { useLoading } from "@/context/LoadingContext";
import { AuthContext } from "@/context/TokenContext";

// --- HOOK-URI ---
import { useRetete, useDeleteReteta } from "@/hooks/Database/useRetete";

// --- COMPONENTE COPIL UNIFICATE ---
import ReteteFilters from "./ReteteFilters";
import ReteteList from "./ReteteList";
import ReteteDefDialog from "./ReteteDefDialog";
import SpinnerElement from "@/MainElements/SpinnerElement";
import DeleteDialog from "@/components/ui/delete-dialog";
import { toast } from "sonner";

export default function ReteteMainPage({ isEmbedded = false, isSelectionMode = false, selectedRetetaId = null, onSelectReteta, lockedLang = null }) {
  const { loading, show, hide } = useLoading();
  const { user } = useContext(AuthContext);

  const effectiveLockedLang = isSelectionMode && lockedLang ? lockedLang : null;

  // --- STATE DIALOGURI ---
  const [openAddDef, setOpenAddDef] = useState(false);
  const [draft, setDraft] = useState(null);

  // --- STATE PENTRU DIALOGUL DE ȘTERGERE ---
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  // --- VISIBILITY STATE (COLOANE - potrivite 1:1 cu DB-ul) ---
  const [visibleColumns, setVisibleColumns] = useState({
    limba: true,
    elemente: true,
    cod: true,
    clasa: true,
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

  const [displayLang, setDisplayLang] = useState("RO");

  // STATE FILTRE AVANSATE
  const [advancedFilters, setAdvancedFilters] = useState({
    cod: "",
    clasa_reteta: "",
    denumire: "",
    descriere: "",
    unitate: "all",
    limba: effectiveLockedLang || "all",
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

      setPage(1);
    }, 500);
    return () => clearTimeout(handler);
  }, [search, limitInput, advancedFilters]);

  const toggleCol = useCallback((key, val) => {
    setVisibleColumns((prev) => ({ ...prev, [key]: val }));
  }, []);

  // --- DATA FETCHING (GET) DIN BACKEND ---
  const { data, isFetching } = useRetete({
    search: searchDebounced,
    page,
    limit: limitDebounced,
    cod: advancedFiltersDebounced.cod,
    clasa_reteta: advancedFiltersDebounced.clasa_reteta,
    denumire: advancedFiltersDebounced.denumire,
    descriere: advancedFiltersDebounced.descriere,
    unitate: advancedFiltersDebounced.unitate === "all" ? "" : advancedFiltersDebounced.unitate,
    limba: effectiveLockedLang || (advancedFiltersDebounced.limba === "all" ? "" : advancedFiltersDebounced.limba),
    sortBy: advancedFiltersDebounced.sortBy,
    sortOrder: advancedFiltersDebounced.sortOrder,
  });

  const { mutateAsync: deleteReteta } = useDeleteReteta();

  const reteteList = data?.items || [];
  const totalItems = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  // --- ACȚIUNI ---
  const handleAddClick = useCallback(() => {
    setDraft(null);
    setOpenAddDef(true);
  }, []);

  const handleDeleteClick = useCallback((parent) => {
    setItemToDelete(parent);
    setDeleteDialogOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!itemToDelete) return;
    show();
    try {
      await deleteReteta({
        id: itemToDelete.id,
      });
      toast.success(`Rețeta a fost ștearsă cu succes.`, { position: "top-right" });
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    } catch (error) {
      toast.error(error?.response?.data?.message || `Eroare la ștergerea rețetei.`, { position: "top-right" });
    } finally {
      hide();
    }
  }, [itemToDelete, deleteReteta, show, hide]);

  const handleDuplicateClick = useCallback((parent) => {
    setDraft({
      ...parent,
      cod_reteta: "",
      isDuplicate: true,
    });
    setOpenAddDef(true);
  }, []);

  return (
    <div className="h-full w-full flex justify-center overflow-hidden items-center">
      <div
        className={
          isEmbedded ? "w-full h-full flex flex-col p-4 gap-4 overflow-hidden bg-background relative" : "w-[95%] h-[95%] flex flex-col p-4 gap-4 overflow-hidden bg-background relative rounded-lg"
        }
      >
        {/* --- 1. HEADER (FILTRE) --- */}
        <ReteteFilters
          search={search}
          setSearch={setSearch}
          totalItems={totalItems}
          onAddClick={handleAddClick}
          displayLang={displayLang}
          onDisplayLangToggle={() => setDisplayLang((prev) => (prev === "RO" ? "FR" : "RO"))}
          visibleColumns={visibleColumns}
          toggleCol={toggleCol}
          advancedFilters={advancedFilters}
          lockedLang={effectiveLockedLang}
          setAdvancedFilters={(updater) => {
            setAdvancedFilters((prev) => {
              const next = typeof updater === "function" ? updater(prev) : updater;
              return effectiveLockedLang ? { ...next, limba: effectiveLockedLang } : next;
            });
          }}
        />

        {/* --- 2. LISTA ȘI PAGINAREA --- */}
        <div className="flex-1 w-full bg-card rounded-lg overflow-hidden relative shadow-base border border-border flex flex-col">
          <div className="flex-1 p-5 overflow-hidden flex flex-col relative">
            {reteteList.length > 0 ? (
              <ReteteList
                reteteItems={reteteList}
                visibleColumns={visibleColumns}
                setDraft={setDraft}
                setOpen={setOpenAddDef}
                handleDeleteClick={handleDeleteClick}
                handleDuplicateClick={handleDuplicateClick}
                displayLang={displayLang}
                isSelectionMode={isSelectionMode}
                selectedRetetaId={selectedRetetaId}
                onSelectReteta={onSelectReteta}
              />
            ) : (
              <div className="flex-1 w-full flex justify-center items-center rounded-lg border border-border bg-muted/10">
                <span className="text-xl text-muted-foreground italic">
                  {searchDebounced.trim() === "" && advancedFiltersDebounced.cod === ""
                    ? `Nu am găsit nicio rețetă conform criteriilor de căutare.`
                    : `Nu am găsit nicio rețetă conform criteriilor de căutare.`}
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
              <Button variant="default" size="lg" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="bg-sky-600 hover:bg-sky-700 text-white">
                <FontAwesomeIcon icon={faChevronLeft} className="text-sm" /> Înapoi
              </Button>
              <span className="text-base font-semibold text-foreground">
                Pagina {page} / {totalPages || 1}
              </span>
              <Button variant="default" size="lg" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= (totalPages || 1)} className="bg-sky-600 hover:bg-sky-700 text-white">
                Înainte <FontAwesomeIcon icon={faChevronRight} className="text-sm" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <DeleteDialog
        open={deleteDialogOpen}
        setOpen={setDeleteDialogOpen}
        title="Șterge Rețeta"
        description={`Ești sigur că vrei să ștergi rețeta "${itemToDelete?.denumire}"? Această acțiune va șterge și asocierile cu materialele/utilajele din ea.`}
        onSubmit={handleConfirmDelete}
        useCode={false}
      />

      <ReteteDefDialog open={openAddDef} setOpen={setOpenAddDef} mode={draft ? "edit" : "add"} initialData={draft} />
    </div>
  );
}
