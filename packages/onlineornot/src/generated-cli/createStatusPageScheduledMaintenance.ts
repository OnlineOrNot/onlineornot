import { createStatusPageScheduledMaintenance } from "@onlineornot/api";
import {
	zCreateStatusPageScheduledMaintenancePath,
	zCreateStatusPageScheduledMaintenanceHeaders,
	zCreateStatusPageScheduledMaintenanceBody,
} from "@onlineornot/api/zod";

import { getApiConfig, unwrapApiEnvelope } from "../api/infrastructure";
import {
	createApiCommand,
	hasCommandInputField,
} from "../command-runtime/api-command";

export const command = createApiCommand(
	{
		operationId: "createStatusPageScheduledMaintenance",
		command: "onlineornot status-pages scheduled-maintenance create",
		words: ["status-pages", "scheduled-maintenance", "create"],
		description: "Schedule maintenance for a status page",
		method: "POST",
		path: "/v1/status_pages/{status_page_id}/scheduled_maintenance",
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
				description: "Title of the scheduled maintenance",
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
				description: "Description of the scheduled maintenance",
				sensitive: false,
			},
			{
				name: "start-date",
				wireName: "start_date",
				location: "body",
				type: "string",
				array: false,
				required: true,
				positional: false,
				description:
					"When the scheduled maintenance is expected to start (ISO 8601)",
				sensitive: false,
			},
			{
				name: "duration-minutes",
				wireName: "duration_minutes",
				location: "body",
				type: "number",
				array: false,
				required: true,
				positional: false,
				description:
					"How long (in minutes) the maintenance is expected to last",
				sensitive: false,
			},
			{
				name: "components-affected",
				wireName: "components_affected",
				location: "body",
				type: "string",
				array: true,
				required: false,
				positional: false,
				description: "Component IDs affected by this maintenance",
				sensitive: false,
			},
			{
				name: "notifications",
				wireName: "notifications",
				location: "body",
				type: "json",
				array: false,
				required: false,
				positional: false,
				description: "Notification settings for subscribers",
				sensitive: false,
			},
		],
	},
	(input) => {
		const path = zCreateStatusPageScheduledMaintenancePath
			.strict()
			.parse(input.path);
		const headers = zCreateStatusPageScheduledMaintenanceHeaders
			.strict()
			.parse(input.headers);
		const body = zCreateStatusPageScheduledMaintenanceBody
			.strict()
			.parse(input.body);
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
				start_date: body["start_date"],
				duration_minutes: body["duration_minutes"],
				components_affected:
					input.body?.["components_affected"] === undefined
						? undefined
						: body["components_affected"],
				notifications:
					input.body?.["notifications"] === undefined
						? undefined
						: {
								an_hour_before: !hasCommandInputField(input.body, [
									"notifications",
									"an_hour_before",
								])
									? undefined
									: body["notifications"]?.["an_hour_before"],
								at_start: !hasCommandInputField(input.body, [
									"notifications",
									"at_start",
								])
									? undefined
									: body["notifications"]?.["at_start"],
								at_end: !hasCommandInputField(input.body, [
									"notifications",
									"at_end",
								])
									? undefined
									: body["notifications"]?.["at_end"],
							},
			},
		};
		return {
			request,
			execute: async (token) =>
				unwrapApiEnvelope(
					await createStatusPageScheduledMaintenance({
						...getApiConfig(token),
						...request,
					}),
					"/v1/status_pages/{status_page_id}/scheduled_maintenance",
				),
		};
	},
);
