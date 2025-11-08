import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { SecureViewerShell } from "@/components/security/SecureViewerShell";
import { getDocumentById, getSessionByToken } from "@/lib/services/documentService";

type Props = {
  params: Promise<{ documentId: string }>;
};

export default async function ViewerPage({ params }: Props) {
  const { documentId } = await params;
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("viewer-session")?.value;
  if (!sessionToken) {
    redirect("/");
  }
  const sessionRecord = await getSessionByToken(sessionToken);
  if (!sessionRecord || sessionRecord.documentId !== documentId) {
    redirect("/");
  }
  const document = await getDocumentById(documentId);
  if (!document) {
    notFound();
  }
  if (!sessionRecord.session.active) {
    redirect("/");
  }
  
  // Check if identity verification is required
  const needsIdentityVerification = document.identityRequirement?.required && !sessionRecord.session.identityVerified;
  
  // Check if photo capture is required but not yet captured
  const needsPhotoCapture = (document.policies?.captureReaderPhoto ?? false) && !sessionRecord.session.viewerIdentity?.photo;
  
  if (needsIdentityVerification || needsPhotoCapture) {
    redirect(`/viewer/${documentId}/verify`);
  }

  const { otp: _ignoredOtp, ...sanitizedDoc } = document;
  void _ignoredOtp;
  const safeDocument = {
    ...sanitizedDoc,
    fileUrl: document.filePath ? `/api/documents/${document.documentId}/file` : document.fileUrl ?? null,
  };
  return (
    <SecureViewerShell
      document={safeDocument}
      viewer={sessionRecord.viewer}
      initialSession={sessionRecord.session}
    />
  );
}
