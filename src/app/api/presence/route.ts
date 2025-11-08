import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { recordPresenceEvent } from "@/lib/services/documentService";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json();
  const documentId = String(body.documentId ?? "");
  if (!documentId) {
    return NextResponse.json({ error: "documentId required" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const token = cookieStore.get("viewer-session")?.value;
  if (!token) {
    return NextResponse.json({ error: "Missing session" }, { status: 401 });
  }

  const location = body.location
    ? {
        lat: Number(body.location.lat),
        lon: Number(body.location.lon),
        accuracy: body.location.accuracy ? Number(body.location.accuracy) : undefined,
        capturedAt: body.location.capturedAt ?? new Date().toISOString(),
      }
    : undefined;

  await recordPresenceEvent(token, documentId, {
    location: location ?? null,
    photo: typeof body.photo === "string" ? body.photo : null,
    frameHash: typeof body.frameHash === "string" ? body.frameHash : null,
    reason: body.reason ?? "presence",
  });

  return NextResponse.json({ ok: true });
}
