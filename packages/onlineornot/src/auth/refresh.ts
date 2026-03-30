import {
	getCredentials,
	saveCredentials,
	clearCredentials,
	isTokenExpired,
	type Credentials,
} from "./credentials";
import { refreshAccessToken } from "./oauth";

export class AuthenticationError extends Error {
	constructor(
		message: string,
		public readonly code:
			| "NOT_LOGGED_IN"
			| "TOKEN_EXPIRED"
			| "REFRESH_FAILED"
			| "TOKEN_REVOKED",
	) {
		super(message);
		this.name = "AuthenticationError";
	}
}

/**
 * Get a valid access token, refreshing if necessary.
 *
 * Security: Always validates token expiration before returning.
 * If refresh is needed, requires new refresh token (rotation).
 *
 * @throws {AuthenticationError} if not logged in, token expired, or refresh fails
 */
export async function getValidToken(): Promise<string> {
	const creds = getCredentials();

	if (!creds) {
		throw new AuthenticationError(
			"Not logged in. Run `onlineornot login` first.",
			"NOT_LOGGED_IN",
		);
	}

	// Token still valid (with 5 min buffer)
	if (!isTokenExpired(creds)) {
		return creds.accessToken;
	}

	// Token expired - attempt refresh
	return await refreshToken(creds);
}

/**
 * Refresh an expired token.
 *
 * Security: Enforces refresh token rotation when server provides new refresh token.
 * Clears all credentials on failure to prevent use of compromised tokens.
 */
async function refreshToken(creds: Credentials): Promise<string> {
	try {
		const tokens = await refreshAccessToken(creds.refreshToken);

		// Validate response
		if (!tokens.access_token || typeof tokens.expires_in !== "number") {
			throw new Error("Invalid token response from server");
		}

		// Security: Use new refresh token if provided (rotation)
		// If server implements rotation, old refresh token is now invalid
		const newRefreshToken = tokens.refresh_token || creds.refreshToken;

		saveCredentials({
			...creds,
			accessToken: tokens.access_token,
			refreshToken: newRefreshToken,
			expiresAt: Date.now() + tokens.expires_in * 1000,
		});

		return tokens.access_token;
	} catch (error) {
		// Clear credentials on any refresh failure
		// This prevents use of potentially compromised tokens
		clearCredentials();

		if (error instanceof Error && error.message.includes("invalid_grant")) {
			throw new AuthenticationError(
				"Session revoked. Run `onlineornot login` again.",
				"TOKEN_REVOKED",
			);
		}

		throw new AuthenticationError(
			"Session expired. Run `onlineornot login` again.",
			"REFRESH_FAILED",
		);
	}
}

/**
 * Check if we have valid (non-expired) credentials without making network calls.
 * Use this for quick checks; use getValidToken() for actual API calls.
 */
export function hasValidCredentials(): boolean {
	const creds = getCredentials();
	return creds !== null && !isTokenExpired(creds);
}
