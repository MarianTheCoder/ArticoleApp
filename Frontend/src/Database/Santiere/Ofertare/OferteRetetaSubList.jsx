// src/components/Ofertare/OferteRetetaSubList.jsx
import { memo } from "react";
import { TableCell } from "@/components/ui/table";
import { Tooltip, TooltipArrow, TooltipContent, TooltipTrigger } from "@radix-ui/react-tooltip";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCalculator, faCoins, faListUl, faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";

import OverflowTooltip from "@/components/ui/OverflowTooltip";
import { resurseConfig } from "@/Database/Catalog/resurseConfig";
import ImagePreviewTooltip from "@/components/ui/ImagePreviewTooltip";
import photoAPI from "@/api/photoAPI";
import { RecipeCodeTooltip } from "./components/OferteRetetaCodeClassDisplay";

const EMPTY = "—";
const CLASS_LEVEL_COLUMN_KEYS = ["clasa1", "clasa2", "clasa3", "clasa4", "clasa5"];

const formatNumber = (value, decimalPlaces = 2) => {
  const digits = [1, 2].includes(Number(decimalPlaces)) ? Number(decimalPlaces) : 2;

  return parseFloat(value || 0)
    .toFixed(digits)
    .replace(".", ",");
};

const hasVariantSelected = (el) => {
  return !!(el?.oferta_subcategorie_id || el?.original_subcategorie_id || el?.cod_specific);
};

const getSelectedVariant = (el) => {
  const originalSubId = el?.original_subcategorie_id;
  if (!originalSubId) return null;

  const list = Array.isArray(el?.subcategorii) ? el.subcategorii : [];
  return list.find((sub) => Number(sub.id) === Number(originalSubId)) || null;
};

const getDefinitionCode = (el) => {
  return el?.cod_definitie || el?.definitie_oferta?.cod_definitie || el?.definitie_live?.cod_definitie || el?.definitie_cod || EMPTY;
};

const getDefinitionName = (el, displayLang) => {
  if (displayLang === "FR") {
    return el?.denumire_fr || "";
  }

  return el?.denumire || "";
};

const getDefinitionDescription = (el, displayLang) => {
  if (displayLang === "FR") {
    return el?.descriere_fr || "";
  }

  return el?.descriere || "";
};

const getDefinitionCost = (el) => {
  return Number(el?.cost_definitie ?? el?.definitie_cost ?? el?.cost ?? el?.cost_definitie_snapshot ?? 0);
};

const getVariantCode = (el) => {
  return el?.cod_specific || el?.sub_cod_specific || EMPTY;
};

const getVariantDescription = (el, displayLang) => {
  if (displayLang === "FR") {
    return el?.descriere_specifica_fr || el?.sub_descriere_fr || "";
  }

  return el?.descriere_specifica || el?.sub_descriere || "";
};

const getVariantCost = (el) => {
  return Number(el?.cost_subcategorie ?? el?.cost_subcategorie_snapshot ?? el?.subcategorie_oferta?.cost ?? el?.sub_cost ?? 0);
};

const parseMaybeJsonObject = (value) => {
  if (!value) return null;
  if (typeof value === "object" && !Array.isArray(value)) return value;

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  return null;
};

const getVariantExtra = (el) => {
  const selectedVariant = getSelectedVariant(el);

  return (
    parseMaybeJsonObject(el?.detalii_extra) ||
    parseMaybeJsonObject(el?.subcategorie_oferta?.detalii_extra) ||
    parseMaybeJsonObject(selectedVariant?.detalii_extra) ||
    parseMaybeJsonObject(el?.sub_detalii_extra)
  );
};

const getVariantMetaLabel = (el, key) => {
  if (!hasVariantSelected(el)) return "";
  if (!["material", "utilaj"].includes(String(el?.tip_resursa || "").trim().toLowerCase())) return "";

  const field = key === "furnizor" ? "furnizor_denumire" : "marca_denumire";

  return String(el?.[field] ?? el?.subcategorie_oferta?.[field] ?? "").trim();
};

const formatGreutate = (value) => {
  const numberValue = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(numberValue) ? `${numberValue.toFixed(2).replace(".", ",")} kg` : "";
};

