import { updateHeartbeat } from "@onlineornot/api";
import {
	zUpdateHeartbeatPath,
	zUpdateHeartbeatHeaders,
	zUpdateHeartbeatBody,
} from "@onlineornot/api/zod";

import { getApiConfig, unwrapApiEnvelope } from "../api/infrastructure";
import { createApiCommand } from "../command-runtime/api-command";

export const command = createApiCommand(
	{
		operationId: "updateHeartbeat",
		command: "onlineornot heartbeats update",
		words: ["heartbeats", "update"],
		description: "Update a heartbeat.",
		method: "PATCH",
		path: "/v1/heartbeats/{heartbeat_id}",
		hasBody: true,
		confirmation: false,
		flags: [
			{
				name: "id",
				wireName: "heartbeat_id",
				location: "path",
				type: "string",
				array: false,
				required: true,
				positional: true,
				description: "Heartbeat ID",
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
				name: "name",
				wireName: "name",
				location: "body",
				type: "string",
				array: false,
				required: false,
				positional: false,
				description: "name",
				sensitive: false,
			},
			{
				name: "report-period",
				wireName: "report_period",
				location: "body",
				type: "number",
				array: false,
				required: false,
				positional: false,
				description:
					"Expected interval in seconds between heartbeat pings (for simple schedule)",
				sensitive: false,
			},
			{
				name: "report-period-cron",
				wireName: "report_period_cron",
				location: "body",
				type: "string",
				array: false,
				required: false,
				positional: false,
				description: "Cron expression for expected heartbeat schedule",
				sensitive: false,
			},
			{
				name: "timezone",
				wireName: "timezone",
				location: "body",
				type: "string",
				array: false,
				required: false,
				positional: false,
				description: "Timezone for cron schedule",
				sensitive: false,
			},
			{
				name: "grace-period",
				wireName: "grace_period",
				location: "body",
				type: "number",
				array: false,
				required: false,
				positional: false,
				description:
					"Grace period in seconds to wait after missed heartbeat before alerting",
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
				description:
					"Interval in minutes between reminder alerts (-1 for never)",
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
				description: "User IDs to notify",
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
				description: "Slack integration IDs to notify",
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
				description: "Discord integration IDs to notify",
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
				description: "IDs of webhooks to associate with this heartbeat",
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
				name: "incident-io-alerts",
				wireName: "incident_io_alerts",
				location: "body",
				type: "string",
				array: true,
				required: false,
				positional: false,
				description: "incident.io integration IDs to notify",
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
				description: "Microsoft Teams integration IDs to notify",
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
				description: "Telegram integration IDs to notify",
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
				description: "Pushover integration IDs to notify",
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
				name: "paused",
				wireName: "paused",
				location: "body",
				type: "boolean",
				array: false,
				required: false,
				positional: false,
				description: "Whether the heartbeat is paused",
				sensitive: false,
			},
			{
				name: "muted",
				wireName: "muted",
				location: "body",
				type: "boolean",
				array: false,
				required: false,
				positional: false,
				description: "Suppresses alerts without stopping heartbeat monitoring.",
				sensitive: false,
			},
		],
	},
	(input) => {
		const path = zUpdateHeartbeatPath.strict().parse(input.path);
		const headers = zUpdateHeartbeatHeaders.strict().parse(input.headers);
		const body = zUpdateHeartbeatBody
			.omit({ project_id: true })
			.strict()
			.parse(input.body);
		const request = {
			path: { heartbeat_id: path["heartbeat_id"] },
			headers: {
				"X-OnlineOrNot-Organisation":
					input.headers?.["X-OnlineOrNot-Organisation"] === undefined
						? undefined
						: headers["X-OnlineOrNot-Organisation"],
			},
			body: {
				name: input.body?.["name"] === undefined ? undefined : body["name"],
				report_period:
					input.body?.["report_period"] === undefined
						? undefined
						: body["report_period"],
				report_period_cron:
					input.body?.["report_period_cron"] === undefined
						? undefined
						: body["report_period_cron"],
				timezone:
					input.body?.["timezone"] === undefined ? undefined : body["timezone"],
				grace_period:
					input.body?.["grace_period"] === undefined
						? undefined
						: body["grace_period"],
				reminder_alert_interval_minutes:
					input.body?.["reminder_alert_interval_minutes"] === undefined
						? undefined
						: body["reminder_alert_interval_minutes"],
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
				webhook_alerts:
					input.body?.["webhook_alerts"] === undefined
						? undefined
						: body["webhook_alerts"],
				oncall_alerts:
					input.body?.["oncall_alerts"] === undefined
						? undefined
						: body["oncall_alerts"],
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
				alert_priority:
					input.body?.["alert_priority"] === undefined
						? undefined
						: body["alert_priority"],
				paused:
					input.body?.["paused"] === undefined ? undefined : body["paused"],
				muted: input.body?.["muted"] === undefined ? undefined : body["muted"],
			},
		};
		return {
			request,
			execute: async (token) =>
				unwrapApiEnvelope(
					await updateHeartbeat({ ...getApiConfig(token), ...request }),
					"/v1/heartbeats/{heartbeat_id}",
				),
		};
	},
);
