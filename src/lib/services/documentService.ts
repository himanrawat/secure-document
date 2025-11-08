import path from "path";
import { promises as fs } from "fs";
import { nanoid } from "nanoid";
import {
  DocumentPermissions,
  DocumentSecurityPolicy,
  SecureDocument,
  SessionStatus,
  ViewerIdentityRequirement,
  ViewerProfile,
} from "@/lib/types/security";
import {
  ReaderLocation,
  ReaderLogEntry,
  ReaderSnapshot,
  ReaderViolationEntry,
} from "@/lib/types/reader";
import { getDocumentsDir, getSessionsDir, getUploadsDir } from "@/lib/server/paths";
import { ensureDir, listJsonFiles, readJson, writeJson } from "@/lib/server/fs";
import { emitSystemEvent } from "@/lib/server/eventBus";
import { createSession } from "@/lib/security/session";

const fallbackIdentityRequirement: ViewerIdentityRequirement = {
  required: false,
};

export type StoredDocument = SecureDocument & {
  otp: string;
  filePath?: string;
  fileName?: string;
  fileType?: string;
  richText?: string;
  policies: DocumentSecurityPolicy;
  createdAt: string;
  identityRequirement: ViewerIdentityRequirement;
};

type SessionHistory = {
  logs: ReaderLogEntry[];
  violations: ReaderViolationEntry[];
  lastLocation?: ReaderLocation;
};

export type StoredSession = {
  token: string;
  session: SessionStatus;
  documentId: string;
  otp: string;
  viewer: ViewerProfile;
  revokedReason?: string;
  history?: SessionHistory;
};

export type CreateDocumentInput = {
  title: string;
  description: string;
  otp: string;
  ownerId: string;
  permissions: DocumentPermissions;
  policies: DocumentSecurityPolicy;
  identityRequirement?: ViewerIdentityRequirement;
  richText?: string;
  file?: {
    name: string;
    type: string;
    buffer: Buffer;
  };
};

export async function listDocuments(): Promise<StoredDocument[]> {
  return listJsonFiles<StoredDocument>(getDocumentsDir());
}

export async function listViewerSessions(): Promise<StoredSession[]> {
  return listJsonFiles<StoredSession>(getSessionsDir());
}

export async function getDocumentById(documentId: string) {
  return readJson<StoredDocument>(path.join(getDocumentsDir(), `${documentId}.json`));
}

export async function findDocumentByOtp(otp: string) {
  const docs = await listDocuments();
  return docs.find((doc) => doc.otp.toLowerCase() === otp.toLowerCase()) ?? null;
}

export async function createDocument(input: CreateDocumentInput): Promise<StoredDocument> {
  const id = nanoid();
  const uploadsDir = path.join(getUploadsDir(), id);
  await ensureDir(uploadsDir);

  let filePath: string | undefined;
  let fileName: string | undefined;
  let fileType: string | undefined;

  if (input.file) {
    fileName = input.file.name;
    fileType = input.file.type;
    filePath = path.join(uploadsDir, fileName);
    await fs.writeFile(filePath, input.file.buffer);
  }

  const record: StoredDocument = {
    documentId: id,
    ownerId: input.ownerId,
    title: input.title,
    description: input.description,
    classification: "CONFIDENTIAL",
    encryptedBlob: filePath ?? "",
    permissions: input.permissions,
    watermarkFields: ["viewerId", "ip", "timestamp"],
    logs: [],
    violations: [],
    otp: input.otp,
    filePath,
    fileName,
    fileType,
    richText: input.richText,
    policies: input.policies,
    createdAt: new Date().toISOString(),
    fileUrl: filePath ? `/api/documents/${id}/file` : null,
    identityRequirement: input.identityRequirement ?? fallbackIdentityRequirement,
  };

  await writeJson(path.join(getDocumentsDir(), `${id}.json`), record);

  emitSystemEvent({
    type: "DOCUMENT_CREATED",
    payload: { documentId: id, title: input.title },
    createdAt: new Date().toISOString(),
  });

  return record;
}

export async function createViewerSession(
  document: StoredDocument,
  otp: string,
  viewerAgent: string,
): Promise<{ token: string; session: SessionStatus; viewer: ViewerProfile }> {
  const viewerId = `viewer-${nanoid(6)}`;
  const session = createSession(document, viewerId);
  const token = nanoid(24);

  const viewer: ViewerProfile = {
    viewerId,
    name: "Confidential Viewer",
    email: "unknown@secured",
    device: {
      id: viewerAgent,
      label: viewerAgent,
      platform: viewerAgent,
      ipAddress: "0.0.0.0",
      createdAt: new Date().toISOString(),
    },
  };

  await writeJson(path.join(getSessionsDir(), `${token}.json`), {
    token,
    session,
    documentId: document.documentId,
    otp,
    viewer,
  });

  emitSystemEvent({
    type: "OTP_VERIFIED",
    payload: { documentId: document.documentId, viewerId },
    createdAt: new Date().toISOString(),
  });

  return { token, session, viewer };
}

