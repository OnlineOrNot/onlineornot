import { getCredentials, clearCredentials, revokeToken } from "../auth";
import { withCredentialsLock } from "../auth/credentials-lock";
import { printBanner } from "../banner";
import { getOnlineOrNotAPITokenFromEnv } from "../environment-variables/misc-variables";
import { logger } from "../logger";

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

	const loggedOut = await withCredentialsLock(async () => {
		const creds = getCredentials();
		if (!creds) return false;
		await revokeToken(creds.refreshToken).catch(() => {});
		clearCredentials();
		return true;
	});
	logger.log(loggedOut ? "Successfully logged out." : "Not logged in.");
}
