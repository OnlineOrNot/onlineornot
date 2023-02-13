type VariableNames = "ONLINEORNOT_API_KEY";

/**
 * Create a function used to access an environment variable, with a default value.
 *
 * This is not memoized to allow us to change the value at runtime, such as in testing.
 * A warning is shown if the client is using a deprecated version - but only once.
 */
export function getEnvironmentVariableFactory({
	variableName,
	defaultValue,
}: {
	variableName: VariableNames;
	defaultValue: () => string;
}): () => string;

/**
 * Create a function used to access an environment variable.
 *
 * This is not memoized to allow us to change the value at runtime, such as in testing.
 * A warning is shown if the client is using a deprecated version - but only once.
 */
export function getEnvironmentVariableFactory({
	variableName,
	defaultValue,
}: {
	variableName: VariableNames;
	defaultValue?: () => string;
}): () => string | undefined {
	return () => {
		if (process.env[variableName]) {
			return process.env[variableName];
		} else {
			return defaultValue?.();
		}
	};
}
