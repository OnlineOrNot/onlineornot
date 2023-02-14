import assert from "node:assert";
import { fetch, Headers } from "undici";
import { version as onlineornotVersion } from "../../package.json";
import { API_BASE_URL } from "../constants";
import { logger } from "../logger";
import { ParseError, parseJSON } from "../parse";
import { getToken } from "../user";
import type { RequestInit, HeadersInit } from "undici";

/**
 * Make a fetch request to the OnlineOrNot API.
 *
 * This function handles acquiring the API token and logging the caller in, as necessary.
 *
 * Check out https://api-docs.onlineornot.com/ for API docs.
 *
 * This function should not be used directly, instead use the functions in `cfetch/index.ts`.
 */
export async function fetchInternal<ResponseType>(
	resource: string,
	init: RequestInit = {},
	queryParams?: URLSearchParams,
	abortSignal?: AbortSignal
): Promise<ResponseType> {
	const method = init.method ?? "GET";
	const response = await performApiFetch(
		resource,
		init,
		queryParams,
		abortSignal
	);
	const jsonText = await response.text();
	logger.debug("-- START API RESPONSE:", response.statusText, response.status);
	const logHeaders = cloneHeaders(response.headers);
	delete logHeaders["Authorization"];
	logger.debug("HEADERS:", JSON.stringify(logHeaders, null, 2));
	logger.debug("RESPONSE:", jsonText);
	logger.debug("-- END API RESPONSE");

	try {
		return parseJSON<ResponseType>(jsonText);
	} catch (err) {
		throw new ParseError({
			text: "Received a malformed response from the API",
			notes: [
				{
					text: truncate(jsonText, 100),
				},
				{
					text: `${method} ${resource} -> ${response.status} ${response.statusText}`,
				},
			],
		});
	}
}

/*
 * performApiFetch does everything required to make a API request,
 * but doesn't parse the response as JSON. For normal V4 API responses,
 * use `fetchInternal`
 * */
export async function performApiFetch(
	resource: string,
	init: RequestInit = {},
	queryParams?: URLSearchParams,
	abortSignal?: AbortSignal
) {
	const method = init.method ?? "GET";
	assert(
		resource.startsWith("/"),
		`API fetch - resource path must start with a "/" but got "${resource}"`
	);

	const apiToken = getToken();
	const headers = cloneHeaders(init.headers);
	addAuthorizationHeaderIfUnspecified(headers, apiToken);
	addUserAgent(headers);

	const queryString = queryParams ? `?${queryParams.toString()}` : "";
	logger.debug(
		`-- START API REQUEST: ${method} ${API_BASE_URL}${resource}${queryString}`
	);
	const logHeaders = cloneHeaders(headers);
	delete logHeaders["Authorization"];
	logger.debug("HEADERS:", JSON.stringify(logHeaders, null, 2));
	logger.debug(
		"INIT:",
		JSON.stringify({ ...init, headers: logHeaders }, null, 2)
	);
	logger.debug("-- END API REQUEST");
	return await fetch(`${API_BASE_URL}${resource}${queryString}`, {
		method,
		...init,
		headers,
		signal: abortSignal,
	});
}

function truncate(text: string, maxLength: number): string {
	const { length } = text;
	if (length <= maxLength) {
		return text;
	}
	return `${text.substring(0, maxLength)}... (length = ${length})`;
}

function cloneHeaders(
	headers: HeadersInit | undefined
): Record<string, string> {
	return headers instanceof Headers
		? Object.fromEntries(headers.entries())
		: Array.isArray(headers)
		? Object.fromEntries(headers)
		: { ...headers };
}

export type ApiCredentials = {
	apiToken: string;
};

function addAuthorizationHeaderIfUnspecified(
	headers: Record<string, string>,
	auth: ApiCredentials
): void {
	if (!("Authorization" in headers)) {
		headers["Authorization"] = `Bearer ${auth.apiToken}`;
	}
}

function addUserAgent(headers: Record<string, string>): void {
	headers["User-Agent"] = `onlineornot/${onlineornotVersion}`;
}
