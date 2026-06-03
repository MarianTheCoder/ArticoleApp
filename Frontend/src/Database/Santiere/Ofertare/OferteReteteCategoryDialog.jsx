import React, { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLayerGroup, faXmark } from "@fortawesome/free-solid-svg-icons";

import { buildAvailableCategoryFields, CATEGORY_LEVEL_COUNT, normalizeCategoryConfig } from "./helpers/OferteReteteHelpers";

export default function OferteReteteCategoryDialog({ open, setOpen, dynamicColumns = [], value = [], onChange }) {
  const availableFields = useMemo(() => buildAvailableCategoryFields(dynamicColumns), [dynamicColumns]);
  const [draftConfig, setDraftConfig] = useState(() => normalizeCategoryConfig(value, availableFields));

  useEffect(() => {
    if (!open) return;

    setDraftConfig(normalizeCategoryConfig(value, availableFields));
  }, [availableFields, open, value]);

  const selectedKeys = useMemo(() => new Set(draftConfig.filter(Boolean)), [draftConfig]);
  const activeCount = draftConfig.filter(Boolean).length;

  const updateLevel = (levelIndex, fieldKey) => {
    setDraftConfig((prev) => {
      const next = normalizeCategoryConfig(prev, availableFields);
      next[levelIndex] = fieldKey || "";
      return normalizeCategoryConfig(next, availableFields);
    });
  };

  const clearLevel = (levelIndex) => {
    updateLevel(levelIndex, "");
  };

  const handleApply = () => {
    onChange?.(normalizeCategoryConfig(draftConfig, availableFields));
    setOpen(false);
  };

  const handleClearAll = () => {
    const cleared = Array.from({ length: CATEGORY_LEVEL_COUNT }, () => "");
    setDraftConfig(cleared);
  };

  return (
    <Dialog open={!!open} onOpenChange={setOpen}>
      <DialogContent className="keepSelection sm:max-w-3xl p-0 gap-0 overflow-hidden border shadow-2xl">
        <DialogHeader className="px-6 py-4 border-b bg-muted">
          <div className="flex items-center gap-4 min-w-0">
            <div className="h-14 w-14 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0">
              <FontAwesomeIcon icon={faLayerGroup} className="text-primary text-2xl" />
            </div>

            <div className="grid gap-1 min-w-0 text-left">
              <DialogTitle className="text-xl font-black text-foreground">Categorii rețete</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
                Alege câmpul folosit pe fiecare nivel. Nivelul 1 este categoria principală, iar nivelurile următoare sunt subcategorii.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="grid gap-2 bg-card p-4">
          {Array.from({ length: CATEGORY_LEVEL_COUNT }, (_, levelIndex) => {
            const selectedKey = draftConfig[levelIndex] || "";

            return (
              <div key={levelIndex} className="grid grid-cols-[5.5rem_minmax(0,1fr)_2rem] items-center gap-3 rounded-md border bg-muted/10 p-3">
                <div className="grid gap-0.5">
                  <span className="text-sm font-black text-foreground">Nivel {levelIndex + 1}</span>
                  <span className="text-xs font-semibold text-muted-foreground">{selectedKey ? "Activ" : "Gol"}</span>
                </div>

                <select
                  value={selectedKey}
                  onChange={(e) => updateLevel(levelIndex, e.target.value)}
                  className="h-10 min-w-0 rounded-md border bg-background px-3 text-sm font-bold text-foreground outline-none"
                >
                  <option value="">Fără categorie</option>
                  {availableFields.map((field) => {
                    const unavailable = selectedKeys.has(field.key) && field.key !== selectedKey;

                    return (
                      <option key={field.key} value={field.key} disabled={unavailable}>
                        {unavailable ? `${field.label} (folosit)` : field.label}
                      </option>
                    );
                  })}
                </select>

                <Button type="button" variant="outline" className="h-8 w-8 p-0" disabled={!selectedKey} onClick={() => clearLevel(levelIndex)}>
                  <FontAwesomeIcon icon={faXmark} className="text-sm" />
                </Button>
              </div>
            );
          })}
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-3 sm:justify-between w-full border-t bg-muted/20 px-6 py-4">
          <Button type="button" variant="outline" size="lg" onClick={handleClearAll} disabled={activeCount === 0} className="text-base">
            Curăță categoriile
          </Button>

          <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
            <Button type="button" variant="outline" size="lg" onClick={() => setOpen(false)} className="text-base min-w-[7.5rem]">
              Anulează
            </Button>

            <Button type="button" variant="default" size="lg" onClick={handleApply} className="gap-2 text-base min-w-[8rem]">
              <FontAwesomeIcon icon={faLayerGroup} />
              Aplică
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
