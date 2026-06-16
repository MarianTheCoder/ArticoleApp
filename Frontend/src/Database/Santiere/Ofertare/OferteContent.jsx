import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronRight,
  faColumns,
  faFileInvoice,
  faFolderOpen,
  faLanguage,
  faLayerGroup,
  faListCheck,
  faMagnifyingGlass,
  faRotateLeft,
  faChevronLeft,
  faSort,
  faAlignLeft,
  faHashtag,
  faPercent,
  faFilePdf,
} from "@fortawesome/free-solid-svg-icons";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipArrow, TooltipContent, TooltipTrigger } from "@radix-ui/react-tooltip";

import OverflowTooltip from "@/components/ui/OverflowTooltip";
import OferteAddDialog from "./components/OferteAddDialog";
import OferteColoaneDialog from "./OferteColoaneDialog";
import OferteReteteList from "./OferteReteteList";
import OferteReteteCategoryDialog from "./OferteReteteCategoryDialog";
import OferteExportPdfDialog from "./components/OferteExportPdfDialog";
import { useLoading } from "@/context/LoadingContext";

import { AuthContext } from "@/context/TokenContext";
import {
  useEditOfertaLucrareColoane,
  useEditOfertaLucrareCategoryColors,
  useOferte,
  useAddOfertaReteta,
  useOferteRetete,
  useReorderOfertaRetete,
  useEditOfertaReteta,
  useDeleteOfertaReteta,
  useDuplicateOfertaRetete,
  useReplaceOfertaRetete,
  useActualizeazaOfertaRetete,
  useGetOfertaReteteFurnizori,
  useApplyOfertaReteteFurnizori,
} from "@/hooks/Database/useOferte";
import { toast } from "sonner";
import SpinnerElement from "@/MainElements/SpinnerElement";
import OferteEditRetetaDialog from "./components/OferteEditReteteDialog";
import DeleteDialog from "@/components/ui/delete-dialog";
import { useParams } from "react-router-dom";
import { normalizeCategoryColorsConfig, setCategoryColor } from "./helpers/OferteReteteHelpers";
import { cn } from "@/lib/utils";

const COMPACT = {
  header: "h-14 shrink-0 border-b px-2 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2",
  titleIcon: "text-primary text-sm shrink-0",
  titleText: "block w-full max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-sm text-foreground tracking-tight font-bold",
  iconBtn: "h-8 w-8 p-0 rounded-md text-foreground hover:text-foreground hover:bg-accent shrink-0",
  toolbarBtn: "h-8 gap-1.5 px-2 text-sm leading-none shrink-0 rounded-md",
  toolbarIconBtn: "h-8 w-8 p-0 text-foreground shrink-0 rounded-md",
  toolbarBadgeBtn: "h-8 gap-1.5 px-2 text-sm leading-none shrink-0 rounded-md",
  menuContent: "w-48 p-1",
  menuItem: "text-sm py-1.5 pl-7 pr-2 text-foreground",
  emptyWrap: "h-full w-full flex flex-col items-center justify-center text-muted-foreground gap-2",
  emptyIcon: "text-2xl opacity-50",
  emptyText: "text-sm font-medium",
};

const getToolbarPressedClass = (active) => {
  return active ? "border-primary bg-primary/25 text-primary shadow-inner hover:bg-primary/50" : "";
};

const getSidebarSwitchClass = (mode) => {
  if (mode === "coeficienti") {
    return "border-teal-600 bg-teal-600 text-white shadow-sm hover:bg-teal-700 hover:text-white";
  }

  return "border-primary bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:text-primary-foreground";
};

const DEFAULT_RETETE_COLUMNS = {
  limba: true,
  info: true,
  elemente: true,
  cod: true,
  clasa1: false,
  clasa2: false,
  clasa3: false,
  clasa4: false,
  clasa5: false,
  denumire: true,
  descriere: false,
  unitate: true,
  cantitate: true,
  cost: true,
  qtyTotal: true,
  costTotal: true,
  coefProcent: true,
  coefPret: false,
  pret: true,
  creat: false,
  actualizat: false,
};

const RETETE_TEXT_ALIGN_STORAGE_KEY = "oferte_retete_text_align";
const RETETE_DECIMAL_PLACES_STORAGE_KEY = "oferte_retete_decimal_places";
const TEXT_ALIGN_VALUES = ["left", "center", "right"];
const DECIMAL_PLACE_VALUES = [1, 2, 3];
const CATEGORY_COLOR_SAVE_DELAY_MS = 300;

const ToolbarTooltip = ({ text, children }) => (
  <Tooltip>
    <TooltipTrigger asChild>{children}</TooltipTrigger>

    <TooltipContent
      side="bottom"
      align="center"
      sideOffset={6}
      className="z-[100] max-w-[14rem] rounded-md border-2 border-border bg-popover px-3 py-2 text-center text-sm font-semibold text-popover-foreground shadow-md"
    >
      <TooltipArrow width={12} height={6} className="fill-border" />
      {text}
    </TooltipContent>
  </Tooltip>
);

const parseMaybeJson = (value, fallback = []) => {
  if (value === null || value === undefined) return fallback;
  if (Array.isArray(value)) return value;

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed ?? fallback;
    } catch {
      return fallback;
    }
  }

  return value;
};

const normalizeColumns = (value) => {
  const parsed = parseMaybeJson(value, []);

  if (!Array.isArray(parsed)) return [];

  return parsed
    .map((col, index) => {
      if (typeof col === "string") {
        return {
          id: `col_${index + 1}`,
          nume: col.trim(),
        };
      }

      return {
        id: col.id || `col_${index + 1}`,
        nume: String(col.nume || col.name || col.label || "").trim(),
      };
    })
    .filter((col) => col.nume)
    .slice(0, 5);
};

