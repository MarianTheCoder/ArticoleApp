import React, { Fragment, useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from "@/components/ui/context-menu";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight, faCheck, faFolderTree, faLanguage, faPenToSquare, faPlus, faSave, faTrash } from "@fortawesome/free-solid-svg-icons";
import { toast } from "sonner";

import { useReteteClaseCoduri, useBulkSaveRetetaClaseCoduri } from "@/hooks/Database/useRetete";
import OverflowTooltip from "@/components/ui/OverflowTooltip";
import { useLoading } from "@/context/LoadingContext";
import api from "@/api/axiosAPI";

const RETETA_LEVEL_COUNT = 5;
const CATALOG_LEVEL_COUNT = 2;
const SAVED_SELECTED_PATH_KEY = "retete_clase_selected_path";
const CATALOG_SAVED_SELECTED_PATH_KEY = "catalog_clase_selected_path";

const CATALOG_SCOPE_LABELS = {
  catalog: "Catalog",
  catalog_manopera: "Manoperă",
  catalog_material: "Materiale",
  catalog_utilaj: "Utilaje",
  catalog_transport: "Transport",
};

const CATALOG_SCOPE_RESOURCE_TYPES = {
  catalog: "material",
  catalog_manopera: "manopera",
  catalog_material: "material",
  catalog_utilaj: "utilaj",
  catalog_transport: "transport",
};

const isCatalogScope = (scope) => scope === "catalog" || String(scope || "").startsWith("catalog_");
const normalizeDialogScope = (scope) => (isCatalogScope(scope) ? String(scope || "catalog") : "reteta");
const getScopeLevelCount = (scope) => (isCatalogScope(scope) ? CATALOG_LEVEL_COUNT : RETETA_LEVEL_COUNT);
const getScopeStorageKey = (scope) => (isCatalogScope(scope) ? `${CATALOG_SAVED_SELECTED_PATH_KEY}_${scope}` : SAVED_SELECTED_PATH_KEY);
const RETETA_LEVEL_LABELS = ["Specialitate", "Capitol de lucrări", "Familie de lucrări", "Subfamilie de lucrări", "Articol de lucrare"];
const CATALOG_LEVEL_LABELS = ["Clasă", "Subclasă"];
const getScopeLevelLabel = (scope, level) => {
  const labels = isCatalogScope(scope) ? CATALOG_LEVEL_LABELS : RETETA_LEVEL_LABELS;
  return labels[level - 1] || `Nivel ${level}`;
};

const parseCodeValue = (value, scope = "reteta") => {
  const levelCount = getScopeLevelCount(scope);
  const segments = String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  return {
    selectedPath: segments
      .slice(0, levelCount)
      .filter((segment) => segment && segment !== "00")
      .join("."),
    finalSegments: isCatalogScope(scope) ? Array.from({ length: 3 }, (_, index) => segments[levelCount + index] || "000") : [segments[levelCount] || ""],
  };
};

const normalizeSegment = (value) =>
  String(value || "")
    .replace(/\D/g, "")
    .slice(0, 2);

const normalizeRecipeCode = (value) =>
  String(value || "")
    .replace(/\D/g, "")
    .slice(0, 3);

const normalizeCatalogSpecificCode = (value) =>
  String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 3);

const normalizeFinalSegment = (value, scope = "reteta") => (isCatalogScope(scope) ? normalizeCatalogSpecificCode(value) : normalizeRecipeCode(value));

const normalizeCatalogFinalSegments = (segments = []) =>
  Array.from({ length: 3 }, (_, index) => {
    const segment = normalizeCatalogSpecificCode(segments[index]);
    return segment || "000";
  });

const isZeroCatalogFinalSegments = (segments = []) => normalizeCatalogFinalSegments(segments).every((segment) => segment === "000");

const getPathParts = (pathCode) =>
  String(pathCode || "")
    .split(".")
    .filter(Boolean);

const normalizeSavedPath = (pathCode, scope = "reteta") => {
  return getPathParts(pathCode)
    .map((segment) => normalizeSegment(segment))
    .filter((segment) => segment.length === 2 && segment !== "00")
    .slice(0, getScopeLevelCount(scope))
    .join(".");
};

