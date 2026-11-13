import os from "node:os";
import path from "node:path";

import Conf from "conf";

export interface StoredUser {
	email: string;
	name?: string;
}

export interface Credentials {
	accessToken: string;
	mcpAccessToken?: string;
	mcpExpiresAt?: number;
	refreshToken: string;
	expiresAt: number;
	scopes: string[];
	user: StoredUser;
}

const config = new Conf<Credentials>({
	projectName: "onlineornot",
	cwd: path.join(os.homedir(), ".config", "onlineornot"),
	configName: "credentials",
	configFileMode: 0o600,
});

function isString(value: string): value is string {
	return typeof value === "string";
}

/**
 * Validate that stored credentials have the expected shape.
 * Returns null if validation fails (corrupted/tampered storage).
 */
function isValidCredentials(data: Partial<Credentials>): data is Credentials {
	return !(
		typeof data.accessToken !== "string" ||
		typeof data.refreshToken !== "string" ||
		typeof data.expiresAt !== "number" ||
		!Number.isFinite(data.expiresAt) ||
		!(
			(data.mcpAccessToken === undefined && data.mcpExpiresAt === undefined) ||
			(typeof data.mcpAccessToken === "string" &&
				typeof data.mcpExpiresAt === "number" &&
				Number.isFinite(data.mcpExpiresAt))
		) ||
		!Array.isArray(data.scopes) ||
		!data.scopes.every(isString) ||
		typeof data.user !== "object" ||
		data.user === null ||
		typeof data.user.email !== "string" ||
		(data.user.name !== undefined && typeof data.user.name !== "string")
	);
}

export function saveCredentials(creds: Credentials): void {
	// Validate before saving
	if (!isValidCredentials(creds)) {
		throw new Error("Invalid credentials format");
	}

	config.store = creds;
}

/**
 * Get stored credentials with validation.
 * Returns null if not logged in or credentials are corrupted.
 */
export function getCredentials(): Credentials | null {
	const data: Partial<Credentials> = config.store;
	if (data.accessToken === undefined) return null;

	if (!isValidCredentials(data)) {
		// Corrupted credentials - clear them
		clearCredentials();
		return null;
	}

	return data;
}

/**
 * Check if stored credentials are expired (with buffer).
 */
export function isTokenExpired(
	creds: Credentials,
	bufferMs = 5 * 60 * 1000,
): boolean {
	return creds.expiresAt <= Date.now() + bufferMs;
}

export function clearCredentials(): void {
	config.clear();
}

export function getCredentialsPath(): string {
	return config.path;
}
