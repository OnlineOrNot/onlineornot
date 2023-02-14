import { fetchResult } from "./fetch";
import { logger } from "./logger";
import { getToken } from "./user";

export async function whoami() {
	logger.log("Getting User settings...");
	const user = await getUserInfo();
	if (user === undefined) {
		return void logger.log(
			"You are not authenticated. Rerun this command with ONLINEORNOT_API_TOKEN set as an environment variable."
		);
	}

	logger.log(`👋 You are logged in with an ${user.authType}.`);
}

type AuthType = "API Token";

export interface UserInfo {
	apiToken: string;
	authType: AuthType;
}

export async function getUserInfo() {
	const apiToken = getToken();
	// verify the token is valid
	// if not, return undefined
	try {
		const result = (await fetchResult("/tokens/verify")) as { status: string };
		if (result.status !== "active") return;
	} catch (e) {
		//if this fails, token is invalid or expired
		return;
	}
	return {
		apiToken: apiToken.apiToken,
		authType: "API Token",
	};
}
