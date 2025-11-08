import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6 text-slate-200">
      <div className="glass-panel max-w-md space-y-4 px-6 py-6 text-center">
        <h1 className="text-2xl font-semibold text-white">Document not found</h1>
        <p className="text-sm text-slate-300">
          Either the link expired, the session was revoked, or the identifier is invalid.
        </p>
        <Link
          className="inline-flex items-center justify-center rounded-full bg-cyan-500 px-6 py-2 text-sm font-semibold text-slate-950"
          href="/"
        >
          Return to command deck
        </Link>
      </div>
    </div>
  );
}
