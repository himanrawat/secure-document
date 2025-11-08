import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  attachViewerIdentity,
  getDocumentById,
  getSessionByToken,
} from "@/lib/services/documentService";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("viewer-session")?.value;
    if (!token) {
      return NextResponse.json({ error: "Missing session" }, { status: 401 });
    }

    const sessionRecord = await getSessionByToken(token);
    if (!sessionRecord) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const document = await getDocumentById(sessionRecord.documentId);
    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const body = await request.json();
    const name = String(body.name ?? "").trim();
    const phone = String(body.phone ?? "").trim();
    const photo = typeof body.photo === "string" && body.photo.startsWith("data:") ? body.photo : undefined;

    const requirement = document.identityRequirement;
    if (requirement?.required) {
      if (!name || !phone) {
        return NextResponse.json({ error: "Name and phone are required." }, { status: 400 });
      }
    }

    if (requirement?.enforceMatch) {
      if (
        requirement.expectedName &&
        name.toLowerCase() !== requirement.expectedName.trim().toLowerCase()
      ) {
        return NextResponse.json({ error: "Provided name does not match the expected viewer." }, { status: 403 });
      }
      if (
        requirement.expectedPhone &&
        phone.replace(/\D/g, "") !== requirement.expectedPhone.replace(/\D/g, "")
      ) {
        return NextResponse.json({ error: "Provided phone does not match the expected viewer." }, { status: 403 });
      }
    }

    if (!photo) {
      return NextResponse.json({ error: "Photo capture required." }, { status: 400 });
    }

    await attachViewerIdentity(token, { name, phone, photo });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("viewer identity capture failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
