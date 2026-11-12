import { deleteMaintenanceWindow } from "@onlineornot/api";
import {
	zDeleteMaintenanceWindowPath,
	zDeleteMaintenanceWindowHeaders,
} from "@onlineornot/api/zod";

import { getApiConfig, unwrapApiEnvelope } from "../api/infrastructure";
import { createApiCommand } from "../command-runtime/api-command";

export const command = createApiCommand(
	{
		operationId: "deleteMaintenanceWindow",
		command: "onlineornot maintenance-windows delete",
		words: ["maintenance-windows", "delete"],
		description: "Delete a maintenance window",
		method: "DELETE",
		path: "/v1/maintenance-windows/{maintenance_window_id}",
		hasBody: false,
		requiresAuth: true,
		confirmation: true,
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
		],
	},
	(input) => {
		const path = zDeleteMaintenanceWindowPath.strict().parse(input.path);
		const headers = zDeleteMaintenanceWindowHeaders
			.strict()
			.parse(input.headers);
		const request = {
			path: { maintenance_window_id: path["maintenance_window_id"] },
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
					await deleteMaintenanceWindow({ ...getApiConfig(token), ...request }),
					"/v1/maintenance-windows/{maintenance_window_id}",
				),
		};
	},
);
