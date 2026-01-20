import React from 'react';

export default function SpinnerElement({ text = 1 }) {
  return (
    <div className="absolute inset-0 bg-black/30 z-[500] flex flex-col items-center justify-center">
      {/* Spinner */}
      <div className={` ${text == 3 ? "w-24 h-24 border-[5px]" : text == 2 ? "w-16 h-16 border-[4px]" : "w-12 h-12 border-[3px]"}  border-primary border-t-transparent rounded-full animate-spin drop-shadow-lg`}></div>

      {/* Text container */}
      <div className={` ${text == 3 ? "mt-8 px-6 py-2 text-xl" : text == 2 ? "mt-6 px-4 py-1 text-lg" : "mt-4 px-2 py-1 text-sm"} rounded-lg bg-black/60 backdrop-blur-md shadow-lg border border-white/20`}>
        <div className="relative font-semibold  select-none">
          <span className="text-white/90 shimmer-text">Se încarcă...</span>
        </div>
      </div>

      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .shimmer-text {
          position: relative;
          background: linear-gradient(90deg, #ffffff 0%, #1448e6 25%, #06b6d4 50%, #1448e6 75%, #ffffff 100%);
          background-size: 300% auto;
          color: #fff;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shimmer 5s linear infinite;
          font-weight: 700;
        }
      `}</style>
    </div>
  );
}