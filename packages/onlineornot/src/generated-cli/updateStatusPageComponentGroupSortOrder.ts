import { updateStatusPageComponentGroupSortOrder } from "@onlineornot/api";
import {
	zUpdateStatusPageComponentGroupSortOrderPath,
	zUpdateStatusPageComponentGroupSortOrderHeaders,
	zUpdateStatusPageComponentGroupSortOrderBody,
} from "@onlineornot/api/zod";

import { getApiConfig, unwrapApiEnvelope } from "../api/infrastructure";
import { createApiCommand } from "../command-runtime/api-command";

export const command = createApiCommand(
	{
		operationId: "updateStatusPageComponentGroupSortOrder",
		command: "onlineornot status-pages groups sort-order",
		words: ["status-pages", "groups", "sort-order"],
		description: "Update the sort order of component groups",
		method: "PUT",
		path: "/v1/status_pages/{status_page_id}/groups/sort-order",
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
				name: "group-ids",
				wireName: "group_ids",
				location: "body",
				type: "string",
				array: true,
				required: true,
				positional: false,
				description: "Ordered list of component group IDs",
				sensitive: false,
			},
		],
	},
	(input) => {
		const path = zUpdateStatusPageComponentGroupSortOrderPath
			.strict()
			.parse(input.path);
		const headers = zUpdateStatusPageComponentGroupSortOrderHeaders
			.strict()
			.parse(input.headers);
		const body = zUpdateStatusPageComponentGroupSortOrderBody
			.strict()
			.parse(input.body);
		const request = {
			path: { status_page_id: path["status_page_id"] },
			headers: {
				"X-OnlineOrNot-Organisation":
					input.headers?.["X-OnlineOrNot-Organisation"] === undefined
						? undefined
						: headers["X-OnlineOrNot-Organisation"],
			},
			body: { group_ids: body["group_ids"] },
		};
		return {
			request,
			execute: async (token) =>
				unwrapApiEnvelope(
					await updateStatusPageComponentGroupSortOrder({
						...getApiConfig(token),
						...request,
					}),
					"/v1/status_pages/{status_page_id}/groups/sort-order",
				),
		};
	},
);
