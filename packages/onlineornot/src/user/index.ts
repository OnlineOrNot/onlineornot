import { getOnlineOrNotAPITokenFromEnv } from "../environment-variables/misc-variables";
import { fetchResult } from "../fetch";
import { getCredentials, isTokenExpired } from "../auth/credentials";
import { getValidToken, AuthenticationError } from "../auth/refresh";

export const NOT_LOGGED_IN_MSG =
	"You are not logged in.\nRun `onlineornot login` to authenticate, or set ONLINEORNOT_API_TOKEN as an environment variable.";
export const INVALID_TOKEN_MSG =
	"Your API token is invalid.\nRun `onlineornot login` to re-authenticate, or set a different ONLINEORNOT_API_TOKEN.";

export { AuthenticationError };

export type TokenSource = "environment" | "oauth";

export interface TokenInfo {
	apiToken: string;
	source: TokenSource;
}

/**
 * Get a valid token for API requests, refreshing OAuth token if needed.
 *
 * Priority: 1) Environment variable (ONLINEORNOT_API_TOKEN), 2) OAuth credentials
 *
 * Security: OAuth tokens are always validated for expiration and refreshed if needed.
 *
 * @throws {AuthenticationError} if not logged in or token refresh fails
 */
export async function getTokenAsync(): Promise<TokenInfo> {
	// First check env var (takes precedence)
	const envToken = getOnlineOrNotAPITokenFromEnv();
	if (envToken) {
		return { apiToken: envToken, source: "environment" };
	}

	// Then try OAuth with refresh
	const token = await getValidToken();
	return { apiToken: token, source: "oauth" };
}

/**
 * Check if user has any form of authentication configured.
 * Does NOT verify the token is valid - use verifyToken() for that.
 */
export function hasAuthentication(): boolean {
	const envToken = getOnlineOrNotAPITokenFromEnv();
	if (envToken) return true;

	const creds = getCredentials();
	return creds !== null;
}

/**
 * Quick check for token presence without network calls.
 * Returns undefined if no token available or OAuth token is expired.
 *
 * WARNING: This does not verify the token is valid on the server.
 * Only use for display purposes (e.g., showing login status).
 * For API calls, always use getTokenAsync().
 */
export function getTokenQuietly(): TokenInfo | undefined {
	const envToken = getOnlineOrNotAPITokenFromEnv();
	if (envToken) {
		return { apiToken: envToken, source: "environment" };
	}

	const creds = getCredentials();
	if (creds && !isTokenExpired(creds)) {
		return { apiToken: creds.accessToken, source: "oauth" };
	}

	return undefined;
}

interface TokenVerifyResponse {
	status: "active" | "expired" | "revoked";
}

/**
 * Verify the current token is valid.
 *
 * For API tokens: Makes a server call to verify the token hasn't been revoked.
 * For OAuth JWTs: Token is self-verifying, no server call needed.
 *
 * @throws {Error} if token is missing, invalid, or revoked
 */
export async function verifyToken(): Promise<TokenInfo> {
	const tokenInfo = await getTokenAsync();

	// OAuth JWTs are self-verifying - getTokenAsync already validated/refreshed
	if (tokenInfo.source === "oauth") {
		return tokenInfo;
	}

	// API tokens need server verification
	try {
		const result = (await fetchResult("/tokens/verify")) as TokenVerifyResponse;

		if (result.status !== "active") {
			throw new Error(INVALID_TOKEN_MSG);
		}

		return tokenInfo;
	} catch (error) {
		if (error instanceof AuthenticationError) {
			throw error;
		}
		// API call failed - token invalid or revoked
		throw new Error(INVALID_TOKEN_MSG);
	}
}
