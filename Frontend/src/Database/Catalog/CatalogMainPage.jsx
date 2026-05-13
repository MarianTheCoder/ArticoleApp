import React, { useCallback, useContext, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronLeft, faChevronRight } from "@fortawesome/free-solid-svg-icons";

import { useLoading } from "@/context/LoadingContext";
import { AuthContext } from "@/context/TokenContext";

// --- CONFIGURAȚIA GLOBALĂ ---
import { resurseConfig } from "./resurseConfig";

// --- HOOK-URI ---
import { useCatalog, useDeleteCatalogDef } from "@/hooks/Database/useCatalog";

// --- COMPONENTE COPIL UNIFICATE ---
import CatalogFilters from "./CatalogFilters";
import CatalogList from "./CatalogList";
import CatalogDefDialog from "./CatalogDefDialog";
import SpinnerElement from "@/MainElements/SpinnerElement";
import DeleteDialog from "@/components/ui/delete-dialog";
import { toast } from "sonner";

export default function CatalogMainPage({ tipResursa, isSelectionMode = false, onSelectElement, selectedItemId = null, lockedLang = null }) {
  const { loading, show, hide } = useLoading();
  const { user } = useContext(AuthContext);
  const effectiveLockedLang = isSelectionMode && lockedLang ? lockedLang : null;

  // Extragem configurația pentru resursa curentă
  const config = resurseConfig[tipResursa];

  // --- STATE DIALOGURI ---
  const [openAddDef, setOpenAddDef] = useState(false);
  const [draft, setDraft] = useState(null);

  // --- STATE PENTRU DIALOGUL DE ȘTERGERE ---
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  // --- VISIBILITY STATE (COLOANE) ---
  const [visibleColumns, setVisibleColumns] = useState({
    poza: config.hasPhoto, // Se activează doar dacă resursa suportă poză (ex: materiale, utilaje)
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

  // Când schimbăm resursa din router, updatăm automat dacă afișăm sau nu poza
  useEffect(() => {
    setVisibleColumns((prev) => ({ ...prev, poza: config.hasPhoto }));
  }, [tipResursa, config.hasPhoto]);

  // --- STATE FILTRE & PAGINARE ---
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");

  const [page, setPage] = useState(1);
  const [limitInput, setLimitInput] = useState("50");
  const [limitDebounced, setLimitDebounced] = useState(50);

  const [displayLang, setDisplayLang] = useState("RO");

  // STATE FILTRE AVANSATE
  const getDefaultAdvancedFilters = useCallback(
    () => ({
      cod: "",
      denumire: "",
      variante: "0",
      cost: "",
      unitate: "all",
      limba: effectiveLockedLang || "all",
      sortBy: "updated_at",
      sortOrder: "desc",
    }),
    [effectiveLockedLang],
  );

  const [advancedFilters, setAdvancedFilters] = useState(() => getDefaultAdvancedFilters());
  const [advancedFiltersDebounced, setAdvancedFiltersDebounced] = useState(() => getDefaultAdvancedFilters());

  // Resetăm filtrele atunci când schimbăm resursa
  useEffect(() => {
    setSearch("");
    const defaults = getDefaultAdvancedFilters();
    setDisplayLang("RO");
    setAdvancedFilters(defaults);
    setAdvancedFiltersDebounced(defaults);
    setPage(1);
  }, [tipResursa, getDefaultAdvancedFilters]);

  // --- DEBOUNCE PENTRU TOATE FILTRELE ---
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchDebounced(search);
      setAdvancedFiltersDebounced({
        ...advancedFilters,
        limba: effectiveLockedLang || advancedFilters.limba,
      });

      let parsedLimit = parseInt(limitInput);
      if (isNaN(parsedLimit) || parsedLimit < 1) parsedLimit = 50;
      setLimitDebounced(parsedLimit);

      setPage(1);
    }, 500);
    return () => clearTimeout(handler);
  }, [search, limitInput, advancedFilters, effectiveLockedLang]);

  const toggleCol = (key, val) => {
    setVisibleColumns((prev) => ({ ...prev, [key]: val }));
  };

  // --- DATA FETCHING (GET) DIN BACKEND ---
  const { data, isFetching } = useCatalog(tipResursa, {
    search: searchDebounced,
    page,
    limit: limitDebounced,
    cod: advancedFiltersDebounced.cod,
    denumire: advancedFiltersDebounced.denumire,
    variante: advancedFiltersDebounced.variante,
    descriere: advancedFiltersDebounced.descriere,
    cost: advancedFiltersDebounced.cost,
    unitate: advancedFiltersDebounced.unitate === "all" ? "" : advancedFiltersDebounced.unitate,
    limba: effectiveLockedLang || (advancedFiltersDebounced.limba === "all" ? "" : advancedFiltersDebounced.limba),
    sortBy: advancedFiltersDebounced.sortBy,
    sortOrder: advancedFiltersDebounced.sortOrder,
  });

  const { mutateAsync: deleteDefinitie } = useDeleteCatalogDef();

  const resurseList = data?.items || [];
  const totalItems = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  // --- ACȚIUNI ---
  const handleAddClick = () => {
    setDraft(null);
    setOpenAddDef(true);
  };

  const handleDeleteClick = useCallback((parent) => {
    setItemToDelete(parent);
    setDeleteDialogOpen(true);
  }, []);

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    show();
    try {
      await deleteDefinitie({
        id: itemToDelete.id,
        tip_resursa: tipResursa,
      });
      toast.success(`${config.title} a fost șters cu succes.`, { position: "top-right" });
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    } catch (error) {
      toast.error(error?.response?.data?.message || `Eroare la ștergerea elementului.`, { position: "top-right" });
    } finally {
      hide();
    }
  };

  const handleDuplicateClick = useCallback((parent) => {
    setDraft({
      ...parent,
      cod_definitie: "",
      isDuplicate: true,
    });
    setOpenAddDef(true);
  }, []);

  return (
    <div className="h-full w-full flex justify-center overflow-hidden items-center">
      <div className={`${!isSelectionMode ? "w-[95%] h-[95%] rounded-lg" : "rounded-t-lg w-full h-full"} flex flex-col p-4 gap-4 overflow-hidden bg-background relative `}>
        {/* --- 1. HEADER (FILTRE) --- */}
        <CatalogFilters
          config={config} // Trimitem configuratia dinamica
          search={search}
          setSearch={setSearch}
          totalItems={totalItems}
          onAddClick={handleAddClick}
          displayLang={displayLang}
          onDisplayLangToggle={() => {
            setDisplayLang((prev) => (prev === "RO" ? "FR" : "RO"));
          }}
          visibleColumns={visibleColumns}
          toggleCol={toggleCol}
          advancedFilters={advancedFilters}
          setAdvancedFilters={(updater) => {
            setAdvancedFilters((prev) => {
              const next = typeof updater === "function" ? updater(prev) : updater;
              return effectiveLockedLang ? { ...next, limba: effectiveLockedLang } : next;
            });
          }}
          lockedLang={effectiveLockedLang}
        />

        {/* --- 2. LISTA ȘI PAGINAREA --- */}
        <div className="flex-1 w-full bg-card rounded-lg overflow-hidden relative shadow-base border border-border flex flex-col">
          <div className="flex-1 p-5 overflow-hidden flex flex-col relative">
            {resurseList.length > 0 ? (
              <CatalogList
                config={config} // Trimitem configuratia
                catalogItems={resurseList}
                visibleColumns={visibleColumns}
                setDraft={setDraft}
                setOpen={setOpenAddDef}
                handleDeleteClick={handleDeleteClick}
                handleDuplicateClick={handleDuplicateClick}
                displayLang={displayLang}
                // selectie
                isSelectionMode={isSelectionMode}
                selectedItemId={selectedItemId}
                onSelectElement={onSelectElement}
              />
            ) : (
              <div className="flex-1 w-full flex justify-center items-center rounded-lg border border-border bg-muted/10">
                <span className="text-xl text-muted-foreground italic">
                  {searchDebounced.trim() === "" && advancedFiltersDebounced.cod === ""
                    ? `Nu am găsit niciun/nicio ${config.title.toLowerCase()} conform criteriilor de căutare.`
                    : `Nu am găsit niciun/nicio ${config.title.toLowerCase()} conform criteriilor de căutare.`}
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
              <Button variant="default" size="lg" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className={config.hoverButton}>
                <FontAwesomeIcon icon={faChevronLeft} className="text-sm" /> Înapoi
              </Button>
              <span className="text-base font-semibold text-foreground">
                Pagina {page} / {totalPages || 1}
              </span>
              <Button variant="default" size="lg" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= (totalPages || 1)} className={config.hoverButton}>
                Înainte <FontAwesomeIcon icon={faChevronRight} className="text-sm" />
              </Button>
            </div>
          </div>
        </div>
      </div>
      <DeleteDialog
        open={deleteDialogOpen}
        setOpen={setDeleteDialogOpen}
        title={`Șterge ${config.title}`}
        description={`Ești sigur că vrei să ștergi ${config.title.toLowerCase()}ul "${itemToDelete?.denumire}"? Această acțiune va șterge și variantele asociate.`}
        onSubmit={handleConfirmDelete}
        useCode={false}
      />
      <CatalogDefDialog config={config} open={openAddDef} setOpen={setOpenAddDef} mode={draft ? "edit" : "add"} initialData={draft} tipResursa={tipResursa} />
    </div>
  );
}
