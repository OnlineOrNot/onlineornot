import { version as onlineornotVersion } from "../../package.json";
import { API_BASE_URL } from "../constants";
import { logger } from "../logger";
import { ParseError } from "../parse";

interface ApiError {
	code: number;
	message: string;
	error_chain?: ApiError[];
}

interface ApiEnvelope<TResult = unknown> {
	success: boolean;
	result: TResult;
	errors: ApiError[];
}

type ApiResult<TData> = (
	| { data: TData; error: undefined }
	| { data: undefined; error: unknown }
) & {
	request?: Request;
	response?: Response;
};

type EnvelopeResult<TData> =
	TData extends ApiEnvelope<infer TResult> ? TResult : never;

/**
 * Build the common options passed to generated API operations.
 *
 * Authentication remains owned by the CLI so OAuth tokens can be refreshed
 * before the generated client sends a request.
 */
export function getApiConfig(apiToken: string) {
	return {
		auth: apiToken,
		baseUrl: API_BASE_URL.replace(/\/v1\/?$/, ""),
		fetch: fetchApi,
		headers: {
			"User-Agent": `onlineornot/${onlineornotVersion}`,
		},
		throwOnError: false as const,
	};
}

/** Convert a generated SDK result into the API's successful wire envelope. */
export function unwrapApiEnvelope<TData extends ApiEnvelope<unknown>>(
	result: ApiResult<TData>,
	resource: string,
): TData {
	if (result.error !== undefined) {
		if (isApiEnvelope(result.error)) {
			throwApiError(resource, result.error);
		}

		throw new ParseError({
			text:
				result.error instanceof SyntaxError
					? "Received a malformed response from the API"
					: `A request to the OnlineOrNot API (${resource}) failed.`,
			notes: [{ text: String(result.error) }],
		});
	}

	if (!isApiEnvelope(result.data)) {
		throw new ParseError({
			text: "Received a malformed response from the API",
			notes: [{ text: `Unexpected response from ${resource}` }],
		});
	}

	if (!result.data.success) {
		throwApiError(resource, result.data);
	}

	return result.data;
}

/** Unwrap both the generated SDK result and the API's `result` envelope. */
export function unwrapApiResult<TData extends ApiEnvelope<unknown>>(
	result: ApiResult<TData>,
	resource: string,
): EnvelopeResult<TData> {
	// SAFETY: EnvelopeResult extracts the result type from the TData envelope
	// that unwrapApiEnvelope validates before returning.
	return unwrapApiEnvelope(result, resource).result as EnvelopeResult<TData>;
}

const fetchApi: typeof globalThis.fetch = async (input, init) => {
	const request = input instanceof Request ? input : new Request(input, init);

	if (logger.loggerLevel === "debug") {
		logger.debug(`-- START API REQUEST: ${request.method} ${request.url}`);
		logger.debug(
			"HEADERS:",
			JSON.stringify(redactedHeaders(request.headers), null, 2),
		);
		logger.debug("-- END API REQUEST");
	}

	const response = await globalThis.fetch(request);

	if (logger.loggerLevel === "debug") {
		logger.debug(
			"-- START API RESPONSE:",
			response.statusText,
			response.status,
		);
		logger.debug(
			"HEADERS:",
			JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2),
		);
		logger.debug("RESPONSE:", await response.clone().text());
		logger.debug("-- END API RESPONSE");
	}

	return response;
};

function redactedHeaders(headers: Headers): Record<string, string> {
	const values = Object.fromEntries(headers.entries());
	if ("authorization" in values) {
		values.authorization = "[REDACTED]";
	}
	return values;
}

function isApiEnvelope(value: unknown): value is ApiEnvelope<unknown> {
	return (
		typeof value === "object" &&
		value !== null &&
		"success" in value &&
		typeof value.success === "boolean" &&
		"result" in value &&
		"errors" in value &&
		Array.isArray(value.errors)
	);
}

function throwApiError(
	resource: string,
	response: ApiEnvelope<unknown>,
): never {
	throw new ParseError({
		text: `A request to the OnlineOrNot API (${resource}) failed.`,
		code: response.errors[0]?.code,
		notes: response.errors.map((error) => ({ text: renderError(error) })),
	});
}

function renderError(error: ApiError, level = 0): string {
	const chainedMessages =
		error.error_chain
			?.map(
				(chainedError) =>
					`\n${"  ".repeat(level)}- ${renderError(chainedError, level + 1)}`,
			)
			.join("\n") ?? "";
	return (
		(error.code ? `${error.message} [code: ${error.code}]` : error.message) +
		chainedMessages
	);
}
