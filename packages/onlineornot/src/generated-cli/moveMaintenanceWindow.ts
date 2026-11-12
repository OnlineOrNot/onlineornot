import { moveMaintenanceWindow } from "@onlineornot/api";
import {
	zMoveMaintenanceWindowPath,
	zMoveMaintenanceWindowHeaders,
	zMoveMaintenanceWindowBody,
} from "@onlineornot/api/zod";

import { getApiConfig, unwrapApiEnvelope } from "../api/infrastructure";
import { createApiCommand } from "../command-runtime/api-command";

export const command = createApiCommand(
	{
		operationId: "moveMaintenanceWindow",
		command: "onlineornot maintenance move",
		aliases: ["onlineornot maintenance-windows move"],
		words: ["maintenance", "move"],
		description: "Assign or unassign a maintenance window",
		method: "POST",
		path: "/v1/maintenance-windows/{maintenance_window_id}/move",
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
				name: "project-id",
				wireName: "project_id",
				location: "body",
				type: "string",
				array: false,
				required: true,
				positional: false,
				description: "Project ID, or null for unassigned.",
				sensitive: false,
			},
		],
	},
	(input) => {
		const path = zMoveMaintenanceWindowPath.strict().parse(input.path);
		const headers = zMoveMaintenanceWindowHeaders.strict().parse(input.headers);
		const body = zMoveMaintenanceWindowBody.strict().parse(input.body);
		const request = {
			path: { maintenance_window_id: path["maintenance_window_id"] },
			headers: {
				"X-OnlineOrNot-Organisation":
					input.headers?.["X-OnlineOrNot-Organisation"] === undefined
						? undefined
						: headers["X-OnlineOrNot-Organisation"],
			},
			body: { project_id: body["project_id"] },
		};
		return {
			request,
			execute: async (token) =>
				unwrapApiEnvelope(
					await moveMaintenanceWindow({ ...getApiConfig(token), ...request }),
					"/v1/maintenance-windows/{maintenance_window_id}/move",
				),
		};
	},
);
