import { useEffect, useState } from "react";
import { OverflowPopover } from "../OverflowPopover";

export default function TextAreaCell({
  initialValue,
  rowId,
  whatIs,
  isEditable,
  onEdit,
  bold,
  absoluteWidth = null,
  rows = 2,
  maxLines = 1,
  padding = false,
  valueRO = "",
  valueFR = "",
  currentLang = "RO",
  absoluteInput = false,
  showToggle = false,
  fromTop = 0,
  translateX = 0,
  translateXNegative = 0,
  arrowPos = 0,
}) {
  const [lang, setLang] = useState(currentLang);
  const [localRO, setLocalRO] = useState(initialValue || valueRO);
  const [localFR, setLocalFR] = useState(valueFR);

  useEffect(() => {
    setLocalRO(initialValue || valueRO);
    setLocalFR(valueFR);
  }, [valueRO, valueFR, initialValue]);

  const handleChange = (e) => {
    const newValue = e.target.value;

    if (lang === "RO") {
      setLocalRO(newValue);
      onEdit?.(rowId, whatIs, newValue, "RO");
    } else {
      setLocalFR(newValue);
      onEdit?.(rowId, whatIs, newValue, "FR");
    }
  };

  const toggleLang = () => {
    setLang((prev) => (prev === "RO" ? "FR" : "RO"));
  };

  if (!isEditable) {
    const displayValue = showToggle
      ? lang === "RO"
        ? localRO
        : localFR
      : initialValue;

    return (
      <OverflowPopover text={displayValue} maxLines={maxLines} />
    );
  }

  return (
    <div className={`${absoluteInput ? "absolute" : "relative"} h-full flex gap-2`}>
      {absoluteInput ? (
        <div
          onPointerDown={(e) => e.stopPropagation()} // Prevents dnd-kit from activating drag
          style={{
            transform: `translateX(${translateXNegative ? -translateXNegative : translateX || 0}px)`,
            maxWidth: absoluteWidth || "16rem",
            minWidth: absoluteWidth || "16rem",
            top: fromTop || 0,
          }}
          className={`absolute z-50 bg-[#265f5a] flex flex-col text-white p-2 rounded-md shadow-lg min-h-[5.5rem] left-2 mt-2 text-sm whitespace-pre-line`}
        >
          <div
            style={{
              left: `${arrowPos}px`
            }}
            className={`absolute  top-[-5px] w-0 border-l-[5px] border-r-[5px] border-b-[5px] border-b-[#265f5a] border-transparent`} />
          <textarea
            value={lang === "RO" ? localRO : localFR}
            onChange={handleChange}
            className={`
            w-full
            h-full
            relative
            flex-1
            outline-none
            py-${padding ? "2" : "[0.1rem]"}
            bg-green-200
            rounded-lg
            px-2 
            scrollbar-webkit        
            leading-tight
            shadow-sm
            text-black
            resize-none
            overflow-auto
          `}
          />
          {showToggle && (
            <button
              type="button"
              onClick={toggleLang}
              className="text-sm mt-2 bg-green-200 hover:bg-green-400 font-semibold w-12 rounded-full"
            >
              {lang}
            </button>
          )}
        </div>
      ) : (
        <>
          <textarea
            rows={rows}
            value={lang === "RO" ? localRO : localFR}
            onChange={handleChange}
            className={`
            w-full
            outline-none
            py-${padding ? "2" : "[0.1rem]"}
            bg-green-200
            rounded-lg
            px-2 
            h-full
            scrollbar-webkit        
            leading-tight
            shadow-sm
            text-black
            resize-none
            overflow-auto
          `}
          />
          {showToggle && (
            <button
              type="button"
              onClick={toggleLang}
              className="text-sm bg-green-200 hover:bg-green-400 font-semibold w-12 rounded-full"
            >
              {lang}
            </button>
          )}
        </>
      )}
    </div>
  );
}
