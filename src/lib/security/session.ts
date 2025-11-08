import { nanoid } from "nanoid";
import {
  ActivityLog,
  SecureDocument,
  SessionStatus,
  ViolationCode,
  ViolationEvent,
} from "@/lib/types/security";

export function createSession(document: SecureDocument, viewerId: string): SessionStatus {
  const startedAt = Date.now();
  const expiresAt =
    document.permissions.maxSessionMinutes && document.permissions.maxSessionMinutes > 0
      ? startedAt + document.permissions.maxSessionMinutes * 60 * 1000
      : Date.now() + 30 * 60 * 1000;

  return {
    id: nanoid(),
    documentId: document.documentId,
    viewerId,
    startedAt,
    expiresAt,
    active: true,
    heartbeatMs: 5000,
    focusLost: false,
    tamperHash: crypto.randomUUID(),
    identityVerified: false,
  };
}

export function createLog(
  documentId: string,
  viewerId: string,
  event: ActivityLog["event"],
  context?: Record<string, unknown>,
): ActivityLog {
  return {
    id: nanoid(),
    documentId,
    viewerId,
    event,
    context,
    createdAt: new Date().toISOString(),
  };
}

export function createViolation(
  code: ViolationCode,
  description: string,
  severity: ViolationEvent["severity"] = "HIGH",
  evidenceUrl?: string,
): ViolationEvent {
  return {
    id: nanoid(),
    code,
    description,
    severity,
    evidenceUrl,
    createdAt: new Date().toISOString(),
  };
}

export function shouldRevokeSession(
  violation: ViolationEvent,
  document: SecureDocument,
): boolean {
  if (violation.code === "EXTERNAL_CAMERA_DETECTED") {
    return true;
  }

  if (document.permissions.securityLevel === "MAXIMUM") {
    return true;
  }

  return violation.severity === "CRITICAL";
}
