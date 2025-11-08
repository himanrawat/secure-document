"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import "@/styles/docx-preview.css";
import { SecurePdfViewer } from "@/components/security/SecurePdfViewer";

type Props = {
  fileUrl: string;
  fileType?: string;
  fileName?: string;
};

type ViewerState =
  | { mode: "loading" }
  | { mode: "pdf" }
  | { mode: "text"; content: string }
  | { mode: "html"; html: string }
  | { mode: "table"; rows: (string | number | null)[][] }
  | { mode: "docx"; version: number }
  | { mode: "error"; message: string };

const mimeToExtension: Record<string, string> = {
  "application/pdf": "pdf",
  "text/plain": "txt",
  "text/markdown": "md",
  "text/csv": "csv",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
};

function inferExtension(fileName?: string | null, fileType?: string, fileUrl?: string) {
  const loweredName = fileName?.toLowerCase();
  if (loweredName && loweredName.includes(".")) {
    return loweredName.split(".").pop() ?? undefined;
  }
  if (fileType && mimeToExtension[fileType]) {
    return mimeToExtension[fileType];
  }
  if (fileUrl) {
    try {
      const url = new URL(fileUrl, "http://localhost");
      const pathname = url.pathname.toLowerCase();
      if (pathname.includes(".")) {
        return pathname.split(".").pop() ?? undefined;
      }
    } catch {
      // ignore invalid URLs
    }
  }
  return undefined;
}

export function SecureFileViewer({ fileUrl, fileType, fileName }: Props) {
  const [state, setState] = useState<ViewerState>({ mode: "loading" });
  const docxBufferRef = useRef<ArrayBuffer | null>(null);
  const docxContainerRef = useRef<HTMLDivElement | null>(null);
  const extension = useMemo(() => inferExtension(fileName, fileType, fileUrl), [fileName, fileType, fileUrl]);

  useEffect(() => {
    let cancelled = false;
    async function renderFile() {
      setState({ mode: "loading" });
      try {
        if ((extension === "pdf" || fileType?.includes("pdf")) && fileUrl) {
          setState({ mode: "pdf" });
          return;
        }

        if (extension && ["txt", "text", "log", "csv"].includes(extension)) {
          const response = await fetch(fileUrl, { cache: "no-store" });
          const text = await response.text();
          if (cancelled) return;
          setState({ mode: "text", content: text });
          return;
        }

        if (extension && ["md", "markdown"].includes(extension)) {
          const response = await fetch(fileUrl, { cache: "no-store" });
          const markdown = await response.text();
          const { marked } = await import("marked");
          marked.setOptions({ mangle: false, headerIds: false });
          const html = marked.parse(markdown);
          if (cancelled) return;
          setState({ mode: "html", html });
          return;
        }

        if (extension === "docx") {
          const response = await fetch(fileUrl, { cache: "no-store" });
          const buffer = await response.arrayBuffer();
          if (cancelled) return;
          docxBufferRef.current = buffer;
          setState({ mode: "docx", version: Date.now() });
          return;
        }

        if (extension === "doc") {
          setState({
            mode: "error",
            message: "Legacy .doc files cannot be previewed safely. Ask the owner to convert to .docx.",
          });
          return;
        }

        if (extension === "xls" || extension === "xlsx" || fileType?.includes("spreadsheet")) {
          const response = await fetch(fileUrl, { cache: "no-store" });
          const buffer = await response.arrayBuffer();
          const XLSX = await import("xlsx");
          const workbook = XLSX.read(buffer, { type: "array" });
          const sheetName = workbook.SheetNames[0];
          const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 }) as (
            | string
            | number
            | null
          )[][];
          if (cancelled) return;
          setState({ mode: "table", rows });
          return;
        }

        setState({
          mode: "error",
          message: `Preview not available for ${extension ? extension.toUpperCase() : "this file type"}.`,
        });
      } catch (error) {
        console.error("Secure file render failed", error);
        if (!cancelled) {
          setState({ mode: "error", message: "Unable to render file securely." });
        }
      }
    }

    renderFile();
    return () => {
      cancelled = true;
    };
  }, [extension, fileType, fileUrl]);

  useEffect(() => {
    if (state.mode !== "docx") {
      return;
    }
    let cancelled = false;
    async function renderDocx() {
      try {
        const docx = await import("docx-preview");
        if (!docxBufferRef.current || !docxContainerRef.current || cancelled) {
          return;
        }
        docxContainerRef.current.innerHTML = "";
        await docx.renderAsync(docxBufferRef.current, docxContainerRef.current, undefined, {
          inWrapper: true,
          className: "docx-preview",
        });
      } catch (error) {
        console.error("DOCX preview failed", error);
        if (!cancelled) {
          setState({ mode: "error", message: "Unable to render DOCX securely." });
        }
      }
    }
    renderDocx();
    return () => {
      cancelled = true;
      if (docxContainerRef.current) {
        docxContainerRef.current.innerHTML = "";
      }
    };
  }, [state.mode === "docx" ? state.version : null]);

  const containerClass =
    "space-y-3 rounded-2xl border border-white/10 bg-black/40 px-4 py-4 text-sm text-slate-100";

  if (state.mode === "pdf") {
    return (
      <section className={containerClass}>
        <SecurePdfViewer fileUrl={fileUrl} />
      </section>
    );
  }

  return (
    <section className={containerClass}>
      {state.mode === "loading" && <p>Decrypting and rendering document...</p>}

      {state.mode === "text" && (
        <pre className="max-h-[70vh] overflow-auto whitespace-pre-wrap text-xs text-slate-200">
          {state.content}
        </pre>
      )}

      {state.mode === "html" && (
        <div
          className="prose prose-invert max-h-[70vh] overflow-auto text-sm"
          dangerouslySetInnerHTML={{ __html: state.html }}
        />
      )}

      {state.mode === "table" && (
        <div className="max-h-[70vh] overflow-auto rounded-2xl border border-white/10">
          <table className="w-full border-collapse text-xs text-slate-200">
            <tbody>
              {state.rows.map((row, rowIndex) => (
                <tr key={`row-${rowIndex}`} className="border-b border-white/5">
                  {row.map((cell, cellIndex) => (
                    <td key={`cell-${rowIndex}-${cellIndex}`} className="border-r border-white/10 px-3 py-2">
                      {cell ?? ""}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {state.mode === "docx" && (
        <div className="max-h-[70vh] overflow-auto rounded-2xl border border-white/10 bg-white/5 p-4 text-slate-900">
          <div ref={docxContainerRef} />
        </div>
      )}

      {state.mode === "error" && <p className="text-rose-300">{state.message}</p>}
    </section>
  );
}
