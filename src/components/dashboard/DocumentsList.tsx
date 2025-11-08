"use client";

import { useMemo } from "react";
import toast from "react-hot-toast";
import { DashboardDocument } from "@/components/dashboard/DocumentBuilder";

type Props = {
  documents: DashboardDocument[];
  onRefresh?: () => void;
};

export function DocumentsList({ documents, onRefresh }: Props) {
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

  const unlock = async (documentId: string) => {
    try {
      const response = await fetch(`/api/documents/${documentId}/unlock`, { method: "POST" });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? "Unable to unlock document");
      }
      toast.success("Document unlocked");
      onRefresh?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to unlock document";
      toast.error(message);
    }
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

          {doc.locked && (
            <div className="flex flex-col gap-2 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-100">
              <p>
                Locked: {doc.lockedReason ?? "Security violation detected"}{" "}
                {doc.lockedAt && (
                  <span className="text-rose-200">({new Date(doc.lockedAt).toLocaleString()})</span>
                )}
              </p>
              <button
                type="button"
                onClick={() => unlock(doc.documentId)}
                className="self-start rounded-full border border-rose-200/40 px-3 py-1 text-[0.7rem] font-semibold text-white transition hover:border-rose-200 hover:text-rose-200"
              >
                Unlock for receivers
              </button>
            </div>
          )}

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
