import { NextResponse } from "next/server";
import { unlockDocument } from "@/lib/services/documentService";

export const dynamic = "force-dynamic";

type Params = {
  params: Promise<{ id: string }>;
};

export async function POST(_: Request, context: Params) {
  const { id } = await context.params;
  await unlockDocument(id);
  return NextResponse.json({ ok: true });
}
