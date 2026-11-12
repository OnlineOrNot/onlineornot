import { createWebhook } from "@onlineornot/api";
import {
	zCreateWebhookHeaders,
	zCreateWebhookBody,
} from "@onlineornot/api/zod";

import { getApiConfig, unwrapApiEnvelope } from "../api/infrastructure";
import { createApiCommand } from "../command-runtime/api-command";

export const command = createApiCommand(
	{
		operationId: "createWebhook",
		command: "onlineornot webhooks create",
		words: ["webhooks", "create"],
		description: "Create a webhook",
		method: "POST",
		path: "/v1/webhooks",
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
				name: "enabled",
				wireName: "enabled",
				location: "body",
				type: "boolean",
				array: false,
				required: false,
				positional: false,
				description:
					"Whether webhook delivery is enabled. Defaults to true on creation; omitted PATCH values preserve the current state.",
				sensitive: false,
			},
			{
				name: "url",
				wireName: "url",
				location: "body",
				type: "string",
				array: false,
				required: true,
				positional: false,
				description:
					"Webhook URL. Use {{NAME}} to reference an environment variable.",
				sensitive: false,
			},
			{
				name: "description",
				wireName: "description",
				location: "body",
				type: "string",
				array: false,
				required: false,
				positional: false,
				description: "Optional description of the webhook",
				sensitive: false,
			},
			{
				name: "events",
				wireName: "events",
				location: "body",
				type: "string",
				array: true,
				choices: [
					"status_page.incident.started",
					"status_page.incident.updated",
					"status_page.incident.resolved",
					"uptime.down",
					"uptime.up",
					"heartbeat.down",
					"heartbeat.up",
				],
				required: true,
				positional: false,
				description: "Event types this webhook should subscribe to",
				sensitive: false,
			},
			{
				name: "status-page-ids",
				wireName: "status_page_ids",
				location: "body",
				type: "string",
				array: true,
				required: false,
				positional: false,
				description: "IDs of status pages to associate with this webhook",
				sensitive: false,
			},
			{
				name: "check-ids",
				wireName: "check_ids",
				location: "body",
				type: "string",
				array: true,
				required: false,
				positional: false,
				description: "IDs of uptime checks to associate with this webhook",
				sensitive: false,
			},
			{
				name: "heartbeat-ids",
				wireName: "heartbeat_ids",
				location: "body",
				type: "string",
				array: true,
				required: false,
				positional: false,
				description: "IDs of heartbeats to associate with this webhook",
				sensitive: false,
			},
		],
	},
	(input) => {
		const headers = zCreateWebhookHeaders.strict().parse(input.headers);
		const body = zCreateWebhookBody.strict().parse(input.body);
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
				enabled:
					input.body?.["enabled"] === undefined ? undefined : body["enabled"],
				url: body["url"],
				description:
					input.body?.["description"] === undefined
						? undefined
						: body["description"],
				events: body["events"],
				status_page_ids:
					input.body?.["status_page_ids"] === undefined
						? undefined
						: body["status_page_ids"],
				check_ids:
					input.body?.["check_ids"] === undefined
						? undefined
						: body["check_ids"],
				heartbeat_ids:
					input.body?.["heartbeat_ids"] === undefined
						? undefined
						: body["heartbeat_ids"],
			},
		};
		return {
			request,
			execute: async (token) =>
				unwrapApiEnvelope(
					await createWebhook({ ...getApiConfig(token), ...request }),
					"/v1/webhooks",
				),
		};
	},
);
