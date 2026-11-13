import {
	getCredentials,
	saveCredentials,
	clearCredentials,
	isTokenExpired,
	type Credentials,
} from "./credentials";
import { withCredentialsLock } from "./credentials-lock";
import { OAuthRefreshError, refreshAccessToken } from "./oauth";
import {
	API_OAUTH_RESOURCE,
	MCP_OAUTH_RESOURCE,
	type OAuthResource,
} from "./oauth-resources";

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

export async function getValidToken(
	resource: OAuthResource = API_OAUTH_RESOURCE,
): Promise<string> {
	return withCredentialsLock(async () => {
		const creds = getCredentials();
		if (!creds) {
			throw new AuthenticationError(
				"Not logged in. Run `onlineornot login` first.",
				"NOT_LOGGED_IN",
			);
		}
		if (resource === MCP_OAUTH_RESOURCE) {
			if (
				creds.mcpAccessToken &&
				creds.mcpExpiresAt &&
				creds.mcpExpiresAt > Date.now() + 5 * 60 * 1000
			) {
				return creds.mcpAccessToken;
			}
		} else if (!isTokenExpired(creds)) {
			return creds.accessToken;
		}
		return refreshToken(creds, resource);
	});
}

async function refreshToken(
	creds: Credentials,
	resource: OAuthResource,
): Promise<string> {
	try {
		const tokens = await refreshAccessToken(creds.refreshToken, resource);
		if (
			!tokens.access_token ||
			!Number.isFinite(tokens.expires_in) ||
			tokens.expires_in <= 0 ||
			tokens.token_type.toLowerCase() !== "bearer"
		) {
			throw new Error("OAuth token response is invalid.");
		}
		const expiresAt = Date.now() + tokens.expires_in * 1000;
		saveCredentials({
			...creds,
			refreshToken: tokens.refresh_token || creds.refreshToken,
			...(resource === MCP_OAUTH_RESOURCE
				? { mcpAccessToken: tokens.access_token, mcpExpiresAt: expiresAt }
				: { accessToken: tokens.access_token, expiresAt }),
		});
		return tokens.access_token;
	} catch (error) {
		if (
			error instanceof OAuthRefreshError &&
			error.oauthCode === "invalid_grant"
		) {
			clearCredentials();
			throw new AuthenticationError(
				"Session revoked. Run `onlineornot login` again.",
				"TOKEN_REVOKED",
			);
		}
		if (
			error instanceof OAuthRefreshError &&
			error.oauthCode === "invalid_target"
		) {
			throw new AuthenticationError(
				"This login has not authorized MCP. Run `onlineornot logout` then `onlineornot login` to authorize it.",
				"REFRESH_FAILED",
			);
		}
		throw new AuthenticationError(
			error instanceof Error ? error.message : "OAuth token refresh failed.",
			"REFRESH_FAILED",
		);
	}
}

export function hasValidCredentials(): boolean {
	const creds = getCredentials();
	return creds !== null && !isTokenExpired(creds);
}
