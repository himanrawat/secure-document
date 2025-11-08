import { NextResponse } from "next/server";
import { listReaderIdentities } from "@/lib/services/documentService";

export const dynamic = "force-dynamic";

export async function GET() {
  const readers = await listReaderIdentities();
  return NextResponse.json({ readers });
}
