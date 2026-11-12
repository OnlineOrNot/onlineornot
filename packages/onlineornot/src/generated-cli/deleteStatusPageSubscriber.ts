import { deleteStatusPageSubscriber } from "@onlineornot/api";
import {
	zDeleteStatusPageSubscriberPath,
	zDeleteStatusPageSubscriberHeaders,
} from "@onlineornot/api/zod";

import { getApiConfig, unwrapApiEnvelope } from "../api/infrastructure";
import { createApiCommand } from "../command-runtime/api-command";

export const command = createApiCommand(
	{
		operationId: "deleteStatusPageSubscriber",
		command: "onlineornot status-pages subscribers delete",
		words: ["status-pages", "subscribers", "delete"],
		description: "Delete a subscriber",
		method: "DELETE",
		path: "/v1/status_pages/{status_page_id}/subscribers/{subscriber_id}",
		hasBody: false,
		requiresAuth: true,
		confirmation: true,
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
				name: "id",
				wireName: "subscriber_id",
				location: "path",
				type: "string",
				array: false,
				required: true,
				positional: true,
				description: "Status Page Subscriber ID",
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
		const path = zDeleteStatusPageSubscriberPath.strict().parse(input.path);
		const headers = zDeleteStatusPageSubscriberHeaders
			.strict()
			.parse(input.headers);
		const request = {
			path: {
				status_page_id: path["status_page_id"],
				subscriber_id: path["subscriber_id"],
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
					await deleteStatusPageSubscriber({
						...getApiConfig(token),
						...request,
					}),
					"/v1/status_pages/{status_page_id}/subscribers/{subscriber_id}",
				),
		};
	},
);
