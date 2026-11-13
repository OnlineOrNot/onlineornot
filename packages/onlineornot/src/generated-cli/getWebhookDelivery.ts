import { getWebhookDelivery } from "@onlineornot/api";
import {
	zGetWebhookDeliveryPath,
	zGetWebhookDeliveryHeaders,
} from "@onlineornot/api/zod";

import { getApiConfig, unwrapApiEnvelope } from "../api/infrastructure";
import { createApiCommand } from "../command-runtime/api-command";

export const command = createApiCommand(
	{
		operationId: "getWebhookDelivery",
		command: "onlineornot webhooks deliveries get",
		words: ["webhooks", "deliveries", "get"],
		description: "Inspect a webhook delivery attempt",
		method: "GET",
		path: "/v1/webhooks/{webhook_id}/deliveries/{attempt_id}",
		hasBody: false,
		requiresAuth: true,
		confirmation: false,
		flags: [
			{
				name: "webhook-id",
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
				name: "attempt-id",
				wireName: "attempt_id",
				location: "path",
				type: "string",
				array: false,
				required: true,
				positional: true,
				description: "attempt_id",
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
		const path = zGetWebhookDeliveryPath.strict().parse(input.path);
		const headers = zGetWebhookDeliveryHeaders.strict().parse(input.headers);
		const request = {
			path: { webhook_id: path["webhook_id"], attempt_id: path["attempt_id"] },
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
					await getWebhookDelivery({
						...getApiConfig(token, { sensitiveResponse: true }),
						...request,
					}),
					"/v1/webhooks/{webhook_id}/deliveries/{attempt_id}",
				),
		};
	},
);
