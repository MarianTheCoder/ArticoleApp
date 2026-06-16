import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown, faChevronRight, faEllipsis, faEye, faEyeSlash, faFolderOpen, faPenToSquare, faPercent, faPlus, faQuestion, faTrash } from "@fortawesome/free-solid-svg-icons";
import { toast } from "sonner";

import { AuthContext } from "@/context/TokenContext";
import { useLoading } from "@/context/LoadingContext";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipArrow, TooltipContent, TooltipTrigger } from "@radix-ui/react-tooltip";
import DeleteDialog from "@/components/ui/delete-dialog";
import OverflowTooltip from "@/components/ui/OverflowTooltip";
import SpinnerElement from "@/MainElements/SpinnerElement";
import { cn } from "@/lib/utils";
import { useAddOfertaCoeficient, useDeleteOfertaCoeficient, useEditOfertaCoeficient, useOfertaCoeficienti, useOferteRetete, useSaveOfertaCoeficientTinte } from "@/hooks/Database/useOferte";
import { formatNumber, getElementTotalInLucrare, getRetetaTotalLucrare, parseMaybeJson } from "../../helpers/OferteReteteHelpers";
import OferteSidebarCoeficientDialog from "./OferteSidebarCoeficientDialog";

const emptyDraft = {
  id: null,
  nume: "",
};

const EMPTY_ARRAY = [];

const sortByName = (items = []) => {
  return [...items].sort((a, b) =>
    String(a?.nume || "").localeCompare(String(b?.nume || ""), "ro", {
      sensitivity: "base",
      numeric: true,
    }),
  );
};

const TARGET_TYPES = [
  { value: "all_recipes", label: "Toate rețetele", scope: "recipe" },
  { value: "recipe_class", label: "Clasă rețetă", scope: "recipe" },
  { value: "recipe_exact", label: "Rețetă exactă", scope: "recipe" },
  { value: "all_elements", label: "Toate elementele", scope: "element" },
  { value: "catalog_class", label: "Clasă catalog", scope: "element" },
  { value: "resource_type", label: "Tip resursă", scope: "element" },
  { value: "catalog_class_resource_type", label: "Clasă catalog + tip resursă", scope: "element" },
  { value: "element_exact", label: "Element exact", scope: "element" },
];

const TARGET_TYPE_META = TARGET_TYPES.reduce((acc, item) => {
  acc[item.value] = item;
  return acc;
}, {});

const RESOURCE_TYPES = [
  { value: "manopera", label: "Manoperă" },
  { value: "material", label: "Material" },
  { value: "utilaj", label: "Utilaj" },
  { value: "transport", label: "Transport" },
];

const RESOURCE_TYPE_LABELS = RESOURCE_TYPES.reduce((acc, item) => {
  acc[item.value] = item.label;
  return acc;
}, {});

const COEFICIENT_RULE_HELP = `În același coeficient regulile care se suprapun nu se adună.
Se aplică regula cea mai specifică:
1. element exact
2. rețetă exactă
3. clasă catalog + tip resursă
4. clasă catalog
5. tip resursă
6. clasă rețetă
7. toate

Exclude bate include în acel coeficient.
Coeficienții diferiți se adună între ei.`;

