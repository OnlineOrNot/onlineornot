import { printBanner } from "../banner";
import { logger } from "../logger";
import openInBrowser from "../open-in-browser";
import { getTokenQuietly } from "../user";

export function loginOptions() {
	return {};
}

export async function loginHandler() {
	const urlToOpen = "https://onlineornot.com/app/settings/developers";
	const apiToken = getTokenQuietly();

	await printBanner();

	if (apiToken) {
		return logger.log(
			`You are already logged in with an API token.\nYou can generate another token at ${urlToOpen}`
		);
	}

	logger.log(`Opening a link in your default browser: ${urlToOpen}`);
	logger.log(
		`-----------------------------------------------------------------------`
	);
	logger.log(`Create an API token, then add it to your environment variables:`);
	logger.log(`export ONLINEORNOT_API_TOKEN=your-api-token`);
	await openInBrowser(urlToOpen);
}
