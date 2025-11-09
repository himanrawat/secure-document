import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { emitSystemEvent } from "@/lib/server/eventBus";
import { appendSessionLogEntry } from "@/lib/services/documentService";

export async function POST(request: Request) {
  let payload: Record<string, unknown> = {};
  const text = await request.text();
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = {};
    }
  }
  const data = payload.data ?? payload;
  const cookieStore = await cookies();
  const token = cookieStore.get("viewer-session")?.value;
  if (token) {
    await appendSessionLogEntry(token, {
      event: String(data.event ?? "UNKNOWN"),
      context: data.context,
    });
  }
  emitSystemEvent({
    type: "SESSION_HEARTBEAT",
    payload: data,
    createdAt: new Date().toISOString(),
  });
  return NextResponse.json({
    status: "LOGGED",
    receivedAt: new Date().toISOString(),
    payload: data,
  });
}
