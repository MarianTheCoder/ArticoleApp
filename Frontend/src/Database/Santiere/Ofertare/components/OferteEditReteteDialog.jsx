import React from "react";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck } from "@fortawesome/free-solid-svg-icons";

import OverflowTooltip from "@/components/ui/OverflowTooltip";

const normalizeDecimalInput = (value) => {
  return String(value || "").replace(".", ",");
};

export default function OferteEditRetetaDialog({ open, setOpen, retetaToEdit, dynamicColumns = [], editCantitate, setEditCantitate, editColoaneMap, setEditColoaneMap, onSave }) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[48rem] p-0 gap-0 overflow-hidden" style={{ animationDuration: "0ms", transitionDuration: "0ms" }}>
        <DialogHeader className="px-6 py-4 border-b bg-muted">
          <DialogTitle className="text-left flex flex-col gap-1 min-w-0">
            <span className="text-sm text-sky-600 font-black uppercase tracking-wider">{retetaToEdit?.cod_reteta || "—"}</span>

            <OverflowTooltip align="left" text={retetaToEdit?.denumire || "—"} maxLines={1} className="text-xl font-bold text-foreground" />
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 py-5 bg-card flex flex-col gap-5">
          {dynamicColumns.length > 0 && (
            <div className="rounded-md border bg-muted/10 p-4">
              <p className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-3">Coloane lucrare</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {dynamicColumns.map((col) => (
                  <div key={col.id} className="flex flex-col gap-1.5">
                    <Label className="font-bold text-sm text-foreground">{col.nume}</Label>

                    <Input
                      className="h-10 font-semibold bg-background"
                      value={editColoaneMap?.[col.id] || ""}
                      onChange={(e) => {
                        const value = e.target.value;

                        setEditColoaneMap((prev) => ({
                          ...prev,
                          [col.id]: value,
                        }));
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          onSave?.();
                        }
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t bg-muted/20 gap-2">
          <DialogClose asChild>
            <Button variant="outline">Anulează</Button>
          </DialogClose>

          <Button onClick={onSave} className="gap-2 bg-primary hover:bg-primary/80 text-white">
            <FontAwesomeIcon icon={faCheck} />
            Salvează
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
