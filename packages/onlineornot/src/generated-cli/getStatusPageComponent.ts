import { getStatusPageComponent } from "@onlineornot/api";
import {
	zGetStatusPageComponentPath,
	zGetStatusPageComponentHeaders,
} from "@onlineornot/api/zod";

import { getApiConfig, unwrapApiEnvelope } from "../api/infrastructure";
import { createApiCommand } from "../command-runtime/api-command";

export const command = createApiCommand(
	{
		operationId: "getStatusPageComponent",
		command: "onlineornot status-pages components get",
		words: ["status-pages", "components", "get"],
		description: "Retrieve a component",
		method: "GET",
		path: "/v1/status_pages/{status_page_id}/components/{status_page_component_id}",
		hasBody: false,
		requiresAuth: true,
		confirmation: false,
		flags: [
			{
				name: "status-page-id",
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
				name: "id",
				wireName: "status_page_component_id",
				location: "path",
				type: "string",
				array: false,
				required: true,
				positional: true,
				description: "Status Page Component ID",
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
		const path = zGetStatusPageComponentPath.strict().parse(input.path);
		const headers = zGetStatusPageComponentHeaders
			.strict()
			.parse(input.headers);
		const request = {
			path: {
				status_page_id: path["status_page_id"],
				status_page_component_id: path["status_page_component_id"],
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
					await getStatusPageComponent({ ...getApiConfig(token), ...request }),
					"/v1/status_pages/{status_page_id}/components/{status_page_component_id}",
				),
		};
	},
);
