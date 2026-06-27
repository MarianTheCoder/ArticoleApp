import React from "react";
import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight, faChevronDown, faChevronRight, faQuestion } from "@fortawesome/free-solid-svg-icons";

import OverflowTooltip from "@/components/ui/OverflowTooltip";
import ImagePreviewTooltip from "@/components/ui/ImagePreviewTooltip";
import photoAPI from "@/api/photoAPI";
import NoImage from "@/assets/no-image-icon.png";
import InventarVariantRow from "./InventarVariantRow";

const getVariantSelectionKey = (parent, sub) => `${parent?.inventar_resursa_id || parent?.id || "parent"}:${sub?.id || "variant"}`;

const formatNumber = (value, digits = 2) => {
  const numberValue = Number(value || 0);
  return Number.isFinite(numberValue) ? numberValue.toFixed(digits).replace(".", ",") : (0).toFixed(digits).replace(".", ",");
};

const getStockNumber = (...values) => {
  for (const value of values) {
    const numberValue = Number(value);
    if (Number.isFinite(numberValue)) return numberValue;
  }

  return 0;
};

const getUserInitials = (name) =>
  String(name || "S")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const formatDateTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return `${date.toLocaleDateString("ro-RO")} ${date.toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" })}`;
};

const getCatalogClassLevelDisplay = (item, levelNo, displayLang = "RO") => {
  const level = item?.cod_definitie_meta?.classLevels?.[Number(levelNo) - 1];
  if (!level || level.is_empty) return "";

  const denumire = displayLang === "FR" ? level.denumire_fr || level.denumire_ro : level.denumire_ro;
  return `${level.code_segment}. ${level.is_defined && denumire ? denumire : "Nedefinit"}`;
};

const getCatalogCodeTooltipParts = (item, displayLang = "RO") => {
  const meta = item?.cod_definitie_meta || {};
  const levels = Array.isArray(meta.levels) ? meta.levels : Array.isArray(meta.classLevels) ? meta.classLevels.filter((level) => level && !level.is_empty) : [];
  const classParts = levels
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
  const specificSegments = Array.isArray(meta.specificSegments)
    ? meta.specificSegments
    : Array.isArray(meta.specific_segments)
      ? meta.specific_segments
      : String(item?.cod_definitie || "")
          .trim()
          .split(/\s+/)
          .slice(2);
  const specificParts = [specificSegments.filter(Boolean).join(" ")].filter(Boolean).map((segment, index) => ({ key: `specific-${index}`, label: segment }));

  return [...classParts, ...specificParts].length > 0 ? [...classParts, ...specificParts] : [{ key: "fallback", label: item?.cod_definitie || "Cod nedefinit" }];
};

