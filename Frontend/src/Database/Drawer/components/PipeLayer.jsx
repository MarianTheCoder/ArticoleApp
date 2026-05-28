import React, { useMemo } from "react";
import { Layer, Line } from "react-konva";

// Converts hex to RGB.
function hexToRgb(hex) {
  if (!hex) return { r: 0, g: 0, b: 0 };

  let h = String(hex).replace("#", "").trim();

  if (h.length === 3) {
    h = h
      .split("")
      .map((ch) => ch + ch)
      .join("");
  }

  if (h.length !== 6) return { r: 0, g: 0, b: 0 };

  const num = parseInt(h, 16);

  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

// Converts RGB to hex.
function rgbToHex({ r, g, b }) {
  const c = (v) =>
    Math.max(0, Math.min(255, Math.round(v)))
      .toString(16)
      .padStart(2, "0");

  return `#${c(r)}${c(g)}${c(b)}`;
}

// Mixes two RGB colors.
function mixRgb(a, b, t) {
  return {
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
  };
}

// Lightens a color.
function lighten(hex, amount) {
  return rgbToHex(mixRgb(hexToRgb(hex), { r: 255, g: 255, b: 255 }, amount));
}

// Darkens a color.
function darken(hex, amount) {
  return rgbToHex(mixRgb(hexToRgb(hex), { r: 0, g: 0, b: 0 }, amount));
}

// Cache pipe color variants.
const pipeColorCache = new Map();

// Creates visual colors from selected pipe color.
function getPipeColors(baseColor) {
  const key = String(baseColor || "#008000").toLowerCase();

  if (pipeColorCache.has(key)) return pipeColorCache.get(key);

  const res = {
    outerColor: darken(key, 0.35),
    innerColor: lighten(key, 0.55),
    centerColor: darken(key, 0.25),
  };

  pipeColorCache.set(key, res);

  return res;
}

// One committed pipe.
const PipeShape = React.memo(
  function PipeShape({ pipe, isSelected }) {
    const { points, outerColor, innerColor, centerColor, outerWidth, innerWidth, centerWidth, dash } = useMemo(() => {
      const { a, b, widthPx = 12, color = "#008000" } = pipe;

      const { outerColor, innerColor, centerColor } = getPipeColors(color);

      // Same logic as old PipeSegments.
      const edgeWidth = Math.max(1.5, widthPx / 8);

      return {
        points: [a.x, a.y, b.x, b.y],
        outerColor,
        innerColor,
        centerColor,

        // Outer outline is visible outside DN body.
        outerWidth: widthPx + 2 * edgeWidth,

        // Inner body is real DN width.
        innerWidth: widthPx,

        // Center dashed line.
        centerWidth: Math.max(1, widthPx / 6),

        // Dash scales with pipe size.
        dash: [Math.max(20, widthPx * 2), Math.max(12, widthPx * 1.2)],
      };
    }, [pipe.a.x, pipe.a.y, pipe.b.x, pipe.b.y, pipe.widthPx, pipe.color]);

    return (
      <>
        {/* Outer dark outline + selected glow. */}
        <Line
          points={points}
          stroke={outerColor}
          strokeWidth={outerWidth}
          lineCap="butt"
          lineJoin="miter"
          shadowColor={isSelected ? "#fbbf24" : "transparent"}
          shadowBlur={isSelected ? 15 : 0}
          shadowOpacity={isSelected ? 1 : 0}
          shadowForStrokeEnabled={true}
          listening={false}
          perfectDrawEnabled={false}
        />

        {/* Inner light pipe body. */}
        <Line points={points} stroke={innerColor} strokeWidth={innerWidth} lineCap="butt" lineJoin="miter" listening={false} perfectDrawEnabled={false} />

        {/* Center dashed line. */}
        <Line points={points} stroke={centerColor} strokeWidth={centerWidth} dash={dash} lineCap="butt" lineJoin="miter" listening={false} perfectDrawEnabled={false} />
      </>
    );
  },
  (prev, next) => {
    // Rerender only when pipe geometry/style/selection changes.
    return (
      prev.isSelected === next.isSelected &&
      prev.pipe.id === next.pipe.id &&
      prev.pipe.a.x === next.pipe.a.x &&
      prev.pipe.a.y === next.pipe.a.y &&
      prev.pipe.b.x === next.pipe.b.x &&
      prev.pipe.b.y === next.pipe.b.y &&
      prev.pipe.widthPx === next.pipe.widthPx &&
      prev.pipe.color === next.pipe.color
    );
  },
);

// Pipe layer with memo.
const PipeLayer = React.memo(
  function PipeLayer({ pipes, selected }) {
    if (!pipes || pipes.length === 0) return <Layer listening={false} />;

    return (
      <Layer listening={false}>
        {pipes.map((pipe) => (
          <PipeShape key={pipe.id} pipe={pipe} isSelected={selected?.itemId === pipe.id} />
        ))}
      </Layer>
    );
  },
  (prev, next) => {
    // Skip layer rerender when pipe list and selection refs are unchanged.
    return prev.pipes === next.pipes && prev.selected === next.selected;
  },
);

export default PipeLayer;
