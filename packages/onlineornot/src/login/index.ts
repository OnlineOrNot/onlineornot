import { printBanner } from "../banner";
import { logger } from "../logger";
import openInBrowser from "../open-in-browser";

export function loginOptions() {
	return {};
}

export async function loginHandler() {
	const urlToOpen = "https://onlineornot.com/app/settings/developers";

	await printBanner();

	logger.log(`Opening a link in your default browser: ${urlToOpen}`);
	logger.log(
		`-----------------------------------------------------------------------`
	);
	logger.log(`Create an API token, then add it to your environment variables:`);
	logger.log(`export ONLINEORNOT_API_TOKEN=your-api-token`);
	await openInBrowser(urlToOpen);
}
