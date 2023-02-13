import { getOnlineOrNotAPITokenFromEnv } from "../environment-variables/misc-variables";

export function getToken() {
	const token = getOnlineOrNotAPITokenFromEnv();
	if (!token) {
		throw new Error("Not logged in.");
	}
	return { apiToken: token };
}
