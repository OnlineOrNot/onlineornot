import Conf from "conf";
import os from "node:os";
import path from "node:path";

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

/**
 * Validate that stored credentials have the expected shape.
 * Returns null if validation fails (corrupted/tampered storage).
 */
function validateCredentials(data: Partial<Credentials>): Credentials | null {
	if (
		typeof data.accessToken !== "string" ||
		typeof data.refreshToken !== "string" ||
		typeof data.expiresAt !== "number" ||
		!Array.isArray(data.scopes) ||
		!data.scopes.every((s) => typeof s === "string") ||
		typeof data.user !== "object" ||
		data.user === null ||
		typeof data.user.email !== "string"
	) {
		return null;
	}

	return {
		accessToken: data.accessToken,
		refreshToken: data.refreshToken,
		expiresAt: data.expiresAt,
		scopes: data.scopes,
		user: {
			email: data.user.email,
			name: typeof data.user.name === "string" ? data.user.name : undefined,
		},
	};
}

export function saveCredentials(creds: Credentials): void {
	// Validate before saving
	const validated = validateCredentials(creds);
	if (!validated) {
		throw new Error("Invalid credentials format");
	}

	config.set("accessToken", validated.accessToken);
	config.set("refreshToken", validated.refreshToken);
	config.set("expiresAt", validated.expiresAt);
	config.set("scopes", validated.scopes);
	config.set("user", validated.user);
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

	const validated = validateCredentials(data);
	if (!validated) {
		// Corrupted credentials - clear them
		clearCredentials();
		return null;
	}

	return validated;
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
