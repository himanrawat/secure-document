"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "", role: "owner" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      setLoading(true);
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to create account");
      }
      toast.success("Account created. Please sign in.");
      router.push("/login");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to signup");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 to-slate-950 px-6 py-12">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md space-y-6 rounded-3xl border border-white/10 bg-white/5 px-8 py-10 text-white"
      >
        <header className="space-y-2 text-center">
          <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Owner Portal</p>
          <h1 className="text-3xl font-semibold">Create account</h1>
          <p className="text-sm text-slate-400">Only trusted admins should have access.</p>
        </header>

        <div className="space-y-2">
          <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Email</label>
          <input
            type="email"
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm focus:border-cyan-400 focus:outline-none"
            value={form.email}
            onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Password</label>
          <input
            type="password"
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm focus:border-cyan-400 focus:outline-none"
            value={form.password}
            onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Role</label>
          <select
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm focus:border-cyan-400 focus:outline-none"
            value={form.role}
            onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value }))}
          >
            <option value="owner">Owner</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-3xl bg-cyan-500 px-6 py-4 text-sm font-semibold uppercase tracking-[0.3em] text-slate-900 disabled:opacity-60"
        >
          {loading ? "Creating..." : "Sign up"}
        </button>

        <p className="text-center text-xs text-slate-400">
          Already have access?{" "}
          <Link href="/login" className="text-cyan-300 underline">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