const validatePathCodeLike = (pathCode, scope = "reteta") => {
  const parts = getPathParts(pathCode);
  return parts.length >= 1 && parts.length <= getScopeLevelCount(scope) && parts.every((segment) => /^\d{2}$/.test(segment) && segment !== "00");
};

const getSavedSelectedPath = (scope = "reteta") => {
  try {
    return normalizeSavedPath(localStorage.getItem(getScopeStorageKey(scope)), scope);
  } catch {
    return "";
  }
};

const setSavedSelectedPath = (pathCode, scope = "reteta") => {
  try {
    const storageKey = getScopeStorageKey(scope);
    const normalizedPath = normalizeSavedPath(pathCode, scope);

    if (normalizedPath) {
      localStorage.setItem(storageKey, normalizedPath);
    } else {
      localStorage.removeItem(storageKey);
    }
  } catch {}
};

const trimPathToExistingPrefix = (pathCode, items = []) => {
  const itemPaths = new Set((items || []).map((item) => item.path_code));
  const parts = getPathParts(pathCode);

  for (let length = parts.length; length > 0; length -= 1) {
    const candidate = parts.slice(0, length).join(".");
    if (itemPaths.has(candidate)) return candidate;
  }

  return "";
};

const buildCodeFromPath = (pathCode, finalSegments, scope = "reteta") => {
  const levelCount = getScopeLevelCount(scope);
  const classSegments = getPathParts(pathCode);
  const paddedClassSegments = Array.from({ length: levelCount }, (_, index) => classSegments[index] || "00");
  const cleanFinalSegments = (Array.isArray(finalSegments) ? finalSegments : [finalSegments]).map((segment) => {
    const normalizedSegment = normalizeFinalSegment(segment, scope);
    return isCatalogScope(scope) ? normalizedSegment : normalizedSegment.padStart(3, "0");
  });
  return [...paddedClassSegments, ...cleanFinalSegments].join(" ");
};

const replacePathPrefix = (pathCode, oldPrefix, newPrefix) => {
  if (pathCode === oldPrefix) return newPrefix;
  if (pathCode.startsWith(`${oldPrefix}.`)) return `${newPrefix}${pathCode.slice(oldPrefix.length)}`;
  return pathCode;
};

const getDisplayName = (item, displayLang = "RO") => {
  return (displayLang === "FR" ? item.denumire_fr || item.denumire_ro : item.denumire_ro) || "Nedefinit";
};

const sortByCode = (a, b) => String(a.code_segment).localeCompare(String(b.code_segment), "ro", { numeric: true });

