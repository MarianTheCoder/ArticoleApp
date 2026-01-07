// Components/Reducers.jsx
import React from "react";
import { Shape, Line } from "react-konva";

// ---------- tiny color helpers – same pattern as PipeSegments / Elbows ----------
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

// same style as Elbows: cache + stronger contrast
const reducerColorCache = {};
function getReducerColors(baseColor) {
    const key = baseColor.toLowerCase();
    if (reducerColorCache[key]) return reducerColorCache[key];

    const outerColor = darken(baseColor, 0.45);   // dark edge
    const innerColor = lighten(baseColor, 0.45);  // bright interior
    const centerColor = darken(baseColor, 0.25);  // center line

    const res = { outerColor, innerColor, centerColor };
    reducerColorCache[key] = res;
    return res;
}

// ---------- main component ----------
export default function Reducers({ reducers }) {
    if (!reducers || reducers.length === 0) return null;

    return (
        <>
            {reducers.map((r, idx) => {
                const { p0, p1, dIn, dOut, color = "#008000" } = r;
                if (!p0 || !p1 || !dIn || !dOut) return null;

                const dx = p1.x - p0.x;
                const dy = p1.y - p0.y;
                const len = Math.hypot(dx, dy) || 1;

                const ux = dx / len;
                const uy = dy / len;
                const nx = -uy;
                const ny = ux;

                const edgeIn = Math.max(1.5, dIn / 8);
                const edgeOut = Math.max(1.5, dOut / 8);

                const outerRadiusIn = dIn / 2 + edgeIn;
                const outerRadiusOut = dOut / 2 + edgeOut;

                // stroke-urile la reducer sunt DOAR borduri, nu grosimea tevii
                const borderWidth = Math.max(1.5, Math.min(edgeIn, edgeOut));

                // IMPORTANT: path radius shrunk by half border,
                // so stroke outer edge aligns with pipe outer radius
                const rIn = Math.max(0, outerRadiusIn - borderWidth / 2);
                const rOut = Math.max(0, outerRadiusOut - borderWidth / 2);

                const flatInRatio = 0.25;
                const flatOutRatio = 0.25;

                const sCurveStart = len * flatInRatio;
                const sCurveEnd = len - len * flatOutRatio;

                const axisAt = (s) => ({
                    x: p0.x + ux * s,
                    y: p0.y + uy * s,
                });

                const A0 = axisAt(0);
                const A1 = axisAt(sCurveStart);
                const A2 = axisAt(sCurveEnd);
                const A3 = axisAt(len);

                const top = (p, r) => ({ x: p.x + nx * r, y: p.y + ny * r });
                const bot = (p, r) => ({ x: p.x - nx * r, y: p.y - ny * r });

                const P0T = top(A0, rIn);
                const P1T = top(A1, rIn);
                const P2T = top(A2, rOut);
                const P3T = top(A3, rOut);

                const P0B = bot(A0, rIn);
                const P1B = bot(A1, rIn);
                const P2B = bot(A2, rOut);
                const P3B = bot(A3, rOut);

                const curveTension = 0.4;
                const cp1Top = {
                    x: P1T.x + ux * (len * curveTension),
                    y: P1T.y + uy * (len * curveTension),
                };
                const cp2Top = {
                    x: P2T.x - ux * (len * curveTension),
                    y: P2T.y - uy * (len * curveTension),
                };

                const cp1Bot = {
                    x: P1B.x + ux * (len * curveTension),
                    y: P1B.y + uy * (len * curveTension),
                };
                const cp2Bot = {
                    x: P2B.x - ux * (len * curveTension),
                    y: P2B.y - uy * (len * curveTension),
                };

                const { outerColor, innerColor, centerColor } = getReducerColors(color);

                const buildPath = (ctx, shape) => {
                    ctx.beginPath();
                    ctx.moveTo(P0T.x, P0T.y);
                    ctx.lineTo(P1T.x, P1T.y);
                    ctx.bezierCurveTo(
                        cp1Top.x,
                        cp1Top.y,
                        cp2Top.x,
                        cp2Top.y,
                        P2T.x,
                        P2T.y
                    );
                    ctx.lineTo(P3T.x, P3T.y);
                    ctx.lineTo(P3B.x, P3B.y);
                    ctx.lineTo(P2B.x, P2B.y);
                    ctx.bezierCurveTo(
                        cp2Bot.x,
                        cp2Bot.y,
                        cp1Bot.x,
                        cp1Bot.y,
                        P1B.x,
                        P1B.y
                    );
                    ctx.lineTo(P0B.x, P0B.y);
                    ctx.closePath();
                    ctx.fillStrokeShape(shape);
                };

                const key = r.id ?? `red-${idx}`;

                return (
                    <React.Fragment key={key}>
                        <Shape
                            sceneFunc={buildPath}
                            fill={innerColor}
                            stroke={outerColor}
                            strokeWidth={borderWidth}
                            listening={false}
                        />

                    </React.Fragment>
                );
            })}
        </>
    );
}