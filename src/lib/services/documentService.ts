import { nanoid } from "nanoid";
import { supabaseServiceClient } from "@/lib/supabase/serverClient";
import {
  uploadToR2,
  deleteFromR2,
} from "@/lib/storage/r2";
import { env } from "@/lib/env";
import {
  DocumentPermissions,
  DocumentSecurityPolicy,
  DocumentAttachment,
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
import { emitSystemEvent } from "@/lib/server/eventBus";
import { createSession } from "@/lib/security/session";

const DOCUMENTS_TABLE = "documents";
const DOCUMENT_FILES_TABLE = "document_files";
const VIEWER_SESSIONS_TABLE = "viewer_sessions";
const DOCUMENT_SELECT =
  "id, owner_id, title, description, classification, permissions, watermark_fields, otp, rich_text, policies, identity_requirement, locked, locked_reason, locked_at, created_at, document_files(id,name,type,size,r2_key,url)";

const fallbackIdentityRequirement: ViewerIdentityRequirement = {
  required: false,
};

export type StoredDocument = SecureDocument & {
  otp: string;
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
  files?: {
    name: string;
    type: string;
    buffer: Buffer;
  }[];
};

type DocumentFileRow = {
  id: string;
  name: string;
  type: string;
  size: number;
  r2_key: string | null;
  url: string | null;
};

type DocumentRow = {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  classification: string;
  permissions: DocumentPermissions;
  watermark_fields: string[];
  otp: string;
  rich_text: string | null;
  policies: DocumentSecurityPolicy;
  identity_requirement: ViewerIdentityRequirement | null;
  locked: boolean;
  locked_reason?: string | null;
  locked_at?: string | null;
  created_at: string;
  document_files: DocumentFileRow[] | null;
};

type SessionRow = {
  token: string;
  document_id: string;
  session: SessionStatus;
  otp: string;
  viewer: ViewerProfile;
  revoked_reason?: string | null;
  history?: SessionHistory | null;
};

function deriveR2Key(file: DocumentFileRow): string | undefined {
  if (file.r2_key) {
    return file.r2_key;
  }
  if (!file.url || file.url.startsWith("/api/")) {
    return undefined;
  }
  try {
    const parsed = new URL(file.url);
    const bucketSegment = `/${env.r2Bucket}/`;
    const idx = parsed.pathname.indexOf(bucketSegment);
    if (idx >= 0) {
      return parsed.pathname.slice(idx + bucketSegment.length);
    }
    return parsed.pathname.replace(/^\/+/, "");
  } catch {
    return undefined;
  }
}

function mapAttachments(documentId: string, files?: DocumentFileRow[] | null): DocumentAttachment[] {
  if (!files) return [];
  return files.map((file) => ({
    id: file.id,
    name: file.name,
    type: file.type,
    size: file.size,
    url: `/api/documents/${documentId}/file?attachmentId=${file.id}`,
    key: deriveR2Key(file),
  }));
}

function mapDocument(row: DocumentRow): StoredDocument {
  const attachments = mapAttachments(row.id, row.document_files);
  return {
    documentId: row.id,
    ownerId: row.owner_id,
    title: row.title,
    description: row.description ?? undefined,
    classification: (row.classification as SecureDocument["classification"]) ?? "CONFIDENTIAL",
    encryptedBlob: "",
    permissions: row.permissions,
    watermarkFields: row.watermark_fields ?? ["viewerId", "ip", "timestamp"],
    logs: [],
    violations: [],
    richText: row.rich_text ?? undefined,
    fileUrl: attachments[0]?.url ?? null,
    fileName: attachments[0]?.name,
    fileType: attachments[0]?.type,
    attachments,
    policies: row.policies,
    createdAt: row.created_at,
    identityRequirement: row.identity_requirement ?? fallbackIdentityRequirement,
    locked: row.locked,
    lockedReason: row.locked_reason ?? undefined,
    lockedAt: row.locked_at ?? undefined,
    otp: row.otp,
  };
}

function mapSessionRow(row: SessionRow): StoredSession {
  return {
    token: row.token,
    documentId: row.document_id,
    session: row.session,
    otp: row.otp,
    viewer: row.viewer,
    revokedReason: row.revoked_reason ?? undefined,
    history: row.history ?? undefined,
  };
}

export async function listDocuments(ownerId?: string): Promise<StoredDocument[]> {
  const supabase = supabaseServiceClient();
  let query = supabase
    .from(DOCUMENTS_TABLE)
    .select(DOCUMENT_SELECT)
    .order("created_at", { ascending: false });
  if (ownerId) {
    query = query.eq("owner_id", ownerId);
  }
  const { data, error } = await query;
  if (error) {
    console.error("listDocuments failed", error);
    throw error;
  }
  return (data ?? []).map(mapDocument);
}

export async function getDocumentById(documentId: string) {
  const supabase = supabaseServiceClient();
  const { data, error } = await supabase
    .from(DOCUMENTS_TABLE)
    .select(DOCUMENT_SELECT)
    .eq("id", documentId)
    .single();
  if (error || !data) {
    return null;
  }
  return mapDocument(data);
}

export async function findDocumentByOtp(otp: string) {
  const supabase = supabaseServiceClient();
  const { data } = await supabase
    .from(DOCUMENTS_TABLE)
    .select(DOCUMENT_SELECT)
    .eq("otp", otp)
    .limit(1)
    .maybeSingle();
  return data ? mapDocument(data) : null;
}

export async function createDocument(input: CreateDocumentInput): Promise<StoredDocument> {
  const supabase = supabaseServiceClient();
  const id = nanoid();
  const docPayload = {
    id,
    owner_id: input.ownerId,
    title: input.title,
    description: input.description,
    classification: "CONFIDENTIAL",
    permissions: input.permissions,
    watermark_fields: ["viewerId", "ip", "timestamp"],
    otp: input.otp,
    rich_text: input.richText ?? null,
    policies: input.policies,
    identity_requirement: input.identityRequirement ?? fallbackIdentityRequirement,
    locked: false,
  };

  const { error } = await supabase.from(DOCUMENTS_TABLE).insert(docPayload);
  if (error) {
    console.error("createDocument failed", error);
    throw new Error(error.message);
  }

  if (input.files?.length) {
    const uploads = await Promise.all(
      input.files.map(async (file) => {
        const key = `${id}/${nanoid()}-${file.name}`;
        await uploadToR2(key, file.buffer, file.type || "application/octet-stream");
        const fileId = nanoid();
        return {
          id: fileId,
          document_id: id,
          name: file.name,
          type: file.type || "application/octet-stream",
          size: file.buffer.length,
          r2_key: key,
          url: `/api/documents/${id}/file?attachmentId=${fileId}`,
        };
      }),
    );
    const { error: fileError } = await supabase.from(DOCUMENT_FILES_TABLE).insert(uploads);
    if (fileError) {
      console.error("Failed to insert document files", fileError);
      throw new Error(fileError.message);
    }
  }

  const document = await getDocumentById(id);
  if (!document) {
    throw new Error("Document not found after creation");
  }
  emitSystemEvent({
    type: "DOCUMENT_CREATED",
    payload: { documentId: id, title: input.title },
    createdAt: new Date().toISOString(),
  });
  return document;
}

type SessionMutator = (record: StoredSession) => StoredSession;

async function mutateSession(token: string, mutator: SessionMutator) {
  const supabase = supabaseServiceClient();
  const { data, error } = await supabase
    .from(VIEWER_SESSIONS_TABLE)
    .select("*")
    .eq("token", token)
    .single();
  if (error || !data) {
    return null;
  }
  const current = mapSessionRow(data as SessionRow);
  const next = mutator(current);
  const { error: updateError } = await supabase
    .from(VIEWER_SESSIONS_TABLE)
    .update({
      session: next.session,
      revoked_reason: next.revokedReason ?? null,
      history: next.history ?? null,
    })
    .eq("token", token);
  if (updateError) {
    console.error("mutateSession update failed", updateError);
    throw updateError;
  }
  return next;
}

export async function createViewerSession(
  document: StoredDocument,
  otp: string,
  viewerAgent: string,
): Promise<{ token: string; session: SessionStatus; viewer: ViewerProfile }> {
  const supabase = supabaseServiceClient();
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
  const { error } = await supabase.from(VIEWER_SESSIONS_TABLE).insert({
    token,
    document_id: document.documentId,
    session,
    otp,
    viewer,
  });
  if (error) {
    console.error("createViewerSession failed", error);
    throw new Error(error.message);
  }
  emitSystemEvent({
    type: "OTP_VERIFIED",
    payload: { documentId: document.documentId, viewerId },
    createdAt: new Date().toISOString(),
  });
  return { token, session, viewer };
}

export async function listViewerSessions(): Promise<StoredSession[]> {
  const supabase = supabaseServiceClient();
  const { data, error } = await supabase.from(VIEWER_SESSIONS_TABLE).select("*");
  if (error) {
    console.error("listViewerSessions failed", error);
    throw error;
  }
  return (data ?? []).map((row) => mapSessionRow(row as SessionRow));
}

export async function getSessionByToken(token: string) {
  const supabase = supabaseServiceClient();
  const { data, error } = await supabase
    .from(VIEWER_SESSIONS_TABLE)
    .select("*")
    .eq("token", token)
    .maybeSingle();
  if (error || !data) {
    return null;
  }
  return mapSessionRow(data as SessionRow);
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

export async function lockDocument(documentId: string, reason?: string) {
  const supabase = supabaseServiceClient();
  await supabase
    .from(DOCUMENTS_TABLE)
    .update({
      locked: true,
      locked_reason: reason ?? "Security violation detected.",
      locked_at: new Date().toISOString(),
    })
    .eq("id", documentId);
}

export async function unlockDocument(documentId: string) {
  const supabase = supabaseServiceClient();
  await supabase
    .from(DOCUMENTS_TABLE)
    .update({
      locked: false,
      locked_reason: null,
      locked_at: null,
    })
    .eq("id", documentId);
}

export async function deleteDocument(
  documentId: string,
  options?: { purgeReaders?: boolean },
) {
  const supabase = supabaseServiceClient();
  const document = await getDocumentById(documentId);
  if (!document) {
    return false;
  }
  const attachments = document.attachments ?? [];
  await supabase.from(DOCUMENTS_TABLE).delete().eq("id", documentId);
  if (attachments.length) {
    await Promise.all(
      attachments.map((attachment) =>
        attachment.key ? deleteFromR2(attachment.key) : Promise.resolve(),
      ),
    );
  }
  const purgeReaders = options?.purgeReaders ?? true;
  if (purgeReaders) {
    await supabase.from(VIEWER_SESSIONS_TABLE).delete().eq("document_id", documentId);
    const { error: readerError } = await supabase
      .from("reader_documents")
      .delete()
      .eq("document_id", documentId);
    if (readerError) {
      console.warn("Failed to purge reader_documents", readerError);
    }
  }
  emitSystemEvent({
    type: "DOCUMENT_DELETED",
    payload: { documentId },
    createdAt: new Date().toISOString(),
  });
  return true;
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

function ensureHistory(record: StoredSession): SessionHistory {
  if (!record.history) {
    record.history = {
      logs: [],
      violations: [],
    };
  }
  return record.history;
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

export async function listReaderIdentities(ownerId?: string): Promise<ReaderSnapshot[]> {
  const supabase = supabaseServiceClient();
  let query = supabase
    .from(VIEWER_SESSIONS_TABLE)
    .select(
      `
        token,
        document_id,
        viewer,
        session,
        history,
        documents:documents ( id, owner_id, title, locked )
      `,
    )
    .filter("session->>identityVerified", "eq", "true");

  if (ownerId) {
    query = query.eq("documents.owner_id", ownerId);
  }

  const { data, error } = await query;
  if (error) {
    console.error("listReaderIdentities failed", error);
    throw error;
  }

  const rows = (data ?? []);
  const orphanedTokens = rows.filter((row: any) => !row.documents).map((row: any) => row.token);
  if (orphanedTokens.length) {
    await supabase.from(VIEWER_SESSIONS_TABLE).delete().in("token", orphanedTokens);
  }

  return rows
    .filter((row: any) => row.documents)
    .map((row: any) => {
      const session = row.session as SessionStatus;
      const history = (row.history as SessionHistory) ?? undefined;
      return {
        documentId: row.document_id,
        documentTitle: row.documents?.title ?? "",
        viewerId: session.viewerId,
        name: session.viewerIdentity?.name,
        phone: session.viewerIdentity?.phone,
        photo: session.viewerIdentity?.photo,
        verifiedAt: session.viewerIdentity?.verifiedAt,
        lastLocation: history?.lastLocation,
        logs: history?.logs?.slice(0, 8),
        violations: history?.violations?.slice(0, 8),
        locked: row.documents?.locked ?? false,
      };
    })
    .sort((a, b) => ( (b.verifiedAt ?? 0) - (a.verifiedAt ?? 0) ));
}

export async function deleteReaderRecord(viewerId: string) {
  const supabase = supabaseServiceClient();
  const { data, error } = await supabase
    .from(VIEWER_SESSIONS_TABLE)
    .select("token")
    .filter("viewer->>viewerId", "eq", viewerId);
  if (error) {
    console.error("deleteReaderRecord failed", error);
    throw error;
  }
  if (!data?.length) {
    return false;
  }
  await Promise.all(
    data.map((row: { token: string }) =>
      mutateSession(row.token, (record) => {
        record.session.identityVerified = false;
        record.session.viewerIdentity = undefined;
        record.history = undefined;
        return record;
      }),
    ),
  );
  return true;
}
