"use client";

import Image from "next/image";
import { ReaderSnapshot } from "@/lib/types/reader";

type Props = {
  readers: ReaderSnapshot[];
};

export function ReadersPanel({ readers }: Props) {
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

  return (
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
              <article
                key={reader.viewerId + (reader.verifiedAt ?? 0)}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200"
              >
                <div className="flex items-center gap-3">
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
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
