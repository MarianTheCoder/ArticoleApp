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

const RESOURCE_ORDER = ["manopera", "material", "utilaj", "transport"];

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
  const meta = RESOURCE_META[type];
  const total = Number(stat?.total || 0);
  const hasVariants = Number(stat?.variante || 0) > 0;
  const isEmpty = total <= 0;

  return (
    <div className={`flex h-6 w-6 items-center justify-center rounded-md border leading-none ${hasVariants ? "border-2" : ""} ${isEmpty ? "hidden" : ""} ${meta.boxClass}`} title={meta.label}>
      <FontAwesomeIcon icon={meta.icon} className="text-xs" />
    </div>
  );
});

const TooltipRow = memo(function TooltipRow({ type, stat }) {
  if (!stat || stat.total <= 0) return null;

  const meta = RESOURCE_META[type];
  const hasVariants = stat.variante > 0;

  return (
    <div className="grid grid-cols-[minmax(5.5rem,1fr)_auto_auto_auto] items-center gap-2 rounded border bg-card px-2 py-1.5">
      <div className="flex min-w-0 items-center gap-1.5">
        <span className={`h-2 w-2 shrink-0 rounded-full ${meta.dotClass}`} />
        <span className={`truncate text-xs font-black ${meta.textClass}`}>{meta.label}</span>
      </div>

      <div className="flex flex-col items-center leading-none">
        <span className="text-[9px] uppercase font-bold tracking-wide text-muted-foreground">Total</span>
        <span className="text-xs font-black text-foreground">{stat.total}</span>
      </div>

      <div className="flex flex-col items-center leading-none">
        <span className="text-[9px] uppercase font-bold tracking-wide text-muted-foreground">Var.</span>
        <span className={`text-xs font-black ${hasVariants ? "text-primary" : "text-muted-foreground"}`}>{stat.variante}</span>
      </div>

      <div className="flex flex-col items-center leading-none">
        <span className="text-[9px] uppercase font-bold tracking-wide text-muted-foreground">Def.</span>
        <span className="text-xs font-black text-foreground">{stat.definitii}</span>
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
        <div className="flex w-full cursor-help items-center justify-center gap-1 overflow-hidden whitespace-nowrap rounded-md">
          {RESOURCE_ORDER.map((type) => (
            <ElementBadge key={type} type={type} stat={stats[type]} />
          ))}
        </div>
      </TooltipTrigger>

      <TooltipContent className="z-[100] max-w-[24rem] rounded-md border-2 border-border bg-popover p-2 text-popover-foreground shadow-md">
        <TooltipArrow width={15} height={10} className="fill-border" />

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-4 border-b pb-1.5">
            <div className="flex flex-col items-start">
              <span className="text-xs font-black text-foreground">Elemente rețetă</span>
              <span className="text-xs text-muted-foreground">{totalVariante > 0 ? `${totalVariante} din ${totalElemente} folosesc variante` : "Toate elementele folosesc definiții"}</span>
            </div>

            <div className="rounded border bg-card px-2 py-0.5 text-xs font-black text-primary">{totalElemente}</div>
          </div>

          {totalElemente > 0 ? (
            <div className="flex flex-col gap-1">
              <TooltipRow type="manopera" stat={stats.manopera} />
              <TooltipRow type="material" stat={stats.material} />
              <TooltipRow type="utilaj" stat={stats.utilaj} />
              <TooltipRow type="transport" stat={stats.transport} />
            </div>
          ) : (
            <div className="rounded border bg-card px-3 py-2 text-center text-xs font-semibold text-muted-foreground">Nu există elemente în această rețetă.</div>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
