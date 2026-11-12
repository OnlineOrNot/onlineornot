import { createTcpCheck } from "@onlineornot/api";
import {
	zCreateTcpCheckHeaders,
	zCreateTcpCheckBody,
} from "@onlineornot/api/zod";

import { getApiConfig, unwrapApiEnvelope } from "../api/infrastructure";
import { createApiCommand } from "../command-runtime/api-command";

export const command = createApiCommand(
	{
		operationId: "createTcpCheck",
		command: "onlineornot checks tcp create",
		words: ["checks", "tcp", "create"],
		description: "Create a TCP check",
		method: "POST",
		path: "/v1/checks/tcp",
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
				name: "hostname",
				wireName: "tcp_hostname",
				location: "body",
				type: "string",
				array: false,
				required: true,
				positional: false,
				description: "Publicly reachable hostname or IP address to connect to",
				sensitive: false,
			},
			{
				name: "port",
				wireName: "tcp_port",
				location: "body",
				type: "number",
				array: false,
				required: true,
				positional: false,
				description: "TCP port to connect to",
				sensitive: false,
			},
			{
				name: "ip-family",
				wireName: "tcp_ip_family",
				location: "body",
				type: "string",
				array: false,
				choices: ["IPv4", "IPv6"],
				required: false,
				positional: false,
				description:
					"IP family to use for DNS resolution and socket connection",
				sensitive: false,
			},
			{
				name: "data",
				wireName: "tcp_data",
				location: "body",
				type: "string",
				array: false,
				required: false,
				positional: false,
				description:
					"Optional TCP payload to send immediately after connecting",
				sensitive: true,
			},
			{
				name: "should-fail",
				wireName: "tcp_should_fail",
				location: "body",
				type: "boolean",
				array: false,
				required: false,
				positional: false,
				description:
					"Whether a failed TCP connection should be treated as passing",
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
				description: "TCP assertions to run on response time or response data",
				sensitive: false,
			},
		],
	},
	(input) => {
		const headers = zCreateTcpCheckHeaders.strict().parse(input.headers);
		const body = zCreateTcpCheckBody.strict().parse(input.body);
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
				type: input.body?.["type"] === undefined ? undefined : body["type"],
				tcp_hostname: body["tcp_hostname"],
				tcp_port: body["tcp_port"],
				tcp_ip_family:
					input.body?.["tcp_ip_family"] === undefined
						? undefined
						: body["tcp_ip_family"],
				tcp_data:
					input.body?.["tcp_data"] === undefined ? undefined : body["tcp_data"],
				tcp_should_fail:
					input.body?.["tcp_should_fail"] === undefined
						? undefined
						: body["tcp_should_fail"],
				assertions:
					input.body?.["assertions"] === undefined
						? undefined
						: body["assertions"],
			},
		};
		return {
			request,
			execute: async (token) =>
				unwrapApiEnvelope(
					await createTcpCheck({ ...getApiConfig(token), ...request }),
					"/v1/checks/tcp",
				),
		};
	},
);
