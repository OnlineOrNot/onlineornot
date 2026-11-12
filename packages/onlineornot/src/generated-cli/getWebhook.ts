import { getWebhook } from "@onlineornot/api";
import { zGetWebhookPath, zGetWebhookHeaders } from "@onlineornot/api/zod";

import { getApiConfig, unwrapApiEnvelope } from "../api/infrastructure";
import { createApiCommand } from "../command-runtime/api-command";

export const command = createApiCommand(
	{
		operationId: "getWebhook",
		command: "onlineornot webhooks get",
		words: ["webhooks", "get"],
		description: "Retrieve a webhook",
		method: "GET",
		path: "/v1/webhooks/{webhook_id}",
		hasBody: false,
		requiresAuth: true,
		confirmation: false,
		flags: [
			{
				name: "id",
				wireName: "webhook_id",
				location: "path",
				type: "string",
				array: false,
				required: true,
				positional: true,
				description: "Webhook ID",
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
		const path = zGetWebhookPath.strict().parse(input.path);
		const headers = zGetWebhookHeaders.strict().parse(input.headers);
		const request = {
			path: { webhook_id: path["webhook_id"] },
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
					await getWebhook({ ...getApiConfig(token), ...request }),
					"/v1/webhooks/{webhook_id}",
				),
		};
	},
);
