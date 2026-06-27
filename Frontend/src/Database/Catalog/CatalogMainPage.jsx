import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBan, faChevronLeft, faChevronRight } from "@fortawesome/free-solid-svg-icons";

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

const TEXT_ALIGN_STORAGE_KEY = "catalog_text_align";
const VIEW_MODE_STORAGE_KEY = "catalog_view_mode";
const VISIBLE_COLUMNS_STORAGE_PREFIX = "catalog_visible_columns";

const getDefaultVisibleColumns = (config) => ({
  poza: config.hasPhoto,
  limba: true,
  variante: true,
  cod: true,
  clasa1: false,
  clasa2: false,
  denumire: true,
  descriere: false,
  furnizor: config.hasFurnizor,
  marca: config.id === "material" || config.id === "utilaj",
  status: config.hasStatus,
  greutate: config.id === "material",
  unitate: true,
  cost: true,
  creat: false,
  actualizat: false,
});

const getVisibleColumnsStorageKey = (tipResursa) => `${VISIBLE_COLUMNS_STORAGE_PREFIX}_${tipResursa || "default"}`;

const readVisibleColumns = (tipResursa, config) => {
  const defaults = getDefaultVisibleColumns(config);

  try {
    const saved = JSON.parse(localStorage.getItem(getVisibleColumnsStorageKey(tipResursa)) || "null");
    if (saved && typeof saved === "object") {
      return {
        ...defaults,
        ...saved,
        poza: config.hasPhoto ? Boolean(saved.poza ?? defaults.poza) : false,
        furnizor: config.hasFurnizor ? Boolean(saved.furnizor ?? defaults.furnizor) : false,
        marca: config.id === "material" || config.id === "utilaj" ? Boolean(saved.marca ?? defaults.marca) : false,
        status: config.hasStatus ? Boolean(saved.status ?? defaults.status) : false,
        greutate: config.id === "material" ? Boolean(saved.greutate ?? defaults.greutate) : false,
      };
    }
  } catch {}

  return defaults;
};

const saveVisibleColumns = (tipResursa, value) => {
  try {
    localStorage.setItem(getVisibleColumnsStorageKey(tipResursa), JSON.stringify(value));
  } catch {}
};

