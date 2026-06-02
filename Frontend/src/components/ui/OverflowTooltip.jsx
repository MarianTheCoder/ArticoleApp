import { Tooltip, TooltipContent, TooltipTrigger, TooltipArrow } from "@radix-ui/react-tooltip";
import { useEffect, useRef, useState } from "react";

const OVERFLOW_TOLERANCE = 1;

// --- OVERFLOW TOOLTIP OPTIMIZAT PENTRU PERFORMANȚĂ ---
export default function OverflowTooltip({ text, className, maxLines = 2, align = "center", textSize = "base" }) {
  const textRef = useRef(null);
  const [isOverflow, setIsOverflow] = useState(false);

  useEffect(() => {
    const el = textRef.current;
    if (!el) return;

    const checkOverflow = () => {
      const hasHorizontalOverflow = el.scrollWidth - el.clientWidth > OVERFLOW_TOLERANCE;
      const hasVerticalOverflow = el.scrollHeight - el.clientHeight > OVERFLOW_TOLERANCE;
      const hasOverflow = maxLines === 1 ? hasHorizontalOverflow : hasHorizontalOverflow || hasVerticalOverflow;

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
  }, [maxLines, text]); // isOverflow NU se pune în array-ul de dependențe

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
        <TooltipContent
          className={`xxxl:max-w-[40rem] lg:max-w-[30rem] max-w-[20rem] text-${textSize} whitespace-pre-wrap break-words rounded-md  z-[100] bg-popover border-2 border-border text-popover-foreground shadow-md p-1 xl:p-2`}
        >
          <TooltipArrow width={15} height={10} className="fill-border" />
          {text}
        </TooltipContent>
      )}
    </Tooltip>
  );
}
