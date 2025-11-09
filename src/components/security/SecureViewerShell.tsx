"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	SecureDocument,
	SessionStatus,
	ViewerProfile,
} from "@/lib/types/security";
import { ReaderLocation } from "@/lib/types/reader";
import { useSecuritySession } from "@/hooks/useSecuritySession";
import { DocumentViewport } from "@/components/security/DocumentViewport";
import { CameraSentinel } from "@/components/security/CameraSentinel";
import { ScreenShield } from "@/components/security/ScreenShield";
import { WatermarkLayer } from "@/components/security/WatermarkLayer";

type SnapshotDirective = {
	id: string;
	reason: "presence" | "violation";
	metadata?: Record<string, unknown>;
};

type SnapshotResult = {
	photo: string | null;
	frameHash: string;
	directive: SnapshotDirective;
};

type Props = {
	document: SecureDocument;
	viewer: ViewerProfile;
	initialSession: SessionStatus;
};

export function SecureViewerShell({ document, viewer, initialSession }: Props) {
	const [devToolsOpen, setDevToolsOpen] = useState(false);
	const [devToolsChecked, setDevToolsChecked] = useState(false);

	const snapshotQueue = useRef<
		Array<{
			directive: SnapshotDirective;
			resolve: (result: SnapshotResult | null) => void;
		}>
	>([]);
	const activeResolverRef = useRef<
		((result: SnapshotResult | null) => void) | null
	>(null);
	const snapshotDirectiveRef = useRef<SnapshotDirective | null>(null);
	const [snapshotDirective, setSnapshotDirective] =
		useState<SnapshotDirective | null>(null);
	const lastLocationRef = useRef<ReaderLocation | null>(null);
	const capturePhotoPolicy = document.policies?.captureReaderPhoto ?? false;
	const trackLocation = document.policies?.locationTracking ?? false;
	const [cameraObstructed, setCameraObstructed] = useState(false);

	const pumpSnapshotQueue = useCallback(() => {
		if (snapshotDirectiveRef.current || snapshotQueue.current.length === 0) {
			return;
		}
		const next = snapshotQueue.current.shift();
		if (!next) {
			return;
		}
		snapshotDirectiveRef.current = next.directive;
		activeResolverRef.current = next.resolve;
		setSnapshotDirective(next.directive);
	}, []);

	// Check for DevTools open before rendering document
	useEffect(() => {
		const checkDevTools = () => {
			const widthGap = window.outerWidth - window.innerWidth;
			const heightGap = window.outerHeight - window.innerHeight;

			// DevTools detection: significant gap indicates DevTools is open
			if (widthGap > 200 || heightGap > 200) {
				setDevToolsOpen(true);
			}
			setDevToolsChecked(true);
		};

		// Check immediately and after a short delay to ensure accurate detection
		checkDevTools();
		const timer = setTimeout(checkDevTools, 100);

		return () => clearTimeout(timer);
	}, []);

	// Monitor for DOM manipulation attempts
	useEffect(() => {
		if (!devToolsChecked || devToolsOpen) return;

		const killSession = (reason: string) => {
			globalThis.document.body.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#0f172a;color:#ef4444;font-family:system-ui;text-align:center;padding:2rem"><div><h1 style="font-size:2rem;margin-bottom:1rem">Security Violation</h1><p>${reason}</p></div></div>`;
			globalThis.location.reload();
		};

		const mutationCallback = (mutations: MutationRecord[]) => {
			for (const mutation of mutations) {
				// Check if protected elements are being removed
				if (mutation.type === "childList") {
					for (const node of mutation.removedNodes) {
						if (node instanceof HTMLElement && node.dataset.securityOverlay) {
							killSession("DOM manipulation detected. Session terminated.");
							return;
						}
					}
				}
				// Check for style modifications to protected elements
				if (
					mutation.type === "attributes" &&
					mutation.attributeName === "style"
				) {
					const target = mutation.target;
					if (target instanceof HTMLElement && target.dataset.securityOverlay) {
						const currentDisplay = target.style.display;
						if (
							currentDisplay === "none" ||
							target.style.visibility === "hidden"
						) {
							killSession(
								"Attempted to bypass security controls. Session terminated."
							);
							return;
						}
					}
				}
			}
		};

		const observer = new MutationObserver(mutationCallback);
		observer.observe(globalThis.document.body, {
			childList: true,
			subtree: true,
			attributes: true,
			attributeFilter: ["style", "class"],
		});

		// Periodically verify security elements are intact
		const verifyInterval = setInterval(() => {
			const overlays = globalThis.document.querySelectorAll(
				"[data-security-overlay]"
			);
			if (overlays.length === 0 && cameraObstructed) {
				killSession("Security controls compromised. Session terminated.");
			}
		}, 1000);

		return () => {
			observer.disconnect();
			clearInterval(verifyInterval);
		};
	}, [devToolsChecked, devToolsOpen, cameraObstructed]);
	const requestSnapshot = useCallback(
		(reason: SnapshotDirective["reason"], metadata?: Record<string, unknown>) =>
			new Promise<SnapshotResult | null>((resolve) => {
				const directive: SnapshotDirective = {
					id: crypto.randomUUID(),
					reason,
					metadata,
				};
				snapshotQueue.current.push({ directive, resolve });
				pumpSnapshotQueue();
			}),
		[pumpSnapshotQueue]
	);

	const handleSnapshot = useCallback(
		(photo: string | null, frameHash: string, directive: SnapshotDirective) => {
			if (activeResolverRef.current) {
				activeResolverRef.current({ photo, frameHash, directive });
			}
			activeResolverRef.current = null;
			snapshotDirectiveRef.current = null;
			setSnapshotDirective(null);
			pumpSnapshotQueue();
		},
		[pumpSnapshotQueue]
	);

	const sendPresence = useCallback(
		async ({
			photo,
			frameHash,
			location,
			reason,
		}: {
			photo?: string | null;
			frameHash?: string | null;
			location?: ReaderLocation | null;
			reason: string;
		}) => {
			try {
				const payloadLocation = location ?? lastLocationRef.current;
				await fetch("/api/presence", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						documentId: document.documentId,
						photo: photo ?? null,
						frameHash: frameHash ?? null,
						location: payloadLocation
							? {
									...payloadLocation,
									capturedAt:
										payloadLocation.capturedAt ?? new Date().toISOString(),
							  }
							: null,
						reason,
					}),
				});
			} catch (error) {
				console.error("Presence sync failed", error);
			}
		},
		[document.documentId]
	);

	const captureViolationEvidence = useCallback(async () => {
		const snapshot = await requestSnapshot("violation");
		if (!snapshot || !snapshot.photo) {
			return null;
		}
		return {
			photo: snapshot.photo,
			frameHash: snapshot.frameHash,
			location: lastLocationRef.current,
		};
	}, [requestSnapshot]);

	const {
		session,
		camera,
		focusLost,
		watermark,
		updateCameraInsight,
		registerViolation,
		handleFocusChange,
		killSession,
	} = useSecuritySession({
		document,
		viewer,
		initialSession,
		requestEvidence: captureViolationEvidence,
	});
	const [fullscreenPrompt, setFullscreenPrompt] = useState(false);

	const stats = useMemo(
		() => ({
			personsDetected: camera?.personsDetected ?? 0,
			obstruction: camera?.obstructionScore ?? 0,
		}),
		[camera]
	);

	const requestFullscreen = useCallback(async () => {
		try {
			await window.document.documentElement.requestFullscreen();
			setFullscreenPrompt(false);
		} catch {
			setFullscreenPrompt(true);
		}
	}, []);

	useEffect(() => {
		const enforce = () => {
			if (!window.document.fullscreenElement) {
				setFullscreenPrompt(true);
				registerViolation("POLICY_BREACH", { reason: "fullscreen_exit" });
			} else {
				setFullscreenPrompt(false);
			}
		};
		const timer = window.setTimeout(() => {
			requestFullscreen();
		}, 0);
		window.document.addEventListener("fullscreenchange", enforce);
		return () => {
			window.clearTimeout(timer);
			window.document.removeEventListener("fullscreenchange", enforce);
		};
	}, [registerViolation, requestFullscreen]);

	useEffect(() => {
		if (!trackLocation) {
			return;
		}
		if (!("geolocation" in navigator)) {
			void sendPresence({ reason: "geolocation_unavailable" });
			return;
		}
		navigator.geolocation.getCurrentPosition(
			(pos) => {
				const location: ReaderLocation = {
					lat: pos.coords.latitude,
					lon: pos.coords.longitude,
					accuracy: pos.coords.accuracy,
					capturedAt: new Date().toISOString(),
				};
				lastLocationRef.current = location;
				void sendPresence({ location, reason: "geolocation" });
			},
			() => {
				void sendPresence({ reason: "geolocation_denied" });
			},
			{ timeout: 5000 }
		);
	}, [sendPresence, trackLocation]);

	useEffect(() => {
		if (!capturePhotoPolicy) {
			return;
		}
		let cancelled = false;
		requestSnapshot("presence").then((result) => {
			if (cancelled || !result || !result.photo) {
				return;
			}
			void sendPresence({
				photo: result.photo,
				frameHash: result.frameHash,
				reason: "presence_photo",
			});
		});
		return () => {
			cancelled = true;
		};
	}, [capturePhotoPolicy, requestSnapshot, sendPresence]);

	// Show blocking screen if DevTools detected before document loads
	if (devToolsChecked && devToolsOpen) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
				<div className="max-w-md space-y-6 rounded-xl border border-rose-500/40 bg-rose-500/5 p-8 text-center">
					<div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/20">
						<svg
							className="h-8 w-8 text-rose-400"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
							/>
						</svg>
					</div>
					<div className="space-y-2">
						<h1 className="text-2xl font-semibold text-white">
							Developer Tools Detected
						</h1>
						<p className="text-sm text-rose-100">
							This secure document cannot be accessed while browser developer
							tools are open.
						</p>
					</div>
					<div className="space-y-3 rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4 text-left text-xs text-rose-100">
						<p className="font-semibold">To continue:</p>
						<ol className="ml-4 list-decimal space-y-1">
							<li>Close the developer tools (F12 or Ctrl+Shift+I)</li>
							<li>Refresh this page</li>
							<li>Do not open developer tools while viewing the document</li>
						</ol>
					</div>
					<p className="text-xs text-slate-400">
						This security measure protects confidential content from
						unauthorized inspection.
					</p>
				</div>
			</div>
		);
	}

	// Show loading state while checking
	if (!devToolsChecked) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
				<div className="text-center">
					<div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-cyan-500/20 border-t-cyan-500"></div>
					<p className="mt-4 text-sm text-slate-400">
						Initializing secure session...
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 pb-16 pt-8">
			<WatermarkLayer lines={watermark.lines} opacity={watermark.opacity} />
			<div className="glass-panel relative z-10 border border-white/5 px-0 py-0">
				<DocumentViewport document={document} />
				{/* Security monitoring components (hidden from reader view) */}
				<div className="hidden">
					<CameraSentinel
						onInsight={(insight) =>
							updateCameraInsight(insight, setCameraObstructed)
						}
						onSnapshot={handleSnapshot}
						snapshotDirective={snapshotDirective}
						disabled={!session.active}
					/>
					<ScreenShield
						onViolation={registerViolation}
						onFocusChange={handleFocusChange}
						focusLost={focusLost}
					/>
				</div>
			</div>
			{focusLost && (
				<div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-slate-900/80 backdrop-blur-lg">
					<div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-8 py-6 text-center text-sm text-rose-100">
						Focus lost. Viewer blurred, recording attempts blocked. Return focus
						to continue.
					</div>
				</div>
			)}
			{cameraObstructed && (
				<div
					className="pointer-events-none absolute inset-0 z-25 bg-black"
					data-security-overlay="camera-obstruction"
				>
					<div className="flex h-full items-center justify-center">
						<div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-8 py-6 text-center text-sm text-rose-100">
							<p className="text-lg font-semibold">Camera Obstructed</p>
							<p className="mt-2 text-sm">
								Please remove any obstruction from the camera to continue
								viewing the document.
							</p>
						</div>
					</div>
				</div>
			)}
			{fullscreenPrompt && (
				<div className="absolute inset-0 z-30 flex items-center justify-center bg-black/80 backdrop-blur-xl">
					<div className="space-y-4 rounded-xl border border-white/10 bg-white/5 px-8 py-6 text-center text-white">
						<p className="text-lg font-semibold">Fullscreen required</p>
						<p className="text-sm text-slate-300">
							This document must remain in fullscreen. Return to secure mode or
							close the document now.
						</p>
						<div className="flex flex-wrap justify-center gap-3">
							<button
								onClick={requestFullscreen}
								className="rounded-full bg-cyan-500 px-5 py-2 text-sm font-semibold text-slate-900"
							>
								Return to fullscreen
							</button>
							<button
								onClick={() => killSession("Viewer exited secure fullscreen.")}
								className="rounded-full border border-white/20 px-5 py-2 text-sm"
							>
								Close document
							</button>
						</div>
					</div>
				</div>
			)}
			{!session.active && (
				<div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-black/90">
					<div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-8 py-6 text-center text-sm text-rose-100">
						Session revoked. All encrypted material destroyed. Owner and
						auditors notified.
					</div>
				</div>
			)}
			<dl className="grid grid-cols-2 gap-4 text-xs text-slate-300">
				<div className="rounded-2xl border border-white/5 bg-white/5 px-4 py-3">
					<dt className="text-[0.6rem] uppercase tracking-[0.3em] text-slate-400">
						Presence
					</dt>
					<dd className="text-lg font-semibold text-white">
						{stats.personsDetected}
					</dd>
				</div>
				<div className="rounded-2xl border border-white/5 bg-white/5 px-4 py-3">
					<dt className="text-[0.6rem] uppercase tracking-[0.3em] text-slate-400">
						Obstruction
					</dt>
					<dd className="text-lg font-semibold text-white">
						{Math.round(stats.obstruction * 100)}%
					</dd>
				</div>
			</dl>
		</div>
	);
}
