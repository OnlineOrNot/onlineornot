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
	const apiToken = getToken();
	// verify the token is valid
	// if not, return undefined
	let permissions: string[] = [];
	try {
		const [verifyResult, permsResult] = await Promise.all([
			fetchResult("/tokens/verify") as Promise<{ status: string }>,
			fetchResult("/tokens/permissions") as Promise<{ permissions: string[] }>,
		]);

		if (verifyResult.status !== "active") return;
		permissions = permsResult.permissions;
	} catch (e) {
		//if this fails, token is invalid or expired
		return;
	}
	return {
		apiToken: apiToken.apiToken,
		authType: "API Token",
		permissions: permissions,
	};
}
