// Components/PreviewHover.jsx
import React, { useMemo } from "react";
import { Line } from "react-konva";

// --- color helpers ---
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

const hoverColorCache = new Map();
function getHoverColors(baseColor) {
  const key = baseColor.toLowerCase();
  if (hoverColorCache.has(key)) return hoverColorCache.get(key);
  const res = {
    outerColor: darken(baseColor, 0.35),
    innerColor: lighten(baseColor, 0.55),
    centerColor: darken(baseColor, 0.25),
  };
  hoverColorCache.set(key, res);
  return res;
}

// PreviewHover only re-renders when hoverPoint moves or active segment changes.
// It is intentionally NOT React.memo'd at the top level because hoverPoint
// changes on every mousemove — that's expected. What we DO memoize is the
// color derivation and the anchor lookup so those aren't recomputed each frame.
export default function PreviewHover({ hoverPoint, pipeSegments, PIPE_WIDTH, PIPE_COLOR, PIPE_EDGE, CENTER_WIDTH }) {
  // anchor: only changes on click, not on mousemove
  const anchor = useMemo(() => {
    if (!pipeSegments || pipeSegments.length === 0) return null;
    const last = pipeSegments[pipeSegments.length - 1];
    return last?.end ?? null;
  }, [pipeSegments]);

  // colors: only changes when PIPE_COLOR changes
  const { outerColor, innerColor, centerColor } = useMemo(() => getHoverColors(PIPE_COLOR || "#008000"), [PIPE_COLOR]);

  // widths: only change when PIPE_WIDTH changes
  const outerWidth = PIPE_WIDTH + 2 * PIPE_EDGE;
  const innerWidth = PIPE_WIDTH;
  const centerWidth = CENTER_WIDTH;

  if (!hoverPoint || !anchor) return null;

  const points = [anchor.x, anchor.y, hoverPoint.x, hoverPoint.y];

  return (
    <>
      <Line points={points} stroke={outerColor} strokeWidth={outerWidth} lineCap="round" lineJoin="round" opacity={0.25} listening={false} />
      <Line points={points} stroke={innerColor} strokeWidth={innerWidth} lineCap="round" lineJoin="round" opacity={0.4} listening={false} />
      <Line points={points} stroke={centerColor} strokeWidth={centerWidth} lineCap="round" lineJoin="round" dash={[20, 12]} opacity={0.6} listening={false} />
    </>
  );
}
