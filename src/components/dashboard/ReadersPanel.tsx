"use client";

import Image from "next/image";
import { useState } from "react";
import toast from "react-hot-toast";
import { ReaderSnapshot } from "@/lib/types/reader";

type Props = {
  readers: ReaderSnapshot[];
  onRefresh?: () => void;
};

export function ReadersPanel({ readers, onRefresh }: Props) {
  const [selected, setSelected] = useState<ReaderSnapshot | null>(null);
  const [erasing, setErasing] = useState(false);

  if (!readers.length) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 px-6 py-8 text-center text-sm text-slate-300">
        No readers have verified their identity yet.
      </div>
    );
  }

  const grouped = readers.reduce<Record<string, ReaderSnapshot[]>>((acc, reader) => {
    acc[reader.documentId] = acc[reader.documentId] ?? [];
    acc[reader.documentId].push(reader);
    return acc;
  }, {});

  const handleDelete = async (viewerId: string) => {
    if (erasing) {
      return;
    }
    try {
      setErasing(true);
      const response = await fetch(`/api/readers/${viewerId}`, { method: "DELETE" });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? "Unable to delete reader data");
      }
      toast.success("Reader data deleted");
      setSelected(null);
      onRefresh?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to delete reader data";
      toast.error(message);
    } finally {
      setErasing(false);
    }
  };

  const renderDetailPanel = (reader: ReaderSnapshot) => {
    const location = reader.lastLocation;
    const logs = reader.logs ?? [];
    const violations = reader.violations ?? [];
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-8 backdrop-blur-sm">
        <div className="relative w-full max-w-3xl rounded-[32px] border border-white/10 bg-slate-900/90 px-8 py-8 text-slate-200 shadow-2xl">
          <button
            type="button"
            onClick={() => setSelected(null)}
            className="absolute right-5 top-5 rounded-full border border-white/10 px-3 py-1 text-xs text-slate-400 hover:border-white/40 hover:text-white"
          >
            Close
          </button>
          <header className="flex flex-col gap-2 pb-4">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Reader Details</p>
            <h2 className="text-2xl font-semibold text-white">{reader.name ?? "Unknown viewer"}</h2>
            <p className="text-sm text-slate-400">{reader.phone ?? "Phone not provided"}</p>
            <p className="text-xs text-slate-500">
              Verified {reader.verifiedAt ? new Date(reader.verifiedAt).toLocaleString() : "unknown time"}
            </p>
          </header>
          <div className="grid gap-4 md:grid-cols-2">
            <section className="rounded-2xl border border-white/5 bg-white/5 px-4 py-4 text-xs">
              <p className="text-[0.6rem] uppercase tracking-[0.3em] text-slate-400">Last location</p>
              {location ? (
                <div className="mt-2 space-y-1 text-slate-200">
                  <p>
                    {location.lat.toFixed(4)}, {location.lon.toFixed(4)}
                  </p>
                    <p className="text-slate-400">+/-{location.accuracy ?? 0}m</p>
                  <p className="text-slate-500">{new Date(location.capturedAt).toLocaleString()}</p>
                </div>
              ) : (
                <p className="mt-2 text-slate-400">No location captured.</p>
              )}
            </section>
            <section className="rounded-2xl border border-white/5 bg-white/5 px-4 py-4 text-xs">
              <p className="text-[0.6rem] uppercase tracking-[0.3em] text-slate-400">Recent logs</p>
              <div className="mt-3 space-y-2 text-slate-300">
                {logs.length ? (
                  logs.map((log) => (
                    <div key={log.id} className="rounded-xl border border-white/5 bg-black/40 px-3 py-2">
                      <p className="text-white">{log.event}</p>
                      <p className="text-[0.6rem] text-slate-500">{new Date(log.createdAt).toLocaleTimeString()}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-400">No logs synced yet.</p>
                )}
              </div>
            </section>
          </div>
          <section className="mt-6 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-white">Violations</p>
              <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-slate-400">
                {violations.length} recorded
              </span>
            </div>
            {violations.length ? (
              <div className="space-y-3">
                {violations.map((violation) => (
                  <div
                    key={violation.id}
                    className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-xs text-rose-50"
                  >
                    <p className="font-semibold">{violation.message}</p>
                    <p className="text-rose-100">{new Date(violation.occurredAt).toLocaleString()}</p>
                    {violation.photo && (
                      <Image
                        src={violation.photo}
                        alt="Violation evidence"
                        width={320}
                        height={180}
                        className="mt-2 rounded-xl border border-white/10 object-cover"
                        unoptimized
                      />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-100">
                No violations logged for this reader.
              </p>
            )}
          </section>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => handleDelete(reader.viewerId)}
              disabled={erasing}
              className="rounded-full border border-white/10 px-4 py-2 text-xs font-semibold text-rose-100 transition hover:border-rose-400 hover:text-rose-300 disabled:opacity-60"
            >
              {erasing ? "Deleting…" : "Delete reader data"}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const detailPanel = selected ? renderDetailPanel(selected) : null;

  return (
    <>
      <div className="space-y-6">
        {Object.entries(grouped).map(([documentId, records]) => (
          <section key={documentId} className="glass-panel flex flex-col gap-4 px-5 py-4">
            <header className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Document</p>
                <h3 className="text-lg font-semibold text-white">{records[0].documentTitle}</h3>
              </div>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-300">
                {records.length} reader{records.length > 1 ? "s" : ""}
              </span>
            </header>
            <div className="grid gap-4 md:grid-cols-2">
              {records.map((reader) => (
                <button
                  key={reader.viewerId + (reader.verifiedAt ?? 0)}
                  type="button"
                  onClick={() => setSelected(reader)}
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm text-slate-200 transition hover:border-cyan-400/60 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70"
                >
                  {reader.photo ? (
                    <Image
                      src={reader.photo}
                      alt="Reader"
                      width={64}
                      height={64}
                      className="rounded-2xl border border-white/10 object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-black/30 text-xs text-slate-400">
                      No photo
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-white">{reader.name ?? "Unknown viewer"}</p>
                    <p className="text-xs text-slate-400">{reader.phone ?? "Phone not provided"}</p>
                    <p className="text-[0.6rem] text-slate-500">
                      Verified at{" "}
                      {reader.verifiedAt ? new Date(reader.verifiedAt).toLocaleString() : "Unknown time"}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>

      {detailPanel}
    </>
  );
}
