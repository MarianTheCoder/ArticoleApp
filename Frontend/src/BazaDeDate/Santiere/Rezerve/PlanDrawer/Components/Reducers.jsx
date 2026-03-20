// Components/Reducers.jsx
import React, { useMemo } from "react";
import { Shape } from "react-konva";

// ---------- color helpers ----------
function hexToRgb(hex) {
  if (!hex) return { r: 0, g: 0, b: 0 };
  let h = hex.replace("#", "").trim();
  if (h.length === 3)
    h = h
      .split("")
      .map((ch) => ch + ch)
      .join("");
  if (h.length !== 6) return { r: 0, g: 0, b: 0 };
  const num = parseInt(h, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

function rgbToHex({ r, g, b }) {
  const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
  return `#${clamp(r).toString(16).padStart(2, "0")}${clamp(g).toString(16).padStart(2, "0")}${clamp(b).toString(16).padStart(2, "0")}`;
}

function mixRgb(a, b, t) {
  return { r: a.r + (b.r - a.r) * t, g: a.g + (b.g - a.g) * t, b: a.b + (b.b - a.b) * t };
}

function lighten(hex, amount) {
  return rgbToHex(mixRgb(hexToRgb(hex), { r: 255, g: 255, b: 255 }, amount));
}
function darken(hex, amount) {
  return rgbToHex(mixRgb(hexToRgb(hex), { r: 0, g: 0, b: 0 }, amount));
}

const reducerColorCache = new Map();
function getReducerColors(baseColor) {
  const key = baseColor.toLowerCase();
  if (reducerColorCache.has(key)) return reducerColorCache.get(key);
  const res = {
    outerColor: darken(baseColor, 0.45),
    innerColor: lighten(baseColor, 0.45),
    centerColor: darken(baseColor, 0.25),
  };
  reducerColorCache.set(key, res);
  return res;
}

// ---------- geometry ----------
function computeReducerGeometry(p0, p1, dIn, dOut) {
  const dx = p1.x - p0.x;
  const dy = p1.y - p0.y;
  const len = Math.hypot(dx, dy) || 1;

  const ux = dx / len;
  const uy = dy / len;
  const nx = -uy;
  const ny = ux;

  const edgeIn = Math.max(1.5, dIn / 8);
  const edgeOut = Math.max(1.5, dOut / 8);

  const borderWidth = Math.max(1.5, Math.min(edgeIn, edgeOut));

  const rIn = Math.max(0, dIn / 2 + edgeIn - borderWidth / 2);
  const rOut = Math.max(0, dOut / 2 + edgeOut - borderWidth / 2);

  const sCurveStart = len * 0.25;
  const sCurveEnd = len * 0.75;

  const axisAt = (s) => ({ x: p0.x + ux * s, y: p0.y + uy * s });

  const A0 = axisAt(0);
  const A1 = axisAt(sCurveStart);
  const A2 = axisAt(sCurveEnd);
  const A3 = axisAt(len);

  const top = (p, r) => ({ x: p.x + nx * r, y: p.y + ny * r });
  const bot = (p, r) => ({ x: p.x - nx * r, y: p.y - ny * r });

  const P0T = top(A0, rIn);
  const P0B = bot(A0, rIn);
  const P1T = top(A1, rIn);
  const P1B = bot(A1, rIn);
  const P2T = top(A2, rOut);
  const P2B = bot(A2, rOut);
  const P3T = top(A3, rOut);
  const P3B = bot(A3, rOut);

  const curveTension = 0.4;
  const tensionLen = len * curveTension;

  const cp1Top = { x: P1T.x + ux * tensionLen, y: P1T.y + uy * tensionLen };
  const cp2Top = { x: P2T.x - ux * tensionLen, y: P2T.y - uy * tensionLen };
  const cp1Bot = { x: P1B.x + ux * tensionLen, y: P1B.y + uy * tensionLen };
  const cp2Bot = { x: P2B.x - ux * tensionLen, y: P2B.y - uy * tensionLen };

  return { P0T, P1T, P2T, P3T, P0B, P1B, P2B, P3B, cp1Top, cp2Top, cp1Bot, cp2Bot, borderWidth };
}

// ---------- single reducer (memoized) ----------
const ReducerShape = React.memo(function ReducerShape({ r }) {
  const { p0, p1, dIn, dOut, color = "#008000" } = r;
  console.log("Dasdasdas");
  const { sceneFunc, outerColor, innerColor, borderWidth } = useMemo(() => {
    const { P0T, P1T, P2T, P3T, P0B, P1B, P2B, P3B, cp1Top, cp2Top, cp1Bot, cp2Bot, borderWidth } = computeReducerGeometry(p0, p1, dIn, dOut);

    const { outerColor, innerColor } = getReducerColors(color);
    // Stable function reference — closed over computed coords.
    // Will only be recreated when deps change (via useMemo).
    const sceneFunc = (ctx, shape) => {
      ctx.beginPath();
      ctx.moveTo(P0T.x, P0T.y);
      ctx.lineTo(P1T.x, P1T.y);
      ctx.bezierCurveTo(cp1Top.x, cp1Top.y, cp2Top.x, cp2Top.y, P2T.x, P2T.y);
      ctx.lineTo(P3T.x, P3T.y);
      ctx.lineTo(P3B.x, P3B.y);
      ctx.lineTo(P2B.x, P2B.y);
      ctx.bezierCurveTo(cp2Bot.x, cp2Bot.y, cp1Bot.x, cp1Bot.y, P1B.x, P1B.y);
      ctx.lineTo(P0B.x, P0B.y);
      ctx.closePath();
      ctx.fillStrokeShape(shape);
    };

    return { sceneFunc, outerColor, innerColor, borderWidth };
  }, [p0.x, p0.y, p1.x, p1.y, dIn, dOut, color]);

  return <Shape sceneFunc={sceneFunc} fill={innerColor} stroke={outerColor} strokeWidth={borderWidth} listening={false} />;
});

// ---------- list ----------
export default function Reducers({ reducers }) {
  if (!reducers || reducers.length === 0) return null;

  return (
    <>
      {reducers.map((r, idx) => (
        <ReducerShape key={r.id ?? `red-${idx}`} r={r} />
      ))}
    </>
  );
}
