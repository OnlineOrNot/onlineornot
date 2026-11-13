import { mkdir } from "node:fs/promises";
import path from "node:path";

import { lock } from "proper-lockfile";

import { getCredentialsPath } from "./credentials";

export async function withCredentialsLock<T>(
	operation: () => Promise<T>,
): Promise<T> {
	const credentialsPath = getCredentialsPath();
	await mkdir(path.dirname(credentialsPath), { recursive: true, mode: 0o700 });
	const release = await lock(credentialsPath, {
		realpath: false,
		retries: { retries: 100, minTimeout: 100, maxTimeout: 250 },
	});
	try {
		return await operation();
	} finally {
		await release();
	}
}
