"use client";

import { ActivityLog, ViolationEvent } from "@/lib/types/security";

type Props = {
  violations: ViolationEvent[];
  logs: ActivityLog[];
};

export function ViolationPanel({ violations, logs }: Props) {
  return (
    <section className="glass-panel flex flex-col gap-4 px-5 py-4 text-sm text-slate-200">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-white">Violations & Activity</p>
        <span className="rounded-full bg-slate-800/60 px-3 py-1 text-xs text-slate-300">
          {violations.length} issues
        </span>
      </div>
      <div className="space-y-3">
        {violations.slice(0, 3).map((violation) => (
          <div
            key={violation.id}
            className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-xs text-rose-50"
          >
            <p className="font-semibold">{violation.code}</p>
            <p className="text-rose-100">{violation.description}</p>
          </div>
        ))}
        {!violations.length && (
          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-100">
            No active violations logged for this session.
          </div>
        )}
      </div>
      <div className="mt-2">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Live logs</p>
        <div className="mt-2 space-y-2 text-xs text-slate-300">
          {logs.slice(0, 4).map((log) => (
            <div
              key={log.id}
              className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 px-3 py-2"
            >
              <span>{log.event}</span>
              <span className="text-[0.65rem] text-slate-500">{log.createdAt.split("T")[1]}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
