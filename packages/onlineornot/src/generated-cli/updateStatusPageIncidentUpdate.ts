import { updateStatusPageIncidentUpdate } from "@onlineornot/api";
import {
	zUpdateStatusPageIncidentUpdatePath,
	zUpdateStatusPageIncidentUpdateHeaders,
	zUpdateStatusPageIncidentUpdateBody,
} from "@onlineornot/api/zod";

import { getApiConfig, unwrapApiEnvelope } from "../api/infrastructure";
import { createApiCommand } from "../command-runtime/api-command";

export const command = createApiCommand(
	{
		operationId: "updateStatusPageIncidentUpdate",
		command: "onlineornot status-pages incidents updates update",
		words: ["status-pages", "incidents", "updates", "update"],
		description: "Update an existing incident update",
		method: "PATCH",
		path: "/v1/status_pages/{status_page_id}/incidents/{status_page_incident_id}/updates/{incident_update_id}",
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
				name: "id",
				wireName: "incident_update_id",
				location: "path",
				type: "string",
				array: false,
				required: true,
				positional: true,
				description: "Incident Update ID",
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
				required: false,
				positional: false,
				description: "Updated status",
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
				description: "Updated message",
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
				description: "Updated timestamp",
				sensitive: false,
			},
		],
	},
	(input) => {
		const path = zUpdateStatusPageIncidentUpdatePath.strict().parse(input.path);
		const headers = zUpdateStatusPageIncidentUpdateHeaders
			.strict()
			.parse(input.headers);
		const body = zUpdateStatusPageIncidentUpdateBody.strict().parse(input.body);
		const request = {
			path: {
				status_page_id: path["status_page_id"],
				status_page_incident_id: path["status_page_incident_id"],
				incident_update_id: path["incident_update_id"],
			},
			headers: {
				"X-OnlineOrNot-Organisation":
					input.headers?.["X-OnlineOrNot-Organisation"] === undefined
						? undefined
						: headers["X-OnlineOrNot-Organisation"],
			},
			body: {
				status:
					input.body?.["status"] === undefined ? undefined : body["status"],
				description:
					input.body?.["description"] === undefined
						? undefined
						: body["description"],
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
					await updateStatusPageIncidentUpdate({
						...getApiConfig(token),
						...request,
					}),
					"/v1/status_pages/{status_page_id}/incidents/{status_page_incident_id}/updates/{incident_update_id}",
				),
		};
	},
);
