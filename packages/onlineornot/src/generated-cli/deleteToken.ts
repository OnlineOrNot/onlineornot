import { deleteToken } from "@onlineornot/api";
import { zDeleteTokenPath, zDeleteTokenHeaders } from "@onlineornot/api/zod";

import { getApiConfig, unwrapApiEnvelope } from "../api/infrastructure";
import { createApiCommand } from "../command-runtime/api-command";

export const command = createApiCommand(
	{
		operationId: "deleteToken",
		command: "onlineornot tokens delete",
		words: ["tokens", "delete"],
		description: "Delete an API token",
		method: "DELETE",
		path: "/v1/tokens/{token_id}",
		hasBody: false,
		requiresAuth: true,
		confirmation: true,
		flags: [
			{
				name: "id",
				wireName: "token_id",
				location: "path",
				type: "string",
				array: false,
				required: true,
				positional: true,
				description: "The token ID",
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
		const path = zDeleteTokenPath.strict().parse(input.path);
		const headers = zDeleteTokenHeaders.strict().parse(input.headers);
		const request = {
			path: { token_id: path["token_id"] },
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
					await deleteToken({ ...getApiConfig(token), ...request }),
					"/v1/tokens/{token_id}",
				),
		};
	},
);
