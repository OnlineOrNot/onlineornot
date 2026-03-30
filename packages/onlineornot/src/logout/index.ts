import { printBanner } from "../banner";
import { logger } from "../logger";
import { getCredentials, clearCredentials, revokeToken } from "../auth";
import { getOnlineOrNotAPITokenFromEnv } from "../environment-variables/misc-variables";

export function logoutOptions() {
	return {};
}

export async function logoutHandler() {
	await printBanner();

	// Check for env var override
	if (getOnlineOrNotAPITokenFromEnv()) {
		logger.log(
			"You are logged in with an API Token via ONLINEORNOT_API_TOKEN environment variable. " +
				"Unset it to log out.",
		);
		return;
	}

	const creds = getCredentials();

	if (!creds) {
		logger.log("Not logged in.");
		return;
	}

	// Revoke the refresh token server-side (best effort)
	try {
		await revokeToken(creds.refreshToken);
	} catch {
		// Best effort - continue with local logout even if revocation fails
	}

	clearCredentials();
	logger.log("Successfully logged out.");
}
