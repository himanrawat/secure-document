"use client";

import { useEffect, useMemo, useState } from "react";
import {
	SecureDocument,
	SessionStatus,
	ViolationEvent,
} from "@/lib/types/security";

type Props = Readonly<{
	session: SessionStatus;
	document: SecureDocument;
	violations: ViolationEvent[];
	revokedReason: string | null;
	onKill: () => void;
}>;

export function SessionHud({
	session,
	document,
	violations,
	revokedReason,
	onKill,
}: Props) {
	const [remainingMs, setRemainingMs] = useState(() =>
		Math.max(0, session.expiresAt - Date.now())
	);

	useEffect(() => {
		const interval = window.setInterval(() => {
			setRemainingMs(Math.max(0, session.expiresAt - Date.now()));
		}, 1000);
		return () => window.clearInterval(interval);
	}, [session.expiresAt]);

	const countdown = useMemo(() => {
		const minutes = Math.floor(remainingMs / 1000 / 60);
		const seconds = Math.floor((remainingMs / 1000) % 60)
			.toString()
			.padStart(2, "0");
		return `${minutes}:${seconds}`;
	}, [remainingMs]);

	const isRevoked = revokedReason !== null || !session.active;

	return (
		<aside className="glass-panel flex flex-col gap-4 px-5 py-4 text-sm text-slate-200">
			<div className="flex items-center justify-between">
				<div>
					<p className="text-xs uppercase tracking-[0.3em] text-slate-400">
						Session
					</p>
					<p
						className="text-xl font-semibold text-white"
						suppressHydrationWarning
					>
						{countdown}
					</p>
				</div>
				<button
					className="rounded-full border border-rose-400/60 px-4 py-2 text-xs font-semibold text-rose-200 transition hover:bg-rose-500/10"
					onClick={onKill}
					disabled={isRevoked}
				>
					Remote Kill
				</button>
			</div>
			<div className="grid grid-cols-2 gap-3 text-xs">
				<div className="rounded-2xl border border-white/5 bg-white/5 px-3 py-3">
					<p className="text-[0.6rem] uppercase text-slate-400">
						Security Level
					</p>
					<p className="text-base font-semibold text-white">
						{document.permissions.securityLevel}
					</p>
				</div>
				<div className="rounded-2xl border border-white/5 bg-white/5 px-3 py-3">
					<p className="text-[0.6rem] uppercase text-slate-400">Max Views</p>
					<p className="text-base font-semibold text-white">
						{document.permissions.maxViews}
					</p>
				</div>
			</div>
			<div className="rounded-2xl border border-white/5 bg-slate-950/40 px-4 py-3 text-xs text-slate-300">
				{isRevoked ? (
					<span className="text-rose-200">
						{revokedReason ?? "Session revoked"}
					</span>
				) : violations.length ? (
					<span>{violations[0].description}</span>
				) : (
					<span>
						Viewer compliant. Camera tracking + heartbeat (
						{session.heartbeatMs / 1000}s) stay active.
					</span>
				)}
			</div>
		</aside>
	);
}
