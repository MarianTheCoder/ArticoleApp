import React from "react";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faFolderOpen } from "@fortawesome/free-solid-svg-icons";

import OverflowTooltip from "@/components/ui/OverflowTooltip";

const MAX_COLUMN_VALUE_LENGTH = 64;

export default function OferteEditRetetaDialog({
  open,
  setOpen,
  retetaToEdit,
  dynamicColumns = [],
  editDescriere,
  setEditDescriere,
  editDescriereFr,
  setEditDescriereFr,
  editColoaneMap,
  setEditColoaneMap,
  onSave,
}) {
  const showFrDescription = retetaToEdit?.limba === "FR" || Boolean(editDescriereFr);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[52rem] p-0 gap-0 overflow-hidden" style={{ animationDuration: "0ms", transitionDuration: "0ms" }}>
        <DialogHeader className="px-6 py-4 border-b bg-muted">
          <div className="flex items-center gap-4 min-w-0">
            <div className="h-14 w-14 rounded-xl bg-sky-600/20 border border-sky-600/25 flex items-center justify-center shrink-0">
              <FontAwesomeIcon icon={faFolderOpen} className="text-sky-600 text-2xl" />
            </div>

            <DialogTitle className="text-left flex flex-col gap-1 min-w-0">
              <span className="text-sm text-sky-600 font-black uppercase tracking-wider">{retetaToEdit?.cod_reteta || "—"}</span>

              <OverflowTooltip align="left" text={retetaToEdit?.denumire || "—"} maxLines={1} className="text-xl font-bold text-foreground" />
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="px-6 py-5 bg-card flex flex-col gap-4">
          <div className="rounded-md border bg-muted/10 p-3">
            <p className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-4">Descriere ofertă</p>

            <div className={showFrDescription ? "grid grid-cols-1 sm:grid-cols-2 gap-3" : "grid grid-cols-1 gap-3"}>
              <div className="flex flex-col gap-2 rounded-md  ">
                <div className="flex items-center gap-2">
                  <span className="rounded-md border border-cyan-500 bg-background px-2 py-1 text-sm font-black text-cyan-600">RO</span>
                  <Label className="font-bold text-sm text-foreground">Descriere RO</Label>
                </div>

                <Textarea value={editDescriere || ""} onChange={(e) => setEditDescriere(e.target.value)} className="min-h-20 resize-none bg-background text-sm leading-snug" />
              </div>

              {showFrDescription && (
                <div className="flex flex-col gap-2 rounded-md">
                  <div className="flex items-center gap-2">
                    <span className="rounded-md border border-lime-500 bg-background px-2 py-1 text-sm font-black text-lime-600">FR</span>
                    <Label className="font-bold text-sm text-foreground">Descriere FR</Label>
                  </div>

                  <Textarea value={editDescriereFr || ""} onChange={(e) => setEditDescriereFr(e.target.value)} className="min-h-20 resize-none bg-background text-sm leading-snug" />
                </div>
              )}
            </div>
          </div>

          {dynamicColumns.length > 0 && (
            <div className="rounded-md border bg-muted/10 p-4">
              <p className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-3">Coloane lucrare</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {dynamicColumns.map((col) => (
                  <div key={col.id} className="flex flex-col gap-1.5">
                    <Label className="font-bold text-sm text-foreground">{col.nume}</Label>

                    <Input
                      maxLength={MAX_COLUMN_VALUE_LENGTH}
                      className="h-10 font-semibold bg-background"
                      value={editColoaneMap?.[col.id] || ""}
                      onChange={(e) => {
                        const value = e.target.value.slice(0, MAX_COLUMN_VALUE_LENGTH);

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
