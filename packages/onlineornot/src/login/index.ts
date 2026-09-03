import {
	buildAuthUrl,
	startOAuthCallbackServer,
	saveCredentials,
	getCredentials,
	type OAuthProvider,
} from "../auth";
import { getOnlineOrNotAPITokenFromEnv } from "../environment-variables/misc-variables";
import { logger } from "../logger";
import openInBrowser from "../open-in-browser";

export function loginOptions() {
	return {};
}

export type LoginResult =
	| { status: "environment" }
	| { status: "existing"; email: string }
	| { status: "authenticated"; email: string };

export interface BrowserAuthenticationOptions {
	prompt?: "create";
	provider?: OAuthProvider;
	selectProvider?: () => Promise<OAuthProvider>;
}

interface BrowserAuthenticationDependencies {
	buildAuthUrl: typeof buildAuthUrl;
	getCredentials: typeof getCredentials;
	getEnvironmentToken: typeof getOnlineOrNotAPITokenFromEnv;
	log: (...values: unknown[]) => void;
	now: () => number;
	openInBrowser: typeof openInBrowser;
	saveCredentials: typeof saveCredentials;
	startOAuthCallbackServer: typeof startOAuthCallbackServer;
	fetch: typeof fetch;
}

const defaultBrowserAuthenticationDependencies: BrowserAuthenticationDependencies =
	{
		buildAuthUrl,
		getCredentials,
		getEnvironmentToken: getOnlineOrNotAPITokenFromEnv,
		log: (...values) => logger.log(...values),
		now: Date.now,
		openInBrowser,
		saveCredentials,
		startOAuthCallbackServer,
		fetch,
	};

function isUserInfo(value: unknown): value is { email?: string } {
	return (
		typeof value === "object" &&
		value !== null &&
		(!("email" in value) ||
			value.email === undefined ||
			typeof value.email === "string")
	);
}

export async function authenticateWithBrowser(
	options: BrowserAuthenticationOptions = {},
	dependencies: BrowserAuthenticationDependencies = defaultBrowserAuthenticationDependencies,
): Promise<LoginResult> {
	// Check for env var override
	if (dependencies.getEnvironmentToken()) {
		return { status: "environment" };
	}

	// Check if already logged in with OAuth
	const existing = dependencies.getCredentials();
	if (existing && existing.expiresAt > dependencies.now()) {
		return { status: "existing", email: existing.user.email };
	}

	const provider = options.provider ?? (await options.selectProvider?.());
	const {
		url: authUrl,
		codeVerifier,
		state,
	} = await dependencies.buildAuthUrl({
		prompt: options.prompt,
		provider,
	});
	const callbackServer = await dependencies.startOAuthCallbackServer(
		codeVerifier,
		state,
	);
	try {
		const providerName =
			provider === "github"
				? "GitHub"
				: provider === "google"
					? "Google"
					: null;
		dependencies.log(
			providerName
				? `Opening ${providerName} in your browser...`
				: options.prompt === "create"
					? "Opening your browser to sign in or create an account."
					: "Opening your browser to sign in.",
		);
		dependencies.log(`If it doesn't open, use this link:\n  ${authUrl}`);
		await dependencies.openInBrowser(authUrl);
		const tokens = await callbackServer.result;

		// Validate tokens before saving
		if (!tokens.access_token || !tokens.refresh_token || !tokens.expires_in) {
			throw new Error("Invalid token response from server");
		}

		// Get user info from userinfo endpoint
		let email = "unknown";
		try {
			const userResponse = await dependencies.fetch(
				"https://onlineornot.com/api/auth/oauth2/userinfo",
				{
					headers: { Authorization: `Bearer ${tokens.access_token}` },
				},
			);

			if (userResponse.ok) {
				const userInfo: unknown = await userResponse.json();
				if (isUserInfo(userInfo)) email = userInfo.email || "unknown";
			}
		} catch {
			// Ignore - we'll use "unknown"
		}

		// Save credentials
		dependencies.saveCredentials({
			accessToken: tokens.access_token,
			refreshToken: tokens.refresh_token,
			expiresAt: dependencies.now() + tokens.expires_in * 1000,
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
