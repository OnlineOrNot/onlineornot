import { updateMaintenanceWindow } from "@onlineornot/api";
import {
	zUpdateMaintenanceWindowPath,
	zUpdateMaintenanceWindowHeaders,
	zUpdateMaintenanceWindowBody,
} from "@onlineornot/api/zod";

import { getApiConfig, unwrapApiEnvelope } from "../api/infrastructure";
import { createApiCommand } from "../command-runtime/api-command";

export const command = createApiCommand(
	{
		operationId: "updateMaintenanceWindow",
		command: "onlineornot maintenance-windows update",
		words: ["maintenance-windows", "update"],
		description: "Update a maintenance window",
		method: "PATCH",
		path: "/v1/maintenance-windows/{maintenance_window_id}",
		hasBody: true,
		requiresAuth: true,
		confirmation: false,
		flags: [
			{
				name: "id",
				wireName: "maintenance_window_id",
				location: "path",
				type: "string",
				array: false,
				required: true,
				positional: true,
				description: "Maintenance Window ID",
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
				description: "name",
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
				description:
					"Start date and time of the maintenance window, as a timestamp",
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
				description: "Duration of the maintenance window in minutes",
				sensitive: false,
			},
			{
				name: "timezone",
				wireName: "timezone",
				location: "body",
				type: "string",
				array: false,
				required: false,
				positional: false,
				description: "Timezone for the maintenance window",
				sensitive: false,
			},
			{
				name: "days-of-week",
				wireName: "days_of_week",
				location: "body",
				type: "string",
				array: true,
				choices: [
					"SUNDAY",
					"MONDAY",
					"TUESDAY",
					"WEDNESDAY",
					"THURSDAY",
					"FRIDAY",
					"SATURDAY",
				],
				required: false,
				positional: false,
				description: "Days of the week when the maintenance window is active",
				sensitive: false,
			},
			{
				name: "status",
				wireName: "status",
				location: "body",
				type: "string",
				array: false,
				choices: ["ENABLED", "DISABLED"],
				required: false,
				positional: false,
				description: "status",
				sensitive: false,
			},
			{
				name: "checks",
				wireName: "checks",
				location: "body",
				type: "string",
				array: true,
				required: false,
				positional: false,
				description: "Uptime check IDs. Replaces existing associations.",
				sensitive: false,
			},
			{
				name: "heartbeats",
				wireName: "heartbeats",
				location: "body",
				type: "string",
				array: true,
				required: false,
				positional: false,
				description: "Heartbeat IDs. Replaces existing associations.",
				sensitive: false,
			},
		],
	},
	(input) => {
		const path = zUpdateMaintenanceWindowPath.strict().parse(input.path);
		const headers = zUpdateMaintenanceWindowHeaders
			.strict()
			.parse(input.headers);
		const body = zUpdateMaintenanceWindowBody
			.omit({ project_id: true })
			.strict()
			.parse(input.body);
		const request = {
			path: { maintenance_window_id: path["maintenance_window_id"] },
			headers: {
				"X-OnlineOrNot-Organisation":
					input.headers?.["X-OnlineOrNot-Organisation"] === undefined
						? undefined
						: headers["X-OnlineOrNot-Organisation"],
			},
			body: {
				name: input.body?.["name"] === undefined ? undefined : body["name"],
				start_date:
					input.body?.["start_date"] === undefined
						? undefined
						: body["start_date"],
				duration_minutes:
					input.body?.["duration_minutes"] === undefined
						? undefined
						: body["duration_minutes"],
				timezone:
					input.body?.["timezone"] === undefined ? undefined : body["timezone"],
				days_of_week:
					input.body?.["days_of_week"] === undefined
						? undefined
						: body["days_of_week"],
				status:
					input.body?.["status"] === undefined ? undefined : body["status"],
				checks:
					input.body?.["checks"] === undefined ? undefined : body["checks"],
				heartbeats:
					input.body?.["heartbeats"] === undefined
						? undefined
						: body["heartbeats"],
			},
		};
		return {
			request,
			execute: async (token) =>
				unwrapApiEnvelope(
					await updateMaintenanceWindow({ ...getApiConfig(token), ...request }),
					"/v1/maintenance-windows/{maintenance_window_id}",
				),
		};
	},
);
