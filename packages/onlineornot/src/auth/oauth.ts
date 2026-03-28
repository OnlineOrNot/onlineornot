import http from "node:http";
import url from "node:url";
import { generatePKCECodes, generateState } from "./pkce";

const CLIENT_ID = "onlineornot-cli";
const LOCAL_AUTH_BASE_URL = "http://localhost:8787/api/auth";
const PROD_AUTH_BASE_URL = "https://onlineornot.com/api/auth";
const AUTH_BASE_URL =
	process.env.NODE_ENV === "development"
		? LOCAL_AUTH_BASE_URL
		: PROD_AUTH_BASE_URL;
const CALLBACK_PORT = 8976;
const CALLBACK_URL = `http://localhost:${CALLBACK_PORT}/oauth/callback`;

// Use same scopes as API tokens + email for userinfo
const SCOPES = [
	"openid",
	"email",
	"offline_access",
	"UPTIME_CHECKS:EDIT",
	"STATUS_PAGES:EDIT",
	"HEARTBEAT_CHECKS:EDIT",
	"MAINTENANCE_WINDOWS:EDIT",
	"INTEGRATIONS:READ",
	"WEBHOOKS:EDIT",
];

export interface TokenResponse {
	access_token: string;
	refresh_token: string;
	expires_in: number;
	token_type: string;
	scope: string;
}

export interface OAuthResult {
	tokens: TokenResponse;
	authUrl: string;
}

/**
 * Build the OAuth authorization URL
 */
export async function buildAuthUrl(): Promise<{
	url: string;
	codeVerifier: string;
	state: string;
}> {
	const { codeVerifier, codeChallenge } = await generatePKCECodes();
	const state = generateState();

	const authUrl = new URL(`${AUTH_BASE_URL}/oauth2/authorize`);
	authUrl.searchParams.set("response_type", "code");
	authUrl.searchParams.set("client_id", CLIENT_ID);
	authUrl.searchParams.set("redirect_uri", CALLBACK_URL);
	authUrl.searchParams.set("scope", SCOPES.join(" "));
	authUrl.searchParams.set("state", state);
	authUrl.searchParams.set("code_challenge", codeChallenge);
	authUrl.searchParams.set("code_challenge_method", "S256");

	return { url: authUrl.toString(), codeVerifier, state };
}

/**
 * Start local callback server and wait for OAuth callback
 */
export async function waitForCallback(
	codeVerifier: string,
	expectedState: string,
): Promise<TokenResponse> {
	return new Promise((resolve, reject) => {
		let server: http.Server;

		// Timeout after 2 minutes
		const timeout = setTimeout(() => {
			server?.close();
			reject(
				new Error("Timed out waiting for authorization. Please try again."),
			);
		}, 120_000);

		server = http.createServer(async (req, res) => {
			const { pathname, query } = url.parse(req.url || "", true);

			if (pathname !== "/oauth/callback") {
				res.writeHead(404);
				res.end("Not found");
				return;
			}

			// Validate state to prevent CSRF
			if (query.state !== expectedState) {
				clearTimeout(timeout);
				res.writeHead(302, {
					Location:
						"https://onlineornot.com/oauth/error?error=Invalid+state+parameter",
				});
				res.end();
				server.close();
				reject(new Error("Invalid state parameter. Possible CSRF attack."));
				return;
			}

			// Check for errors
			if (query.error) {
				clearTimeout(timeout);
				const errorDesc = query.error_description || query.error;
				res.writeHead(302, {
					Location: `https://onlineornot.com/oauth/error?error=${encodeURIComponent(String(errorDesc))}`,
				});
				res.end();
				server.close();
				reject(new Error(`Authorization denied: ${errorDesc}`));
				return;
			}

			// Exchange code for tokens
			const code = query.code as string;
			if (!code) {
				clearTimeout(timeout);
				res.writeHead(302, {
					Location:
						"https://onlineornot.com/oauth/error?error=No+authorization+code",
				});
				res.end();
				server.close();
				reject(new Error("No authorization code received"));
				return;
			}

			try {
				const tokenResponse = await fetch(`${AUTH_BASE_URL}/oauth2/token`, {
					method: "POST",
					headers: { "Content-Type": "application/x-www-form-urlencoded" },
					body: new URLSearchParams({
						grant_type: "authorization_code",
						code,
						redirect_uri: CALLBACK_URL,
						client_id: CLIENT_ID,
						code_verifier: codeVerifier,
						resource: "https://onlineornot.com",
					}),
				});

				if (!tokenResponse.ok) {
					const error = (await tokenResponse.json()) as {
						error?: string;
						error_description?: string;
					};
					throw new Error(
						error.error_description || error.error || "Token exchange failed",
					);
				}

				const tokens = (await tokenResponse.json()) as TokenResponse;

				// Validate token response has required fields
				if (
					!tokens.access_token ||
					!tokens.refresh_token ||
					typeof tokens.expires_in !== "number"
				) {
					throw new Error("Invalid token response: missing required fields");
				}

				clearTimeout(timeout);
				res.writeHead(302, {
					Location: "https://onlineornot.com/oauth/success",
				});
				res.end();
				server.close();
				resolve(tokens);
			} catch (err) {
				clearTimeout(timeout);
				res.writeHead(302, {
					Location:
						"https://onlineornot.com/oauth/error?error=Token+exchange+failed",
				});
				res.end();
				server.close();
				reject(err);
			}
		});

		server.listen(CALLBACK_PORT, "localhost");
	});
}

/**
 * Refresh an access token using a refresh token
 */
export async function refreshAccessToken(
	refreshToken: string,
): Promise<TokenResponse> {
	const response = await fetch(`${AUTH_BASE_URL}/oauth2/token`, {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({
			grant_type: "refresh_token",
			refresh_token: refreshToken,
			client_id: CLIENT_ID,
			resource: "https://onlineornot.com",
		}),
	});

	if (!response.ok) {
		throw new Error("Failed to refresh token");
	}

	return (await response.json()) as TokenResponse;
}

/**
 * Revoke a token (for logout)
 */
export async function revokeToken(refreshToken: string): Promise<void> {
	await fetch(`${AUTH_BASE_URL}/oauth2/revoke`, {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({
			token: refreshToken,
			token_type_hint: "refresh_token",
			client_id: CLIENT_ID,
		}),
	});
}
