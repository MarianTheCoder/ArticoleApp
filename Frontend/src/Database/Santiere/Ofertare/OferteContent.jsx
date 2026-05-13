import React, { useCallback, useContext, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFileInvoice, faLayerGroup, faPlus, faColumns, faTableColumns } from "@fortawesome/free-solid-svg-icons";

import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

import OverflowTooltip from "@/components/ui/OverflowTooltip";
import OferteAddDialog from "./OferteAddDialog";
import OferteColoaneDialog from "./OferteColoaneDialog";
import OferteReteteList from "./OferteReteteList";

import { AuthContext } from "@/context/TokenContext";
import { useEditOfertaLucrareColoane, useAddOfertaReteta, useOferteRetete } from "@/hooks/Database/useOferte";
import { toast } from "sonner";
import SpinnerElement from "@/MainElements/SpinnerElement";

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

export default function OferteContent({ selectedOferta, selectedLucrare, onUpdateSelectedLucrare }) {
  const [openAddReteta, setOpenAddReteta] = useState(false);
  const [openColoane, setOpenColoane] = useState(false);

  const [visibleReteteColumns, setVisibleReteteColumns] = useState({
    limba: true,
    elemente: true,
    cod: true,
    clasa: true,
    denumire: true,
    descriere: true,
    unitate: true,
    cost: true,
    cantitate: true,
    costTotal: true,
  });

  const { user } = useContext(AuthContext);
  const editColoane = useEditOfertaLucrareColoane();
  const addOfertaReteta = useAddOfertaReteta();

  const { data: reteteData, isFetching: isFetchingRetete } = useOferteRetete(selectedLucrare?.id);
  const reteteLucrare = reteteData?.retete || [];

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

  const handleConfirmAddReteta = async ({ lucrare, reteta, cantitate, coloane_valori }) => {
    if (!lucrare?.id || !reteta?.id) return;

    try {
      await addOfertaReteta.mutateAsync({
        santier_id: selectedOferta?.santier_id,
        lucrare_id: lucrare.id,
        original_reteta_id: reteta.id,
        cantitate_lucrare: cantitate,
        coloane_valori,
        created_by_user_id: user?.id || null,
      });

      toast.success("Rețeta a fost adăugată în ofertă.");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Eroare la adăugarea rețetei în ofertă.");
    }
  };

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

  return (
    <div className="w-full h-full bg-card border-border rounded-r-lg border border-l-0 overflow-hidden flex flex-col">
      {!selectedOferta ? (
        <div className="h-full w-full flex flex-col items-center justify-center text-muted-foreground gap-3">
          <FontAwesomeIcon icon={faFileInvoice} className="text-4xl opacity-50" />
          <p className="text-lg font-medium">Selectează o ofertă din sidebar.</p>
        </div>
      ) : !selectedLucrare ? (
        <div className="h-full w-full flex flex-col items-center justify-center text-muted-foreground gap-3">
          <FontAwesomeIcon icon={faLayerGroup} className="text-4xl opacity-50" />
          <p className="text-lg font-medium">Selectează o lucrare din oferta „{selectedOferta.nume}”.</p>
        </div>
      ) : (
        <>
          <div className="h-16 shrink-0 border-b px-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
            <div className="flex items-center gap-3 min-w-0 overflow-hidden">
              <FontAwesomeIcon icon={faLayerGroup} className="text-primary text-xl shrink-0" />

              <OverflowTooltip
                text={selectedLucrare.nume}
                align="left"
                className="block w-full max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-lg text-foreground tracking-tight font-bold"
                maxLines={1}
              />
            </div>

            <div className="flex justify-end items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2 text-foreground shrink-0">
                    <FontAwesomeIcon icon={faTableColumns} />
                    Coloane tabel
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuCheckboxItem checked={showTableCol("limba")} onSelect={(e) => e.preventDefault()} onCheckedChange={() => toggleTableCol("limba")}>
                    Limba
                  </DropdownMenuCheckboxItem>

                  <DropdownMenuCheckboxItem checked={showTableCol("elemente")} onSelect={(e) => e.preventDefault()} onCheckedChange={() => toggleTableCol("elemente")}>
                    Elemente
                  </DropdownMenuCheckboxItem>

                  {dynamicColumns.map((col) => (
                    <DropdownMenuCheckboxItem key={col.id} checked={showTableCol(`col_${col.id}`)} onSelect={(e) => e.preventDefault()} onCheckedChange={() => toggleTableCol(`col_${col.id}`)}>
                      {col.nume}
                    </DropdownMenuCheckboxItem>
                  ))}

                  <DropdownMenuCheckboxItem checked={showTableCol("cod")} onSelect={(e) => e.preventDefault()} onCheckedChange={() => toggleTableCol("cod")}>
                    Cod
                  </DropdownMenuCheckboxItem>

                  <DropdownMenuCheckboxItem checked={showTableCol("clasa")} onSelect={(e) => e.preventDefault()} onCheckedChange={() => toggleTableCol("clasa")}>
                    Clasa
                  </DropdownMenuCheckboxItem>

                  <DropdownMenuCheckboxItem checked={showTableCol("denumire")} onSelect={(e) => e.preventDefault()} onCheckedChange={() => toggleTableCol("denumire")}>
                    Denumire
                  </DropdownMenuCheckboxItem>

                  <DropdownMenuCheckboxItem checked={showTableCol("descriere")} onSelect={(e) => e.preventDefault()} onCheckedChange={() => toggleTableCol("descriere")}>
                    Descriere
                  </DropdownMenuCheckboxItem>

                  <DropdownMenuCheckboxItem checked={showTableCol("unitate")} onSelect={(e) => e.preventDefault()} onCheckedChange={() => toggleTableCol("unitate")}>
                    Unitate
                  </DropdownMenuCheckboxItem>

                  <DropdownMenuCheckboxItem checked={showTableCol("cost")} onSelect={(e) => e.preventDefault()} onCheckedChange={() => toggleTableCol("cost")}>
                    Cost rețetă
                  </DropdownMenuCheckboxItem>

                  <DropdownMenuCheckboxItem checked={showTableCol("cantitate")} onSelect={(e) => e.preventDefault()} onCheckedChange={() => toggleTableCol("cantitate")}>
                    Cantitate
                  </DropdownMenuCheckboxItem>

                  <DropdownMenuCheckboxItem checked={showTableCol("costTotal")} onSelect={(e) => e.preventDefault()} onCheckedChange={() => toggleTableCol("costTotal")}>
                    Total
                  </DropdownMenuCheckboxItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button variant="outline" className="gap-2 px-2 text-foreground shrink-0" onClick={() => setOpenColoane(true)} title="Configurează coloanele lucrării">
                <FontAwesomeIcon icon={faColumns} />
              </Button>

              <Button className="gap-2 shrink-0" onClick={() => setOpenAddReteta(true)}>
                <FontAwesomeIcon icon={faPlus} />
                Adaugă rețetă
              </Button>
            </div>
          </div>

          <div className="flex-1 min-h-0 p-6 relative">
            <OferteReteteList reteteItems={reteteLucrare} selectedLucrare={selectedLucrare} displayLang="RO" visibleColumns={visibleReteteColumns} />

            {isFetchingRetete && <SpinnerElement text={2} />}
          </div>

          <OferteAddDialog open={openAddReteta} setOpen={setOpenAddReteta} selectedOferta={selectedOferta} selectedLucrare={selectedLucrare} onConfirm={handleConfirmAddReteta} />

          <OferteColoaneDialog open={openColoane} setOpen={setOpenColoane} selectedLucrare={selectedLucrare} onSave={handleSaveColoane} />
        </>
      )}
    </div>
  );
}
