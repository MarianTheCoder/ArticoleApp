import React, { useMemo, useId } from "react";

export default function GradientFA({
    icon,
    size = 24,
    className = "",
    colors = ["#002B7F", "#FCD116", "#CE1126"], // default Romania
    angleDeg = 90,
    flagMode = false,      // true = solid flag bands
    verticalFlag = false,  // false = left→right, true = top→bottom
}) {
    const [w, h, , , pathData] = icon.icon;
    const paths = Array.isArray(pathData) ? pathData : [pathData];
    const clipId = useId().replace(/:/g, "");

    // Gradient mask (for non-flag mode)
    const maskUrl = useMemo(() => {
        const d = paths.join(" ");
        const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${w} ${h}'><path d='${d}' fill='black'/></svg>`;
        return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
    }, [icon]);

    if (!flagMode) {
        // === Normal gradient fill with mask ===
        const style = {
            width: size,
            height: size,
            backgroundImage: `linear-gradient(${angleDeg}deg, ${colors.join(",")})`,
            WebkitMaskImage: maskUrl,
            maskImage: maskUrl,
            WebkitMaskRepeat: "no-repeat",
            maskRepeat: "no-repeat",
            WebkitMaskSize: "contain",
            maskSize: "contain",
            WebkitMaskPosition: "center",
            maskPosition: "center",
            display: "inline-block",
        };
        return <span style={style} className={className} />;
    }

    // === Flag bands (solid colors clipped by path) ===
    return (
        <svg
            viewBox={`0 0 ${w} ${h}`}
            width={size}
            height={size}
            className={className}
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
            focusable="false"
            style={{ display: "inline-block", verticalAlign: "middle" }}
        >
            <defs>
                <clipPath id={clipId}>
                    {paths.map((d, i) => (
                        <path key={i} d={d} />
                    ))}
                </clipPath>
            </defs>

            <g clipPath={`url(#${clipId})`}>
                {verticalFlag ? (
                    <>
                        <rect x="0" y="0" width={w} height={h / 3} fill={colors[0]} />
                        <rect x="0" y={h / 3} width={w} height={h / 3} fill={colors[1]} />
                        <rect x="0" y={(2 * h) / 3} width={w} height={h / 3} fill={colors[2]} />
                    </>
                ) : (
                    <>
                        <rect x="0" y="0" width={w / 3} height={h} fill={colors[0]} />
                        <rect x={w / 3} y="0" width={w / 3} height={h} fill={colors[1]} />
                        <rect x={(2 * w) / 3} y="0" width={w / 3} height={h} fill={colors[2]} />
                    </>
                )}
            </g>
        </svg>
    );
}