import React from "react";

export default function MeniuDrawer({ currentDN, setCurrentDN, currentColor, setCurrentColor, mode, setMode }) {
  return (
    <div className="absolute right-3 top-3 z-50 bg-slate-900 text-white rounded-xl shadow-xl w-[19rem] flex flex-col px-6 py-4 text-base pointer-events-auto border border-slate-700">
      <div className="text-sm font-bold uppercase tracking-widest mb-4 text-slate-400">Mod de lucru</div>

      {/* ================= TOGGLE DRAW / SELECT ================= */}
      <div className="flex bg-slate-800 rounded-lg p-1 mb-6 border border-slate-700">
        <button
          onClick={() => setMode("draw")}
          className={`flex-1 py-1.5 text-sm font-bold rounded-md transition-all ${mode === "draw" ? "bg-blue-500 text-white shadow-md" : "text-slate-400 hover:text-white"}`}
        >
          ✏️ Desenare
        </button>
        <button
          onClick={() => setMode("select")}
          className={`flex-1 py-1.5 text-sm font-bold rounded-md transition-all ${mode === "select" ? "bg-amber-500 text-white shadow-md" : "text-slate-400 hover:text-white"}`}
        >
          👆 Selectare
        </button>
      </div>
      {/* ======================================================== */}

      <div className="text-sm font-bold uppercase tracking-widest mb-4 text-slate-400">Setări Țeavă</div>

      <div className="flex flex-col gap-4">
        {/* DN in mm -> stroke width */}
        <div className="flex justify-between items-center">
          <span className="text-base text-white">Diametru țeavă</span>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={currentDN}
              onChange={(e) => {
                const val = e.target.value;
                if (/^\d*$/.test(val)) {
                  setCurrentDN(Number(val));
                }
              }}
              className="w-16 bg-slate-800 text-center border border-slate-600 rounded-lg py-1 text-base outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
              placeholder="32"
            />
            <span className="text-xs text-slate-400">(mm)</span>
          </div>
        </div>

        {/* single color */}
        <div className="flex justify-between items-center">
          <span className="text-base text-white">Culoare</span>
          <div className="flex items-center gap-2">
            <input type="color" value={currentColor} onChange={(e) => setCurrentColor(e.target.value)} className="w-10 h-8 rounded border border-slate-600 bg-transparent p-0 cursor-pointer" />
            <span className="text-sm font-mono text-slate-300 w-16 text-right">{currentColor}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
