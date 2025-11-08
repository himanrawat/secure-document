import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { markSessionInactive } from "@/lib/services/documentService";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("viewer-session")?.value;
    if (!token) {
      return NextResponse.json({ error: "Missing session" }, { status: 401 });
    }

    const payload = await request.json().catch(() => ({}));
    await markSessionInactive(token, payload?.reason);

    const response = NextResponse.json({ ok: true });
    response.cookies.set("viewer-session", "", { path: "/", maxAge: 0 });
    return response;
  } catch (error) {
    console.error("session revoke failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
