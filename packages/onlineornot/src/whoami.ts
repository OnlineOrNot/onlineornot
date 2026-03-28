import { fetchResult } from "./fetch";
import { logger } from "./logger";
import {
	NOT_LOGGED_IN_MSG,
	INVALID_TOKEN_MSG,
	hasAuthentication,
} from "./user";
import { getCredentials } from "./auth";
import { getOnlineOrNotAPITokenFromEnv } from "./environment-variables/misc-variables";

interface TokenVerifyResponse {
	status: "active" | "expired" | "revoked";
}

interface TokenPermissionsResponse {
	permissions: string[];
}

export async function whoami() {
	logger.log("Getting User settings...");

	// Check if any auth is configured
	if (!hasAuthentication()) {
		return void logger.log(NOT_LOGGED_IN_MSG);
	}

	// Determine auth type
	const envToken = getOnlineOrNotAPITokenFromEnv();

	if (envToken) {
		await showApiTokenInfo();
	} else {
		await showOAuthInfo();
	}
}

async function showApiTokenInfo() {
	logger.log(
		"👋 You are logged in with an API token (via environment variable).",
	);

	// Verify token is valid by calling the API
	const verified = await verifyTokenWithServer();
	if (!verified) {
		return void logger.log(INVALID_TOKEN_MSG);
	}

	// Get permissions from server (not from local storage)
	const permissions = await getServerPermissions();
	if (permissions) {
		logger.log("🔓 Token Permissions:");
		logger.log("Scope (Access)");
		for (const perm of permissions) {
			logger.log(`- ${perm}`);
		}
	}
}

interface JWTPayload {
	sub?: string;
	email?: string;
	scope?: string;
	exp?: number;
	iat?: number;
	iss?: string;
	aud?: string;
	azp?: string;
}

/**
 * Decode a JWT and extract the payload (no signature verification - server already issued it)
 */
function decodeJWT(token: string): JWTPayload | null {
	try {
		const parts = token.split(".");
		if (parts.length !== 3) return null;

		const payload = parts[1];
		const decoded = Buffer.from(payload, "base64url").toString("utf-8");
		return JSON.parse(decoded) as JWTPayload;
	} catch {
		return null;
	}
}

async function showOAuthInfo() {
	const creds = getCredentials();
	if (!creds) {
		return void logger.log(NOT_LOGGED_IN_MSG);
	}

	// Decode the JWT to get claims
	const jwt = decodeJWT(creds.accessToken);

	if (!jwt) {
		// Not a valid JWT - fall back to stored credentials
		logger.log(`👋 You are logged in as ${creds.user.email}`);
	} else {
		// Use email from JWT, fall back to stored
		const email = jwt.email || creds.user.email;
		logger.log(`👋 You are logged in as ${email}`);
	}
}

/**
 * Verify token is valid by calling the server.
 * Returns true if valid, false if invalid/revoked.
 */
async function verifyTokenWithServer(): Promise<boolean> {
	try {
		const result = (await fetchResult("/tokens/verify")) as TokenVerifyResponse;
		return result.status === "active";
	} catch {
		return false;
	}
}

/**
 * Get token permissions from the server.
 */
async function getServerPermissions(): Promise<string[] | null> {
	try {
		const result = (await fetchResult(
			"/tokens/permissions",
		)) as TokenPermissionsResponse;
		return result.permissions;
	} catch {
		return null;
	}
}
