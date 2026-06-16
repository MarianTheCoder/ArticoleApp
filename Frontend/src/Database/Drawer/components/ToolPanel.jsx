import React from "react";
import { formatPx } from "../engine/geometry/units.js";

// DN options displayed in panel.
const DN_OPTIONS = [15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150, 200];

export default function ToolPanel({ tool, setTool, pipeWidthPx, metersPerPx }) {
  return (
    <div className="absolute right-3 top-3 z-50 w-72 rounded-xl border border-slate-700 bg-slate-900 text-white shadow-xl">
      <div className="border-b border-slate-700 px-4 py-3">
        <div className="text-sm font-bold uppercase tracking-widest text-slate-300">Pipe Tool</div>

        <div className="mt-1 text-xs text-slate-500">Real scale CAD overlay</div>
      </div>

      <div className="flex flex-col gap-4 p-4">
        {/* Active tool mode. */}
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Mode</span>

          <select
            value={tool.mode}
            onChange={(e) =>
              setTool((prev) => ({
                ...prev,
                mode: e.target.value,
              }))
            }
            className="rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-sm outline-none"
          >
            <option value="draw">Draw</option>
            <option value="select">Select</option>
          </select>
        </label>

        {/* Selected pipe DN. */}
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">DN</span>

          <select
            value={tool.dn}
            onChange={(e) =>
              setTool((prev) => ({
                ...prev,
                dn: Number(e.target.value),
              }))
            }
            className="rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-sm outline-none"
          >
            {DN_OPTIONS.map((dn) => (
              <option key={dn} value={dn}>
                DN {dn}
              </option>
            ))}
          </select>
        </label>

        {/* Selected pipe color. */}
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Color</span>

          <div className="flex items-center gap-3">
            <input
              type="color"
              value={tool.color}
              onChange={(e) =>
                setTool((prev) => ({
                  ...prev,
                  color: e.target.value,
                }))
              }
              className="h-10 w-14 cursor-pointer rounded border border-slate-600 bg-slate-800"
            />

            <input
              value={tool.color}
              onChange={(e) =>
                setTool((prev) => ({
                  ...prev,
                  color: e.target.value,
                }))
              }
              className="min-w-0 flex-1 rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-sm outline-none"
            />
          </div>
        </label>

        {/* Current scale info. */}
        <div className="rounded-lg border border-slate-700 bg-slate-800 p-3 text-xs text-slate-300">
          <div className="flex justify-between">
            <span>meters/px</span>
            <span className="">{metersPerPx || "—"}</span>
          </div>

          <div className="mt-1 flex justify-between">
            <span>real pipe width</span>
            <span className="">{formatPx(pipeWidthPx)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
