"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  fileUrl: string;
};

export function SecurePdfViewer({ fileUrl }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function renderPdf() {
      try {
        setLoading(true);
        setError(null);
        const pdfjsModule = (await import("pdfjs-dist/build/pdf")) as typeof import("pdfjs-dist/build/pdf");
        if (pdfjsModule.GlobalWorkerOptions && !pdfjsModule.GlobalWorkerOptions.workerSrc) {
          const workerUrl = new URL(
            "pdfjs-dist/build/pdf.worker.min.js",
            import.meta.url,
          ).toString();
          pdfjsModule.GlobalWorkerOptions.workerSrc = workerUrl;
        }
        const response = await fetch(fileUrl, { cache: "no-store" });
        const buffer = await response.arrayBuffer();
        const pdf = await pdfjsModule.getDocument({ data: buffer }).promise;
        if (!containerRef.current || cancelled) {
          return;
        }
        containerRef.current.innerHTML = "";
        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
          const page = await pdf.getPage(pageNumber);
          const viewport = page.getViewport({ scale: 1.1 });
          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          if (!context) {
            continue;
          }
          await page.render({ canvasContext: context, viewport }).promise;
          canvas.className = "mb-6 rounded-2xl border border-white/10 bg-black/20 shadow-xl";
          canvas.oncontextmenu = (event) => event.preventDefault();
          containerRef.current.appendChild(canvas);
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
      ref={containerRef}
      className="max-h-[70vh] overflow-auto"
      onContextMenu={(event) => event.preventDefault()}
    >
      {loading && <p className="text-sm text-slate-300">Decrypting and rendering document…</p>}
      {error && <p className="text-sm text-rose-300">{error}</p>}
    </div>
  );
}
