import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { emitSystemEvent } from "@/lib/server/eventBus";
import { recordSessionViolation } from "@/lib/services/documentService";

export async function POST(request: Request) {
  const payload = await request.json();
  const data = payload.data ?? payload;
  const cookieStore = await cookies();
  const token = cookieStore.get("viewer-session")?.value;
  if (token && data.violation) {
    await recordSessionViolation(token, {
      violation: data.violation,
      photo: typeof data.evidence?.photo === "string" ? data.evidence.photo : null,
      location: data.evidence?.location ?? null,
    });
  }
  emitSystemEvent({
    type: "VIOLATION",
    payload: data,
    createdAt: new Date().toISOString(),
  });
  return NextResponse.json({
    status: "VIOLATION_RECORDED",
    receivedAt: new Date().toISOString(),
    payload: data,
  });
}
