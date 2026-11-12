import { moveWebhook } from "@onlineornot/api";
import {
	zMoveWebhookPath,
	zMoveWebhookHeaders,
	zMoveWebhookBody,
} from "@onlineornot/api/zod";

import { getApiConfig, unwrapApiEnvelope } from "../api/infrastructure";
import { createApiCommand } from "../command-runtime/api-command";

export const command = createApiCommand(
	{
		operationId: "moveWebhook",
		command: "onlineornot webhooks move",
		words: ["webhooks", "move"],
		description: "Assign or unassign a webhook",
		method: "POST",
		path: "/v1/webhooks/{webhook_id}/move",
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
				name: "project-id",
				wireName: "project_id",
				location: "body",
				type: "string",
				array: false,
				required: true,
				positional: false,
				description: "Project ID, or null for unassigned.",
				sensitive: false,
			},
		],
	},
	(input) => {
		const path = zMoveWebhookPath.strict().parse(input.path);
		const headers = zMoveWebhookHeaders.strict().parse(input.headers);
		const body = zMoveWebhookBody.strict().parse(input.body);
		const request = {
			path: { webhook_id: path["webhook_id"] },
			headers: {
				"X-OnlineOrNot-Organisation":
					input.headers?.["X-OnlineOrNot-Organisation"] === undefined
						? undefined
						: headers["X-OnlineOrNot-Organisation"],
			},
			body: { project_id: body["project_id"] },
		};
		return {
			request,
			execute: async (token) =>
				unwrapApiEnvelope(
					await moveWebhook({ ...getApiConfig(token), ...request }),
					"/v1/webhooks/{webhook_id}/move",
				),
		};
	},
);
