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
	abortSignal?: AbortSignal
): Promise<ResponseType> {
	const json = await fetchInternal<FetchResult<ResponseType>>(
		resource,
		init,
		queryParams,
		abortSignal
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
	queryParams?: URLSearchParams
): Promise<ResponseType[]> {
	const results: ResponseType[] = [];
	let getMoreResults = true;
	let cursor: string | undefined;
	while (getMoreResults) {
		if (cursor) {
			queryParams = new URLSearchParams(queryParams);
			queryParams.set("cursor", cursor);
		}
		const json = await fetchInternal<FetchResult<ResponseType[]>>(
			resource,
			init,
			queryParams
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
	queryParams?: URLSearchParams
): Promise<ResponseType[]> {
	const results: ResponseType[] = [];
	let getMoreResults = true;
	let page = 1;
	while (getMoreResults) {
		queryParams = new URLSearchParams(queryParams);
		queryParams.set("page", String(page));

		const json = await fetchInternal<FetchResult<ResponseType[]>>(
			resource,
			init,
			queryParams
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
	response: FetchResult<unknown>
): never {
	const error = new ParseError({
		text: `A request to the OnlineOrNot API (${resource}) failed.`,
		notes: response.errors.map((err) => ({
			text: renderError(err),
		})),
	});
	// add the first error code directly to this error
	// so consumers can use it for specific behaviour
	const code = response.errors[0]?.code;
	if (code) {
		//@ts-expect-error non-standard property on Error
		error.code = code;
	}
	throw error;
}

interface PageResultInfo {
	page: number;
	per_page: number;
	count: number;
	total_count: number;
}

function hasMorePages(result_info: unknown): result_info is PageResultInfo {
	const page = (result_info as PageResultInfo | undefined)?.page;
	const per_page = (result_info as PageResultInfo | undefined)?.per_page;
	const total = (result_info as PageResultInfo | undefined)?.total_count;

	return (
		page !== undefined &&
		per_page !== undefined &&
		total !== undefined &&
		page * per_page < total
	);
}

function hasCursor(result_info: unknown): result_info is { cursor: string } {
	const cursor = (result_info as { cursor: string } | undefined)?.cursor;
	return cursor !== undefined && cursor !== null && cursor !== "";
}

function renderError(err: FetchError, level = 0): string {
	const chainedMessages =
		err.error_chain
			?.map(
				(chainedError) =>
					`\n${"  ".repeat(level)}- ${renderError(chainedError, level + 1)}`
			)
			.join("\n") ?? "";
	return (
		(err.code ? `${err.message} [code: ${err.code}]` : err.message) +
		chainedMessages
	);
}
