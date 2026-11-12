import { createUptimeCheck } from "@onlineornot/api";
import {
	zCreateUptimeCheckHeaders,
	zCreateUptimeCheckBody,
} from "@onlineornot/api/zod";

import { getApiConfig, unwrapApiEnvelope } from "../api/infrastructure";
import { createApiCommand } from "../command-runtime/api-command";

export const command = createApiCommand(
	{
		operationId: "createUptimeCheck",
		command: "onlineornot checks http create",
		words: ["checks", "http", "create"],
		description: "Create an uptime check",
		method: "POST",
		path: "/v1/checks/uptime",
		hasBody: true,
		requiresAuth: true,
		confirmation: false,
		flags: [
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
				name: "project-id",
				wireName: "project_id",
				location: "body",
				type: "string",
				array: false,
				required: false,
				positional: false,
				description:
					"Project ID. Omit or use null to leave the resource unassigned.",
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
				name: "test-interval",
				wireName: "test_interval",
				location: "body",
				type: "number",
				array: false,
				required: false,
				positional: false,
				description: "Interval in seconds between checks",
				sensitive: false,
			},
			{
				name: "test-regions",
				wireName: "test_regions",
				location: "body",
				type: "string",
				array: true,
				required: false,
				positional: false,
				description:
					"Regions to run checks from. Valid regions: aws:us-east-1, aws:us-east-2, aws:us-west-1, aws:eu-central-1, aws:eu-west-2, aws:ap-south-1, aws:ap-southeast-2, aws:ap-northeast-1",
				sensitive: false,
			},
			{
				name: "user-alerts",
				wireName: "user_alerts",
				location: "body",
				type: "string",
				array: true,
				required: false,
				positional: false,
				description: "user_alerts",
				sensitive: false,
			},
			{
				name: "slack-alerts",
				wireName: "slack_alerts",
				location: "body",
				type: "string",
				array: true,
				required: false,
				positional: false,
				description: "slack_alerts",
				sensitive: false,
			},
			{
				name: "discord-alerts",
				wireName: "discord_alerts",
				location: "body",
				type: "string",
				array: true,
				required: false,
				positional: false,
				description: "discord_alerts",
				sensitive: false,
			},
			{
				name: "incident-io-alerts",
				wireName: "incident_io_alerts",
				location: "body",
				type: "string",
				array: true,
				required: false,
				positional: false,
				description: "incident_io_alerts",
				sensitive: false,
			},
			{
				name: "microsoft-teams-alerts",
				wireName: "microsoft_teams_alerts",
				location: "body",
				type: "string",
				array: true,
				required: false,
				positional: false,
				description: "microsoft_teams_alerts",
				sensitive: false,
			},
			{
				name: "telegram-alerts",
				wireName: "telegram_alerts",
				location: "body",
				type: "string",
				array: true,
				required: false,
				positional: false,
				description: "telegram_alerts",
				sensitive: false,
			},
			{
				name: "pushover-alerts",
				wireName: "pushover_alerts",
				location: "body",
				type: "string",
				array: true,
				required: false,
				positional: false,
				description: "pushover_alerts",
				sensitive: false,
			},
			{
				name: "webhook-alerts",
				wireName: "webhook_alerts",
				location: "body",
				type: "string",
				array: true,
				required: false,
				positional: false,
				description: "IDs of webhooks to associate with this check",
				sensitive: false,
			},
			{
				name: "oncall-alerts",
				wireName: "oncall_alerts",
				location: "body",
				type: "string",
				array: true,
				required: false,
				positional: false,
				description:
					"IDs of on-call integrations (Grafana, PagerDuty, Opsgenie, Spike)",
				sensitive: false,
			},
			{
				name: "alert-priority",
				wireName: "alert_priority",
				location: "body",
				type: "string",
				array: false,
				choices: ["LOW", "HIGH"],
				required: false,
				positional: false,
				description:
					"[Alert priority](https://onlineornot.com/docs/how-to/alerts/configure-priority).",
				sensitive: false,
			},
			{
				name: "confirmation-period-seconds",
				wireName: "confirmation_period_seconds",
				location: "body",
				type: "number",
				array: false,
				required: false,
				positional: false,
				description:
					"Seconds before confirming [downtime](https://onlineornot.com/docs/explanation/confirmation-recovery-periods#confirmation-period).",
				sensitive: false,
			},
			{
				name: "recovery-period-seconds",
				wireName: "recovery_period_seconds",
				location: "body",
				type: "number",
				array: false,
				required: false,
				positional: false,
				description:
					"Seconds before confirming [recovery](https://onlineornot.com/docs/explanation/confirmation-recovery-periods#recovery-period).",
				sensitive: false,
			},
			{
				name: "reminder-alert-interval-minutes",
				wireName: "reminder_alert_interval_minutes",
				location: "body",
				type: "number",
				array: false,
				required: false,
				positional: false,
				description: "Interval in minutes between reminders (-1 for never)",
				sensitive: false,
			},
			{
				name: "timeout",
				wireName: "timeout",
				location: "body",
				type: "number",
				array: false,
				required: false,
				positional: false,
				description: "Timeout in milliseconds",
				sensitive: false,
			},
			{
				name: "url",
				wireName: "url",
				location: "body",
				type: "string",
				array: false,
				required: true,
				positional: false,
				description: "URL to check.",
				sensitive: false,
			},
			{
				name: "text-to-search-for",
				wireName: "text_to_search_for",
				location: "body",
				type: "string",
				array: false,
				required: false,
				positional: false,
				description: "Text to search for in the response",
				sensitive: false,
			},
			{
				name: "headers",
				wireName: "headers",
				location: "body",
				type: "json",
				array: false,
				required: false,
				positional: false,
				description:
					'Headers to send. Uptime checks support environment variable references such as {{API_TOKEN}}. Terraform example: Authorization = "Bearer {{API_TOKEN}}". Terraform stores the template; create the referenced variable separately.',
				sensitive: true,
			},
			{
				name: "method",
				wireName: "method",
				location: "body",
				type: "string",
				array: false,
				choices: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE"],
				required: false,
				positional: false,
				description: "HTTP Method",
				sensitive: false,
			},
			{
				name: "http-body",
				wireName: "body",
				location: "body",
				type: "string",
				array: false,
				required: false,
				positional: false,
				description: "body",
				sensitive: true,
			},
			{
				name: "follow-redirects",
				wireName: "follow_redirects",
				location: "body",
				type: "boolean",
				array: false,
				required: false,
				positional: false,
				description: "follow_redirects",
				sensitive: false,
			},
			{
				name: "assertions",
				wireName: "assertions",
				location: "body",
				type: "json",
				array: false,
				required: false,
				positional: false,
				description: "Assertions to run on the response",
				sensitive: false,
			},
			{
				name: "verify-ssl",
				wireName: "verify_ssl",
				location: "body",
				type: "boolean",
				array: false,
				required: false,
				positional: false,
				description: "Whether to fail a check if SSL verification fails",
				sensitive: false,
			},
			{
				name: "auth-username",
				wireName: "auth_username",
				location: "body",
				type: "string",
				array: false,
				required: false,
				positional: false,
				description:
					"Username to use for URLs behind HTTP Basic Auth. Uptime checks with environment variables can use {{NAME}} references; an empty string represents an empty user-id.",
				sensitive: true,
			},
			{
				name: "auth-password",
				wireName: "auth_password",
				location: "body",
				type: "string",
				array: false,
				required: false,
				positional: false,
				description:
					"Password to use for URLs behind HTTP Basic Auth. Uptime checks with environment variables can use {{NAME}} references; empty strings are preserved.",
				sensitive: true,
			},
		],
	},
	(input) => {
		const headers = zCreateUptimeCheckHeaders.strict().parse(input.headers);
		const body = zCreateUptimeCheckBody.strict().parse(input.body);
		const request = {
			headers: {
				"X-OnlineOrNot-Organisation":
					input.headers?.["X-OnlineOrNot-Organisation"] === undefined
						? undefined
						: headers["X-OnlineOrNot-Organisation"],
			},
			body: {
				project_id:
					input.body?.["project_id"] === undefined
						? undefined
						: body["project_id"],
				name: body["name"],
				test_interval:
					input.body?.["test_interval"] === undefined
						? undefined
						: body["test_interval"],
				test_regions:
					input.body?.["test_regions"] === undefined
						? undefined
						: body["test_regions"],
				user_alerts:
					input.body?.["user_alerts"] === undefined
						? undefined
						: body["user_alerts"],
				slack_alerts:
					input.body?.["slack_alerts"] === undefined
						? undefined
						: body["slack_alerts"],
				discord_alerts:
					input.body?.["discord_alerts"] === undefined
						? undefined
						: body["discord_alerts"],
				incident_io_alerts:
					input.body?.["incident_io_alerts"] === undefined
						? undefined
						: body["incident_io_alerts"],
				microsoft_teams_alerts:
					input.body?.["microsoft_teams_alerts"] === undefined
						? undefined
						: body["microsoft_teams_alerts"],
				telegram_alerts:
					input.body?.["telegram_alerts"] === undefined
						? undefined
						: body["telegram_alerts"],
				pushover_alerts:
					input.body?.["pushover_alerts"] === undefined
						? undefined
						: body["pushover_alerts"],
				webhook_alerts:
					input.body?.["webhook_alerts"] === undefined
						? undefined
						: body["webhook_alerts"],
				oncall_alerts:
					input.body?.["oncall_alerts"] === undefined
						? undefined
						: body["oncall_alerts"],
				alert_priority:
					input.body?.["alert_priority"] === undefined
						? undefined
						: body["alert_priority"],
				confirmation_period_seconds:
					input.body?.["confirmation_period_seconds"] === undefined
						? undefined
						: body["confirmation_period_seconds"],
				recovery_period_seconds:
					input.body?.["recovery_period_seconds"] === undefined
						? undefined
						: body["recovery_period_seconds"],
				reminder_alert_interval_minutes:
					input.body?.["reminder_alert_interval_minutes"] === undefined
						? undefined
						: body["reminder_alert_interval_minutes"],
				timeout:
					input.body?.["timeout"] === undefined ? undefined : body["timeout"],
				url: body["url"],
				text_to_search_for:
					input.body?.["text_to_search_for"] === undefined
						? undefined
						: body["text_to_search_for"],
				type: input.body?.["type"] === undefined ? undefined : body["type"],
				headers:
					input.body?.["headers"] === undefined
						? undefined
						: { ...body["headers"] },
				method:
					input.body?.["method"] === undefined ? undefined : body["method"],
				body: input.body?.["body"] === undefined ? undefined : body["body"],
				follow_redirects:
					input.body?.["follow_redirects"] === undefined
						? undefined
						: body["follow_redirects"],
				assertions:
					input.body?.["assertions"] === undefined
						? undefined
						: body["assertions"],
				verify_ssl:
					input.body?.["verify_ssl"] === undefined
						? undefined
						: body["verify_ssl"],
				auth_username:
					input.body?.["auth_username"] === undefined
						? undefined
						: body["auth_username"],
				auth_password:
					input.body?.["auth_password"] === undefined
						? undefined
						: body["auth_password"],
			},
		};
		return {
			request,
			execute: async (token) =>
				unwrapApiEnvelope(
					await createUptimeCheck({ ...getApiConfig(token), ...request }),
					"/v1/checks/uptime",
				),
		};
	},
);
