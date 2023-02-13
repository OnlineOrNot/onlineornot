import { getEnvironmentVariableFactory } from "./factory";

export const getOnlineOrNotAPITokenFromEnv = getEnvironmentVariableFactory({
	variableName: "ONLINEORNOT_API_TOKEN",
	defaultValue: () => "",
});
