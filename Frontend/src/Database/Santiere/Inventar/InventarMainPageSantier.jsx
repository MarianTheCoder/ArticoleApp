import React, { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChartLine, faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";

import { useInventare } from "@/hooks/Database/useInventar";
import { useSantier } from "@/hooks/useSantiere";
import { Separator } from "@/components/ui/separator";
import InventarResursePage from "@/Database/Inventar/InventarResursePage";
import { resurseConfig } from "@/Database/Catalog/resurseConfig";

const TABS = [
  {
    id: "sumar",
    label: "Sumar",
    icon: faChartLine,
    colorClass: "text-sky-600",
    activeClass: "bg-sky-600 border-sky-600 text-white",
    inactiveClass: "border-sky-600/40 bg-sky-600/10 text-sky-700 hover:bg-sky-600/20 dark:text-sky-300",
  },
  {
    id: "material",
    label: "Materiale",
    icon: resurseConfig.material.icon,
    colorClass: resurseConfig.material.colorClass,
    activeClass: "bg-amber-600 border-amber-600 text-white",
    inactiveClass: "border-amber-600/40 bg-amber-600/10 text-amber-700 hover:bg-amber-600/20 dark:text-amber-300",
  },
  {
    id: "utilaj",
    label: "Utilaje",
    icon: resurseConfig.utilaj.icon,
    colorClass: resurseConfig.utilaj.colorClass,
    activeClass: "bg-rose-600 border-rose-600 text-white",
    inactiveClass: "border-rose-600/40 bg-rose-600/10 text-rose-700 hover:bg-rose-600/20 dark:text-rose-300",
  },
  {
    id: "transport",
    label: "Transport",
    icon: resurseConfig.transport.icon,
    colorClass: resurseConfig.transport.colorClass,
    activeClass: "bg-emerald-600 border-emerald-600 text-white",
    inactiveClass: "border-emerald-600/40 bg-emerald-600/10 text-emerald-700 hover:bg-emerald-600/20 dark:text-emerald-300",
  },
];

export default function InventarMainPageSantier() {
  const { limbaUser, idSantier } = useParams();
  const limba = String(limbaUser || "RO").toUpperCase() === "FR" ? "FR" : "RO";
  const santierId = Number(idSantier);

  const { data: inventareData } = useInventare();
  const { data: santierData } = useSantier(santierId);
  const santierName = santierData?.santier?.nume || `Șantier #${santierId || ""}`;

  // Magazia (inventarul) companiei pentru limba curentă — ancora tranzacțiilor de stoc inițiate de pe șantier.
  const inventar = useMemo(() => {
    const list = inventareData?.items || [];
    return list.find((item) => String(item.limba).toUpperCase() === limba) || list[0] || null;
  }, [inventareData, limba]);

  const location = useMemo(() => ({ tip: "santier", id: santierId, limba }), [santierId, limba]);

  const [activeTab, setActiveTab] = useState("material");

  return (
    <div className="flex h-full w-full flex-col overflow-hidden p-3 xxxl:p-4">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border bg-card px-3 py-2 xxxl:px-4 xxxl:py-2.5">
          <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-background p-1 shadow-sm">
            <span className="max-w-[18rem] truncate px-2 text-sm font-black text-foreground xxxl:max-w-[24rem] xxxl:text-base">{santierName}</span>
            <Separator orientation="vertical" className="h-7 xxxl:h-8 w-0.5  bg-foreground" />
            {TABS.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex h-8 items-center gap-1.5 rounded-md border px-3 text-xs font-black tracking-wide transition-colors xxxl:h-9 xxxl:text-sm ${active ? `${tab.activeClass} shadow-sm` : tab.inactiveClass}`}
                >
                  <FontAwesomeIcon icon={tab.icon} className={`text-sm xxxl:text-base ${active ? "text-white" : tab.colorClass}`} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {!inventar && (
            <span className="ml-auto flex items-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-700 dark:text-amber-300">
              <FontAwesomeIcon icon={faTriangleExclamation} />
              Nu există magazie {limba}. Mișcările de stoc sunt indisponibile.
            </span>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-hidden bg-card">
          {activeTab === "sumar" ? (
            <div className="flex h-full items-center justify-center text-sm font-semibold text-muted-foreground">Sumar — în curând.</div>
          ) : (
            <InventarResursePage key={activeTab} inventar={inventar} location={location} locationName={santierName} tipResursa={activeTab} />
          )}
        </div>
      </div>
    </div>
  );
}
