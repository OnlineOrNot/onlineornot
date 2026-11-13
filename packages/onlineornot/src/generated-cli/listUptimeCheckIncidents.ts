import { listUptimeCheckIncidents } from "@onlineornot/api";
import {
	zListUptimeCheckIncidentsPath,
	zListUptimeCheckIncidentsQuery,
	zListUptimeCheckIncidentsHeaders,
} from "@onlineornot/api/zod";

import { getApiConfig, unwrapApiEnvelope } from "../api/infrastructure";
import { createApiCommand } from "../command-runtime/api-command";

export const command = createApiCommand(
	{
		operationId: "listUptimeCheckIncidents",
		command: "onlineornot checks http incidents",
		words: ["checks", "http", "incidents"],
		description:
			"Review recent failures and recoveries for a specific uptime check",
		method: "GET",
		path: "/v1/checks/uptime/{check_id}/incidents",
		hasBody: false,
		requiresAuth: true,
		confirmation: false,
		flags: [
			{
				name: "id",
				wireName: "check_id",
				location: "path",
				type: "string",
				array: false,
				required: true,
				positional: true,
				description: "Public check ID",
				sensitive: false,
			},
			{
				name: "page",
				wireName: "page",
				location: "query",
				type: "number",
				array: false,
				required: false,
				positional: false,
				description: "Page number of paginated results",
				sensitive: false,
			},
			{
				name: "per-page",
				wireName: "per_page",
				location: "query",
				type: "number",
				array: false,
				required: false,
				positional: false,
				description: "Number of records per page, from 1 through 100",
				sensitive: false,
			},
			{
				name: "from",
				wireName: "from",
				location: "query",
				type: "string",
				array: false,
				required: false,
				positional: false,
				description: "Inclusive start of the requested time range",
				sensitive: false,
			},
			{
				name: "to",
				wireName: "to",
				location: "query",
				type: "string",
				array: false,
				required: false,
				positional: false,
				description:
					"Exclusive end of the requested time range. Must be later than from when both are provided.",
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
		const path = zListUptimeCheckIncidentsPath.strict().parse(input.path);
		const query = zListUptimeCheckIncidentsQuery.strict().parse(input.query);
		const headers = zListUptimeCheckIncidentsHeaders
			.strict()
			.parse(input.headers);
		const request = {
			path: { check_id: path["check_id"] },
			query: {
				page: input.query?.["page"] === undefined ? undefined : query["page"],
				per_page:
					input.query?.["per_page"] === undefined
						? undefined
						: query["per_page"],
				from: input.query?.["from"] === undefined ? undefined : query["from"],
				to: input.query?.["to"] === undefined ? undefined : query["to"],
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
					await listUptimeCheckIncidents({
						...getApiConfig(token),
						...request,
					}),
					"/v1/checks/uptime/{check_id}/incidents",
				),
		};
	},
);