const getGreutateNumber = (value) => {
  const numberValue = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(numberValue) ? numberValue : 0;
};

const getDisplayedCode = (el) => {
  return hasVariantSelected(el) ? getVariantCode(el) : getDefinitionCode(el);
};

const getElementClassLevels = (el) => {
  const snapshot = el?.definitie_oferta?.catalog_class_snapshot || el?.catalog_class_snapshot || [];

  if (Array.isArray(snapshot)) return snapshot;
  if (Array.isArray(snapshot?.levels)) return snapshot.levels;
  if (Array.isArray(snapshot?.classLevels)) return snapshot.classLevels;

  return [];
};

const getElementCodeTooltipParts = (el, displayLang = "RO") => {
  const code = getDefinitionCode(el);
  const levels = getElementClassLevels(el);

  const parts = levels
    .filter((level) => level && !level.is_empty && level.code_segment && String(level.code_segment) !== "00")
    .map((level, index) => {
      const denumire = displayLang === "FR" ? level.denumire_fr || level.denumire_ro : level.denumire_ro;
      const isUndefined = !(level.is_defined && denumire);

      return {
        key: level.path_code || `${level.level_no || index + 1}-${level.code_segment}`,
        label: `${level.code_segment}. ${isUndefined ? "Nedefinit" : denumire}`,
        isUndefined,
      };
    });

  const specific = String(code || "")
    .trim()
    .split(/\s+/)
    .slice(2)
    .join(" ");

  if (specific) {
    parts.push({
      key: "specific",
      label: `${specific}. Specific`,
      isUndefined: false,
    });
  }

  return parts.length ? parts : [{ key: "fallback", label: code || "Cod nedefinit", isUndefined: false }];
};

const getElementClassLevelDisplay = (el, levelNo, displayLang = "RO") => {
  const levels = getElementClassLevels(el);
  const level = levels[levelNo - 1] || levels.find((item) => Number(item?.level_no) === Number(levelNo));

  if (!level || level.is_empty) {
    return {
      label: "",
      isUndefined: false,
    };
  }

  const code = level.code_segment || level.segment || "";

  if (!code || String(code) === "00") {
    return {
      label: "",
      isUndefined: false,
    };
  }

  const denumire = displayLang === "FR" ? level.denumire_fr || level.denumire_ro : level.denumire_ro;
  const isUndefined = !(level.is_defined && denumire);

  return {
    label: `${code}. ${isUndefined ? "Nedefinit" : denumire}`,
    isUndefined,
  };
};

const getDisplayedDescription = (el, displayLang) => {
  return hasVariantSelected(el) ? getVariantDescription(el, displayLang) : getDefinitionDescription(el, displayLang);
};

const getUnitCost = (el) => {
  return hasVariantSelected(el) ? getVariantCost(el) : getDefinitionCost(el);
};

const getElementTotal = (el) => {
  return getUnitCost(el) * Number(el?.cantitate_in_reteta || 0);
};

const getReferenceCost = (el) => {
  if (hasVariantSelected(el)) {
    const selectedVariant = getSelectedVariant(el);
    return selectedVariant?.cost ?? null;
  }

  return el?.original_definitie_cost ?? el?.cost_definitie_actual ?? el?.cost_definitie_live ?? el?.definitie_live?.cost ?? el?.cost_catalog ?? null;
};

const hasChangedPrice = (el) => {
  if (el?.has_cost_diff || el?.sync_status?.has_cost_diff) return true;

  const referenceCost = getReferenceCost(el);

  if (referenceCost === null || referenceCost === undefined) return false;

  const currentCost = getUnitCost(el);

  return Math.abs(Number(currentCost) - Number(referenceCost)) > 0.0001;
};

const getDefaultQuantity = (el) => {
  const value = el?.cantitate_in_reteta_default ?? el?.cantitate_default ?? el?.reteta_element_cantitate ?? el?.cantitate_originala ?? null;

  if (value === null || value === undefined) return null;

  return Number(value);
};

