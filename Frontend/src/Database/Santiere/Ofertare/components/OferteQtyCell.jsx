import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faExclamation, faExclamationCircle, faExclamationTriangle, faX } from "@fortawesome/free-solid-svg-icons";
import { faCheckCircle, faXmarkCircle } from "@fortawesome/free-regular-svg-icons";

const MIN_FORMULA_WIDTH = 112;
const MAX_FORMULA_WIDTH = 520;

const formatNumber = (value) => {
  return parseFloat(value || 0)
    .toFixed(3)
    .replace(".", ",");
};

const cleanFormula = (value) => {
  return String(value || "").replace(/[^\d+\-*/().,\s]/g, "");
};

const round3 = (value) => Math.round((Number(value || 0) + Number.EPSILON) * 1000) / 1000;

const evalFormula = (rawValue) => {
  const expr = String(rawValue || "")
    .replace(/,/g, ".")
    .replace(/\s+/g, "");

  if (!expr) throw new Error("Formula goală.");
  if (!/^[0-9+\-*/().]+$/.test(expr)) throw new Error("Formula greșită.");

  let i = 0;

  const peek = () => expr[i];

  const eat = (char) => {
    if (expr[i] === char) {
      i += 1;
      return true;
    }

    return false;
  };

  const parseNumber = () => {
    const start = i;

    while (i < expr.length && /[0-9.]/.test(peek())) {
      i += 1;
    }

    const text = expr.slice(start, i);

    if (!text || text === "." || (text.match(/\./g) || []).length > 1) {
      throw new Error("Număr greșit.");
    }

    const value = Number(text);

    if (!Number.isFinite(value)) {
      throw new Error("Număr greșit.");
    }

    return value;
  };

  const parseFactor = () => {
    if (eat("+")) return parseFactor();
    if (eat("-")) return -parseFactor();

    if (eat("(")) {
      const value = parseExpression();

      if (!eat(")")) {
        throw new Error("Paranteză lipsă.");
      }

      return value;
    }

    return parseNumber();
  };

  const parseTerm = () => {
    let value = parseFactor();

    while (true) {
      if (eat("*")) {
        value *= parseFactor();
        continue;
      }

      if (eat("/")) {
        const divisor = parseFactor();

        if (divisor === 0) {
          throw new Error("Împărțire la 0.");
        }

        value /= divisor;
        continue;
      }

      break;
    }

    return value;
  };

  function parseExpression() {
    let value = parseTerm();

    while (true) {
      if (eat("+")) {
        value += parseTerm();
        continue;
      }

      if (eat("-")) {
        value -= parseTerm();
        continue;
      }

      break;
    }

    return value;
  }

  const result = parseExpression();

  if (i !== expr.length) {
    throw new Error("Formula greșită.");
  }

  if (!Number.isFinite(result)) {
    throw new Error("Rezultat greșit.");
  }

  return round3(result);
};

