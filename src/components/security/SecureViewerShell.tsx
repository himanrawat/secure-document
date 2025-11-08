"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SecureDocument, SessionStatus, ViewerProfile } from "@/lib/types/security";
import { ReaderLocation } from "@/lib/types/reader";
import { useSecuritySession } from "@/hooks/useSecuritySession";
import { DocumentViewport } from "@/components/security/DocumentViewport";
import { CameraSentinel } from "@/components/security/CameraSentinel";
import { ScreenShield } from "@/components/security/ScreenShield";
import { SessionHud } from "@/components/security/SessionHud";
import { ViolationPanel } from "@/components/security/ViolationPanel";
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
  const snapshotQueue = useRef<
    Array<{ directive: SnapshotDirective; resolve: (result: SnapshotResult | null) => void }>
  >([]);
  const activeResolverRef = useRef<((result: SnapshotResult | null) => void) | null>(null);
  const snapshotDirectiveRef = useRef<SnapshotDirective | null>(null);
  const [snapshotDirective, setSnapshotDirective] = useState<SnapshotDirective | null>(null);
  const lastLocationRef = useRef<ReaderLocation | null>(null);
  const capturePhotoPolicy = document.policies?.captureReaderPhoto ?? false;
  const trackLocation = document.policies?.locationTracking ?? false;

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
    [pumpSnapshotQueue],
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
    [pumpSnapshotQueue],
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
                  capturedAt: payloadLocation.capturedAt ?? new Date().toISOString(),
                }
              : null,
            reason,
          }),
        });
      } catch (error) {
        console.error("Presence sync failed", error);
      }
    },
    [document.documentId],
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
    logs,
    violations,
    focusLost,
    revokedReason,
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
    [camera],
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
      { timeout: 5000 },
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

  return (
    <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 pb-16 pt-8">
      <WatermarkLayer lines={watermark.lines} opacity={watermark.opacity} />
      <div className="glass-panel relative z-10 border border-white/5 px-0 py-0">
        <DocumentViewport document={document} />
        <div className="grid gap-4 px-8 py-6 md:grid-cols-2">
          <CameraSentinel
            onInsight={updateCameraInsight}
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
        <div className="grid gap-4 px-8 pb-8 md:grid-cols-[1.1fr,0.9fr]">
          <SessionHud
            session={session}
            document={document}
            violations={violations}
            revokedReason={revokedReason}
            onKill={() => killSession("Owner kill switch invoked.")}
          />
          <ViolationPanel violations={violations} logs={logs} />
        </div>
      </div>
      {focusLost && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-slate-900/80 backdrop-blur-lg">
          <div className="rounded-3xl border border-rose-500/30 bg-rose-500/10 px-8 py-6 text-center text-sm text-rose-100">
            Focus lost. Viewer blurred, recording attempts blocked. Return focus to continue.
          </div>
        </div>
      )}
      {fullscreenPrompt && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/80 backdrop-blur-xl">
          <div className="space-y-4 rounded-3xl border border-white/10 bg-white/5 px-8 py-6 text-center text-white">
            <p className="text-lg font-semibold">Fullscreen required</p>
            <p className="text-sm text-slate-300">
              This document must remain in fullscreen. Return to secure mode or close the document now.
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
          <div className="rounded-3xl border border-rose-500/40 bg-rose-500/10 px-8 py-6 text-center text-sm text-rose-100">
            Session revoked. All encrypted material destroyed. Owner and auditors notified.
          </div>
        </div>
      )}
      <dl className="grid grid-cols-2 gap-4 text-xs text-slate-300">
        <div className="rounded-2xl border border-white/5 bg-white/5 px-4 py-3">
          <dt className="text-[0.6rem] uppercase tracking-[0.3em] text-slate-400">Presence</dt>
          <dd className="text-lg font-semibold text-white">{stats.personsDetected}</dd>
        </div>
        <div className="rounded-2xl border border-white/5 bg-white/5 px-4 py-3">
          <dt className="text-[0.6rem] uppercase tracking-[0.3em] text-slate-400">Obstruction</dt>
          <dd className="text-lg font-semibold text-white">{Math.round(stats.obstruction * 100)}%</dd>
        </div>
      </dl>
    </div>
  );
}
