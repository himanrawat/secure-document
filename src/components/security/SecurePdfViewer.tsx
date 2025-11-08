"use client";

import { useEffect, useState } from "react";

type Props = {
	fileUrl: string;
};

type RenderedPage = {
	pageNumber: number;
	dataUrl: string;
	width: number;
	height: number;
};

export function SecurePdfViewer({ fileUrl }: Props) {
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);
	const [pages, setPages] = useState<RenderedPage[]>([]);

	useEffect(() => {
		let cancelled = false;

		async function renderPdf() {
			try {
				setLoading(true);
				setError(null);
				setPages([]);

				const pdfjsModule = await import("pdfjs-dist");

				// Use the local worker file from public directory
				pdfjsModule.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

				const response = await fetch(fileUrl, { cache: "no-store" });
				const buffer = await response.arrayBuffer();
				const pdf = await pdfjsModule.getDocument({ data: buffer }).promise;

				if (cancelled) {
					return;
				}

				const renderedPages: RenderedPage[] = [];

				for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
					if (cancelled) break;

					const page = await pdf.getPage(pageNumber);
					const viewport = page.getViewport({ scale: 1.1 });
					const canvas = document.createElement("canvas");
					const context = canvas.getContext("2d");
					canvas.height = viewport.height;
					canvas.width = viewport.width;

					if (!context) {
						continue;
					}

					await page.render({ canvasContext: context, viewport, canvas })
						.promise;

					if (cancelled) break;

					// Convert canvas to data URL to store in React state
					const dataUrl = canvas.toDataURL("image/png");
					renderedPages.push({
						pageNumber,
						dataUrl,
						width: viewport.width,
						height: viewport.height,
					});
				}

				if (!cancelled) {
					setPages(renderedPages);
				}
			} catch (err) {
				console.error("Secure PDF render failed", err);
				if (!cancelled) {
					setError("Unable to render PDF securely.");
				}
			} finally {
				if (!cancelled) {
					setLoading(false);
				}
			}
		}

		renderPdf();

		return () => {
			cancelled = true;
		};
	}, [fileUrl]);

	return (
		<div
			className="max-h-[70vh] overflow-auto"
			onContextMenu={(event) => event.preventDefault()}
		>
			{loading && (
				<p className="text-sm text-slate-300">
					Decrypting and rendering document…
				</p>
			)}
			{error && <p className="text-sm text-rose-300">{error}</p>}
			{pages.map((page) => (
				<img
					key={page.pageNumber}
					src={page.dataUrl}
					alt={`Page ${page.pageNumber}`}
					width={page.width}
					height={page.height}
					className="mb-6 rounded-2xl border border-white/10 bg-black/20 shadow-xl"
					onContextMenu={(event) => event.preventDefault()}
					draggable={false}
				/>
			))}
		</div>
	);
}