export default function OferteQtyFormulaCell({ value, formula, onSave }) {
  const [open, setOpen] = useState(false);
  const [formulaText, setFormulaText] = useState("");
  const [stepText, setStepText] = useState("1");
  const [formulaError, setFormulaError] = useState(false);
  const [formulaInputWidth, setFormulaInputWidth] = useState(MIN_FORMULA_WIDTH);

  const formulaInputRef = useRef(null);
  const measureRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    const nextFormulaText = formula || formatNumber(value);

    setFormulaText(nextFormulaText);
    setStepText("1");
    setFormulaError(false);

    requestAnimationFrame(() => {
      const input = formulaInputRef.current;
      const measure = measureRef.current;

      if (measure) {
        measure.textContent = nextFormulaText || "";

        const textWidth = measure.offsetWidth;
        const neededWidth = textWidth + 28;
        const nextWidth = neededWidth <= MIN_FORMULA_WIDTH ? MIN_FORMULA_WIDTH : Math.min(MAX_FORMULA_WIDTH, neededWidth);

        setFormulaInputWidth(nextWidth);
      } else {
        setFormulaInputWidth(MIN_FORMULA_WIDTH);
      }

      if (!input) return;

      const len = input.value.length;
      input.focus();
      input.setSelectionRange(len, len);
      input.scrollLeft = input.scrollWidth;
    });
  }, [open, formula, value]);

  useLayoutEffect(() => {
    if (!open) return;

    const input = formulaInputRef.current;
    const measure = measureRef.current;

    if (!input || !measure) return;

    const textWidth = measure.offsetWidth;
    const neededWidth = textWidth + 28;

    const nextWidth = neededWidth <= MIN_FORMULA_WIDTH ? MIN_FORMULA_WIDTH : Math.min(MAX_FORMULA_WIDTH, neededWidth);

    setFormulaInputWidth(nextWidth);

    requestAnimationFrame(() => {
      input.scrollLeft = input.scrollWidth;
    });
  }, [open, formulaText]);

  const stop = (e) => {
    e.stopPropagation();
  };

  const stopButtonKey = (e) => {
    e.stopPropagation();

    if (e.key === " ") {
      e.preventDefault();
    }
  };

  const focusFormulaEnd = () => {
    requestAnimationFrame(() => {
      const input = formulaInputRef.current;
      if (!input) return;

      const len = input.value.length;
      input.focus();
      input.setSelectionRange(len, len);
      input.scrollLeft = input.scrollWidth;
    });
  };

  const appendStep = (operator) => {
    const step = cleanFormula(stepText).trim() || "1";
    const base = formulaText.trim() || formatNumber(value);

    setFormulaText(`${base} ${operator} ${step}`);
    setFormulaError(false);
    focusFormulaEnd();
  };

  const handleSave = async () => {
    const clean = formulaText.trim() || formatNumber(value);

    let nextValue;

    try {
      nextValue = evalFormula(clean);

      if (!Number.isFinite(nextValue) || nextValue <= 0) {
        throw new Error("Formula greșită.");
      }
    } catch {
      setFormulaError(true);
      toast.warning("Formula este greșită.", { position: "top-right" });
      focusFormulaEnd();
      return;
    }

    try {
      await onSave?.({
        cantitate_lucrare: nextValue,
        cantitate_lucrare_formula: clean || null,
      });

      setFormulaError(false);
      setOpen(false);
    } catch {
      toast.error("Formula este bună, dar salvarea nu este legată încă.", { position: "top-right" });
      focusFormulaEnd();
    }
  };

  const handleOpenChange = (nextOpen) => {
    setOpen(nextOpen);

    if (!nextOpen) {
      setFormulaText(formula || formatNumber(value));
      setStepText("1");
      setFormulaError(false);
      setFormulaInputWidth(MIN_FORMULA_WIDTH);
    }
  };

  return (
    <Popover.Root open={open} onOpenChange={handleOpenChange}>
      <Popover.Trigger asChild>
        <button
          type="button"
          onPointerDown={stop}
          onMouseDown={stop}
          onClick={stop}
          onKeyDown={stopButtonKey}
          className={`mx-auto block w-full bg-transparent p-0 text-center text-sm font-black outline-none ${formulaError ? "text-destructive" : "text-foreground"}`}
        >
          {formulaError ? <FontAwesomeIcon className="text-xl" icon={faExclamationTriangle} /> : formatNumber(value)}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="bottom"
          align="end"
          sideOffset={4}
          onInteractOutside={(e) => {
            e.preventDefault();
          }}
          onPointerDown={stop}
          onMouseDown={stop}
          onClick={stop}
          onKeyDown={stop}
          className={`z-[200] overflow-hidden rounded-md border-2 bg-card shadow-[0_10px_25px_rgba(0,0,0,0.35),0_0_0_1px_rgba(255,255,255,0.12)]  dark:shadow-[0_25px_80px_rgba(0,0,0,1),0_0_30px_rgba(255,255,255,0.25),0_0_0_1px_rgba(255,255,255,0.35)] outline-none ${formulaError ? "border-destructive ring-destructive/40" : "border-2"}`}
        >
          <Popover.Arrow className="" width={14} height={7} />
          <span ref={measureRef} className="pointer-events-none invisible fixed left-[-9999px] top-[-9999px] whitespace-pre text-sm font-black">
            {formulaText || ""}
          </span>

          <div
            className="grid overflow-hidden"
            style={{
              gridTemplateColumns: `${formulaInputWidth}px 2rem 3rem 2rem 3rem 3rem`,
            }}
          >
            <Input
              ref={formulaInputRef}
              autoFocus
              value={formulaText}
              onChange={(e) => {
                setFormulaText(cleanFormula(e.target.value));
                setFormulaError(false);
              }}
              onKeyDown={(e) => {
                e.stopPropagation();

                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSave();
                }

                if (e.key === "Escape") {
                  e.preventDefault();
                  setOpen(false);
                }
              }}
              className="h-9 rounded-none border-0 border-r-2 bg-card px-2 text-right text-sm font-black outline-none focus-visible:ring-0"
              inputMode="decimal"
            />

            <button type="button" onClick={() => appendStep("-")} onKeyDown={stopButtonKey} className="h-9 border-r-2 text-base font-black hover:bg-muted">
              -
            </button>

            <Input
              value={stepText}
              onChange={(e) => setStepText(cleanFormula(e.target.value))}
              onKeyDown={(e) => e.stopPropagation()}
              className="h-9 rounded-none border-0 border-r-2 bg-card px-1 text-center text-base font-black outline-none focus-visible:ring-0"
              inputMode="decimal"
            />

            <button type="button" onClick={() => appendStep("+")} onKeyDown={stopButtonKey} className="h-9 border-r-2 text-sm font-black hover:bg-muted">
              +
            </button>
            <button type="button" onClick={() => handleOpenChange(false)} onKeyDown={stopButtonKey} className=" text-xl  font-black text-destructive hover:bg-accent">
              <FontAwesomeIcon icon={faXmarkCircle} />
            </button>
            <button type="button" onClick={handleSave} onKeyDown={stopButtonKey} className=" text-xl  font-black hover:bg-accent text-low dark:hover:text-green-400 hover:text-green-600">
              <FontAwesomeIcon icon={faCheckCircle} />
            </button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
