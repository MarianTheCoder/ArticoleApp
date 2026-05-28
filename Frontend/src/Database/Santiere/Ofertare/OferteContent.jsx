import React, { useCallback, useContext, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faColumns, faFileInvoice, faLayerGroup, faPenToSquare, faPlus, faTableColumns } from "@fortawesome/free-solid-svg-icons";

import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import OverflowTooltip from "@/components/ui/OverflowTooltip";
import OferteAddDialog from "./components/OferteAddDialog";
import OferteColoaneDialog from "./OferteColoaneDialog";
import OferteReteteList from "./OferteReteteList";

import { AuthContext } from "@/context/TokenContext";
import {
  useEditOfertaLucrareColoane,
  useAddOfertaReteta,
  useOferteRetete,
  useReorderOfertaRetete,
  useEditOfertaReteta,
  useDeleteOfertaReteta,
  useDuplicateOfertaRetete,
  useActualizeazaOfertaRetete,
  useGetOfertaReteteFurnizori,
  useApplyOfertaReteteFurnizori,
} from "@/hooks/Database/useOferte";
import { toast } from "sonner";
import SpinnerElement from "@/MainElements/SpinnerElement";
import OferteEditRetetaDialog from "./components/OferteEditReteteDialog";
import DeleteDialog from "@/components/ui/delete-dialog";

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

const normalizeColoaneValori = (value) => {
  const parsed = parseMaybeJson(value, []);

  if (Array.isArray(parsed)) {
    return parsed
      .map((item) => ({
        name: String(item?.name || item?.nume || "").trim(),
        value: String(item?.value || "").trim(),
      }))
      .filter((item) => item.name);
  }

  if (parsed && typeof parsed === "object") {
    return Object.values(parsed)
      .map((item) => {
        if (item && typeof item === "object") {
          return {
            name: String(item.name || item.nume || "").trim(),
            value: String(item.value || "").trim(),
          };
        }

        return null;
      })
      .filter(Boolean)
      .filter((item) => item.name);
  }

  return [];
};

const formatNumber = (value) => {
  return parseFloat(value || 0)
    .toFixed(3)
    .replace(".", ",");
};

const normalizeDecimalInput = (value) => {
  return String(value || "").replace(".", ",");
};

const parseDecimalInput = (value) => {
  return Number(String(value || "0").replace(",", "."));
};

