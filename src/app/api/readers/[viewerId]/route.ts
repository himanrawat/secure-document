import { NextResponse } from "next/server";
import { deleteReaderRecord } from "@/lib/services/documentService";

export const dynamic = "force-dynamic";

type Params = {
  params: Promise<{ viewerId: string }>;
};

export async function DELETE(_: Request, context: Params) {
  const { viewerId } = await context.params;
  const removed = await deleteReaderRecord(viewerId);
  if (!removed) {
    return NextResponse.json({ error: "Reader not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
