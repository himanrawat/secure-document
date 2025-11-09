import { NextResponse } from "next/server";
import { createDocument, listDocuments } from "@/lib/services/documentService";
import { getSessionFromCookies } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSessionFromCookies();
  if (!session || (session.role !== "owner" && session.role !== "admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const documents = await listDocuments(session.id);
  const sanitized = documents.map(({ encryptedBlob: _enc, ...rest }) => {
    void _enc;
    return rest;
  });
  return NextResponse.json({ documents: sanitized });
}

export async function POST(request: Request) {
  const session = await getSessionFromCookies();
  if (!session || (session.role !== "owner" && session.role !== "admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const formData = await request.formData();
  const title = String(formData.get("title") ?? "");
  const description = String(formData.get("description") ?? "");
  const otp = String(formData.get("otp") ?? "");
  const permissionsRaw = formData.get("permissions");
  const policiesRaw = formData.get("policies");
  const identityRaw = formData.get("identityRequirement");
  const richText = formData.get("richText") ? String(formData.get("richText")) : undefined;

  if (!title || !otp) {
    return NextResponse.json({ error: "Title and OTP are required." }, { status: 400 });
  }

  let permissions;
  let policies;
  let identityRequirement;
  try {
    permissions = JSON.parse(String(permissionsRaw));
    policies = JSON.parse(String(policiesRaw));
    identityRequirement = identityRaw ? JSON.parse(String(identityRaw)) : { required: false };
  } catch {
    return NextResponse.json({ error: "Invalid security payload." }, { status: 400 });
  }

  const uploadData: { name: string; type: string; buffer: Buffer }[] = [];
  const fileEntries = formData.getAll("files").filter((entry) => entry instanceof File) as File[];
  for (const file of fileEntries) {
    if (file.size === 0) continue;
    const arrayBuffer = await file.arrayBuffer();
    uploadData.push({
      name: file.name,
      type: file.type || "application/octet-stream",
      buffer: Buffer.from(arrayBuffer),
    });
  }
  const legacyFile = formData.get("file");
  if (legacyFile instanceof File && legacyFile.size > 0) {
    const arrayBuffer = await legacyFile.arrayBuffer();
    uploadData.push({
      name: legacyFile.name,
      type: legacyFile.type || "application/octet-stream",
      buffer: Buffer.from(arrayBuffer),
    });
  }

  const document = await createDocument({
    title,
    description,
    otp,
    ownerId: session.id,
    permissions,
    policies,
    identityRequirement,
    richText,
    files: uploadData,
  });

  const { encryptedBlob: _enc, ...sanitized } = document;
  void _enc;
  return NextResponse.json({ document: sanitized });
}