const createEmptyRule = () => ({
  id: `local-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  target_type: "all_recipes",
  action: "include",
  percent: "0",
  match_mode: "prefix",
  recipe_id: "",
  recipe_ids: [],
  recipe_class_path: "",
  element_id: "",
  element_ids: [],
  catalog_class_path: "",
  tip_resursa: "",
});

const getClassLabel = (level, displayLang = "RO") => {
  if (!level || level.is_empty) return "";
  const denumire = displayLang === "FR" ? level.denumire_fr || level.denumire_ro : level.denumire_ro;
  return `${level.code_segment}. ${level.is_defined && denumire ? denumire : "Nedefinit"}`;
};

const getRetetaClassLevels = (reteta) => {
  const snapshot = parseMaybeJson(reteta?.class_snapshot, []);
  if (Array.isArray(snapshot) && snapshot.length > 0) return snapshot;
  return Array.isArray(reteta?.cod_reteta_meta?.classLevels) ? reteta.cod_reteta_meta.classLevels : [];
};

const getElementClassLevels = (element) => {
  const snapshot = parseMaybeJson(element?.definitie_oferta?.catalog_class_snapshot || element?.catalog_class_snapshot, []);
  if (Array.isArray(snapshot)) return snapshot;
  if (Array.isArray(snapshot?.levels)) return snapshot.levels;
  if (Array.isArray(snapshot?.classLevels)) return snapshot.classLevels;
  return [];
};

const getPathPartsCount = (pathCode) =>
  String(pathCode || "")
    .split(".")
    .filter(Boolean).length;

const pathMatches = (candidatePath, targetPath, matchMode = "prefix") => {
  const candidate = String(candidatePath || "").trim();
  const target = String(targetPath || "").trim();

  if (!candidate || !target) return false;
  if (matchMode === "exact") return candidate === target;

  return candidate === target || candidate.startsWith(`${target}.`);
};

const getPercentValue = (value) => {
  const numberValue = Number(String(value || "0").replace(",", "."));
  if (!Number.isFinite(numberValue)) return 0;
  return Math.min(1000, Math.max(0, numberValue));
};

const normalizePercentValue = (value) => {
  const next = String(value || "").replace(",", ".");
  if (next === "") return "";
  if (!/^\d{0,4}(\.\d{0,2})?$/.test(next)) return null;
  if (Number(next) > 1000) return "1000";
  return next;
};

const cloneRules = (rules = []) =>
  rules.map((rule) => ({
    ...rule,
    recipe_ids: Array.isArray(rule.recipe_ids) ? [...rule.recipe_ids] : [],
    element_ids: Array.isArray(rule.element_ids) ? [...rule.element_ids] : [],
  }));

const getRuleRecipeIds = (rule) => {
  const ids = Array.isArray(rule?.recipe_ids) ? rule.recipe_ids : [];
  const allIds = ids.length > 0 ? ids : rule?.recipe_id ? [rule.recipe_id] : [];
  return allIds.map((id) => String(id)).filter(Boolean);
};

const getRuleElementIds = (rule) => {
  const ids = Array.isArray(rule?.element_ids) ? rule.element_ids : [];
  const allIds = ids.length > 0 ? ids : rule?.element_id ? [rule.element_id] : [];
  return allIds.map((id) => String(id)).filter(Boolean);
};

const isRecipeRule = (rule) => TARGET_TYPE_META[rule.target_type]?.scope === "recipe";
const isElementRule = (rule) => TARGET_TYPE_META[rule.target_type]?.scope === "element";

const getRecipeRuleScore = (rule) => {
  if (rule.target_type === "recipe_exact") return 2000;
  if (rule.target_type === "recipe_class") return 600 + getPathPartsCount(rule.recipe_class_path);
  if (rule.target_type === "all_recipes") return 100;
  return 0;
};

const getElementRuleScore = (rule) => {
  if (rule.target_type === "element_exact") return 3000;
  if (rule.target_type === "catalog_class_resource_type") return 2200 + getPathPartsCount(rule.catalog_class_path);
  if (rule.target_type === "catalog_class") return 2000 + getPathPartsCount(rule.catalog_class_path);
  if (rule.target_type === "resource_type") return 1800;
  if (rule.target_type === "all_elements") return 100;
  return 0;
};

const recipeMatchesRule = (reteta, rule) => {
  if (rule.target_type === "all_recipes") return true;
  if (rule.target_type === "recipe_exact") {
    const recipeIds = getRuleRecipeIds(rule);
    return recipeIds.length > 0 ? recipeIds.includes(String(reteta.id)) : String(reteta.id) === String(rule.recipe_id);
  }
  if (rule.target_type === "recipe_class") {
    return getRetetaClassLevels(reteta).some((level) => pathMatches(level?.path_code, rule.recipe_class_path, rule.match_mode));
  }

  return false;
};

const elementMatchesRule = (element, rule) => {
  if (rule.target_type === "all_elements") return true;
  if (rule.target_type === "element_exact") {
    const elementIds = getRuleElementIds(rule);
    return elementIds.length > 0 ? elementIds.includes(String(element.id)) : String(element.id) === String(rule.element_id);
  }
  if (rule.target_type === "resource_type") return String(element.tip_resursa || "") === String(rule.tip_resursa || "");
  if (rule.target_type === "catalog_class") {
    return getElementClassLevels(element).some((level) => pathMatches(level?.path_code, rule.catalog_class_path, rule.match_mode));
  }
  if (rule.target_type === "catalog_class_resource_type") {
    return (
      String(element.tip_resursa || "") === String(rule.tip_resursa || "") && getElementClassLevels(element).some((level) => pathMatches(level?.path_code, rule.catalog_class_path, rule.match_mode))
    );
  }

  return false;
};

const pickMostSpecificRule = (matches, scoreGetter) => {
  return matches
    .map((rule) => ({
      rule,
      score: scoreGetter(rule),
    }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.rule.action !== b.rule.action) return a.rule.action === "exclude" ? -1 : 1;
      return 0;
    })[0]?.rule;
};

const buildRuleSummary = (rule, options) => {
  const actionText = rule.action === "exclude" ? "Exclude" : `+${formatNumber(getPercentValue(rule.percent), 2)}%`;
  const recipeIds = getRuleRecipeIds(rule);
  const elementIds = getRuleElementIds(rule);
  const recipe = options.reteteById.get(String(recipeIds[0] || rule.recipe_id));
  const element = options.elementsById.get(String(elementIds[0] || rule.element_id));
  const recipeClass = options.recipeClassesByPath.get(rule.recipe_class_path);
  const catalogClass = options.catalogClassesByPath.get(rule.catalog_class_path);
  const resourceType = RESOURCE_TYPE_LABELS[rule.tip_resursa] || "tip neselectat";
  let targetText = "";

  if (rule.target_type === "all_recipes") targetText = "Toate rețetele";
  if (rule.target_type === "recipe_class") targetText = recipeClass?.label || "Clasă rețetă neselectată";
  if (rule.target_type === "recipe_exact") {
    targetText = recipeIds.length > 1 ? `${recipeIds.length} rețete` : recipe?.label || "Rețetă neselectată";
  }
  if (rule.target_type === "all_elements") targetText = "Toate elementele";
  if (rule.target_type === "catalog_class") targetText = catalogClass?.label || "Clasă catalog neselectată";
  if (rule.target_type === "resource_type") targetText = resourceType;
  if (rule.target_type === "catalog_class_resource_type") targetText = `${resourceType} · ${catalogClass?.label || "clasă catalog neselectată"}`;
  if (rule.target_type === "element_exact") {
    targetText = elementIds.length > 1 ? `${elementIds.length} elemente` : element?.label || "Element neselectat";
  }

  return targetText ? `${actionText} · ${targetText}` : actionText;
};

const calculateAffectedRows = ({ retete, rules }) => {
  const recipeRules = rules.filter(isRecipeRule);
  const elementRules = rules.filter(isElementRule);
  const retetaIds = new Set();
  const elementIds = new Set();
  const excludedRetetaIds = new Set();
  const excludedElementIds = new Set();
  const retetaImpactById = {};
  const elementImpactById = {};

  retete.forEach((reteta) => {
    const retetaId = String(reteta.id);
    const retetaTotal = getRetetaTotalLucrare(reteta);
    let directPercent = 0;
    let directAdded = 0;
    let interiorAdded = 0;
    let recipeExcluded = false;

    const recipeRule = pickMostSpecificRule(
      recipeRules.filter((rule) => recipeMatchesRule(reteta, rule)),
      getRecipeRuleScore,
    );

    if (recipeRule) {
      if (recipeRule.action === "exclude") {
        recipeExcluded = true;
        excludedRetetaIds.add(retetaId);
      } else {
        directPercent = getPercentValue(recipeRule.percent);
        directAdded = retetaTotal * (directPercent / 100);
        retetaIds.add(retetaId);
      }
    }

    (reteta.elemente || []).forEach((element) => {
      const elementId = String(element.id);
      const elementRule = pickMostSpecificRule(
        elementRules.filter((rule) => elementMatchesRule(element, rule)),
        getElementRuleScore,
      );

      if (!elementRule) return;

      if (elementRule.action === "exclude") {
        excludedElementIds.add(elementId);
        elementImpactById[elementId] = {
          percent: 0,
          addedValue: 0,
          excluded: true,
        };
        return;
      }

      const percent = getPercentValue(elementRule.percent);
      const addedValue = getElementTotalInLucrare(element, reteta) * (percent / 100);

      interiorAdded += addedValue;
      elementIds.add(elementId);
      elementImpactById[elementId] = {
        percent,
        addedValue,
        excluded: false,
      };
    });

    const interiorPercent = retetaTotal > 0 ? (interiorAdded / retetaTotal) * 100 : 0;

    if (recipeRule || interiorAdded > 0) {
      retetaImpactById[retetaId] = {
        directPercent,
        directAdded,
        interiorPercent,
        interiorAdded,
        totalAdded: directAdded + interiorAdded,
        excluded: recipeExcluded,
      };
    }
  });

  return {
    retetaIds: [...retetaIds],
    elementIds: [...elementIds],
    excludedRetetaIds: [...excludedRetetaIds],
    excludedElementIds: [...excludedElementIds],
    retetaImpactById,
    elementImpactById,
  };
};

const calculateAppliedCoefficientRows = ({ retete, coeficienti }) => {
  const retetaImpactById = {};
  const elementImpactById = {};

  (coeficienti || [])
    .filter((coeficient) => coeficient?.activ !== false)
    .forEach((coeficient) => {
      const rules = Array.isArray(coeficient?.tinte) ? coeficient.tinte : [];
      if (rules.length === 0) return;

      const impact = calculateAffectedRows({ retete, rules });

      Object.entries(impact.retetaImpactById || {}).forEach(([retetaId, rowImpact]) => {
        if (rowImpact?.excluded) return;

        if (!retetaImpactById[retetaId]) {
          retetaImpactById[retetaId] = {
            directAdded: 0,
            interiorAdded: 0,
            totalAdded: 0,
            directPercent: 0,
            interiorPercent: 0,
            excluded: false,
          };
        }

        retetaImpactById[retetaId].directAdded += Number(rowImpact.directAdded || 0);
        retetaImpactById[retetaId].interiorAdded += Number(rowImpact.interiorAdded || 0);
        retetaImpactById[retetaId].totalAdded += Number(rowImpact.totalAdded || 0);
      });

      Object.entries(impact.elementImpactById || {}).forEach(([elementId, rowImpact]) => {
        if (rowImpact?.excluded) return;

        if (!elementImpactById[elementId]) {
          elementImpactById[elementId] = {
            percent: 0,
            addedValue: 0,
            excluded: false,
          };
        }

        elementImpactById[elementId].addedValue += Number(rowImpact.addedValue || 0);
      });
    });

  const reteteById = new Map((retete || []).map((reteta) => [String(reteta.id), reteta]));
  const elementsById = new Map();

  (retete || []).forEach((reteta) => {
    (reteta.elemente || []).forEach((element) => {
      elementsById.set(String(element.id), { element, reteta });
    });
  });

  Object.entries(retetaImpactById).forEach(([retetaId, impact]) => {
    const retetaTotal = getRetetaTotalLucrare(reteteById.get(String(retetaId)));
    impact.directPercent = retetaTotal > 0 ? (impact.directAdded / retetaTotal) * 100 : 0;
    impact.interiorPercent = retetaTotal > 0 ? (impact.interiorAdded / retetaTotal) * 100 : 0;
  });

  Object.entries(elementImpactById).forEach(([elementId, impact]) => {
    const item = elementsById.get(String(elementId));
    const elementTotal = item ? getElementTotalInLucrare(item.element, item.reteta) : 0;
    impact.percent = elementTotal > 0 ? (impact.addedValue / elementTotal) * 100 : 0;
  });

  return {
    retetaImpactById,
    elementImpactById,
  };
};

const emptyEditorState = {
  active: false,
  highlight: false,
  retetaIds: [],
  elementIds: [],
  excludedRetetaIds: [],
  excludedElementIds: [],
  retetaImpactById: {},
  elementImpactById: {},
};

const compactSelectClass = "h-7 w-full min-w-0 truncate rounded-md border bg-background px-1.5 text-xs font-semibold text-foreground";
const compactLabelClass = "text-xs font-black uppercase leading-none text-muted-foreground";

function CoeficientRuleInlineEditor({ rule, index, selectorOptions, onChange, onDelete, onTogglePreview, isPreviewVisible, onActivateRecipeSelection, onActivateElementSelection }) {
  const [recipesOpen, setRecipesOpen] = useState(true);
  const [elementsOpen, setElementsOpen] = useState(true);
  const targetType = TARGET_TYPE_META[rule.target_type] || TARGET_TYPES[0];
  const isInclude = rule.action !== "exclude";
  const needsRecipeClass = rule.target_type === "recipe_class";
  const needsRecipe = rule.target_type === "recipe_exact";
  const needsCatalogClass = rule.target_type === "catalog_class" || rule.target_type === "catalog_class_resource_type";
  const needsResourceType = rule.target_type === "resource_type" || rule.target_type === "catalog_class_resource_type";
  const needsElement = rule.target_type === "element_exact";
  const needsMatchMode = needsRecipeClass || needsCatalogClass;
  const selectedRecipeIds = getRuleRecipeIds(rule);
  const selectedRecipeItems = selectedRecipeIds.map((id) => selectorOptions.reteteById.get(String(id))).filter(Boolean);
  const selectedElementIds = getRuleElementIds(rule);
  const selectedElementItems = selectedElementIds.map((id) => selectorOptions.elementsById.get(String(id))).filter(Boolean);

  return (
    <div className="rounded-md p-2 shadow-sm ring-1 ring-border transition-colors">
      <div className="flex items-start gap-1.5">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-teal-600 text-xs font-black text-white">{index + 1}</div>

        <div className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_5.5rem_4.5rem] gap-1.5">
          <div className="flex min-w-0 flex-col gap-1">
            <Label className={compactLabelClass}>Țintă</Label>
            <select value={rule.target_type} onChange={(event) => onChange(rule.id, { target_type: event.target.value })} className={compactSelectClass}>
              {TARGET_TYPES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex min-w-0 flex-col gap-1">
            <Label className={compactLabelClass}>Acțiune</Label>
            <select value={rule.action} onChange={(event) => onChange(rule.id, { action: event.target.value })} className={`${compactSelectClass} ${isInclude ? "text-teal-600" : "text-destructive"}`}>
              <option value="include">Include</option>
              <option value="exclude">Exclude</option>
            </select>
          </div>

          <div className="flex min-w-0 flex-col gap-1">
            <Label className={compactLabelClass}>%</Label>
            <Input
              value={rule.percent}
              disabled={!isInclude}
              onChange={(event) => {
                const nextValue = normalizePercentValue(event.target.value);
                if (nextValue === null) return;
                onChange(rule.id, { percent: nextValue });
              }}
              className="h-7 px-1.5 text-xs font-bold"
            />
          </div>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          title={isPreviewVisible ? "Ascunde regula" : "Vezi regula"}
          className={cn(
            "h-7 w-7 shrink-0",
            isPreviewVisible && isInclude ? "bg-teal-600/10 text-teal-700 hover:bg-teal-600/15 dark:text-teal-300" : "",
            isPreviewVisible && !isInclude ? "bg-red-200 text-red-950 hover:bg-red-200 dark:bg-red-500 dark:text-black" : "",
          )}
          onClick={() => onTogglePreview(rule.id)}
        >
          <FontAwesomeIcon icon={isPreviewVisible ? faEyeSlash : faEye} />
        </Button>

        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-destructive hover:text-destructive" onClick={() => onDelete(rule.id)}>
          <FontAwesomeIcon icon={faTrash} />
        </Button>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-1.5">
        {needsRecipeClass && (
          <>
            {[1, 2, 3, 4, 5].map((levelNo) => {
              const levelOptions = selectorOptions.recipeClassesByLevel[levelNo] || [];
              const selectedLevelNo = rule.recipe_class_path ? String(rule.recipe_class_path).split(".").filter(Boolean).length : 0;

              return (
                <div key={`recipe-class-${levelNo}`} className="flex min-w-0 flex-col gap-1">
                  <Label className={compactLabelClass}>Clasă {levelNo}</Label>
                  <select
                    value={Number(selectedLevelNo) === Number(levelNo) ? rule.recipe_class_path || "" : ""}
                    onChange={(event) => onChange(rule.id, { recipe_class_path: event.target.value })}
                    className={compactSelectClass}
                  >
                    <option value="">Alege nivel {levelNo}</option>
                    {levelOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
          </>
        )}

        {needsRecipe && (
          <div className="col-span-2 flex min-w-0 flex-col gap-1">
            <div className="flex items-center justify-between gap-1.5">
              <Label className={compactLabelClass}>Rețete</Label>
            </div>

            <div className="rounded-md border bg-background">
              <button
                type="button"
                className="flex h-7 w-full items-center gap-1.5 px-2 text-left text-xs font-semibold text-foreground"
                onClick={() => {
                  onActivateRecipeSelection(rule.id);
                  setRecipesOpen((prev) => !prev);
                }}
              >
                <FontAwesomeIcon icon={recipesOpen ? faChevronDown : faChevronRight} className="shrink-0 text-xs text-teal-600" />
                <span className="min-w-0 flex-1 truncate">{selectedRecipeItems.length ? `${selectedRecipeItems.length} rețete selectate` : "Nicio rețetă selectată"}</span>
              </button>

              {recipesOpen && selectedRecipeItems.length > 0 && (
                <div className="flex flex-col border-t">
                  {selectedRecipeItems.map((item) => (
                    <div key={item.value} className="min-w-0 px-2 py-1 text-xs font-semibold text-foreground">
                      <OverflowTooltip text={item.name || item.label} align="left" className="block min-w-0 truncate" maxLines={1} textSize="sm" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {needsCatalogClass && (
          <>
            {[1, 2].map((levelNo) => {
              const levelOptions = selectorOptions.catalogClassesByLevel[levelNo] || [];
              const selectedLevelNo = rule.catalog_class_path ? String(rule.catalog_class_path).split(".").filter(Boolean).length : 0;

              return (
                <div key={`catalog-class-${levelNo}`} className="flex min-w-0 flex-col gap-1">
                  <Label className={compactLabelClass}>{levelNo === 1 ? "Clasă catalog" : "Subclasă catalog"}</Label>
                  <select
                    value={Number(selectedLevelNo) === Number(levelNo) ? rule.catalog_class_path || "" : ""}
                    onChange={(event) => onChange(rule.id, { catalog_class_path: event.target.value })}
                    className={compactSelectClass}
                  >
                    <option value="">Alege nivel {levelNo}</option>
                    {levelOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
          </>
        )}

        {needsResourceType && (
          <div className="flex min-w-0 flex-col gap-1">
            <Label className={compactLabelClass}>Tip resursă</Label>
            <select value={rule.tip_resursa || ""} onChange={(event) => onChange(rule.id, { tip_resursa: event.target.value })} className={compactSelectClass}>
              <option value="">Alege tipul</option>
              {RESOURCE_TYPES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {needsElement && (
          <div className="col-span-2 flex min-w-0 flex-col gap-1">
            <div className="flex items-center justify-between gap-1.5">
              <Label className={compactLabelClass}>Elemente</Label>
            </div>

            <div className="rounded-md border bg-background">
              <button
                type="button"
                className="flex h-7 w-full items-center gap-1.5 px-2 text-left text-xs font-semibold text-foreground"
                onClick={() => {
                  onActivateElementSelection(rule.id);
                  setElementsOpen((prev) => !prev);
                }}
              >
                <FontAwesomeIcon icon={elementsOpen ? faChevronDown : faChevronRight} className="shrink-0 text-xs text-teal-600" />
                <span className="min-w-0 flex-1 truncate">{selectedElementItems.length ? `${selectedElementItems.length} elemente selectate` : "Niciun element selectat"}</span>
              </button>

              {elementsOpen && selectedElementItems.length > 0 && (
                <div className="flex flex-col border-t">
                  {selectedElementItems.map((item) => (
                    <div key={item.value} className="min-w-0 px-2 py-1 text-xs font-semibold text-foreground">
                      <OverflowTooltip text={item.name || item.label} align="left" className="block min-w-0 truncate" maxLines={1} textSize="sm" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {needsMatchMode && (
          <div className="flex min-w-0 flex-col gap-1">
            <Label className={compactLabelClass}>Match</Label>
            <select value={rule.match_mode || "prefix"} onChange={(event) => onChange(rule.id, { match_mode: event.target.value })} className={compactSelectClass}>
              <option value="prefix">Prefix</option>
              <option value="exact">Exact</option>
            </select>
          </div>
        )}

        {/* {!needsRecipeClass && !needsRecipe && !needsCatalogClass && !needsResourceType && !needsElement && (
          <div className="col-span-2 flex h-7 items-center rounded-md border bg-background px-2 text-xs font-semibold text-muted-foreground">{targetType.label} nu cere selector.</div>
        )} */}
      </div>

      <div
        className={cn(
          "mt-2 rounded-md border px-2 py-1 text-xs font-black",
          isInclude ? "border-teal-600/40 bg-teal-600/10 text-teal-700 dark:text-teal-300" : "border-red-600/40 bg-red-600/10 text-red-700 dark:text-red-300",
        )}
      >
        <OverflowTooltip text={buildRuleSummary(rule, selectorOptions)} align="left" className="block min-w-0 truncate" maxLines={1} textSize="sm" />
      </div>
    </div>
  );
}

export default function OferteCoeficientiSidebar({ selectedLucrare = null, isCollapsed = false, passive = false, onCoeficientEditorStateChange }) {
  const { user } = useContext(AuthContext);
  const { show, hide } = useLoading();
  const lucrareId = selectedLucrare?.id || null;
  const { data, isFetching } = useOfertaCoeficienti(lucrareId);
  const { data: reteteData } = useOferteRetete(lucrareId);
  const addCoeficient = useAddOfertaCoeficient();
  const editCoeficient = useEditOfertaCoeficient();
  const saveCoeficientTinte = useSaveOfertaCoeficientTinte();
  const deleteCoeficient = useDeleteOfertaCoeficient();

  const coeficienti = useMemo(() => sortByName(data?.coeficienti || EMPTY_ARRAY), [data?.coeficienti]);
  const reteteLucrare = Array.isArray(reteteData?.retete) ? reteteData.retete : EMPTY_ARRAY;

  const [openIds, setOpenIds] = useState(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState("add");
  const [draft, setDraft] = useState(emptyDraft);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [activeRulesCoeficientId, setActiveRulesCoeficientId] = useState(null);
  const [visibleRuleIds, setVisibleRuleIds] = useState(new Set());
  const [editorRules, setEditorRules] = useState([]);
  const [activeSelectRuleId, setActiveSelectRuleId] = useState(null);
  const [editorExpandKey, setEditorExpandKey] = useState(0);

  const flattenedElements = useMemo(() => {
    return reteteLucrare.flatMap((reteta) =>
      (reteta.elemente || []).map((element) => ({
        ...element,
        reteta_id: reteta.id,
        reteta_nume: reteta.denumire,
        reteta_cod: reteta.cod_reteta,
        reteta,
      })),
    );
  }, [reteteLucrare]);

  const selectorOptions = useMemo(() => {
    const reteteById = new Map();
    const elementsById = new Map();
    const recipeClassesByPath = new Map();
    const recipeClassesByLevelMap = {
      1: new Map(),
      2: new Map(),
      3: new Map(),
      4: new Map(),
      5: new Map(),
    };
    const catalogClassesByPath = new Map();
    const catalogClassesByLevelMap = {
      1: new Map(),
      2: new Map(),
    };

    reteteLucrare.forEach((reteta) => {
      reteteById.set(String(reteta.id), {
        value: String(reteta.id),
        name: reteta.denumire || reteta.denumire_fr || "Rețetă",
        label: `${reteta.cod_reteta || reteta.id} - ${reteta.denumire || "Rețetă"}`,
      });

      getRetetaClassLevels(reteta).forEach((level) => {
        if (!level?.path_code || level.is_empty) return;
        const option = {
          value: level.path_code,
          label: getClassLabel(level),
        };
        const levelNo = Number(level.level_no || getPathPartsCount(level.path_code));

        recipeClassesByPath.set(level.path_code, option);

        if (recipeClassesByLevelMap[levelNo]) {
          recipeClassesByLevelMap[levelNo].set(level.path_code, option);
        }
      });
    });

    flattenedElements.forEach((element) => {
      elementsById.set(String(element.id), {
        value: String(element.id),
        name: element.denumire || element.descriere || "Element",
        label: `${element.reteta_cod || element.reteta_id} / ${element.cod_definitie || element.cod_specific || element.id} - ${element.denumire || element.descriere || "Element"}`,
      });

      getElementClassLevels(element).forEach((level) => {
        if (!level?.path_code || level.is_empty) return;
        const option = {
          value: level.path_code,
          label: getClassLabel(level),
        };
        const levelNo = Number(level.level_no || getPathPartsCount(level.path_code));

        catalogClassesByPath.set(level.path_code, option);

        if (catalogClassesByLevelMap[levelNo]) {
          catalogClassesByLevelMap[levelNo].set(level.path_code, option);
        }
      });
    });

    const sortOption = (a, b) => a.label.localeCompare(b.label, "ro", { numeric: true, sensitivity: "base" });
    const recipeClassesByLevel = Object.fromEntries(Object.entries(recipeClassesByLevelMap).map(([levelNo, map]) => [levelNo, [...map.values()].sort(sortOption)]));
    const catalogClassesByLevel = Object.fromEntries(Object.entries(catalogClassesByLevelMap).map(([levelNo, map]) => [levelNo, [...map.values()].sort(sortOption)]));

    return {
      reteteById,
      elementsById,
      recipeClassesByPath,
      recipeClassesByLevel,
      catalogClassesByPath,
      catalogClassesByLevel,
      retete: [...reteteById.values()].sort(sortOption),
      elements: [...elementsById.values()].sort(sortOption),
      recipeClasses: [...recipeClassesByPath.values()].sort(sortOption),
      catalogClasses: [...catalogClassesByPath.values()].sort(sortOption),
    };
  }, [flattenedElements, reteteLucrare]);

  useEffect(() => {
    setOpenIds(new Set());
    setDialogOpen(false);
    setDraft(emptyDraft);
    setDeleteDialogOpen(false);
    setDeleteTarget(null);
    setActiveRulesCoeficientId(null);
    setVisibleRuleIds(new Set());
    setEditorRules([]);
    setActiveSelectRuleId(null);
  }, [lucrareId]);

  const appliedCoefficientRows = useMemo(() => {
    return calculateAppliedCoefficientRows({ retete: reteteLucrare, coeficienti });
  }, [coeficienti, reteteLucrare]);

  const activeRules = useMemo(() => {
    if (!activeRulesCoeficientId) return [];
    return editorRules;
  }, [activeRulesCoeficientId, editorRules]);

  const previewRules = useMemo(() => {
    if (!activeRulesCoeficientId || visibleRuleIds.size === 0) return [];
    return activeRules.filter((rule) => visibleRuleIds.has(String(rule.id)));
  }, [activeRules, activeRulesCoeficientId, visibleRuleIds]);

  const activeAffectedRows = useMemo(() => {
    if (!activeRulesCoeficientId) return { retetaIds: [], elementIds: [] };
    return calculateAffectedRows({ retete: reteteLucrare, rules: previewRules });
  }, [activeRulesCoeficientId, previewRules, reteteLucrare]);

  useEffect(() => {
    return () => {
      onCoeficientEditorStateChange?.(emptyEditorState);
    };
  }, [onCoeficientEditorStateChange]);

  const toggleOpen = useCallback((coeficient) => {
    setOpenIds((prev) => {
      const next = new Set(prev);

      if (next.has(coeficient.id)) {
        next.delete(coeficient.id);
      } else {
        next.add(coeficient.id);
      }

      return next;
    });
  }, []);

  const openAddDialog = useCallback(() => {
    if (!lucrareId) {
      toast.warning("Selectează o lucrare înainte să adaugi coeficienți.");
      return;
    }

    setDialogMode("add");
    setDraft(emptyDraft);
    setDialogOpen(true);
  }, [lucrareId]);

  const openEditDialog = useCallback((coeficient) => {
    setDialogMode("edit");
    setDraft({
      id: coeficient.id,
      nume: coeficient.nume || "",
    });
    setDialogOpen(true);
  }, []);

  const openDeleteDialog = useCallback((coeficient) => {
    setDeleteTarget(coeficient);
    setDeleteDialogOpen(true);
  }, []);

  const openRulesEditor = useCallback((coeficient) => {
    const rules = Array.isArray(coeficient?.tinte) ? coeficient.tinte : [];

    setOpenIds((prev) => {
      const next = new Set(prev);
      next.add(coeficient.id);
      return next;
    });
    setActiveRulesCoeficientId(coeficient.id);
    setEditorRules(cloneRules(rules));
    setActiveSelectRuleId(null);
    setVisibleRuleIds(new Set());
    setEditorExpandKey((prev) => prev + 1);
  }, []);

  const closeRulesEditor = useCallback(() => {
    setActiveRulesCoeficientId(null);
    setVisibleRuleIds(new Set());
    setEditorRules([]);
    setActiveSelectRuleId(null);
  }, []);

  const handleAddRule = useCallback(() => {
    if (!activeRulesCoeficientId) return;
    const newRule = createEmptyRule();

    setEditorRules((current) => [...current, newRule]);
    setActiveSelectRuleId(newRule.target_type === "recipe_exact" ? newRule.id : null);
    setVisibleRuleIds((current) => {
      const next = new Set(current);
      next.add(String(newRule.id));
      return next;
    });
    setEditorExpandKey((prev) => prev + 1);
  }, [activeRulesCoeficientId]);

  const handleSaveRulesEditor = useCallback(async () => {
    if (!activeRulesCoeficientId) return;

    show();

    try {
      await saveCoeficientTinte.mutateAsync({
        id: activeRulesCoeficientId,
        lucrare_id: lucrareId,
        rules: cloneRules(editorRules),
        updated_by_user_id: user?.id || null,
      });

      toast.success("Regulile coeficientului au fost salvate.");
      closeRulesEditor();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Eroare la salvarea regulilor coeficientului.");
    } finally {
      hide();
    }
  }, [activeRulesCoeficientId, closeRulesEditor, editorRules, hide, lucrareId, saveCoeficientTinte, show, user?.id]);

  const handleCancelRulesEditor = useCallback(() => {
    closeRulesEditor();
  }, [closeRulesEditor]);

  const handleDeleteRule = useCallback(
    (ruleId) => {
      if (!activeRulesCoeficientId) return;

      setEditorRules((current) => current.filter((rule) => rule.id !== ruleId));
      setActiveSelectRuleId((current) => (String(current) === String(ruleId) ? null : current));
      setVisibleRuleIds((current) => {
        const next = new Set(current);
        next.delete(String(ruleId));
        return next;
      });
    },
    [activeRulesCoeficientId],
  );

  const handleRuleChange = useCallback(
    (ruleId, patch) => {
      if (!activeRulesCoeficientId) return;

      setEditorRules((current) =>
        current.map((rule) => {
          if (rule.id !== ruleId) return rule;

          const nextRule = {
            ...rule,
            ...patch,
          };

          if (patch.target_type && patch.target_type !== "recipe_exact") {
            nextRule.recipe_ids = [];
            nextRule.recipe_id = "";
          }

          if (patch.target_type && patch.target_type !== "element_exact") {
            nextRule.element_ids = [];
            nextRule.element_id = "";
          }

          return nextRule;
        }),
      );

      if (patch.target_type === "recipe_exact") {
        setActiveSelectRuleId(ruleId);
      } else if (patch.target_type === "element_exact") {
        setActiveSelectRuleId(ruleId);
      } else if (patch.target_type) {
        setActiveSelectRuleId((current) => (String(current) === String(ruleId) ? null : current));
      }
    },
    [activeRulesCoeficientId],
  );

  const handleActivateRecipeSelection = useCallback((ruleId) => {
    setActiveSelectRuleId(ruleId);
    setEditorExpandKey((prev) => prev + 1);
  }, []);

  const handleActivateElementSelection = useCallback((ruleId) => {
    setActiveSelectRuleId(ruleId);
    setEditorExpandKey((prev) => prev + 1);
  }, []);

  const handleToggleRulePreview = useCallback((ruleId) => {
    setVisibleRuleIds((current) => {
      const next = new Set(current);
      const key = String(ruleId);

      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }

      return next;
    });
  }, []);

  const handleCoeficientRetetaToggle = useCallback(
    (reteta) => {
      if (!activeRulesCoeficientId || !reteta?.id) return;

      const retetaId = String(reteta.id);
      const activeRule = editorRules.find((rule) => String(rule.id) === String(activeSelectRuleId));
      if (activeRule?.target_type === "element_exact") return;

      const hasActiveExact = editorRules.some((rule) => String(rule.id) === String(activeSelectRuleId) && rule.target_type === "recipe_exact");
      let nextActiveRuleId = hasActiveExact ? activeSelectRuleId : editorRules.find((rule) => rule.target_type === "recipe_exact")?.id || null;
      let nextRules = editorRules;

      if (!nextActiveRuleId) {
        const newRule = {
          ...createEmptyRule(),
          target_type: "recipe_exact",
          recipe_id: retetaId,
          recipe_ids: [retetaId],
        };

        nextActiveRuleId = newRule.id;
        nextRules = [...editorRules, newRule];
      } else {
        nextRules = editorRules.map((rule) => {
          if (String(rule.id) !== String(nextActiveRuleId)) return rule;

          const ids = new Set(getRuleRecipeIds(rule));

          if (ids.has(retetaId)) {
            ids.delete(retetaId);
          } else {
            ids.add(retetaId);
          }

          const nextIds = [...ids];

          return {
            ...rule,
            recipe_ids: nextIds,
            recipe_id: nextIds[0] || "",
          };
        });
      }

      if (nextActiveRuleId) {
        setActiveSelectRuleId(nextActiveRuleId);
        setVisibleRuleIds((current) => {
          const next = new Set(current);
          next.add(String(nextActiveRuleId));
          return next;
        });
      }

      setEditorRules(nextRules);
    },
    [activeRulesCoeficientId, activeSelectRuleId, editorRules],
  );

  const handleCoeficientElementToggle = useCallback(
    (element) => {
      if (!activeRulesCoeficientId || !element?.id) return;

      const elementId = String(element.id);
      const activeRule = editorRules.find((rule) => String(rule.id) === String(activeSelectRuleId));
      if (activeRule?.target_type === "recipe_exact") return;

      const hasActiveExact = editorRules.some((rule) => String(rule.id) === String(activeSelectRuleId) && rule.target_type === "element_exact");
      let nextActiveRuleId = hasActiveExact ? activeSelectRuleId : editorRules.find((rule) => rule.target_type === "element_exact")?.id || null;
      let nextRules = editorRules;

      if (!nextActiveRuleId) {
        const newRule = {
          ...createEmptyRule(),
          target_type: "element_exact",
          element_id: elementId,
          element_ids: [elementId],
        };

        nextActiveRuleId = newRule.id;
        nextRules = [...editorRules, newRule];
      } else {
        nextRules = editorRules.map((rule) => {
          if (String(rule.id) !== String(nextActiveRuleId)) return rule;

          const ids = new Set(getRuleElementIds(rule));

          if (ids.has(elementId)) {
            ids.delete(elementId);
          } else {
            ids.add(elementId);
          }

          const nextIds = [...ids];

          return {
            ...rule,
            element_ids: nextIds,
            element_id: nextIds[0] || "",
          };
        });
      }

      if (nextActiveRuleId) {
        setActiveSelectRuleId(nextActiveRuleId);
        setVisibleRuleIds((current) => {
          const next = new Set(current);
          next.add(String(nextActiveRuleId));
          return next;
        });
      }

      setEditorRules(nextRules);
    },
    [activeRulesCoeficientId, activeSelectRuleId, editorRules],
  );

  useEffect(() => {
    if (!activeRulesCoeficientId) {
      onCoeficientEditorStateChange?.({
        ...emptyEditorState,
        retetaImpactById: appliedCoefficientRows.retetaImpactById || {},
        elementImpactById: appliedCoefficientRows.elementImpactById || {},
      });
      return;
    }

    onCoeficientEditorStateChange?.({
      active: true,
      highlight: visibleRuleIds.size > 0,
      expandAllKey: editorExpandKey,
      retetaIds: activeAffectedRows.retetaIds || [],
      elementIds: activeAffectedRows.elementIds || [],
      excludedRetetaIds: activeAffectedRows.excludedRetetaIds || [],
      excludedElementIds: activeAffectedRows.excludedElementIds || [],
      retetaImpactById: activeAffectedRows.retetaImpactById || {},
      elementImpactById: activeAffectedRows.elementImpactById || {},
      onRetetaToggle: handleCoeficientRetetaToggle,
      onElementToggle: handleCoeficientElementToggle,
    });
  }, [
    activeAffectedRows,
    activeRulesCoeficientId,
    appliedCoefficientRows,
    editorExpandKey,
    handleCoeficientElementToggle,
    handleCoeficientRetetaToggle,
    onCoeficientEditorStateChange,
    visibleRuleIds.size,
  ]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    const nume = String(draft.nume || "").trim();

    if (!lucrareId) {
      toast.warning("Selectează o lucrare.");
      return;
    }

    if (!nume) {
      toast.warning("Numele coeficientului este obligatoriu.");
      return;
    }

    show();

    try {
      if (dialogMode === "add") {
        await addCoeficient.mutateAsync({
          lucrare_id: lucrareId,
          nume,
          created_by_user_id: user?.id || null,
        });

        toast.success("Coeficientul a fost creat.");
      } else {
        await editCoeficient.mutateAsync({
          id: draft.id,
          lucrare_id: lucrareId,
          nume,
          updated_by_user_id: user?.id || null,
        });

        toast.success("Coeficientul a fost actualizat.");
      }

      setDialogOpen(false);
      setDraft(emptyDraft);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Eroare la salvarea coeficientului.");
    } finally {
      hide();
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget?.id) return;

    show();

    try {
      await deleteCoeficient.mutateAsync({
        id: deleteTarget.id,
        lucrare_id: lucrareId,
      });

      if (String(activeRulesCoeficientId) === String(deleteTarget.id)) {
        closeRulesEditor();
      }

      toast.success("Coeficientul a fost șters.");
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Eroare la ștergerea coeficientului.");
    } finally {
      hide();
    }
  };

  if (passive) return null;

  return (
    <div className="h-full w-full rounded-l-lg flex border flex-col bg-card overflow-hidden text-sm">
      <div className="h-14 shrink-0 border-b border-border overflow-hidden">
        <div className="h-full w-full px-2.5 py-2 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-base font-bold text-foreground flex items-center gap-1 min-w-0">
              <FontAwesomeIcon icon={faPercent} className="text-teal-600 shrink-0" />
              <span className="truncate">Coeficienți</span>
            </h3>
          </div>

          <Button
            size="sm"
            className="h-7 px-2 gap-1.5 shrink-0 text-sm border border-teal-600 bg-teal-600 text-white hover:bg-teal-700 hover:text-white"
            disabled={!lucrareId}
            onClick={openAddDialog}
          >
            <FontAwesomeIcon icon={faPlus} />
            Coeficient
          </Button>
        </div>
      </div>

      <div className={cn("flex-1 overflow-y-auto transition-opacity duration-150", isCollapsed ? "opacity-0 pointer-events-none" : "opacity-100")}>
        {!selectedLucrare ? (
          <div className="h-full flex relative flex-col items-center justify-center text-muted-foreground gap-2 p-3 text-center">
            <div className="h-10 w-10 rounded-full border bg-card flex items-center justify-center">
              <FontAwesomeIcon icon={faPercent} className="text-lg text-teal-600 opacity-70" />
            </div>
            <p className="text-sm font-medium">Selectează o lucrare pentru coeficienți.</p>
          </div>
        ) : isFetching ? (
          <div className="h-full flex relative flex-col items-center justify-center text-muted-foreground gap-2 p-3 text-center">
            <SpinnerElement text={2} />
          </div>
        ) : coeficienti.length === 0 ? (
          <div className="h-full flex relative flex-col items-center justify-center text-muted-foreground gap-2 p-3 text-center">
            <div className="h-10 w-10 rounded-full border bg-card flex items-center justify-center">
              <FontAwesomeIcon icon={faPercent} className="text-lg text-teal-600 opacity-70" />
            </div>
            <p className="text-sm font-medium">Nu există coeficienți încă...</p>
          </div>
        ) : (
          <div>
            {coeficienti.map((coeficient) => {
              const isOpen = openIds.has(coeficient.id);
              const isEditorActive = String(activeRulesCoeficientId) === String(coeficient.id);
              const persistedRules = Array.isArray(coeficient.tinte) ? coeficient.tinte : [];
              const visibleRules = isEditorActive ? editorRules : persistedRules;
              const visibleRulesCount = visibleRules.length || coeficient.tinte_count;
              const localSummaries = visibleRules.map((rule) => buildRuleSummary(rule, selectorOptions));

              return (
                <div key={coeficient.id} className="border-b border-border">
                  <div
                    className={cn(
                      "px-2 py-2 flex items-start gap-2 cursor-pointer transition-colors border-l-4",
                      isOpen ? "border-l-teal-600 bg-teal-600/20" : "border-l-muted-foreground hover:bg-accent/50",
                    )}
                    onClick={() => toggleOpen(coeficient)}
                  >
                    <button type="button" className="pt-0.5 shrink-0">
                      <FontAwesomeIcon icon={isOpen ? faChevronDown : faChevronRight} className="text-muted-foreground text-sm" />
                    </button>

                    <div className="min-w-0 flex flex-col gap-0.5 flex-1">
                      <OverflowTooltip
                        text={coeficient.nume}
                        align="left"
                        textSize="sm"
                        className="text-sm font-semibold text-foreground text-left justify-left first-letter:uppercase leading-tight whitespace-pre-wrap"
                        maxLines={1}
                      />
                      <div className="text-xs text-muted-foreground font-semibold">
                        {visibleRulesCount} {visibleRulesCount === 1 ? "țintă" : "ținte"}
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(event) => event.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="shrink-0 h-7 w-7 text-sm text-muted-foreground hover:text-foreground hover:bg-accent">
                          <FontAwesomeIcon icon={faEllipsis} />
                        </Button>
                      </DropdownMenuTrigger>

                      <DropdownMenuContent align="end" className="w-44 text-sm">
                        <DropdownMenuItem
                          className="gap-2 cursor-pointer text-sm"
                          onClick={(event) => {
                            event.stopPropagation();
                            openEditDialog(coeficient);
                          }}
                        >
                          <FontAwesomeIcon icon={faPenToSquare} className="text-low w-3.5" />
                          <span className="text-low font-semibold">Editează</span>
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />

                        <DropdownMenuItem
                          className="gap-2 text-destructive focus:text-destructive cursor-pointer text-sm"
                          onClick={(event) => {
                            event.stopPropagation();
                            openDeleteDialog(coeficient);
                          }}
                        >
                          <FontAwesomeIcon icon={faTrash} className="w-3.5" />
                          <span className="font-semibold">Șterge</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {isOpen && (
                    <div className="border-l-4 border-l-teal-600/40 bg-teal-600/5 px-2 py-2 text-xs text-muted-foreground flex flex-col gap-2">
                      {visibleRules.length > 0 ? (
                        <div className="flex flex-col gap-1">
                          {localSummaries.map((summary, index) => (
                            <div key={`${summary}-${index}`} className="flex min-w-0 items-center gap-1.5 rounded-md  px-1.5 py-1 font-semibold text-foreground">
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-teal-600 text-xs font-black text-white">{index + 1}</span>
                              <OverflowTooltip text={summary} align="left" className="min-w-0 flex-1 truncate text-xs font-semibold" maxLines={1} textSize="sm" />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="rounded-md  px-2 py-1.5 font-semibold text-foreground">Nu există reguli încă.</div>
                      )}
                      {!isEditorActive && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 bg-teal-600 px-2 text-xs border-0 text-white hover:bg-teal-700 hover:text-white"
                          onClick={(event) => {
                            event.stopPropagation();
                            openRulesEditor(coeficient);
                          }}
                        >
                          <FontAwesomeIcon icon={faFolderOpen} />
                          Deschide reguli
                        </Button>
                      )}

                      {isEditorActive && (
                        <div className="rounded-md p-2   ">
                          <div className="mb-4 flex items-center justify-between gap-2">
                            <div className="flex min-w-0 items-center gap-1.5">
                              <Button type="button" size="sm" className="h-7 gap-1.5 bg-teal-600 px-2 text-xs text-white hover:bg-teal-700 hover:text-white" onClick={handleAddRule}>
                                <FontAwesomeIcon icon={faPlus} />
                                Regulă
                              </Button>

                              <Tooltip delayDuration={0}>
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border  text-xs font-black text-muted-foreground hover:border-foreground hover:text-foreground"
                                  >
                                    <FontAwesomeIcon icon={faQuestion} />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent className="z-[100] max-w-[22rem] whitespace-pre-wrap rounded-md border-2 border-border bg-popover p-3 text-sm font-normal text-popover-foreground shadow-md">
                                  <TooltipArrow width={15} height={10} className="fill-border" />
                                  {COEFICIENT_RULE_HELP}
                                </TooltipContent>
                              </Tooltip>
                            </div>

                            <div className="flex shrink-0 items-center gap-1">
                              <Button type="button" size="sm" variant="destructive" className="h-7 px-2 text-xs font-semibold" onClick={handleCancelRulesEditor}>
                                Anulează
                              </Button>
                              <Button type="button" size="sm" className="h-7 bg-teal-600 px-2 text-xs text-white hover:bg-teal-700 hover:text-white" onClick={handleSaveRulesEditor}>
                                Salvează
                              </Button>
                            </div>
                          </div>

                          {editorRules.length === 0 ? (
                            <div className="rounded-md   p-2 text-center text-xs italic font-semibold text-muted-foreground">Adaugă prima regulă.</div>
                          ) : (
                            <div className="flex flex-col gap-2">
                              {editorRules.map((rule, index) => (
                                <CoeficientRuleInlineEditor
                                  key={rule.id}
                                  rule={rule}
                                  index={index}
                                  selectorOptions={selectorOptions}
                                  onChange={handleRuleChange}
                                  onDelete={handleDeleteRule}
                                  onTogglePreview={handleToggleRulePreview}
                                  isPreviewVisible={visibleRuleIds.has(String(rule.id))}
                                  onActivateRecipeSelection={handleActivateRecipeSelection}
                                  onActivateElementSelection={handleActivateElementSelection}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <OferteSidebarCoeficientDialog open={dialogOpen} onOpenChange={setDialogOpen} mode={dialogMode} draft={draft} onDraftChange={setDraft} onSubmit={handleSubmit} />

      <DeleteDialog
        open={deleteDialogOpen}
        setOpen={setDeleteDialogOpen}
        title="Șterge coeficientul"
        description={`Ești sigur că vrei să ștergi coeficientul "${deleteTarget?.nume || ""}"? Se vor șterge și țintele lui.`}
        onSubmit={handleConfirmDelete}
        useCode={false}
      />
    </div>
  );
}
