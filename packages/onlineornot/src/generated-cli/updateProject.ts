import { updateProject } from "@onlineornot/api";
import {
	zUpdateProjectPath,
	zUpdateProjectHeaders,
	zUpdateProjectBody,
} from "@onlineornot/api/zod";

import { getApiConfig, unwrapApiEnvelope } from "../api/infrastructure";
import { createApiCommand } from "../command-runtime/api-command";

export const command = createApiCommand(
	{
		operationId: "updateProject",
		command: "onlineornot projects update",
		words: ["projects", "update"],
		description: "Rename a project",
		method: "PATCH",
		path: "/v1/projects/{project_id}",
		hasBody: true,
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
		const path = zUpdateProjectPath.strict().parse(input.path);
		const headers = zUpdateProjectHeaders.strict().parse(input.headers);
		const body = zUpdateProjectBody.strict().parse(input.body);
		const request = {
			path: { project_id: path["project_id"] },
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
					await updateProject({ ...getApiConfig(token), ...request }),
					"/v1/projects/{project_id}",
				),
		};
	},
);
