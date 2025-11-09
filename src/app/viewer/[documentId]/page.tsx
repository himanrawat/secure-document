import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { SecureViewerShell } from "@/components/security/SecureViewerShell";
import { getDocumentById, getSessionByToken } from "@/lib/services/documentService";

export const dynamic = "force-dynamic";

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
  if (document.locked) {
    redirect("/");
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

  const { otp: _ignoredOtp, ...safeDocument } = document;
  void _ignoredOtp;
  return (
    <SecureViewerShell
      document={safeDocument}
      viewer={sessionRecord.viewer}
      initialSession={sessionRecord.session}
    />
  );
}