export default function OferteContent({ selectedOferta, selectedLucrare, onUpdateSelectedLucrare }) {
  const [openAddReteta, setOpenAddReteta] = useState(false);
  const [openColoane, setOpenColoane] = useState(false);

  const [editRetetaOpen, setEditRetetaOpen] = useState(false);
  const [retetaToEdit, setRetetaToEdit] = useState(null);
  const [editCantitate, setEditCantitate] = useState("");
  const [editColoaneMap, setEditColoaneMap] = useState({});

  const [deleteRetetaOpen, setDeleteRetetaOpen] = useState(false);
  const [reteteToDelete, setReteteToDelete] = useState([]);

  const [visibleReteteColumns, setVisibleReteteColumns] = useState({
    limba: true,
    info: true,
    elemente: true,
    cod: true,
    clasa: true,
    denumire: true,
    descriere: true,
    unitate: true,
    cost: true,
    cantitate: true,
    costTotal: true,
    creat: false,
    actualizat: false,
  });

  const { user } = useContext(AuthContext);

  const editColoane = useEditOfertaLucrareColoane();
  const addOfertaReteta = useAddOfertaReteta();
  const editOfertaReteta = useEditOfertaReteta();
  const reorderOfertaRetete = useReorderOfertaRetete();
  const deleteOfertaReteta = useDeleteOfertaReteta();
  const duplicateOfertaRetete = useDuplicateOfertaRetete();
  const actualizeazaOfertaRetete = useActualizeazaOfertaRetete();
  const getOfertaReteteFurnizori = useGetOfertaReteteFurnizori();
  const applyOfertaReteteFurnizori = useApplyOfertaReteteFurnizori();

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

  const handleOpenEditReteta = useCallback(
    (reteta) => {
      if (!reteta) return;

      const coloaneValori = normalizeColoaneValori(reteta.coloane_valori);
      const nextColoaneMap = {};

      dynamicColumns.forEach((col) => {
        const found = coloaneValori.find((item) => item.name.toLowerCase() === col.nume.toLowerCase());
        nextColoaneMap[col.id] = found?.value || "";
      });

      setRetetaToEdit(reteta);
      setEditCantitate(formatNumber(reteta.cantitate_lucrare || 0));
      setEditColoaneMap(nextColoaneMap);
      setEditRetetaOpen(true);
    },
    [dynamicColumns],
  );

  const handleSaveEditReteta = async () => {
    if (!retetaToEdit?.id || !selectedLucrare?.id) return;

    const parsedCantitate = parseDecimalInput(editCantitate);

    if (!Number.isFinite(parsedCantitate) || parsedCantitate <= 0) {
      toast.warning("Cantitatea trebuie să fie mai mare de 0.", { position: "top-right" });
      return;
    }

    const coloane_valori = dynamicColumns.map((col) => ({
      name: col.nume,
      value: String(editColoaneMap[col.id] || "").trim(),
    }));

    try {
      await editOfertaReteta.mutateAsync({
        id: retetaToEdit.id,
        santier_id: selectedOferta?.santier_id,
        lucrare_id: selectedLucrare.id,
        cantitate_lucrare: parsedCantitate,
        coloane_valori,
        updated_by_user_id: user?.id || null,
      });

      toast.success("Rețeta a fost actualizată.");
      setEditRetetaOpen(false);
      setRetetaToEdit(null);
      setEditCantitate("");
      setEditColoaneMap({});
    } catch (err) {
      toast.error(err?.response?.data?.message || "Eroare la actualizarea rețetei.");
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

  const handleOpenDeleteReteta = useCallback((retetaOrRetete) => {
    const retete = (Array.isArray(retetaOrRetete) ? retetaOrRetete : [retetaOrRetete]).filter(Boolean);

    if (retete.length === 0) return;

    setReteteToDelete(retete);
    setDeleteRetetaOpen(true);
  }, []);

  const handleConfirmDeleteReteta = async () => {
    if (reteteToDelete.length === 0 || !selectedLucrare?.id) return;

    const ids = reteteToDelete.map((reteta) => Number(reteta.id)).filter((id) => Number.isInteger(id) && id > 0);

    if (ids.length === 0) return;

    try {
      await deleteOfertaReteta.mutateAsync({
        ids,
        santier_id: selectedOferta?.santier_id,
        lucrare_id: selectedLucrare.id,
      });

      toast.success(ids.length === 1 ? "Rețeta a fost ștearsă din ofertă." : `${ids.length} rețete au fost șterse din ofertă.`);

      setDeleteRetetaOpen(false);
      setReteteToDelete([]);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Eroare la ștergerea rețetei.");
    }
  };

  const handleDuplicateRetete = async (items) => {
    if (!selectedLucrare?.id || !Array.isArray(items) || items.length === 0) return;
    try {
      await duplicateOfertaRetete.mutateAsync({
        santier_id: selectedOferta?.santier_id,
        lucrare_id: selectedLucrare.id,
        items,
        created_by_user_id: user?.id || null,
      });

      toast.success(items.length === 1 ? "Rețeta a fost dublată." : `${items.length} rețete au fost dublate.`);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Eroare la dublarea rețetelor.");
    }
  };

  const handleReorderRetete = async ({ lucrare_id, ordered_ids }) => {
    if (!lucrare_id || !Array.isArray(ordered_ids) || ordered_ids.length === 0) return;

    await reorderOfertaRetete.mutateAsync({
      lucrare_id,
      ordered_ids,
      updated_by_user_id: user?.id || null,
    });
  };

  const handleUpdateRetetaQuantity = useCallback(
    async (reteta, values) => {
      if (!reteta?.id || !selectedLucrare?.id) return;

      await editOfertaReteta.mutateAsync({
        id: reteta.id,
        santier_id: selectedOferta?.santier_id,
        lucrare_id: selectedLucrare.id,
        cantitate_lucrare: values.cantitate_lucrare,
        cantitate_lucrare_formula: values.cantitate_lucrare_formula || null,
        coloane_valori: normalizeColoaneValori(reteta.coloane_valori),
        updated_by_user_id: user?.id || null,
      });

      toast.success("Cantitatea a fost salvată.");
    },
    [editOfertaReteta, selectedOferta?.santier_id, selectedLucrare?.id, user?.id],
  );

  const handleActualizeazaRetete = useCallback(
    async (payload) => {
      if (!selectedLucrare?.id || !payload?.items?.length) return;

      const res = await actualizeazaOfertaRetete.mutateAsync({
        santier_id: selectedOferta?.santier_id,
        lucrare_id: selectedLucrare.id,
        items: payload.items,
        rewrite_costs: payload.rewrite_costs,
        rewrite_quantities: payload.rewrite_quantities,
        updated_by_user_id: user?.id || null,
      });

      const updatedCount = Number(res?.updated_count || 0);
      const failedCount = Number(res?.failed_count || 0);

      if (failedCount > 0 && updatedCount > 0) {
        toast.warning(`${updatedCount} rețete actualizate, ${failedCount} eșuate (${res.failed?.[0]?.message || "nu există originalul"}).`, {
          position: "top-right",
        });
        return;
      }

      if (failedCount > 0) {
        toast.error(`${failedCount} rețete eșuate (${res.failed?.[0]?.message || "nu există originalul"}).`, {
          position: "top-right",
        });
        return;
      }

      toast.success(updatedCount === 1 ? "Rețeta a fost actualizată." : `${updatedCount} rețete au fost actualizate.`);
    },
    [actualizeazaOfertaRetete, selectedOferta?.santier_id, selectedLucrare?.id, user?.id],
  );

  const handleLoadFurnizoriRetete = useCallback(
    async (payload) => {
      if (!selectedLucrare?.id || !payload?.items?.length) {
        return {
          materiale: [],
          utilaje: [],
        };
      }

      return await getOfertaReteteFurnizori.mutateAsync({
        lucrare_id: selectedLucrare.id,
        items: payload.items,
      });
    },
    [getOfertaReteteFurnizori, selectedLucrare?.id],
  );

  const handleApplyFurnizoriRetete = useCallback(
    async (payload) => {
      if (!selectedLucrare?.id || !payload?.items?.length) return;

      const res = await applyOfertaReteteFurnizori.mutateAsync({
        santier_id: selectedOferta?.santier_id,
        lucrare_id: selectedLucrare.id,
        items: payload.items,
        apply_materiale: payload.apply_materiale,
        apply_utilaje: payload.apply_utilaje,
        material_furnizor: payload.material_furnizor,
        utilaj_furnizor: payload.utilaj_furnizor,
        updated_by_user_id: user?.id || null,

        rewrite_costs: payload.rewrite_costs,
        rewrite_quantities: payload.rewrite_quantities,
      });

      const updatedCount = Number(res?.updated_count || 0);
      const failedCount = Number(res?.failed_count || 0);

      if (failedCount > 0 && updatedCount > 0) {
        toast.warning(`${updatedCount} elemente actualizate, ${failedCount} fără variantă pentru furnizor.`, { position: "top-right" });
        return;
      }

      if (failedCount > 0) {
        toast.error(`${failedCount} elemente nu au variantă pentru furnizorul selectat.`, { position: "top-right" });
        return;
      }

      toast.success(updatedCount === 1 ? "Furnizorul a fost aplicat." : `${updatedCount} elemente au fost actualizate după furnizor.`);
    },
    [applyOfertaReteteFurnizori, selectedOferta?.santier_id, selectedLucrare?.id, user?.id],
  );

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
                  <DropdownMenuCheckboxItem checked={showTableCol("info")} onSelect={(e) => e.preventDefault()} onCheckedChange={() => toggleTableCol("actualizat")}>
                    Info
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
                  <DropdownMenuCheckboxItem checked={showTableCol("creat")} onSelect={(e) => e.preventDefault()} onCheckedChange={() => toggleTableCol("creat")}>
                    Creat
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem checked={showTableCol("actualizat")} onSelect={(e) => e.preventDefault()} onCheckedChange={() => toggleTableCol("actualizat")}>
                    Actualizat
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
            <OferteReteteList
              reteteItems={reteteLucrare}
              selectedLucrare={selectedLucrare}
              displayLang="RO"
              visibleColumns={visibleReteteColumns}
              onEditReteta={handleOpenEditReteta}
              onDeleteReteta={handleOpenDeleteReteta}
              onReorderRetete={handleReorderRetete}
              onDuplicateRetete={handleDuplicateRetete}
              onUpdateRetetaQuantity={handleUpdateRetetaQuantity}
              onLoadFurnizoriRetete={handleLoadFurnizoriRetete}
              onApplyFurnizoriRetete={handleApplyFurnizoriRetete}
              onActualizeazaRetete={handleActualizeazaRetete}
            />

            {isFetchingRetete && <SpinnerElement text={2} />}
          </div>

          <OferteAddDialog open={openAddReteta} setOpen={setOpenAddReteta} selectedOferta={selectedOferta} selectedLucrare={selectedLucrare} onConfirm={handleConfirmAddReteta} />

          <OferteColoaneDialog open={openColoane} setOpen={setOpenColoane} selectedLucrare={selectedLucrare} onSave={handleSaveColoane} />

          <OferteEditRetetaDialog
            open={editRetetaOpen}
            setOpen={setEditRetetaOpen}
            retetaToEdit={retetaToEdit}
            dynamicColumns={dynamicColumns}
            editCantitate={editCantitate}
            setEditCantitate={setEditCantitate}
            editColoaneMap={editColoaneMap}
            setEditColoaneMap={setEditColoaneMap}
            onSave={handleSaveEditReteta}
          />
          <DeleteDialog
            open={deleteRetetaOpen}
            setOpen={setDeleteRetetaOpen}
            title={reteteToDelete.length === 1 ? "Șterge rețeta din ofertă" : `Șterge ${reteteToDelete.length} rețete din ofertă`}
            description={
              reteteToDelete.length === 1
                ? `Ești sigur că vrei să ștergi rețeta "${reteteToDelete[0]?.denumire || ""}" din ofertă? Se vor șterge și elementele, variantele snapshot și pozele copiate pentru această rețetă.`
                : `Ești sigur că vrei să ștergi ${reteteToDelete.length} rețete din ofertă? Se vor șterge și elementele, variantele snapshot și pozele copiate pentru aceste rețete.`
            }
            onSubmit={handleConfirmDeleteReteta}
            useCode={false}
          />
        </>
      )}
    </div>
  );
}
