import { createStatusPageSubscriber } from "@onlineornot/api";
import {
	zCreateStatusPageSubscriberPath,
	zCreateStatusPageSubscriberHeaders,
	zCreateStatusPageSubscriberBody,
} from "@onlineornot/api/zod";

import { getApiConfig, unwrapApiEnvelope } from "../api/infrastructure";
import { createApiCommand } from "../command-runtime/api-command";

export const command = createApiCommand(
	{
		operationId: "createStatusPageSubscriber",
		command: "onlineornot status-pages subscribers create",
		words: ["status-pages", "subscribers", "create"],
		description: "Create a subscriber",
		method: "POST",
		path: "/v1/status_pages/{status_page_id}/subscribers",
		hasBody: true,
		requiresAuth: true,
		confirmation: false,
		flags: [
			{
				name: "status-page-id",
				wireName: "status_page_id",
				location: "path",
				type: "string",
				array: false,
				required: true,
				positional: true,
				description: "Status Page ID",
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
				name: "email-address",
				wireName: "email_address",
				location: "body",
				type: "string",
				array: false,
				required: true,
				positional: false,
				description: "Email address of the subscriber",
				sensitive: false,
			},
			{
				name: "component-subscription-mode",
				wireName: "component_subscription_mode",
				location: "body",
				type: "string",
				array: false,
				choices: ["ALL_COMPONENTS", "SELECTED_COMPONENTS"],
				required: false,
				positional: false,
				description: "Component alert preference mode for this subscriber",
				sensitive: false,
			},
			{
				name: "component-ids",
				wireName: "component_ids",
				location: "body",
				type: "string",
				array: true,
				required: false,
				positional: false,
				description:
					"Selected component IDs when component_subscription_mode is SELECTED_COMPONENTS",
				sensitive: false,
			},
		],
	},
	(input) => {
		const path = zCreateStatusPageSubscriberPath.strict().parse(input.path);
		const headers = zCreateStatusPageSubscriberHeaders
			.strict()
			.parse(input.headers);
		const body = zCreateStatusPageSubscriberBody.strict().parse(input.body);
		const request = {
			path: { status_page_id: path["status_page_id"] },
			headers: {
				"X-OnlineOrNot-Organisation":
					input.headers?.["X-OnlineOrNot-Organisation"] === undefined
						? undefined
						: headers["X-OnlineOrNot-Organisation"],
			},
			body: {
				email_address: body["email_address"],
				component_subscription_mode:
					input.body?.["component_subscription_mode"] === undefined
						? undefined
						: body["component_subscription_mode"],
				component_ids:
					input.body?.["component_ids"] === undefined
						? undefined
						: body["component_ids"],
			},
		};
		return {
			request,
			execute: async (token) =>
				unwrapApiEnvelope(
					await createStatusPageSubscriber({
						...getApiConfig(token),
						...request,
					}),
					"/v1/status_pages/{status_page_id}/subscribers",
				),
		};
	},
);
