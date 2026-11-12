import { updateWebhook } from "@onlineornot/api";
import {
	zUpdateWebhookPath,
	zUpdateWebhookHeaders,
	zUpdateWebhookBody,
} from "@onlineornot/api/zod";

import { getApiConfig, unwrapApiEnvelope } from "../api/infrastructure";
import { createApiCommand } from "../command-runtime/api-command";

export const command = createApiCommand(
	{
		operationId: "updateWebhook",
		command: "onlineornot webhooks update",
		words: ["webhooks", "update"],
		description: "Modify a webhook",
		method: "PATCH",
		path: "/v1/webhooks/{webhook_id}",
		hasBody: true,
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
				required: false,
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
				required: false,
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
		const path = zUpdateWebhookPath.strict().parse(input.path);
		const headers = zUpdateWebhookHeaders.strict().parse(input.headers);
		const body = zUpdateWebhookBody
			.omit({ project_id: true })
			.strict()
			.parse(input.body);
		const request = {
			path: { webhook_id: path["webhook_id"] },
			headers: {
				"X-OnlineOrNot-Organisation":
					input.headers?.["X-OnlineOrNot-Organisation"] === undefined
						? undefined
						: headers["X-OnlineOrNot-Organisation"],
			},
			body: {
				enabled:
					input.body?.["enabled"] === undefined ? undefined : body["enabled"],
				url: input.body?.["url"] === undefined ? undefined : body["url"],
				description:
					input.body?.["description"] === undefined
						? undefined
						: body["description"],
				events:
					input.body?.["events"] === undefined ? undefined : body["events"],
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
					await updateWebhook({ ...getApiConfig(token), ...request }),
					"/v1/webhooks/{webhook_id}",
				),
		};
	},
);
