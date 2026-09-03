import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const packageDirectory = path.resolve(
	fileURLToPath(new URL("..", import.meta.url)),
);
export const lockPath = path.join(packageDirectory, "schema.lock.json");
export const cacheDirectory = path.join(packageDirectory, ".schema-cache");

export const readLock = async () =>
	JSON.parse(await readFile(lockPath, "utf8"));
export const schemaUrl = (lock) =>
	`https://raw.githubusercontent.com/${lock.repository}/${lock.commit}/${lock.path}`;
export const digest = (bytes) =>
	createHash("sha256").update(bytes).digest("hex");
export const cachePath = (lock) =>
	path.join(cacheDirectory, `${lock.commit}-${lock.sha256}.json`);

export async function obtainVerifiedSchema(lock) {
	const target = cachePath(lock);
	try {
		const cached = await readFile(target);
		if (digest(cached) === lock.sha256) return target;
	} catch {}

	const response = await fetch(schemaUrl(lock));
	if (!response.ok)
		throw new Error(
			`Schema download failed: ${response.status} ${response.statusText}`,
		);
	const bytes = Buffer.from(await response.arrayBuffer());
	const actual = digest(bytes);
	if (actual !== lock.sha256) {
		throw new Error(
			`Schema digest mismatch: expected ${lock.sha256}, received ${actual}`,
		);
	}
	await mkdir(cacheDirectory, { recursive: true });
	await writeFile(target, bytes);
	return target;
}

export function validateFullCommit(commit) {
	if (!/^[0-9a-f]{40}$/.test(commit))
		throw new Error("Schema commit must be a full 40-character lowercase SHA");
}
