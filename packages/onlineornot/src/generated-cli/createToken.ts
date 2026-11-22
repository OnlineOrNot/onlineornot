import { createToken } from "@onlineornot/api";
import { zCreateTokenHeaders, zCreateTokenBody } from "@onlineornot/api/zod";

import { getApiConfig, unwrapApiEnvelope } from "../api/infrastructure";
import { createApiCommand } from "../command-runtime/api-command";

export const command = createApiCommand(
	{
		operationId: "createToken",
		command: "onlineornot tokens create",
		words: ["tokens", "create"],
		description: "Create an API token",
		method: "POST",
		path: "/v1/tokens",
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
				name: "name",
				wireName: "name",
				location: "body",
				type: "string",
				array: false,
				required: true,
				positional: false,
				description: "Token name",
				sensitive: false,
			},
			{
				name: "grants",
				wireName: "grants",
				location: "body",
				type: "json",
				array: false,
				required: true,
				positional: false,
				description: "Permissions explicitly granted to this token.",
				sensitive: false,
			},
			{
				name: "expires-at",
				wireName: "expiresAt",
				location: "body",
				type: "string",
				array: false,
				required: false,
				positional: false,
				description:
					"Custom expiration date. Omit for 365 days from now, or use null for no expiration.",
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
					"Project receiving logs. Omit or use null for unassigned. Requires LOGS:SEND and applies only to sending; other grants remain organisation-wide. Scope cannot be changed after issuance.",
				sensitive: false,
			},
		],
	},
	(input) => {
		const headers = zCreateTokenHeaders.strict().parse(input.headers);
		const body = zCreateTokenBody.strict().parse(input.body);
		const request = {
			headers: {
				"X-OnlineOrNot-Organisation":
					input.headers?.["X-OnlineOrNot-Organisation"] === undefined
						? undefined
						: headers["X-OnlineOrNot-Organisation"],
			},
			body: {
				name: body["name"],
				grants: body["grants"],
				expiresAt:
					input.body?.["expiresAt"] === undefined
						? undefined
						: body["expiresAt"],
				project_id:
					input.body?.["project_id"] === undefined
						? undefined
						: body["project_id"],
			},
		};
		return {
			request,
			execute: async (token) =>
				unwrapApiEnvelope(
					await createToken({ ...getApiConfig(token), ...request }),
					"/v1/tokens",
				),
		};
	},
);
