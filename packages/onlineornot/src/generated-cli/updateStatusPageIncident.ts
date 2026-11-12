import { updateStatusPageIncident } from "@onlineornot/api";
import {
	zUpdateStatusPageIncidentPath,
	zUpdateStatusPageIncidentHeaders,
	zUpdateStatusPageIncidentBody,
} from "@onlineornot/api/zod";

import { getApiConfig, unwrapApiEnvelope } from "../api/infrastructure";
import { createApiCommand } from "../command-runtime/api-command";

export const command = createApiCommand(
	{
		operationId: "updateStatusPageIncident",
		command: "onlineornot status-pages incidents update",
		words: ["status-pages", "incidents", "update"],
		description: "Update an incident",
		method: "PATCH",
		path: "/v1/status_pages/{status_page_id}/incidents/{status_page_incident_id}",
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
				name: "id",
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
				name: "impact",
				wireName: "impact",
				location: "body",
				type: "string",
				array: false,
				choices: [
					"MAJOR_OUTAGE",
					"PARTIAL_OUTAGE",
					"DEGRADED_PERFORMANCE",
					"NO_IMPACT",
					"MAINTENANCE",
				],
				required: true,
				positional: false,
				description: "Impact of the incident",
				sensitive: false,
			},
		],
	},
	(input) => {
		const path = zUpdateStatusPageIncidentPath.strict().parse(input.path);
		const headers = zUpdateStatusPageIncidentHeaders
			.strict()
			.parse(input.headers);
		const body = zUpdateStatusPageIncidentBody.strict().parse(input.body);
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
			body: { title: body["title"], impact: body["impact"] },
		};
		return {
			request,
			execute: async (token) =>
				unwrapApiEnvelope(
					await updateStatusPageIncident({
						...getApiConfig(token),
						...request,
					}),
					"/v1/status_pages/{status_page_id}/incidents/{status_page_incident_id}",
				),
		};
	},
);
