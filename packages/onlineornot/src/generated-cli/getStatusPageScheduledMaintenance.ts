import { getStatusPageScheduledMaintenance } from "@onlineornot/api";
import {
	zGetStatusPageScheduledMaintenancePath,
	zGetStatusPageScheduledMaintenanceHeaders,
} from "@onlineornot/api/zod";

import { getApiConfig, unwrapApiEnvelope } from "../api/infrastructure";
import { createApiCommand } from "../command-runtime/api-command";

export const command = createApiCommand(
	{
		operationId: "getStatusPageScheduledMaintenance",
		command: "onlineornot status-pages scheduled-maintenance get",
		words: ["status-pages", "scheduled-maintenance", "get"],
		description: "Retrieve a scheduled maintenance",
		method: "GET",
		path: "/v1/status_pages/{status_page_id}/scheduled_maintenance/{scheduled_maintenance_id}",
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
				wireName: "scheduled_maintenance_id",
				location: "path",
				type: "string",
				array: false,
				required: true,
				positional: true,
				description: "Scheduled Maintenance ID",
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
		const path = zGetStatusPageScheduledMaintenancePath
			.strict()
			.parse(input.path);
		const headers = zGetStatusPageScheduledMaintenanceHeaders
			.strict()
			.parse(input.headers);
		const request = {
			path: {
				status_page_id: path["status_page_id"],
				scheduled_maintenance_id: path["scheduled_maintenance_id"],
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
					await getStatusPageScheduledMaintenance({
						...getApiConfig(token),
						...request,
					}),
					"/v1/status_pages/{status_page_id}/scheduled_maintenance/{scheduled_maintenance_id}",
				),
		};
	},
);
