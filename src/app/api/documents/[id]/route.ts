import { NextResponse } from "next/server";
import { deleteDocument, getDocumentById } from "@/lib/services/documentService";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(
  _: Request,
  context: RouteContext,
) {
  const { id } = await context.params;
  const document = await getDocumentById(id);
  if (!document) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }
  const { otp: _otp, ...sanitized } = document;
  return NextResponse.json({ document: sanitized });
}

export async function DELETE(
  request: Request,
  context: RouteContext,
) {
  const { id } = await context.params;
  const url = new URL(request.url);
  const purgeParam = url.searchParams.get("purgeReaders");
  const purgeReaders = purgeParam === null ? true : purgeParam === "true";
  const removed = await deleteDocument(id, { purgeReaders });
  if (!removed) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
