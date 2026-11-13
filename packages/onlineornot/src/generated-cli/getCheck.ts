import { getCheck } from "@onlineornot/api";
import { zGetCheckPath, zGetCheckHeaders } from "@onlineornot/api/zod";

import { getApiConfig, unwrapApiEnvelope } from "../api/infrastructure";
import { createApiCommand } from "../command-runtime/api-command";

export const command = createApiCommand(
	{
		operationId: "getCheck",
		command: "onlineornot checks get",
		words: ["checks", "get"],
		description: "Retrieve a check",
		method: "GET",
		path: "/v1/checks/{check_id}",
		hasBody: false,
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
		],
	},
	(input) => {
		const path = zGetCheckPath.strict().parse(input.path);
		const headers = zGetCheckHeaders.strict().parse(input.headers);
		const request = {
			path: { check_id: path["check_id"] },
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
					await getCheck({ ...getApiConfig(token), ...request }),
					"/v1/checks/{check_id}",
				),
		};
	},
);
