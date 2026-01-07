// Components/PipeSegments.jsx
import React from "react";
import { Line } from "react-konva";

// --- tiny color helpers --- //
function hexToRgb(hex) {
    if (!hex) return { r: 0, g: 0, b: 0 };
    let h = hex.replace("#", "").trim();

    if (h.length === 3) {
        h = h.split("").map(ch => ch + ch).join("");
    }
    if (h.length !== 6) return { r: 0, g: 0, b: 0 };

    const num = parseInt(h, 16);
    return {
        r: (num >> 16) & 255,
        g: (num >> 8) & 255,
        b: num & 255,
    };
}

function rgbToHex({ r, g, b }) {
    const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
    const rr = clamp(r).toString(16).padStart(2, "0");
    const gg = clamp(g).toString(16).padStart(2, "0");
    const bb = clamp(b).toString(16).padStart(2, "0");
    return `#${rr}${gg}${bb}`;
}

function mixRgb(a, b, t) {
    return {
        r: a.r + (b.r - a.r) * t,
        g: a.g + (b.g - a.g) * t,
        b: a.b + (b.b - a.b) * t,
    };
}

function lighten(hex, amount) {
    const rgb = hexToRgb(hex);
    const white = { r: 255, g: 255, b: 255 };
    const mixed = mixRgb(rgb, white, amount);
    return rgbToHex(mixed);
}

function darken(hex, amount) {
    const rgb = hexToRgb(hex);
    const black = { r: 0, g: 0, b: 0 };
    const mixed = mixRgb(rgb, black, amount);
    return rgbToHex(mixed);
}

// cache global în modul, pentru culori derivate
const pipeColorCache = {};

function getPipeColors(baseColor) {
    const key = baseColor.toLowerCase();
    if (pipeColorCache[key]) return pipeColorCache[key];

    const outerColor = darken(baseColor, 0.35);
    const innerColor = lighten(baseColor, 0.55);
    const centerColor = darken(baseColor, 0.25);

    const result = { outerColor, innerColor, centerColor };
    pipeColorCache[key] = result;
    return result;
}

// --- main component --- //
export default function PipeSegments({ pipeSegments }) {
    return pipeSegments.map((seg, idx) => {
        const segmentPoints = [
            seg.start.x, seg.start.y,
            seg.end.x, seg.end.y,
        ];

        const width = seg.width ?? 12;
        const baseColor = seg.color || "#008000";

        const { outerColor, innerColor, centerColor } = getPipeColors(baseColor);

        const edgeWidth = Math.max(1.5, width / 8);

        // aici am adaugat 2 x PIPE_EDGE la latimea tevii pentru a crea un efect de "edge", pentru ca DN e interior si ne trebuie bordura exterioara
        // parctic avem dn50 care e interior si peste mai avem bordura
        return (
            <React.Fragment key={`seg-${idx}`}>
                <Line
                    points={segmentPoints}
                    stroke={outerColor}
                    strokeWidth={width + 2 * edgeWidth}
                />
                <Line
                    points={segmentPoints}
                    stroke={innerColor}
                    strokeWidth={width}
                />
                <Line
                    points={segmentPoints}
                    stroke={centerColor}
                    strokeWidth={width / 6}
                    dash={[20, 12]}
                />
            </React.Fragment>
        );
    });
}