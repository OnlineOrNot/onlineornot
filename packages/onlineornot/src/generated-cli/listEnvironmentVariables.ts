import { listEnvironmentVariables } from "@onlineornot/api";
import {
	zListEnvironmentVariablesQuery,
	zListEnvironmentVariablesHeaders,
} from "@onlineornot/api/zod";

import { getApiConfig, unwrapApiEnvelope } from "../api/infrastructure";
import { createApiCommand } from "../command-runtime/api-command";

export const command = createApiCommand(
	{
		operationId: "listEnvironmentVariables",
		command: "onlineornot environment-variables list",
		words: ["environment-variables", "list"],
		description: "List environment variables",
		method: "GET",
		path: "/v1/env",
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
					"Number of items per page. Defaults to 20. Continue requesting subsequent pages until the accumulated item count reaches result_info.total_count or a page is empty.",
				sensitive: false,
			},
			{
				name: "project-id",
				wireName: "project_id",
				location: "query",
				type: "string",
				array: true,
				required: false,
				positional: false,
				description:
					"Project IDs, or unassigned for resources without a project. Repeat the parameter to include several, for example project_id=a1b2c3d4e5f6g7h8&project_id=unassigned. Omit to list all resources.",
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
				description:
					"Case-insensitive substring search on environment variable names.",
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
		const query = zListEnvironmentVariablesQuery.strict().parse(input.query);
		const headers = zListEnvironmentVariablesHeaders
			.strict()
			.parse(input.headers);
		const request = {
			query: {
				page: input.query?.["page"] === undefined ? undefined : query["page"],
				per_page:
					input.query?.["per_page"] === undefined
						? undefined
						: query["per_page"],
				project_id:
					input.query?.["project_id"] === undefined
						? undefined
						: query["project_id"],
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
					await listEnvironmentVariables({
						...getApiConfig(token),
						...request,
					}),
					"/v1/env",
				),
		};
	},
);
