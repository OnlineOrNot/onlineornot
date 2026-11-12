import { listTokens } from "@onlineornot/api";
import { zListTokensQuery, zListTokensHeaders } from "@onlineornot/api/zod";

import { getApiConfig, unwrapApiEnvelope } from "../api/infrastructure";
import { createApiCommand } from "../command-runtime/api-command";

export const command = createApiCommand(
	{
		operationId: "listTokens",
		command: "onlineornot tokens list",
		words: ["tokens", "list"],
		description: "List all API tokens",
		method: "GET",
		path: "/v1/tokens",
		hasBody: false,
		requiresAuth: true,
		confirmation: false,
		flags: [
			{
				name: "page",
				wireName: "page",
				location: "query",
				type: "number",
				array: false,
				required: false,
				positional: false,
				description: "Page number of paginated results, starting at 1.",
				sensitive: false,
			},
			{
				name: "per-page",
				wireName: "per_page",
				location: "query",
				type: "number",
				array: false,
				required: false,
				positional: false,
				description:
					"Number of tokens per page, default 10. Pagination metadata is nested at result.result_info.",
				sensitive: false,
			},
			{
				name: "search",
				wireName: "search",
				location: "query",
				type: "string",
				array: false,
				required: false,
				positional: false,
				description: "Search term to filter results.",
				sensitive: false,
			},
			{
				name: "organisation",
				wireName: "X-OnlineOrNot-Organisation",
				location: "header",
				type: "string",
				array: false,
				required: false,
				positional: false,
				description:
					"Public organization ID to select from an OAuth grant. Required for grants authorizing multiple organizations. Omit for single-organization grants and API tokens.",
				sensitive: false,
			},
		],
	},
	(input) => {
		const query = zListTokensQuery.strict().parse(input.query);
		const headers = zListTokensHeaders.strict().parse(input.headers);
		const request = {
			query: {
				page: input.query?.["page"] === undefined ? undefined : query["page"],
				per_page:
					input.query?.["per_page"] === undefined
						? undefined
						: query["per_page"],
				search:
					input.query?.["search"] === undefined ? undefined : query["search"],
			},
			headers: {
				"X-OnlineOrNot-Organisation":
					input.headers?.["X-OnlineOrNot-Organisation"] === undefined
						? undefined
						: headers["X-OnlineOrNot-Organisation"],
			},
		};
		return {
			request,
			execute: async (token) =>
				unwrapApiEnvelope(
					await listTokens({ ...getApiConfig(token), ...request }),
					"/v1/tokens",
				),
		};
	},
);
