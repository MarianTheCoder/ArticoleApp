// src/components/Ofertare/OferteAddDialog.jsx
import React, { useState, useCallback, useMemo, useRef } from "react";
import { useParams } from "react-router-dom";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faDatabase, faTrash } from "@fortawesome/free-solid-svg-icons";

import { toast } from "sonner";
import OverflowTooltip from "@/components/ui/OverflowTooltip";

import ReteteMainPage from "@/Database/Retete/ReteteMainPage";
import { Separator } from "@/components/ui/separator";

const MAX_DYNAMIC_COLUMNS = 5;
const MAX_COLUMN_VALUE_LENGTH = 64;

const parseMaybeJson = (value, fallback = []) => {
  if (!value) return fallback;
  if (Array.isArray(value)) return value;

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : fallback;
    } catch {
      return fallback;
    }
  }

  return fallback;
};

const normalizeColumns = (value) => {
  return parseMaybeJson(value, [])
    .map((col, index) => {
      if (typeof col === "string") {
        return {
          id: `col_${index + 1}`,
          name: col.trim(),
        };
      }

      return {
        id: col.id || `col_${index + 1}`,
        name: String(col.name || col.nume || col.label || "").trim(),
      };
    })
    .filter((col) => col.name)
    .slice(0, MAX_DYNAMIC_COLUMNS);
};

