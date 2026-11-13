import { listWebhookDeliveries } from "@onlineornot/api";
import {
	zListWebhookDeliveriesPath,
	zListWebhookDeliveriesQuery,
	zListWebhookDeliveriesHeaders,
} from "@onlineornot/api/zod";

import { getApiConfig, unwrapApiEnvelope } from "../api/infrastructure";
import { createApiCommand } from "../command-runtime/api-command";

export const command = createApiCommand(
	{
		operationId: "listWebhookDeliveries",
		command: "onlineornot webhooks deliveries list",
		words: ["webhooks", "deliveries", "list"],
		description: "List webhook delivery attempts",
		method: "GET",
		path: "/v1/webhooks/{webhook_id}/deliveries",
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
				name: "event-type",
				wireName: "event_type",
				location: "query",
				type: "string",
				array: false,
				choices: [
					"status_page.incident.started",
					"status_page.incident.updated",
					"status_page.incident.resolved",
					"uptime.down",
					"uptime.up",
					"heartbeat.down",
					"heartbeat.up",
				],
				required: false,
				positional: false,
				description: "Webhook event type",
				sensitive: false,
			},
			{
				name: "outcome",
				wireName: "outcome",
				location: "query",
				type: "string",
				array: false,
				choices: [
					"success",
					"http_error",
					"timeout",
					"network_error",
					"resolution_error",
					"skipped",
				],
				required: false,
				positional: false,
				description: "outcome",
				sensitive: false,
			},
			{
				name: "limit",
				wireName: "limit",
				location: "query",
				type: "number",
				array: false,
				required: false,
				positional: false,
				description: "limit",
				sensitive: false,
			},
			{
				name: "cursor",
				wireName: "cursor",
				location: "query",
				type: "string",
				array: false,
				required: false,
				positional: false,
				description: "cursor",
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
		const path = zListWebhookDeliveriesPath.strict().parse(input.path);
		const query = zListWebhookDeliveriesQuery.strict().parse(input.query);
		const headers = zListWebhookDeliveriesHeaders.strict().parse(input.headers);
		const request = {
			path: { webhook_id: path["webhook_id"] },
			query: {
				period:
					input.query?.["period"] === undefined ? undefined : query["period"],
				event_type:
					input.query?.["event_type"] === undefined
						? undefined
						: query["event_type"],
				outcome:
					input.query?.["outcome"] === undefined ? undefined : query["outcome"],
				limit:
					input.query?.["limit"] === undefined ? undefined : query["limit"],
				cursor:
					input.query?.["cursor"] === undefined ? undefined : query["cursor"],
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
					await listWebhookDeliveries({ ...getApiConfig(token), ...request }),
					"/v1/webhooks/{webhook_id}/deliveries",
				),
		};
	},
);
