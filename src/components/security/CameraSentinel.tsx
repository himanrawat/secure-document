"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CameraInsight } from "@/lib/types/security";
import { evaluateCameraFrame } from "@/lib/security/camera";

type Props = {
  onInsight: (insight: CameraInsight) => void;
  onSnapshot?: (photo: string, frameHash: string) => void;
  disabled?: boolean;
};

type CameraState = "initializing" | "tracking" | "error";

function captureFrame(video: HTMLVideoElement) {
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return "";
  }
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.7);
}

export function CameraSentinel({ onInsight, onSnapshot, disabled }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [state, setState] = useState<CameraState>("initializing");
  const [lastInsight, setLastInsight] = useState<CameraInsight | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [snapshotSent, setSnapshotSent] = useState(false);

  useEffect(() => {
    if (disabled) {
      return;
    }
    let stream: MediaStream | null = null;
    const video = videoRef.current;
    if (!video) {
      return;
    }

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "user" }, audio: false })
      .then((mediaStream) => {
        stream = mediaStream;
        video.srcObject = stream;
        return video.play();
      })
      .then(() => {
        setState("tracking");
      })
      .catch((cameraError) => {
        setError("Camera permission denied or unavailable.");
        setState("error");
        console.error(cameraError);
      });

    return () => {
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [disabled]);

  useEffect(() => {
    if (disabled || !videoRef.current) {
      return;
    }
    let mounted = true;
    const interval = window.setInterval(async () => {
      if (!videoRef.current || videoRef.current.readyState < 2 || state === "error") {
        return;
      }
      try {
        const insight = await evaluateCameraFrame(videoRef.current);
        if (!mounted) {
          return;
        }
        setLastInsight(insight);
        onInsight(insight);
        if (!snapshotSent && videoRef.current && onSnapshot) {
          const photo = captureFrame(videoRef.current);
          if (photo) {
            setSnapshotSent(true);
            onSnapshot(photo, insight.frameHash);
          }
        }
      } catch (e) {
        console.error("Camera evaluation error", e);
      }
    }, 4000);
    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, [disabled, onInsight, onSnapshot, snapshotSent, state]);

  const statusLabel = useMemo(() => {
    if (state === "initializing") {
      return "Initializing camera...";
    }
    if (state === "tracking") {
      return "Camera tracking active";
    }
    return error ?? "Camera error";
  }, [error, state]);

  return (
    <div className="glass-panel flex flex-col gap-4 px-5 py-4 text-sm text-slate-200">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-white">Camera Sentinel</p>
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-xs ${
            state === "tracking" ? "bg-emerald-500/20 text-emerald-200" : "bg-amber-500/20 text-amber-100"
          }`}
        >
          {statusLabel}
        </span>
      </div>
      <p className="text-xs text-slate-400">
        Face scan/fingerprint are optional. Continuous tracking stays active. External camera/phone
        attempts destroy the document immediately.
      </p>
      <div className="grid grid-cols-3 gap-3 text-center text-xs">
        <div className="rounded-xl border border-white/5 bg-white/5 px-3 py-2">
          <p className="text-[0.65rem] uppercase text-slate-400">Persons</p>
          <p className="text-lg font-semibold text-white">
            {lastInsight ? lastInsight.personsDetected : "-"}
          </p>
        </div>
        <div className="rounded-xl border border-white/5 bg-white/5 px-3 py-2">
          <p className="text-[0.65rem] uppercase text-slate-400">Obstruction</p>
          <p className="text-lg font-semibold text-white">
            {lastInsight ? `${Math.round(lastInsight.obstructionScore * 100)}%` : "-"}
          </p>
        </div>
        <div className="rounded-xl border border-white/5 bg-white/5 px-3 py-2">
          <p className="text-[0.65rem] uppercase text-slate-400">External</p>
          <p
            className={`text-lg font-semibold ${
              lastInsight?.externalDeviceDetected ? "text-rose-300" : "text-emerald-300"
            }`}
          >
            {lastInsight?.externalDeviceDetected ? "Detected" : "Clear"}
          </p>
        </div>
      </div>
      <p className="rounded-2xl border border-white/5 bg-black/40 px-4 py-3 text-xs text-slate-400">
        Camera stream is hidden from the viewer but continuously monitored. Disconnecting or covering the
        lens revokes access immediately.
      </p>
      <video ref={videoRef} muted playsInline className="hidden" />
    </div>
  );
}
