import React from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFilePdf } from "@fortawesome/free-solid-svg-icons";

export default function OferteExportPdfDialog({ open, setOpen }) {
  return (
    <Dialog open={!!open} onOpenChange={setOpen}>
      <DialogContent className="keepSelection max-w-[92vw] sm:max-w-[72rem] h-[85vh] p-0 gap-0 overflow-hidden border shadow-2xl flex flex-col">
        <DialogHeader className="px-6 py-4 border-b bg-muted">
          <div className="flex items-center gap-4 min-w-0">
            <div className="h-14 w-14 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0">
              <FontAwesomeIcon icon={faFilePdf} className="text-primary text-2xl" />
            </div>

            <div className="grid gap-1 min-w-0 text-left">
              <DialogTitle className="text-xl font-black text-foreground">Export PDF</DialogTitle>

              <DialogDescription className="text-sm text-muted-foreground leading-relaxed">Dialog dummy momentan. Configurarea exportului PDF va fi adăugată ulterior.</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 grid-cols-[18rem_minmax(0,1fr)] bg-card">
          <aside className="border-r bg-muted/10 p-4">
            <div className="rounded-md border bg-background p-4">
              <p className="text-sm font-black uppercase tracking-wide text-muted-foreground">Opțiuni export</p>
              <p className="mt-2 text-sm font-semibold text-foreground">Placeholder pentru setările PDF.</p>
            </div>
          </aside>

          <section className="min-h-0 p-4">
            <div className="flex h-full items-center justify-center rounded-md border bg-muted/10">
              <div className="text-center">
                <FontAwesomeIcon icon={faFilePdf} className="text-4xl text-primary" />
                <p className="mt-3 text-lg font-black text-foreground">Preview PDF dummy</p>
                <p className="mt-1 text-sm font-semibold text-muted-foreground">Exportul PDF nu este implementat încă.</p>
              </div>
            </div>
          </section>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-3 sm:justify-end w-full border-t bg-muted/20 px-6 py-4">
          <Button type="button" variant="outline" onClick={() => setOpen(false)} className="min-w-[7.5rem]">
            Închide
          </Button>

          <Button type="button" className="gap-2 min-w-[9rem] text-white">
            <FontAwesomeIcon icon={faFilePdf} />
            Export PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
