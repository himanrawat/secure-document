import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session";
import { listReaderIdentities } from "@/lib/services/documentService";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSessionFromCookies();
  if (!session || (session.role !== "owner" && session.role !== "admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ownerScope = session.role === "owner" ? session.id : undefined;
  const readers = await listReaderIdentities(ownerScope);
  return NextResponse.json({ readers });
}
