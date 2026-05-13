// Components/PipeSegments.jsx
import React, { useMemo } from "react";
import { Line } from "react-konva";

// ─── color helpers ────────────────────────────────────────────────────────────
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
  const c = (v) =>
    Math.max(0, Math.min(255, Math.round(v)))
      .toString(16)
      .padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
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

const pipeColorCache = new Map();
function getPipeColors(baseColor) {
  const key = baseColor.toLowerCase();
  if (pipeColorCache.has(key)) return pipeColorCache.get(key);
  const res = {
    outerColor: darken(baseColor, 0.35),
    innerColor: lighten(baseColor, 0.55),
    centerColor: darken(baseColor, 0.25),
  };
  pipeColorCache.set(key, res);
  return res;
}

// ─── single segment ───────────────────────────────────────────────────────────
const PipeSegment = React.memo(
  function PipeSegment({ seg, isSelected }) {
    // <-- AM SCHIMBAT AICI
    const { points, outerColor, innerColor, centerColor, outerWidth, innerWidth, centerWidth } = useMemo(() => {
      const { start, end, width = 12, color = "#008000" } = seg;
      const { outerColor, innerColor, centerColor } = getPipeColors(color);
      const edgeWidth = Math.max(1.5, width / 8);
      return {
        points: [start.x, start.y, end.x, end.y],
        outerColor,
        innerColor,
        centerColor,
        outerWidth: width + 2 * edgeWidth,
        innerWidth: width,
        centerWidth: Math.max(1, width / 6),
      };
    }, [seg.start.x, seg.start.y, seg.end.x, seg.end.y, seg.width, seg.color]);

    return (
      <React.Fragment>
        {/* Glow-ul se aplică doar pe conturul exterior */}
        <Line
          points={points}
          stroke={outerColor}
          strokeWidth={outerWidth}
          shadowColor={isSelected ? "#fbbf24" : "transparent"} // Auriu când e selectat
          shadowBlur={isSelected ? 15 : 0}
          shadowOpacity={isSelected ? 1 : 0}
          shadowForStrokeEnabled={true}
          listening={false}
        />
        <Line points={points} stroke={innerColor} strokeWidth={innerWidth} listening={false} />
        <Line points={points} stroke={centerColor} strokeWidth={centerWidth} dash={[20, 12]} listening={false} />
      </React.Fragment>
    );
  },
  // COMPARATOR CUSTOM: Îi spunem exact când ARE VOIE să se rerandeze
  (prevProps, nextProps) => {
    return (
      prevProps.isSelected === nextProps.isSelected &&
      prevProps.seg.id === nextProps.seg.id &&
      prevProps.seg.start.x === nextProps.seg.start.x &&
      prevProps.seg.start.y === nextProps.seg.start.y &&
      prevProps.seg.end.x === nextProps.seg.end.x &&
      prevProps.seg.end.y === nextProps.seg.end.y &&
      prevProps.seg.width === nextProps.seg.width &&
      prevProps.seg.color === nextProps.seg.color
    );
  },
);

// ─── list ─────────────────────────────────────────────────────────────────────
export default function PipeSegments({ pipeSegments, selectedItemId }) {
  if (!pipeSegments || pipeSegments.length === 0) return null;
  return (
    <>
      {pipeSegments.map((seg, idx) => (
        <PipeSegment
          key={seg.id ?? `seg-${idx}`}
          seg={seg}
          isSelected={seg.id == selectedItemId} // <-- AICI ESTE SECRETUL
        />
      ))}
    </>
  );
}
