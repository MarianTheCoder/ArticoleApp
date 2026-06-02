import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipArrow, TooltipContent, TooltipTrigger } from "@radix-ui/react-tooltip";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowsRotate, faQuestionCircle } from "@fortawesome/free-solid-svg-icons";

const HeaderHelp = ({ text }) => {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex text-xs w-5 h-5 cursor-help items-center justify-center rounded-full border border-border bg-card font-black text-muted-foreground hover:text-foreground">
          <FontAwesomeIcon icon={faQuestionCircle} />
        </span>
      </TooltipTrigger>

      <TooltipContent className="whitespace-pre-wrap break-words xxxl:max-w-[40rem] font-normal lg:max-w-[30rem] max-w-[20rem] rounded-md text-sm xl:text-base z-[100] bg-popover border-2 border-border text-popover-foreground shadow-md p-2 xl:p-4">
        <TooltipArrow width={15} height={10} className="fill-border" />
        {text}
      </TooltipContent>
    </Tooltip>
  );
};

export default function OferteActualizeazaReteteDialog({ open, setOpen, retete = [], onConfirm }) {
  const [rewriteCost, setRewriteCost] = useState(false);
  const [rewriteQuantity, setRewriteQuantity] = useState(false);

  useEffect(() => {
    if (!open) return;

    setRewriteCost(false);
    setRewriteQuantity(false);
  }, [open]);

  const handleConfirm = async () => {
    await onConfirm?.({
      items: (retete || []).map((reteta) => ({
        oferta_reteta_id: reteta.id,
        original_reteta_id: reteta.original_reteta_id,
      })),
      rewrite_costs: rewriteCost,
      rewrite_quantities: rewriteQuantity,
    });
  };

  return (
    <Dialog open={!!open} onOpenChange={setOpen}>
      <DialogContent className="keepSelection sm:max-w-xl p-0 gap-0 overflow-hidden border shadow-2xl">
        <DialogHeader className="px-6 py-4 border-b bg-muted">
          <div className="flex items-center gap-4 min-w-0">
            <div className="h-14 w-14 rounded-xl bg-purple-600/15 border border-purple-600/30 flex items-center justify-center shrink-0">
              <FontAwesomeIcon icon={faArrowsRotate} className="text-purple-600 dark:text-purple-400 text-2xl" />
            </div>

            <div className="grid gap-1 min-w-0 text-left">
              <DialogTitle className="text-xl font-black text-foreground">
                Actualizează {retete.length} {retete.length === 1 ? "rețetă" : "rețete"}
              </DialogTitle>

              <DialogDescription className="text-sm text-muted-foreground leading-relaxed">Alege ce valori vrei să fie rescrise din rețeta originală.</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="grid gap-3 w-full bg-card px-6 py-5">
          <label className="flex items-center justify-between gap-4 rounded-xl border bg-card px-4 py-3 cursor-pointer hover:bg-accent transition-colors">
            <div className="flex items-center gap-2 text-left">
              <HeaderHelp text="Dacă este bifat, costurile elementelor se iau din rețeta/catalogul original actualizat. Dacă nu, se păstrează costurile snapshot din oferta curentă." />
              <span className="text-base font-semibold text-foreground">Rescrie Cost</span>
            </div>

            <Checkbox className="w-5 h-5" checked={rewriteCost} onCheckedChange={(checked) => setRewriteCost(checked === true)} />
          </label>

          <label className="flex items-center justify-between gap-4 rounded-xl border bg-card px-4 py-3 cursor-pointer hover:bg-accent transition-colors">
            <div className="flex items-center gap-2 text-left">
              <HeaderHelp text="Dacă este bifat, cantitățile elementelor din interior se iau din rețeta originală actualizată. Dacă nu, se păstrează cantitățile snapshot din oferta curentă." />
              <span className="text-base font-semibold text-foreground">Rescrie Qty</span>
            </div>

            <Checkbox className="w-5 h-5" checked={rewriteQuantity} onCheckedChange={(checked) => setRewriteQuantity(checked === true)} />
          </label>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-3 sm:justify-end w-full border-t bg-muted/20 px-6 py-4">
          <Button type="button" variant="outline" size="lg" onClick={() => setOpen(false)} className="text-base min-w-[120px]">
            Anulează
          </Button>

          <Button
            type="button"
            variant="default"
            size="lg"
            onClick={handleConfirm}
            className="gap-2 bg-purple-600 hover:bg-purple-700 text-white shadow-md hover:shadow-lg transition-all text-base min-w-[150px]"
          >
            <FontAwesomeIcon icon={faArrowsRotate} />
            Actualizează
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
