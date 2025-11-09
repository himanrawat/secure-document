import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServiceClient } from "@/lib/supabase/serverClient";
import { getSessionFromCookies } from "@/lib/auth/session";

type ReaderDocument = {
  id: string;
  title: string;
  locked: boolean;
  updated_at: string | null;
  files?: { name: string; url: string }[] | null;
};

export default async function ReaderDashboardPage() {
  const session = await getSessionFromCookies();
  if (!session || session.role !== "reader") {
    redirect("/login");
  }

  const supabase = supabaseServiceClient();
  const { data, error } = await supabase
    .from("reader_documents")
    .select("id,title,locked,updated_at,files")
    .eq("user_id", session.id)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("reader dashboard failed", error);
  }

  const documents = (data ?? []) as ReaderDocument[];

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-6 py-10 text-white">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Shared with you</p>
        <h1 className="text-3xl font-semibold">Your secure documents</h1>
        <p className="text-sm text-slate-400">
          Files appear here after the owner shares access with your account. Locked files cannot be opened until the owner unlocks them.
        </p>
      </header>

      {!documents.length && (
        <div className="rounded-3xl border border-white/10 bg-white/5 px-6 py-10 text-center text-sm text-slate-300">
          No documents yet. Ask the owner to share one with your email ({session.email}).
        </div>
      )}

      <div className="grid gap-4">
        {documents.map((doc) => (
          <article key={doc.id} className="glass-panel flex flex-col gap-4 px-5 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">{doc.title}</h2>
                <p className="text-xs text-slate-400">
                  Updated {doc.updated_at ? new Date(doc.updated_at).toLocaleString() : "recently"}
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs ${
                  doc.locked ? "bg-rose-500/20 text-rose-200" : "bg-emerald-500/20 text-emerald-100"
                }`}
              >
                {doc.locked ? "Locked" : "Open"}
              </span>
            </div>

            <div className="space-y-2 text-sm text-slate-200">
              {doc.files?.length ? (
                doc.files.map((file) => (
                  <div
                    key={`${doc.id}-${file.name}`}
                    className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/5 px-4 py-3"
                  >
                    <span>{file.name}</span>
                    {doc.locked ? (
                      <span className="text-xs text-slate-400">Unlock required</span>
                    ) : (
                      <Link
                        href={file.url}
                        target="_blank"
                        className="text-xs font-semibold text-cyan-300 underline"
                      >
                        View
                      </Link>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400">No files uploaded for this document yet.</p>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
