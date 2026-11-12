import { deleteProject } from "@onlineornot/api";
import {
	zDeleteProjectPath,
	zDeleteProjectHeaders,
} from "@onlineornot/api/zod";

import { getApiConfig, unwrapApiEnvelope } from "../api/infrastructure";
import { createApiCommand } from "../command-runtime/api-command";

export const command = createApiCommand(
	{
		operationId: "deleteProject",
		command: "onlineornot projects delete",
		words: ["projects", "delete"],
		description: "Delete an empty project",
		method: "DELETE",
		path: "/v1/projects/{project_id}",
		hasBody: false,
		requiresAuth: true,
		confirmation: true,
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
		const path = zDeleteProjectPath.strict().parse(input.path);
		const headers = zDeleteProjectHeaders.strict().parse(input.headers);
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
					await deleteProject({ ...getApiConfig(token), ...request }),
					"/v1/projects/{project_id}",
				),
		};
	},
);
