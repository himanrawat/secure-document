import { formatISO9075 } from "date-fns";
import { SecureDocument, SessionStatus } from "@/lib/types/security";

export type WatermarkPayload = {
  lines: string[];
  opacity: number;
};

export function buildWatermarkPayload(
  document: SecureDocument,
  session: SessionStatus,
  context: { ip: string; viewerId: string },
): WatermarkPayload {
  const expiresInMinutes = Math.max(
    0,
    Math.floor((session.expiresAt - Date.now()) / 1000 / 60),
  );

  const base = [
    `DOC ${document.documentId}`,
    `OWNER ${document.ownerId}`,
    `SESSION ${session.id}`,
    `VIEWER ${context.viewerId}`,
    `IP ${context.ip}`,
    `LEVEL ${document.permissions.securityLevel}`,
    `EXPIRES ${formatISO9075(session.expiresAt)}`,
    `COUNTDOWN ${expiresInMinutes}m`,
  ];

  return {
    lines: base,
    opacity: document.permissions.securityLevel === "MAXIMUM" ? 0.25 : 0.15,
  };
}
