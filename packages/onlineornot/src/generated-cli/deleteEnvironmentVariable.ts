import { deleteEnvironmentVariable } from "@onlineornot/api";
import {
	zDeleteEnvironmentVariablePath,
	zDeleteEnvironmentVariableHeaders,
} from "@onlineornot/api/zod";

import { getApiConfig, unwrapApiEnvelope } from "../api/infrastructure";
import { createApiCommand } from "../command-runtime/api-command";

export const command = createApiCommand(
	{
		operationId: "deleteEnvironmentVariable",
		command: "onlineornot environment-variables delete",
		words: ["environment-variables", "delete"],
		description: "Delete an environment variable",
		method: "DELETE",
		path: "/v1/env/{environment_variable_id}",
		hasBody: false,
		requiresAuth: true,
		confirmation: true,
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
		],
	},
	(input) => {
		const path = zDeleteEnvironmentVariablePath.strict().parse(input.path);
		const headers = zDeleteEnvironmentVariableHeaders
			.strict()
			.parse(input.headers);
		const request = {
			path: { environment_variable_id: path["environment_variable_id"] },
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
					await deleteEnvironmentVariable({
						...getApiConfig(token),
						...request,
					}),
					"/v1/env/{environment_variable_id}",
				),
		};
	},
);
