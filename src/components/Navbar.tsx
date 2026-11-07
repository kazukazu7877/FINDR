import React from "react";

export function Navbar({ mode, setMode }: { mode: "user" | "staff"; setMode: (m: "user" | "staff") => void }) {
  return (
    <header className="border-b border-[#2d2254] bg-[#120c24]/90 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-violet-500/25">
            F
          </div>
          <div>
            <span className="font-bold text-lg text-white tracking-tight">FINDR</span>
            <span className="text-xs text-violet-400 block -mt-1 font-mono">Campus Intelligence</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-[#1a1235] p-1 rounded-lg border border-[#2d2254] flex gap-1">
            <button
              onClick={() => setMode("user")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                mode === "user"
                  ? "bg-violet-600 text-white shadow-md shadow-violet-600/30"
                  : "text-violet-300 hover:text-white"
              }`}
            >
              Student Mode
            </button>
            <button
              onClick={() => setMode("staff")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                mode === "staff"
                  ? "bg-purple-700 text-white shadow-md shadow-purple-700/30"
                  : "text-violet-300 hover:text-white"
              }`}
            >
              Staff Portal
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

