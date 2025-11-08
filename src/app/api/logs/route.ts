import { NextResponse } from "next/server";
import { emitSystemEvent } from "@/lib/server/eventBus";

export async function POST(request: Request) {
  const payload = await request.json();
  emitSystemEvent({
    type: "SESSION_HEARTBEAT",
    payload,
    createdAt: new Date().toISOString(),
  });
  return NextResponse.json({
    status: "LOGGED",
    receivedAt: new Date().toISOString(),
    payload,
  });
}
