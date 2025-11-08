import { EventEmitter } from "events";

export type SystemEvent = {
  type:
    | "DOCUMENT_CREATED"
    | "DOCUMENT_DELETED"
    | "OTP_VERIFIED"
    | "SESSION_HEARTBEAT"
    | "VIOLATION"
    | "PRESENCE_CAPTURED"
    | "VIEWER_IDENTITY_CAPTURED"
    | "SESSION_REVOKED_EVENT";
  payload: Record<string, unknown>;
  createdAt: string;
};

declare global {
  var __eventBus: EventEmitter | undefined;
}

const emitter =
  global.__eventBus ??
  (() => {
    const e = new EventEmitter();
    e.setMaxListeners(100);
    global.__eventBus = e;
    return e;
  })();

export function emitSystemEvent(event: SystemEvent) {
  emitter.emit("system-event", event);
}

export function subscribeSystemEvents(handler: (event: SystemEvent) => void) {
  emitter.on("system-event", handler);
  return () => emitter.off("system-event", handler);
}