const normalizeColoaneValori = (value) => {
  const parsed = parseMaybeJson(value, []);

  if (Array.isArray(parsed)) {
    return parsed
      .map((item) => ({
        id: item?.id ? String(item.id) : "",
        name: String(item?.name || item?.nume || "").trim(),
        value: String(item?.value ?? "").trim(),
      }))
      .filter((item) => item.id || item.name);
  }

  if (parsed && typeof parsed === "object") {
    return Object.entries(parsed)
      .map(([key, item]) => {
        if (item && typeof item === "object") {
          return {
            id: item.id ? String(item.id) : String(key || ""),
            name: String(item.name || item.nume || "").trim(),
            value: String(item.value ?? "").trim(),
          };
        }

        return null;
      })
      .filter(Boolean)
      .filter((item) => item.id || item.name);
  }

  return [];
};

export default function OferteContent({
  isCollapsed,
  selectedOferta,
  selectedLucrare,
  onUpdateSelectedLucrare,
  onToggleCollapse,
  sidebarMode = "oferte",
  onToggleSidebarMode,
  coeficientEditorState = null,
}) {
  const { limbaUser } = useParams();
  const { show, hide } = useLoading();
  const [openAddReteta, setOpenAddReteta] = useState(false);
  const [exportPdfOpen, setExportPdfOpen] = useState(false);
  const [openColoane, setOpenColoane] = useState(false);
  const [openCategorii, setOpenCategorii] = useState(false);

  const [columnResetKey, setColumnResetKey] = useState(0);
  const [sortResetKey, setSortResetKey] = useState(0);
  const [toggleAllReteteKey, setToggleAllReteteKey] = useState(0);
  const [reteteCategoryConfig, setReteteCategoryConfig] = useState([]);
  const [reteteCategoryShowTotals, setReteteCategoryShowTotals] = useState(false);
  const [reteteCategoryColors, setReteteCategoryColors] = useState({});
  const categoryColorsDebounceRef = useRef(null);
  const categoryColorsPendingRef = useRef({});
  const [recapitulatiiPercent, setRecapitulatiiPercent] = useState("0");
  const [tvaPercent, setTvaPercent] = useState("0");
  const [reteteSearch, setReteteSearch] = useState("");
  const [debouncedReteteSearch, setDebouncedReteteSearch] = useState("");
  const [reteteAllExpanded, setReteteAllExpanded] = useState(false);
  const [reteteSortActive, setReteteSortActive] = useState(false);
  const [selectedReteteCount, setSelectedReteteCount] = useState(0);
  const [displayLang, setDisplayLang] = useState("RO");
  const [textAlign, setTextAlign] = useState(() => {
    try {
      const saved = localStorage.getItem(RETETE_TEXT_ALIGN_STORAGE_KEY);
      return TEXT_ALIGN_VALUES.includes(saved) ? saved : "left";
    } catch {
      return "left";
    }
  });
  const [decimalPlaces, setDecimalPlaces] = useState(() => {
    try {
      const saved = Number(localStorage.getItem(RETETE_DECIMAL_PLACES_STORAGE_KEY));
      return DECIMAL_PLACE_VALUES.includes(saved) ? saved : 2;
    } catch {
      return 2;
    }
  });

  const [editRetetaOpen, setEditRetetaOpen] = useState(false);
  const [reteteToEdit, setReteteToEdit] = useState([]);

  const [deleteRetetaOpen, setDeleteRetetaOpen] = useState(false);
  const [reteteToDelete, setReteteToDelete] = useState([]);

  const [visibleReteteColumns, setVisibleReteteColumns] = useState(DEFAULT_RETETE_COLUMNS);

  const { user } = useContext(AuthContext);

  const editColoane = useEditOfertaLucrareColoane();
  const editCategoryColors = useEditOfertaLucrareCategoryColors();
  const addOfertaReteta = useAddOfertaReteta();
  const editOfertaReteta = useEditOfertaReteta();
  const reorderOfertaRetete = useReorderOfertaRetete();
  const deleteOfertaReteta = useDeleteOfertaReteta();
  const duplicateOfertaRetete = useDuplicateOfertaRetete();
  const replaceOfertaRetete = useReplaceOfertaRetete();
  const actualizeazaOfertaRetete = useActualizeazaOfertaRetete();
  const getOfertaReteteFurnizori = useGetOfertaReteteFurnizori();
  const applyOfertaReteteFurnizori = useApplyOfertaReteteFurnizori();

  const { data: oferteData } = useOferte(selectedOferta?.santier_id);
  const { data: reteteData, isFetching: isFetchingRetete } = useOferteRetete(selectedLucrare?.id);
  const oferteOptions = useMemo(() => {
    const list = Array.isArray(oferteData?.oferte) ? oferteData.oferte : [];

    if (list.length > 0) return list;

    return selectedOferta ? [selectedOferta] : [];
  }, [oferteData?.oferte, selectedOferta]);
  const reteteLucrare = reteteData?.retete || [];

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedReteteSearch(reteteSearch);
    }, 300);

    return () => {
      window.clearTimeout(timer);
    };
  }, [reteteSearch]);

  useEffect(() => {
    return () => {
      if (categoryColorsDebounceRef.current) {
        window.clearTimeout(categoryColorsDebounceRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const normalizedColors = normalizeCategoryColorsConfig(selectedLucrare?.category_colors_config);

    if (categoryColorsDebounceRef.current) {
      window.clearTimeout(categoryColorsDebounceRef.current);
      categoryColorsDebounceRef.current = null;
    }

    categoryColorsPendingRef.current = normalizedColors;
    setReteteCategoryColors(normalizedColors);
  }, [selectedLucrare?.id]);

  useEffect(() => {
    setSelectedReteteCount(0);
  }, [selectedLucrare?.id]);

  useEffect(() => {
    if (!TEXT_ALIGN_VALUES.includes(textAlign)) return;

    try {
      localStorage.setItem(RETETE_TEXT_ALIGN_STORAGE_KEY, textAlign);
    } catch {}
  }, [textAlign]);

  useEffect(() => {
    if (!DECIMAL_PLACE_VALUES.includes(Number(decimalPlaces))) return;

    try {
      localStorage.setItem(RETETE_DECIMAL_PLACES_STORAGE_KEY, String(decimalPlaces));
    } catch {}
  }, [decimalPlaces]);

  const dynamicColumns = useMemo(() => {
    return normalizeColumns(selectedLucrare?.coloane_config);
  }, [selectedLucrare?.coloane_config]);

  const showTableCol = useCallback(
    (key) => {
      return visibleReteteColumns?.[key] !== false;
    },
    [visibleReteteColumns],
  );

  const toggleTableCol = useCallback((key) => {
    setVisibleReteteColumns((prev) => ({
      ...prev,
      [key]: !(prev?.[key] !== false),
    }));
  }, []);

  const onDisplayLangToggle = useCallback(() => {
    setDisplayLang((prev) => (prev === "RO" ? "FR" : "RO"));
  }, []);

  const handleResetColumnWidths = useCallback(() => {
    setColumnResetKey((prev) => prev + 1);
    toast.success("Lățimea coloanelor a fost resetată.", { position: "bottom-right" });
  }, []);

  const handleResetSorting = useCallback(() => {
    setSortResetKey((prev) => prev + 1);
  }, []);

  const handleToggleAllRetete = useCallback(() => {
    setToggleAllReteteKey((prev) => prev + 1);
  }, []);

  const hasActiveCategories = useMemo(() => {
    return Array.isArray(reteteCategoryConfig) && reteteCategoryConfig.some(Boolean);
  }, [reteteCategoryConfig]);

  const hasCustomVisibleColumns = useMemo(() => {
    const staticChanged = Object.entries(DEFAULT_RETETE_COLUMNS).some(([key, defaultValue]) => {
      return (visibleReteteColumns?.[key] !== false) !== defaultValue;
    });
    const dynamicChanged = dynamicColumns.some((col) => visibleReteteColumns?.[`col_${col.id}`] === false);

    return staticChanged || dynamicChanged;
  }, [dynamicColumns, visibleReteteColumns]);

  const isOrganizareActive = reteteAllExpanded || reteteSortActive;

  const handleConfirmAddReteta = async ({ lucrare, reteta, cantitate, descriere, descriere_fr, coloane_valori }) => {
    if (!lucrare?.id || !reteta?.id) return;

    try {
      await addOfertaReteta.mutateAsync({
        santier_id: selectedOferta?.santier_id,
        lucrare_id: lucrare.id,
        original_reteta_id: reteta.id,
        cantitate_lucrare: cantitate,
        descriere: descriere || null,
        descriere_fr: descriere_fr || null,
        coloane_valori,
        created_by_user_id: user?.id || null,
      });

      toast.success("Rețeta a fost adăugată în ofertă.");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Eroare la adăugarea rețetei în ofertă.");
    }
  };

  const handleOpenEditReteta = useCallback((items) => {
    const nextItems = Array.isArray(items) ? items.filter(Boolean) : [items].filter(Boolean);

    if (nextItems.length === 0) return;

    setReteteToEdit(nextItems);
    setEditRetetaOpen(true);
  }, []);

  const handleSaveEditRetete = async (items) => {
    if (!selectedLucrare?.id) return;

    const payload = Array.isArray(items) ? items : [];

    if (payload.length === 0) return;

    try {
      for (const item of payload) {
        await editOfertaReteta.mutateAsync({
          id: item.id,
          santier_id: selectedOferta?.santier_id,
          lucrare_id: selectedLucrare.id,
          cantitate_lucrare: item.cantitate_lucrare,
          descriere: item.descriere,
          descriere_fr: item.descriere_fr,
          coloane_valori: item.coloane_valori,
          updated_by_user_id: user?.id || null,
        });
      }

      toast.success(payload.length === 1 ? "Rețeta a fost actualizată." : `${payload.length} rețete au fost actualizate.`);
      setEditRetetaOpen(false);
      setReteteToEdit([]);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Eroare la actualizarea rețetelor.");
    }
  };

  const handleSetEditRetetaOpen = useCallback((nextOpen) => {
    setEditRetetaOpen(nextOpen);

    if (!nextOpen) {
      setReteteToEdit([]);
    }
  }, []);

  const handleSaveColoane = async (columns) => {
    if (!selectedLucrare?.id) return;

    try {
      const res = await editColoane.mutateAsync({
        id: selectedLucrare.id,
        santier_id: selectedOferta?.santier_id,
        coloane_config: columns,
      });

      onUpdateSelectedLucrare?.({
        coloane_config: res?.coloane_config || columns,
      });

      toast.success("Coloanele au fost salvate.");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Eroare la salvarea coloanelor.");
    }
  };

  const handleSaveCategoryColors = useCallback(
    async (normalizedColors) => {
      if (!selectedLucrare?.id) return;

      try {
        const res = await editCategoryColors.mutateAsync({
          id: selectedLucrare.id,
          santier_id: selectedOferta?.santier_id,
          category_colors_config: normalizedColors,
          updated_by_user_id: user?.id || null,
        });

        onUpdateSelectedLucrare?.({
          category_colors_config: res?.category_colors_config || normalizedColors,
        });
      } catch (err) {
        toast.error(err?.response?.data?.message || "Eroare la salvarea culorilor categoriilor.");
      }
    },
    [editCategoryColors, onUpdateSelectedLucrare, selectedLucrare?.id, selectedOferta?.santier_id, user?.id],
  );

  const handleSaveCategoryColor = useCallback(
    (fieldKey, value, color) => {
      const normalizedColors = setCategoryColor(categoryColorsPendingRef.current, fieldKey, value, color);

      categoryColorsPendingRef.current = normalizedColors;

      if (categoryColorsDebounceRef.current) {
        window.clearTimeout(categoryColorsDebounceRef.current);
      }

      categoryColorsDebounceRef.current = window.setTimeout(() => {
        const pendingColors = normalizeCategoryColorsConfig(categoryColorsPendingRef.current);

        categoryColorsDebounceRef.current = null;
        setReteteCategoryColors(pendingColors);
        handleSaveCategoryColors(pendingColors);
      }, CATEGORY_COLOR_SAVE_DELAY_MS);
    },
    [handleSaveCategoryColors],
  );

  const handleOpenDeleteReteta = useCallback((retetaOrRetete) => {
    const retete = (Array.isArray(retetaOrRetete) ? retetaOrRetete : [retetaOrRetete]).filter(Boolean);

    if (retete.length === 0) return;

    setReteteToDelete(retete);
    setDeleteRetetaOpen(true);
  }, []);

  const handleConfirmDeleteReteta = async () => {
    if (reteteToDelete.length === 0 || !selectedLucrare?.id) return;

    const ids = reteteToDelete.map((reteta) => Number(reteta.id)).filter((id) => Number.isInteger(id) && id > 0);

    if (ids.length === 0) return;

    try {
      show();
      await deleteOfertaReteta.mutateAsync({
        ids,
        santier_id: selectedOferta?.santier_id,
        lucrare_id: selectedLucrare.id,
      });

      toast.success(ids.length === 1 ? "Rețeta a fost ștearsă din ofertă." : `${ids.length} rețete au fost șterse din ofertă.`);

      setDeleteRetetaOpen(false);
      setReteteToDelete([]);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Eroare la ștergerea rețetei.");
    } finally {
      hide();
    }
  };

  const handleDuplicateRetete = async (items) => {
    if (!selectedLucrare?.id || !Array.isArray(items) || items.length === 0) return;

    try {
      await duplicateOfertaRetete.mutateAsync({
        santier_id: selectedOferta?.santier_id,
        lucrare_id: selectedLucrare.id,
        items,
        created_by_user_id: user?.id || null,
      });

      toast.success(items.length === 1 ? "Rețeta a fost dublată." : `${items.length} rețete au fost dublate.`);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Eroare la dublarea rețetelor.");
    }
  };

  const handleMoveRetete = async (payload) => {
    const items = Array.isArray(payload?.items) ? payload.items : [];
    const targetLucrareId = Number(payload?.target_lucrare_id || 0);

    if (!selectedLucrare?.id || !targetLucrareId || items.length === 0) return;

    if (String(targetLucrareId) === String(selectedLucrare.id)) {
      toast.warning("Alege altă lucrare pentru mutare.");
      return;
    }

    try {
      await duplicateOfertaRetete.mutateAsync({
        santier_id: selectedOferta?.santier_id,
        lucrare_id: selectedLucrare.id,
        target_lucrare_id: targetLucrareId,
        items,
        created_by_user_id: user?.id || null,
      });

      toast.success(items.length === 1 ? "Rețeta a fost mutată/copiată în lucrarea selectată." : `${items.length} rețete au fost mutate/copiate în lucrarea selectată.`);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Eroare la mutarea rețetelor.");
    }
  };

  const handleReplaceRetete = async (payload) => {
    if (!selectedLucrare?.id || !payload?.original_reteta_id || !Array.isArray(payload.items) || payload.items.length === 0) return;

    try {
      const res = await replaceOfertaRetete.mutateAsync({
        santier_id: selectedOferta?.santier_id,
        lucrare_id: selectedLucrare.id,
        original_reteta_id: payload.original_reteta_id,
        items: payload.items,
        updated_by_user_id: user?.id || null,
      });

      const replacedCount = Number(res?.replaced_count || payload.items.length || 0);

      toast.success(replacedCount === 1 ? "Rețeta a fost înlocuită." : `${replacedCount} rețete au fost înlocuite.`);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Eroare la înlocuirea rețetelor.");
    }
  };

  const handleReorderRetete = async ({ lucrare_id, ordered_ids }) => {
    if (!lucrare_id || !Array.isArray(ordered_ids) || ordered_ids.length === 0) return;

    await reorderOfertaRetete.mutateAsync({
      lucrare_id,
      ordered_ids,
      updated_by_user_id: user?.id || null,
    });
  };

  const handleUpdateRetetaQuantity = useCallback(
    async (reteta, values) => {
      if (!reteta?.id || !selectedLucrare?.id) return;

      await editOfertaReteta.mutateAsync({
        id: reteta.id,
        santier_id: selectedOferta?.santier_id,
        lucrare_id: selectedLucrare.id,
        cantitate_lucrare: values.cantitate_lucrare,
        cantitate_lucrare_formula: values.cantitate_lucrare_formula || null,
        coloane_valori: normalizeColoaneValori(reteta.coloane_valori),
        updated_by_user_id: user?.id || null,
      });

      toast.success("Cantitatea a fost salvată.");
    },
    [editOfertaReteta, selectedOferta?.santier_id, selectedLucrare?.id, user?.id],
  );

  const handleUpdateRetetaCategoryValues = useCallback(
    async (items) => {
      if (!selectedLucrare?.id || !Array.isArray(items) || items.length === 0) return;

      await Promise.all(
        items.map((item) =>
          editOfertaReteta.mutateAsync({
            id: item.reteta.id,
            santier_id: selectedOferta?.santier_id,
            lucrare_id: selectedLucrare.id,
            cantitate_lucrare: item.reteta.cantitate_lucrare,
            cantitate_lucrare_formula: item.reteta.cantitate_lucrare_formula || null,
            descriere: item.reteta.descriere || null,
            descriere_fr: item.reteta.descriere_fr || null,
            coloane_valori: item.coloane_valori,
            updated_by_user_id: user?.id || null,
          }),
        ),
      );
    },
    [editOfertaReteta, selectedOferta?.santier_id, selectedLucrare?.id, user?.id],
  );

  const handleActualizeazaRetete = useCallback(
    async (payload) => {
      if (!selectedLucrare?.id || !payload?.items?.length) return;

      const res = await actualizeazaOfertaRetete.mutateAsync({
        santier_id: selectedOferta?.santier_id,
        lucrare_id: selectedLucrare.id,
        items: payload.items,
        rewrite_costs: payload.rewrite_costs,
        rewrite_quantities: payload.rewrite_quantities,
        updated_by_user_id: user?.id || null,
      });

      const updatedCount = Number(res?.updated_count || 0);
      const failedCount = Number(res?.failed_count || 0);

      if (failedCount > 0 && updatedCount > 0) {
        toast.warning(`${updatedCount} rețete actualizate, ${failedCount} eșuate (${res.failed?.[0]?.message || "nu există originalul"}).`, {
          position: "top-right",
        });
        return;
      }

      if (failedCount > 0) {
        toast.error(`${failedCount} rețete eșuate (${res.failed?.[0]?.message || "nu există originalul"}).`, {
          position: "top-right",
        });
        return;
      }

      toast.success(updatedCount === 1 ? "Rețeta a fost actualizată." : `${updatedCount} rețete au fost actualizate.`);
    },
    [actualizeazaOfertaRetete, selectedOferta?.santier_id, selectedLucrare?.id, user?.id],
  );

  const handleLoadFurnizoriRetete = useCallback(
    async (payload) => {
      if (!selectedLucrare?.id || !payload?.items?.length) {
        return {
          materiale: [],
          utilaje: [],
        };
      }

      return await getOfertaReteteFurnizori.mutateAsync({
        lucrare_id: selectedLucrare.id,
        items: payload.items,
      });
    },
    [getOfertaReteteFurnizori, selectedLucrare?.id],
  );

  const handleApplyFurnizoriRetete = useCallback(
    async (payload) => {
      if (!selectedLucrare?.id || !payload?.items?.length) return;

      const res = await applyOfertaReteteFurnizori.mutateAsync({
        santier_id: selectedOferta?.santier_id,
        lucrare_id: selectedLucrare.id,
        items: payload.items,
        apply_materiale: payload.apply_materiale,
        apply_utilaje: payload.apply_utilaje,
        material_furnizor: payload.material_furnizor,
        utilaj_furnizor: payload.utilaj_furnizor,
        updated_by_user_id: user?.id || null,
        rewrite_costs: payload.rewrite_costs,
        rewrite_quantities: payload.rewrite_quantities,
      });

      const updatedCount = Number(res?.updated_count || 0);
      const failedCount = Number(res?.failed_count || 0);

      if (failedCount > 0 && updatedCount > 0) {
        toast.warning(`${updatedCount} elemente actualizate, ${failedCount} fără variantă pentru furnizor.`, {
          position: "top-right",
        });
        return;
      }

      if (failedCount > 0) {
        toast.error(`${failedCount} elemente nu au variantă pentru furnizorul selectat.`, {
          position: "top-right",
        });
        return;
      }

      toast.success(updatedCount === 1 ? "Furnizorul a fost aplicat." : `${updatedCount} elemente au fost actualizate după furnizor.`);
    },
    [applyOfertaReteteFurnizori, selectedOferta?.santier_id, selectedLucrare?.id, user?.id],
  );

  return (
    <div className={`w-full h-full bg-card border-border border overflow-hidden flex flex-col text-sm text-foreground ${isCollapsed ? "rounded-lg border-l" : "rounded-r-lg border-l-0"}`}>
      {!selectedOferta ? (
        <div className={COMPACT.emptyWrap}>
          <FontAwesomeIcon icon={faFileInvoice} className={COMPACT.emptyIcon} />
          <p className={COMPACT.emptyText}>Selectează o ofertă din sidebar.</p>
        </div>
      ) : !selectedLucrare ? (
        <div className={COMPACT.emptyWrap}>
          <FontAwesomeIcon icon={faLayerGroup} className={COMPACT.emptyIcon} />
          <p className={COMPACT.emptyText}>Selectează o lucrare din oferta „{selectedOferta.nume}”.</p>
        </div>
      ) : (
        <>
          <div className={COMPACT.header}>
            <div className="flex items-center gap-1.5  min-w-0 overflow-hidden">
              <Button type="button" variant="ghost" size="icon" onClick={onToggleCollapse} className={cn(COMPACT.iconBtn, "border")} title="Deschide sidebar">
                {" "}
                <FontAwesomeIcon icon={isCollapsed ? faChevronRight : faChevronLeft} className="text-sm text-foreground" />
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={onToggleSidebarMode}
                className={`h-7 shrink-0 gap-1.5 px-2 text-sm font-semibold transition-colors ${getSidebarSwitchClass(sidebarMode)}`}
                title="Schimbă sidebar-ul"
              >
                <FontAwesomeIcon icon={sidebarMode === "coeficienti" ? faPercent : faFileInvoice} />
                <span>{sidebarMode === "coeficienti" ? "Coeficienți" : "Oferte"}</span>
              </Button>
              <OverflowTooltip text={selectedLucrare.nume} align="left" className={COMPACT.titleText} maxLines={1} />

              {selectedReteteCount > 0 && (
                <div className=" flex h-8 items-center justify-center rounded-md shrink-0 border border-primary bg-primary/25 px-2 py-1 text-xs font-black text-foreground">
                  {selectedReteteCount} {selectedReteteCount === 1 ? "Rețetă selectată" : "Rețete selectate"}
                </div>
              )}
            </div>

            <div className="flex justify-end items-center gap-1.5  min-w-0">
              <div className="flex justify-center"></div>

              <div className="relative h-8 w-64 shrink-0">
                <FontAwesomeIcon icon={faMagnifyingGlass} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground" />
                <input
                  value={reteteSearch}
                  onChange={(e) => setReteteSearch(e.target.value)}
                  className="h-8 w-full rounded-md border bg-background pl-8 pr-2 text-sm font-semibold text-foreground outline-none placeholder:text-muted-foreground"
                  placeholder="Caută..."
                />
              </div>

              <Button variant="outline" className={`${COMPACT.toolbarBadgeBtn}`} onClick={onDisplayLangToggle}>
                <FontAwesomeIcon icon={faLanguage} className="text-sm text-foreground" />
                <span className="whitespace-nowrap text-sm font-semibold text-foreground">{displayLang}</span>
              </Button>

              <Button variant="outline" className={`${COMPACT.toolbarBadgeBtn} ${getToolbarPressedClass(hasActiveCategories)}`} onClick={() => setOpenCategorii(true)}>
                <FontAwesomeIcon icon={faLayerGroup} className={`text-sm ${hasActiveCategories ? "text-primary" : "text-foreground"}`} />
                <span className="whitespace-nowrap text-sm font-semibold text-foreground">Categorii</span>
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className={`${COMPACT.toolbarBadgeBtn}`}>
                    <FontAwesomeIcon icon={faListCheck} className={`text-sm  "text-foreground"}`} />
                    <span className={`whitespace-nowrap text-sm font-semibold "text-foreground"}`}>Afișare</span>
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" className="w-56 p-1">
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="gap-2 text-sm font-semibold">
                      <FontAwesomeIcon icon={faAlignLeft} className="text-sm text-foreground" />
                      Aliniere text
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className={COMPACT.menuContent}>
                      <DropdownMenuCheckboxItem className={COMPACT.menuItem} checked={textAlign === "left"} onSelect={(e) => e.preventDefault()} onCheckedChange={() => setTextAlign("left")}>
                        Stânga
                      </DropdownMenuCheckboxItem>

                      <DropdownMenuCheckboxItem className={COMPACT.menuItem} checked={textAlign === "center"} onSelect={(e) => e.preventDefault()} onCheckedChange={() => setTextAlign("center")}>
                        Centru
                      </DropdownMenuCheckboxItem>

                      <DropdownMenuCheckboxItem className={COMPACT.menuItem} checked={textAlign === "right"} onSelect={(e) => e.preventDefault()} onCheckedChange={() => setTextAlign("right")}>
                        Dreapta
                      </DropdownMenuCheckboxItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>

                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="gap-2 text-sm font-semibold">
                      <FontAwesomeIcon icon={faHashtag} className="text-sm text-foreground" />
                      Zecimale
                      <span className="ml-auto text-sm font-black text-muted-foreground">{decimalPlaces}</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className={COMPACT.menuContent}>
                      {DECIMAL_PLACE_VALUES.map((value) => (
                        <DropdownMenuCheckboxItem
                          key={value}
                          className={COMPACT.menuItem}
                          checked={decimalPlaces === value}
                          onSelect={(e) => e.preventDefault()}
                          onCheckedChange={() => setDecimalPlaces(value)}
                        >
                          {value} zecimal{value === 1 ? "ă" : "e"}
                        </DropdownMenuCheckboxItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>

                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="gap-2 text-sm font-semibold">
                      <FontAwesomeIcon icon={faListCheck} className="text-sm text-foreground" />
                      Coloane vizibile
                    </DropdownMenuSubTrigger>

                    <DropdownMenuSubContent className={COMPACT.menuContent}>
                      <DropdownMenuCheckboxItem className={COMPACT.menuItem} checked={showTableCol("limba")} onSelect={(e) => e.preventDefault()} onCheckedChange={() => toggleTableCol("limba")}>
                        Limba
                      </DropdownMenuCheckboxItem>

                      <DropdownMenuCheckboxItem className={COMPACT.menuItem} checked={showTableCol("info")} onSelect={(e) => e.preventDefault()} onCheckedChange={() => toggleTableCol("info")}>
                        Info
                      </DropdownMenuCheckboxItem>

                      <DropdownMenuCheckboxItem className={COMPACT.menuItem} checked={showTableCol("elemente")} onSelect={(e) => e.preventDefault()} onCheckedChange={() => toggleTableCol("elemente")}>
                        Elemente
                      </DropdownMenuCheckboxItem>

                      {dynamicColumns.map((col) => (
                        <DropdownMenuCheckboxItem
                          key={col.id}
                          className={COMPACT.menuItem}
                          checked={showTableCol(`col_${col.id}`)}
                          onSelect={(e) => e.preventDefault()}
                          onCheckedChange={() => toggleTableCol(`col_${col.id}`)}
                        >
                          {col.nume}
                        </DropdownMenuCheckboxItem>
                      ))}

                      <DropdownMenuCheckboxItem className={COMPACT.menuItem} checked={showTableCol("cod")} onSelect={(e) => e.preventDefault()} onCheckedChange={() => toggleTableCol("cod")}>
                        Cod
                      </DropdownMenuCheckboxItem>

                      {Array.from({ length: 5 }, (_, index) => {
                        const key = `clasa${index + 1}`;
                        return (
                          <DropdownMenuCheckboxItem key={key} className={COMPACT.menuItem} checked={showTableCol(key)} onSelect={(e) => e.preventDefault()} onCheckedChange={() => toggleTableCol(key)}>
                            Clasă {index + 1}
                          </DropdownMenuCheckboxItem>
                        );
                      })}

                      <DropdownMenuCheckboxItem className={COMPACT.menuItem} checked={showTableCol("denumire")} onSelect={(e) => e.preventDefault()} onCheckedChange={() => toggleTableCol("denumire")}>
                        Denumire
                      </DropdownMenuCheckboxItem>

                      <DropdownMenuCheckboxItem
                        className={COMPACT.menuItem}
                        checked={showTableCol("descriere")}
                        onSelect={(e) => e.preventDefault()}
                        onCheckedChange={() => toggleTableCol("descriere")}
                      >
                        Descriere
                      </DropdownMenuCheckboxItem>

                      <DropdownMenuCheckboxItem className={COMPACT.menuItem} checked={showTableCol("unitate")} onSelect={(e) => e.preventDefault()} onCheckedChange={() => toggleTableCol("unitate")}>
                        Unitate
                      </DropdownMenuCheckboxItem>

                      <DropdownMenuCheckboxItem
                        className={COMPACT.menuItem}
                        checked={showTableCol("cantitate")}
                        onSelect={(e) => e.preventDefault()}
                        onCheckedChange={() => toggleTableCol("cantitate")}
                      >
                        Cantitate
                      </DropdownMenuCheckboxItem>

                      <DropdownMenuCheckboxItem
                        className={COMPACT.menuItem}
                        checked={showTableCol("qtyTotal")}
                        onSelect={(e) => e.preventDefault()}
                        onCheckedChange={() => toggleTableCol("qtyTotal")}
                      >
                        Qty total
                      </DropdownMenuCheckboxItem>

                      <DropdownMenuCheckboxItem className={COMPACT.menuItem} checked={showTableCol("cost")} onSelect={(e) => e.preventDefault()} onCheckedChange={() => toggleTableCol("cost")}>
                        Cost
                      </DropdownMenuCheckboxItem>

                      <DropdownMenuCheckboxItem
                        className={COMPACT.menuItem}
                        checked={showTableCol("costTotal")}
                        onSelect={(e) => e.preventDefault()}
                        onCheckedChange={() => toggleTableCol("costTotal")}
                      >
                        Cost total
                      </DropdownMenuCheckboxItem>

                      <DropdownMenuCheckboxItem
                        className={COMPACT.menuItem}
                        checked={showTableCol("coefProcent")}
                        onSelect={(e) => e.preventDefault()}
                        onCheckedChange={() => toggleTableCol("coefProcent")}
                      >
                        Coef
                      </DropdownMenuCheckboxItem>

                      <DropdownMenuCheckboxItem className={COMPACT.menuItem} checked={showTableCol("coefPret")} onSelect={(e) => e.preventDefault()} onCheckedChange={() => toggleTableCol("coefPret")}>
                        Coef. preț
                      </DropdownMenuCheckboxItem>

                      <DropdownMenuCheckboxItem className={COMPACT.menuItem} checked={showTableCol("pret")} onSelect={(e) => e.preventDefault()} onCheckedChange={() => toggleTableCol("pret")}>
                        Preț
                      </DropdownMenuCheckboxItem>

                      <DropdownMenuCheckboxItem className={COMPACT.menuItem} checked={showTableCol("creat")} onSelect={(e) => e.preventDefault()} onCheckedChange={() => toggleTableCol("creat")}>
                        Creat
                      </DropdownMenuCheckboxItem>

                      <DropdownMenuCheckboxItem
                        className={COMPACT.menuItem}
                        checked={showTableCol("actualizat")}
                        onSelect={(e) => e.preventDefault()}
                        onCheckedChange={() => toggleTableCol("actualizat")}
                      >
                        Actualizat
                      </DropdownMenuCheckboxItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>

                  <DropdownMenuItem className="gap-2 text-sm font-semibold" onSelect={() => setOpenColoane(true)}>
                    <FontAwesomeIcon icon={faColumns} className="text-sm text-foreground" />
                    <span>Coloane dinamice</span>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem className="gap-2 text-sm font-semibold" onSelect={handleResetColumnWidths}>
                    <FontAwesomeIcon icon={faRotateLeft} className="text-sm text-foreground" />
                    <span>Reset lățimi</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className={`${COMPACT.toolbarBadgeBtn} ${getToolbarPressedClass(isOrganizareActive)}`}>
                    <FontAwesomeIcon icon={faLayerGroup} className={`text-sm text-foreground`} />
                    <span className={`whitespace-nowrap text-sm font-semibold text-foreground`}>Organizare</span>
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" className="w-56 p-0">
                  <DropdownMenuItem
                    className={`${reteteAllExpanded ? "bg-primary/25 text-foreground focus:bg-primary/30" : ""} rounded-none gap-2 text-sm font-semibold`}
                    onSelect={handleToggleAllRetete}
                  >
                    <FontAwesomeIcon icon={faFolderOpen} className={`text-sm ${reteteAllExpanded ? "text-primary " : "text-foreground"}`} />
                    <span>Extinde/închide Rețete</span>
                  </DropdownMenuItem>

                  <DropdownMenuItem className={`${reteteSortActive ? "bg-primary/25 text-foreground focus:bg-primary/30" : ""} rounded-none gap-2 text-sm font-semibold`} onSelect={handleResetSorting}>
                    <FontAwesomeIcon icon={faSort} className={`text-sm ${reteteSortActive ? "text-primary" : "text-foreground"}`} />
                    <span>Resetare Sortare</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button className={COMPACT.toolbarBtn} onClick={() => setExportPdfOpen(true)}>
                <FontAwesomeIcon icon={faFilePdf} className="text-sm " />
                <span className="text-sm ">Export PDF</span>
              </Button>
            </div>
          </div>

          <div className="flex-1 min-h-0 p-2 relative bg-muted/10">
            <OferteReteteList
              reteteItems={reteteLucrare}
              selectedOferta={selectedOferta}
              selectedLucrare={selectedLucrare}
              displayLang={displayLang}
              textAlign={textAlign}
              decimalPlaces={decimalPlaces}
              visibleColumns={visibleReteteColumns}
              columnResetKey={columnResetKey}
              sortResetKey={sortResetKey}
              toggleAllKey={toggleAllReteteKey}
              categoryConfig={reteteCategoryConfig}
              showCategoryTotals={reteteCategoryShowTotals}
              categoryColorsConfig={reteteCategoryColors}
              recapitulatiiPercent={recapitulatiiPercent}
              tvaPercent={tvaPercent}
              searchQuery={debouncedReteteSearch}
              onEditReteta={handleOpenEditReteta}
              onDeleteReteta={handleOpenDeleteReteta}
              onReorderRetete={handleReorderRetete}
              onDuplicateRetete={handleDuplicateRetete}
              onMoveRetete={handleMoveRetete}
              onReplaceRetete={handleReplaceRetete}
              onUpdateRetetaQuantity={handleUpdateRetetaQuantity}
              onUpdateRetetaCategoryValues={handleUpdateRetetaCategoryValues}
              onLoadFurnizoriRetete={handleLoadFurnizoriRetete}
              onApplyFurnizoriRetete={handleApplyFurnizoriRetete}
              onActualizeazaRetete={handleActualizeazaRetete}
              onSortActiveChange={setReteteSortActive}
              onAllExpandedChange={setReteteAllExpanded}
              onSelectedCountChange={setSelectedReteteCount}
              onCategoryColorChange={handleSaveCategoryColor}
              onRecapitulatiiPercentChange={setRecapitulatiiPercent}
              onTvaPercentChange={setTvaPercent}
              coeficientEditorState={coeficientEditorState}
              oferteOptions={oferteOptions}
              onAddReteta={() => setOpenAddReteta(true)}
            />

            {isFetchingRetete && <SpinnerElement text={2} />}
          </div>

          <OferteAddDialog
            open={openAddReteta}
            setOpen={setOpenAddReteta}
            selectedOferta={selectedOferta}
            selectedLucrare={selectedLucrare}
            displayLang={displayLang}
            onConfirm={handleConfirmAddReteta}
          />

          <OferteColoaneDialog open={openColoane} setOpen={setOpenColoane} selectedLucrare={selectedLucrare} onSave={handleSaveColoane} />

          <OferteReteteCategoryDialog
            open={openCategorii}
            setOpen={setOpenCategorii}
            dynamicColumns={dynamicColumns}
            value={reteteCategoryConfig}
            showTotals={reteteCategoryShowTotals}
            onChange={setReteteCategoryConfig}
            onShowTotalsChange={setReteteCategoryShowTotals}
          />

          <OferteExportPdfDialog
            open={exportPdfOpen}
            setOpen={setExportPdfOpen}
            selectedOferta={selectedOferta}
            selectedLucrare={selectedLucrare}
            displayLang={displayLang}
            visibleColumns={visibleReteteColumns}
            dynamicColumns={dynamicColumns}
            decimalPlaces={decimalPlaces}
            recapitulatiiPercent={recapitulatiiPercent}
            tvaPercent={tvaPercent}
            onRecapitulatiiPercentChange={setRecapitulatiiPercent}
            onTvaPercentChange={setTvaPercent}
          />

          <OferteEditRetetaDialog
            open={editRetetaOpen}
            setOpen={handleSetEditRetetaOpen}
            retete={reteteToEdit}
            dynamicColumns={dynamicColumns}
            displayLang={displayLang}
            onConfirm={handleSaveEditRetete}
          />

          <DeleteDialog
            open={deleteRetetaOpen}
            setOpen={setDeleteRetetaOpen}
            title={reteteToDelete.length === 1 ? "Șterge rețeta din ofertă" : `Șterge ${reteteToDelete.length} rețete din ofertă`}
            description={
              reteteToDelete.length === 1
                ? `Ești sigur că vrei să ștergi rețeta "${reteteToDelete[0]?.denumire || ""}" din ofertă? Se vor șterge și elementele, variantele snapshot și pozele copiate pentru această rețetă.`
                : `Ești sigur că vrei să ștergi ${reteteToDelete.length} rețete din ofertă? Se vor șterge și elementele, variantele snapshot și pozele copiate pentru aceste rețete.`
            }
            onSubmit={handleConfirmDeleteReteta}
            useCode={false}
          />
        </>
      )}
    </div>
  );
}
