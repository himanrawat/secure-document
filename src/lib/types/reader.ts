export type ReaderLocation = {
  lat: number;
  lon: number;
  accuracy?: number;
  capturedAt: string;
};

export type ReaderLogEntry = {
  id: string;
  event: string;
  createdAt: string;
  context?: Record<string, unknown>;
};

export type ReaderViolationEntry = {
  id: string;
  code: string;
  message: string;
  occurredAt: string;
  photo?: string;
};

export type ReaderSnapshot = {
  documentId: string;
  documentTitle: string;
  viewerId: string;
  name?: string;
  phone?: string;
  photo?: string;
  verifiedAt?: number;
  lastLocation?: ReaderLocation;
  logs?: ReaderLogEntry[];
  violations?: ReaderViolationEntry[];
  locked?: boolean;
  files?: { name: string; url: string }[];
};
