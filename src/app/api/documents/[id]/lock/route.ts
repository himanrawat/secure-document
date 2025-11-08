import { NextResponse } from "next/server";
import { lockDocument } from "@/lib/services/documentService";

export const dynamic = "force-dynamic";

type Params = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: Params) {
  const { id } = await context.params;
  const payload = await request.json().catch(() => ({}));
  await lockDocument(id, payload?.reason);
  return NextResponse.json({ ok: true });
}
