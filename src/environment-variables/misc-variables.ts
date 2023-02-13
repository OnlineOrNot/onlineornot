import { getEnvironmentVariableFactory } from "./factory";

export const getCloudflareAPITokenFromEnv = getEnvironmentVariableFactory({
	variableName: "ONLINEORNOT_API_KEY",
	defaultValue: () => "",
});
