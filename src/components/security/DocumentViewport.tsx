"use client";

import { useMemo, useState, useEffect } from "react";
import { SecureDocument } from "@/lib/types/security";
import { SecureFileViewer } from "@/components/security/SecureFileViewer";

type Props = {
	document: SecureDocument;
};

export function DocumentViewport({ document }: Props) {
	const [showSummary, setShowSummary] = useState(false);
	const hasFile = Boolean(document.fileUrl);
	const showRichText = !hasFile && Boolean(document.richText);
	const permissions = document.permissions;
	const [isProtected, setIsProtected] = useState(true);

	// Add anti-inspection protection
	useEffect(() => {
		// Disable text selection on document content
		const preventSelection = (e: Event) => {
			e.preventDefault();
			return false;
		};

		// Prevent drag events
		const preventDrag = (e: DragEvent) => {
			e.preventDefault();
			return false;
		};

		globalThis.document.addEventListener("selectstart", preventSelection);
		globalThis.document.addEventListener("dragstart", preventDrag);
		globalThis.document.addEventListener("copy", preventSelection);

		return () => {
			globalThis.document.removeEventListener("selectstart", preventSelection);
			globalThis.document.removeEventListener("dragstart", preventDrag);
			globalThis.document.removeEventListener("copy", preventSelection);
		};
	}, []);

	const fileMeta = useMemo(() => {
		if (!document.fileName && !document.fileType) {
			return null;
		}
		return [document.fileName, document.fileType?.toUpperCase()]
			.filter(Boolean)
			.join(" | ");
	}, [document.fileName, document.fileType]);

	return (
		<article
			className="glass-panel relative z-10 flex flex-col gap-6 px-8 py-8 text-slate-100"
			style={{
				userSelect: "none",
				WebkitUserSelect: "none",
				WebkitTouchCallout: "none",
				MozUserSelect: "none",
				msUserSelect: "none",
			}}
			onContextMenu={(e) => e.preventDefault()}
			onCopy={(e) => e.preventDefault()}
			onCut={(e) => e.preventDefault()}
			onPaste={(e) => e.preventDefault()}
			onDragStart={(e) => e.preventDefault()}
			onDrop={(e) => e.preventDefault()}
		>
			<header className="flex flex-col gap-2 border-b border-white/10 pb-4">
				<p className="text-xs font-semibold uppercase tracking-[0.4em] text-cyan-300">
					{document.classification}
				</p>
				<div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
					<div className="space-y-1">
						<h1 className="text-2xl font-semibold">{document.title}</h1>
						<p className="text-sm text-slate-300">
							{document.description ?? "Secure payload"} - Security{" "}
							{permissions.securityLevel}
						</p>
						{fileMeta && (
							<p className="text-xs uppercase tracking-[0.2em] text-slate-400">
								{fileMeta}
							</p>
						)}
					</div>
					<button
						type="button"
						onClick={() => setShowSummary((prev) => !prev)}
						className="self-start rounded-full border border-white/20 px-4 py-2 text-xs font-semibold text-white"
					>
						{showSummary ? "Hide security summary" : "Show security summary"}
					</button>
				</div>
				{showSummary && (
					<div className="mt-3 grid gap-4 text-sm text-slate-200 md:grid-cols-2">
						<div className="rounded-2xl border border-white/5 bg-white/5 p-4">
							<p className="text-xs uppercase tracking-[0.3em] text-slate-400">
								Policies
							</p>
							<ul className="mt-2 space-y-1">
								{document.policies &&
									Object.entries(document.policies).map(([key, value]) => (
										<li
											key={key}
											className="flex items-center justify-between text-xs uppercase tracking-[0.2em]"
										>
											<span>{key}</span>
											<span
												className={value ? "text-emerald-300" : "text-rose-300"}
											>
												{value ? "ON" : "OFF"}
											</span>
										</li>
									))}
							</ul>
						</div>
						<div className="rounded-2xl border border-white/5 bg-white/5 p-4">
							<p className="text-xs uppercase tracking-[0.3em] text-slate-400">
								Permissions
							</p>
							<p className="mt-2 text-xs text-slate-300">
								Max Views: {permissions.maxViews} - Max Session:{" "}
								{permissions.maxSessionMinutes ?? 30}m
							</p>
							<p className="text-xs text-slate-300">
								Expires:{" "}
								{permissions.expiryDate
									? new Date(permissions.expiryDate).toLocaleString()
									: "No expiry"}
							</p>
						</div>
					</div>
				)}
			</header>

			{hasFile && document.fileUrl && (
				<div
					data-protected="true"
					style={{
						position: "relative",
						isolation: "isolate",
					}}
				>
					<SecureFileViewer
						fileUrl={document.fileUrl}
						fileType={document.fileType}
						fileName={document.fileName}
					/>
					{/* Invisible protection layer */}
					<div
						style={{
							position: "absolute",
							inset: 0,
							pointerEvents: "none",
							zIndex: 1,
						}}
						aria-hidden="true"
					/>
				</div>
			)}

			{!hasFile && showRichText && (
				<section
					className="rounded-2xl border border-white/5 bg-white/5 p-5 text-sm leading-relaxed text-slate-100"
					data-protected="true"
					style={{
						position: "relative",
						isolation: "isolate",
					}}
				>
					<div
						dangerouslySetInnerHTML={{ __html: document.richText! }}
						style={{
							userSelect: "none",
							pointerEvents: "auto",
						}}
					/>
					{/* Invisible protection layer */}
					<div
						style={{
							position: "absolute",
							inset: 0,
							pointerEvents: "none",
							zIndex: 1,
						}}
						aria-hidden="true"
					/>
				</section>
			)}

			{!hasFile && !showRichText && (
				<section className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-5 text-sm text-rose-100">
					The owner did not attach a file or inline content for this document.
					Please contact them if this is unexpected.
				</section>
			)}

			<footer className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-5 py-4 text-xs text-emerald-100">
				Fullscreen enforcement stays active. Leaving fullscreen or minimising
				prompts you to close the document, and repeated violations revoke access
				instantly.
			</footer>
		</article>
	);
}
