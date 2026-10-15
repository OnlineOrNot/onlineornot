import { getTokenAsync } from "../user";
import { getApiConfig } from "./infrastructure";

export async function getAuthenticatedApiConfig() {
	const { apiToken } = await getTokenAsync();
	return getApiConfig(apiToken);
}
