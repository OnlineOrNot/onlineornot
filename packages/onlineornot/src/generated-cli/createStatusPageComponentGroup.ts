import { createStatusPageComponentGroup } from "@onlineornot/api";
import {
	zCreateStatusPageComponentGroupPath,
	zCreateStatusPageComponentGroupHeaders,
	zCreateStatusPageComponentGroupBody,
} from "@onlineornot/api/zod";

import { getApiConfig, unwrapApiEnvelope } from "../api/infrastructure";
import { createApiCommand } from "../command-runtime/api-command";

export const command = createApiCommand(
	{
		operationId: "createStatusPageComponentGroup",
		command: "onlineornot status-pages groups create",
		words: ["status-pages", "groups", "create"],
		description: "Create a component group",
		method: "POST",
		path: "/v1/status_pages/{status_page_id}/groups",
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
				name: "name",
				wireName: "name",
				location: "body",
				type: "string",
				array: false,
				required: true,
				positional: false,
				description: "Name of the component group",
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
				description: "Description of the component group",
				sensitive: false,
			},
		],
	},
	(input) => {
		const path = zCreateStatusPageComponentGroupPath.strict().parse(input.path);
		const headers = zCreateStatusPageComponentGroupHeaders
			.strict()
			.parse(input.headers);
		const body = zCreateStatusPageComponentGroupBody.strict().parse(input.body);
		const request = {
			path: { status_page_id: path["status_page_id"] },
			headers: {
				"X-OnlineOrNot-Organisation":
					input.headers?.["X-OnlineOrNot-Organisation"] === undefined
						? undefined
						: headers["X-OnlineOrNot-Organisation"],
			},
			body: {
				name: body["name"],
				description:
					input.body?.["description"] === undefined
						? undefined
						: body["description"],
			},
		};
		return {
			request,
			execute: async (token) =>
				unwrapApiEnvelope(
					await createStatusPageComponentGroup({
						...getApiConfig(token),
						...request,
					}),
					"/v1/status_pages/{status_page_id}/groups",
				),
		};
	},
);
