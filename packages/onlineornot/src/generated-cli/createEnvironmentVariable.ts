import { createEnvironmentVariable } from "@onlineornot/api";
import {
	zCreateEnvironmentVariableHeaders,
	zCreateEnvironmentVariableBody,
} from "@onlineornot/api/zod";

import { getApiConfig, unwrapApiEnvelope } from "../api/infrastructure";
import { createApiCommand } from "../command-runtime/api-command";

export const command = createApiCommand(
	{
		operationId: "createEnvironmentVariable",
		command: "onlineornot env create",
		aliases: ["onlineornot environment-variables create"],
		words: ["env", "create"],
		description: "Create an environment variable",
		method: "POST",
		path: "/v1/env",
		hasBody: true,
		requiresAuth: true,
		confirmation: false,
		flags: [
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
				required: false,
				positional: false,
				description:
					"Project ID. Omit or use null to leave the resource unassigned.",
				sensitive: false,
			},
			{
				name: "name",
				wireName: "name",
				location: "body",
				type: "string",
				array: false,
				required: true,
				positional: false,
				description:
					"Case-sensitive name matching [A-Z_][A-Z0-9_]{0,63}, unique within the project.",
				sensitive: false,
			},
			{
				name: "type",
				wireName: "type",
				location: "body",
				type: "string",
				array: false,
				choices: ["config", "secret"],
				required: true,
				positional: false,
				description:
					"Immutable variable type. Config values are readable and unsuitable for credentials; secret values are write-only.",
				sensitive: false,
			},
			{
				name: "value",
				wireName: "value",
				location: "body",
				type: "string",
				array: false,
				required: true,
				positional: false,
				description:
					"Value of the variable, limited to 8 KiB of UTF-8. Secret values are write-only and never appear in API responses.",
				sensitive: true,
			},
		],
	},
	(input) => {
		const headers = zCreateEnvironmentVariableHeaders
			.strict()
			.parse(input.headers);
		const body = zCreateEnvironmentVariableBody.strict().parse(input.body);
		const request = {
			headers: {
				"X-OnlineOrNot-Organisation":
					input.headers?.["X-OnlineOrNot-Organisation"] === undefined
						? undefined
						: headers["X-OnlineOrNot-Organisation"],
			},
			body: {
				project_id:
					input.body?.["project_id"] === undefined
						? undefined
						: body["project_id"],
				name: body["name"],
				type: body["type"],
				value: body["value"],
			},
		};
		return {
			request,
			execute: async (token) =>
				unwrapApiEnvelope(
					await createEnvironmentVariable({
						...getApiConfig(token),
						...request,
					}),
					"/v1/env",
				),
		};
	},
);
