import { NextResponse } from "next/server";
import { deleteDocument, getDocumentById } from "@/lib/services/documentService";

export const dynamic = "force-dynamic";

export async function GET(
  _: Request,
  { params }: { params: { id: string } },
) {
  const document = await getDocumentById(params.id);
  if (!document) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }
  const { otp: _otp, ...sanitized } = document;
  return NextResponse.json({ document: sanitized });
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } },
) {
  const url = new URL(request.url);
  const purgeParam = url.searchParams.get("purgeReaders");
  const purgeReaders = purgeParam === null ? true : purgeParam === "true";
  const removed = await deleteDocument(params.id, { purgeReaders });
  if (!removed) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
