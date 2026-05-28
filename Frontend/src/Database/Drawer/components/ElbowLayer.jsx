import React, { useMemo } from "react";
import { Layer, Line } from "react-konva";
import { getPipeEdgePx, getPipeOuterWidthPx } from "../engine/geometry/pipeMetrics.js";
import { movePoint, normalize, perp } from "../engine/geometry/vector.js";

// Converts hex to RGB.
function hexToRgb(hex) {
  if (!hex) return { r: 0, g: 0, b: 0 };

  let h = String(hex).replace("#", "").trim();

  if (h.length === 3) h = h.split("").map((ch) => ch + ch).join("");
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
  const c = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");

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

// Color cache for elbow strokes.
const elbowColorCache = new Map();

// Creates visual colors from elbow color.
function getElbowColors(baseColor) {
  const key = String(baseColor || "#008000").toLowerCase();

  if (elbowColorCache.has(key)) return elbowColorCache.get(key);

  const res = {
    outerColor: darken(key, 0.35),
    innerColor: lighten(key, 0.55),
  };

  elbowColorCache.set(key, res);

  return res;
}

// One deterministic elbow fitting.
const ElbowShape = React.memo(
  function ElbowShape({ elbow, isSelected }) {
    const visual = useMemo(() => {
      const widthPx = elbow.widthPx || 12;
      const edgeWidth = getPipeEdgePx(widthPx);
      const corner = elbow.corner || { x: elbow.x, y: elbow.y };
      const cutIn = elbow.trimBefore || movePoint(corner, elbow.incomingDir, -(elbow.legPx || widthPx));
      const cutOut = elbow.trimAfter || movePoint(corner, elbow.outgoingDir, elbow.legPx || widthPx);
      const inPerp = normalize(perp(elbow.incomingDir));
      const outPerp = normalize(perp(elbow.outgoingDir));
      const { outerColor, innerColor } = getElbowColors(elbow.color);
      const capStrokeWidth = Math.max(1, edgeWidth);
      const startCapCenter = movePoint(cutIn, elbow.incomingDir, capStrokeWidth / 2);
      const endCapCenter = movePoint(cutOut, elbow.outgoingDir, -capStrokeWidth / 2);
      const outerWidth = getPipeOuterWidthPx(widthPx);
      const capHalf = outerWidth / 2;

      return {
        points: [cutIn.x, cutIn.y, corner.x, corner.y, cutOut.x, cutOut.y],
        startCapPoints: [
          startCapCenter.x - inPerp.x * capHalf,
          startCapCenter.y - inPerp.y * capHalf,
          startCapCenter.x + inPerp.x * capHalf,
          startCapCenter.y + inPerp.y * capHalf,
        ],
        endCapPoints: [
          endCapCenter.x - outPerp.x * capHalf,
          endCapCenter.y - outPerp.y * capHalf,
          endCapCenter.x + outPerp.x * capHalf,
          endCapCenter.y + outPerp.y * capHalf,
        ],
        outerColor,
        innerColor,
        outerWidth,
        innerWidth: widthPx,
        capStrokeWidth,
      };
    }, [elbow]);

    return (
      <>
        {/* Elbow outer outline. */}
        <Line
          points={visual.points}
          stroke={visual.outerColor}
          strokeWidth={visual.outerWidth}
          lineCap="butt"
          lineJoin="miter"
          shadowColor={isSelected ? "#fbbf24" : "transparent"}
          shadowBlur={isSelected ? 15 : 0}
          shadowOpacity={isSelected ? 1 : 0}
          shadowForStrokeEnabled={true}
          listening={false}
          perfectDrawEnabled={false}
        />

        {/* Elbow inner body without pipe center dash. */}
        <Line points={visual.points} stroke={visual.innerColor} strokeWidth={visual.innerWidth} lineCap="butt" lineJoin="miter" listening={false} perfectDrawEnabled={false} />

        {/* Elbow start cut outline. */}
        <Line points={visual.startCapPoints} stroke={visual.outerColor} strokeWidth={visual.capStrokeWidth} lineCap="butt" lineJoin="miter" listening={false} perfectDrawEnabled={false} />

        {/* Elbow end cut outline. */}
        <Line points={visual.endCapPoints} stroke={visual.outerColor} strokeWidth={visual.capStrokeWidth} lineCap="butt" lineJoin="miter" listening={false} perfectDrawEnabled={false} />
      </>
    );
  },
  (prev, next) => prev.elbow === next.elbow && prev.isSelected === next.isSelected,
);

// Renders elbow fittings.
const ElbowLayer = React.memo(function ElbowLayer({ elbows, selected }) {
  if (!elbows || elbows.length === 0) return <Layer listening={false} />;

  return (
    <Layer listening={false}>
      {elbows.map((elbow) => (
        <ElbowShape key={elbow.id} elbow={elbow} isSelected={selected?.itemId === elbow.id} />
      ))}
    </Layer>
  );
});

export default ElbowLayer;
