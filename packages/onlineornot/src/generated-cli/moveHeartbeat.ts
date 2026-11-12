import { moveHeartbeat } from "@onlineornot/api";
import {
	zMoveHeartbeatPath,
	zMoveHeartbeatHeaders,
	zMoveHeartbeatBody,
} from "@onlineornot/api/zod";

import { getApiConfig, unwrapApiEnvelope } from "../api/infrastructure";
import { createApiCommand } from "../command-runtime/api-command";

export const command = createApiCommand(
	{
		operationId: "moveHeartbeat",
		command: "onlineornot heartbeats move",
		words: ["heartbeats", "move"],
		description: "Assign or unassign a heartbeat",
		method: "POST",
		path: "/v1/heartbeats/{heartbeat_id}/move",
		hasBody: true,
		requiresAuth: true,
		confirmation: false,
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
		const path = zMoveHeartbeatPath.strict().parse(input.path);
		const headers = zMoveHeartbeatHeaders.strict().parse(input.headers);
		const body = zMoveHeartbeatBody.strict().parse(input.body);
		const request = {
			path: { heartbeat_id: path["heartbeat_id"] },
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
					await moveHeartbeat({ ...getApiConfig(token), ...request }),
					"/v1/heartbeats/{heartbeat_id}/move",
				),
		};
	},
);