const hasChangedQuantity = (el) => {
  if (el?.has_qty_diff || el?.sync_status?.has_qty_diff) return true;

  const defaultQuantity = getDefaultQuantity(el);

  if (defaultQuantity === null || defaultQuantity === undefined || !Number.isFinite(defaultQuantity)) {
    return false;
  }

  const currentQuantity = Number(el?.cantitate_in_reteta || 0);

  return Math.abs(currentQuantity - defaultQuantity) > 0.0001;
};

const getResourceConfig = (element) => {
  return resurseConfig[element?.tip_resursa] || resurseConfig.material;
};

const getElementPhoto = (element) => {
  if (!["material", "utilaj"].includes(element?.tip_resursa)) return null;

  return (
    element?.photo_specific_url ||
    element?.sub_photo_url ||
    element?.subcategorie_oferta?.photo_url ||
    element?.photo_url ||
    element?.definitie_oferta?.photo_url ||
    element?.photo_url_actual ||
    element?.definitie_live?.photo_url ||
    null
  );
};

const getPhotoRingClass = (element) => {
  if (element?.tip_resursa === "material") return "hover:ring-amber-600";
  if (element?.tip_resursa === "utilaj") return "hover:ring-rose-600";
  return "hover:ring-primary";
};

const isCostDiff = (diff) =>
  String(diff?.field || "")
    .toLowerCase()
    .includes("cost");

const isQuantityDiff = (diff) =>
  String(diff?.field || "")
    .toLowerCase()
    .includes("cantitate") ||
  String(diff?.scope || "")
    .toLowerCase()
    .includes("cantitate");

const getDiffLabels = (syncStatus, predicate) => {
  const diffs = Array.isArray(syncStatus?.diffs) ? syncStatus.diffs : [];

  return diffs
    .filter(predicate)
    .map((diff) => diff?.label || diff?.field)
    .filter(Boolean);
};

const getOtherDiffLabels = (syncStatus) => getDiffLabels(syncStatus, (diff) => !isCostDiff(diff) && !isQuantityDiff(diff));

const getIssueGroups = ({ priceChanged, quantityChanged, otherChanged, syncStatus }) => {
  const groups = [];

  if (priceChanged) {
    const labels = getDiffLabels(syncStatus, isCostDiff);
    groups.push({
      icon: faCoins,
      title: "Cost",
      items: labels.length > 0 ? labels : ["Cost modificat față de original."],
    });
  }

  if (quantityChanged) {
    const labels = getDiffLabels(syncStatus, isQuantityDiff);
    groups.push({
      icon: faCalculator,
      title: "Qty",
      items: labels.length > 0 ? labels : ["Cantitate modificată față de rețetă."],
    });
  }

  if (otherChanged) {
    const labels = getOtherDiffLabels(syncStatus);
    groups.push({
      icon: faListUl,
      title: "Altele",
      items: labels.length > 0 ? labels : ["Există alte diferențe față de rețeta originală."],
    });
  }

  return groups;
};

const getChildTypeBgClass = () => "bg-zinc-300 group-hover:bg-zinc-400/50 dark:bg-zinc-800 dark:group-hover:bg-zinc-700/70";

const getChildCellClass = (element) => `border-r border-b border-border p-1 align-middle text-xs xxxl:text-sm transition-colors ${getChildTypeBgClass(element)}`;

const getCoefTextClass = (value, colorClass) => {
  return Number(value || 0) === 0 ? "text-muted-foreground/45" : colorClass;
};

