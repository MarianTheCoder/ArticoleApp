// Components/SnapIndicator.jsx
// Renders the snap indicator in the PreviewLayer.
// Point snap = solid circle. Line snap = cross/diamond. Nothing = nothing.
import React from "react";
import { Circle, Line } from "react-konva";

export default function SnapIndicator({ snapResult, PIPE_WIDTH }) {
  if (!snapResult?.snapped) return null;
  const { x, y } = snapResult.snapped;
  const isPoint = snapResult.type === "point";
  const radius = PIPE_WIDTH / 2;

  if (isPoint) {
    // solid circle with white fill — key point snap
    return (
      <>
        <Circle x={x} y={y} radius={radius} fill="white" listening={false} />
        <Circle x={x} y={y} radius={radius} stroke="#1a73e8" strokeWidth={2} fill="transparent" listening={false} />
        <Circle x={x} y={y} radius={radius / 3} fill="#1a73e8" listening={false} />
      </>
    );
  }

  // diamond / cross — line snap
  const s = radius;
  return (
    <>
      <Line points={[x - s, y, x, y - s, x + s, y, x, y + s, x - s, y]} closed stroke="#1a73e8" strokeWidth={1.5} fill="rgba(26,115,232,0.15)" listening={false} />
    </>
  );
}
