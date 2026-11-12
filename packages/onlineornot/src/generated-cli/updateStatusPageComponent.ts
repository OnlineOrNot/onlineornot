import { updateStatusPageComponent } from "@onlineornot/api";
import {
	zUpdateStatusPageComponentPath,
	zUpdateStatusPageComponentHeaders,
	zUpdateStatusPageComponentBody,
} from "@onlineornot/api/zod";

import { getApiConfig, unwrapApiEnvelope } from "../api/infrastructure";
import { createApiCommand } from "../command-runtime/api-command";

export const command = createApiCommand(
	{
		operationId: "updateStatusPageComponent",
		command: "onlineornot status-pages components update",
		words: ["status-pages", "components", "update"],
		description: "Update a component",
		method: "PATCH",
		path: "/v1/status_pages/{status_page_id}/components/{status_page_component_id}",
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
			{
				name: "name",
				wireName: "name",
				location: "body",
				type: "string",
				array: false,
				required: false,
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
			{
				name: "group-id",
				wireName: "group_id",
				location: "body",
				type: "string",
				array: false,
				required: false,
				positional: false,
				description:
					"Component group ID to associate this component with. Set to null to remove from group.",
				sensitive: false,
			},
			{
				name: "check-ids",
				wireName: "check_ids",
				location: "body",
				type: "string",
				array: true,
				required: false,
				positional: false,
				description:
					"Array of uptime check IDs to associate with this component",
				sensitive: false,
			},
			{
				name: "heartbeat-id",
				wireName: "heartbeat_id",
				location: "body",
				type: "string",
				array: false,
				required: false,
				positional: false,
				description:
					"Heartbeat ID to associate with this component. Set to null to remove.",
				sensitive: false,
			},
			{
				name: "override-status",
				wireName: "override_status",
				location: "body",
				type: "boolean",
				array: false,
				required: false,
				positional: false,
				description:
					"Override the automatic status from external status page. When true, status can be manually set.",
				sensitive: false,
			},
		],
	},
	(input) => {
		const path = zUpdateStatusPageComponentPath.strict().parse(input.path);
		const headers = zUpdateStatusPageComponentHeaders
			.strict()
			.parse(input.headers);
		const body = zUpdateStatusPageComponentBody.strict().parse(input.body);
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
			body: {
				name: input.body?.["name"] === undefined ? undefined : body["name"],
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
				group_id:
					input.body?.["group_id"] === undefined ? undefined : body["group_id"],
				check_ids:
					input.body?.["check_ids"] === undefined
						? undefined
						: body["check_ids"],
				heartbeat_id:
					input.body?.["heartbeat_id"] === undefined
						? undefined
						: body["heartbeat_id"],
				override_status:
					input.body?.["override_status"] === undefined
						? undefined
						: body["override_status"],
			},
		};
		return {
			request,
			execute: async (token) =>
				unwrapApiEnvelope(
					await updateStatusPageComponent({
						...getApiConfig(token),
						...request,
					}),
					"/v1/status_pages/{status_page_id}/components/{status_page_component_id}",
				),
		};
	},
);
