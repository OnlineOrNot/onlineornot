import { getToken } from "@onlineornot/api";
import { zGetTokenPath, zGetTokenHeaders } from "@onlineornot/api/zod";

import { getApiConfig, unwrapApiEnvelope } from "../api/infrastructure";
import { createApiCommand } from "../command-runtime/api-command";

export const command = createApiCommand(
	{
		operationId: "getToken",
		command: "onlineornot tokens get",
		words: ["tokens", "get"],
		description: "Retrieve an API token",
		method: "GET",
		path: "/v1/tokens/{token_id}",
		hasBody: false,
		requiresAuth: true,
		confirmation: false,
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
		const path = zGetTokenPath.strict().parse(input.path);
		const headers = zGetTokenHeaders.strict().parse(input.headers);
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
					await getToken({ ...getApiConfig(token), ...request }),
					"/v1/tokens/{token_id}",
				),
		};
	},
);
