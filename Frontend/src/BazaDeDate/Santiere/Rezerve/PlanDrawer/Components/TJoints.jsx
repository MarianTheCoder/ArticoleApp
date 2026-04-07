import React, { useMemo } from "react";
import { Shape } from "react-konva";
import { computeTJointGeometry } from "../Utils/BuildTJoint";

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

const TJointShape = React.memo(
  function TJointShape({ t, COT_VISUAL_FACTOR, isSelected }) {
    const { anchor, vMain, vBranch, dMain, dBranch, color } = t;
    const geoData = useMemo(() => {
      if (!vMain || !vBranch) return null;

      const geo = computeTJointGeometry(anchor, vMain, vBranch, dMain, dBranch, COT_VISUAL_FACTOR);

      // Folosim aceleași procente ca în PipeSegments.jsx
      const outerColor = darken(color, 0.35);
      const innerColor = lighten(color, 0.55);

      return { geo, outerColor, innerColor };
    }, [anchor, vMain, vBranch, dMain, dBranch, color, COT_VISUAL_FACTOR]);

    if (!geoData) return null;
    const { geo, outerColor, innerColor } = geoData;
    console.log("Rendering TJoint", t.id, "selected:", isSelected);
    return (
      <Shape
        fill={innerColor} // Partea luminoasă (ca innerColor din Pipe)
        stroke={outerColor} // Conturul închis (ca outerColor din Pipe)
        strokeWidth={geo.border}
        shadowColor={isSelected ? "#fbbf24" : "transparent"} // Auriu când e selectat
        shadowBlur={isSelected ? 15 : 0}
        shadowOpacity={isSelected ? 1 : 0}
        shadowForStrokeEnabled={true}
        sceneFunc={(ctx, shape) => {
          ctx.beginPath();
          ctx.moveTo(geo.points[0].x, geo.points[0].y);
          for (let i = 1; i < geo.points.length; i++) {
            ctx.lineTo(geo.points[i].x, geo.points[i].y);
          }
          ctx.closePath();
          ctx.fillStrokeShape(shape);
        }}
        listening={false}
      />
    );
  },
  // Înlocuiește comparatorul din React.memo cu ăsta:
  (prev, next) => {
    return (
      prev.t === next.t && // <--- Verifică automat dacă S-A MODIFICAT ORICE în obiectul t (id, color, dn, etc)
      prev.isSelected == next.isSelected &&
      prev.COT_VISUAL_FACTOR === next.COT_VISUAL_FACTOR
    );
  },
);

export default function TJoints({ tJoints, COT_VISUAL_FACTOR, selectedItemId }) {
  if (!tJoints?.length) return null;
  return (
    <>
      {tJoints.map((t) => (
        <TJointShape key={t.id} t={t} COT_VISUAL_FACTOR={COT_VISUAL_FACTOR} isSelected={t.id == selectedItemId} />
      ))}
    </>
  );
}
