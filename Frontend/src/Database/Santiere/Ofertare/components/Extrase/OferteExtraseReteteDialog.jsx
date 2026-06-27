import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBoxOpen } from "@fortawesome/free-solid-svg-icons";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import OverflowTooltip from "@/components/ui/OverflowTooltip";
import { resurseConfig } from "@/Database/Catalog/resurseConfig";
import { cn } from "@/lib/utils";
import OferteReteteList from "../../OferteReteteList";

const EMPTY = "—";

export default function OferteExtraseReteteDialog({ open, setOpen, selectedRow, reteteItems = [], listProps = {} }) {
  const config = resurseConfig[selectedRow?.tipResursa] || resurseConfig.material;
  const subtitle = selectedRow?.cod || "";
  const reteteCount = reteteItems.length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="flex h-[88vh] max-w-[96vw] flex-col gap-0 p-0" style={{ animationDuration: "0ms", transitionDuration: "0ms" }}>
        <DialogHeader className="shrink-0 border-b bg-muted px-4 py-3">
          <div className="flex min-w-0 items-center justify-between gap-3 pr-10">
            <div className="flex max-w-[50%] min-w-0 items-center gap-3">
              <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border", config.bgClass)}>
                <FontAwesomeIcon icon={config.icon || faBoxOpen} className={cn("text-lg", config.colorClass)} />
              </div>

              <DialogTitle className="min-w-0 text-left">
                <OverflowTooltip text={selectedRow?.denumire || EMPTY} align="left" className="text-base font-black text-foreground" maxLines={1} />
                {subtitle && <OverflowTooltip text={subtitle} align="left" className="mt-0.5 min-w-0 truncate text-xs font-semibold text-muted-foreground" maxLines={1} />}
              </DialogTitle>
            </div>

            <div className="flex h-9 shrink-0 items-center justify-center rounded-md border border-primary bg-primary/20 px-3.5 text-sm font-black text-primary xxxl:text-base">
              {reteteCount} {reteteCount === 1 ? "rețetă" : "rețete"}
            </div>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 bg-muted/10 p-2">
          <OferteReteteList {...listProps} reteteItems={reteteItems} searchQuery="" />
        </div>
      </DialogContent>
    </Dialog>
  );
}
