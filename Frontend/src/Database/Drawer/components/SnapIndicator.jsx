import React from "react";
import { Circle, Layer } from "react-konva";

// Renders the active snap target marker.
const SnapIndicator = React.memo(function SnapIndicator({ snap, imageScale }) {
  if (!snap?.point) return <Layer listening={false} />;

  const scale = Number.isFinite(imageScale) && imageScale > 1e-9 ? imageScale : 1;
  const radius = 12 / scale;
  const strokeWidth = 2 / scale;
  const dotRadius = 3 / scale;

  return (
    <Layer listening={false}>
      <Circle
        x={snap.point.x}
        y={snap.point.y}
        radius={radius}
        stroke="#fbbf24"
        strokeWidth={strokeWidth}
        fill="rgba(251, 191, 36, 0.18)"
        listening={false}
        perfectDrawEnabled={false}
      />
      <Circle x={snap.point.x} y={snap.point.y} radius={dotRadius} fill="#fbbf24" listening={false} perfectDrawEnabled={false} />
    </Layer>
  );
});

export default SnapIndicator;
