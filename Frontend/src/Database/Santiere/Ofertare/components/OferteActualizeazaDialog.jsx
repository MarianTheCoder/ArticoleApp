import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipArrow, TooltipContent, TooltipTrigger } from "@radix-ui/react-tooltip";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faExclamationTriangle, faQuestionCircle, faScrewdriverWrench } from "@fortawesome/free-solid-svg-icons";

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
      <DialogContent className="keepSelection sm:max-w-xl p-8 gap-8 border shadow-2xl">
        <DialogHeader className="flex flex-col items-center text-center gap-2">
          <div className="mb-4">
            <div className="bg-yellow-50 dark:bg-yellow-950/40 p-5 rounded-2xl flex items-center justify-center ring-1 ring-yellow-100 dark:ring-yellow-900 shadow-sm">
              <FontAwesomeIcon icon={faExclamationTriangle} className="text-yellow-600 dark:text-yellow-400 text-5xl" />
            </div>
          </div>

          <div className="grid gap-2 w-full">
            <DialogTitle className="text-2xl font-semibold text-center text-foreground">
              Actualizează {retete.length} {retete.length === 1 ? "rețetă" : "rețete"}
            </DialogTitle>

            <DialogDescription className="text-base text-muted-foreground text-center leading-relaxed">Alege ce valori vrei să fie rescrise din rețeta originală.</DialogDescription>
          </div>
        </DialogHeader>

        <div className="grid gap-3 w-full max-w-md mx-auto">
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

        <DialogFooter className="flex flex-col sm:flex-row gap-3 sm:justify-center w-full">
          <Button type="button" variant="outline" size="lg" onClick={() => setOpen(false)} className="text-base min-w-[120px]">
            Anulează
          </Button>

          <Button
            type="button"
            variant="default"
            size="lg"
            onClick={handleConfirm}
            className="gap-2 bg-yellow-600 hover:bg-yellow-700 text-white shadow-md hover:shadow-lg transition-all text-base min-w-[150px]"
          >
            <FontAwesomeIcon icon={faScrewdriverWrench} />
            Actualizează
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
