import { createStatusPageComponent } from "@onlineornot/api";
import {
	zCreateStatusPageComponentPath,
	zCreateStatusPageComponentHeaders,
	zCreateStatusPageComponentBody,
} from "@onlineornot/api/zod";

import { getApiConfig, unwrapApiEnvelope } from "../api/infrastructure";
import { createApiCommand } from "../command-runtime/api-command";

export const command = createApiCommand(
	{
		operationId: "createStatusPageComponent",
		command: "onlineornot status-pages components create",
		words: ["status-pages", "components", "create"],
		description: "Create a component",
		method: "POST",
		path: "/v1/status_pages/{status_page_id}/components",
		hasBody: true,
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
			{
				name: "name",
				wireName: "name",
				location: "body",
				type: "string",
				array: false,
				required: true,
				positional: false,
				description: "a name for the component",
				sensitive: false,
			},
			{
				name: "status",
				wireName: "status",
				location: "body",
				type: "string",
				array: false,
				choices: [
					"OPERATIONAL",
					"MAJOR_OUTAGE",
					"PARTIAL_OUTAGE",
					"DEGRADED_PERFORMANCE",
					"NO_IMPACT",
					"MAINTENANCE",
				],
				required: false,
				positional: false,
				description: "Status of the component",
				sensitive: false,
			},
			{
				name: "display-uptime",
				wireName: "display_uptime",
				location: "body",
				type: "boolean",
				array: false,
				required: false,
				positional: false,
				description:
					"Show this component's uptime and historical incidents on the status page.",
				sensitive: false,
			},
			{
				name: "display-metrics",
				wireName: "display_metrics",
				location: "body",
				type: "boolean",
				array: false,
				required: false,
				positional: false,
				description:
					"Show this component's response time metrics on the status page.",
				sensitive: false,
			},
		],
	},
	(input) => {
		const path = zCreateStatusPageComponentPath.strict().parse(input.path);
		const headers = zCreateStatusPageComponentHeaders
			.strict()
			.parse(input.headers);
		const body = zCreateStatusPageComponentBody.strict().parse(input.body);
		const request = {
			path: { status_page_id: path["status_page_id"] },
			headers: {
				"X-OnlineOrNot-Organisation":
					input.headers?.["X-OnlineOrNot-Organisation"] === undefined
						? undefined
						: headers["X-OnlineOrNot-Organisation"],
			},
			body: {
				name: body["name"],
				status:
					input.body?.["status"] === undefined ? undefined : body["status"],
				display_uptime:
					input.body?.["display_uptime"] === undefined
						? undefined
						: body["display_uptime"],
				display_metrics:
					input.body?.["display_metrics"] === undefined
						? undefined
						: body["display_metrics"],
			},
		};
		return {
			request,
			execute: async (token) =>
				unwrapApiEnvelope(
					await createStatusPageComponent({
						...getApiConfig(token),
						...request,
					}),
					"/v1/status_pages/{status_page_id}/components",
				),
		};
	},
);
