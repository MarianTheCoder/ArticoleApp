import React, { useCallback, useEffect, useRef, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faXmark } from "@fortawesome/free-solid-svg-icons";

import CatalogMainPage from "@/Database/Catalog/CatalogMainPage";
import { resurseConfig } from "@/Database/Catalog/resurseConfig";

export default function InventarCatalogSelectDialog({ open, setOpen, tipResursa, lockedLang, onConfirm }) {
  const config = resurseConfig[tipResursa];
  const [selectedIds, setSelectedIds] = useState([]);
  const lastSelectedIdRef = useRef(null);

  useEffect(() => {
    if (open) {
      setSelectedIds([]);
      lastSelectedIdRef.current = null;
    }
  }, [open]);

  const resetSelection = useCallback(() => {
    setSelectedIds([]);
    lastSelectedIdRef.current = null;
  }, []);

  const handleDialogPointerDownCapture = useCallback(
    (event) => {
      if (!selectedIds.length) return;

      const target = event.target;
      if (target.closest("[data-catalog-selection-table], [data-catalog-selection-keep]")) return;

      resetSelection();
    },
    [resetSelection, selectedIds.length],
  );

  const handleSelectElement = useCallback((item, event, visibleItems = []) => {
    const itemId = Number(item.id);
    if (!Number.isInteger(itemId) || itemId <= 0) return;

    event?.preventDefault?.();

    const isMultiToggle = Boolean(event?.ctrlKey || event?.metaKey);
    const isRange = Boolean(event?.shiftKey);
    const orderedIds = (visibleItems || []).map((row) => Number(row.id)).filter((id) => Number.isInteger(id) && id > 0);

    setSelectedIds((prev) => {
      if (isRange) {
        const anchorId = lastSelectedIdRef.current || prev[0] || itemId;
        const startIndex = orderedIds.indexOf(Number(anchorId));
        const endIndex = orderedIds.indexOf(itemId);

        if (startIndex !== -1 && endIndex !== -1) {
          const [from, to] = startIndex < endIndex ? [startIndex, endIndex] : [endIndex, startIndex];
          const rangeIds = orderedIds.slice(from, to + 1);
          return [...new Set([...prev, ...rangeIds])];
        }

        return [...new Set([...prev, itemId])];
      }

      if (isMultiToggle) {
        lastSelectedIdRef.current = itemId;
        return prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId];
      }

      lastSelectedIdRef.current = itemId;
      return [itemId];
    });
  }, []);

  const handleConfirm = async () => {
    if (selectedIds.length === 0) return;
    await onConfirm(selectedIds);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        onPointerDownCapture={handleDialogPointerDownCapture}
        className="max-w-[90vw] select-none blur-none h-[95vh] rounded-md p-0 gap-0 flex flex-col outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0"
      >
        <div className="flex-1 overflow-hidden">
          {open && <CatalogMainPage tipResursa={tipResursa} isSelectionMode selectedItemIds={selectedIds} lockedLang={lockedLang} onSelectElement={handleSelectElement} />}
        </div>

        <div data-catalog-selection-keep className="bg-muted rounded-b-md px-3 xxxl:px-4 border-t border-border shrink-0 flex items-center justify-between gap-4 xxxl:gap-6">
          <div className="flex h-20 xxxl:h-24 items-center min-w-0 py-3 xxxl:py-4">
            <span className="text-sm xxxl:text-base font-semibold text-foreground">
              {selectedIds.length > 0 ? `${selectedIds.length} selectate` : `Selectează ${config.titlePlural.toLowerCase()} din tabel...`}
            </span>
          </div>

          <div className="flex items-center py-3 xxxl:py-4 gap-3 xxxl:gap-4 shrink-0">
            <Button type="button" variant="outline" className="gap-2" onClick={() => setOpen(false)}>
              <FontAwesomeIcon icon={faXmark} />
              Anulează
            </Button>
            <Button type="button" className={`gap-2 text-white ${config.hoverButton}`} disabled={selectedIds.length === 0} onClick={handleConfirm}>
              <FontAwesomeIcon icon={faCheck} />
              Adaugă selectate
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
