import { updateStatusPageComponentGroup } from "@onlineornot/api";
import {
	zUpdateStatusPageComponentGroupPath,
	zUpdateStatusPageComponentGroupHeaders,
	zUpdateStatusPageComponentGroupBody,
} from "@onlineornot/api/zod";

import { getApiConfig, unwrapApiEnvelope } from "../api/infrastructure";
import { createApiCommand } from "../command-runtime/api-command";

export const command = createApiCommand(
	{
		operationId: "updateStatusPageComponentGroup",
		command: "onlineornot status-pages groups update",
		words: ["status-pages", "groups", "update"],
		description: "Update a component group",
		method: "PATCH",
		path: "/v1/status_pages/{status_page_id}/groups/{group_id}",
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
				name: "id",
				wireName: "group_id",
				location: "path",
				type: "string",
				array: false,
				required: true,
				positional: true,
				description: "Status Page Component Group ID",
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
				required: false,
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
		const path = zUpdateStatusPageComponentGroupPath.strict().parse(input.path);
		const headers = zUpdateStatusPageComponentGroupHeaders
			.strict()
			.parse(input.headers);
		const body = zUpdateStatusPageComponentGroupBody.strict().parse(input.body);
		const request = {
			path: {
				status_page_id: path["status_page_id"],
				group_id: path["group_id"],
			},
			headers: {
				"X-OnlineOrNot-Organisation":
					input.headers?.["X-OnlineOrNot-Organisation"] === undefined
						? undefined
						: headers["X-OnlineOrNot-Organisation"],
			},
			body: {
				name: input.body?.["name"] === undefined ? undefined : body["name"],
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
					await updateStatusPageComponentGroup({
						...getApiConfig(token),
						...request,
					}),
					"/v1/status_pages/{status_page_id}/groups/{group_id}",
				),
		};
	},
);
