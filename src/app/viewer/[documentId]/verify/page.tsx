import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getDocumentById, getSessionByToken } from "@/lib/services/documentService";
import { IdentityVerificationScreen } from "@/components/receiver/IdentityVerificationScreen";

export const dynamic = "force-dynamic";

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

  const requiresIdentity = document.identityRequirement?.required ?? false;
  const identitySatisfied = sessionRecord.session.identityVerified;
  const needsPhotoCapture = document.policies?.captureReaderPhoto ?? false;
  const photoSatisfied = !!sessionRecord.session.viewerIdentity?.photo;

  if ((!requiresIdentity || identitySatisfied) && (!needsPhotoCapture || photoSatisfied)) {
    redirect(`/viewer/${documentId}`);
  }

  const photoOnly = !requiresIdentity && needsPhotoCapture;
  const requirement = document.identityRequirement ?? { required: false };

  return (
    <IdentityVerificationScreen
      documentId={documentId}
      requirement={requirement}
      viewerDevice={sessionRecord.viewer.device}
      photoOnly={photoOnly}
    />
  );
}
