import React, { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faTruck } from "@fortawesome/free-solid-svg-icons";
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
      <DialogContent className="keepSelection sm:max-w-xl xl:max-w-4xl p-0 gap-0 overflow-hidden border shadow-2xl">
        <DialogHeader className="px-6 py-4 border-b bg-muted">
          <div className="flex items-center gap-4 min-w-0">
            <div className="h-14 w-14 rounded-xl bg-sky-600/20 border border-sky-600/25 flex items-center justify-center shrink-0">
              <FontAwesomeIcon icon={faTruck} className="text-sky-600 text-2xl" />
            </div>

            <div className="grid gap-1 min-w-0 text-left">
              <DialogTitle className="text-xl font-black text-foreground">
                Furnizori pentru {retete.length} {retete.length === 1 ? "rețetă" : "rețete"}
              </DialogTitle>

              <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
                Selectează furnizorul pentru materiale și/sau utilaje. Variantele vor fi alese automat după furnizor.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="grid gap-4 w-full bg-card px-6 py-5 xl:grid-cols-2">
          <div className="flex items-center gap-3 rounded-md border bg-muted/10 px-4 py-3 transition-colors hover:bg-accent">
            <div className="grid gap-1 flex-1 min-w-0">
              <span className="text-base font-bold text-foreground">Materiale</span>

              <div className="grid grid-cols-[1fr_auto] gap-2 justify-center  flex-1 ">
                <select
                  disabled={!applyMateriale || loading || furnizori.materiale.length === 0}
                  value={materialFurnizor}
                  onChange={(e) => setMaterialFurnizor(e.target.value)}
                  className="h-10 rounded-md border bg-background px-3 text-sm font-bold outline-none disabled:opacity-50"
                >
                  {furnizori.materiale.length === 0 ? (
                    <option value="">—</option>
                  ) : (
                    furnizori.materiale.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))
                  )}
                </select>
                <div className="flex justify-center items-center">
                  <Checkbox className="w-5 h-5 shrink-0" checked={applyMateriale} onCheckedChange={(checked) => setApplyMateriale(checked === true)} />
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-md border bg-muted/10 px-4 py-3 transition-colors hover:bg-accent">
            <div className="grid gap-1 flex-1 min-w-0">
              <span className="text-base font-bold text-foreground">Utilaje</span>
              <div className="grid grid-cols-[1fr_auto] gap-2 justify-center  flex-1 ">
                <select
                  disabled={!applyUtilaje || loading || furnizori.utilaje.length === 0}
                  value={utilajFurnizor}
                  onChange={(e) => setUtilajFurnizor(e.target.value)}
                  className="h-10 rounded-md border bg-background px-3 text-sm font-bold outline-none disabled:opacity-50"
                >
                  {furnizori.utilaje.length === 0 ? (
                    <option value="">—</option>
                  ) : (
                    furnizori.utilaje.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))
                  )}
                </select>
                <div className="flex justify-center items-center">
                  <Checkbox className="w-5 h-5 shrink-0" checked={applyUtilaje} onCheckedChange={(checked) => setApplyUtilaje(checked === true)} />
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-3 xl:col-span-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex items-center justify-center gap-3 rounded-md border bg-muted/10 px-4 py-3 hover:bg-accent transition-colors cursor-pointer">
                <Checkbox className="w-5 h-5" checked={rewriteCost} onCheckedChange={(checked) => setRewriteCost(checked === true)} />
                <span className="text-sm font-black text-foreground">Rescrie Cost</span>
              </label>

              <label className="flex items-center justify-center gap-3 rounded-md border bg-muted/10 px-4 py-3 hover:bg-accent transition-colors cursor-pointer">
                <Checkbox className="w-5 h-5" checked={rewriteQuantity} onCheckedChange={(checked) => setRewriteQuantity(checked === true)} />
                <span className="text-sm font-black text-foreground">Rescrie Qty</span>
              </label>
            </div>

            <div className="rounded-md border bg-muted/30 px-4 py-3 text-sm text-muted-foreground leading-relaxed">
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  <span className="font-black text-foreground">Rescrie Cost</span>: ia costurile din varianta furnizorului selectat. Nebifat păstrează costurile curente.
                </li>
                <li>
                  <span className="font-black text-foreground">Rescrie Qty</span>: ia cantitățile din varianta furnizorului selectat. Nebifat păstrează cantitățile curente.
                </li>
              </ul>
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-3 sm:justify-end w-full border-t bg-muted/20 px-6 py-4">
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
