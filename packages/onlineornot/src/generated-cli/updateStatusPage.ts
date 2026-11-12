import { updateStatusPage } from "@onlineornot/api";
import {
	zUpdateStatusPagePath,
	zUpdateStatusPageHeaders,
	zUpdateStatusPageBody,
} from "@onlineornot/api/zod";

import { getApiConfig, unwrapApiEnvelope } from "../api/infrastructure";
import { createApiCommand } from "../command-runtime/api-command";

export const command = createApiCommand(
	{
		operationId: "updateStatusPage",
		command: "onlineornot status-pages update",
		words: ["status-pages", "update"],
		description: "Update a status page",
		method: "POST",
		path: "/v1/status_pages/{status_page_id}",
		hasBody: true,
		requiresAuth: true,
		confirmation: false,
		flags: [
			{
				name: "id",
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
				name: "favicon",
				wireName: "favicon",
				location: "body",
				type: "string",
				array: false,
				required: false,
				positional: false,
				description:
					"Image file contents as a base64 data URL, not a hosted URL. Supports PNG, JPEG, GIF, WebP, SVG and ICO; maximum decoded file size 10 MB. Omit to preserve the image; send null to remove it.",
				sensitive: false,
			},
			{
				name: "logo",
				wireName: "logo",
				location: "body",
				type: "string",
				array: false,
				required: false,
				positional: false,
				description:
					"Image file contents as a base64 data URL, not a hosted URL. Supports PNG, JPEG, GIF, WebP, SVG and ICO; maximum decoded file size 10 MB. Omit to preserve the image; send null to remove it.",
				sensitive: false,
			},
			{
				name: "dark-logo",
				wireName: "dark_logo",
				location: "body",
				type: "string",
				array: false,
				required: false,
				positional: false,
				description:
					"Image file contents as a base64 data URL, not a hosted URL. Supports PNG, JPEG, GIF, WebP, SVG and ICO; maximum decoded file size 10 MB. Omit to preserve the image; send null to remove it.",
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
				description: "name",
				sensitive: false,
			},
			{
				name: "subdomain",
				wireName: "subdomain",
				location: "body",
				type: "string",
				array: false,
				required: true,
				positional: false,
				description:
					'The subdomain your status page will be hosted at. For example "status" would become "status.onlineornot.com"',
				sensitive: false,
			},
			{
				name: "custom-domain",
				wireName: "custom_domain",
				location: "body",
				type: "string",
				array: false,
				required: false,
				positional: false,
				description:
					"The custom domain URL. On update, send null to remove the existing custom domain.",
				sensitive: false,
			},
			{
				name: "password",
				wireName: "password",
				location: "body",
				type: "string",
				array: false,
				required: false,
				positional: false,
				description:
					"Password protection. Send null or an empty string to remove it; omit to leave it unchanged.",
				sensitive: true,
			},
			{
				name: "description",
				wireName: "description",
				location: "body",
				type: "string",
				array: false,
				required: false,
				positional: false,
				description: "description",
				sensitive: false,
			},
			{
				name: "hide-from-search-engines",
				wireName: "hide_from_search_engines",
				location: "body",
				type: "boolean",
				array: false,
				required: false,
				positional: false,
				description: "Whether to hide the status page from search engines",
				sensitive: false,
			},
			{
				name: "allowed-ips",
				wireName: "allowed_ips",
				location: "body",
				type: "string",
				array: true,
				required: false,
				positional: false,
				description:
					"List of IP addresses or CIDR ranges allowed to access this status page",
				sensitive: false,
			},
		],
	},
	(input) => {
		const path = zUpdateStatusPagePath.strict().parse(input.path);
		const headers = zUpdateStatusPageHeaders.strict().parse(input.headers);
		const body = zUpdateStatusPageBody.strict().parse(input.body);
		const request = {
			path: { status_page_id: path["status_page_id"] },
			headers: {
				"X-OnlineOrNot-Organisation":
					input.headers?.["X-OnlineOrNot-Organisation"] === undefined
						? undefined
						: headers["X-OnlineOrNot-Organisation"],
			},
			body: {
				favicon:
					input.body?.["favicon"] === undefined ? undefined : body["favicon"],
				logo: input.body?.["logo"] === undefined ? undefined : body["logo"],
				dark_logo:
					input.body?.["dark_logo"] === undefined
						? undefined
						: body["dark_logo"],
				name: body["name"],
				subdomain: body["subdomain"],
				custom_domain:
					input.body?.["custom_domain"] === undefined
						? undefined
						: body["custom_domain"],
				password:
					input.body?.["password"] === undefined ? undefined : body["password"],
				description:
					input.body?.["description"] === undefined
						? undefined
						: body["description"],
				hide_from_search_engines:
					input.body?.["hide_from_search_engines"] === undefined
						? undefined
						: body["hide_from_search_engines"],
				allowed_ips:
					input.body?.["allowed_ips"] === undefined
						? undefined
						: body["allowed_ips"],
			},
		};
		return {
			request,
			execute: async (token) =>
				unwrapApiEnvelope(
					await updateStatusPage({ ...getApiConfig(token), ...request }),
					"/v1/status_pages/{status_page_id}",
				),
		};
	},
);
