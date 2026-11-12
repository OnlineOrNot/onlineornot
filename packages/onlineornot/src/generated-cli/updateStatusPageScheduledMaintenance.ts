import { updateStatusPageScheduledMaintenance } from "@onlineornot/api";
import {
	zUpdateStatusPageScheduledMaintenancePath,
	zUpdateStatusPageScheduledMaintenanceHeaders,
	zUpdateStatusPageScheduledMaintenanceBody,
} from "@onlineornot/api/zod";

import { getApiConfig, unwrapApiEnvelope } from "../api/infrastructure";
import { createApiCommand } from "../command-runtime/api-command";

export const command = createApiCommand(
	{
		operationId: "updateStatusPageScheduledMaintenance",
		command: "onlineornot status-pages scheduled-maintenance update",
		words: ["status-pages", "scheduled-maintenance", "update"],
		description: "Update a scheduled maintenance (only before it has started)",
		method: "PATCH",
		path: "/v1/status_pages/{status_page_id}/scheduled_maintenance/{scheduled_maintenance_id}",
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
			{
				name: "title",
				wireName: "title",
				location: "body",
				type: "string",
				array: false,
				required: false,
				positional: false,
				description: "Updated title",
				sensitive: false,
			},
			{
				name: "start-date",
				wireName: "start_date",
				location: "body",
				type: "string",
				array: false,
				required: false,
				positional: false,
				description: "Updated start date (ISO 8601)",
				sensitive: false,
			},
			{
				name: "duration-minutes",
				wireName: "duration_minutes",
				location: "body",
				type: "number",
				array: false,
				required: false,
				positional: false,
				description: "Updated duration in minutes",
				sensitive: false,
			},
		],
	},
	(input) => {
		const path = zUpdateStatusPageScheduledMaintenancePath
			.strict()
			.parse(input.path);
		const headers = zUpdateStatusPageScheduledMaintenanceHeaders
			.strict()
			.parse(input.headers);
		const body = zUpdateStatusPageScheduledMaintenanceBody
			.strict()
			.parse(input.body);
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
			body: {
				title: input.body?.["title"] === undefined ? undefined : body["title"],
				start_date:
					input.body?.["start_date"] === undefined
						? undefined
						: body["start_date"],
				duration_minutes:
					input.body?.["duration_minutes"] === undefined
						? undefined
						: body["duration_minutes"],
			},
		};
		return {
			request,
			execute: async (token) =>
				unwrapApiEnvelope(
					await updateStatusPageScheduledMaintenance({
						...getApiConfig(token),
						...request,
					}),
					"/v1/status_pages/{status_page_id}/scheduled_maintenance/{scheduled_maintenance_id}",
				),
		};
	},
);
