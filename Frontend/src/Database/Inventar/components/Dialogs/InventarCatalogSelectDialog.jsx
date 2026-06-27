import React, { useCallback, useEffect, useRef, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBan, faCheck, faXmark } from "@fortawesome/free-solid-svg-icons";

import { Separator } from "@/components/ui/separator";
import CatalogMainPage from "@/Database/Catalog/CatalogMainPage";
import { resurseConfig } from "@/Database/Catalog/resurseConfig";

export default function InventarCatalogSelectDialog({ open, setOpen, tipResursa, lockedLang, onConfirm, variantOnly = false, contextTypeLabel = "inventarul", contextName = "" }) {
  const config = resurseConfig[tipResursa];
  const [selectedKeys, setSelectedKeys] = useState([]);
  const [selectedItemsByKey, setSelectedItemsByKey] = useState({});
  const lastSelectedKeyRef = useRef(null);

  useEffect(() => {
    if (open) {
      setSelectedKeys([]);
      setSelectedItemsByKey({});
      lastSelectedKeyRef.current = null;
    }
  }, [open]);

  const resetSelection = useCallback(() => {
    setSelectedKeys([]);
    setSelectedItemsByKey({});
    lastSelectedKeyRef.current = null;
  }, []);

  const handleSelectElement = useCallback(
    (item, event, visibleItems = []) => {
      const itemKey = String(item?.id || "");
      if (!itemKey) return;

      event?.preventDefault?.();

      const isRange = Boolean(event?.shiftKey);
      const orderedKeys = (visibleItems || []).map((row) => String(row?.id || "")).filter(Boolean);
      const visibleByKey = new Map((visibleItems || []).map((row) => [String(row?.id || ""), row]).filter(([key]) => key));
      const itemIsVariant = Boolean(item.__sub);
      if (variantOnly && !itemIsVariant) return;

      setSelectedKeys((prev) => {
        const prevKind = prev.length > 0 ? Boolean(selectedItemsByKey[prev[0]]?.__sub) : itemIsVariant;
        const basePrev = prevKind === itemIsVariant ? prev : [];

        if (isRange) {
          const anchorKey = lastSelectedKeyRef.current || basePrev[0] || itemKey;
          const startIndex = orderedKeys.indexOf(String(anchorKey));
          const endIndex = orderedKeys.indexOf(itemKey);

          if (startIndex !== -1 && endIndex !== -1) {
            const [from, to] = startIndex < endIndex ? [startIndex, endIndex] : [endIndex, startIndex];
            const rangeKeys = orderedKeys.slice(from, to + 1);

            setSelectedItemsByKey((current) => {
              const next = prevKind === itemIsVariant ? { ...current } : {};
              rangeKeys.forEach((key) => {
                if (visibleByKey.has(key)) next[key] = visibleByKey.get(key);
              });
              return next;
            });

            return [...new Set([...basePrev, ...rangeKeys])];
          }

          setSelectedItemsByKey((current) => (prevKind === itemIsVariant ? { ...current, [itemKey]: item } : { [itemKey]: item }));
          return [...new Set([...basePrev, itemKey])];
        }

        lastSelectedKeyRef.current = itemKey;
        if (basePrev.includes(itemKey)) {
          setSelectedItemsByKey((current) => {
            const next = { ...current };
            delete next[itemKey];
            return next;
          });
          return basePrev.filter((key) => key !== itemKey);
        }

        setSelectedItemsByKey((current) => (prevKind === itemIsVariant ? { ...current, [itemKey]: item } : { [itemKey]: item }));
        return [...basePrev, itemKey];
      });
    },
    [selectedItemsByKey, variantOnly],
  );

  const handleConfirm = async () => {
    if (selectedKeys.length === 0) return;
    const selectedItems = selectedKeys.map((key) => selectedItemsByKey[key]).filter(Boolean);
    const hasVariants = selectedItems.some((item) => item.__sub);
    const ids = hasVariants
      ? selectedItems.map((item) => Number(item.__sub?.id)).filter((id) => Number.isInteger(id) && id > 0)
      : selectedItems.map((item) => Number(item.id)).filter((id) => Number.isInteger(id) && id > 0);

    const result = await onConfirm({
      mode: hasVariants ? "variante" : "definitii",
      ids,
      items: selectedItems,
    });
    if (result?.keepOpen) return;
    setOpen(false);
  };

  const selectedKindLabel = selectedKeys.length > 0 && selectedKeys.some((key) => selectedItemsByKey[key]?.__sub) ? "variante" : "definiții";
  const selectedLabel = selectedKeys.length > 0 ? `${selectedKeys.length} ${selectedKindLabel} selectate` : "";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-[90vw] select-none blur-none h-[95vh] rounded-md p-0 gap-0 flex flex-col outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0">
        <div data-catalog-selection-keep className="flex shrink-0 items-center justify-between gap-3 rounded-t-md border-b border-border bg-card py-3 pl-4 pr-14">
          <div className="flex min-w-0 items-center gap-3">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md border ${config.bgClass} ${config.colorClass}`}>
              <FontAwesomeIcon icon={config.icon} className="text-lg" />
            </div>
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2">
                <h2 className="shrink-0 text-sm font-bold text-foreground">
                  Adaugă {config.title.toLowerCase()} în {contextTypeLabel}
                </h2>
                {contextName ? (
                  <>
                    <Separator orientation="vertical" className="h-5 w-0.5" />
                    <span className="min-w-0 truncate text-sm font-black text-foreground">{contextName}</span>
                  </>
                ) : null}
              </div>
              <p className="truncate text-sm font-medium text-muted-foreground">Selectează din catalog</p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {selectedKeys.length > 0 && (
              <>
                <div className="flex h-9 items-center rounded-md border border-primary/40 bg-primary/10 px-3 text-sm font-bold text-primary">{selectedLabel}</div>
                <Button type="button" variant="destructive" className="h-9 gap-2 px-3 text-sm font-semibold" onClick={resetSelection}>
                  <FontAwesomeIcon icon={faBan} className="text-sm" />
                  Anulează selecția
                </Button>
              </>
            )}
            <Button type="button" variant="outline" className="h-9 gap-2 px-3 text-sm font-semibold" onClick={() => setOpen(false)}>
              <FontAwesomeIcon icon={faXmark} className="text-sm" />
              Anulează
            </Button>
            <Button type="button" className={`h-9 gap-2 px-3 text-sm font-semibold text-white ${config.hoverButton}`} disabled={selectedKeys.length === 0} onClick={handleConfirm}>
              <FontAwesomeIcon icon={faCheck} className="text-sm" />
              Adaugă selectate
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          {open && (
            <CatalogMainPage
              tipResursa={tipResursa}
              isSelectionMode
              allowSelectionViewMode
              initialViewMode={variantOnly ? "variante" : null}
              selectedItemIds={selectedKeys}
              selectedCount={0}
              selectedLabel=""
              onClearSelection={resetSelection}
              onConfirmSelection={handleConfirm}
              lockedLang={lockedLang}
              onSelectElement={handleSelectElement}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
