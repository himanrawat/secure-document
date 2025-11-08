import { ViolationCode } from "@/lib/types/security";

export const violationDescriptions: Record<ViolationCode, string> = {
  SCREEN_RECORDING: "Screen recording tool detected.",
  SCREEN_SHARING: "Screen sharing detected.",
  SCREENSHOT_ATTEMPT: "Screenshot attempt blocked.",
  FOCUS_LOSS: "Viewer lost focus on the secure window.",
  DEVTOOLS_OPENED: "Developer tools opened.",
  CAMERA_OBSTRUCTED: "Camera obstruction detected.",
  CAMERA_ABSENT: "Camera stream missing.",
  EXTERNAL_CAMERA_DETECTED: "External phone or camera aimed at the screen.",
  MULTI_PERSON: "Multiple people detected in frame.",
  NO_LIVENESS: "Liveness check failed.",
  ENVIRONMENT_CHANGE: "Environment changed unexpectedly.",
  NETWORK_TAMPER: "Network tamper detected.",
  SESSION_TAMPER: "Session tamper detected.",
  POLICY_BREACH: "Access policy violation.",
};

export function readableViolation(code: ViolationCode) {
  return violationDescriptions[code] ?? code;
}
