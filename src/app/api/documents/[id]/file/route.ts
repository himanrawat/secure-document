import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDocumentById, getSessionByToken } from "@/lib/services/documentService";
import { getR2ObjectStream } from "@/lib/storage/r2";
import { getSessionFromCookies } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const url = new URL(request.url);
  const attachmentId = url.searchParams.get("attachmentId");
  if (!attachmentId) {
    return NextResponse.json({ error: "attachmentId required" }, { status: 400 });
  }

  const document = await getDocumentById(id);
  if (!document) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const attachment = (document.attachments ?? []).find((file) => file.id === attachmentId);
  if (!attachment || !attachment.key) {
    return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
  }

  const cookieStore = await cookies();
  const viewerToken = cookieStore.get("viewer-session")?.value;
  const ownerSession = await getSessionFromCookies();

  let authorized = false;

  if (viewerToken) {
    const sessionRecord = await getSessionByToken(viewerToken);
    if (
      sessionRecord &&
      sessionRecord.documentId === document.documentId &&
      sessionRecord.session.active
    ) {
      authorized = true;
    }
  }

  if (!authorized && ownerSession && (ownerSession.role === "owner" || ownerSession.role === "admin")) {
    authorized = true;
  }

  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ownerControlsDocument =
    ownerSession &&
    (ownerSession.role === "admin" || ownerSession.id === document.ownerId);
  const downloadProtectionEnabled = Boolean(document.policies?.downloadDisabled) && !ownerControlsDocument;

  if (downloadProtectionEnabled) {
    const secFetchDest = request.headers.get("sec-fetch-dest");
    const secFetchMode = request.headers.get("sec-fetch-mode");
    const accept = request.headers.get("accept") ?? "";
    const looksLikeNavigation =
      secFetchMode === "navigate" ||
      (secFetchDest !== null && ["document", "iframe"].includes(secFetchDest));
    const wantsHtml =
      accept.includes("text/html") &&
      !accept.includes("application/pdf") &&
      !accept.includes("application/octet-stream");

    if (looksLikeNavigation || wantsHtml) {
      return NextResponse.json({ error: "Download blocked by policy" }, { status: 403 });
    }
  }

  try {
    const { body, contentType } = await getR2ObjectStream(attachment.key);
    if (!body) {
      return NextResponse.json({ error: "File unavailable" }, { status: 404 });
    }
    const safeFilename = attachment.name.replace(/["\r\n]/g, "_");
    return new NextResponse(body as ReadableStream, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "no-store, max-age=0, must-revalidate",
        "Content-Disposition": `inline; filename="${safeFilename}"`,
        "X-Content-Type-Options": "nosniff",
        "Cross-Origin-Resource-Policy": "same-origin",
      },
    });
  } catch (error) {
    console.error("Failed to fetch attachment", error);
    return NextResponse.json({ error: "Unable to fetch attachment" }, { status: 500 });
  }
}