export default function OferteAddDialog({ open, setOpen, selectedOferta, selectedLucrare, onConfirm }) {
  const { limbaUser } = useParams();

  const [selectedReteta, setSelectedReteta] = useState(null);
  const [quantity, setQuantity] = useState("");
  const [descriere, setDescriere] = useState("");
  const [descriereFr, setDescriereFr] = useState("");
  const [columnValues, setColumnValues] = useState({});
  const QtyRef = useRef(null);

  const dynamicColumns = useMemo(() => {
    return normalizeColumns(selectedLucrare?.coloane_config);
  }, [selectedLucrare?.coloane_config]);

  const reset = useCallback(() => {
    setSelectedReteta(null);
    setQuantity("");
    setDescriere("");
    setDescriereFr("");
    setColumnValues({});
  }, []);

  const handleSelectReteta = useCallback((reteta) => {
    setSelectedReteta(reteta);
    QtyRef.current?.focus();
    setDescriere("");
    setDescriereFr("");
  }, []);

  const handleOpenChange = useCallback(
    (value) => {
      setOpen(value);

      if (!value) {
        reset();
      }
    },
    [setOpen, reset],
  );

  const setColumnValue = useCallback((columnId, value) => {
    setColumnValues((prev) => ({
      ...prev,
      [columnId]: value.slice(0, MAX_COLUMN_VALUE_LENGTH),
    }));
  }, []);

  const handleConfirm = useCallback(() => {
    if (!selectedLucrare?.id) {
      toast.warning("Selectează o lucrare înainte să adaugi o rețetă.", {
        position: "top-right",
      });
      return;
    }

    if (!selectedReteta?.id) {
      toast.warning("Selectează o rețetă din tabel.", {
        position: "top-right",
      });
      return;
    }

    const parsedQuantity = parseFloat(String(quantity).replace(",", "."));

    if (isNaN(parsedQuantity) || parsedQuantity <= 0) {
      toast.warning("Introdu o cantitate validă mai mare de 0.", {
        position: "top-right",
      });
      return;
    }

    const coloane_valori = dynamicColumns.map((col) => ({
      id: col.id,
      name: col.name,
      value: (columnValues[col.id] || "").trim(),
    }));

    onConfirm?.({
      oferta: selectedOferta,
      lucrare: selectedLucrare,
      reteta: selectedReteta,
      cantitate: parsedQuantity,
      descriere: descriere.trim(),
      descriere_fr: selectedReteta?.limba === "FR" ? descriereFr.trim() : "",
      coloane_valori,
    });

    handleOpenChange(false);
  }, [selectedOferta, selectedLucrare, selectedReteta, quantity, descriere, descriereFr, dynamicColumns, columnValues, onConfirm, handleOpenChange]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[90vw] h-[95vh] rounded-md p-0 gap-0 flex flex-col ">
        <div className="shrink-0 bg-muted rounded-t-md px-6 py-2 border-b border-border flex items-center justify-between gap-6">
          <div className="flex items-center gap-4 min-w-0">
            <div className="h-14 w-14 rounded-xl bg-sky-600/20 border border-sky-600/25 flex items-center justify-center shrink-0">
              <FontAwesomeIcon icon={faDatabase} className="text-sky-600 text-2xl" />
            </div>

            <div className="min-w-0">
              <p className="text-sm font-bold uppercase tracking-widest leading-none mb-1 text-sky-600">Ofertare</p>
              <h2 className="text-xl font-bold text-foreground leading-tight">Adaugă rețetă în lucrare</h2>
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden">
          {open && <ReteteMainPage isSelectionMode isEmbedded selectedRetetaId={selectedReteta?.id || null} onSelectReteta={handleSelectReteta} lockedLang={limbaUser} />}
        </div>

        <div className="bg-muted rounded-b-md min-h-[8rem] px-4 py-3 border-t border-border shrink-0 grid grid-cols-[0.9fr_auto_0.75fr] items-center gap-5">
          <div className="min-w-0">
            {selectedReteta ? (
              <div className="min-w-0 flex flex-col gap-2">
                <div className="flex items-center gap-2 min-w-0 w-full">
                  <Badge variant="outline" className="font-bold bg-background shrink-0">
                    {selectedReteta.cod_reteta}
                  </Badge>

                  <div className="flex-1 min-w-0">
                    <OverflowTooltip text={selectedReteta.denumire || "—"} maxLines={1} align="left" className="text-sm font-bold text-foreground" />
                  </div>
                </div>

                <div className={selectedReteta.limba === "FR" ? "grid grid-cols-2 gap-2" : ""}>
                  <div className="flex flex-col gap-1">
                    {selectedReteta.limba === "FR" && <Label className="text-xs font-bold text-foreground">Descriere RO</Label>}
                    <Textarea value={descriere} onChange={(e) => setDescriere(e.target.value)} className="min-h-16 resize-none bg-background text-sm" placeholder="Descriere pentru ofertă..." />
                  </div>

                  {selectedReteta.limba === "FR" && (
                    <div className="flex flex-col gap-1">
                      <Label className="text-xs font-bold text-foreground">Descriere FR</Label>
                      <Textarea value={descriereFr} onChange={(e) => setDescriereFr(e.target.value)} className="min-h-16 resize-none bg-background text-sm" placeholder="Description pour l'offre..." />
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center px-3 min-h-12">
                <span className="italic text-base text-muted-foreground">Selectează o rețetă din tabel...</span>
              </div>
            )}
          </div>

          {dynamicColumns.length > 0 ? (
            <div className="flex-1 min-w-0 flex items-end justify-center gap-2">
              {dynamicColumns.map((col) => (
                <div key={col.id} className="flex flex-col gap-1 min-w-0 w-64">
                  <Label className="text-xs font-bold text-foreground truncate">{col.name}</Label>

                  <Input value={columnValues[col.id] || ""} onChange={(e) => setColumnValue(col.id, e.target.value)} maxLength={MAX_COLUMN_VALUE_LENGTH} className="h-9 text-sm" />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-1 min-w-0 flex  justify-center gap-2"></div>
          )}

          <div className="flex items-center gap-4 justify-end shrink-0">
            <div className="flex items-center gap-3">
              <Label className="font-bold text-base">Cantitate:</Label>

              <Input
                className="w-32 h-11 font-black text-center border-2"
                placeholder="0,000"
                value={quantity}
                ref={QtyRef}
                onChange={(e) => {
                  const val = e.target.value.replace(".", ",");

                  if (/^\d{0,7}\,?\d{0,3}$/.test(val)) {
                    setQuantity(val);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleConfirm();
                  }
                }}
              />
            </div>

            {selectedReteta && (
              <Button
                variant="destructive"
                onClick={() => {
                  setSelectedReteta(null);
                  setDescriere("");
                  setDescriereFr("");
                }}
                className="gap-2 h-11 px-8 font-bold shadow-md transition-all active:scale-95"
              >
                <FontAwesomeIcon icon={faTrash} className="text-lg" />
                Șterge selecția
              </Button>
            )}

            <Button
              onClick={handleConfirm}
              disabled={!selectedReteta || !selectedLucrare}
              className="gap-2 bg-sky-600 hover:bg-sky-700 text-white h-11 px-8 font-bold shadow-md transition-all active:scale-95"
            >
              <FontAwesomeIcon icon={faCheck} className="text-lg" />
              Confirmă adăugarea
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
