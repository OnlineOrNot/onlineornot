import { createStatusPageIncident } from "@onlineornot/api";
import {
	zCreateStatusPageIncidentPath,
	zCreateStatusPageIncidentHeaders,
	zCreateStatusPageIncidentBody,
} from "@onlineornot/api/zod";

import { getApiConfig, unwrapApiEnvelope } from "../api/infrastructure";
import { createApiCommand } from "../command-runtime/api-command";

export const command = createApiCommand(
	{
		operationId: "createStatusPageIncident",
		command: "onlineornot status-pages incidents create",
		words: ["status-pages", "incidents", "create"],
		description: "Create an incident",
		method: "POST",
		path: "/v1/status_pages/{status_page_id}/incidents",
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
				name: "title",
				wireName: "title",
				location: "body",
				type: "string",
				array: false,
				required: true,
				positional: false,
				description: "a title for the incident",
				sensitive: false,
			},
			{
				name: "description",
				wireName: "description",
				location: "body",
				type: "string",
				array: false,
				required: true,
				positional: false,
				description: "a description of the incident",
				sensitive: false,
			},
			{
				name: "status",
				wireName: "status",
				location: "body",
				type: "string",
				array: false,
				choices: [
					"INVESTIGATING",
					"IDENTIFIED",
					"MONITORING",
					"RESOLVED",
					"UPDATE",
				],
				required: true,
				positional: false,
				description: "The current status of the incident",
				sensitive: false,
			},
			{
				name: "components",
				wireName: "components",
				location: "body",
				type: "json",
				array: false,
				required: false,
				positional: false,
				description: "Components affected by this incident with their status",
				sensitive: false,
			},
			{
				name: "notify-subscribers",
				wireName: "notify_subscribers",
				location: "body",
				type: "boolean",
				array: false,
				required: false,
				positional: false,
				description: "Whether to notify status page subscribers",
				sensitive: false,
			},
		],
	},
	(input) => {
		const path = zCreateStatusPageIncidentPath.strict().parse(input.path);
		const headers = zCreateStatusPageIncidentHeaders
			.strict()
			.parse(input.headers);
		const body = zCreateStatusPageIncidentBody.strict().parse(input.body);
		const request = {
			path: { status_page_id: path["status_page_id"] },
			headers: {
				"X-OnlineOrNot-Organisation":
					input.headers?.["X-OnlineOrNot-Organisation"] === undefined
						? undefined
						: headers["X-OnlineOrNot-Organisation"],
			},
			body: {
				title: body["title"],
				description: body["description"],
				status: body["status"],
				components:
					input.body?.["components"] === undefined
						? undefined
						: body["components"],
				notify_subscribers:
					input.body?.["notify_subscribers"] === undefined
						? undefined
						: body["notify_subscribers"],
			},
		};
		return {
			request,
			execute: async (token) =>
				unwrapApiEnvelope(
					await createStatusPageIncident({
						...getApiConfig(token),
						...request,
					}),
					"/v1/status_pages/{status_page_id}/incidents",
				),
		};
	},
);
