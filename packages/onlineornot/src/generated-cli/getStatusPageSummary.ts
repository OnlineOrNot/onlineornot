import { getStatusPageSummary } from "@onlineornot/api";
import { zGetStatusPageSummaryPath } from "@onlineornot/api/zod";

import { getApiConfig, unwrapApiEnvelope } from "../api/infrastructure";
import { createApiCommand } from "../command-runtime/api-command";

export const command = createApiCommand(
	{
		operationId: "getStatusPageSummary",
		command: "onlineornot status-pages summary",
		words: ["status-pages", "summary"],
		description: "Get a status page's overview.",
		method: "GET",
		path: "/v1/status_pages/{status_page_subdomain}/summary",
		hasBody: false,
		requiresAuth: false,
		confirmation: false,
		flags: [
			{
				name: "subdomain",
				wireName: "status_page_subdomain",
				location: "path",
				type: "string",
				array: false,
				required: true,
				positional: true,
				description: "The subdomain part of a status page's URL",
				sensitive: false,
			},
		],
	},
	(input) => {
		const path = zGetStatusPageSummaryPath.strict().parse(input.path);
		const request = {
			path: { status_page_subdomain: path["status_page_subdomain"] },
		};
		return {
			request,
			execute: async (token) =>
				unwrapApiEnvelope(
					await getStatusPageSummary({ ...getApiConfig(token), ...request }),
					"/v1/status_pages/{status_page_subdomain}/summary",
				),
		};
	},
);
