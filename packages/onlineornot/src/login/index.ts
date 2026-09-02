import { logger } from "../logger";
import openInBrowser from "../open-in-browser";
import {
	buildAuthUrl,
	startOAuthCallbackServer,
	saveCredentials,
	getCredentials,
} from "../auth";
import { getOnlineOrNotAPITokenFromEnv } from "../environment-variables/misc-variables";

export function loginOptions() {
	return {};
}

export type LoginResult =
	| { status: "environment" }
	| { status: "existing"; email: string }
	| { status: "authenticated"; email: string };

export async function authenticateWithBrowser(
	options: { prompt?: "create" } = {},
): Promise<LoginResult> {
	// Check for env var override
	if (getOnlineOrNotAPITokenFromEnv()) {
		return { status: "environment" };
	}

	// Check if already logged in with OAuth
	const existing = getCredentials();
	if (existing && existing.expiresAt > Date.now()) {
		return { status: "existing", email: existing.user.email };
	}

	// Build auth URL with PKCE
	const { url: authUrl, codeVerifier, state } = await buildAuthUrl(options);
	const callbackServer = await startOAuthCallbackServer(codeVerifier, state);
	try {
		await openInBrowser(authUrl);
		const tokens = await callbackServer.result;

		// Validate tokens before saving
		if (!tokens.access_token || !tokens.refresh_token || !tokens.expires_in) {
			throw new Error("Invalid token response from server");
		}

		// Get user info from userinfo endpoint
		let email = "unknown";
		try {
			const userResponse = await fetch(
				"https://onlineornot.com/api/auth/oauth2/userinfo",
				{
					headers: { Authorization: `Bearer ${tokens.access_token}` },
				},
			);

			if (userResponse.ok) {
				const userInfo = (await userResponse.json()) as { email?: string };
				email = userInfo.email || "unknown";
			}
		} catch {
			// Ignore - we'll use "unknown"
		}

		// Save credentials
		saveCredentials({
			accessToken: tokens.access_token,
			refreshToken: tokens.refresh_token,
			expiresAt: Date.now() + tokens.expires_in * 1000,
			scopes: tokens.scope.split(" "),
			user: { email },
		});

		return { status: "authenticated", email };
	} finally {
		await callbackServer.close();
	}
}

export async function loginHandler() {
	try {
		const result = await authenticateWithBrowser();
		if (result.status === "environment") {
			logger.log(
				"You are logged in with an API Token via ONLINEORNOT_API_TOKEN environment variable. Unset it to log in via OAuth.",
			);
		} else if (result.status === "existing") {
			logger.log(
				`Already logged in as ${result.email}. Run \`onlineornot logout\` first to log in as a different user.`,
			);
		} else {
			logger.log("Successfully logged in.");
		}
	} catch (error) {
		logger.error(
			`Login failed: ${error instanceof Error ? error.message : String(error)}`,
		);
		process.exitCode = 1;
	}
}
