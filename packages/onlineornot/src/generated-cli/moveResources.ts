import { moveResources } from "@onlineornot/api";
import {
	zMoveResourcesHeaders,
	zMoveResourcesBody,
} from "@onlineornot/api/zod";

import { getApiConfig, unwrapApiEnvelope } from "../api/infrastructure";
import { createApiCommand } from "../command-runtime/api-command";

export const command = createApiCommand(
	{
		operationId: "moveResources",
		command: "onlineornot resources move",
		words: ["resources", "move"],
		description: "Assign or unassign explicitly selected resources atomically",
		method: "POST",
		path: "/v1/resources/move",
		hasBody: true,
		requiresAuth: true,
		confirmation: true,
		confirmationMessage: "Move these selected resources?",
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
				required: true,
				positional: false,
				description: "Project ID, or null for unassigned.",
				sensitive: false,
			},
			{
				name: "resources",
				wireName: "resources",
				location: "body",
				type: "json",
				array: false,
				required: true,
				positional: false,
				description: "resources",
				sensitive: false,
			},
		],
	},
	(input) => {
		const headers = zMoveResourcesHeaders.strict().parse(input.headers);
		const body = zMoveResourcesBody.strict().parse(input.body);
		const request = {
			headers: {
				"X-OnlineOrNot-Organisation":
					input.headers?.["X-OnlineOrNot-Organisation"] === undefined
						? undefined
						: headers["X-OnlineOrNot-Organisation"],
			},
			body: { project_id: body["project_id"], resources: body["resources"] },
		};
		return {
			request,
			execute: async (token) =>
				unwrapApiEnvelope(
					await moveResources({ ...getApiConfig(token), ...request }),
					"/v1/resources/move",
				),
		};
	},
);
