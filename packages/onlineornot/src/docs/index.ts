import { printBanner } from "../banner";
import { logger } from "../logger";
import openInBrowser from "../open-in-browser";

export function docsOptions() {
	return {};
}

export async function docsHandler() {
	const urlToOpen = "https://onlineornot.com/docs/welcome";

	await printBanner();

	logger.log(`Opening a link in your default browser: ${urlToOpen}`);
	await openInBrowser(urlToOpen);
}
