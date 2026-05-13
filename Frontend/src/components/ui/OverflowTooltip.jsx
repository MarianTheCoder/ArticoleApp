import { Tooltip, TooltipContent, TooltipTrigger, TooltipArrow } from "@radix-ui/react-tooltip";
import { useEffect, useRef, useState } from "react";

// --- OVERFLOW TOOLTIP OPTIMIZAT PENTRU PERFORMANȚĂ ---
export default function OverflowTooltip({ text, className, maxLines = 2, align = "center" }) {
  const textRef = useRef(null);
  const [isOverflow, setIsOverflow] = useState(false);

  useEffect(() => {
    const el = textRef.current;
    if (!el) return;

    const checkOverflow = () => {
      const hasOverflow = el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth;

      // MICRO-OPTIMIZARE: Schimbăm state-ul DOAR dacă e diferit.
      // Evităm re-render-urile complet inutile când faci scroll sau resize.
      setIsOverflow((prev) => {
        if (prev !== hasOverflow) return hasOverflow;
        return prev;
      });
    };

    checkOverflow();

    const resizeObserver = new ResizeObserver(() => checkOverflow());
    resizeObserver.observe(el);

    return () => resizeObserver.disconnect();
  }, [text]); // isOverflow NU se pune în array-ul de dependențe

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          ref={textRef}
          className={`${className || ""} ${isOverflow ? "cursor-pointer" : ""}`}
          style={
            maxLines === 1
              ? {
                  display: "block",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  width: "100%",
                  textAlign: align,
                }
              : {
                  display: "-webkit-box",
                  WebkitLineClamp: maxLines,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                  width: "100%",
                  textAlign: align,
                }
          }
        >
          {text}
        </div>
      </TooltipTrigger>

      {isOverflow && (
        <TooltipContent className="xxxl:max-w-[40rem] lg:max-w-[30rem] max-w-[20rem] xl:text-base whitespace-pre-wrap break-words rounded-md text-sm z-[100] bg-popover border-2 border-border text-popover-foreground shadow-md p-2 xl:p-4">
          <TooltipArrow width={15} height={10} className="fill-border" />
          {text}
        </TooltipContent>
      )}
    </Tooltip>
  );
}
