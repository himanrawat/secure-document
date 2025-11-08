import path from "path";
import { existsSync, mkdirSync } from "fs";

const baseStorageDir = path.join(process.cwd(), "storage");

function ensure(dir: string) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

export function getStorageDir() {
  ensure(baseStorageDir);
  return baseStorageDir;
}

export function getDocumentsDir() {
  const dir = path.join(getStorageDir(), "documents");
  ensure(dir);
  return dir;
}

export function getUploadsDir() {
  const dir = path.join(getStorageDir(), "uploads");
  ensure(dir);
  return dir;
}

export function getSessionsDir() {
  const dir = path.join(getStorageDir(), "sessions");
  ensure(dir);
  return dir;
}
