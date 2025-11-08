"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import { createLog, createViolation, shouldRevokeSession } from "@/lib/security/session";
import { buildWatermarkPayload } from "@/lib/security/watermark";
import { MonitoringNotifier } from "@/lib/monitoring/notifier";
import { readableViolation } from "@/lib/security/events";

type UseSecuritySessionParams = {
  document: SecureDocument;
  viewer: ViewerProfile;
  initialSession: SessionStatus;
};

export function useSecuritySession({
  document,
  viewer,
  initialSession,
}: UseSecuritySessionParams) {
  const [session, setSession] = useState<SessionStatus>(initialSession);
  const [camera, setCamera] = useState<CameraInsight | null>(null);
  const [logs, setLogs] = useState<ActivityLog[]>(document.logs);
  const [violations, setViolations] = useState<ViolationEvent[]>(document.violations);
  const [focusLost, setFocusLost] = useState(false);
  const [revokedReason, setRevokedReason] = useState<string | null>(null);

  const watermark = useMemo(
    () =>
      buildWatermarkPayload(document, session, {
        ip: viewer.device.ipAddress,
        viewerId: viewer.viewerId,
      }),
    [document, session, viewer],
  );

  const pushLog = useCallback(
    (event: ActivityLog["event"], context?: Record<string, unknown>) => {
      setLogs((prev) =>
        [
          createLog(document.documentId, viewer.viewerId, event, context),
          ...prev,
        ].slice(0, 32),
      );
      MonitoringNotifier.log({
        documentId: document.documentId,
        viewerId: viewer.viewerId,
        event,
        context,
      });
    },
    [document.documentId, viewer.viewerId],
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
    [pushLog],
  );

  const registerViolation = useCallback(
    (code: ViolationCode, context?: Record<string, unknown>) => {
      const description = readableViolation(code);
      const severity = code === "EXTERNAL_CAMERA_DETECTED" ? "CRITICAL" : "HIGH";
      const violation = createViolation(code, description, severity);
      setViolations((prev) => [violation, ...prev].slice(0, 32));
      MonitoringNotifier.violation({
        documentId: document.documentId,
        viewerId: viewer.viewerId,
        violation,
        context,
      });
      pushLog("VIOLATION", { code, ...context });
      toast(description, { icon: "!" });
      if (shouldRevokeSession(violation, document)) {
        killSession("Session revoked due to policy violation.");
      }
    },
    [document, killSession, pushLog, viewer.viewerId],
  );

  const updateCameraInsight = useCallback(
    (insight: CameraInsight) => {
      setCamera(insight);
      if (insight.externalDeviceDetected) {
        registerViolation("EXTERNAL_CAMERA_DETECTED", { frameHash: insight.frameHash });
      }
      if (insight.obstructionScore > 0.4) {
        registerViolation("CAMERA_OBSTRUCTED", { obstruction: insight.obstructionScore });
      }
      if (insight.personsDetected === 0) {
        registerViolation("CAMERA_ABSENT");
      }
    },
    [registerViolation],
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
    [registerViolation],
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