const InventarCodeValue = ({ item, displayLang }) => {
  const parts = getCatalogCodeTooltipParts(item, displayLang);

  return (
    <div className="flex min-w-0 w-full items-center justify-between gap-1.5">
      <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap font-bold text-foreground">{String(item.cod_definitie || "—")}</span>

      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
            className="inline-flex h-5 w-5 shrink-0 cursor-help items-center justify-center rounded-full border border-border bg-card text-[10px] font-black text-muted-foreground hover:text-foreground"
          >
            <FontAwesomeIcon icon={faQuestion} />
          </button>
        </PopoverTrigger>

        <PopoverContent
          align="center"
          side="bottom"
          sideOffset={8}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
          className="z-[100] max-w-[64rem] w-auto rounded-md border-2 border-border bg-popover p-2 text-xs xxxl:text-sm text-popover-foreground shadow-md"
        >
          <div className="flex max-w-[62rem] flex-wrap items-center gap-1">
            {parts.map((part, index) => (
              <React.Fragment key={`${part.key}-${index}`}>
                <span className={`inline-flex min-w-0 max-w-[18rem] rounded-md border p-1 text-xs font-semibold ${part.isUndefined ? "border-destructive/50 bg-destructive/10 text-destructive" : ""}`}>
                  <OverflowTooltip text={part.label} align="center" className={`block max-w-full truncate ${part.isUndefined ? "text-destructive" : "text-foreground"}`} maxLines={1} textSize="sm" />
                </span>

                {index < parts.length - 1 && (
                  <span className="text-sm xxxl:text-base">
                    <FontAwesomeIcon icon={faArrowRight} />
                  </span>
                )}
              </React.Fragment>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

const tableCellClass = "px-2 py-1 text-xs xxxl:text-sm";
const tableCellCenterClass = `${tableCellClass} text-center`;
const tableCellLeftClass = `${tableCellClass} text-left`;
const expandCellClass = "px-0 py-1 text-center";

export default function InventarResourceRow({
  item,
  config,
  visibleColumns,
  displayLang,
  getColumnStyle,
  textAlignClasses,
  decimalPlaces,
  isExpanded,
  onToggleVariants,
  onAddVariant,
  selectedVariantKeys,
  onToggleVariantSelect,
  onContextSelectVariant,
  onOpenTransaction,
  onOpenIstoric,
  onClearVariantSelection,
}) {
  const showCol = (key) => visibleColumns[key];
  const afisareDenumire = displayLang === "FR" ? item.denumire_fr || item.denumire : item.denumire;
  const afisareDescriere = displayLang === "FR" ? item.descriere_fr || "" : item.descriere;
  const subcategorii = item.subcategorii || [];
  const hasVariants = subcategorii.length > 0;
  const stocTotal = getStockNumber(item.stoc_total, item.stocTotal);
  const stocInventar = getStockNumber(item.stoc_inventar, item.stocInventar);

  return (
    <>
      <TableRow
        className={`h-9 border-b hover:bg-accent ${hasVariants ? "cursor-pointer" : ""}`}
        onClick={(event) => {
          if (event.target.closest("a, button, input, textarea, select")) return;
          if (hasVariants) onToggleVariants?.(item);
        }}
      >
        <TableCell style={getColumnStyle("expand")} className={expandCellClass}>
          <button
            type="button"
            disabled={!hasVariants}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              if (hasVariants) onToggleVariants?.(item);
            }}
            className={`inline-flex  h-10 w-10  items-center justify-center rounded-md ${hasVariants ? "cursor-pointer text-foreground hover:text-primary" : "cursor-default text-muted-foreground"}`}
          >
            <FontAwesomeIcon icon={isExpanded ? faChevronDown : faChevronRight} className={`text-base transition-transform ${hasVariants ? "" : "opacity-30"}`} />
          </button>
        </TableCell>

        {config.hasPhoto && showCol("poza") && (
          <TableCell style={getColumnStyle("poza")} className={tableCellCenterClass}>
            <ImagePreviewTooltip
              src={item.photo_url ? `${photoAPI}/${item.photo_url}` : null}
              alt={item.cod_definitie}
              ringColor={`hover:ring-${config.normalColor}`}
              fallback={<img src={NoImage} alt="No Image" className="h-full w-full object-cover opacity-50" />}
              containerClassName="h-9 w-9 xxxl:h-10 xxxl:w-10 rounded-md border border-border bg-muted flex items-center justify-center overflow-hidden shrink-0 mx-auto"
            />
          </TableCell>
        )}

        {showCol("limba") && (
          <TableCell style={getColumnStyle("limba")} className={tableCellCenterClass}>
            <div className="flex justify-center">
              <div className={`rounded-md border ${item.limba !== "FR" ? "bg-cyan-500/5 border-cyan-500" : "bg-lime-500/5 border-lime-500"} flex items-center justify-center`}>
                <span className={`text-xs xxxl:text-sm w-8 xxxl:w-10 py-1 font-bold ${item.limba !== "FR" ? "text-cyan-600 " : "text-lime-600"}`}>{item.limba}</span>
              </div>
            </div>
          </TableCell>
        )}

        {showCol("variante") && (
          <TableCell style={getColumnStyle("variante")} className={tableCellCenterClass}>
            <div className="flex justify-center items-center">
              <Badge
                variant="outline"
                onClick={(event) => {
                  event.stopPropagation();
                  onAddVariant?.(item);
                }}
                className={`h-8 w-8 px-2 text-center flex justify-center items-center text-xs xxxl:text-sm shadow-none whitespace-nowrap cursor-pointer transition-all hover:scale-110 ${
                  hasVariants ? (item.limba !== "FR" ? "text-cyan-600 border-cyan-500" : "text-lime-600 border-lime-500") : "text-muted-foreground"
                }`}
              >
                {subcategorii.length}
              </Badge>
            </div>
          </TableCell>
        )}

        {showCol("cod") && (
          <TableCell style={getColumnStyle("cod")} className={`${textAlignClasses.cell} ${tableCellClass} whitespace-nowrap`}>
            <InventarCodeValue item={item} displayLang={displayLang} flexClass={textAlignClasses.flex} />
          </TableCell>
        )}

        {showCol("clasa1") && (
          <TableCell style={getColumnStyle("clasa1")} className={`${textAlignClasses.cell} ${tableCellClass}`}>
            {getCatalogClassLevelDisplay(item, 1, displayLang) ? (
              <OverflowTooltip
                align={textAlignClasses.tooltip}
                text={getCatalogClassLevelDisplay(item, 1, displayLang)}
                className={`truncate text-foreground ${textAlignClasses.cell}`}
                maxLines={1}
                textSize="sm"
              />
            ) : (
              <span className="text-muted-foreground/40 italic">—</span>
            )}
          </TableCell>
        )}

        {showCol("clasa2") && (
          <TableCell style={getColumnStyle("clasa2")} className={`${textAlignClasses.cell} ${tableCellClass}`}>
            {getCatalogClassLevelDisplay(item, 2, displayLang) ? (
              <OverflowTooltip
                align={textAlignClasses.tooltip}
                text={getCatalogClassLevelDisplay(item, 2, displayLang)}
                className={`truncate text-foreground ${textAlignClasses.cell}`}
                maxLines={1}
                textSize="sm"
              />
            ) : (
              <span className="text-muted-foreground/40 italic">—</span>
            )}
          </TableCell>
        )}

        {showCol("denumire") && (
          <TableCell style={getColumnStyle("denumire")} className={`${textAlignClasses.cell} ${tableCellClass}`}>
            <OverflowTooltip align={textAlignClasses.tooltip} text={afisareDenumire || "—"} className={`truncate text-foreground ${textAlignClasses.cell}`} maxLines={1} textSize="sm" />
          </TableCell>
        )}

        {showCol("descriere") && (
          <TableCell style={getColumnStyle("descriere")} className={`${textAlignClasses.cell} ${tableCellClass}`}>
            {afisareDescriere ? (
              <OverflowTooltip align={textAlignClasses.tooltip} text={afisareDescriere} className={`truncate text-foreground ${textAlignClasses.cell}`} maxLines={1} textSize="sm" />
            ) : (
              <span className="text-muted-foreground/40 italic">—</span>
            )}
          </TableCell>
        )}

        {showCol("furnizor") && (
          <TableCell style={getColumnStyle("furnizor")} className={`${textAlignClasses.cell} ${tableCellClass}`}>
            <span className="text-muted-foreground/40 italic">—</span>
          </TableCell>
        )}

        {showCol("marca") && (
          <TableCell style={getColumnStyle("marca")} className={`${textAlignClasses.cell} ${tableCellClass}`}>
            <span className="text-muted-foreground/40 italic">—</span>
          </TableCell>
        )}

        {showCol("status") && (
          <TableCell style={getColumnStyle("status")} className={tableCellCenterClass}>
            <span className="text-muted-foreground/40 italic">—</span>
          </TableCell>
        )}

        {showCol("greutate") && (
          <TableCell style={getColumnStyle("greutate")} className={tableCellCenterClass}>
            {item.tip_resursa === "material" ? (
              <span className="font-semibold text-foreground">{formatNumber(item.greutate, decimalPlaces)}</span>
            ) : (
              <span className="text-muted-foreground/40 italic">—</span>
            )}
          </TableCell>
        )}

        {showCol("unitate") && (
          <TableCell style={getColumnStyle("unitate")} className={tableCellCenterClass}>
            <Badge variant="outline" className="h-6 px-2 text-xs xxxl:text-sm shadow-none whitespace-nowrap">
              {item.unitate_masura}
            </Badge>
          </TableCell>
        )}

        {showCol("cost") && (
          <TableCell style={getColumnStyle("cost")} className={tableCellCenterClass}>
            <span className="font-bold text-foreground">{formatNumber(item.cost, decimalPlaces)}</span>
          </TableCell>
        )}

        {showCol("stocInventar") && (
          <TableCell style={getColumnStyle("stocInventar")} className={tableCellCenterClass}>
            <span className="font-black text-foreground">{formatNumber(stocInventar, decimalPlaces)}</span>
          </TableCell>
        )}

        {showCol("stocTotal") && (
          <TableCell style={getColumnStyle("stocTotal")} className={tableCellCenterClass}>
            <span className="font-black text-primary">{formatNumber(stocTotal, decimalPlaces)}</span>
          </TableCell>
        )}

        {showCol("creat") && (
          <TableCell style={getColumnStyle("creat")} className={tableCellLeftClass}>
            <div className="flex items-center gap-1.5 h-8 overflow-hidden">
              <Avatar className="h-7 w-7 border rounded-md border-border shrink-0">
                <AvatarImage src={item.created_by_photo_url ? `${photoAPI}/${item.created_by_photo_url}` : undefined} alt={item.created_by_name} className="object-cover" />
                <AvatarFallback className="text-[10px] rounded-md bg-muted font-bold">{getUserInitials(item.created_by_name)}</AvatarFallback>
              </Avatar>

              <div className="flex flex-col justify-center min-w-0 leading-tight">
                <span className="text-xs font-bold text-foreground truncate block">{item.created_by_name || "Sistem"}</span>
                <span className="text-[10px] text-muted-foreground">{formatDateTime(item.created_at)}</span>
              </div>
            </div>
          </TableCell>
        )}

        {showCol("actualizat") && (
          <TableCell style={getColumnStyle("actualizat")} className={tableCellLeftClass}>
            <div className="flex items-center gap-1.5 h-8 overflow-hidden">
              <Avatar className="h-7 w-7 border rounded-md border-border shrink-0">
                <AvatarImage src={item.updated_by_photo_url ? `${photoAPI}/${item.updated_by_photo_url}` : undefined} alt={item.updated_by_name} className="object-cover" />
                <AvatarFallback className="text-[10px] rounded-md bg-muted font-bold">{getUserInitials(item.updated_by_name)}</AvatarFallback>
              </Avatar>

              <div className="flex flex-col justify-center min-w-0 leading-tight">
                <span className="text-xs font-bold text-foreground truncate block">{item.updated_by_name || "Sistem"}</span>
                <span className="text-[10px] text-muted-foreground">{formatDateTime(item.updated_at)}</span>
              </div>
            </div>
          </TableCell>
        )}
      </TableRow>

      {isExpanded &&
        subcategorii.map((sub, index) =>
          (() => {
            const variantKey = getVariantSelectionKey(item, sub);
            const isSelected = selectedVariantKeys.includes(variantKey);

            return (
              <InventarVariantRow
                key={sub.id}
                last={index == subcategorii.length - 1}
                sub={sub}
                parent={item}
                config={config}
                visibleColumns={visibleColumns}
                displayLang={displayLang}
                getColumnStyle={getColumnStyle}
                textAlignClasses={textAlignClasses}
                decimalPlaces={decimalPlaces}
                isSelected={isSelected}
                selectedCount={isSelected ? selectedVariantKeys.length : 1}
                onToggleSelect={onToggleVariantSelect}
                onContextSelect={onContextSelectVariant}
                onOpenTransaction={onOpenTransaction}
                onOpenIstoric={onOpenIstoric}
                onClearSelection={onClearVariantSelection}
              />
            );
          })(),
        )}
    </>
  );
}
