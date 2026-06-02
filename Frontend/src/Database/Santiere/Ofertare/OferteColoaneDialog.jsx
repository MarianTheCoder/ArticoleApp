// src/components/Ofertare/OferteColoaneDialog.jsx
import React, { useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faColumns, faPlus, faTrash, faCheck } from "@fortawesome/free-solid-svg-icons";

import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import OverflowTooltip from "@/components/ui/OverflowTooltip";

// SCHIMBĂ PATH-UL DOAR DACĂ LA TINE SE NUMEȘTE ALTFEL
import WarningDialog from "@/components/ui/warning-dialog";

const MAX_COLUMNS = 5;
const MAX_COLUMN_NAME_LENGTH = 64;

const makeColumnId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `col_${Date.now()}_${Math.random().toString(16).slice(2)}`;
};

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
    .map((col) => {
      if (typeof col === "string") {
        return {
          id: makeColumnId(),
          name: col,
        };
      }

      return {
        id: col.id || makeColumnId(),
        name: col.name || col.nume || col.label || "",
      };
    })
    .slice(0, MAX_COLUMNS);
};

const cleanColumns = (value) => {
  return normalizeColumns(value).map((col) => ({
    id: col.id,
    name: String(col.name || "").trim(),
  }));
};

const columnsAreEqual = (a, b) => {
  const cleanA = cleanColumns(a);
  const cleanB = cleanColumns(b);

  if (cleanA.length !== cleanB.length) return false;

  return cleanA.every((col, index) => {
    const other = cleanB[index];
    return col.id === other.id && col.name === other.name;
  });
};

export default function OferteColoaneDialog({ open, setOpen, selectedLucrare, onSave }) {
  const [columns, setColumns] = useState([]);
  const [initialColumns, setInitialColumns] = useState([]);

  const [warningOpen, setWarningOpen] = useState(false);
  const [pendingSaveColumns, setPendingSaveColumns] = useState(null);

  useEffect(() => {
    if (!open) return;

    const normalized = normalizeColumns(selectedLucrare?.coloane_config);

    setColumns(normalized);
    setInitialColumns(normalized);
    setPendingSaveColumns(null);
    setWarningOpen(false);
  }, [open, selectedLucrare?.id, selectedLucrare?.coloane_config]);

  const hadColumnsBefore = initialColumns.length > 0;

  const hasChanges = useMemo(() => {
    return !columnsAreEqual(initialColumns, columns);
  }, [initialColumns, columns]);

  const addColumn = () => {
    if (columns.length >= MAX_COLUMNS) {
      toast.warning(`Poți avea maximum ${MAX_COLUMNS} coloane.`);
      return;
    }

    setColumns((prev) => [
      ...prev,
      {
        id: makeColumnId(),
        name: "",
      },
    ]);
  };

  const updateColumn = (id, name) => {
    setColumns((prev) => prev.map((col) => (col.id === id ? { ...col, name } : col)));
  };

  const deleteColumn = (id) => {
    setColumns((prev) => prev.filter((col) => col.id !== id));
  };

  const validateColumns = (cleaned) => {
    if (cleaned.some((col) => !col.name)) {
      toast.warning("Toate coloanele trebuie să aibă nume.");
      return false;
    }

    const names = cleaned.map((col) => col.name.toLowerCase());
    const hasDuplicates = names.some((name, index) => names.indexOf(name) !== index);

    if (hasDuplicates) {
      toast.warning("Ai două coloane cu același nume.");
      return false;
    }

    return true;
  };

  const commitSave = (cleaned) => {
    onSave?.(cleaned);
    setOpen(false);
    setWarningOpen(false);
    setPendingSaveColumns(null);
  };

  const handleSave = () => {
    const cleaned = columns.map((col) => ({
      id: col.id,
      name: col.name.trim(),
    }));

    if (!validateColumns(cleaned)) return;

    if (!hasChanges) {
      setOpen(false);
      return;
    }

    if (hadColumnsBefore) {
      setPendingSaveColumns(cleaned);
      setWarningOpen(true);
      return;
    }

    commitSave(cleaned);
  };

  const handleConfirmWarning = () => {
    if (!pendingSaveColumns) return;
    commitSave(pendingSaveColumns);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[42rem] p-0 gap-0 ">
          <DialogHeader className="px-6 py-4 rounded-t-lg border-b bg-muted">
            <div className="flex items-center w-3/4  gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-11 w-11 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  <FontAwesomeIcon icon={faColumns} className="text-primary text-lg" />
                </div>

                <div className="min-w-0 flex-1">
                  <DialogTitle className="text-left text-lg leading-tight">Coloane lucrare</DialogTitle>

                  <div className="mt-1 min-w-0 max-w-full overflow-hidden">
                    <OverflowTooltip
                      text={selectedLucrare?.nume || "—"}
                      align="left"
                      className="block w-full text-left text-sm text-muted-foreground font-medium overflow-hidden text-ellipsis whitespace-nowrap"
                      maxLines={1}
                    />
                  </div>
                </div>
              </div>
            </div>
          </DialogHeader>

          <div className="px-6 py-5 flex flex-col gap-3 max-h-[60vh] overflow-y-auto">
            {columns.length === 0 ? (
              <div className="min-h-[5rem] rounded-lg  p-5 flex items-center justify-center text-center">
                <span className="text-sm flex items-center gap-2 text-muted-foreground">
                  <FontAwesomeIcon className="text-xl" icon={faColumns} />
                  <span className="">Nu există coloane configurate.</span>
                </span>
              </div>
            ) : (
              <div className="flex justify-center min-h-[5rem] flex-col gap-2">
                {columns.map((col, index) => (
                  <div key={col.id} className="grid grid-cols-[2.75rem_minmax(0,1fr)_2.25rem] items-center gap-2 rounded-lg border bg-card p-2">
                    <Badge variant="outline" className="h-9 w-9 justify-center shrink-0 bg-background">
                      {index + 1}
                    </Badge>

                    <Input
                      value={col.name}
                      onChange={(e) => updateColumn(col.id, e.target.value.slice(0, MAX_COLUMN_NAME_LENGTH))}
                      placeholder="Ex: Reper, Etaj, Clădire..."
                      maxLength={MAX_COLUMN_NAME_LENGTH}
                      className="h-9 min-w-0"
                      autoFocus={index === columns.length - 1 && !col.name}
                    />

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteColumn(col.id)}
                      className="h-9 w-9 shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                      title="Șterge coloana"
                    >
                      <FontAwesomeIcon icon={faTrash} />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <Button type="button" variant="outline" onClick={addColumn} disabled={columns.length >= MAX_COLUMNS} className="gap-2 w-full h-10">
              <FontAwesomeIcon icon={faPlus} />
              Adaugă coloană
            </Button>
          </div>

          <DialogFooter className="px-6 py-4 border-t bg-muted/10">
            <div className="flex w-full items-center justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Anulează
              </Button>

              <Button type="button" onClick={handleSave} className="gap-2">
                <FontAwesomeIcon icon={faCheck} />
                Salvează
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <WarningDialog
        open={warningOpen}
        setOpen={setWarningOpen}
        title="Confirmă modificarea coloanelor"
        description="Ai modificat coloanele acestei lucrări. Dacă salvezi, structura coloanelor se va actualiza pentru această lucrare."
        onSubmit={handleConfirmWarning}
        useCode={false}
      />
    </>
  );
}
