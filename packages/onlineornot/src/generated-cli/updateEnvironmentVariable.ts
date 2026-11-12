import { updateEnvironmentVariable } from "@onlineornot/api";
import {
	zUpdateEnvironmentVariablePath,
	zUpdateEnvironmentVariableHeaders,
	zUpdateEnvironmentVariableBody,
} from "@onlineornot/api/zod";

import { getApiConfig, unwrapApiEnvelope } from "../api/infrastructure";
import { createApiCommand } from "../command-runtime/api-command";

export const command = createApiCommand(
	{
		operationId: "updateEnvironmentVariable",
		command: "onlineornot env update",
		aliases: ["onlineornot environment-variables update"],
		words: ["env", "update"],
		description: "Update an environment variable",
		method: "PATCH",
		path: "/v1/env/{environment_variable_id}",
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
				name: "name",
				wireName: "name",
				location: "body",
				type: "string",
				array: false,
				required: false,
				positional: false,
				description:
					"Case-sensitive name matching [A-Z_][A-Z0-9_]{0,63}, unique within the project.",
				sensitive: false,
			},
			{
				name: "value",
				wireName: "value",
				location: "body",
				type: "string",
				array: false,
				required: false,
				positional: false,
				description:
					"Value of the variable, limited to 8 KiB of UTF-8. Secret values are write-only and never appear in API responses.",
				sensitive: true,
			},
		],
	},
	(input) => {
		const path = zUpdateEnvironmentVariablePath.strict().parse(input.path);
		const headers = zUpdateEnvironmentVariableHeaders
			.strict()
			.parse(input.headers);
		const body = zUpdateEnvironmentVariableBody
			.omit({ project_id: true })
			.strict()
			.parse(input.body);
		const request = {
			path: { environment_variable_id: path["environment_variable_id"] },
			headers: {
				"X-OnlineOrNot-Organisation":
					input.headers?.["X-OnlineOrNot-Organisation"] === undefined
						? undefined
						: headers["X-OnlineOrNot-Organisation"],
			},
			body: {
				name: input.body?.["name"] === undefined ? undefined : body["name"],
				value: input.body?.["value"] === undefined ? undefined : body["value"],
			},
		};
		return {
			request,
			execute: async (token) =>
				unwrapApiEnvelope(
					await updateEnvironmentVariable({
						...getApiConfig(token),
						...request,
					}),
					"/v1/env/{environment_variable_id}",
				),
		};
	},
);
