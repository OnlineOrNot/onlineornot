import { createProject } from "@onlineornot/api";
import {
	zCreateProjectHeaders,
	zCreateProjectBody,
} from "@onlineornot/api/zod";

import { getApiConfig, unwrapApiEnvelope } from "../api/infrastructure";
import { createApiCommand } from "../command-runtime/api-command";

export const command = createApiCommand(
	{
		operationId: "createProject",
		command: "onlineornot projects create",
		words: ["projects", "create"],
		description: "Create a project",
		method: "POST",
		path: "/v1/projects",
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
				name: "name",
				wireName: "name",
				location: "body",
				type: "string",
				array: false,
				required: true,
				positional: false,
				description:
					"Project name. Unique within the organisation, ignoring case and surrounding spaces.",
				sensitive: false,
			},
		],
	},
	(input) => {
		const headers = zCreateProjectHeaders.strict().parse(input.headers);
		const body = zCreateProjectBody.strict().parse(input.body);
		const request = {
			headers: {
				"X-OnlineOrNot-Organisation":
					input.headers?.["X-OnlineOrNot-Organisation"] === undefined
						? undefined
						: headers["X-OnlineOrNot-Organisation"],
			},
			body: { name: body["name"] },
		};
		return {
			request,
			execute: async (token) =>
				unwrapApiEnvelope(
					await createProject({ ...getApiConfig(token), ...request }),
					"/v1/projects",
				),
		};
	},
);
