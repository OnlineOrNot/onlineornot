import { moveCheck } from "@onlineornot/api";
import {
	zMoveCheckPath,
	zMoveCheckHeaders,
	zMoveCheckBody,
} from "@onlineornot/api/zod";

import { getApiConfig, unwrapApiEnvelope } from "../api/infrastructure";
import { createApiCommand } from "../command-runtime/api-command";

export const command = createApiCommand(
	{
		operationId: "moveCheck",
		command: "onlineornot checks move",
		words: ["checks", "move"],
		description: "Assign or unassign a check",
		method: "POST",
		path: "/v1/checks/{check_id}/move",
		hasBody: true,
		requiresAuth: true,
		confirmation: false,
		flags: [
			{
				name: "id",
				wireName: "check_id",
				location: "path",
				type: "string",
				array: false,
				required: true,
				positional: true,
				description: "Uptime Check ID",
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
		const path = zMoveCheckPath.strict().parse(input.path);
		const headers = zMoveCheckHeaders.strict().parse(input.headers);
		const body = zMoveCheckBody.strict().parse(input.body);
		const request = {
			path: { check_id: path["check_id"] },
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
					await moveCheck({ ...getApiConfig(token), ...request }),
					"/v1/checks/{check_id}/move",
				),
		};
	},
);
