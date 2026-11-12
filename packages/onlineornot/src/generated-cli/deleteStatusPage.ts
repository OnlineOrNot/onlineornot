import { deleteStatusPage } from "@onlineornot/api";
import {
	zDeleteStatusPagePath,
	zDeleteStatusPageHeaders,
} from "@onlineornot/api/zod";

import { getApiConfig, unwrapApiEnvelope } from "../api/infrastructure";
import { createApiCommand } from "../command-runtime/api-command";

export const command = createApiCommand(
	{
		operationId: "deleteStatusPage",
		command: "onlineornot status-pages delete",
		words: ["status-pages", "delete"],
		description: "Delete a status page",
		method: "DELETE",
		path: "/v1/status_pages/{status_page_id}",
		hasBody: false,
		requiresAuth: true,
		confirmation: true,
		flags: [
			{
				name: "id",
				wireName: "status_page_id",
				location: "path",
				type: "string",
				array: false,
				required: true,
				positional: true,
				description: "Status Page ID",
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
		const path = zDeleteStatusPagePath.strict().parse(input.path);
		const headers = zDeleteStatusPageHeaders.strict().parse(input.headers);
		const request = {
			path: { status_page_id: path["status_page_id"] },
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
					await deleteStatusPage({ ...getApiConfig(token), ...request }),
					"/v1/status_pages/{status_page_id}",
				),
		};
	},
);
