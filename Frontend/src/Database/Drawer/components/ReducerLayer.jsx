import React, { useMemo } from "react";
import { Layer, Shape } from "react-konva";
import { computeReducerGeometry } from "../engine/commands/reducerCommands.js";

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

// Draws one reducer using the old compensated 8-point geometry.
const ReducerShape = React.memo(
  function ReducerShape({ reducer, isSelected }) {
    const visual = useMemo(() => {
      const p0 = reducer.p0 || reducer.a;
      const p1 = reducer.p1 || reducer.b;
      const dIn = reducer.dIn || reducer.widthApx || 1;
      const dOut = reducer.dOut || reducer.widthBpx || 1;
      const anchor = reducer.anchor || reducer.rawPoint;
      const baseColor = reducer.color || reducer.colorStart || reducer.colorA || reducer.colorEnd || reducer.colorB || "#008000";
      const geo = computeReducerGeometry(p0, p1, dIn, dOut, anchor);

      return {
        geo,
        outerColor: darken(baseColor, 0.35),
        innerColor: lighten(baseColor, 0.45),
      };
    }, [reducer]);

    return (
      <Shape
        sceneFunc={(ctx, shape) => {
          const geo = visual.geo;

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
        }}
        fill={visual.innerColor}
        stroke={visual.outerColor}
        strokeWidth={visual.geo.border}
        lineJoin="miter"
        shadowColor={isSelected ? "#fbbf24" : "transparent"}
        shadowBlur={isSelected ? 15 : 0}
        shadowOpacity={isSelected ? 1 : 0}
        shadowForStrokeEnabled={true}
        listening={false}
        perfectDrawEnabled={false}
      />
    );
  },
  (prev, next) => prev.reducer === next.reducer && prev.isSelected === next.isSelected,
);

// Renders reducer items.
const ReducerLayer = React.memo(function ReducerLayer({ reducers, selected }) {
  if (!reducers || reducers.length === 0) return <Layer listening={false} />;

  return (
    <Layer listening={false}>
      {reducers.map((reducer) => (
        <ReducerShape key={reducer.id} reducer={reducer} isSelected={selected?.itemId === reducer.id} />
      ))}
    </Layer>
  );
});

export default ReducerLayer;
