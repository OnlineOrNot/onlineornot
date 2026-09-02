import { URLSearchParams } from "node:url";
import { ParseError } from "../parse";
import { fetchInternal } from "./internal";
import type { RequestInit } from "undici";

// Check out https://api-docs.onlineornot.com/ for API docs.

export interface FetchError {
	code: number;
	message: string;
	error_chain?: FetchError[];
}

export interface FetchResult<ResponseType = unknown> {
	success: boolean;
	result: ResponseType;
	errors: FetchError[];
	messages: string[];
	result_info?: unknown;
}

/**
 * Make a fetch request, and extract the `result` from the JSON response.
 */
export async function fetchResult<ResponseType>(
	resource: string,
	init: RequestInit = {},
	queryParams?: URLSearchParams,
	abortSignal?: AbortSignal,
): Promise<ResponseType> {
	const json = await fetchInternal<FetchResult<ResponseType>>(
		resource,
		init,
		queryParams,
		abortSignal,
	);
	if (json.success) {
		return json.result;
	} else {
		throwFetchError(resource, json);
	}
}

/**
 * Make a fetch request for a list of values,
 * extracting the `result` from the JSON response,
 * and repeating the request if the results are paginated.
 */
export async function fetchListResult<ResponseType>(
	resource: string,
	init: RequestInit = {},
	queryParams?: URLSearchParams,
): Promise<ResponseType[]> {
	const results: ResponseType[] = [];
	let getMoreResults = true;
	let cursor: string | undefined;
	while (getMoreResults) {
		queryParams = new URLSearchParams(queryParams);
		queryParams.set("page_size", "100");
		if (cursor) {
			queryParams.set("cursor", cursor);
		}
		const json = await fetchInternal<FetchResult<ResponseType[]>>(
			resource,
			init,
			queryParams,
		);
		if (json.success) {
			results.push(...json.result);
			if (hasCursor(json.result_info)) {
				cursor = json.result_info?.cursor;
			} else {
				getMoreResults = false;
			}
		} else {
			throwFetchError(resource, json);
		}
	}
	return results;
}

export async function fetchPagedResult<ResponseType>(
	resource: string,
	init: RequestInit = {},
	queryParams?: URLSearchParams,
): Promise<ResponseType[]> {
	const results: ResponseType[] = [];
	let getMoreResults = true;
	let page = 1;
	while (getMoreResults) {
		queryParams = new URLSearchParams(queryParams);
		queryParams.set("page", String(page));
		queryParams.set("page_size", "100");

		const json = await fetchInternal<FetchResult<ResponseType[]>>(
			resource,
			init,
			queryParams,
		);
		if (json.success) {
			results.push(...json.result);
			if (hasMorePages(json.result_info)) {
				page = page + 1;
			} else {
				getMoreResults = false;
			}
		} else {
			throwFetchError(resource, json);
		}
	}
	return results;
}

function throwFetchError(
	resource: string,
	response: FetchResult<unknown>,
): never {
	const error = new ParseError({
		text: `A request to the OnlineOrNot API (${resource}) failed.`,
		code: response.errors[0]?.code,
		notes: response.errors.map((err) => ({
			text: renderError(err),
		})),
	});
	throw error;
}

interface PageResultInfo {
	page: number;
	per_page: number;
	count: number;
	total_count: number;
}

function hasMorePages(result_info: unknown): result_info is PageResultInfo {
	return (
		typeof result_info === "object" &&
		result_info !== null &&
		"page" in result_info &&
		typeof result_info.page === "number" &&
		"per_page" in result_info &&
		typeof result_info.per_page === "number" &&
		"total_count" in result_info &&
		typeof result_info.total_count === "number" &&
		result_info.page * result_info.per_page < result_info.total_count
	);
}

function hasCursor(result_info: unknown): result_info is { cursor: string } {
	return (
		typeof result_info === "object" &&
		result_info !== null &&
		"cursor" in result_info &&
		typeof result_info.cursor === "string" &&
		result_info.cursor !== ""
	);
}

function renderError(err: FetchError, level = 0): string {
	const chainedMessages =
		err.error_chain
			?.map(
				(chainedError) =>
					`\n${"  ".repeat(level)}- ${renderError(chainedError, level + 1)}`,
			)
			.join("\n") ?? "";
	return (
		(err.code ? `${err.message} [code: ${err.code}]` : err.message) +
		chainedMessages
	);
}
