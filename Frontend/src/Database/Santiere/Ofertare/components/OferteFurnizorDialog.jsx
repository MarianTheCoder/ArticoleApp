import React, { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faExclamationTriangle } from "@fortawesome/free-solid-svg-icons";
import { toast } from "sonner";

export default function OferteFurnizoriDialog({ open, setOpen, retete = [], onLoadFurnizori, onConfirm }) {
  const [loading, setLoading] = useState(false);

  const [furnizori, setFurnizori] = useState({
    materiale: [],
    utilaje: [],
  });

  const [applyMateriale, setApplyMateriale] = useState(true);
  const [applyUtilaje, setApplyUtilaje] = useState(true);

  const [rewriteCost, setRewriteCost] = useState(false);
  const [rewriteQuantity, setRewriteQuantity] = useState(false);

  const [materialFurnizor, setMaterialFurnizor] = useState("");
  const [utilajFurnizor, setUtilajFurnizor] = useState("");

  const onLoadFurnizoriRef = useRef(onLoadFurnizori);

  useEffect(() => {
    onLoadFurnizoriRef.current = onLoadFurnizori;
  }, [onLoadFurnizori]);

  const reteteKey = useMemo(() => {
    return (retete || []).map((reteta) => `${reteta.id}:${reteta.original_reteta_id || ""}`).join("|");
  }, [retete]);

  useEffect(() => {
    if (!open) return;

    const items = (retete || []).map((reteta) => ({
      oferta_reteta_id: reteta.id,
      original_reteta_id: reteta.original_reteta_id,
    }));

    let cancelled = false;

    setApplyMateriale(true);
    setApplyUtilaje(true);
    setRewriteCost(false);
    setRewriteQuantity(false);
    setMaterialFurnizor("");
    setUtilajFurnizor("");
    setFurnizori({
      materiale: [],
      utilaje: [],
    });

    const load = async () => {
      try {
        setLoading(true);

        const res = await onLoadFurnizoriRef.current?.({
          items,
        });

        if (cancelled) return;

        const nextFurnizori = {
          materiale: res?.materiale || [],
          utilaje: res?.utilaje || [],
        };

        setFurnizori(nextFurnizori);
        setMaterialFurnizor(nextFurnizori.materiale?.[0]?.value || "");
        setUtilajFurnizor(nextFurnizori.utilaje?.[0]?.value || "");
      } catch (err) {
        if (!cancelled) {
          toast.error(err?.response?.data?.message || "Eroare la încărcarea furnizorilor.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [open, reteteKey]);

  const canSubmit = useMemo(() => {
    if (loading) return false;
    if (applyMateriale && !materialFurnizor) return false;
    if (applyUtilaje && !utilajFurnizor) return false;

    return applyMateriale || applyUtilaje;
  }, [loading, applyMateriale, applyUtilaje, materialFurnizor, utilajFurnizor]);

  const handleConfirm = async () => {
    if (!canSubmit) {
      toast.warning("Selectează cel puțin un furnizor.", { position: "top-right" });
      return;
    }

    await onConfirm?.({
      items: (retete || []).map((reteta) => ({
        oferta_reteta_id: reteta.id,
        original_reteta_id: reteta.original_reteta_id,
      })),

      apply_materiale: applyMateriale,
      apply_utilaje: applyUtilaje,

      material_furnizor: applyMateriale ? materialFurnizor : null,
      utilaj_furnizor: applyUtilaje ? utilajFurnizor : null,

      rewrite_costs: rewriteCost,
      rewrite_quantities: rewriteQuantity,
    });
  };

  return (
    <Dialog open={!!open} onOpenChange={setOpen}>
      <DialogContent className="keepSelection sm:max-w-xl xl:max-w-4xl p-8 gap-8 border shadow-2xl">
        <DialogHeader className="flex flex-col items-center text-center gap-2">
          <div className="grid gap-2 w-full">
            <DialogTitle className="text-2xl font-semibold text-center text-foreground">
              Furnizori pentru {retete.length} {retete.length === 1 ? "rețetă" : "rețete"}
            </DialogTitle>

            <DialogDescription className="text-base text-muted-foreground text-center leading-relaxed">
              Selectează furnizorul pentru materiale și/sau utilaje. Variantele vor fi alese automat după furnizor.
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="grid gap-4 w-full max-w-md xl:max-w-none mx-auto xl:grid-cols-2">
          <label className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3 hover:bg-accent transition-colors">
            <Checkbox className="w-5 h-5" checked={applyMateriale} onCheckedChange={(checked) => setApplyMateriale(checked === true)} />

            <div className="grid gap-1 flex-1">
              <span className="text-base font-semibold text-foreground">Materiale</span>

              <select
                disabled={!applyMateriale || loading || furnizori.materiale.length === 0}
                value={materialFurnizor}
                onChange={(e) => setMaterialFurnizor(e.target.value)}
                className="h-10 rounded-md border bg-background px-3 text-sm font-bold outline-none disabled:opacity-50"
              >
                {furnizori.materiale.length === 0 ? (
                  <option value="">Nu există furnizori</option>
                ) : (
                  furnizori.materiale.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))
                )}
              </select>
            </div>
          </label>

          <label className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3 hover:bg-accent transition-colors">
            <Checkbox className="w-5 h-5" checked={applyUtilaje} onCheckedChange={(checked) => setApplyUtilaje(checked === true)} />

            <div className="grid gap-1 flex-1">
              <span className="text-base font-semibold text-foreground">Utilaje</span>

              <select
                disabled={!applyUtilaje || loading || furnizori.utilaje.length === 0}
                value={utilajFurnizor}
                onChange={(e) => setUtilajFurnizor(e.target.value)}
                className="h-10 rounded-md border bg-background px-3 text-sm font-bold outline-none disabled:opacity-50"
              >
                {furnizori.utilaje.length === 0 ? (
                  <option value="">Nu există furnizori</option>
                ) : (
                  furnizori.utilaje.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))
                )}
              </select>
            </div>
          </label>

          <div className="grid gap-3 xl:col-span-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex items-center justify-center gap-3 rounded-xl border bg-card px-4 py-3 hover:bg-accent transition-colors cursor-pointer">
                <Checkbox className="w-5 h-5" checked={rewriteCost} onCheckedChange={(checked) => setRewriteCost(checked === true)} />
                <span className="text-sm font-black text-foreground">Rescrie Cost</span>
              </label>

              <label className="flex items-center justify-center gap-3 rounded-xl border bg-card px-4 py-3 hover:bg-accent transition-colors cursor-pointer">
                <Checkbox className="w-5 h-5" checked={rewriteQuantity} onCheckedChange={(checked) => setRewriteQuantity(checked === true)} />
                <span className="text-sm font-black text-foreground">Rescrie Qty</span>
              </label>
            </div>

            <div className="rounded-xl border bg-muted/30 px-4 py-3 text-sm text-muted-foreground leading-relaxed text-center">
              Dacă <span className="font-black text-foreground">Rescrie Cost</span> nu e bifat, se păstrează costul curent. Dacă <span className="font-black text-foreground">Rescrie Qty</span> nu e
              bifat, se păstrează cantitatea curentă.
            </div>

            {loading ? (
              <div className="rounded-xl border bg-muted/40 px-4 py-3 text-center text-sm font-bold text-muted-foreground">Se încarcă furnizorii...</div>
            ) : !furnizori.materiale.length && !furnizori.utilaje.length ? (
              <div className="rounded-xl border bg-yellow-50 dark:bg-yellow-950/30 px-4 py-3 text-center text-sm font-bold text-yellow-700 dark:text-yellow-300">
                <FontAwesomeIcon icon={faExclamationTriangle} className="mr-2" />
                Nu am găsit furnizori pentru materialele/utilajele din selecție.
              </div>
            ) : null}
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-3 sm:justify-center w-full">
          <Button type="button" variant="outline" size="lg" onClick={() => setOpen(false)} className="text-base min-w-[120px]">
            Anulează
          </Button>

          <Button type="button" size="lg" disabled={!canSubmit} onClick={handleConfirm} className="gap-2 bg-sky-600 hover:bg-sky-700 text-white text-base min-w-[150px]">
            <FontAwesomeIcon icon={faCheck} />
            Aplică
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
