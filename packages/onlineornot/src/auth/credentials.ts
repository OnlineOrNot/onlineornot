import os from "node:os";
import path from "node:path";

import Conf from "conf";

export interface StoredUser {
	email: string;
	name?: string;
}

export interface Credentials {
	accessToken: string;
	refreshToken: string;
	expiresAt: number;
	scopes: string[];
	user: StoredUser;
}

const config = new Conf<Credentials>({
	projectName: "onlineornot",
	cwd: path.join(os.homedir(), ".config", "onlineornot"),
	configName: "credentials",
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

	config.set("accessToken", creds.accessToken);
	config.set("refreshToken", creds.refreshToken);
	config.set("expiresAt", creds.expiresAt);
	config.set("scopes", creds.scopes);
	config.set("user", creds.user);
}

/**
 * Get stored credentials with validation.
 * Returns null if not logged in or credentials are corrupted.
 */
export function getCredentials(): Credentials | null {
	if (!config.has("accessToken")) {
		return null;
	}

	const data: Partial<Credentials> = {
		accessToken: config.get("accessToken"),
		refreshToken: config.get("refreshToken"),
		expiresAt: config.get("expiresAt"),
		scopes: config.get("scopes"),
		user: config.get("user"),
	};

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
