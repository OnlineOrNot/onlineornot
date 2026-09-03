import http from "node:http";
import type { AddressInfo } from "node:net";

import { generatePKCECodes, generateState } from "./pkce";

const CLIENT_ID = "onlineornot-cli";
const LOCAL_AUTH_BASE_URL = "http://localhost:8787/api/auth";
const PROD_AUTH_BASE_URL = "https://onlineornot.com/api/auth";
const AUTH_BASE_URL =
	process.env.NODE_ENV === "development"
		? LOCAL_AUTH_BASE_URL
		: PROD_AUTH_BASE_URL;
const OAUTH_PROVIDER_PARAM = "oon_provider";
export const CALLBACK_PORT = 8976;
export const CALLBACK_URL = `http://localhost:${CALLBACK_PORT}/oauth/callback`;
export const CALLBACK_TIMEOUT_MS = 10 * 60 * 1000;

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

export interface RefreshTokenResponse {
	access_token: string;
	refresh_token?: string;
	expires_in: number;
	token_type: string;
	scope: string;
}

interface OAuthErrorResponse {
	error?: string;
	error_description?: string;
}

function isOAuthErrorResponse(value: unknown): value is OAuthErrorResponse {
	return (
		typeof value === "object" &&
		value !== null &&
		(!("error" in value) ||
			value.error === undefined ||
			typeof value.error === "string") &&
		(!("error_description" in value) ||
			value.error_description === undefined ||
			typeof value.error_description === "string")
	);
}

function isTokenResponse(value: unknown): value is TokenResponse {
	return (
		typeof value === "object" &&
		value !== null &&
		"access_token" in value &&
		typeof value.access_token === "string" &&
		"refresh_token" in value &&
		typeof value.refresh_token === "string" &&
		"expires_in" in value &&
		typeof value.expires_in === "number" &&
		"token_type" in value &&
		typeof value.token_type === "string" &&
		"scope" in value &&
		typeof value.scope === "string"
	);
}

function isRefreshTokenResponse(value: unknown): value is RefreshTokenResponse {
	return (
		typeof value === "object" &&
		value !== null &&
		"access_token" in value &&
		typeof value.access_token === "string" &&
		(!("refresh_token" in value) ||
			value.refresh_token === undefined ||
			typeof value.refresh_token === "string") &&
		"expires_in" in value &&
		typeof value.expires_in === "number" &&
		"token_type" in value &&
		typeof value.token_type === "string" &&
		"scope" in value &&
		typeof value.scope === "string"
	);
}

function isAddressInfo(
	value: string | AddressInfo | null,
): value is AddressInfo {
	return typeof value === "object" && value !== null;
}

function getCallbackPort(
	address: string | AddressInfo | null,
	requestedPort: number,
): number {
	return isAddressInfo(address) ? address.port : requestedPort;
}

function hasNodeErrorCode(
	error: unknown,
	code: string,
): error is NodeJS.ErrnoException {
	return error instanceof Error && "code" in error && error.code === code;
}

export interface OAuthResult {
	tokens: TokenResponse;
	authUrl: string;
}

export interface OAuthCallbackServer {
	callbackUrl: string;
	result: Promise<TokenResponse>;
	close: () => Promise<void>;
}

export type OAuthProvider = "google" | "github";

interface CallbackServerOptions {
	port?: number;
	timeoutMs?: number;
	exchangeCode?: (
		code: string,
		codeVerifier: string,
		callbackUrl: string,
	) => Promise<TokenResponse>;
}

/**
 * Build the OAuth authorization URL
 */
export async function buildAuthUrl(
	options: { prompt?: "create"; provider?: OAuthProvider } = {},
): Promise<{
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
	if (options.prompt) {
		authUrl.searchParams.set("prompt", options.prompt);
	}
	if (options.provider) {
		authUrl.searchParams.set(OAUTH_PROVIDER_PARAM, options.provider);
	}

	return { url: authUrl.toString(), codeVerifier, state };
}

/**
 * Start local callback server and wait for OAuth callback
 */
async function exchangeAuthorizationCode(
	code: string,
	codeVerifier: string,
	callbackUrl: string,
): Promise<TokenResponse> {
	const tokenResponse = await fetch(`${AUTH_BASE_URL}/oauth2/token`, {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({
			grant_type: "authorization_code",
			code,
			redirect_uri: callbackUrl,
			client_id: CLIENT_ID,
			code_verifier: codeVerifier,
			resource: "https://onlineornot.com",
		}),
	});

	if (!tokenResponse.ok) {
		const errorPayload: unknown = await tokenResponse.json();
		const error = isOAuthErrorResponse(errorPayload) ? errorPayload : {};
		throw new Error(
			error.error_description || error.error || "Token exchange failed",
		);
	}

	const tokens: unknown = await tokenResponse.json();
	if (!isTokenResponse(tokens)) {
		throw new Error("Invalid token response: missing required fields");
	}

	return tokens;
}

