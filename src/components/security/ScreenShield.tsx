"use client";

import { useEffect } from "react";
import { initScreenGuards } from "@/lib/security/screen";
import { ViolationCode } from "@/lib/types/security";

type Props = {
  onViolation: (code: ViolationCode, context?: Record<string, unknown>) => void;
  onFocusChange: (state: boolean) => void;
  focusLost: boolean;
};

export function ScreenShield({ onViolation, onFocusChange, focusLost }: Props) {
  const status = focusLost ? "Viewer focus lost" : "Monitoring display cortex";

  useEffect(() => {
    const cleanup = initScreenGuards({
      onViolation,
      onFocusChange,
    });
    return cleanup;
  }, [onFocusChange, onViolation]);

  return (
    <div className="glass-panel flex flex-col gap-2 px-5 py-4 text-sm text-slate-200">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-white">Screen Shield</p>
        <span
          className={`rounded-full px-3 py-1 text-xs ${
            focusLost ? "bg-rose-500/20 text-rose-100" : "bg-emerald-500/15 text-emerald-100"
          }`}
        >
          {focusLost ? "Blur enforced" : "Secure focus"}
        </span>
      </div>
      <p className="text-xs text-slate-400">
        Screenshot, screen share, and developer tools attempts are monitored in real time. Alt-Tab
        triggers blur + black overlay.
      </p>
      <p className="text-xs text-slate-300">{status}</p>
    </div>
  );
}
