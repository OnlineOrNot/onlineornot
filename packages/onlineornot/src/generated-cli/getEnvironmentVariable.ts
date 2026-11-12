import { getEnvironmentVariable } from "@onlineornot/api";
import {
	zGetEnvironmentVariablePath,
	zGetEnvironmentVariableHeaders,
} from "@onlineornot/api/zod";

import { getApiConfig, unwrapApiEnvelope } from "../api/infrastructure";
import { createApiCommand } from "../command-runtime/api-command";

export const command = createApiCommand(
	{
		operationId: "getEnvironmentVariable",
		command: "onlineornot environment-variables get",
		words: ["environment-variables", "get"],
		description: "Get an environment variable",
		method: "GET",
		path: "/v1/env/{environment_variable_id}",
		hasBody: false,
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
		],
	},
	(input) => {
		const path = zGetEnvironmentVariablePath.strict().parse(input.path);
		const headers = zGetEnvironmentVariableHeaders
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
					await getEnvironmentVariable({ ...getApiConfig(token), ...request }),
					"/v1/env/{environment_variable_id}",
				),
		};
	},
);
