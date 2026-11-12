import { getStatusPageIncidentUpdate } from "@onlineornot/api";
import {
	zGetStatusPageIncidentUpdatePath,
	zGetStatusPageIncidentUpdateHeaders,
} from "@onlineornot/api/zod";

import { getApiConfig, unwrapApiEnvelope } from "../api/infrastructure";
import { createApiCommand } from "../command-runtime/api-command";

export const command = createApiCommand(
	{
		operationId: "getStatusPageIncidentUpdate",
		command: "onlineornot status-pages incidents updates get",
		words: ["status-pages", "incidents", "updates", "get"],
		description: "Retrieve a single incident update",
		method: "GET",
		path: "/v1/status_pages/{status_page_id}/incidents/{status_page_incident_id}/updates/{incident_update_id}",
		hasBody: false,
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
		],
	},
	(input) => {
		const path = zGetStatusPageIncidentUpdatePath.strict().parse(input.path);
		const headers = zGetStatusPageIncidentUpdateHeaders
			.strict()
			.parse(input.headers);
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
		};
		return {
			request,
			execute: async (token) =>
				unwrapApiEnvelope(
					await getStatusPageIncidentUpdate({
						...getApiConfig(token),
						...request,
					}),
					"/v1/status_pages/{status_page_id}/incidents/{status_page_incident_id}/updates/{incident_update_id}",
				),
		};
	},
);
