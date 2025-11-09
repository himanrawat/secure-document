import { promises as fs } from "node:fs";
import path from "node:path";

// Simple in-memory lock to prevent concurrent writes to the same file
const fileLocks = new Map<string, Promise<void>>();

async function withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
	// Wait for any existing lock on this file
	while (fileLocks.has(key)) {
		await fileLocks.get(key);
	}

	// Create a new lock
	let releaseLock: () => void;
	const lockPromise = new Promise<void>((resolve) => {
		releaseLock = resolve;
	});
	fileLocks.set(key, lockPromise);

	try {
		// Execute the function
		return await fn();
	} finally {
		// Release the lock
		fileLocks.delete(key);
		releaseLock!();
	}
}

export async function ensureDir(dir: string) {
	await fs.mkdir(dir, { recursive: true });
}

export async function writeJson(filePath: string, data: unknown) {
	return withLock(filePath, async () => {
		await ensureDir(path.dirname(filePath));
		await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf8");
	});
}

export async function readJson<T>(filePath: string): Promise<T | null> {
	try {
		const content = await fs.readFile(filePath, "utf8");
		return JSON.parse(content) as T;
	} catch (error: unknown) {
		if (isNodeError(error) && error.code === "ENOENT") {
			return null;
		}
		throw error;
	}
}

export async function listJsonFiles<T>(dir: string): Promise<T[]> {
	try {
		const entries = await fs.readdir(dir);
		const items: T[] = [];
		for (const entry of entries) {
			if (!entry.endsWith(".json")) continue;
			try {
				const data = await readJson<T>(path.join(dir, entry));
				if (data) {
					items.push(data);
				}
			} catch (error) {
				// Skip corrupted JSON files instead of failing the entire operation
				console.warn(`Skipping corrupted JSON file: ${entry}`, error);
				continue;
			}
		}
		return items;
	} catch (error: unknown) {
		if (isNodeError(error) && error.code === "ENOENT") {
			return [];
		}
		throw error;
	}
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
	return typeof error === "object" && error !== null && "code" in error;
}
