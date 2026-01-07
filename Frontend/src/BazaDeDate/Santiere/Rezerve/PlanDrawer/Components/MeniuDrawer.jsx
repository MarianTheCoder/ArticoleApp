import React from 'react'

export default function MeniuDrawer({ currentDN, setCurrentDN, currentColor, setCurrentColor }) {
    return (
        <div className="absolute right-3 top-3 z-50 bg-slate-900 text-white rounded-xl shadow-xl w-[19rem] flex flex-col px-6 py-3 text-base  pointer-events-auto" >
            <div className="text-lg uppercase tracking-widest mb-5 text-slate-400">
                Meniu
            </div>
            {/* DN in mm -> stroke width */}
            <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center ">
                    <span className="text-base text-white">
                        Diametru țeavă
                    </span>
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            value={currentDN}
                            onChange={(e) => {
                                const val = e.target.value;
                                if (/^\d*$/.test(val)) {
                                    setCurrentDN(Number(val));
                                }
                            }
                            }
                            className=" w-16 bg-slate-800  text-center border border-slate-600 rounded-lg   text-base outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                            placeholder="32"
                        />
                        <span className="text-xs text-white">
                            (mm)
                        </span>
                    </div>
                </div>

                {/* single color */}
                <div className="flex justify-between items-center ">
                    <span className="text-base text-white">
                        Pipe color
                    </span>
                    <div className="flex items-center gap-2">
                        <input
                            type="color"
                            value={currentColor}
                            onChange={(e) => setCurrentColor(e.target.value)}
                            className=" w-12 h-6 rounded border border-slate-600 bg-transparent p-0 cursor-pointer"
                        />
                        <span className="text-base font-mono text-white">
                            {currentColor}
                        </span>
                    </div>
                </div>
            </div>

        </div>
    )
}
