// Components/MeasureInfo.jsx
import React from "react";
import angle from "../../../../../assets/svg/angle.svg";
import distance from "../../../../../assets/svg/distance.svg";
import distanceTotal from "../../../../../assets/svg/distanceTotal.svg";

export default function MeasureInfo({ info, cursorPos }) {
    if (!info || !cursorPos) return null;

    const { angleDeg, segLabel, totalLabel } = info;

    return (
        <div
            className="
                pointer-events-none
                absolute z-50
                bg-slate-900
                text-white
                rounded-xl
                px-4 py-3
                shadow-xl
                border border-slate-700/70
                backdrop-blur-base
                text-base
            "
            style={{
                left: cursorPos.x + 16,
                top: cursorPos.y - 80,
            }}
        >
            {/* Header */}
            <div className="text-base uppercase tracking-widest text-slate-400 mb-2">
                Măsurători
            </div>

            <div className="flex flex-col gap-2 whitespace-nowrap">
                {/* Current segment length */}
                <div className="flex items-center gap-2">
                    <img
                        src={distance}
                        alt="Segment length"
                        className="w-6 h-6 opacity-80"
                    />
                    <div className="flex  items-center">
                        <span className="text-base w-24 text-slate-300">Segment</span>
                        <span className="text-base font-mono text-emerald-300">
                            {segLabel}
                        </span>
                    </div>
                </div>

                {/* Total length */}
                <div className="flex  items-center  gap-2">
                    <img
                        src={distanceTotal}
                        alt="Total length"
                        className="w-6 h-6 opacity-80"
                    />
                    <div className="flex items-center">
                        <span className="text-base w-24 text-slate-300">Total</span>
                        <span className="text-base font-mono text-emerald-300">
                            {totalLabel}
                        </span>
                    </div>
                </div>
                {/* Angle */}
                <div className="flex items-center  gap-2">
                    <img
                        src={angle}
                        alt="Angle"
                        className="w-6 h-6 opacity-80"
                    />
                    <div className="flex items-center">
                        <span className="text-base w-24 text-slate-300">Unghi</span>
                        <span className="text-base font-mono text-emerald-300">
                            {angleDeg.toFixed(1)}°
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}