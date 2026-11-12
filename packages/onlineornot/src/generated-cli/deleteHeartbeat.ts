import { deleteHeartbeat } from "@onlineornot/api";
import {
	zDeleteHeartbeatPath,
	zDeleteHeartbeatHeaders,
} from "@onlineornot/api/zod";

import { getApiConfig, unwrapApiEnvelope } from "../api/infrastructure";
import { createApiCommand } from "../command-runtime/api-command";

export const command = createApiCommand(
	{
		operationId: "deleteHeartbeat",
		command: "onlineornot heartbeats delete",
		words: ["heartbeats", "delete"],
		description: "Delete a heartbeat",
		method: "DELETE",
		path: "/v1/heartbeats/{heartbeat_id}",
		hasBody: false,
		confirmation: true,
		flags: [
			{
				name: "id",
				wireName: "heartbeat_id",
				location: "path",
				type: "string",
				array: false,
				required: true,
				positional: true,
				description: "Heartbeat ID",
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
		const path = zDeleteHeartbeatPath.strict().parse(input.path);
		const headers = zDeleteHeartbeatHeaders.strict().parse(input.headers);
		const request = {
			path: { heartbeat_id: path["heartbeat_id"] },
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
					await deleteHeartbeat({ ...getApiConfig(token), ...request }),
					"/v1/heartbeats/{heartbeat_id}",
				),
		};
	},
);
