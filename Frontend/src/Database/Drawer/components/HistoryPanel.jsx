import React from "react";

// Small undo/redo panel with recent operation log.
const HistoryPanel = React.memo(function HistoryPanel({ historyState, dispatchHistory }) {
  const canUndo = (historyState?.past?.length || 0) > 0;
  const canRedo = (historyState?.future?.length || 0) > 0;
  const entries = (historyState?.log || []).slice(0, 10);

  return (
    <div className="absolute right-3 top-[25rem] z-50 w-72 rounded-xl border border-slate-700 bg-slate-900 text-white shadow-xl">
      <div className="flex items-center justify-between border-b border-slate-700 px-4 py-3">
        <div className="text-sm font-bold uppercase tracking-widest text-slate-300">History</div>

        <div className="flex gap-2">
          <button
            type="button"
            disabled={!canUndo}
            onClick={() => dispatchHistory({ type: "UNDO" })}
            className="rounded-md border border-slate-600 px-2 py-1 text-xs text-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Undo
          </button>

          <button
            type="button"
            disabled={!canRedo}
            onClick={() => dispatchHistory({ type: "REDO" })}
            className="rounded-md border border-slate-600 px-2 py-1 text-xs text-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Redo
          </button>
        </div>
      </div>

      <div className="max-h-56 overflow-auto p-3 text-xs text-slate-300">
        {entries.length === 0 ? (
          <div className="text-slate-500">No operations</div>
        ) : (
          entries.map((entry) => (
            <div key={entry.id} className="border-b border-slate-800 py-2 last:border-b-0">
              <div className="truncate font-medium text-slate-200">{entry.label}</div>
              <div className="mt-1 font-mono text-[10px] text-slate-500">
                +{entry.addedItemIds.length} items, ~{entry.updatedItemIds.length}, +{entry.addedConnectionIds.length} conn
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
});

export default HistoryPanel;
