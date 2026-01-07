// Components/Elbows.jsx
import React from "react";
import { Shape } from "react-konva";

// --- tiny color helpers (same as before) --- //
function hexToRgb(hex) {
    if (!hex) return { r: 0, g: 0, b: 0 };
    let h = hex.replace("#", "").trim();

    if (h.length === 3) {
        h = h.split("").map((ch) => ch + ch).join("");
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

// cache so we don’t recompute every render
const elbowColorCache = {};
function getElbowColors(baseColor) {
    const key = baseColor.toLowerCase();
    if (elbowColorCache[key]) return elbowColorCache[key];

    const outerColor = darken(baseColor, 0.45);   // border
    const innerColor = lighten(baseColor, 0.45);  // fill

    const res = { outerColor, innerColor };
    elbowColorCache[key] = res;
    return res;
}


export default function Elbows({ elbows }) {
    if (!elbows || !elbows.length) return null;

    return elbows.map((elbow, idx) => {
        const width = elbow.width;
        if (!width) return null;

        const baseColor = elbow.color || "#008000";
        const { outerColor, innerColor } = getElbowColors(baseColor);

        const edgeWidth = Math.max(1.5, width / 8);
        const borderWidth = edgeWidth;

        const { outlineTop, outlineBottom } = elbow;
        if (!outlineTop || !outlineBottom) return null;

        const buildPath = (ctx, shape) => {
            ctx.beginPath();

            // top 0 -> n
            ctx.moveTo(outlineTop[0].x, outlineTop[0].y);
            for (let i = 1; i < outlineTop.length; i++) {
                const p = outlineTop[i];
                ctx.lineTo(p.x, p.y);
            }

            // bottom n -> 0
            for (let i = outlineBottom.length - 1; i >= 0; i--) {
                const p = outlineBottom[i];
                ctx.lineTo(p.x, p.y);
            }

            ctx.closePath();
            ctx.fillStrokeShape(shape);
        };

        const key = elbow.id != null ? `elbow-${elbow.id}` : `elbow-${idx}`;

        return (
            <Shape
                key={key}
                sceneFunc={buildPath}
                fill={innerColor}
                stroke={outerColor}
                strokeWidth={borderWidth}
                listening={false}
            />
        );
    });
}