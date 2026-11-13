import { getWebhookDeliveryActivity } from "@onlineornot/api";
import {
	zGetWebhookDeliveryActivityPath,
	zGetWebhookDeliveryActivityQuery,
	zGetWebhookDeliveryActivityHeaders,
} from "@onlineornot/api/zod";

import { getApiConfig, unwrapApiEnvelope } from "../api/infrastructure";
import { createApiCommand } from "../command-runtime/api-command";

export const command = createApiCommand(
	{
		operationId: "getWebhookDeliveryActivity",
		command: "onlineornot webhooks deliveries activity",
		words: ["webhooks", "deliveries", "activity"],
		description: "Read webhook delivery activity",
		method: "GET",
		path: "/v1/webhooks/{webhook_id}/delivery-activity",
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
				name: "period",
				wireName: "period",
				location: "query",
				type: "string",
				array: false,
				choices: ["24h", "7d", "14d"],
				required: false,
				positional: false,
				description: "period",
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
		const path = zGetWebhookDeliveryActivityPath.strict().parse(input.path);
		const query = zGetWebhookDeliveryActivityQuery.strict().parse(input.query);
		const headers = zGetWebhookDeliveryActivityHeaders
			.strict()
			.parse(input.headers);
		const request = {
			path: { webhook_id: path["webhook_id"] },
			query: {
				period:
					input.query?.["period"] === undefined ? undefined : query["period"],
			},
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
					await getWebhookDeliveryActivity({
						...getApiConfig(token),
						...request,
					}),
					"/v1/webhooks/{webhook_id}/delivery-activity",
				),
		};
	},
);
