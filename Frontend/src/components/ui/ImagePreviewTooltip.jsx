import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger, TooltipArrow } from "@radix-ui/react-tooltip";
import React, { useState } from "react";

export default function ImagePreviewTooltip({
  src,
  alt = "Imagine",
  fallback,
  containerClassName = "h-11 w-11 mx-auto rounded-md border border-border bg-muted flex items-center justify-center overflow-hidden shrink-0",
  previewMaxHeight = "max-h-[30rem]",
  previewMaxWidth = "max-w-[30rem]",
  ringColor = "hover:ring-emerald-500",
}) {
  const [isOpen, setIsOpen] = useState(false);

  if (!src) {
    return (
      <div
        className={containerClassName}
        onContextMenu={(e) => e.stopPropagation()} // Oprim click-ul dreapta și pentru fallback
      >
        {fallback}
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip open={isOpen} onOpenChange={setIsOpen}>
        <TooltipTrigger asChild>
          <div
            className={`${containerClassName} cursor-pointer hover:ring-2 ${ringColor} transition-all`}
            onContextMenu={(e) => {
              e.stopPropagation(); // 1. Lasă meniul nativ (Chrome) să apară, blochează meniul tabelului
              setIsOpen(false); // 2. Închide forțat previzualizarea imaginii mari
            }}
          >
            <img loading="lazy" src={src} alt={alt} className="h-full w-full object-cover" />
          </div>
        </TooltipTrigger>

        <TooltipContent
          side="right"
          align="center"
          sideOffset={8}
          className="p-1 z-[100] bg-background border-2 border-border shadow-2xl rounded-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
        >
          <TooltipArrow width={15} height={10} className="fill-border" />
          <img loading="lazy" src={src} alt={`Preview ${alt}`} className={`${previewMaxWidth} ${previewMaxHeight} object-contain rounded-sm`} />
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
