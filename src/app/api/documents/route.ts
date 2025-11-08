import { NextResponse } from "next/server";
import { createDocument, listDocuments } from "@/lib/services/documentService";

export const dynamic = "force-dynamic";

export async function GET() {
  const documents = await listDocuments();
  const sanitized = documents.map((doc) => {
    const { encryptedBlob: _enc, filePath: _path, ...rest } = doc;
    void _enc;
    void _path;
    return rest;
  });
  return NextResponse.json({ documents: sanitized });
}

export async function POST(request: Request) {
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

  const file = formData.get("file");
  let uploadData: { name: string; type: string; buffer: Buffer } | undefined;
  if (file && file instanceof File && file.size > 0) {
    const arrayBuffer = await file.arrayBuffer();
    uploadData = {
      name: file.name,
      type: file.type || "application/octet-stream",
      buffer: Buffer.from(arrayBuffer),
    };
  }

  const document = await createDocument({
    title,
    description,
    otp,
    ownerId: "owner-root",
    permissions,
    policies,
    identityRequirement,
    richText,
    file: uploadData,
  });

  const { encryptedBlob: _enc, filePath: _path, ...sanitized } = document;
  void _enc;
  void _path;
  return NextResponse.json({ document: sanitized });
}
