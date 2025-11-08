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

  return (
    <IdentityVerificationScreen
      documentId={documentId}
      requirement={document.identityRequirement}
      viewerDevice={sessionRecord.viewer.device}
    />
  );
}
