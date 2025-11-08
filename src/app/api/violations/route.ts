import { NextResponse } from "next/server";
import { emitSystemEvent } from "@/lib/server/eventBus";

export async function POST(request: Request) {
  const payload = await request.json();
  emitSystemEvent({
    type: "VIOLATION",
    payload,
    createdAt: new Date().toISOString(),
  });
  return NextResponse.json({
    status: "VIOLATION_RECORDED",
    receivedAt: new Date().toISOString(),
    payload,
  });
}