const IssueTooltipGroup = memo(function IssueTooltipGroup({ group }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2 font-black uppercase tracking-wide text-foreground">
        <FontAwesomeIcon icon={group.icon} className="text-primary" />
        <span>{group.title}</span>
      </div>

      <div className="flex flex-col gap-1">
        {group.items.map((item, index) => (
          <div key={`${group.title}-${index}`} className="flex items-start gap-2 text-popover-foreground">
            <span className="text-muted-foreground">-</span>
            <span className="leading-snug">{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
});

const ElementIssueIcon = memo(function ElementIssueIcon({ priceChanged, quantityChanged, otherChanged, syncStatus }) {
  if (!priceChanged && !quantityChanged && !otherChanged) {
    return <span className="text-sm text-muted-foreground italic"></span>;
  }

  const groups = getIssueGroups({ priceChanged, quantityChanged, otherChanged, syncStatus });

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex h-6 w-6 items-center justify-center text-sm leading-none text-red-600">
          <FontAwesomeIcon icon={faTriangleExclamation} />
        </span>
      </TooltipTrigger>

      <TooltipContent className="w-72 whitespace-normal break-words font-normal rounded-md text-sm z-[100] bg-popover border-2 border-border text-popover-foreground shadow-md p-3">
        <TooltipArrow width={15} height={10} className="fill-border" />
        <div className="flex flex-col gap-3">
          {groups.map((group) => (
            <IssueTooltipGroup key={group.title} group={group} />
          ))}
        </div>
      </TooltipContent>
    </Tooltip>
  );
});

const ResourceTypeIcon = memo(function ResourceTypeIcon({ config }) {
  return (
    <div className="inline-flex h-7 w-7 items-center justify-center leading-none">
      <FontAwesomeIcon icon={config.icon} className={`${config.colorClass} text-lg`} />
    </div>
  );
});

const getPriceTextColorClass = (tipResursa) => {
  switch (tipResursa) {
    case "manopera":
      return "text-indigo-700 dark:text-indigo-300";
    case "material":
      return "text-amber-700 dark:text-amber-300";
    case "utilaj":
      return "text-rose-700 dark:text-rose-300";
    case "transport":
      return "text-emerald-700 dark:text-emerald-300";
    default:
      return "text-primary";
  }
};

const OferteRetetaSubList = memo(function OferteRetetaSubList({
  element,
  parentItem,
  displayLang = "RO",
  textAlign = "left",
  decimalPlaces = 2,
  dynamicColumns = [],
  showCol,
  getColumnStyle,
  isLastElement = false,
  isCoeficientHighlighted = false,
  isCoeficientExcluded = false,
  coeficientImpact = null,
}) {
  const config = getResourceConfig(element);
  const priceTextColorClass = getPriceTextColorClass(element?.tip_resursa);

  const afisareCod = getDisplayedCode(element);
  const afisareDescriere = getDisplayedDescription(element, displayLang);
  const afisareDenumire = getDefinitionName(element, displayLang);
  const photoUrl = getElementPhoto(element);
  const photoRingClass = getPhotoRingClass(element);
  const variantFurnizor = getVariantMetaLabel(element, "furnizor");
  const variantMarca = getVariantMetaLabel(element, "marca");
  const materialGreutateValue =
    element?.tip_resursa === "material" ? getGreutateNumber(element?.greutate ?? element?.definitie_oferta?.greutate ?? element?.greutate_actual ?? element?.definitie_live?.greutate) : 0;

  const unitCost = getUnitCost(element);
  const totalElement = getElementTotal(element);

  const priceChanged = hasChangedPrice(element);
  const quantityChanged = hasChangedQuantity(element);
  const syncStatus = element?.sync_status || null;
  const otherChanged = !!(element?.has_other_diff || syncStatus?.has_other_diff);
  const hasIssue = priceChanged || quantityChanged || otherChanged;
  const coeficientHighlightClass = isCoeficientExcluded
    ? "!bg-red-200 hover:!bg-red-300 dark:!bg-red-500 dark:hover:!bg-red-400 dark:!text-black dark:[&_*]:!text-black"
    : isCoeficientHighlighted
      ? "!bg-yellow-200 hover:!bg-yellow-300 dark:!bg-yellow-500 dark:hover:!bg-yellow-400 dark:!text-black dark:[&_*]:!text-black"
      : "";
  const childTypeBgClass = `${getChildTypeBgClass(element)} ${coeficientHighlightClass}`;
  const childCellClass = `${getChildCellClass(element)} ${coeficientHighlightClass}`;
  const coeficientPercent = Number(coeficientImpact?.percent || 0);
  const coeficientAddedValue = Number(coeficientImpact?.addedValue || 0);
  const cantitateLucrare = Number(parentItem?.cantitate_lucrare || 0);
  const totalCantitateElement = Number(element?.cantitate_in_reteta || 0) * cantitateLucrare;
  const totalElementInLucrare = totalElement * cantitateLucrare;
  const materialGreutateUnitara = materialGreutateValue ? formatGreutate(materialGreutateValue) : "";
  const materialGreutateTotala = materialGreutateValue ? formatGreutate(materialGreutateValue * totalCantitateElement) : "";
  const coeficientPriceValue = totalElementInLucrare + coeficientAddedValue;
  const coeficientExcluded = !!coeficientImpact?.excluded;
  const coeficientInactive = !!coeficientImpact?.inactive && Math.abs(coeficientAddedValue) < 0.000001;
  const safeTextAlign = ["left", "center", "right"].includes(textAlign) ? textAlign : "left";
  const textAlignClass = {
    left: "text-left",
    center: "text-center",
    right: "text-right",
  }[safeTextAlign];
  const flexAlignClass = {
    left: "justify-start",
    center: "justify-center",
    right: "justify-end",
  }[safeTextAlign];
  const tooltipAlign = safeTextAlign;

  return (
    <>
      <TableCell style={getColumnStyle("tree")} className={`${isLastElement ? "border-b border-border" : "border-0"} bg-transparent dark:bg-[#08090b] p-0 align-middle ${coeficientHighlightClass}`}>
        <div className="relative h-8 w-full">
          <span className={`absolute left-1/2 top-0 w-[2px] -translate-x-1/2 bg-border ${isLastElement ? "bottom-1/2" : "bottom-0"}`} />
          <span className="absolute left-1/2 right-0 top-1/2 h-[2px] bg-border" />
        </div>
      </TableCell>

      {showCol("elemente") && (
        <TableCell style={getColumnStyle("elemente")} className={`border p-0 text-center align-middle text-xs xxxl:text-sm transition-colors ${childTypeBgClass}`}>
          <ResourceTypeIcon config={config} />
        </TableCell>
      )}

      {showCol("poza") && (
        <TableCell style={getColumnStyle("poza")} className={`border-r p-0 border-b border-border text-center align-middle text-xs xxxl:text-sm transition-colors ${childTypeBgClass}`}>
          {photoUrl ? (
            <ImagePreviewTooltip
              src={`${photoAPI}/${photoUrl}`}
              alt={afisareCod || afisareDenumire || "Poză"}
              ringColor={photoRingClass}
              fallback={<span className="text-xs xxxl:text-sm text-muted-foreground">-</span>}
              containerClassName="h-7 w-7 rounded border border-border bg-background flex items-center justify-center overflow-hidden shrink-0 mx-auto"
            />
          ) : (
            <span className="text-xs xxxl:text-sm text-muted-foreground">-</span>
          )}
        </TableCell>
      )}

      {dynamicColumns.map((col) => {
        if (!showCol(`col_${col.id}`)) return null;

        return <TableCell key={col.id} style={getColumnStyle(`dynamic_${col.id}`)} className={`${childCellClass} ${textAlignClass}`} />;
      })}

      {showCol("cod") && (
        <TableCell style={getColumnStyle("cod")} className={`${childCellClass} ${textAlignClass}`}>
          {hasVariantSelected(element) ? (
            <div className={`flex min-w-0 items-center gap-1.5 ${flexAlignClass}`}>
              <OverflowTooltip align={tooltipAlign} text={afisareCod || EMPTY} className={`min-w-0 font-semibold text-foreground ${textAlignClass} whitespace-nowrap`} maxLines={1} textSize="sm" />
              <span className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-md border border-primary/40 bg-primary/10 px-1 text-[10px] font-black leading-none text-primary">
                V
              </span>
            </div>
          ) : (
            <RecipeCodeTooltip text={afisareCod || EMPTY} tooltipParts={getElementCodeTooltipParts(element, displayLang)} className={textAlignClass} plainQuestion />
          )}
        </TableCell>
      )}

      {CLASS_LEVEL_COLUMN_KEYS.map((key, index) => {
        if (!showCol(key)) return null;

        const levelNo = index + 1;
        const classInfo = levelNo <= 2 ? getElementClassLevelDisplay(element, levelNo, displayLang) : { label: "", isUndefined: false };

        return (
          <TableCell key={key} style={getColumnStyle(key)} className={`${childCellClass} ${textAlignClass}`}>
            {classInfo.label ? (
              <OverflowTooltip
                align={tooltipAlign}
                text={classInfo.label}
                className={`font-normal whitespace-nowrap ${textAlignClass} ${classInfo.isUndefined ? "text-destructive" : "text-foreground"}`}
                maxLines={1}
                textSize="sm"
              />
            ) : (
              <span className="text-xs xxxl:text-sm text-muted-foreground italic">{EMPTY}</span>
            )}
          </TableCell>
        );
      })}
      {showCol("denumire") && (
        <TableCell style={getColumnStyle("denumire")} className={`${childCellClass} ${textAlignClass}`}>
          {afisareDenumire ? (
            <OverflowTooltip align={tooltipAlign} text={afisareDenumire} className={`font-medium whitespace-nowrap text-foreground leading-none ${textAlignClass}`} maxLines={1} textSize="sm" />
          ) : (
            <span className="text-xs xxxl:text-sm text-muted-foreground italic">{EMPTY}</span>
          )}
        </TableCell>
      )}

      {showCol("descriere") && (
        <TableCell style={getColumnStyle("descriere")} className={`${childCellClass} ${textAlignClass}`}>
          {afisareDescriere ? (
            <OverflowTooltip align={tooltipAlign} text={afisareDescriere} className={`font-normal whitespace-nowrap text-foreground leading-none ${textAlignClass}`} maxLines={1} textSize="sm" />
          ) : (
            <span className="text-xs xxxl:text-sm text-muted-foreground italic">{EMPTY}</span>
          )}
        </TableCell>
      )}

      {showCol("furnizor") && (
        <TableCell style={getColumnStyle("furnizor")} className={`${childCellClass} ${textAlignClass}`}>
          {variantFurnizor ? (
            <OverflowTooltip align={tooltipAlign} text={variantFurnizor} className={`font-normal whitespace-nowrap text-foreground leading-none ${textAlignClass}`} maxLines={1} textSize="sm" />
          ) : (
            <span className="text-xs xxxl:text-sm text-muted-foreground italic">{EMPTY}</span>
          )}
        </TableCell>
      )}

      {showCol("marca") && (
        <TableCell style={getColumnStyle("marca")} className={`${childCellClass} ${textAlignClass}`}>
          {variantMarca ? (
            <OverflowTooltip align={tooltipAlign} text={variantMarca} className={`font-normal whitespace-nowrap text-foreground leading-none ${textAlignClass}`} maxLines={1} textSize="sm" />
          ) : (
            <span className="text-xs xxxl:text-sm text-muted-foreground italic">{EMPTY}</span>
          )}
        </TableCell>
      )}

      {showCol("unitate") && (
        <TableCell style={getColumnStyle("unitate")} className={`${childCellClass} text-center`}>
          <span className="text-xs xxxl:text-sm font-semibold text-foreground whitespace-nowrap">{element.unitate_masura || parentItem?.unitate_masura || EMPTY}</span>
        </TableCell>
      )}

      {showCol("cantitate") && (
        <TableCell style={getColumnStyle("cantitate")} className={`${childCellClass} text-center`}>
          <span className={`text-xs xxxl:text-sm whitespace-nowrap ${quantityChanged ? "text-high font-black" : "text-foreground font-semibold"}`}>
            {formatNumber(element.cantitate_in_reteta, decimalPlaces)}
          </span>
        </TableCell>
      )}

      {showCol("qtyTotal") && (
        <TableCell style={getColumnStyle("qtyTotal")} className={`${childCellClass} text-center`}>
          <span className={`text-xs xxxl:text-sm whitespace-nowrap ${quantityChanged ? "text-high font-black" : "text-foreground font-semibold"}`}>
            {formatNumber(totalCantitateElement, decimalPlaces)}
          </span>
        </TableCell>
      )}

      {showCol("greutateUnitara") && (
        <TableCell style={getColumnStyle("greutateUnitara")} className={`${childCellClass} text-center`}>
          {materialGreutateUnitara ? (
            <span className="text-xs xxxl:text-sm font-semibold text-foreground whitespace-nowrap">{materialGreutateUnitara}</span>
          ) : (
            <span className="text-xs xxxl:text-sm text-muted-foreground italic">{EMPTY}</span>
          )}
        </TableCell>
      )}

      {showCol("greutateTotala") && (
        <TableCell style={getColumnStyle("greutateTotala")} className={`${childCellClass} text-center`}>
          {materialGreutateTotala ? (
            <span className="text-xs xxxl:text-sm font-semibold text-foreground whitespace-nowrap">{materialGreutateTotala}</span>
          ) : (
            <span className="text-xs xxxl:text-sm text-muted-foreground italic">{EMPTY}</span>
          )}
        </TableCell>
      )}

      {showCol("cost") && (
        <TableCell style={getColumnStyle("cost")} className={`${childCellClass} text-right`}>
          <span className={`text-xs xxxl:text-sm whitespace-nowrap ${priceChanged ? "text-high font-black" : "text-foreground font-semibold"}`}>{formatNumber(unitCost, decimalPlaces)}</span>
        </TableCell>
      )}

      {showCol("costTotal") && (
        <TableCell style={getColumnStyle("costTotal")} className={`${childCellClass} text-right`}>
          <span className="text-xs xxxl:text-sm font-bold text-foreground whitespace-nowrap">{formatNumber(totalElementInLucrare, decimalPlaces)}</span>
        </TableCell>
      )}

      {showCol("coefProcent") && (
        <TableCell style={getColumnStyle("coefProcent")} className={`${childCellClass} text-center`}>
          {coeficientExcluded ? (
            <span className="text-xs xxxl:text-sm font-black text-red-600 whitespace-nowrap">Exclude</span>
          ) : (
            <span
              className={`text-xs xxxl:text-sm font-black whitespace-nowrap ${coeficientInactive ? "text-red-600 dark:text-red-400" : getCoefTextClass(coeficientPercent, "text-teal-700 dark:text-teal-300")}`}
            >
              {formatNumber(coeficientPercent, 2)}%
            </span>
          )}
        </TableCell>
      )}

      {showCol("coefPret") && (
        <TableCell style={getColumnStyle("coefPret")} className={`${childCellClass} text-right`}>
          <span
            className={`text-xs xxxl:text-sm font-black whitespace-nowrap ${coeficientExcluded || coeficientInactive ? "text-red-600 dark:text-red-400" : getCoefTextClass(coeficientAddedValue, "text-primary")}`}
          >
            {formatNumber(coeficientAddedValue, decimalPlaces)}
          </span>
        </TableCell>
      )}

      {showCol("pret") && (
        <TableCell style={getColumnStyle("pret")} className={`${childCellClass} text-right`}>
          <span className={`text-xs xxxl:text-sm font-black whitespace-nowrap ${coeficientExcluded ? "text-red-600" : priceTextColorClass}`}>{formatNumber(coeficientPriceValue, decimalPlaces)}</span>
        </TableCell>
      )}

      {showCol("creat") && (
        <TableCell style={getColumnStyle("creat")} className={childCellClass}>
          <span className="text-sm text-muted-foreground italic">{EMPTY}</span>
        </TableCell>
      )}

      {showCol("actualizat") && (
        <TableCell style={getColumnStyle("actualizat")} className={childCellClass}>
          <span className="text-sm text-muted-foreground italic">{EMPTY}</span>
        </TableCell>
      )}

      {showCol("info") && (
        <TableCell style={getColumnStyle("info")} className={`border border-border p-1 text-center align-middle text-sm transition-colors ${childTypeBgClass}`}>
          <div className="flex items-center justify-center whitespace-nowrap overflow-hidden">
            <ElementIssueIcon priceChanged={priceChanged} quantityChanged={quantityChanged} otherChanged={otherChanged} syncStatus={syncStatus} />
          </div>
        </TableCell>
      )}
    </>
  );
});

export default OferteRetetaSubList;
