import { createStatusPageIncidentUpdate } from "@onlineornot/api";
import {
	zCreateStatusPageIncidentUpdatePath,
	zCreateStatusPageIncidentUpdateHeaders,
	zCreateStatusPageIncidentUpdateBody,
} from "@onlineornot/api/zod";

import { getApiConfig, unwrapApiEnvelope } from "../api/infrastructure";
import { createApiCommand } from "../command-runtime/api-command";

export const command = createApiCommand(
	{
		operationId: "createStatusPageIncidentUpdate",
		command: "onlineornot status-pages incidents updates create",
		words: ["status-pages", "incidents", "updates", "create"],
		description: "Create a new update for an incident",
		method: "POST",
		path: "/v1/status_pages/{status_page_id}/incidents/{status_page_incident_id}/updates",
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
				name: "incident-id",
				wireName: "status_page_incident_id",
				location: "path",
				type: "string",
				array: false,
				required: true,
				positional: true,
				description: "Status Page Incident ID",
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
					"SCHEDULED",
					"IN_PROGRESS",
					"VERIFYING",
					"COMPLETED",
				],
				required: true,
				positional: false,
				description: "Status for this update",
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
				description: "Update message",
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
			{
				name: "components-affected",
				wireName: "components_affected",
				location: "body",
				type: "json",
				array: false,
				required: false,
				positional: false,
				description: "Components affected by this update with their new status",
				sensitive: false,
			},
			{
				name: "date-happened",
				wireName: "date_happened",
				location: "body",
				type: "string",
				array: false,
				required: false,
				positional: false,
				description: "When this update occurred (defaults to now)",
				sensitive: false,
			},
		],
	},
	(input) => {
		const path = zCreateStatusPageIncidentUpdatePath.strict().parse(input.path);
		const headers = zCreateStatusPageIncidentUpdateHeaders
			.strict()
			.parse(input.headers);
		const body = zCreateStatusPageIncidentUpdateBody.strict().parse(input.body);
		const request = {
			path: {
				status_page_id: path["status_page_id"],
				status_page_incident_id: path["status_page_incident_id"],
			},
			headers: {
				"X-OnlineOrNot-Organisation":
					input.headers?.["X-OnlineOrNot-Organisation"] === undefined
						? undefined
						: headers["X-OnlineOrNot-Organisation"],
			},
			body: {
				status: body["status"],
				description: body["description"],
				notify_subscribers:
					input.body?.["notify_subscribers"] === undefined
						? undefined
						: body["notify_subscribers"],
				components_affected:
					input.body?.["components_affected"] === undefined
						? undefined
						: body["components_affected"],
				date_happened:
					input.body?.["date_happened"] === undefined
						? undefined
						: body["date_happened"],
			},
		};
		return {
			request,
			execute: async (token) =>
				unwrapApiEnvelope(
					await createStatusPageIncidentUpdate({
						...getApiConfig(token),
						...request,
					}),
					"/v1/status_pages/{status_page_id}/incidents/{status_page_incident_id}/updates",
				),
		};
	},
);
