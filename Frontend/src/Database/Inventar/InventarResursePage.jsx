import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBan, faBoxOpen, faSort, faSortDown, faSortUp } from "@fortawesome/free-solid-svg-icons";
import { toast } from "sonner";

import CatalogFilters from "@/Database/Catalog/CatalogFilters";
import { resurseConfig } from "@/Database/Catalog/resurseConfig";
import SpinnerElement from "@/MainElements/SpinnerElement";
import InventarCatalogSelectDialog from "./components/Dialogs/InventarCatalogSelectDialog";
import InventarResourceRow from "./InventarResourceRow";
import InventarVariantRow from "./InventarVariantRow";
import InventarStocTranzactieDialog from "./components/Dialogs/InventarStocTranzactieDialog";
import InventarIstoricDialog from "./components/Dialogs/InventarIstoricDialog";
import InventarHeaderFiltersRow from "./components/InventarHeaderFiltersRow";
import CatalogSubList from "@/Database/Catalog/CatalogSubList";
import { useAddResurse, useInventarResurse, useSantierResurse } from "@/hooks/Database/useInventar";

const COLUMN_WIDTHS_STORAGE_KEY = "inventar_column_widths";
const TEXT_ALIGN_STORAGE_KEY = "inventar_text_align";
const VIEW_MODE_STORAGE_KEY = "inventar_view_mode";
const VISIBLE_COLUMNS_STORAGE_PREFIX = "inventar_visible_columns";

const DEFAULT_COLUMN_WIDTHS = {
  expand: 34,
  poza: 64,
  limba: 64,
  variante: 64,
  cod: 105,
  clasa1: 130,
  clasa2: 130,
  denumire: 620,
  descriere: 320,
  furnizor: 118,
  marca: 112,
  status: 120,
  greutate: 110,
  unitate: 74,
  cost: 120,
  stocTotal: 110,
  stocInventar: 120,
  creat: 180,
  actualizat: 180,
};

const MIN_COLUMN_WIDTHS = {
  expand: 34,
  poza: 56,
  limba: 56,
  variante: 56,
  cod: 90,
  clasa1: 100,
  clasa2: 100,
  denumire: 260,
  descriere: 220,
  furnizor: 88,
  marca: 88,
  status: 90,
  greutate: 90,
  unitate: 64,
  cost: 90,
  stocTotal: 90,
  stocInventar: 100,
  creat: 150,
  actualizat: 150,
};

const SORT_FIELD_BY_COLUMN = {
  cod: "cod_definitie",
  denumire: "denumire",
  greutate: "greutate",
  cost: "cost",
  stocInventar: "stoc_inventar",
  stocTotal: "stoc_total",
  creat: "created_at",
  actualizat: "updated_at",
};

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
  cost: false,
  stocTotal: true,
  stocInventar: true,
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

const getVariantSelectionKey = (parent, sub) => `${parent?.inventar_resursa_id || parent?.id || "parent"}:${sub?.id || "variant"}`;

const buildVariantSelectionItem = (parent, sub) => ({
  key: getVariantSelectionKey(parent, sub),
  parent,
  sub,
});

const getVariantViewSub = (item) => item?.subcategorie || null;

const normalizeDecimalPlaces = (value) => ([1, 2].includes(Number(value)) ? Number(value) : 2);

const getTextAlignClasses = (textAlign) => {
  if (textAlign === "left") return { cell: "text-left", flex: "justify-start", tooltip: "left" };
  if (textAlign === "right") return { cell: "text-right", flex: "justify-end", tooltip: "right" };
  return { cell: "text-center", flex: "justify-center", tooltip: "center" };
};

const ResizableTableHead = ({ colKey, style, className = "", children, onResizeStart }) => {
  return (
    <TableHead style={style} className={`relative px-0 select-none ${className}`}>
      {children}
      <span
        onPointerDown={(event) => onResizeStart(event, colKey)}
        className="absolute right-0 top-0 z-40 flex h-[4rem] w-3 cursor-col-resize touch-none select-none items-center justify-center hover:bg-primary/20 xxxl:h-[4.5rem]"
      >
        <span className="h-14 w-[2px] rounded-full bg-foreground xxxl:h-16" />
      </span>
    </TableHead>
  );
};

