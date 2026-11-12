import { getMaintenanceWindow } from "@onlineornot/api";
import {
	zGetMaintenanceWindowPath,
	zGetMaintenanceWindowHeaders,
} from "@onlineornot/api/zod";

import { getApiConfig, unwrapApiEnvelope } from "../api/infrastructure";
import { createApiCommand } from "../command-runtime/api-command";

export const command = createApiCommand(
	{
		operationId: "getMaintenanceWindow",
		command: "onlineornot maintenance-windows get",
		words: ["maintenance-windows", "get"],
		description: "Get a maintenance window by ID",
		method: "GET",
		path: "/v1/maintenance-windows/{maintenance_window_id}",
		hasBody: false,
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
		],
	},
	(input) => {
		const path = zGetMaintenanceWindowPath.strict().parse(input.path);
		const headers = zGetMaintenanceWindowHeaders.strict().parse(input.headers);
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
					await getMaintenanceWindow({ ...getApiConfig(token), ...request }),
					"/v1/maintenance-windows/{maintenance_window_id}",
				),
		};
	},
);
