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

// Cache preview color variants.
const previewColorCache = new Map();

// Creates preview colors from selected pipe color.
function getPipeColors(baseColor) {
  const key = String(baseColor || "#008000").toLowerCase();

  if (previewColorCache.has(key)) return previewColorCache.get(key);

  const res = {
    outerColor: darken(key, 0.35),
    innerColor: lighten(key, 0.55),
    centerColor: darken(key, 0.25),
  };

  previewColorCache.set(key, res);

  return res;
}

// Renders temporary pipe draft.
const PreviewLayer = React.memo(function PreviewLayer({ draft }) {
  const preview = useMemo(() => {
    if (draft?.type !== "pipeDraft") return null;

    const start = draft.startPoint || draft.startRaw || draft.start;
    const end = draft.endPoint || draft.endRaw || draft.end;
    const { widthPx = 12, color = "#008000" } = draft;
    const { outerColor, innerColor, centerColor } = getPipeColors(color);

    const edgeWidth = Math.max(1.5, widthPx / 8);

    return {
      points: [start.x, start.y, end.x, end.y],
      outerColor,
      innerColor,
      centerColor,
      outerWidth: widthPx + 2 * edgeWidth,
      innerWidth: widthPx,
      centerWidth: Math.max(1, widthPx / 6),
      dash: [Math.max(20, widthPx * 2), Math.max(12, widthPx * 1.2)],
    };
  }, [draft]);

  return (
    <Layer listening={false}>
      {preview && (
        <>
          {/* Preview outer outline. */}
          <Line points={preview.points} stroke={preview.outerColor} strokeWidth={preview.outerWidth} opacity={0.65} lineCap="butt" lineJoin="miter" listening={false} perfectDrawEnabled={false} />

          {/* Preview inner body. */}
          <Line points={preview.points} stroke={preview.innerColor} strokeWidth={preview.innerWidth} opacity={0.65} lineCap="butt" lineJoin="miter" listening={false} perfectDrawEnabled={false} />

          {/* Preview center dashed line. */}
          <Line
            points={preview.points}
            stroke={preview.centerColor}
            strokeWidth={preview.centerWidth}
            dash={preview.dash}
            opacity={0.65}
            lineCap="butt"
            lineJoin="miter"
            listening={false}
            perfectDrawEnabled={false}
          />
        </>
      )}
    </Layer>
  );
});

export default PreviewLayer;
