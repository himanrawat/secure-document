"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
	ActivityLog,
	CameraInsight,
	SecureDocument,
	SessionStatus,
	ViewerProfile,
	ViolationCode,
	ViolationEvent,
} from "@/lib/types/security";
import { ReaderLocation } from "@/lib/types/reader";
import {
	createLog,
	createViolation,
	shouldRevokeSession,
} from "@/lib/security/session";
import { buildWatermarkPayload } from "@/lib/security/watermark";
import { MonitoringNotifier } from "@/lib/monitoring/notifier";
import { readableViolation } from "@/lib/security/events";

type EvidencePayload = {
	photo?: string | null;
	frameHash?: string | null;
	location?: ReaderLocation | null;
};

type UseSecuritySessionParams = {
	document: SecureDocument;
	viewer: ViewerProfile;
	initialSession: SessionStatus;
	requestEvidence?: (code: ViolationCode) => Promise<EvidencePayload | null>;
};

export function useSecuritySession({
	document,
	viewer,
	initialSession,
	requestEvidence,
}: UseSecuritySessionParams) {
	const [session, setSession] = useState<SessionStatus>(initialSession);
	const [camera, setCamera] = useState<CameraInsight | null>(null);
	const [logs, setLogs] = useState<ActivityLog[]>(document.logs);
	const [violations, setViolations] = useState<ViolationEvent[]>(
		document.violations
	);
	const [focusLost, setFocusLost] = useState(false);
	const [revokedReason, setRevokedReason] = useState<string | null>(null);
	const lockRequestedRef = useRef(false);

	const watermark = useMemo(
		() =>
			buildWatermarkPayload(document, session, {
				ip: viewer.device.ipAddress,
				viewerId: viewer.viewerId,
			}),
		[document, session, viewer]
	);

	const pushLog = useCallback(
		(event: ActivityLog["event"], context?: Record<string, unknown>) => {
			setLogs((prev) =>
				[
					createLog(document.documentId, viewer.viewerId, event, context),
					...prev,
				].slice(0, 32)
			);
			MonitoringNotifier.log({
				documentId: document.documentId,
				viewerId: viewer.viewerId,
				event,
				context,
			});
		},
		[document.documentId, viewer.viewerId]
	);

	const killSession = useCallback(
		(reason: string) => {
			setSession((prev) => ({ ...prev, active: false }));
			setRevokedReason(reason);
			pushLog("SESSION_REVOKED", { reason });
			toast.error(reason);
			void fetch("/api/session/revoke", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ reason }),
			}).catch((error) => {
				console.error("Failed to sync session revoke", error);
			});
		},
		[pushLog]
	);

	const lockDocumentRemote = useCallback(
		(payload: {
			reason: string;
			violation?: ViolationEvent;
			context?: Record<string, unknown>;
		}) => {
			if (lockRequestedRef.current) {
				return;
			}
			lockRequestedRef.current = true;
			void fetch(`/api/documents/${document.documentId}/lock`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			}).catch((error) => {
				console.error("Failed to lock document", error);
			});
		},
		[document.documentId]
	);

	const registerViolation = useCallback(
		(code: ViolationCode, context?: Record<string, unknown>) => {
			const description = readableViolation(code);
			const severity =
				code === "EXTERNAL_CAMERA_DETECTED" ? "CRITICAL" : "HIGH";
			const violation = createViolation(code, description, severity);
			setViolations((prev) => [violation, ...prev].slice(0, 32));
			const notify = (evidence?: EvidencePayload | null) => {
				MonitoringNotifier.violation({
					documentId: document.documentId,
					viewerId: viewer.viewerId,
					violation,
					context,
					evidence,
				});
			};
			if (requestEvidence) {
				void requestEvidence(code)
					.then((evidence) => {
						if (evidence?.photo) {
							setViolations((prev) =>
								prev.map((entry) =>
									entry.id === violation.id
										? {
												...entry,
												evidenceUrl: evidence.photo ?? entry.evidenceUrl,
										  }
										: entry
								)
							);
						}
						notify(evidence);
					})
					.catch(() => notify());
			} else {
				notify();
			}
			pushLog("VIOLATION", { code, ...context });
			toast(description, { icon: "!" });
			if (shouldRevokeSession(violation, document)) {
				lockDocumentRemote({
					reason: description,
					violation,
					context,
				});
				killSession("Session revoked due to policy violation.");
			}
			return violation;
		},
		[
			document,
			killSession,
			lockDocumentRemote,
			pushLog,
			requestEvidence,
			viewer.viewerId,
		]
	);

	const updateCameraInsight = useCallback(
		(
			insight: CameraInsight,
			onObstructionChange?: (obstructed: boolean) => void
		) => {
			setCamera(insight);
			const isObstructed = insight.obstructionScore > 0.4;
			onObstructionChange?.(isObstructed);

			if (insight.externalDeviceDetected) {
				registerViolation("EXTERNAL_CAMERA_DETECTED", {
					frameHash: insight.frameHash,
				});
			}
			if (isObstructed) {
				registerViolation("CAMERA_OBSTRUCTED", {
					obstruction: insight.obstructionScore,
				});
			}
			if (insight.personsDetected === 0) {
				registerViolation("CAMERA_ABSENT");
			}
		},
		[registerViolation]
	);

	useEffect(() => {
		if (!session.active) {
			return;
		}
		const interval = window.setInterval(() => {
			MonitoringNotifier.heartbeat({
				sessionId: session.id,
				documentId: document.documentId,
				tamperHash: session.tamperHash,
			});
			pushLog("HEARTBEAT", { tamperHash: session.tamperHash });
		}, session.heartbeatMs);
		return () => window.clearInterval(interval);
	}, [document.documentId, pushLog, session]);

	const handleFocusChange = useCallback(
		(state: boolean) => {
			setFocusLost(!state);
			if (!state) {
				registerViolation("FOCUS_LOSS", { reason: "focus_change" });
			}
		},
		[registerViolation]
	);

	return {
		session,
		camera,
		logs,
		violations,
		focusLost,
		revokedReason,
		watermark,
		updateCameraInsight,
		registerViolation,
		handleFocusChange,
		killSession,
	};
}
