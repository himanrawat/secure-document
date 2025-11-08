"use client";

import { useMemo } from "react";
import toast from "react-hot-toast";
import { DashboardDocument } from "@/components/dashboard/DocumentBuilder";

type Props = {
  documents: DashboardDocument[];
};

export function DocumentsList({ documents }: Props) {
  const formatted = useMemo(
    () =>
      documents.map((doc) => ({
        ...doc,
        createdAtLabel: doc.createdAt ? new Date(doc.createdAt).toLocaleString() : "—",
      })),
    [documents],
  );

  const copy = async (value: string) => {
    await navigator.clipboard.writeText(value);
    toast.success("Copied");
  };

  if (!documents.length) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 px-6 py-8 text-center text-sm text-slate-300">
        Secure documents will appear here after you publish them.
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {formatted.map((doc) => (
        <article key={doc.documentId} className="glass-panel flex flex-col gap-3 px-5 py-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">{doc.title}</h3>
              <span className="text-xs text-slate-400">{doc.createdAtLabel}</span>
            </div>
            <p className="text-sm text-slate-300">{doc.description}</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => copy(doc.documentId)}
              className="rounded-full border border-white/10 px-3 py-1 text-xs text-white"
            >
              Copy link
            </button>
            {doc.otp && (
              <button
                type="button"
                onClick={() => copy(doc.otp!)}
                className="rounded-full border border-white/10 px-3 py-1 text-xs text-white"
              >
                Copy OTP ({doc.otp})
              </button>
            )}
            {doc.fileUrl && (
              <a
                href={doc.fileUrl}
                target="_blank"
                className="rounded-full border border-white/10 px-3 py-1 text-xs text-white"
              >
                Preview file
              </a>
            )}
          </div>

          {doc.identityRequirement?.required && (
            <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
              Identity required
              {doc.identityRequirement.expectedName && (
                <span> • Expected: {doc.identityRequirement.expectedName}</span>
              )}
              {doc.identityRequirement.expectedPhone && (
                <span> ({doc.identityRequirement.expectedPhone})</span>
              )}
              {doc.identityRequirement.enforceMatch && <span> • Must match owner records</span>}
            </div>
          )}

          <div className="grid gap-2 text-xs text-slate-300 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/5 bg-white/5 px-3 py-2">
              <p className="text-[0.6rem] uppercase tracking-[0.3em] text-slate-400">Security Level</p>
              <p className="text-base text-white">{doc.permissions.securityLevel}</p>
            </div>
            <div className="rounded-2xl border border-white/5 bg-white/5 px-3 py-2">
              <p className="text-[0.6rem] uppercase tracking-[0.3em] text-slate-400">Expires</p>
              <p className="text-base text-white">
                {doc.permissions.expiryDate ? new Date(doc.permissions.expiryDate).toLocaleString() : "—"}
              </p>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
