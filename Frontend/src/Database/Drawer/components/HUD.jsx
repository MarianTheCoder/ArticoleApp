import React from "react";
import { formatMeters, formatPx, pxToMeters } from "../engine/geometry/units.js";
import { distance, normalizeAngleDeg, vectorFromPoints, vectorToDeg } from "../engine/geometry/vector.js";

export default function HUD({ plan, cursorImagePoint, tool, pipeWidthPx, metersPerPx, drawingState }) {
  const draft = drawingState.activeDraft;
  const draftStart = draft?.startRaw || draft?.start;
  const draftEnd = draft?.endRaw || draft?.end;
  const draftMetrics =
    draft?.type === "pipeDraft" && draftStart && draftEnd
      ? {
          lengthPx: distance(draftStart, draftEnd),
          lengthM: pxToMeters(distance(draftStart, draftEnd), metersPerPx),
          angleDeg: normalizeAngleDeg(vectorToDeg(vectorFromPoints(draftStart, draftEnd))),
        }
      : null;

  return (
    <div className="pointer-events-none absolute left-3 bottom-3 z-50 max-w-md rounded-xl border border-slate-700 bg-slate-900/90 px-4 py-3 text-xs text-slate-200 shadow-xl">
      <div className="mb-2 text-sm font-bold text-white">{plan?.title || "Plan"}</div>

      <div className="grid grid-cols-[120px_1fr] gap-x-3 gap-y-1">
        <span className="text-slate-400">Plan px</span>
        <span className="font-mono">
          {plan?.width_px} × {plan?.height_px}
        </span>

        <span className="text-slate-400">Scale</span>
        <span className="font-mono">{plan?.scale_label || "—"}</span>

        <span className="text-slate-400">meters/px</span>
        <span className="font-mono">{metersPerPx || "—"}</span>

        <span className="text-slate-400">Cursor image</span>
        <span className="font-mono">{cursorImagePoint ? `${cursorImagePoint.x.toFixed(2)}, ${cursorImagePoint.y.toFixed(2)}` : "—"}</span>

        <span className="text-slate-400">Tool</span>
        <span className="font-mono">
          {tool.mode} / DN {tool.dn}
        </span>

        <span className="text-slate-400">Pipe width</span>
        <span className="font-mono">{formatPx(pipeWidthPx)}</span>

        <span className="text-slate-400">Draft length</span>
        <span className="font-mono">{draftMetrics ? `${formatMeters(draftMetrics.lengthM)} / ${formatPx(draftMetrics.lengthPx)}` : "—"}</span>

        <span className="text-slate-400">Draft angle</span>
        <span className="font-mono">{draftMetrics ? `${draftMetrics.angleDeg.toFixed(1)} deg` : "—"}</span>

        <span className="text-slate-400">Items</span>
        <span className="font-mono">{drawingState.itemIds.length}</span>

        <span className="text-slate-400">Connections</span>
        <span className="font-mono">{drawingState.connectionIds.length}</span>

        <span className="text-slate-400">Selected</span>
        <span className="font-mono">{drawingState.selected?.itemId || "—"}</span>

        <span className="text-slate-400">Last click</span>
        <span className="font-mono">{drawingState.debug?.lastClick ? `${drawingState.debug.lastClick.x.toFixed(2)}, ${drawingState.debug.lastClick.y.toFixed(2)}` : "—"}</span>
      </div>
    </div>
  );
}
