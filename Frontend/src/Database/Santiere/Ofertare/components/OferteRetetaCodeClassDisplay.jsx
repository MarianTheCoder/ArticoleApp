import React, { useEffect, useRef, useState } from "react";
import { Tooltip, TooltipArrow, TooltipContent, TooltipTrigger } from "@radix-ui/react-tooltip";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight, faQuestion } from "@fortawesome/free-solid-svg-icons";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import OverflowTooltip from "@/components/ui/OverflowTooltip";

export const getResolvedClassDisplay = (meta, displayLang = "RO") => {
  if (!meta?.last_class) return "";

  const level = meta.last_class;
  const denumire = displayLang === "FR" ? level.denumire_fr || level.denumire_ro : level.denumire_ro;

  return denumire ? `${level.code_segment}. ${denumire}` : "";
};

const getSnapshotLastClass = (levels, displayLang = "RO") => {
  const source = Array.isArray(levels) ? levels : [];
  const level = [...source].reverse().find((item) => item && !item.is_empty && item.code_segment && String(item.code_segment) !== "00");

  if (!level) return "";

  const denumire = displayLang === "FR" ? level.denumire_fr || level.denumire_ro : level.denumire_ro;

  return `${level.code_segment}. ${level.is_defined && denumire ? denumire : "Nedefinit"}`;
};

export const getRetetaClassDisplay = (reteta, displayLang = "RO") => {
  return getSnapshotLastClass(reteta?.class_snapshot, displayLang) || getResolvedClassDisplay(reteta?.cod_reteta_meta, displayLang);
};

const getRetetaMetaLevels = (meta) => {
  if (Array.isArray(meta?.levels)) return meta.levels;
  if (Array.isArray(meta?.classLevels)) return meta.classLevels;
  if (Array.isArray(meta?.class_levels)) return meta.class_levels;
  return [];
};

const getLevelCode = (level) => {
  return level?.code_segment || level?.segment || "";
};

const getLevelKey = (level, index) => {
  return level?.path_code || `${level?.level_no || index + 1}-${getLevelCode(level) || index}`;
};

const getLevelLabel = (level, displayLang = "RO") => {
  const code = getLevelCode(level) || "—";
  const denumire = displayLang === "FR" ? level?.denumire_fr || level?.denumire_ro : level?.denumire_ro;

  return `${code}. ${level?.is_defined && denumire ? denumire : "Nedefinit"}`;
};

export const getCodeTooltipParts = (meta, displayLang = "RO", fallback = "") => {
  const levels = getRetetaMetaLevels(meta);

  const parts = levels
    .filter((level) => {
      const code = getLevelCode(level);
      return level && !level.is_empty && code && String(code) !== "00";
    })
    .map((level, index) => {
      const code = getLevelCode(level) || "—";
      const denumire = displayLang === "FR" ? level?.denumire_fr || level?.denumire_ro : level?.denumire_ro;
      const isUndefined = !(level?.is_defined && denumire);

      return {
        key: getLevelKey(level, index),
        label: `${code}. ${isUndefined ? "Nedefinit" : denumire}`,
        isUndefined,
      };
    });

  const recipeCode =
    meta?.recipe_code ||
    meta?.recipeCode ||
    String(fallback || "")
      .trim()
      .split(/\s+/)
      .at(-1);

  if (recipeCode) {
    parts.push({
      key: "recipe",
      label: `${recipeCode}. Rețetă`,
      isUndefined: false,
    });
  }

  if (parts.length > 0) return parts;

  return [{ key: "fallback", label: fallback || "Cod nedefinit", isUndefined: false }];
};

export const RecipeCodeTooltip = ({ text, tooltipParts, className = "text-center", plainQuestion = false }) => {
  const justifyClass = className.includes("text-right") ? "justify-end" : className.includes("text-center") ? "justify-center" : "justify-start";

  return (
    <div className={`flex min-w-0 items-center gap-1.5 ${justifyClass} ${className}`}>
      <span className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-sm font-semibold text-foreground">{text}</span>

      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            data-no-row-open
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
            className={
              plainQuestion
                ? "inline-flex h-5 w-4 shrink-0 cursor-help items-center justify-center bg-transparent text-[0.75rem] font-black text-foreground hover:text-primary"
                : "inline-flex h-5 w-5 shrink-0 cursor-help items-center justify-center rounded-full border border-border bg-card text-[0.65rem] font-black text-foreground shadow-sm transition-colors hover:border-foreground hover:bg-muted"
            }
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
          className="z-[100] max-w-[64rem] w-auto rounded-md border-2 border-border bg-popover p-3 text-sm text-popover-foreground shadow-md"
        >
          <div className="flex max-w-[62rem] flex-wrap items-center gap-1">
            {tooltipParts.map((part, index) => (
              <React.Fragment key={`${part.key}-${index}`}>
                <span
                  title={part.label}
                  className={`inline-flex min-w-0 max-w-[18rem] rounded-md border p-1 text-xs xxxl:text-sm font-semibold ${
                    part.isUndefined ? "border-destructive/50 bg-destructive/10 text-destructive" : ""
                  }`}
                >
                  <OverflowTooltip text={part.label} align="center" className={`block max-w-full truncate ${part.isUndefined ? "text-destructive" : "text-foreground"}`} maxLines={1} textSize="sm" />
                </span>

                {index < tooltipParts.length - 1 && (
                  <span className="text-base">
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

export const OferteRetetaCodeValue = ({ reteta, displayLang = "RO", className = "text-center", emptyClassName = "text-xs text-muted-foreground/40 italic", withTooltip = true }) => {
  if (!reteta?.cod_reteta) {
    return <span className={emptyClassName}>—</span>;
  }

  if (!withTooltip) {
    return <span className={`block w-full max-w-full overflow-hidden text-ellipsis whitespace-nowrap font-semibold text-foreground ${className}`}>{String(reteta.cod_reteta)}</span>;
  }

  return <RecipeCodeTooltip text={String(reteta.cod_reteta)} tooltipParts={getCodeTooltipParts(reteta.cod_reteta_meta, displayLang, reteta.cod_reteta)} className={className} />;
};

export const OferteRetetaClassValue = ({ reteta, displayLang = "RO", align = "center", className = "text-center", emptyClassName = "text-xs text-muted-foreground/40 italic" }) => {
  const afisareClasa = getRetetaClassDisplay(reteta, displayLang);

  if (!afisareClasa) {
    return <span className={emptyClassName}>—</span>;
  }

  return <OverflowTooltip align={align} text={afisareClasa} className={`text-foreground font-normal ${className} whitespace-nowrap`} maxLines={1} textSize="sm" />;
};