export async function startOAuthCallbackServer(
	codeVerifier: string,
	expectedState: string,
	options: CallbackServerOptions = {},
): Promise<OAuthCallbackServer> {
	const requestedPort = options.port ?? CALLBACK_PORT;
	const exchangeCode = options.exchangeCode ?? exchangeAuthorizationCode;
	let timeout: NodeJS.Timeout | undefined;
	let settled = false;
	let resolveResult!: (tokens: TokenResponse) => void;
	let rejectResult!: (error: Error) => void;
	const result = new Promise<TokenResponse>((resolve, reject) => {
		resolveResult = resolve;
		rejectResult = reject;
	});

	const server = http.createServer();
	const close = async () => {
		if (timeout) clearTimeout(timeout);
		if (!server.listening) return;
		await new Promise<void>((resolve) => server.close(() => resolve()));
	};
	const rejectOnce = (error: Error) => {
		if (settled) return;
		settled = true;
		void close();
		rejectResult(error);
	};
	const resolveOnce = (tokens: TokenResponse) => {
		if (settled) return;
		settled = true;
		void close();
		resolveResult(tokens);
	};

	server.on("request", async (req, res) => {
		const callbackRequest = new URL(req.url || "/", "http://localhost");
		const { pathname, searchParams } = callbackRequest;

		if (pathname !== "/oauth/callback") {
			res.writeHead(404);
			res.end("Not found");
			return;
		}

		// Validate state to prevent CSRF
		if (searchParams.get("state") !== expectedState) {
			res.writeHead(302, {
				Location:
					"https://onlineornot.com/oauth/error?error=Invalid+state+parameter",
			});
			res.end();
			rejectOnce(new Error("Invalid state parameter. Possible CSRF attack."));
			return;
		}

		// Check for errors
		if (searchParams.has("error")) {
			const errorDesc =
				searchParams.get("error_description") || searchParams.get("error");
			res.writeHead(302, {
				Location: `https://onlineornot.com/oauth/error?error=${encodeURIComponent(String(errorDesc))}`,
			});
			res.end();
			rejectOnce(new Error(`Authorization denied: ${errorDesc}`));
			return;
		}

		// Exchange code for tokens
		const code = searchParams.get("code");
		if (!code) {
			res.writeHead(302, {
				Location:
					"https://onlineornot.com/oauth/error?error=No+authorization+code",
			});
			res.end();
			rejectOnce(new Error("No authorization code received"));
			return;
		}

		try {
			const address = server.address();
			const callbackPort = getCallbackPort(address, requestedPort);
			const callbackUrl = `http://localhost:${callbackPort}/oauth/callback`;
			const tokens = await exchangeCode(code, codeVerifier, callbackUrl);
			res.writeHead(302, {
				Location: "https://onlineornot.com/oauth/success",
			});
			res.end();
			resolveOnce(tokens);
		} catch (err) {
			res.writeHead(302, {
				Location:
					"https://onlineornot.com/oauth/error?error=Token+exchange+failed",
			});
			res.end();
			rejectOnce(
				err instanceof Error ? err : new Error("Token exchange failed"),
			);
		}
	});

	try {
		await new Promise<void>((resolve, reject) => {
			const onError = (error: Error) => reject(error);
			server.once("error", onError);
			server.listen(requestedPort, "localhost", () => {
				server.off("error", onError);
				resolve();
			});
		});
	} catch (error) {
		if (hasNodeErrorCode(error, "EADDRINUSE")) {
			throw new Error(
				`Local OAuth callback port ${requestedPort} is already in use. Close the other process and try again.`,
			);
		}
		throw error;
	}

	server.on("error", (error) => rejectOnce(error));
	timeout = setTimeout(() => {
		rejectOnce(
			new Error("Timed out waiting for authorization. Please try again."),
		);
	}, options.timeoutMs ?? CALLBACK_TIMEOUT_MS);

	const address = server.address();
	const callbackPort = getCallbackPort(address, requestedPort);
	return {
		callbackUrl: `http://localhost:${callbackPort}/oauth/callback`,
		result,
		close,
	};
}

export async function waitForCallback(
	codeVerifier: string,
	expectedState: string,
): Promise<TokenResponse> {
	const callbackServer = await startOAuthCallbackServer(
		codeVerifier,
		expectedState,
	);
	return callbackServer.result;
}

/**
 * Refresh an access token using a refresh token
 */
export async function refreshAccessToken(
	refreshToken: string,
): Promise<RefreshTokenResponse> {
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

	const tokens: unknown = await response.json();
	if (!isRefreshTokenResponse(tokens)) {
		throw new Error("Invalid token response: missing required fields");
	}
	return tokens;
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
