import React, { memo, useMemo } from "react";
import { Tooltip, TooltipArrow, TooltipContent, TooltipTrigger } from "@radix-ui/react-tooltip";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCar, faPerson, faScrewdriverWrench, faTruck } from "@fortawesome/free-solid-svg-icons";

const hasVariantSelected = (el) => {
  return !!(el?.oferta_subcategorie_id || el?.original_subcategorie_id || el?.cod_specific);
};

const RESOURCE_META = {
  manopera: {
    label: "Manoperă",
    icon: faPerson,
    boxClass: "text-indigo-500 bg-indigo-500/10 border-indigo-500/50",
    dotClass: "bg-indigo-500",
    textClass: "text-indigo-500",
  },
  material: {
    label: "Materiale",
    icon: faScrewdriverWrench,
    boxClass: "text-amber-600 bg-amber-600/10 border-amber-600/50",
    dotClass: "bg-amber-600",
    textClass: "text-amber-600",
  },
  utilaj: {
    label: "Utilaje",
    icon: faTruck,
    boxClass: "text-rose-600 bg-rose-600/10 border-rose-600/50",
    dotClass: "bg-rose-600",
    textClass: "text-rose-600",
  },
  transport: {
    label: "Transport",
    icon: faCar,
    boxClass: "text-emerald-600 bg-emerald-600/10 border-emerald-600/50",
    dotClass: "bg-emerald-600",
    textClass: "text-emerald-600",
  },
};

const getVariantStats = (reteta) => {
  const stats = {
    manopera: { total: 0, variante: 0, definitii: 0 },
    material: { total: 0, variante: 0, definitii: 0 },
    utilaj: { total: 0, variante: 0, definitii: 0 },
    transport: { total: 0, variante: 0, definitii: 0 },
  };

  (reteta?.elemente || []).forEach((el) => {
    if (!stats[el.tip_resursa]) return;

    const isVariant = hasVariantSelected(el);

    stats[el.tip_resursa].total += 1;

    if (isVariant) {
      stats[el.tip_resursa].variante += 1;
    } else {
      stats[el.tip_resursa].definitii += 1;
    }
  });

  return stats;
};

const ElementBadge = memo(function ElementBadge({ type, stat }) {
  if (!stat || stat.total <= 0) return null;

  const meta = RESOURCE_META[type];
  const hasVariants = stat.variante > 0;

  return (
    <div className={`flex items-center justify-center gap-1 rounded-md px-1.5 py-1 transition-all ${hasVariants ? "border-2 " : "border"} ${meta.boxClass}`}>
      <FontAwesomeIcon icon={meta.icon} className="text-[10px]" />
      <span className="text-xs font-black leading-none">{stat.total}</span>
    </div>
  );
});

const TooltipRow = memo(function TooltipRow({ type, stat }) {
  if (!stat || stat.total <= 0) return null;

  const meta = RESOURCE_META[type];
  const hasVariants = stat.variante > 0;

  return (
    <div className="grid grid-cols-[minmax(6.5rem,1fr)_auto_auto_auto] items-center gap-3 rounded-md border bg-card px-3 py-2">
      <div className="flex items-center gap-2 min-w-0">
        <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${meta.dotClass}`} />
        <span className={`text-sm font-black truncate ${meta.textClass}`}>{meta.label}</span>
      </div>

      <div className="flex flex-col items-center leading-none">
        <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Total</span>
        <span className="text-sm font-black text-foreground">{stat.total}</span>
      </div>

      <div className="flex flex-col items-center leading-none">
        <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Variante</span>
        <span className={`text-sm font-black ${hasVariants ? "text-primary" : "text-muted-foreground"}`}>{stat.variante}</span>
      </div>

      <div className="flex flex-col items-center leading-none">
        <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Definitii</span>
        <span className="text-sm font-black text-foreground">{stat.definitii}</span>
      </div>
    </div>
  );
});

export default function OferteElementeTooltop({ reteta }) {
  const stats = useMemo(() => getVariantStats(reteta), [reteta]);
  const totalElemente = Object.values(stats).reduce((sum, item) => sum + item.total, 0);
  const totalVariante = Object.values(stats).reduce((sum, item) => sum + item.variante, 0);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="w-full  grid grid-cols-2 items-center justify-center gap-1 rounded-md  cursor-help">
          <ElementBadge type="manopera" stat={stats.manopera} />
          <ElementBadge type="material" stat={stats.material} />
          <ElementBadge type="utilaj" stat={stats.utilaj} />
          <ElementBadge type="transport" stat={stats.transport} />

          {totalElemente === 0 && <div className="text-sm col-span-2 text-center text-muted-foreground italic font-medium">Gol</div>}
        </div>
      </TooltipTrigger>

      <TooltipContent className="z-[100] max-w-[26rem] rounded-md border-2 border-border bg-popover text-popover-foreground shadow-md p-3">
        <TooltipArrow width={15} height={10} className="fill-border" />

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-4 border-b pb-2">
            <div className="flex items-start flex-col">
              <span className="text-sm font-black text-foreground">Elemente rețetă</span>
              <span className="text-xs text-muted-foreground">{totalVariante > 0 ? `${totalVariante} din ${totalElemente} folosesc variante` : "Toate elementele folosesc definiții"}</span>
            </div>

            <div className="rounded-md border bg-card px-2.5 py-1 text-sm font-black text-primary">{totalElemente}</div>
          </div>

          {totalElemente > 0 ? (
            <div className="flex flex-col gap-1.5">
              <TooltipRow type="manopera" stat={stats.manopera} />
              <TooltipRow type="material" stat={stats.material} />
              <TooltipRow type="utilaj" stat={stats.utilaj} />
              <TooltipRow type="transport" stat={stats.transport} />
            </div>
          ) : (
            <div className="rounded-md border bg-card px-3 py-3 text-center text-sm font-semibold text-muted-foreground">Nu există elemente în această rețetă.</div>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
