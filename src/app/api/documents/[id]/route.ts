import { NextResponse } from "next/server";
import { getDocumentById } from "@/lib/services/documentService";

export const dynamic = "force-dynamic";

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, context: Params) {
  const { id } = await context.params;
  const document = await getDocumentById(id);
  if (!document) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }
  const { otp: _otp, ...sanitized } = document;
  void _otp;
  return NextResponse.json({
    document: {
      ...sanitized,
      fileUrl: document.filePath ? `/api/documents/${document.documentId}/file` : null,
    },
  });
}
