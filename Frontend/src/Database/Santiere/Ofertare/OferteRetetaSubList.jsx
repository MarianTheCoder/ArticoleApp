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

const EMPTY = "—";

const formatNumber = (value) => {
  return parseFloat(value || 0)
    .toFixed(3)
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
  return el?.cod_definitie || el?.definitie_cod || EMPTY;
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

const getDisplayedCode = (el) => {
  return hasVariantSelected(el) ? getVariantCode(el) : getDefinitionCode(el);
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

const getElementClass = (el) => {
  return (
    el?.clasa ||
    el?.clasa_resursa ||
    el?.clasa_nume ||
    el?.clasa_material ||
    el?.clasa_utilaj ||
    el?.clasa_transport ||
    el?.clasa_manopera ||
    el?.definitie_oferta?.clasa ||
    el?.definitie_oferta?.clasa_resursa ||
    el?.definitie_oferta?.clasa_material ||
    el?.definitie_oferta?.clasa_utilaj ||
    el?.definitie_live?.clasa ||
    el?.definitie_live?.clasa_resursa ||
    el?.definitie_live?.clasa_material ||
    el?.definitie_live?.clasa_utilaj ||
    ""
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

const getChildTypeBgClass = (element) => {
  switch (element?.tip_resursa) {
    case "manopera":
      return "bg-indigo-500/30 group-hover:bg-indigo-500/40 dark:bg-indigo-500/30 dark:group-hover:bg-indigo-500/40";
    case "material":
      return "bg-amber-600/30 group-hover:bg-amber-600/40 dark:bg-amber-600/30 dark:group-hover:bg-amber-600/40";
    case "utilaj":
      return "bg-rose-600/30 group-hover:bg-rose-600/40 dark:bg-rose-600/30 dark:group-hover:bg-rose-600/40";
    case "transport":
      return "bg-emerald-600/30 group-hover:bg-emerald-600/40 dark:bg-emerald-600/30 dark:group-hover:bg-emerald-600/40";
    default:
      return "bg-background group-hover:bg-muted dark:bg-muted/60 dark:group-hover:bg-muted";
  }
};

const getChildCellClass = (element) => `border-r border-b border-border p-1 align-middle text-sm transition-colors ${getChildTypeBgClass(element)}`;

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
    return <span className="text-sm text-muted-foreground/30 italic"></span>;
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

const OferteRetetaSubList = memo(function OferteRetetaSubList({ element, parentItem, displayLang = "RO", dynamicColumns = [], showCol, getColumnStyle }) {
  const config = getResourceConfig(element);

  const afisareCod = getDisplayedCode(element);
  const afisareDescriere = getDisplayedDescription(element, displayLang);
  const afisareDenumire = getDefinitionName(element, displayLang);
  const afisareClasa = getElementClass(element);
  const photoUrl = getElementPhoto(element);
  const photoRingClass = getPhotoRingClass(element);

  const unitCost = getUnitCost(element);
  const totalElement = getElementTotal(element);

  const priceChanged = hasChangedPrice(element);
  const quantityChanged = hasChangedQuantity(element);
  const syncStatus = element?.sync_status || null;
  const otherChanged = !!(element?.has_other_diff || syncStatus?.has_other_diff);
  const hasIssue = priceChanged || quantityChanged || otherChanged;
  const childTypeBgClass = getChildTypeBgClass(element);
  const childCellClass = getChildCellClass(element);

  return (
    <>
      {showCol("elemente") && (
        <TableCell style={getColumnStyle("elemente")} className={`border border-l-0 p-0 text-center align-middle text-sm transition-colors ${childTypeBgClass}`}>
          <ResourceTypeIcon config={config} />
        </TableCell>
      )}

      {showCol("poza") && (
        <TableCell style={getColumnStyle("poza")} className={`border-r p-0 border-b border-border text-center align-middle text-sm transition-colors ${childTypeBgClass}`}>
          {photoUrl ? (
            <ImagePreviewTooltip
              src={`${photoAPI}/${photoUrl}`}
              alt={afisareCod || afisareDenumire || "Poză"}
              ringColor={photoRingClass}
              fallback={<span className="text-sm text-muted-foreground/60">-</span>}
              containerClassName="h-7 w-7 rounded border border-border bg-background flex items-center justify-center overflow-hidden shrink-0 mx-auto"
            />
          ) : (
            <span className="text-sm text-muted-foreground/60">-</span>
          )}
        </TableCell>
      )}

      {dynamicColumns.map((col) => {
        if (!showCol(`col_${col.id}`)) return null;

        return <TableCell key={col.id} style={getColumnStyle(`dynamic_${col.id}`)} className={`${childCellClass} text-center`} />;
      })}

      {showCol("cod") && (
        <TableCell style={getColumnStyle("cod")} className={`${childCellClass} text-center`}>
          <span className="text-sm font-semibold text-foreground whitespace-nowrap">{afisareCod || EMPTY}</span>
        </TableCell>
      )}

      {showCol("clasa") && (
        <TableCell style={getColumnStyle("clasa")} className={`${childCellClass} text-center`}>
          {afisareClasa ? (
            <OverflowTooltip align="center" text={String(afisareClasa)} className="text-foreground font-normal text-center whitespace-nowrap" maxLines={1} textSize="sm" />
          ) : (
            <span className="block h-5" />
          )}
        </TableCell>
      )}

      {showCol("denumire") && (
        <TableCell style={getColumnStyle("denumire")} className={childCellClass}>
          {afisareDenumire ? (
            <OverflowTooltip align="left" text={afisareDenumire} className="font-medium whitespace-nowrap text-foreground leading-none" maxLines={1} textSize="sm" />
          ) : (
            <span className="text-sm text-muted-foreground/40 italic">{EMPTY}</span>
          )}
        </TableCell>
      )}

      {showCol("descriere") && (
        <TableCell style={getColumnStyle("descriere")} className={childCellClass}>
          {afisareDescriere ? (
            <OverflowTooltip align="left" text={afisareDescriere} className="font-normal whitespace-nowrap text-foreground leading-none" maxLines={1} textSize="sm" />
          ) : (
            <span className="text-sm text-muted-foreground/40 italic">{EMPTY}</span>
          )}
        </TableCell>
      )}

      {showCol("unitate") && (
        <TableCell style={getColumnStyle("unitate")} className={`${childCellClass} text-center`}>
          <span className="text-sm font-semibold text-foreground whitespace-nowrap">{element.unitate_masura || parentItem?.unitate_masura || EMPTY}</span>
        </TableCell>
      )}

      {showCol("cost") && (
        <TableCell style={getColumnStyle("cost")} className={`${childCellClass} text-center`}>
          <span className={`text-sm whitespace-nowrap ${priceChanged ? "text-high font-black" : "text-foreground font-semibold"}`}>{formatNumber(unitCost)}</span>
        </TableCell>
      )}

      {showCol("cantitate") && (
        <TableCell style={getColumnStyle("cantitate")} className={`${childCellClass} text-center`}>
          <span className={`text-sm whitespace-nowrap ${quantityChanged ? "text-high font-black" : "text-foreground font-semibold"}`}>{formatNumber(element.cantitate_in_reteta)}</span>
        </TableCell>
      )}

      {showCol("costTotal") && (
        <TableCell style={getColumnStyle("costTotal")} className={`${childCellClass} text-center`}>
          <span className="text-sm font-bold text-foreground whitespace-nowrap">{formatNumber(totalElement)}</span>
        </TableCell>
      )}

      {showCol("creat") && (
        <TableCell style={getColumnStyle("creat")} className={childCellClass}>
          <span className="text-sm text-muted-foreground/30 italic">{EMPTY}</span>
        </TableCell>
      )}

      {showCol("actualizat") && (
        <TableCell style={getColumnStyle("actualizat")} className={childCellClass}>
          <span className="text-sm text-muted-foreground/30 italic">{EMPTY}</span>
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
