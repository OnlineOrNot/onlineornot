import { getOnlineOrNotAPITokenFromEnv } from "../environment-variables/misc-variables";
import { fetchResult } from "../fetch";

export const NOT_LOGGED_IN_MSG =
	"You are not logged in.\nRerun this command with ONLINEORNOT_API_TOKEN set as an environment variable.";
export const INVALID_TOKEN_MSG =
	"Your API token is invalid.\nRerun this command with a different ONLINEORNOT_API_TOKEN set as an environment variable.";

export function getToken() {
	const token = getOnlineOrNotAPITokenFromEnv();
	if (!token) {
		throw new Error(NOT_LOGGED_IN_MSG);
	}
	return { apiToken: token };
}

export function getTokenQuietly() {
	const token = getOnlineOrNotAPITokenFromEnv();
	if (!token) {
		return undefined;
	}
	return { apiToken: token };
}

//verifyToken loudly fails if a token is missing or invalid
//good for CLI commands like checks
//bad for whoami
export async function verifyToken() {
	getToken();
	// verify the token is valid
	// if not, return undefined
	try {
		const result = (await fetchResult("/tokens/verify")) as { status: string };
		if (result.status !== "active") throw new Error(INVALID_TOKEN_MSG);
	} catch (e) {
		//if this fails, token is invalid or expired
		throw new Error(INVALID_TOKEN_MSG);
	}
}
