import {
	getTokenPermissions as sdkGetTokenPermissions,
	verifyToken as sdkVerifyToken,
} from "@onlineornot/api";

import { getApiConfig, unwrapApiResult } from "./infrastructure";

export async function verifyApiToken(apiToken: string) {
	return unwrapApiResult(
		await sdkVerifyToken(getApiConfig(apiToken)),
		"/tokens/verify",
	);
}

export async function getApiTokenPermissions(apiToken: string) {
	return unwrapApiResult(
		await sdkGetTokenPermissions(getApiConfig(apiToken)),
		"/tokens/permissions",
	);
}
