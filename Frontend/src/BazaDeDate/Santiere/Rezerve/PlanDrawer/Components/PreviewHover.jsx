import React from "react";
import { Line } from "react-konva";

// --- tiny color helpers (same logic as in PipeSegments) --- //
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

// optional cache, same as la pipe segments
const hoverColorCache = {};
function getHoverColors(baseColor) {
    const key = baseColor.toLowerCase();
    if (hoverColorCache[key]) return hoverColorCache[key];

    const outerColor = darken(baseColor, 0.35);   // “edge” / body
    const innerColor = lighten(baseColor, 0.55);  // interior
    const centerColor = darken(baseColor, 0.25);  // dashed center

    const res = { outerColor, innerColor, centerColor };
    hoverColorCache[key] = res;
    return res;
}

// --- component --- //
export default function PreviewHover({
    hoverPoint,
    pipeSegments,
    PIPE_WIDTH,
    PIPE_COLOR,
    PIPE_EDGE,
    CENTER_WIDTH,
}) {
    const previewPoints = React.useMemo(() => {
        if (!hoverPoint || pipeSegments.length === 0) return null;

        const last = pipeSegments[pipeSegments.length - 1];
        if (!last.end) return null;

        return [
            last.end.x, last.end.y,
            hoverPoint.x, hoverPoint.y,
        ];
    }, [hoverPoint, pipeSegments]);

    const { outerColor, innerColor, centerColor } = React.useMemo(
        () => getHoverColors(PIPE_COLOR || "#008000"),
        [PIPE_COLOR]
    );

    if (!previewPoints) return null;

    // folosim aceleași culori ca la PipeSegments, doar cu opacități mai mici
    return (
        <>
            {/* Outer body (ghost) */}
            <Line
                points={previewPoints}
                stroke={outerColor}
                strokeWidth={PIPE_WIDTH + 2 * PIPE_EDGE}
                lineCap="round"
                lineJoin="round"
                opacity={0.25}
            />

            {/* Inner fill (ghost) */}
            <Line
                points={previewPoints}
                stroke={innerColor}
                strokeWidth={PIPE_WIDTH}
                lineCap="round"
                lineJoin="round"
                opacity={0.4}
            />

            {/* Center dashed line (ghost) */}
            <Line
                points={previewPoints}
                stroke={centerColor}
                strokeWidth={CENTER_WIDTH}
                lineCap="round"
                lineJoin="round"
                dash={[20, 12]}
                opacity={0.6}
            />
        </>
    );
}