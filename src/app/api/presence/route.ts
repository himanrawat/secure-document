import { NextResponse } from "next/server";
import { recordPresenceEvent } from "@/lib/services/documentService";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json();
  const documentId = String(body.documentId ?? "");
  if (!documentId) {
    return NextResponse.json({ error: "documentId required" }, { status: 400 });
  }

  await recordPresenceEvent(documentId, {
    timestamp: new Date().toISOString(),
    location: body.location ?? null,
    photo: body.photo ?? null,
  });

  return NextResponse.json({ ok: true });
}
