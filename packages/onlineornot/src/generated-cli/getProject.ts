import { getProject } from "@onlineornot/api";
import { zGetProjectPath, zGetProjectHeaders } from "@onlineornot/api/zod";

import { getApiConfig, unwrapApiEnvelope } from "../api/infrastructure";
import { createApiCommand } from "../command-runtime/api-command";

export const command = createApiCommand(
	{
		operationId: "getProject",
		command: "onlineornot projects get",
		words: ["projects", "get"],
		description: "Get a project",
		method: "GET",
		path: "/v1/projects/{project_id}",
		hasBody: false,
		requiresAuth: true,
		confirmation: false,
		flags: [
			{
				name: "id",
				wireName: "project_id",
				location: "path",
				type: "string",
				array: false,
				required: true,
				positional: true,
				description: "Project ID.",
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
		const path = zGetProjectPath.strict().parse(input.path);
		const headers = zGetProjectHeaders.strict().parse(input.headers);
		const request = {
			path: { project_id: path["project_id"] },
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
					await getProject({ ...getApiConfig(token), ...request }),
					"/v1/projects/{project_id}",
				),
		};
	},
);
