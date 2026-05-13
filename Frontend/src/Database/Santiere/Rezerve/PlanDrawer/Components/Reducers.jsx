// Components/Reducers.jsx — trapezoid shape, no curves
import React, { useMemo } from "react";
import { Shape } from "react-konva";
import { computeReducerGeometry } from "../Utils/BuildReducer";

function hexToRgb(hex) {
  if (!hex) return { r: 0, g: 0, b: 0 };
  let h = hex.replace("#", "").trim();
  if (h.length === 3)
    h = h
      .split("")
      .map((ch) => ch + ch)
      .join("");
  if (h.length !== 6) return { r: 0, g: 0, b: 0 };
  const n = parseInt(h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
function rgbToHex({ r, g, b }) {
  const c = (v) =>
    Math.max(0, Math.min(255, Math.round(v)))
      .toString(16)
      .padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}
function mix(a, b, t) {
  return { r: a.r + (b.r - a.r) * t, g: a.g + (b.g - a.g) * t, b: a.b + (b.b - a.b) * t };
}
function lighten(hex, a) {
  return rgbToHex(mix(hexToRgb(hex), { r: 255, g: 255, b: 255 }, a));
}
function darken(hex, a) {
  return rgbToHex(mix(hexToRgb(hex), { r: 0, g: 0, b: 0 }, a));
}

const colorCache = new Map();
function getColors(base) {
  const key = base.toLowerCase();
  if (colorCache.has(key)) return colorCache.get(key);
  const res = { outer: darken(base, 0.45), inner: lighten(base, 0.45) };
  colorCache.set(key, res);
  return res;
}

const ReducerShape = React.memo(
  function ReducerShape({ r, isSelected }) {
    // 1. Am adăugat extragerea lui `anchor` din r
    const { p0, p1, dIn, dOut, anchor, color = "#008000" } = r;

    const { sceneFunc, outer, inner, border } = useMemo(() => {
      // 2. Calculăm geometria O SINGURĂ DATĂ și îi pasăm anchor-ul!
      const geo = computeReducerGeometry(p0, p1, dIn, dOut, anchor);
      const { outer, inner } = getColors(color);

      const sceneFunc = (ctx, shape) => {
        // Folosim punctele direct din `geo`
        ctx.beginPath();
        ctx.moveTo(geo.P0T.x, geo.P0T.y);
        ctx.lineTo(geo.MidT_In.x, geo.MidT_In.y);
        ctx.lineTo(geo.MidT_Out.x, geo.MidT_Out.y);
        ctx.lineTo(geo.P1T.x, geo.P1T.y);
        ctx.lineTo(geo.P1B.x, geo.P1B.y);
        ctx.lineTo(geo.MidB_Out.x, geo.MidB_Out.y);
        ctx.lineTo(geo.MidB_In.x, geo.MidB_In.y);
        ctx.lineTo(geo.P0B.x, geo.P0B.y);
        ctx.closePath();
        ctx.fillStrokeShape(shape);
      };

      // 3. Acum `geo.border` funcționează perfect
      return { sceneFunc, outer, inner, border: geo.border };
    }, [p0.x, p0.y, p1.x, p1.y, dIn, dOut, color, anchor]);

    return (
      <Shape
        sceneFunc={sceneFunc}
        shadowColor={isSelected ? "#fbbf24" : "transparent"} // Auriu când e selectat
        shadowBlur={isSelected ? 15 : 0}
        shadowOpacity={isSelected ? 1 : 0}
        shadowForStrokeEnabled={true}
        fill={inner}
        stroke={outer}
        strokeWidth={border}
        listening={false}
      />
    );
  },
  (prev, next) => {
    return (
      prev.r === next.r && // Verifică dacă s-a modificat ceva în obiect (id, diametre, etc)
      prev.isSelected === next.isSelected // isSelected a fost schimbat în `===`
    );
  },
);

export default function Reducers({ reducers, selectedItemId }) {
  if (!reducers?.length) return null;
  return (
    <>
      {reducers.map((r, i) => (
        <ReducerShape key={r.id ?? `red-${i}`} r={r} isSelected={r.id === selectedItemId} />
      ))}
    </>
  );
}
