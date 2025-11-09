"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
	ViewerDeviceFingerprint,
	ViewerIdentityRequirement,
} from "@/lib/types/security";

type Props = {
	documentId: string;
	requirement: ViewerIdentityRequirement;
	viewerDevice: ViewerDeviceFingerprint;
	photoOnly?: boolean;
};

export function IdentityVerificationScreen({
	documentId,
	requirement,
	viewerDevice,
	photoOnly = false,
}: Props) {
	const router = useRouter();
	const [name, setName] = useState("");
	const [phone, setPhone] = useState("");
	const [loading, setLoading] = useState(false);
	const [cameraError, setCameraError] = useState<string | null>(null);
	const [photo, setPhoto] = useState<string | null>(null);
	const videoRef = useRef<HTMLVideoElement | null>(null);
	const streamRef = useRef<MediaStream | null>(null);
	const autoCaptureRef = useRef(false);
	const [retryKey, setRetryKey] = useState(0);

	const captureFrame = useCallback(() => {
		if (!videoRef.current || videoRef.current.readyState < 2) {
			if (!autoCaptureRef.current) {
				autoCaptureRef.current = true;
				setTimeout(captureFrame, 500);
			}
			return;
		}
		const canvas = document.createElement("canvas");
		canvas.width = videoRef.current.videoWidth;
		canvas.height = videoRef.current.videoHeight;
		const context = canvas.getContext("2d");
		if (!context) {
			setCameraError("Unable to capture camera frame.");
			return;
		}
		context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
		const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
		setPhoto(dataUrl);
	}, []);

	useEffect(() => {
		let cancelled = false;
		const initCamera = async () => {
			try {
				setCameraError(null);
				setPhoto(null);
				autoCaptureRef.current = false;
				const stream = await navigator.mediaDevices.getUserMedia({
					video: { facingMode: "user" },
					audio: false,
				});
				if (cancelled) {
					stream.getTracks().forEach((track) => track.stop());
					return;
				}
				streamRef.current = stream;
				if (videoRef.current) {
					videoRef.current.srcObject = stream;
					await videoRef.current.play();
					captureFrame();
				}
			} catch (error) {
				console.error("Camera access failed", error);
				setCameraError("Camera permission denied. Enable access to continue.");
			}
		};
		initCamera();
		return () => {
			cancelled = true;
			streamRef.current?.getTracks().forEach((track) => track.stop());
			streamRef.current = null;
		};
	}, [captureFrame, retryKey]);

	const ensurePhoto = () => {
		if (!photo) {
			captureFrame();
		}
		return !!photo;
	};

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		// Only validate name/phone if identity verification is actually required
		if (requirement.required && !photoOnly && (!name.trim() || !phone.trim())) {
			toast.error("Name and phone are required.");
			return;
		}

		if (!ensurePhoto()) {
			toast.error("Capture photo before continuing.");
			return;
		}
		try {
			setLoading(true);
			const response = await fetch("/api/viewer/identity", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ name, phone, photo }),
			});
			const payload = await response.json();
			if (!response.ok) {
				throw new Error(payload.error ?? "Identity verification failed.");
			}
			toast.success("Identity confirmed. Loading document…");
			router.push(`/viewer/${documentId}`);
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Unable to capture identity.";
			toast.error(message);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="flex min-h-screen items-center justify-center px-6 py-12 text-slate-100">
			<form
				onSubmit={handleSubmit}
				className="w-full max-w-2xl space-y-6 rounded-xl border border-white/10 bg-white/5 px-8 py-10"
			>
				<header className="space-y-3">
					<p className="text-xs uppercase tracking-[0.4em] text-slate-400">
						{photoOnly ? "Photo capture" : "Secure identity check"}
					</p>
					<h1 className="text-3xl font-semibold text-white">
						{photoOnly
							? "Quick photo before viewing."
							: "Share who you are before viewing."}
					</h1>
					<p className="text-sm text-slate-300">
						{photoOnly
							? "The owner requires a photo for security. We'll capture one frame from your camera and send it securely to the document owner."
							: "We capture a still frame via your camera, plus the details below. These are encrypted and sent to the document owner for compliance."}
					</p>
				</header>

				<div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-4 text-xs text-slate-300">
					{cameraError ? (
						<div className="space-y-3">
							<p className="text-rose-300">{cameraError}</p>
							<button
								type="button"
								onClick={() => setRetryKey((prev) => prev + 1)}
								className="rounded-full border border-rose-400/60 px-4 py-2 text-xs font-semibold text-rose-200"
							>
								Re-enable camera
							</button>
						</div>
					) : (
						<div className="flex items-center gap-4">
							<video
								ref={videoRef}
								muted
								playsInline
								className="h-32 w-32 rounded-2xl border border-white/10 object-cover"
							/>
							{photo ? (
								<Image
									src={photo}
									alt="Captured identity"
									width={128}
									height={128}
									className="h-32 w-32 rounded-2xl border border-white/10 object-cover"
									unoptimized
								/>
							) : (
								<p className="text-xs text-slate-400">
									Capturing photo… ensure your face is clearly visible.
								</p>
							)}
							<button
								type="button"
								onClick={captureFrame}
								className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold text-white"
							>
								Retake photo
							</button>
						</div>
					)}
				</div>

				{!photoOnly && (
					<div className="grid gap-4 md:grid-cols-2">
						<div className="space-y-2">
							<label className="text-xs uppercase tracking-[0.3em] text-slate-400">
								Your full name{" "}
								{requirement.required && (
									<span className="text-rose-300">*</span>
								)}
							</label>
							<input
								value={name}
								onChange={(event) => setName(event.target.value)}
								className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white focus:border-cyan-400 focus:outline-none"
								placeholder="e.g. Alex Doe"
							/>
						</div>
						<div className="space-y-2">
							<label className="text-xs uppercase tracking-[0.3em] text-slate-400">
								Phone number{" "}
								{requirement.required && (
									<span className="text-rose-300">*</span>
								)}
							</label>
							<input
								value={phone}
								onChange={(event) => setPhone(event.target.value)}
								className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white focus:border-cyan-400 focus:outline-none"
								placeholder="+1 555 123 4567"
							/>
						</div>
					</div>
				)}

				<div className="rounded-2xl border border-white/10 bg-black/40 px-5 py-4 text-xs text-slate-300">
					<p className="font-semibold text-white">Camera notice</p>
					<p className="mt-2">
						After submitting, the viewer switches to fullscreen, records
						liveness, and blocks screenshots or printing. Leaving fullscreen or
						obstructing the camera revokes access instantly.
					</p>
					<p className="mt-2 text-slate-400">
						Device fingerprint: {viewerDevice.label} ({viewerDevice.platform})
					</p>
				</div>

				<button
					type="submit"
					disabled={loading}
					className="w-full rounded-xl bg-cyan-500 px-6 py-4 text-sm font-semibold uppercase tracking-[0.3em] text-slate-900 disabled:opacity-60"
				>
					{loading ? "Verifying…" : "Continue to document"}
				</button>
			</form>
		</div>
	);
}
