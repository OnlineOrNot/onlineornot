import { updateStatusPageComponentSortOrder } from "@onlineornot/api";
import {
	zUpdateStatusPageComponentSortOrderPath,
	zUpdateStatusPageComponentSortOrderHeaders,
	zUpdateStatusPageComponentSortOrderBody,
} from "@onlineornot/api/zod";

import { getApiConfig, unwrapApiEnvelope } from "../api/infrastructure";
import { createApiCommand } from "../command-runtime/api-command";

export const command = createApiCommand(
	{
		operationId: "updateStatusPageComponentSortOrder",
		command: "onlineornot status-pages components sort-order",
		words: ["status-pages", "components", "sort-order"],
		description: "Update the sort order of ungrouped components",
		method: "PUT",
		path: "/v1/status_pages/{status_page_id}/components/sort-order",
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
				name: "component-ids",
				wireName: "component_ids",
				location: "body",
				type: "string",
				array: true,
				required: true,
				positional: false,
				description: "Ordered list of ungrouped component IDs",
				sensitive: false,
			},
		],
	},
	(input) => {
		const path = zUpdateStatusPageComponentSortOrderPath
			.strict()
			.parse(input.path);
		const headers = zUpdateStatusPageComponentSortOrderHeaders
			.strict()
			.parse(input.headers);
		const body = zUpdateStatusPageComponentSortOrderBody
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
			body: { component_ids: body["component_ids"] },
		};
		return {
			request,
			execute: async (token) =>
				unwrapApiEnvelope(
					await updateStatusPageComponentSortOrder({
						...getApiConfig(token),
						...request,
					}),
					"/v1/status_pages/{status_page_id}/components/sort-order",
				),
		};
	},
);
