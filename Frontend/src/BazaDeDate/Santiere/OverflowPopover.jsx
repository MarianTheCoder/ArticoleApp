import React, { useRef, useEffect, useState } from "react";

export const OverflowPopover = ({ text, maxLines = 2 }) => {
    const ref = useRef(null);
    const [isEllipsisActive, setIsEllipsisActive] = useState(false);
    const [hovered, setHovered] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        const check = () => {
            // Creezi un span clonă invizibilă
            const range = document.createRange();
            range.selectNodeContents(el);
            const rects = range.getClientRects();

            // Dacă ai mai multe linii decât maxLines → înseamnă că e tăiat
            // console.log("ASdas" + rects.length + " " + maxLines);
            if (rects.length > maxLines) {
                setIsEllipsisActive(true);
            } else {
                setIsEllipsisActive(false);
            }
        };

        check();

        const resizeObserver = new ResizeObserver(check);
        resizeObserver.observe(el);

        return () => resizeObserver.disconnect();
    }, [text, maxLines]);

    return (
        <div
            ref={ref}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                display: "-webkit-box",
                WebkitLineClamp: maxLines,
                WebkitBoxOrient: "vertical",
                overflow: "hidden"
            }}
        >
            {text}

            {hovered && isEllipsisActive && (
                <div
                    onMouseEnter={() => setHovered(true)}
                    onPointerDown={(e) => e.stopPropagation()} // 💥 împiedică dnd-kit să activeze drag
                    className="absolute z-50 bg-[#265f5a] text-white p-2 rounded-md shadow-lg min-w-[30rem] max-w-[40rem]  top-4 left-0 mt-2 text-sm whitespace-pre-line">
                    <div className="absolute top-[-5px] left-12 w-0 h-0 border-l-[5px] border-r-[5px] border-b-[5px] border-b-[#265f5a] border-transparent" />
                    {text}
                </div>
            )}
        </div>
    );
};