export default function CatalogMainPage({
  tipResursa,
  isSelectionMode = false,
  onSelectElement,
  selectedItemId = null,
  selectedItemIds = [],
  selectedCount = 0,
  selectedLabel = "",
  onClearSelection,
  onConfirmSelection,
  lockedLang = null,
  allowSelectionViewMode = false,
  lockedViewMode = null,
  initialViewMode = null,
}) {
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
  const [visibleColumns, setVisibleColumns] = useState(() => readVisibleColumns(tipResursa, config));

  useEffect(() => {
    setVisibleColumns(readVisibleColumns(tipResursa, config));
  }, [tipResursa, config.hasPhoto, config.id]);

  // --- STATE FILTRE & PAGINARE ---
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");

  const [page, setPage] = useState(1);
  const [limitInput, setLimitInput] = useState("50");
  const [limitDebounced, setLimitDebounced] = useState(50);

  const [displayLang, setDisplayLang] = useState(effectiveLockedLang || "RO");
  const [decimalPlaces, setDecimalPlaces] = useState(2);
  const [textAlign, setTextAlign] = useState(() => {
    try {
      const saved = localStorage.getItem(TEXT_ALIGN_STORAGE_KEY);
      if (saved === "left" || saved === "center" || saved === "right") return saved;
    } catch {}
    return "center";
  });
  const [columnResetKey, setColumnResetKey] = useState(0);

  // View mode: "definitii" (clasic) sau "variante" (listă plată de variante).
  const [viewMode, setViewMode] = useState(() => {
    if (initialViewMode === "variante" || initialViewMode === "definitii") return initialViewMode;
    try {
      return localStorage.getItem(VIEW_MODE_STORAGE_KEY) === "variante" ? "variante" : "definitii";
    } catch {
      return "definitii";
    }
  });
  const effectiveViewMode = lockedViewMode === "variante" || lockedViewMode === "definitii" ? lockedViewMode : viewMode;
  const effectiveIsVariantView = (!isSelectionMode || allowSelectionViewMode || Boolean(lockedViewMode)) && effectiveViewMode === "variante";
  const viewModeLabel = effectiveIsVariantView ? "Variante" : "Definiții";

  const handleToggleViewMode = useCallback(() => {
    if (lockedViewMode) return;
    if (isSelectionMode) onClearSelection?.();
    setViewMode((prev) => (prev === "variante" ? "definitii" : "variante"));
  }, [isSelectionMode, lockedViewMode, onClearSelection]);

  useEffect(() => {
    try {
      localStorage.setItem(VIEW_MODE_STORAGE_KEY, viewMode);
    } catch {}
  }, [viewMode]);

  useEffect(() => {
    setPage(1);
  }, [effectiveIsVariantView]);

  useEffect(() => {
    try {
      localStorage.setItem(TEXT_ALIGN_STORAGE_KEY, textAlign);
    } catch {}
  }, [textAlign]);

  // STATE FILTRE AVANSATE
  const getDefaultAdvancedFilters = useCallback(
    () => ({
      cod: "",
      denumire: "",
      variante: "0",
      furnizor_id: "",
      marca_id: "",
      status: "all",
      greutate: "",
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
    setDisplayLang(effectiveLockedLang || "RO");
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

  const toggleCol = useCallback(
    (key, val) => {
      setVisibleColumns((prev) => {
        const next = {
          ...prev,
          [key]: val,
        };
        saveVisibleColumns(tipResursa, next);
        return next;
      });
    },
    [tipResursa],
  );

  // --- DATA FETCHING (GET) DIN BACKEND ---
  const { data, isFetching } = useCatalog(tipResursa, {
    search: searchDebounced,
    page,
    limit: limitDebounced,
    cod: advancedFiltersDebounced.cod,
    denumire: advancedFiltersDebounced.denumire,
    variante: effectiveIsVariantView ? "1" : advancedFiltersDebounced.variante,
    descriere: advancedFiltersDebounced.descriere,
    furnizor_id: advancedFiltersDebounced.furnizor_id,
    marca_id: advancedFiltersDebounced.marca_id,
    status: advancedFiltersDebounced.status === "all" ? "" : advancedFiltersDebounced.status,
    cost: advancedFiltersDebounced.cost,
    greutate: advancedFiltersDebounced.greutate,
    unitate: advancedFiltersDebounced.unitate === "all" ? "" : advancedFiltersDebounced.unitate,
    limba: effectiveLockedLang || (advancedFiltersDebounced.limba === "all" ? "" : advancedFiltersDebounced.limba),
    sortBy: advancedFiltersDebounced.sortBy,
    sortOrder: advancedFiltersDebounced.sortOrder,
  });

  const { mutateAsync: deleteDefinitie } = useDeleteCatalogDef();

  const totalItems = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  // În view-ul "variante" aplatizăm: un rând per variantă, păstrând definiția-părinte (__parent) cu toate variantele pentru a deschide CatalogSubList neschimbat.
  const displayItems = useMemo(() => {
    const list = data?.items || [];
    if (!effectiveIsVariantView) return list;

    return list.flatMap((parent) =>
      (parent.subcategorii || []).map((sub) => ({
        ...parent,
        __parent: parent,
        __sub: sub,
        id: `${parent.id}:${sub.id}`,
        cod_definitie: sub.cod_specific || parent.cod_definitie,
        descriere: sub.descriere ?? parent.descriere,
        descriere_fr: sub.descriere_fr ?? parent.descriere_fr,
        cost: sub.cost ?? parent.cost,
        photo_url: sub.photo_url || parent.photo_url,
      })),
    );
  }, [data, effectiveIsVariantView]);

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
      <div
        className={`${!isSelectionMode ? "w-[95%] h-[92%] rounded-lg overflow-visible" : "rounded-t-lg w-full h-full overflow-hidden"} isolate flex flex-col p-2 xxxl:p-3 gap-2 xxxl:gap-3 bg-background relative `}
      >
        {/* --- 1. HEADER (FILTRE) --- */}
        <CatalogFilters
          config={config} // Trimitem configuratia dinamica
          search={search}
          setSearch={setSearch}
          totalItems={totalItems}
          onAddClick={handleAddClick}
          displayLang={displayLang}
          onDisplayLangToggle={() => setDisplayLang((prev) => (prev === "RO" ? "FR" : "RO"))}
          decimalPlaces={decimalPlaces}
          setDecimalPlaces={setDecimalPlaces}
          textAlign={textAlign}
          setTextAlign={setTextAlign}
          onResetColumnWidths={() => setColumnResetKey((prev) => prev + 1)}
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
          showAdvancedFilters={false}
          viewMode={effectiveIsVariantView ? "variante" : "definitii"}
          onToggleViewMode={!lockedViewMode && (!isSelectionMode || allowSelectionViewMode) ? handleToggleViewMode : undefined}
          viewModeLabel={viewModeLabel}
          viewModeLocked={Boolean(lockedViewMode)}
        />

        {/* --- 2. LISTA ȘI PAGINAREA --- */}
        <div className="flex-1 w-full bg-card rounded-lg overflow-hidden relative shadow-base border border-border flex flex-col">
          <div className="flex-1 p-2 xxxl:p-3 overflow-hidden flex flex-col relative">
            <CatalogList
              config={config} // Trimitem configuratia
              catalogItems={displayItems}
              viewMode={effectiveIsVariantView ? "variante" : "definitii"}
              visibleColumns={visibleColumns}
              setDraft={setDraft}
              setOpen={setOpenAddDef}
              handleDeleteClick={handleDeleteClick}
              handleDuplicateClick={handleDuplicateClick}
              displayLang={displayLang}
              // selectie
              isSelectionMode={isSelectionMode}
              selectedItemId={selectedItemId}
              selectedItemIds={selectedItemIds}
              onSelectElement={onSelectElement}
              // sortare / afisare
              sortBy={advancedFilters.sortBy}
              sortOrder={advancedFilters.sortOrder}
              decimalPlaces={decimalPlaces}
              textAlign={textAlign}
              columnResetKey={columnResetKey}
              onSortChange={(sortBy, sortOrder) => {
                setAdvancedFilters((prev) => ({
                  ...prev,
                  sortBy,
                  sortOrder,
                }));
              }}
              onClearSelection={onClearSelection}
              onConfirmSelection={onConfirmSelection}
              advancedFilters={advancedFilters}
              setAdvancedFilters={(updater) => {
                setAdvancedFilters((prev) => {
                  const next = typeof updater === "function" ? updater(prev) : updater;
                  return effectiveLockedLang ? { ...next, limba: effectiveLockedLang } : next;
                });
              }}
              lockedLang={effectiveLockedLang}
              emptyMessage={`Nu am găsit niciun/nicio ${config.title.toLowerCase()} conform criteriilor de căutare.`}
            />

            {isFetching && !loading && <SpinnerElement text={2} />}
          </div>

          {/* PAGINARE BAZĂ */}
          <div className="shrink-0 border-t border-border bg-muted/10 p-2 xxxl:p-2.5 flex items-center justify-between">
            <div className="flex items-center gap-1.5 xxxl:gap-2">
              <span className="text-sm xxxl:text-base text-foreground font-medium">Arată:</span>
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
                className="w-[54px] xxxl:w-[60px] h-8 text-sm xxxl:text-base text-center bg-background text-foreground px-2"
              />
              <span className="text-sm xxxl:text-base text-foreground font-medium">rânduri</span>
            </div>

            <div className="flex items-center gap-3 xxxl:gap-4">
              {isSelectionMode && selectedCount > 0 && (
                <>
                  <div data-catalog-selection-keep className="flex h-9 items-center gap-2 rounded-md border border-primary/40 bg-primary/10 px-2 py-1">
                    <span className="text-sm font-black text-primary">{selectedLabel || `${selectedCount} selectate`}</span>
                  </div>
                  <Button data-catalog-selection-keep type="button" variant="destructive" onClick={onClearSelection} className="h-9 px-2 text-sm font-bold">
                    <FontAwesomeIcon icon={faBan} />
                    Anulează selecția
                  </Button>
                </>
              )}
              <Button
                variant="default"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className={`h-9 xxxl:h-10 px-3 xxxl:px-4 text-sm xxxl:text-base ${config.hoverButton}`}
              >
                <FontAwesomeIcon icon={faChevronLeft} className="text-sm" /> Înapoi
              </Button>
              <span className="text-sm xxxl:text-base font-semibold text-foreground">
                Pagina {page} / {totalPages || 1}
              </span>
              <Button
                variant="default"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= (totalPages || 1)}
                className={`h-9 xxxl:h-10 px-3 xxxl:px-4 text-sm xxxl:text-base ${config.hoverButton}`}
              >
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
