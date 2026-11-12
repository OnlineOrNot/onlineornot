import { createMaintenanceWindow } from "@onlineornot/api";
import {
	zCreateMaintenanceWindowHeaders,
	zCreateMaintenanceWindowBody,
} from "@onlineornot/api/zod";

import { getApiConfig, unwrapApiEnvelope } from "../api/infrastructure";
import { createApiCommand } from "../command-runtime/api-command";

export const command = createApiCommand(
	{
		operationId: "createMaintenanceWindow",
		command: "onlineornot maintenance-windows create",
		words: ["maintenance-windows", "create"],
		description: "Create a new maintenance window",
		method: "POST",
		path: "/v1/maintenance-windows",
		hasBody: true,
		requiresAuth: true,
		confirmation: false,
		flags: [
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
				name: "project-id",
				wireName: "project_id",
				location: "body",
				type: "string",
				array: false,
				required: false,
				positional: false,
				description:
					"Project ID. Omit or use null to leave the resource unassigned.",
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
				description: "name",
				sensitive: false,
			},
			{
				name: "start-date",
				wireName: "start_date",
				location: "body",
				type: "string",
				array: false,
				required: true,
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
				required: true,
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
				required: true,
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
				required: true,
				positional: false,
				description: "Days of the week when the maintenance window is active",
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
				description:
					"Uptime check IDs to associate with this maintenance window",
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
				description: "Heartbeat IDs to associate with this maintenance window",
				sensitive: false,
			},
		],
	},
	(input) => {
		const headers = zCreateMaintenanceWindowHeaders
			.strict()
			.parse(input.headers);
		const body = zCreateMaintenanceWindowBody.strict().parse(input.body);
		const request = {
			headers: {
				"X-OnlineOrNot-Organisation":
					input.headers?.["X-OnlineOrNot-Organisation"] === undefined
						? undefined
						: headers["X-OnlineOrNot-Organisation"],
			},
			body: {
				project_id:
					input.body?.["project_id"] === undefined
						? undefined
						: body["project_id"],
				name: body["name"],
				start_date: body["start_date"],
				duration_minutes: body["duration_minutes"],
				timezone: body["timezone"],
				days_of_week: body["days_of_week"],
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
					await createMaintenanceWindow({ ...getApiConfig(token), ...request }),
					"/v1/maintenance-windows",
				),
		};
	},
);