export default function InventarResursePage({ inventar, tipResursa, location = null, locationName = "" }) {
  const config = resurseConfig[tipResursa];
  // location = lentila prin care privim stocul: magazia inventarului (default) sau un șantier.
  const resolvedLocation = location || { tip: "inventar", id: inventar?.id, limba: inventar?.limba };
  const isSantier = resolvedLocation.tip === "santier";
  const locationLimba = resolvedLocation.limba || inventar?.limba || "RO";
  const primaryStockLabel = isSantier ? "Stoc șantier" : "Stoc inventar";
  const addDialogContextType = isSantier ? "șantierul" : "inventarul";
  const addDialogContextName = locationName || inventar?.denumire || "";

  const [selectDialogOpen, setSelectDialogOpen] = useState(false);
  const [variantDialogOpen, setVariantDialogOpen] = useState(false);
  const [variantDialogParent, setVariantDialogParent] = useState(null);
  const [displayLang, setDisplayLang] = useState("RO");
  const [viewMode, setViewMode] = useState(() => {
    if (isSantier) return "variante";
    try {
      const saved = localStorage.getItem(VIEW_MODE_STORAGE_KEY);
      return saved === "variante" ? "variante" : "definitii";
    } catch {
      return "definitii";
    }
  });
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [page, setPage] = useState(1);
  const [limitInput, setLimitInput] = useState("50");
  const [limitDebounced, setLimitDebounced] = useState(50);
  const [visibleColumns, setVisibleColumns] = useState(() => readVisibleColumns(tipResursa, config));

  const [expandedResourceIds, setExpandedResourceIds] = useState(new Set());
  const [selectedVariantKeys, setSelectedVariantKeys] = useState([]);
  const [selectedVariantItemsByKey, setSelectedVariantItemsByKey] = useState({});
  const lastSelectedVariantKeyRef = useRef(null);
  const [transactionDialogOpen, setTransactionDialogOpen] = useState(false);
  const [transactionItems, setTransactionItems] = useState([]);
  const [transactionDefaults, setTransactionDefaults] = useState({ source: null, destination: null });
  const [istoricOpen, setIstoricOpen] = useState(false);
  const [istoricVariant, setIstoricVariant] = useState(null);
  const [decimalPlaces, setDecimalPlaces] = useState(2);
  const [textAlign, setTextAlign] = useState(() => {
    try {
      const saved = localStorage.getItem(TEXT_ALIGN_STORAGE_KEY);
      if (saved === "left" || saved === "center" || saved === "right") return saved;
    } catch {}
    return "center";
  });
  const [columnResetKey, setColumnResetKey] = useState(0);
  const [columnWidths, setColumnWidths] = useState(() => {
    try {
      const saved = localStorage.getItem(COLUMN_WIDTHS_STORAGE_KEY);
      if (saved) {
        return {
          ...DEFAULT_COLUMN_WIDTHS,
          ...JSON.parse(saved),
          expand: DEFAULT_COLUMN_WIDTHS.expand,
        };
      }
    } catch {}

    return DEFAULT_COLUMN_WIDTHS;
  });

  useEffect(() => {
    setDisplayLang("RO");
  }, [inventar?.id]);

  useEffect(() => {
    try {
      localStorage.setItem(VIEW_MODE_STORAGE_KEY, viewMode);
    } catch {}
  }, [viewMode]);

  useEffect(() => {
    try {
      localStorage.setItem(TEXT_ALIGN_STORAGE_KEY, textAlign);
    } catch {}
  }, [textAlign]);

  useEffect(() => {
    setVisibleColumns(readVisibleColumns(tipResursa, config));
  }, [tipResursa, config.hasPhoto, config.id]);

  useEffect(() => {
    try {
      localStorage.setItem(COLUMN_WIDTHS_STORAGE_KEY, JSON.stringify(columnWidths));
    } catch {}
  }, [columnWidths]);

  useEffect(() => {
    if (!columnResetKey) return;

    setColumnWidths(DEFAULT_COLUMN_WIDTHS);
    try {
      localStorage.removeItem(COLUMN_WIDTHS_STORAGE_KEY);
    } catch {}
  }, [columnResetKey]);

  const getDefaultAdvancedFilters = useCallback(
    () => ({
      cod: "",
      denumire: "",
      variante: "0",
      descriere: "",
      furnizor_id: "",
      marca_id: "",
      greutate: "",
      cost: "",
      stoc_inventar: "all",
      stoc_total: "all",
      unitate: "all",
      limba: "all",
      sortBy: "updated_at",
      sortOrder: "desc",
    }),
    [],
  );

  const [advancedFilters, setAdvancedFilters] = useState(() => getDefaultAdvancedFilters());
  const [advancedFiltersDebounced, setAdvancedFiltersDebounced] = useState(() => getDefaultAdvancedFilters());

  useEffect(() => {
    const defaults = getDefaultAdvancedFilters();
    setSearch("");
    setAdvancedFilters(defaults);
    setAdvancedFiltersDebounced(defaults);
    setPage(1);
    setExpandedResourceIds(new Set());
    setSelectedVariantKeys([]);
    setSelectedVariantItemsByKey({});
  }, [tipResursa, inventar?.id, resolvedLocation.id, getDefaultAdvancedFilters]);

  useEffect(() => {
    if (isSantier) setViewMode("variante");
  }, [isSantier, resolvedLocation.id, tipResursa]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchDebounced(search);
      setAdvancedFiltersDebounced(advancedFilters);

      let parsedLimit = parseInt(limitInput);
      if (Number.isNaN(parsedLimit) || parsedLimit < 1) parsedLimit = 50;
      setLimitDebounced(parsedLimit);
      setPage(1);
    }, 500);

    return () => clearTimeout(handler);
  }, [search, limitInput, advancedFilters]);

  useEffect(() => {
    setPage(1);
    setExpandedResourceIds(new Set());
  }, [viewMode]);

  const filters = useMemo(
    () => ({
      search: searchDebounced,
      page,
      limit: limitDebounced,
      cod: advancedFiltersDebounced.cod,
      denumire: advancedFiltersDebounced.denumire,
      descriere: advancedFiltersDebounced.descriere,
      variante: advancedFiltersDebounced.variante,
      furnizor_id: advancedFiltersDebounced.furnizor_id,
      marca_id: advancedFiltersDebounced.marca_id,
      greutate: advancedFiltersDebounced.greutate,
      cost: advancedFiltersDebounced.cost,
      stoc_inventar: advancedFiltersDebounced.stoc_inventar,
      stoc_total: advancedFiltersDebounced.stoc_total,
      unitate: advancedFiltersDebounced.unitate === "all" ? "" : advancedFiltersDebounced.unitate,
      sortBy: advancedFiltersDebounced.sortBy,
      sortOrder: advancedFiltersDebounced.sortOrder,
      view: viewMode,
    }),
    [advancedFiltersDebounced, limitDebounced, page, searchDebounced, viewMode],
  );

  const warehouseResurse = useInventarResurse(isSantier ? null : inventar?.id, tipResursa, filters);
  const santierResurse = useSantierResurse(isSantier ? resolvedLocation.id : null, tipResursa, locationLimba, filters);
  const { data, isFetching } = isSantier ? santierResurse : warehouseResurse;
  const { mutateAsync: addResurse } = useAddResurse();

  const items = data?.items || [];
  const totalItems = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  const expandableResourceIds = useMemo(
    () =>
      items
        .filter((item) => (item.subcategorii || []).length > 0)
        .map((item) => String(item.inventar_resursa_id || item.id))
        .filter(Boolean),
    [items],
  );

  const allResourcesExpanded = useMemo(() => expandableResourceIds.length > 0 && expandableResourceIds.every((id) => expandedResourceIds.has(id)), [expandableResourceIds, expandedResourceIds]);
  const isVariantView = viewMode === "variante";
  const viewModeLabel = isVariantView ? "Variante" : "Definiții";

  const handleToggleViewMode = useCallback(() => {
    setViewMode((prev) => (prev === "variante" ? "definitii" : "variante"));
  }, []);

  const selectedVariantItems = useMemo(() => selectedVariantKeys.map((key) => selectedVariantItemsByKey[key]).filter(Boolean), [selectedVariantItemsByKey, selectedVariantKeys]);

  // Lista plată a variantelor selectabile, în ordinea afișată — ancora pentru selecția pe interval cu Shift.
  // În view-ul „variante" sunt toate rândurile; în „definiții" doar variantele părinților expandați (cele vizibile).
  const orderedVariantEntries = useMemo(() => {
    const entries = [];
    if (isVariantView) {
      items.forEach((item) => {
        const sub = getVariantViewSub(item);
        if (sub) entries.push(buildVariantSelectionItem(item, sub));
      });
      return entries;
    }

    items.forEach((parent) => {
      if (!expandedResourceIds.has(String(parent.inventar_resursa_id || parent.id))) return;
      (parent.subcategorii || []).forEach((sub) => entries.push(buildVariantSelectionItem(parent, sub)));
    });
    return entries;
  }, [items, isVariantView, expandedResourceIds]);

  useEffect(() => {
    setSelectedVariantItemsByKey((prev) => {
      let changed = false;
      const next = { ...prev };

      items.forEach((parent) => {
        if (viewMode === "variante") {
          const sub = getVariantViewSub(parent);
          if (!sub) return;

          const key = getVariantSelectionKey(parent, sub);
          if (selectedVariantKeys.includes(key)) {
            next[key] = buildVariantSelectionItem(parent, sub);
            changed = true;
          }
          return;
        }

        (parent.subcategorii || []).forEach((sub) => {
          const key = getVariantSelectionKey(parent, sub);
          if (selectedVariantKeys.includes(key)) {
            next[key] = buildVariantSelectionItem(parent, sub);
            changed = true;
          }
        });
      });

      return changed ? next : prev;
    });
  }, [items, selectedVariantKeys, viewMode]);

  useEffect(() => {
    if (!variantDialogOpen || !variantDialogParent?.id) return;

    const freshParent = items.find((item) => Number(item.id) === Number(variantDialogParent.id));
    if (freshParent && freshParent !== variantDialogParent) {
      setVariantDialogParent(freshParent);
    }
  }, [items, variantDialogOpen, variantDialogParent]);

  // Adaugă resursele selectate pe locația curentă (șantier sau magazie) prin endpoint-ul generic.
  const handleConfirmSelect = async (selection) => {
    const mode = selection?.mode || "definitii";
    const selectedIds = Array.isArray(selection) ? selection : selection?.ids || [];

    if (mode === "variante") {
      const selectedItems = (selection?.items || [])
        .map((item) => {
          const parent = item.__parent || item.parent || item;
          const sub = item.__sub || item.sub || item.subcategorie;
          if (!parent?.id || !sub?.id) return null;

          return {
            key: `catalog:${parent.id}:${sub.id}`,
            parent,
            sub,
          };
        })
        .filter(Boolean);

      if (selectedItems.length === 0) {
        toast.error("Nu există variante valide pentru tranzacție.", { position: "top-right" });
        return { keepOpen: true };
      }

      setTransactionItems((prev) => {
        if (!transactionDialogOpen || prev.length === 0) return selectedItems;
        const byKey = new Map(prev.map((item) => [String(item.key), item]));
        selectedItems.forEach((item) => byKey.set(String(item.key), item));
        return Array.from(byKey.values());
      });
      setTransactionDefaults({
        source: null,
        destination: isSantier ? { type: "santier", santierId: resolvedLocation.id } : null,
      });
      setTransactionDialogOpen(true);
      return { keepOpen: !transactionDialogOpen };
    }

    try {
      await addResurse(isSantier ? { santier_id: resolvedLocation.id, limba: locationLimba, catalog_definitie_ids: selectedIds } : { inventar_id: inventar.id, catalog_definitie_ids: selectedIds });
      toast.success(isSantier ? "Resursele au fost adăugate pe șantier." : "Resursele au fost adăugate în inventar.", { position: "top-right" });
      return { keepOpen: false };
    } catch (error) {
      toast.error(error?.response?.data?.message || "Eroare la adăugarea resurselor.", { position: "top-right" });
      throw error;
    }
  };

  const toggleResourceExpand = useCallback((item) => {
    const id = String(item?.inventar_resursa_id || item?.id || "");
    if (!id) return;

    setExpandedResourceIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleToggleAllResources = useCallback(() => {
    setExpandedResourceIds((prev) => {
      const allExpanded = expandableResourceIds.length > 0 && expandableResourceIds.every((id) => prev.has(id));
      return allExpanded ? new Set() : new Set(expandableResourceIds);
    });
  }, [expandableResourceIds]);

  const handleToggleVariantSelect = useCallback(
    (parent, sub, event) => {
      const key = getVariantSelectionKey(parent, sub);

      // Shift = selectează intervalul dintre ancoră (ultimul rând atins) și rândul curent, în ordinea afișată.
      if (event?.shiftKey) {
        const orderedKeys = orderedVariantEntries.map((entry) => entry.key);
        const entryByKey = new Map(orderedVariantEntries.map((entry) => [entry.key, entry]));
        const anchorKey = orderedKeys.includes(lastSelectedVariantKeyRef.current) ? lastSelectedVariantKeyRef.current : key;
        const startIndex = orderedKeys.indexOf(anchorKey);
        const endIndex = orderedKeys.indexOf(key);

        if (startIndex !== -1 && endIndex !== -1) {
          const [from, to] = startIndex < endIndex ? [startIndex, endIndex] : [endIndex, startIndex];
          const rangeKeys = orderedKeys.slice(from, to + 1);

          setSelectedVariantItemsByKey((current) => {
            const next = { ...current };
            rangeKeys.forEach((rangeKey) => {
              const entry = entryByKey.get(rangeKey);
              if (entry) next[rangeKey] = entry;
            });
            return next;
          });
          setSelectedVariantKeys((prev) => [...new Set([...prev, ...rangeKeys])]);
          lastSelectedVariantKeyRef.current = key;
          return;
        }
      }

      lastSelectedVariantKeyRef.current = key;
      const item = buildVariantSelectionItem(parent, sub);

      setSelectedVariantKeys((prev) => {
        if (prev.includes(key)) {
          setSelectedVariantItemsByKey((current) => {
            const next = { ...current };
            delete next[key];
            return next;
          });
          return prev.filter((itemKey) => itemKey !== key);
        }

        setSelectedVariantItemsByKey((current) => ({
          ...current,
          [key]: item,
        }));
        return [...prev, key];
      });
    },
    [orderedVariantEntries],
  );

  const handleContextSelectVariant = useCallback(
    (parent, sub) => {
      const key = getVariantSelectionKey(parent, sub);
      if (selectedVariantKeys.includes(key)) return;
      const item = buildVariantSelectionItem(parent, sub);
      setSelectedVariantKeys([key]);
      setSelectedVariantItemsByKey((prev) => ({
        ...prev,
        [key]: item,
      }));
    },
    [selectedVariantKeys],
  );

  const getContextVariantItems = useCallback(
    (parent, sub) => {
      const key = getVariantSelectionKey(parent, sub);
      if (selectedVariantKeys.includes(key) && selectedVariantItems.length > 1) return selectedVariantItems;
      return [buildVariantSelectionItem(parent, sub)];
    },
    [selectedVariantItems, selectedVariantKeys],
  );

  const handleOpenTransaction = useCallback(
    (parent, sub) => {
      setTransactionItems(getContextVariantItems(parent, sub));
      setTransactionDefaults({
        source: isSantier ? { type: "santier", santierId: resolvedLocation.id } : null,
        destination: null,
      });
      setTransactionDialogOpen(true);
    },
    [getContextVariantItems, isSantier, resolvedLocation.id],
  );

  const handleOpenEmptyTransaction = useCallback(() => {
    setTransactionItems([]);
    setTransactionDefaults({
      source: null,
      destination: isSantier ? { type: "santier", santierId: resolvedLocation.id } : null,
    });
    setTransactionDialogOpen(true);
  }, [isSantier, resolvedLocation.id]);

  const handleOpenTransactionCatalog = useCallback(() => {
    setSelectDialogOpen(true);
  }, []);

  const handleClearVariantSelection = useCallback(() => {
    setSelectedVariantKeys([]);
    setSelectedVariantItemsByKey({});
  }, []);

  // Istoricul mișcărilor se deschide mereu pentru varianta pe care s-a dat click — ignoră selecția multiplă.
  const handleOpenIstoric = useCallback((parent, sub) => {
    if (!sub?.id) return;
    setIstoricVariant({ parent, sub });
    setIstoricOpen(true);
  }, []);

  const handleOpenVariantDialog = useCallback((item) => {
    if (!item?.id) return;
    setVariantDialogParent(item);
    setVariantDialogOpen(true);
  }, []);

  const handleSetVariantDialogOpen = useCallback((nextOpen) => {
    setVariantDialogOpen(nextOpen);
    if (!nextOpen) setVariantDialogParent(null);
  }, []);

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

  const safeDecimalPlaces = normalizeDecimalPlaces(decimalPlaces);
  const textAlignClasses = getTextAlignClasses(textAlign);

  const getColumnStyle = useCallback(
    (key) => {
      const width = columnWidths[key] || DEFAULT_COLUMN_WIDTHS[key] || 120;
      return {
        width,
        minWidth: width,
        maxWidth: width,
      };
    },
    [columnWidths],
  );

  const handleColumnResizeStart = useCallback(
    (event, key) => {
      event.preventDefault();
      event.stopPropagation();

      const startX = event.clientX;
      const startWidth = columnWidths[key] || DEFAULT_COLUMN_WIDTHS[key] || 120;
      const minWidth = MIN_COLUMN_WIDTHS[key] || 80;
      let frame = null;

      const onMove = (moveEvent) => {
        const delta = moveEvent.clientX - startX;
        const nextWidth = Math.max(minWidth, startWidth + delta);

        if (frame) window.cancelAnimationFrame(frame);
        frame = window.requestAnimationFrame(() => {
          setColumnWidths((prev) => ({
            ...prev,
            [key]: nextWidth,
          }));
        });
      };

      const onUp = () => {
        if (frame) window.cancelAnimationFrame(frame);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [columnWidths],
  );

  const handleSortColumn = useCallback(
    (columnKey) => {
      const sortField = SORT_FIELD_BY_COLUMN[columnKey];
      if (!sortField) return;

      setAdvancedFilters((prev) => {
        if (prev.sortBy === sortField) {
          if (prev.sortOrder === "asc") return { ...prev, sortBy: sortField, sortOrder: "desc" };
          return { ...prev, sortBy: "updated_at", sortOrder: "desc" };
        }

        return { ...prev, sortBy: sortField, sortOrder: "asc" };
      });
    },
    [setAdvancedFilters],
  );

  const renderSortHeaderContent = useCallback(
    (columnKey, label, align = "center") => {
      const sortField = SORT_FIELD_BY_COLUMN[columnKey];
      const active = sortField && advancedFilters.sortBy === sortField;
      const icon = !active ? faSort : advancedFilters.sortOrder === "asc" ? faSortDown : faSortUp;
      const justifyClass = align === "left" ? "justify-start text-left" : align === "right" ? "justify-end text-right" : "justify-center text-center";

      return (
        <button
          type="button"
          className={`flex h-full w-full items-center gap-1 px-1.5 xxxl:px-2 text-xs xxxl:text-sm font-bold text-foreground ${justifyClass}`}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            handleSortColumn(columnKey);
          }}
        >
          <span className="min-w-0 truncate">{label}</span>
          <FontAwesomeIcon icon={icon} className={`text-sm xxxl:text-base ${active ? "!text-primary" : "text-muted-foreground"}`} />
        </button>
      );
    },
    [handleSortColumn, advancedFilters.sortBy, advancedFilters.sortOrder],
  );

  const renderPlainHeader = useCallback((label, align = "center") => {
    const justifyClass = align === "left" ? "justify-start text-left" : align === "right" ? "justify-end text-right" : "justify-center text-center";
    return <div className={`flex h-full w-full items-center px-1.5 xxxl:px-2 text-xs xxxl:text-sm font-bold text-foreground ${justifyClass}`}>{label}</div>;
  }, []);

  return (
    <div className="h-full w-full flex flex-col gap-3 p-3 xxxl:p-4 overflow-hidden">
      <CatalogFilters
        config={config}
        search={search}
        setSearch={setSearch}
        totalItems={totalItems}
        onAddClick={handleOpenEmptyTransaction}
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
            return next;
          });
        }}
        allRowsExpanded={!isVariantView && allResourcesExpanded}
        onToggleAllRows={isVariantView ? undefined : handleToggleAllResources}
        toggleAllRowsLabel={`Extinde/închide ${config.titlePlural}`}
        viewMode={viewMode}
        onToggleViewMode={isSantier ? undefined : handleToggleViewMode}
        viewModeLabel={viewModeLabel}
        viewModeLocked={isSantier}
        showAdvancedFilters={false}
      />

      <div className="flex-1 min-h-0 rounded-lg border border-border bg-card overflow-hidden flex flex-col">
        <div className="relative flex-1 overflow-auto">
          <Table className="min-w-full table-fixed">
            <TableHeader className="sticky top-0 z-10 bg-background">
              <TableRow className="h-8 xxxl:h-9 bg-muted-foreground/25 hover:bg-muted-foreground/25">
                {!isVariantView && (
                  <TableHead style={getColumnStyle("expand")} className="px-0 text-center">
                    {renderPlainHeader("")}
                  </TableHead>
                )}

                {config.hasPhoto && visibleColumns.poza && (
                  <ResizableTableHead colKey="poza" style={getColumnStyle("poza")} onResizeStart={handleColumnResizeStart} className="text-center">
                    {renderPlainHeader("Poză")}
                  </ResizableTableHead>
                )}
                {visibleColumns.limba && (
                  <ResizableTableHead colKey="limba" style={getColumnStyle("limba")} onResizeStart={handleColumnResizeStart} className="text-center">
                    {renderPlainHeader("Limba")}
                  </ResizableTableHead>
                )}
                {visibleColumns.variante && (
                  <ResizableTableHead colKey="variante" style={getColumnStyle("variante")} onResizeStart={handleColumnResizeStart} className="text-center">
                    {renderPlainHeader("Variante")}
                  </ResizableTableHead>
                )}
                {visibleColumns.cod && (
                  <ResizableTableHead colKey="cod" style={getColumnStyle("cod")} onResizeStart={handleColumnResizeStart}>
                    {renderSortHeaderContent("cod", "Cod", textAlign)}
                  </ResizableTableHead>
                )}
                {visibleColumns.clasa1 && (
                  <ResizableTableHead colKey="clasa1" style={getColumnStyle("clasa1")} onResizeStart={handleColumnResizeStart}>
                    {renderPlainHeader("Clasă", textAlign)}
                  </ResizableTableHead>
                )}
                {visibleColumns.clasa2 && (
                  <ResizableTableHead colKey="clasa2" style={getColumnStyle("clasa2")} onResizeStart={handleColumnResizeStart}>
                    {renderPlainHeader("Subclasă", textAlign)}
                  </ResizableTableHead>
                )}
                {visibleColumns.denumire && (
                  <ResizableTableHead colKey="denumire" style={getColumnStyle("denumire")} onResizeStart={handleColumnResizeStart}>
                    {renderSortHeaderContent("denumire", "Denumire", textAlign)}
                  </ResizableTableHead>
                )}
                {visibleColumns.descriere && (
                  <ResizableTableHead colKey="descriere" style={getColumnStyle("descriere")} onResizeStart={handleColumnResizeStart}>
                    {renderPlainHeader("Descriere", textAlign)}
                  </ResizableTableHead>
                )}

                {visibleColumns.furnizor && (
                  <ResizableTableHead colKey="furnizor" style={getColumnStyle("furnizor")} onResizeStart={handleColumnResizeStart}>
                    {renderPlainHeader("Furnizor", textAlign)}
                  </ResizableTableHead>
                )}
                {visibleColumns.marca && (
                  <ResizableTableHead colKey="marca" style={getColumnStyle("marca")} onResizeStart={handleColumnResizeStart}>
                    {renderPlainHeader("Marcă", textAlign)}
                  </ResizableTableHead>
                )}
                {visibleColumns.status && (
                  <ResizableTableHead colKey="status" style={getColumnStyle("status")} onResizeStart={handleColumnResizeStart} className="text-center">
                    {renderPlainHeader("Status", "center")}
                  </ResizableTableHead>
                )}

                {visibleColumns.greutate && (
                  <ResizableTableHead colKey="greutate" style={getColumnStyle("greutate")} onResizeStart={handleColumnResizeStart} className="text-center">
                    {renderSortHeaderContent("greutate", "Greutate (kg)")}
                  </ResizableTableHead>
                )}
                {visibleColumns.unitate && (
                  <ResizableTableHead colKey="unitate" style={getColumnStyle("unitate")} onResizeStart={handleColumnResizeStart} className="text-center">
                    {renderPlainHeader("UM")}
                  </ResizableTableHead>
                )}
                {visibleColumns.cost && (
                  <ResizableTableHead colKey="cost" style={getColumnStyle("cost")} onResizeStart={handleColumnResizeStart} className="text-center">
                    {renderSortHeaderContent("cost", "Cost")}
                  </ResizableTableHead>
                )}
                {visibleColumns.stocInventar && (
                  <ResizableTableHead colKey="stocInventar" style={getColumnStyle("stocInventar")} onResizeStart={handleColumnResizeStart} className="text-center">
                    {renderSortHeaderContent("stocInventar", primaryStockLabel)}
                  </ResizableTableHead>
                )}
                {visibleColumns.stocTotal && (
                  <ResizableTableHead colKey="stocTotal" style={getColumnStyle("stocTotal")} onResizeStart={handleColumnResizeStart} className="text-center">
                    {renderSortHeaderContent("stocTotal", "Stoc total")}
                  </ResizableTableHead>
                )}
                {visibleColumns.creat && (
                  <ResizableTableHead colKey="creat" style={getColumnStyle("creat")} onResizeStart={handleColumnResizeStart}>
                    {renderSortHeaderContent("creat", "Creat", "left")}
                  </ResizableTableHead>
                )}
                {visibleColumns.actualizat && (
                  <ResizableTableHead colKey="actualizat" style={getColumnStyle("actualizat")} onResizeStart={handleColumnResizeStart}>
                    {renderSortHeaderContent("actualizat", "Actualizat", "left")}
                  </ResizableTableHead>
                )}
              </TableRow>

              <InventarHeaderFiltersRow
                config={config}
                visibleColumns={visibleColumns}
                getColumnStyle={getColumnStyle}
                advancedFilters={advancedFilters}
                setAdvancedFilters={setAdvancedFilters}
                displayLang={displayLang}
                textAlign={textAlign}
                showExpandColumn={!isVariantView}
                isVariantView={isVariantView}
              />
            </TableHeader>

            <TableBody>
              {items.length > 0 &&
                (isVariantView
                  ? items.map((item) => {
                      const sub = getVariantViewSub(item);
                      if (!sub) return null;

                      const variantKey = getVariantSelectionKey(item, sub);
                      const isSelected = selectedVariantKeys.includes(variantKey);

                      return (
                        <InventarVariantRow
                          key={variantKey}
                          isVariantView={isVariantView}
                          last
                          sub={sub}
                          parent={item}
                          config={config}
                          visibleColumns={visibleColumns}
                          displayLang={displayLang}
                          getColumnStyle={getColumnStyle}
                          textAlignClasses={textAlignClasses}
                          decimalPlaces={safeDecimalPlaces}
                          isSelected={isSelected}
                          selectedCount={isSelected ? selectedVariantKeys.length : 1}
                          onToggleSelect={handleToggleVariantSelect}
                          onContextSelect={handleContextSelectVariant}
                          onOpenTransaction={handleOpenTransaction}
                          onOpenIstoric={handleOpenIstoric}
                          onClearSelection={handleClearVariantSelection}
                          showExpandCell={false}
                        />
                      );
                    })
                  : items.map((item) => (
                      <InventarResourceRow
                        key={item.inventar_resursa_id}
                        isVariantView={isVariantView}
                        item={item}
                        config={config}
                        visibleColumns={visibleColumns}
                        displayLang={displayLang}
                        getColumnStyle={getColumnStyle}
                        textAlignClasses={textAlignClasses}
                        decimalPlaces={safeDecimalPlaces}
                        isExpanded={expandedResourceIds.has(String(item.inventar_resursa_id || item.id))}
                        onToggleVariants={toggleResourceExpand}
                        onAddVariant={handleOpenVariantDialog}
                        selectedVariantKeys={selectedVariantKeys}
                        onToggleVariantSelect={handleToggleVariantSelect}
                        onContextSelectVariant={handleContextSelectVariant}
                        onOpenTransaction={handleOpenTransaction}
                        onOpenIstoric={handleOpenIstoric}
                        onClearVariantSelection={handleClearVariantSelection}
                      />
                    )))}
            </TableBody>
          </Table>

          {items.length === 0 && !isFetching && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 top-[4rem] xxxl:top-[4.5rem] flex items-center justify-center text-muted-foreground">
              <div className="flex items-center justify-center gap-2 text-sm xxxl:text-base">
                <FontAwesomeIcon icon={faBoxOpen} />
                Nu există {config.titlePlural.toLowerCase()} în inventar.
              </div>
            </div>
          )}

          {isFetching && <SpinnerElement text={2} />}
        </div>
        <div className="shrink-0 border-t border-border bg-muted/10 p-2.5 xxxl:p-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5 xxxl:gap-2">
            <span className="text-sm xxxl:text-base text-foreground font-medium">Arată:</span>
            <Input
              type="text"
              value={limitInput}
              onChange={(event) => {
                const val = event.target.value;
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
            {selectedVariantKeys.length > 0 && (
              <div className="flex items-center h-9 gap-2 rounded-md border border-primary/40 bg-primary/10 px-2 py-1">
                <span className="text-sm font-black text-primary">{selectedVariantKeys.length} variante selectate</span>
              </div>
            )}
            {selectedVariantKeys.length > 0 && (
              <Button variant="destructive" onClick={handleClearVariantSelection} className="h-9 px-2 text-sm font-bold">
                <FontAwesomeIcon icon={faBan} />
                Anulează selecția
              </Button>
            )}
            <Button variant="default" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className={`h-9 xxxl:h-10 px-3 xxxl:px-4 text-sm xxxl:text-base ${config.hoverButton}`}>
              Înapoi
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
              Înainte
            </Button>
          </div>
        </div>
      </div>

      <InventarCatalogSelectDialog
        open={selectDialogOpen}
        setOpen={setSelectDialogOpen}
        tipResursa={tipResursa}
        lockedLang={locationLimba}
        onConfirm={handleConfirmSelect}
        variantOnly
        contextTypeLabel={addDialogContextType}
        contextName={addDialogContextName}
      />
      {variantDialogParent && <CatalogSubList config={config} open={variantDialogOpen} setOpen={handleSetVariantDialogOpen} parentItem={variantDialogParent} />}
      <InventarStocTranzactieDialog
        open={transactionDialogOpen}
        setOpen={setTransactionDialogOpen}
        selectedItems={transactionItems}
        inventar={inventar}
        tipResursa={tipResursa}
        defaultSource={transactionDefaults.source}
        defaultDestination={transactionDefaults.destination}
        onAddItems={handleOpenTransactionCatalog}
        onSaved={() => setSelectDialogOpen(false)}
      />
      <InventarIstoricDialog open={istoricOpen} setOpen={setIstoricOpen} variant={istoricVariant} location={resolvedLocation} primaryStockLabel={primaryStockLabel} />
    </div>
  );
}
