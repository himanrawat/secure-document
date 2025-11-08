"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export function OtpAccessPanel() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!code.trim()) {
      toast.error("Enter the secure code you received.");
      return;
    }
    const parseJson = async (response: Response) => {
      const text = await response.text();
      if (!text) return null;
      try {
        return JSON.parse(text);
      } catch {
        return null;
      }
    };

    try {
      setLoading(true);
      const response = await fetch("/api/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await parseJson(response);
      if (!response.ok) {
        throw new Error(data?.error ? String(data.error) : "Unable to verify code");
      }
      if (!data?.documentId) {
        throw new Error("Verification succeeded but no document returned.");
      }
      toast.success("Secure session unlocked. Preparing viewer…");
      if (data.requireIdentity) {
        router.push(`/viewer/${data.documentId}/verify`);
      } else {
        router.push(`/viewer/${data.documentId}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to verify code";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="glass-panel flex flex-col gap-4 rounded-3xl px-6 py-6 text-slate-100"
    >
      <div>
        <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Receiver Access</p>
        <h2 className="mt-1 text-2xl font-semibold text-white">Enter Your OTP</h2>
        <p className="mt-2 text-sm text-slate-300">
          Provided by the document owner. This code binds your camera, location, and session log to the
          document.
        </p>
      </div>
      <input
        type="text"
        value={code}
        onChange={(event) => setCode(event.target.value.toUpperCase())}
        placeholder="e.g. AX3F9K"
        className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center text-lg uppercase tracking-[0.3em] text-white focus:border-cyan-400 focus:outline-none"
        maxLength={12}
      />
      <button
        type="submit"
        disabled={loading}
        className="rounded-2xl bg-cyan-500 px-4 py-3 text-center text-sm font-semibold text-slate-900 transition hover:bg-cyan-400 disabled:opacity-60"
      >
        {loading ? "Validating…" : "Unlock Secure Viewer"}
      </button>
      <p className="text-xs text-slate-400">
        By unlocking, you consent to continuous camera verification, watermarking, and fullscreen enforcement.
      </p>
    </form>
  );
}
