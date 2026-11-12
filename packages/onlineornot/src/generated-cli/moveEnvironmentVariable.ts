import { moveEnvironmentVariable } from "@onlineornot/api";
import {
	zMoveEnvironmentVariablePath,
	zMoveEnvironmentVariableHeaders,
	zMoveEnvironmentVariableBody,
} from "@onlineornot/api/zod";

import { getApiConfig, unwrapApiEnvelope } from "../api/infrastructure";
import { createApiCommand } from "../command-runtime/api-command";

export const command = createApiCommand(
	{
		operationId: "moveEnvironmentVariable",
		command: "onlineornot environment-variables move",
		words: ["environment-variables", "move"],
		description: "Assign or unassign an environment variable",
		method: "POST",
		path: "/v1/env/{environment_variable_id}/move",
		hasBody: true,
		requiresAuth: true,
		confirmation: false,
		flags: [
			{
				name: "id",
				wireName: "environment_variable_id",
				location: "path",
				type: "string",
				array: false,
				required: true,
				positional: true,
				description: "Environment variable ID.",
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
		const path = zMoveEnvironmentVariablePath.strict().parse(input.path);
		const headers = zMoveEnvironmentVariableHeaders
			.strict()
			.parse(input.headers);
		const body = zMoveEnvironmentVariableBody.strict().parse(input.body);
		const request = {
			path: { environment_variable_id: path["environment_variable_id"] },
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
					await moveEnvironmentVariable({ ...getApiConfig(token), ...request }),
					"/v1/env/{environment_variable_id}/move",
				),
		};
	},
);
