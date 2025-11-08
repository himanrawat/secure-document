import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { createViewerSession, findDocumentByOtp } from "@/lib/services/documentService";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const code = String(body.code ?? "").trim();
    if (!code) {
      return NextResponse.json({ error: "Access code required" }, { status: 400 });
    }

    const document = await findDocumentByOtp(code);
    if (!document) {
      return NextResponse.json({ error: "Invalid or expired code" }, { status: 404 });
    }

    const headerList = await headers();
    const userAgent = headerList.get("user-agent") ?? "unknown-device";
    const { token } = await createViewerSession(document, code, userAgent);

    const response = NextResponse.json({
      ok: true,
      documentId: document.documentId,
      requireIdentity: document.identityRequirement?.required ?? false,
    });
    response.cookies.set("viewer-session", token, {
      httpOnly: true,
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60,
    });
    return response;
  } catch (error) {
    console.error("OTP verification failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
