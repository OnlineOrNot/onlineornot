import { fetchResult } from "./fetch";
import { logger } from "./logger";
import { NOT_LOGGED_IN_MSG, INVALID_TOKEN_MSG, getTokenQuietly } from "./user";

export async function whoami() {
	logger.log("Getting User settings...");
	const user = await getUserInfo();

	if (user === undefined) {
		return void logger.log(NOT_LOGGED_IN_MSG);
	} else if (user === null) {
		return void logger.log(INVALID_TOKEN_MSG);
	}

	logger.log(`👋 You are logged in with an ${user.authType}.`);
	logger.log(`🔓 Token Permissions:`);
	logger.log(`Scope (Access)`);
	for (const perm of user.permissions) {
		logger.log(`- ${perm}`);
	}
}

type AuthType = "API Token";

export interface UserInfo {
	apiToken: string;
	authType: AuthType;
	permissions: string[];
}

export async function getUserInfo() {
	const apiToken = getTokenQuietly();
	if (!apiToken) return undefined;
	// verify the token is valid
	// if not, return null
	let permissions: string[] = [];
	try {
		const [verifyResult, permsResult] = await Promise.all([
			fetchResult("/tokens/verify") as Promise<{ status: string }>,
			fetchResult("/tokens/permissions") as Promise<{ permissions: string[] }>,
		]);

		if (verifyResult.status !== "active") return null;
		permissions = permsResult.permissions;
	} catch (e) {
		//if this fails, token is invalid or expired
		return null;
	}
	return {
		apiToken: apiToken.apiToken,
		authType: "API Token",
		permissions: permissions,
	};
}
