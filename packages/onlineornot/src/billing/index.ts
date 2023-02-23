import { printBanner } from "../banner";
import { logger } from "../logger";
import openInBrowser from "../open-in-browser";

export function billingOptions() {
	return {};
}

export async function billingHandler() {
	const urlToOpen = "https://onlineornot.com/app/settings/billing";

	await printBanner();

	logger.log(`Opening a link in your default browser: ${urlToOpen}`);
	await openInBrowser(urlToOpen);
}
