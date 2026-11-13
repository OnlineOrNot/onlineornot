import { getWebhookDeliverySummary } from "@onlineornot/api";
import {
	zGetWebhookDeliverySummaryQuery,
	zGetWebhookDeliverySummaryHeaders,
} from "@onlineornot/api/zod";

import { getApiConfig, unwrapApiEnvelope } from "../api/infrastructure";
import { createApiCommand } from "../command-runtime/api-command";

export const command = createApiCommand(
	{
		operationId: "getWebhookDeliverySummary",
		command: "onlineornot webhooks deliveries summary",
		words: ["webhooks", "deliveries", "summary"],
		description: "Read last-24-hour webhook summaries",
		method: "GET",
		path: "/v1/webhooks/delivery-summary",
		hasBody: false,
		requiresAuth: true,
		confirmation: false,
		flags: [
			{
				name: "webhook-ids",
				wireName: "webhook_ids",
				location: "query",
				type: "string",
				array: false,
				required: true,
				positional: false,
				description: "webhook_ids",
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
		const query = zGetWebhookDeliverySummaryQuery.strict().parse(input.query);
		const headers = zGetWebhookDeliverySummaryHeaders
			.strict()
			.parse(input.headers);
		const request = {
			query: { webhook_ids: query["webhook_ids"] },
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
					await getWebhookDeliverySummary({
						...getApiConfig(token),
						...request,
					}),
					"/v1/webhooks/delivery-summary",
				),
		};
	},
);
