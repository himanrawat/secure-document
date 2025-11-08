import Link from "next/link";
import { ArrowRight, ShieldCheck, Video, Zap } from "lucide-react";
import { OtpAccessPanel } from "@/components/receiver/OtpAccessPanel";

const pillars = [
  {
    title: "Screen & Display Security",
    bullets: [
      "Screen record/share detection with immediate lockout",
      "Screenshot trap + attempt logging with evidence photo",
      "Focus loss blur, Alt-Tab blackout, DevTools auto-close",
    ],
  },
  {
    title: "Camera Intelligence",
    bullets: [
      "Continuous face locking (face scan optional, tracking mandatory)",
      "Obstruction + external phone/camera detection, triggers destroy",
      "Liveness, presence count, environment deltas",
    ],
  },
  {
    title: "Content Protection",
    bullets: [
      "AES-256 encrypted blobs + zero-knowledge pipelines",
      "Dynamic watermark with session, IP, countdown metadata",
      "Copy/print/download disabled with DOM integrity sweeps",
    ],
  },
  {
    title: "Governance & Monitoring",
    bullets: [
      "View/time/device/IP policies, concurrent session guard",
      "WebSocket live sessions, webhook & email notifications",
      "Remote kill switch + forensic audit trail exports",
    ],
  },
];

export default function Home() {
  return (
    <div className="relative isolate min-h-screen overflow-hidden px-6 py-12 sm:px-16">
      <div className="secure-grid" aria-hidden />
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-12">
        <section className="grid gap-8 rounded-[32px] border border-white/5 bg-white/5 p-8 text-white lg:grid-cols-2">
          <div className="flex flex-col gap-4">
            <p className="text-sm uppercase tracking-[0.4em] text-slate-400">AegisDocs Portal</p>
            <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
              Share zero-leakage documents. Enforce camera guardianship, watermarking, and OTP gates.
            </h1>
            <p className="text-lg text-slate-300">
              Every recipient must enter the owner-generated OTP. Once unlocked, our viewer forces fullscreen,
              blocks screen recording, and streams camera/location telemetry back to you in real time.
            </p>
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-4 py-2 text-emerald-200">
                <ShieldCheck className="size-4" />
                OTP + camera lock enforced
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-slate-900/70 px-4 py-2 text-slate-200">
                <Video className="size-4 text-sky-300" />
                Fullscreen exit = revoke prompt
              </span>
            </div>
            <div className="flex gap-3">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 rounded-full bg-cyan-500 px-6 py-3 text-base font-semibold text-slate-900 transition hover:bg-cyan-400"
              >
                Build a secure doc
                <ArrowRight className="size-4" />
              </Link>
              <Link
                href="#policies"
                className="inline-flex items-center rounded-full border border-white/20 px-6 py-3 text-base font-semibold text-white hover:bg-white/10"
              >
                Review safeguards
              </Link>
            </div>
          </div>
          <OtpAccessPanel />
        </section>

        <section id="policies" className="grid gap-6 md:grid-cols-2">
          {pillars.map((pillar) => (
            <article key={pillar.title} className="glass-panel flex h-full flex-col gap-4 px-6 py-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white">{pillar.title}</h2>
                <Zap className="size-5 text-cyan-300" />
              </div>
              <ul className="space-y-3 text-sm text-slate-200">
                {pillar.bullets.map((bullet) => (
                  <li key={bullet} className="flex gap-2">
                    <span className="mt-1 size-1.5 rounded-full bg-cyan-400" />
                    {bullet}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </section>

        <section className="glass-panel px-6 py-8">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Receiver Flow</p>
              <h3 className="mt-3 text-2xl font-semibold text-white">
                1) Owner uploads + sets OTP. 2) Receiver enters OTP. 3) Fullscreen secure viewer locks all
                exits.
              </h3>
            </div>
            <div className="rounded-2xl border border-slate-600/30 bg-slate-950/60 p-5 text-xs text-slate-300">
              <pre className="whitespace-pre-wrap text-[0.7rem] leading-6">
{`{
  "otp": "AX3F9K",
  "policies": {
    "cameraEnforcement": true,
    "downloadDisabled": true,
    "locationTracking": true
  }
}`}
              </pre>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
