import { listProjects } from "@onlineornot/api";
import { zListProjectsQuery, zListProjectsHeaders } from "@onlineornot/api/zod";

import { getApiConfig, unwrapApiEnvelope } from "../api/infrastructure";
import { createApiCommand } from "../command-runtime/api-command";

export const command = createApiCommand(
	{
		operationId: "listProjects",
		command: "onlineornot projects list",
		words: ["projects", "list"],
		description: "List projects",
		method: "GET",
		path: "/v1/projects",
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
		const query = zListProjectsQuery.strict().parse(input.query);
		const headers = zListProjectsHeaders.strict().parse(input.headers);
		const request = {
			query: {
				page: input.query?.["page"] === undefined ? undefined : query["page"],
				per_page:
					input.query?.["per_page"] === undefined
						? undefined
						: query["per_page"],
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
					await listProjects({ ...getApiConfig(token), ...request }),
					"/v1/projects",
				),
		};
	},
);
