import { NextResponse } from "next/server";
import { getDocumentById } from "@/lib/services/documentService";
import { promises as fs } from "fs";

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, context: Params) {
  const { id } = await context.params;
  const document = await getDocumentById(id);
  if (!document || !document.filePath) {
    return NextResponse.json({ error: "File not available" }, { status: 404 });
  }

  const data = await fs.readFile(document.filePath);
  return new NextResponse(data, {
    headers: {
      "Content-Type": document.fileType ?? "application/octet-stream",
      "Content-Disposition": `inline; filename="${document.fileName ?? "secure-file"}"`,
      "Cache-Control": "no-store",
    },
  });
}
