import React, { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagnifyingGlass, faPenToSquare, faPlus, faSave, faTrash, faXmark } from "@fortawesome/free-solid-svg-icons";
import { toast } from "sonner";

import { useBulkSaveCatalogMeta, useCatalogMeta } from "@/hooks/Database/useCatalog";
import { useLoading } from "@/context/LoadingContext";

const LABELS = {
  furnizori: {
    title: "Furnizori",
    singular: "furnizor",
    placeholder: "Denumire furnizor",
  },
  marci: {
    title: "Mărci",
    singular: "marcă",
    placeholder: "Denumire marcă",
  },
};

export default function CatalogMetaDialog({ type, open, setOpen }) {
  const { show, hide } = useLoading();
  const labels = LABELS[type] || LABELS.furnizori;
  const { data, isFetching, refetch } = useCatalogMeta(type);
  const { mutateAsync: bulkSave } = useBulkSaveCatalogMeta();
  const initializedOpenRef = useRef(false);
  const initializedHasDataRef = useRef(false);
  const initializedTypeRef = useRef(null);
  const [items, setItems] = useState([]);
  const [deletedIds, setDeletedIds] = useState([]);
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [addValue, setAddValue] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [editSnapshot, setEditSnapshot] = useState(null);

  useEffect(() => {
    if (!open) {
      initializedOpenRef.current = false;
      initializedHasDataRef.current = false;
      initializedTypeRef.current = null;
      return;
    }

    const hasServerItems = Array.isArray(data?.items);
    const shouldInitialize = !initializedOpenRef.current || initializedTypeRef.current !== type || (!initializedHasDataRef.current && hasServerItems);

    if (!shouldInitialize) return;

    setItems((data?.items || []).map((item) => ({ ...item, _isNew: false, _dirty: false })));
    setDeletedIds([]);
    setSearch("");
    setSearchDebounced("");
    setAddValue("");
    setEditMode(false);
    setEditSnapshot(null);
    initializedOpenRef.current = true;
    initializedHasDataRef.current = hasServerItems;
    initializedTypeRef.current = type;
  }, [data, open, type]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchDebounced(search);
    }, 500);

    return () => clearTimeout(handler);
  }, [search]);

  const visibleItems = useMemo(() => {
    const needle = searchDebounced.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((item) => String(item.denumire || "").toLowerCase().includes(needle));
  }, [items, searchDebounced]);

  const hasChanges = useMemo(() => items.some((item) => item._isNew || item._dirty) || deletedIds.length > 0, [deletedIds.length, items]);

  const handleAdd = () => {
    const denumire = addValue.trim();
    if (!denumire) return;

    setItems((prev) => [{ id: `new-${Date.now()}`, denumire, _isNew: true, _dirty: true }, ...prev]);
    setAddValue("");
  };

  const handleChange = (id, value) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, denumire: value, _dirty: true } : item)));
  };

  const handleDelete = (item) => {
    setItems((prev) => prev.filter((row) => row.id !== item.id));
    if (!item._isNew) {
      setDeletedIds((prev) => (prev.includes(item.id) ? prev : [...prev, item.id]));
    }
  };

  const enterEditMode = () => {
    setEditSnapshot({
      items,
      deletedIds,
    });
    setEditMode(true);
  };

  const cancelEditMode = () => {
    if (editSnapshot) {
      setItems(editSnapshot.items);
      setDeletedIds(editSnapshot.deletedIds);
    }

    setEditMode(false);
    setEditSnapshot(null);
  };

  const handleSave = async () => {
    const payloadItems = items
      .map((item) => ({
        id: item._isNew ? null : item.id,
        denumire: String(item.denumire || "").trim(),
      }))
      .filter((item) => item.denumire);

    show();
    try {
      await bulkSave({ type, items: payloadItems, deletedIds });
      const refreshed = await refetch();
      const freshItems = (refreshed?.data?.items || []).map((item) => ({ ...item, _isNew: false, _dirty: false }));

      setItems(freshItems);
      setDeletedIds([]);
      setAddValue("");
      setEditMode(false);
      setEditSnapshot(null);

      toast.success(`${labels.title} salvate.`, { position: "top-right" });
    } catch (error) {
      toast.error(error?.response?.data?.message || `Eroare la salvarea listei de ${labels.title.toLowerCase()}.`, { position: "top-right" });
    } finally {
      hide();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[36rem] p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-4 xxxl:px-5 py-3 xxxl:py-4 border-b bg-muted">
          <DialogTitle className="text-base xxxl:text-lg font-bold">{labels.title}</DialogTitle>
        </DialogHeader>

        <div className="p-4 xxxl:p-5 flex flex-col gap-3 xxxl:gap-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <FontAwesomeIcon icon={faMagnifyingGlass} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Caută..." className="h-9 pl-8" />
            </div>
            {editMode ? <span className="flex h-9 items-center rounded-md border border-primary/40 bg-primary/10 px-2.5 text-xs font-bold text-primary">Editare</span> : null}
          </div>

          <Separator />

          <div className="flex items-center gap-2">
            <Input
              value={addValue}
              onChange={(event) => setAddValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleAdd();
                }
              }}
              placeholder={labels.placeholder}
              className="h-9"
            />
            <Button type="button" onClick={handleAdd} className="h-9 gap-2" disabled={!addValue.trim()}>
              <FontAwesomeIcon icon={faPlus} />
              Adaugă
            </Button>
          </div>

          <div className="max-h-[24rem] overflow-auto rounded-md border">
            {visibleItems.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">{isFetching ? "Se încarcă..." : `Nu există ${labels.title.toLowerCase()}.`}</div>
            ) : (
              visibleItems.map((item) => (
                <ContextMenu key={item.id}>
                  <ContextMenuTrigger asChild>
                    <div className="border-b last:border-b-0 p-2 transition-colors hover:bg-accent">
                      <Input
                        value={item.denumire || ""}
                        onChange={(event) => handleChange(item.id, event.target.value)}
                        readOnly={!editMode}
                        placeholder={labels.placeholder}
                        className={`h-8 border-0 bg-transparent px-1 text-sm shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 ${editMode ? "font-black text-foreground" : "font-normal text-foreground"}`}
                      />
                    </div>
                  </ContextMenuTrigger>
                  <ContextMenuContent className="w-40">
                    {!editMode ? (
                      <ContextMenuItem className="gap-2" onClick={enterEditMode}>
                        <FontAwesomeIcon icon={faPenToSquare} className="text-low" />
                        Editează
                      </ContextMenuItem>
                    ) : null}
                    <ContextMenuItem className="gap-2 text-destructive focus:text-destructive" onClick={() => handleDelete(item)}>
                      <FontAwesomeIcon icon={faTrash} />
                      Șterge
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              ))
            )}
          </div>
        </div>

        <div className="border-t bg-muted/30 px-4 xxxl:px-5 py-3 flex justify-end gap-2">
          {editMode ? (
            <>
              <Button type="button" variant="outline" onClick={cancelEditMode} className="gap-2">
                <FontAwesomeIcon icon={faXmark} />
                Anulează edit
              </Button>
              <Button type="button" onClick={handleSave} disabled={!hasChanges} className="gap-2 bg-blue-600 text-white hover:bg-blue-700">
                <FontAwesomeIcon icon={faSave} />
                Salvează editările
              </Button>
            </>
          ) : (
            <>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Anulează
              </Button>
              <Button type="button" onClick={handleSave} disabled={!hasChanges} className="gap-2">
                <FontAwesomeIcon icon={faSave} />
                Salvează
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