export default function ReteteClaseCoduriDialog({ open, setOpen, value, onApply, displayLang = "RO", filterMode = false, catalogMode = false, scope = "reteta" }) {
  const { show, hide } = useLoading();
  const normalizedScope = normalizeDialogScope(scope);
  const levelCount = getScopeLevelCount(normalizedScope);
  const isCatalogScopeValue = isCatalogScope(normalizedScope);
  const catalogScopeLabel = CATALOG_SCOPE_LABELS[normalizedScope] || "Catalog";
  const parsedValue = useMemo(() => parseCodeValue(value, normalizedScope), [normalizedScope, value]);
  const [selectedPath, setSelectedPath] = useState(parsedValue.selectedPath);
  const [finalSegments, setFinalSegments] = useState(parsedValue.finalSegments);
  const [localItems, setLocalItems] = useState([]);
  const [deletedIds, setDeletedIds] = useState([]);
  const [deletedPaths, setDeletedPaths] = useState([]);
  const [newInputs, setNewInputs] = useState({});
  const [editLang, setEditLang] = useState(displayLang === "FR" ? "FR" : "RO");
  const [editMode, setEditMode] = useState(false);
  const [restoredFromStorage, setRestoredFromStorage] = useState(false);
  const [autoGeneratedCatalogFinal, setAutoGeneratedCatalogFinal] = useState({ path: "", value: "" });

  const { data, isFetching, refetch } = useReteteClaseCoduri(false, normalizedScope);
  // const { mutateAsync: addClasa, isPending: adding } = useAddRetetaClasaCod();
  // const { mutateAsync: editClasa, isPending: editing } = useEditRetetaClasaCod();
  // const { mutateAsync: deleteClasa, isPending: deleting } = useDeleteRetetaClasaCod();
  const { mutateAsync: bulkSaveClase, isPending: savingClasses } = useBulkSaveRetetaClaseCoduri();

  useEffect(() => {
    if (!open) return;
    const savedPath = getSavedSelectedPath(normalizedScope);
    const shouldUseSavedPath = !parsedValue.selectedPath && !!savedPath;

    setSelectedPath(shouldUseSavedPath ? savedPath : parsedValue.selectedPath);
    setFinalSegments(parsedValue.finalSegments);
    setDeletedIds([]);
    setDeletedPaths([]);
    setNewInputs({});
    setEditLang(displayLang === "FR" ? "FR" : "RO");
    setEditMode(false);
    setRestoredFromStorage(shouldUseSavedPath);
    setAutoGeneratedCatalogFinal({ path: "", value: "" });
  }, [displayLang, normalizedScope, open, parsedValue.finalSegments, parsedValue.selectedPath]);

  useEffect(() => {
    if (!open) return;
    setLocalItems((data?.items || []).map((item) => ({ ...item, _dirty: false, _isNew: false })));
  }, [data, open]);

  const isDeletedPath = (pathCode) => deletedPaths.some((deletedPath) => pathCode === deletedPath || pathCode.startsWith(`${deletedPath}.`));
  const isDeletedItem = (item) => deletedIds.includes(item.id) || isDeletedPath(item.path_code);

  const visibleItems = useMemo(() => {
    return localItems.filter((item) => !isDeletedItem(item));
  }, [localItems, deletedIds, deletedPaths]);

  useEffect(() => {
    if (!open || !selectedPath) return;
    setSavedSelectedPath(selectedPath, normalizedScope);
  }, [normalizedScope, open, selectedPath]);

  useEffect(() => {
    if (!open || !restoredFromStorage || isFetching) return;

    const trimmedPath = trimPathToExistingPrefix(selectedPath, visibleItems);
    if (trimmedPath !== selectedPath) {
      setSelectedPath(trimmedPath);
      setSavedSelectedPath(trimmedPath, normalizedScope);
    }

    setRestoredFromStorage(false);
  }, [isFetching, open, restoredFromStorage, selectedPath, visibleItems]);

  useEffect(() => {
    if (!open || !isCatalogScopeValue || filterMode || catalogMode || !selectedPath) return;

    const selectedPathParts = getPathParts(selectedPath);
    if (selectedPathParts.length < 1 || selectedPathParts.length > CATALOG_LEVEL_COUNT) return;

    const normalizedFinalSegments = normalizeCatalogFinalSegments(finalSegments);
    const normalizedFinalValue = normalizedFinalSegments.join(" ");
    const hasZeroFinal = isZeroCatalogFinalSegments(normalizedFinalSegments);
    const shouldFetchZeroFinal = hasZeroFinal && autoGeneratedCatalogFinal.path !== selectedPath;
    const shouldRefreshPreviousAutoValue = autoGeneratedCatalogFinal.path && autoGeneratedCatalogFinal.path !== selectedPath && autoGeneratedCatalogFinal.value === normalizedFinalValue;
    const canAutoGenerate = shouldFetchZeroFinal || shouldRefreshPreviousAutoValue;

    if (!canAutoGenerate) return;

    let cancelled = false;

    const fetchNextCode = async () => {
      try {
        const response = await api.get("/Catalog/getNextCatalogDefinitionCode", {
          params: {
            tip_resursa: CATALOG_SCOPE_RESOURCE_TYPES[normalizedScope] || "material",
            class_path: selectedPath,
          },
        });

        if (cancelled) return;

        const nextSegments = normalizeCatalogFinalSegments(response.data?.final_segments);

        setFinalSegments(nextSegments);
        setAutoGeneratedCatalogFinal({
          path: selectedPath,
          value: nextSegments.join(" "),
        });
      } catch {
        if (!cancelled) {
          setAutoGeneratedCatalogFinal({ path: selectedPath, value: normalizedFinalValue });
        }
      }
    };

    fetchNextCode();

    return () => {
      cancelled = true;
    };
  }, [autoGeneratedCatalogFinal.path, autoGeneratedCatalogFinal.value, catalogMode, filterMode, finalSegments, isCatalogScopeValue, normalizedScope, open, selectedPath]);

  const selectedParts = getPathParts(selectedPath);
  const selectedItems = selectedParts.map((segment, index) => {
    const pathCode = selectedParts.slice(0, index + 1).join(".");
    const existing = visibleItems.find((item) => item.path_code === pathCode);

    return (
      existing || {
        id: `missing-${pathCode}`,
        level_no: index + 1,
        code_segment: segment,
        path_code: pathCode,
        denumire_ro: "Nedefinit",
        denumire_fr: "Nedefinit",
        _missing: true,
      }
    );
  });

  const hasClassChanges = localItems.some((item) => item._isNew || item._dirty) || deletedIds.length > 0 || deletedPaths.length > 0;

  const setItemField = (itemId, key, fieldValue) => {
    setLocalItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        return { ...item, [key]: fieldValue, _dirty: !item._isNew };
      }),
    );
  };

  const setItemCodeSegment = (item, fieldValue) => {
    const codeSegment = normalizeSegment(fieldValue);
    const oldPath = item.path_code;

    setLocalItems((prev) => {
      if (codeSegment.length !== 2) {
        return prev.map((candidate) => (candidate.id === item.id ? { ...candidate, code_segment: codeSegment, _dirty: !candidate._isNew } : candidate));
      }

      if (codeSegment === "00") {
        toast.warning("Codul clasei trebuie să fie diferit de 00.", { position: "top-right" });
        return prev;
      }

      const pathParts = getPathParts(oldPath);
      const parentPath = pathParts.slice(0, -1).join(".");
      const newPath = parentPath ? `${parentPath}.${codeSegment}` : codeSegment;
      const hasConflict = prev.some((candidate) => !isDeletedItem(candidate) && candidate.path_code === newPath && candidate.id !== item.id && !candidate.path_code.startsWith(`${oldPath}.`));

      if (hasConflict) {
        toast.warning("Codul există deja pe acest nivel.", { position: "top-right" });
        return prev;
      }

      if (selectedPath === oldPath || selectedPath.startsWith(`${oldPath}.`)) {
        setSelectedPath((current) => replacePathPrefix(current, oldPath, newPath));
      }

      return prev.map((candidate) => {
        if (candidate.id !== item.id && !candidate.path_code.startsWith(`${oldPath}.`)) return candidate;

        const pathCode = replacePathPrefix(candidate.path_code, oldPath, newPath);
        const candidateParts = getPathParts(pathCode);
        return {
          ...candidate,
          path_code: pathCode,
          code_segment: candidate.id === item.id ? codeSegment : candidateParts[candidateParts.length - 1] || candidate.code_segment,
          level_no: candidateParts.length || candidate.level_no,
          _dirty: !candidate._isNew,
        };
      });
    });
  };

  const setNewInput = (level, key, fieldValue) => {
    setNewInputs((prev) => ({
      ...prev,
      [level]: {
        ...(prev[level] || { code_segment: "", denumire_ro: "", denumire_fr: "" }),
        [key]: fieldValue,
      },
    }));
  };

  const getLevelItems = (level) => {
    if (level > levelCount || (level > 1 && selectedParts.length < level - 1)) return [];
    const parentPath = selectedParts.slice(0, level - 1).join(".");

    return visibleItems
      .filter((item) => {
        const parts = getPathParts(item.path_code);
        if (parts.length !== level) return false;
        if (level === 1) return true;
        return parts.slice(0, level - 1).join(".") === parentPath;
      })
      .sort(sortByCode);
  };

  const handleSelectPath = (pathCode) => {
    setSelectedPath(pathCode);
  };

  const handleAddLocal = (level) => {
    if (level > levelCount || (level > 1 && selectedParts.length < level - 1)) return;

    const input = newInputs[level] || {};
    const codeSegment = normalizeSegment(input.code_segment);
    const denumireRo = String(input.denumire_ro || "").trim();
    const denumireFr = String(input.denumire_fr || "").trim();

    if (codeSegment.length !== 2 || codeSegment === "00" || !denumireRo || !denumireFr) {
      toast.warning("Codul trebuie să aibă 2 cifre, diferit de 00, iar denumirile RO și FR sunt obligatorii.", { position: "top-right" });
      return;
    }

    const parentPath = selectedParts.slice(0, level - 1).join(".");
    const pathCode = parentPath ? `${parentPath}.${codeSegment}` : codeSegment;

    if (visibleItems.some((item) => item.path_code === pathCode)) {
      toast.warning("Codul există deja pe acest nivel.", { position: "top-right" });
      return;
    }

    const newItem = {
      id: `new-${Date.now()}-${level}`,
      level_no: level,
      code_segment: codeSegment,
      path_code: pathCode,
      denumire_ro: denumireRo,
      denumire_fr: denumireFr,
      is_active: 1,
      _isNew: true,
      _dirty: false,
    };

    setLocalItems((prev) => [...prev, newItem]);
    setSelectedPath(pathCode);
    setNewInputs((prev) => ({ ...prev, [level]: { code_segment: "", denumire_ro: "", denumire_fr: "" } }));
  };

  const handleDeleteLocal = (item) => {
    const idsToDelete = localItems.filter((candidate) => candidate.path_code === item.path_code || candidate.path_code.startsWith(`${item.path_code}.`)).map((candidate) => candidate.id);

    if (item._isNew) {
      setLocalItems((prev) => prev.filter((candidate) => !idsToDelete.includes(candidate.id)));
    } else {
      setDeletedIds((prev) => [...new Set([...prev, item.id])]);
      setDeletedPaths((prev) => [...new Set([...prev, item.path_code])]);
      setLocalItems((prev) => prev.filter((candidate) => !candidate._isNew || !idsToDelete.includes(candidate.id)));
    }

    if (selectedPath === item.path_code || selectedPath.startsWith(`${item.path_code}.`)) {
      setSelectedPath(getPathParts(item.path_code).slice(0, -1).join("."));
    }
  };

  const persistClassChanges = async () => {
    try {
      show();
      const invalidItem = localItems.find(
        (item) => !isDeletedItem(item) && (!validatePathCodeLike(item.path_code, normalizedScope) || normalizeSegment(item.code_segment).length !== 2 || item.code_segment === "00"),
      );

      if (invalidItem) {
        throw new Error("Codurile claselor trebuie să aibă 2 cifre și să fie diferite de 00.");
      }

      const missingNameItem = localItems.find((item) => !isDeletedItem(item) && (!String(item.denumire_ro || "").trim() || !String(item.denumire_fr || "").trim()));

      if (missingNameItem) {
        throw new Error("Denumirile RO și FR sunt obligatorii pentru fiecare clasă.");
      }

      const creates = localItems
        .filter((item) => item._isNew && !isDeletedItem(item))
        .map((item) => ({
          path_code: item.path_code,
          denumire_ro: String(item.denumire_ro || "").trim(),
          denumire_fr: String(item.denumire_fr || "").trim(),
          is_active: 1,
        }));

      const updates = localItems
        .filter((item) => item._dirty && !item._isNew && !isDeletedItem(item))
        .sort((a, b) => a.level_no - b.level_no)
        .map((item) => ({
          id: item.id,
          path_code: item.path_code,
          denumire_ro: String(item.denumire_ro || "").trim(),
          denumire_fr: String(item.denumire_fr || "").trim(),
          is_active: 1,
        }));

      const deletes = deletedIds.filter((id) => !String(id).startsWith("new-")).map((id) => ({ id }));

      const delete_paths = deletedPaths.filter(Boolean);

      if (creates.length === 0 && updates.length === 0 && deletes.length === 0 && delete_paths.length === 0) {
        return;
      }

      await bulkSaveClase({
        scope: normalizedScope,
        creates,
        updates,
        deletes,
        delete_paths,
      });

      const refreshed = await refetch();

      setDeletedIds([]);
      setDeletedPaths([]);

      setLocalItems(
        (refreshed.data?.items || []).map((item) => ({
          ...item,
          _dirty: false,
          _isNew: false,
        })),
      );
    } catch (error) {
      console.log("A apărut o eroare la salvarea claselor:", error);
      toast.error(error?.response?.data?.message || "Eroare la salvarea claselor.", { position: "top-right" });
      throw error;
    } finally {
      hide();
    }
  };

  const handleSaveClasses = async () => {
    try {
      await persistClassChanges();
      setEditMode(false);
      toast.success("Clasele au fost salvate.", { position: "top-right" });
    } catch (error) {
      toast.error(error?.response?.data?.message || "Eroare la salvarea claselor.", { position: "top-right" });
    }
  };

  const handleSaveAndApply = async () => {
    if (filterMode) {
      try {
        await persistClassChanges();
        const selectedLabel = selectedItems.map((item) => `${item.code_segment}.${getDisplayName(item, displayLang)}`).join(" -> ");

        onApply({
          cod_filter: selectedPath.replace(/\./g, " "),
          class_path: selectedPath,
          clasa_reteta: selectedLabel,
          catalog_clasa: selectedLabel,
        });
        setOpen(false);
      } catch (error) {
        toast.error(error?.response?.data?.message || "Eroare la salvarea claselor.", { position: "top-right" });
      }
      return;
    }

    const requiredFinalSegments = isCatalogScopeValue ? 3 : 1;
    const cleanFinalSegments = Array.from({ length: requiredFinalSegments }, (_, index) => normalizeFinalSegment(finalSegments[index], normalizedScope));

    if (cleanFinalSegments.some((segment) => segment.length !== 3)) {
      toast.warning(isCatalogScopeValue ? "Toate cele 3 segmente finale trebuie să aibă câte 3 caractere: litere sau cifre." : "Codul final al rețetei trebuie să aibă 3 cifre.", {
        position: "top-right",
      });
      return;
    }

    try {
      await persistClassChanges();

      const fullCode = buildCodeFromPath(selectedPath, cleanFinalSegments, normalizedScope);
      const selectedLabel = selectedItems.map((item) => `${item.code_segment}.${getDisplayName(item, displayLang)}`).join(" -> ");
      onApply?.(isCatalogScopeValue ? { cod_definitie: fullCode, catalog_clasa: selectedLabel, class_path: selectedPath } : { cod_reteta: fullCode, clasa_reteta: selectedLabel, class_path: selectedPath });
      setOpen(false);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Eroare la salvarea claselor.", { position: "top-right" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-[90rem] h-[82vh] p-0 gap-0 flex flex-col">
        <DialogHeader className="px-4 xxxl:px-6 py-3 xxxl:py-4 border-b rounded-t-md bg-muted flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 xxxl:h-12 xxxl:w-12 rounded-lg flex items-center justify-center bg-sky-600/15 border border-sky-600/30 text-sky-600">
              <FontAwesomeIcon icon={faFolderTree} className="text-lg xxxl:text-xl" />
            </div>
            <div>
              <p className="text-xs xxxl:text-sm uppercase tracking-widest font-bold text-sky-600">{catalogMode ? catalogScopeLabel : isCatalogScopeValue ? `Cod ${catalogScopeLabel}` : "Cod rețetă"}</p>
              <DialogTitle className="text-base xxxl:text-lg font-bold">{isCatalogScopeValue ? `Clase ${catalogScopeLabel}` : catalogMode ? "Catalog clase rețete" : "Clase rețetă"}</DialogTitle>
            </div>
          </div>

          <div className="mr-10 flex items-center gap-3">
            <div className="flex items-center gap-2">
              {!filterMode && !catalogMode && (
                <>
                  <Label className="text-xs font-bold uppercase text-foreground">{isCatalogScopeValue ? "Cod specific" : "Cod final"}</Label>
                  <div className="flex items-center gap-1">
                    {isCatalogScopeValue &&
                      Array.from({ length: levelCount }, (_, index) => (
                        <Input
                          key={`class-${index}`}
                          value={selectedParts[index] || "00"}
                          disabled
                          className="h-9 w-12 bg-muted text-center text-xs font-black text-foreground opacity-100"
                        />
                      ))}
                    {Array.from({ length: isCatalogScopeValue ? 3 : 1 }, (_, index) => (
                      <Input
                        key={index}
                        value={finalSegments[index] || ""}
                        onChange={(event) => {
                          const value = normalizeFinalSegment(event.target.value, normalizedScope);
                          setAutoGeneratedCatalogFinal({ path: "", value: "" });
                          setFinalSegments((prev) => {
                            const next = [...prev];
                            next[index] = value;
                            return next;
                          });
                        }}
                        inputMode={isCatalogScopeValue ? "text" : "numeric"}
                        className="w-16 h-9 text-center bg-accent font-bold"
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
            <Button
              variant="outline"
              className="gap-2 h-9 xxxl:h-9 text-sm xxxl:text-base text-foreground w-[4.75rem] xxxl:w-[5rem]"
              onClick={() => setEditLang((prev) => (prev === "RO" ? "FR" : "RO"))}
            >
              <FontAwesomeIcon icon={faLanguage} />
              <span>{editLang}</span>
            </Button>
            {(catalogMode || editMode || hasClassChanges) && (
              <Button onClick={handleSaveClasses} variant="outline" className="gap-2 bg-sky-600 hover:bg-sky-700 hover:text-white text-white h-9">
                <FontAwesomeIcon icon={faSave} />
                Salvează clase
              </Button>
            )}
            {!catalogMode && (
              <Button onClick={handleSaveAndApply} className="gap-2 h-9 bg-sky-600 hover:bg-sky-700 text-white">
                <FontAwesomeIcon icon={faCheck} />
                {filterMode ? "Aplică filtrul" : "Salvează și aplică"}
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="px-4 py-3 gap-1 flex items-center border-b ">
          {selectedItems.map((item, index) => {
            return (
              <Fragment key={`${item.path_code}-${index}`}>
                <span className="inline-flex min-w-0 max-w-[12rem] rounded-md border p-1 text-xs xxxl:text-sm font-semibold">
                  <OverflowTooltip text={`${item.code_segment}. ${getDisplayName(item, editLang)}`} align="center" className="block max-w-full truncate" maxLines={1} textSize="sm" />
                </span>

                {index < selectedItems.length - 1 && (
                  <span className="text-base">
                    <FontAwesomeIcon icon={faArrowRight} />
                  </span>
                )}
              </Fragment>
            );
          })}
        </div>

        <div className={`${isCatalogScopeValue ? "grid grid-cols-2" : "grid grid-cols-5"} flex-1 min-h-0`}>
          {Array.from({ length: levelCount }, (_, index) => {
            const level = index + 1;
            const items = getLevelItems(level);
            const input = newInputs[level] || { code_segment: "", denumire_ro: "", denumire_fr: "" };
            const canAdd = level === 1 || selectedParts.length >= level - 1;

            return (
              <div key={level} className="min-h-0 border-r  flex flex-col">
                <div className="px-2 py-1.5 border-b  text-sm b bg-muted font-bold uppercase text-foreground">{getScopeLevelLabel(normalizedScope, level)}</div>

                <div className="flex-1 overflow-auto">
                  {isFetching ? (
                    <div className="p-2 text-sm italic text-foreground">Se încarcă...</div>
                  ) : items.length > 0 ? (
                    items.map((item) => {
                      const isSelected = selectedPath === item.path_code || selectedPath.startsWith(`${item.path_code}.`);
                      return (
                        <ContextMenu key={item.id}>
                          <ContextMenuTrigger asChild>
                            <div className={`group cursor-pointer border-b ${isSelected ? "bg-sky-600/25" : "hover:bg-accent"}`} onClick={() => !editMode && handleSelectPath(item.path_code)}>
                              <div className="flex min-w-0 items-stretch">
                                <span
                                  className="inline-flex h-8 w-12 shrink-0 items-center justify-center border-r px-1 text-xs font-black text-foreground"
                                  onClick={(event) => {
                                    if (!editMode) return;
                                    event.stopPropagation();
                                    handleSelectPath(item.path_code);
                                  }}
                                >
                                  {editMode ? (
                                    <Input
                                      value={item.code_segment}
                                      onClick={(event) => event.stopPropagation()}
                                      onFocus={() => handleSelectPath(item.path_code)}
                                      onChange={(event) => setItemCodeSegment(item, event.target.value)}
                                      className="h-8 w-full rounded-none border-0 bg-transparent px-0 text-center text-xs font-black shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                                    />
                                  ) : (
                                    item.code_segment
                                  )}
                                </span>
                                {editMode ? (
                                  <Input
                                    value={editLang === "FR" ? item.denumire_fr || "" : item.denumire_ro || ""}
                                    onClick={(event) => event.stopPropagation()}
                                    onChange={(event) => setItemField(item.id, editLang === "FR" ? "denumire_fr" : "denumire_ro", event.target.value)}
                                    className="h-8 min-w-0 rounded-none border-0 bg-transparent px-2 text-xs font-semibold shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                                  />
                                ) : (
                                  <span className="flex h-8 min-w-0 flex-1 items-center px-2 text-xs font-semibold">
                                    <OverflowTooltip text={getDisplayName(item, editLang)} align="left" className="block max-w-full truncate" maxLines={1} textSize="sm" />
                                  </span>
                                )}
                              </div>
                            </div>
                          </ContextMenuTrigger>
                          <ContextMenuContent className="w-48">
                            <ContextMenuItem className="gap-3" onClick={() => setEditMode(true)}>
                              <FontAwesomeIcon className="text-low" icon={faPenToSquare} /> Editează
                            </ContextMenuItem>
                            <ContextMenuSeparator />
                            <ContextMenuItem className="gap-3 text-destructive focus:text-destructive hover:text-destructive" onClick={() => handleDeleteLocal(item)}>
                              <FontAwesomeIcon icon={faTrash} /> Șterge
                            </ContextMenuItem>
                          </ContextMenuContent>
                        </ContextMenu>
                      );
                    })
                  ) : (
                    <div className="p-2 text-sm italic text-foreground">Gol</div>
                  )}
                </div>

                <div className="border-t p-1.5 flex flex-col gap-1">
                  <div className="flex gap-1">
                    <Input
                      value={input.code_segment}
                      disabled={!canAdd}
                      onChange={(event) => setNewInput(level, "code_segment", normalizeSegment(event.target.value))}
                      placeholder="00"
                      className="h-7 w-12 shrink-0 px-1  text-xs font-bold text-center"
                    />
                    <Button type="button" disabled={!canAdd} className="h-7 flex-1 gap-1.5 bg-sky-600 px-2 text-xs hover:bg-sky-700 text-white" onClick={() => handleAddLocal(level)}>
                      <FontAwesomeIcon icon={faPlus} className="text-xs" />
                      Adaugă
                    </Button>
                  </div>
                  <Input
                    value={input.denumire_ro}
                    disabled={!canAdd}
                    onChange={(event) => setNewInput(level, "denumire_ro", event.target.value)}
                    placeholder="Denumire RO"
                    className="h-7 w-full px-2 text-xs"
                  />
                  <Input
                    value={input.denumire_fr}
                    disabled={!canAdd}
                    onChange={(event) => setNewInput(level, "denumire_fr", event.target.value)}
                    placeholder="Denumire FR"
                    className="h-7 w-full px-2 text-xs"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
