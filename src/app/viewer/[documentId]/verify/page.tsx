import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getDocumentById, getSessionByToken } from "@/lib/services/documentService";
import { IdentityVerificationScreen } from "@/components/receiver/IdentityVerificationScreen";

type Props = {
  params: Promise<{ documentId: string }>;
};

export default async function ViewerIdentityPage({ params }: Props) {
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

  if (!document.identityRequirement?.required || sessionRecord.session.identityVerified) {
    redirect(`/viewer/${documentId}`);
  }
  
  // Also show verification screen if photo capture is enabled
  const needsPhotoCapture = document.policies?.captureReaderPhoto ?? false;
  const alreadyHasPhoto = !!sessionRecord.session.viewerIdentity?.photo;
  
  if (!document.identityRequirement?.required && (!needsPhotoCapture || alreadyHasPhoto)) {
    redirect(`/viewer/${documentId}`);
  }
  
  // Determine if we're only capturing photo (no identity details needed)
  const photoOnly = !document.identityRequirement?.required && needsPhotoCapture;

  return (
    <IdentityVerificationScreen
      documentId={documentId}
      requirement={document.identityRequirement}
      viewerDevice={sessionRecord.viewer.device}
      photoOnly={photoOnly}
    />
  );
}
