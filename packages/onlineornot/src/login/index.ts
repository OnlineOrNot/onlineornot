import { logger } from "../logger";
import openInBrowser from "../open-in-browser";
import {
	buildAuthUrl,
	waitForCallback,
	saveCredentials,
	getCredentials,
} from "../auth";
import { getOnlineOrNotAPITokenFromEnv } from "../environment-variables/misc-variables";

export function loginOptions() {
	return {};
}

export async function loginHandler() {
	// Check for env var override
	if (getOnlineOrNotAPITokenFromEnv()) {
		logger.log(
			"You are logged in with an API Token via ONLINEORNOT_API_TOKEN environment variable. Unset it to log in via OAuth.",
		);
		return;
	}

	// Check if already logged in with OAuth
	const existing = getCredentials();
	if (existing && existing.expiresAt > Date.now()) {
		logger.log(
			`Already logged in as ${existing.user.email}. Run \`onlineornot logout\` first to log in as a different user.`,
		);
		return;
	}

	// Build auth URL with PKCE
	const { url: authUrl, codeVerifier, state } = await buildAuthUrl();

	await openInBrowser(authUrl);

	try {
		const tokens = await waitForCallback(codeVerifier, state);

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

		logger.log("Successfully logged in.");
	} catch (err) {
		logger.error(`Login failed: ${(err as Error).message}`);
		process.exit(1);
	}
}
