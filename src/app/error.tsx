"use client";

import React, { useEffect } from "react";
import { AlertCircle, RefreshCw, LogOut } from "lucide-react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("FINDR uncaught client error:", error);
  }, [error]);

  const handleResetSession = () => {
    try {
      localStorage.removeItem("findr_user");
    } catch {
      // Ignore
    }
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen bg-[#0d0a1a] flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-3xl border border-violet-500/30 bg-[#161228] p-8 text-center shadow-2xl shadow-purple-950/60">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-950/60 border border-violet-500/40 text-violet-400 mb-5">
          <AlertCircle className="h-7 w-7 text-violet-400" />
        </div>

        <h2 className="text-xl font-bold text-white">Something went wrong</h2>
        <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
          {error.message || "An unexpected error occurred while loading this view."}
        </p>

        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => reset()}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-violet-500 shadow-lg shadow-violet-900/30 min-h-[44px] sm:min-h-[38px]"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </button>
          <button
            onClick={handleResetSession}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800/40 px-4 py-2.5 text-xs font-semibold text-zinc-300 transition hover:bg-zinc-800 hover:text-white min-h-[44px] sm:min-h-[38px]"
          >
            <LogOut className="h-4 w-4" />
            Reset Session
          </button>
        </div>
      </div>
    </div>
  );
}