export async function getSessionByToken(token: string) {
  return readJson<StoredSession>(path.join(getSessionsDir(), `${token}.json`));
}

async function mutateSession(
  token: string,
  mutator: (record: StoredSession) => StoredSession,
): Promise<StoredSession | null> {
  const sessionPath = path.join(getSessionsDir(), `${token}.json`);
  const record = await readJson<StoredSession>(sessionPath);
  if (!record) {
    return null;
  }
  const next = mutator(record);
  await writeJson(sessionPath, next);
  return next;
}

function ensureHistory(record: StoredSession): SessionHistory {
  if (!record.history) {
    record.history = {
      logs: [],
      violations: [],
    };
  }
  return record.history;
}

export async function markSessionInactive(token: string, reason?: string) {
  const updated = await mutateSession(token, (record) => {
    record.session.active = false;
    record.revokedReason = reason;
    return record;
  });
  if (updated) {
    emitSystemEvent({
      type: "SESSION_REVOKED_EVENT",
      payload: { documentId: updated.documentId, reason },
      createdAt: new Date().toISOString(),
    });
  }
}

export async function appendSessionLogEntry(
  token: string,
  input: { event: string; context?: Record<string, unknown> },
) {
  await mutateSession(token, (record) => {
    const history = ensureHistory(record);
    const entry: ReaderLogEntry = {
      id: nanoid(),
      event: input.event,
      createdAt: new Date().toISOString(),
      context: input.context,
    };
    history.logs = [entry, ...history.logs].slice(0, 40);
    return record;
  });
}

export async function attachViewerIdentity(
  token: string,
  identity: { name?: string; phone?: string; photo?: string },
) {
  const updated = await mutateSession(token, (record) => {
    record.session.identityVerified = true;
    record.session.viewerIdentity = {
      name: identity.name,
      phone: identity.phone,
      photo: identity.photo,
      verifiedAt: Date.now(),
    };
    return record;
  });
  if (updated) {
    emitSystemEvent({
      type: "VIEWER_IDENTITY_CAPTURED",
      payload: {
        documentId: updated.documentId,
        viewerId: updated.session.viewerId,
        name: identity.name,
        phone: identity.phone,
        photo: identity.photo,
      },
      createdAt: new Date().toISOString(),
    });
  }
  return updated;
}

export async function recordPresenceEvent(
  token: string,
  docId: string,
  payload: {
    location?: ReaderLocation | null;
    photo?: string | null;
    frameHash?: string | null;
    reason?: string;
  },
) {
  await mutateSession(token, (record) => {
    const history = ensureHistory(record);
    if (payload.location) {
      history.lastLocation = payload.location;
    }
    return record;
  });
  emitSystemEvent({
    type: "PRESENCE_CAPTURED",
    payload: { documentId: docId, ...payload },
    createdAt: new Date().toISOString(),
  });
}

export async function recordSessionViolation(
  token: string,
  input: {
    violation: { id: string; code: string; description: string; createdAt: string };
    photo?: string | null;
    location?: ReaderLocation | null;
  },
) {
  await mutateSession(token, (record) => {
    const history = ensureHistory(record);
    const entry: ReaderViolationEntry = {
      id: input.violation.id,
      code: input.violation.code,
      message: input.violation.description,
      occurredAt: input.violation.createdAt,
      photo: input.photo ?? undefined,
    };
    history.violations = [entry, ...history.violations].slice(0, 25);
    if (input.location) {
      history.lastLocation = input.location;
    }
    return record;
  });
}

export async function listReaderIdentities(): Promise<ReaderSnapshot[]> {
  const [sessions, documents] = await Promise.all([listViewerSessions(), listDocuments()]);
  const docLookup = new Map(documents.map((doc) => [doc.documentId, doc]));
  return sessions
    .filter((session) => session.session.identityVerified)
    .map((session) => {
      const doc = docLookup.get(session.documentId);
      const history = session.history;
      return {
        documentId: session.documentId,
        documentTitle: doc?.title ?? "Unknown",
        viewerId: session.session.viewerId,
        name: session.session.viewerIdentity?.name,
        phone: session.session.viewerIdentity?.phone,
        photo: session.session.viewerIdentity?.photo,
        verifiedAt: session.session.viewerIdentity?.verifiedAt,
        lastLocation: history?.lastLocation,
        logs: history?.logs?.slice(0, 8),
        violations: history?.violations?.slice(0, 8),
      };
    })
    .sort((a, b) => (b.verifiedAt ?? 0) - (a.verifiedAt ?? 0));
}
