// src/components/Rezerve/PlanView/Pin.jsx
import React from "react";
import { Group, Circle, RegularPolygon, Text } from "react-konva";

const Pin = React.memo(function Pin({
    x, y, label, color = "#e11d48", onClick,
    opacity = 1, invScale = 1, showBang = false
}) {
    const R = 60, fontSize = 40;
    const clampedScale = Math.max(0.5, Math.min(invScale, 2.5));

    const bodyRef = React.useRef(null);

    // ✅ cache only the heavy body (circle + triangle + text)
    React.useEffect(() => {
        const body = bodyRef.current;
        if (!body) return;
        body.cache({ pixelRatio: 2 });
        body.draw();
    }, [label, color]); // don't recache on showBang

    return (
        <Group
            x={x}
            y={y}
            opacity={opacity}
            scaleX={clampedScale}
            scaleY={clampedScale}
            offsetY={90}
            onTap={onClick}
            onContextMenu={(e) => { e.evt.preventDefault(); e.cancelBubble = true; }}
            onMouseOver={(e) => e.target.getStage().container().style.cursor = 'pointer'}
            onMouseLeave={(e) => e.target.getStage().container().style.cursor = 'default'}
            perfectDrawEnabled={false}
            shadowForStrokeEnabled={false}
        >
            {/* 🚀 cached body (no clipping issues) */}
            <Group ref={bodyRef} listening={true} onClick={onClick}
            >
                <Circle radius={R} fill={color} stroke="white" strokeWidth={5} shadowBlur={6} />
                <RegularPolygon sides={3} radius={R * 0.6} fill={color} y={R} rotation={180} />
                <Text
                    text={String(label ?? "")}
                    fontSize={fontSize}
                    fontStyle="bold"
                    fill="white"
                    x={-R}
                    y={-fontSize / 2}
                    width={R * 2}
                    height={fontSize}
                    align="center"
                    verticalAlign="middle"
                    listening={false}
                    perfectDrawEnabled={false}
                />
            </Group>

            {/* ❗ badge is a sibling, not cached, and non-listening so it never steals clicks */}
            {showBang && (
                <Group x={0} y={-R - 32} listening={false}>
                    <Circle radius={24} fill="#ef4444" />
                    <Text
                        text="!"
                        fontSize={32}
                        fontStyle="bold"
                        fill="white"
                        x={-14}
                        y={-12}
                        width={28}
                        height={28}
                        align="center"
                        verticalAlign="middle"
                        listening={false}
                        perfectDrawEnabled={false}
                    />
                </Group>
            )}


        </Group>
    );
}, (a, b) =>
    a.x === b.x &&
    a.y === b.y &&
    a.label === b.label &&
    a.color === b.color &&
    a.opacity === b.opacity &&
    a.invScale === b.invScale &&
    a.showBang === b.showBang
);

export default Pin;