import { printBanner } from "../banner";
import { fetchResult } from "../fetch";
import { logger } from "../logger";
import { verifyToken } from "../user";
import type { Check, CreateCheckParams } from "./types";
import { VALID_METHODS, VALID_REGIONS } from "./types";
import type { CommonYargsArgv, StrictYargsOptionsToInterface } from "../yargs-types";

export function options(yargs: CommonYargsArgv) {
	return yargs
		.positional("name", {
			describe: "The name of your new uptime check",
			type: "string",
			demandOption: true,
		})
		.positional("url", {
			describe: "The URL of your new uptime check",
			type: "string",
			demandOption: true,
		})
		.option("json", {
			describe: "Return output as JSON",
			type: "boolean",
			default: false,
		})
		.option("text-to-search-for", {
			describe: "Text to search for in the response",
			type: "string",
		})
		.option("test-interval", {
			describe: "Interval in seconds between checks",
			type: "number",
		})
		.option("reminder-alert-interval-minutes", {
			describe: "Interval in minutes between reminders (-1 for never)",
			type: "number",
			default: 1440,
		})
		.option("test-regions", {
			describe: `Regions to run checks from. Valid: ${VALID_REGIONS.join(", ")}`,
			type: "array",
			string: true,
		})
		.option("confirmation-period-seconds", {
			describe: "Confirmation period in seconds",
			type: "number",
			default: 60,
		})
		.option("recovery-period-seconds", {
			describe: "Recovery period in seconds",
			type: "number",
			default: 180,
		})
		.option("timeout", {
			describe: "Timeout in milliseconds",
			type: "number",
			default: 10000,
		})
		.option("type", {
			describe: "Type of check",
			type: "string",
			choices: ["UPTIME_CHECK", "BROWSER_CHECK"] as const,
			default: "UPTIME_CHECK",
		})
		.option("alert-priority", {
			describe: "Alert Priority",
			type: "string",
			choices: ["LOW", "HIGH"] as const,
			default: "LOW",
		})
		.option("method", {
			describe: "HTTP Method",
			type: "string",
			choices: VALID_METHODS,
			default: "GET",
		})
		.option("body", {
			describe: "Request body (for POST/PUT/PATCH)",
			type: "string",
		})
		.option("header", {
			describe: "HTTP headers (format: 'Key: Value', can be specified multiple times)",
			type: "array",
			string: true,
		})
		.option("follow-redirects", {
			describe: "Whether to follow redirects",
			type: "boolean",
			default: true,
		})
		.option("verify-ssl", {
			describe: "Whether to fail a check if SSL verification fails",
			type: "boolean",
			default: false,
		})
		.option("auth-username", {
			describe: "Username for HTTP Basic Auth",
			type: "string",
		})
		.option("auth-password", {
			describe: "Password for HTTP Basic Auth",
			type: "string",
		})
		.option("version", {
			describe: "Version of the Browser Check",
			type: "string",
			choices: ["NODE20_PLAYWRIGHT"] as const,
		})
		.option("webhook-alerts", {
			describe: "IDs of webhooks to associate with this check",
			type: "array",
			string: true,
		})
		.option("oncall-alerts", {
			describe: "IDs of on-call integrations (Grafana, PagerDuty, Opsgenie, Spike)",
			type: "array",
			string: true,
		});
}

function parseHeaders(headerArgs?: string[]): Record<string, string> | undefined {
	if (!headerArgs || headerArgs.length === 0) return undefined;
	const headers: Record<string, string> = {};
	for (const header of headerArgs) {
		const colonIndex = header.indexOf(":");
		if (colonIndex === -1) {
			throw new Error(`Invalid header format: "${header}". Expected "Key: Value"`);
		}
		const key = header.slice(0, colonIndex).trim();
		const value = header.slice(colonIndex + 1).trim();
		headers[key] = value;
	}
	return headers;
}

export async function handler(args: StrictYargsOptionsToInterface<typeof options>) {
	if (!args.json) {
		await printBanner();
	}
	await verifyToken();

	const params: CreateCheckParams = {
		name: args.name,
		url: args.url,
	};

	if (args.textToSearchFor) params.text_to_search_for = args.textToSearchFor;
	if (args.testInterval) params.test_interval = args.testInterval;
	if (args.reminderAlertIntervalMinutes !== undefined)
		params.reminder_alert_interval_minutes = args.reminderAlertIntervalMinutes;
	if (args.testRegions) params.test_regions = args.testRegions;
	if (args.confirmationPeriodSeconds !== undefined)
		params.confirmation_period_seconds = args.confirmationPeriodSeconds;
	if (args.recoveryPeriodSeconds !== undefined)
		params.recovery_period_seconds = args.recoveryPeriodSeconds;
	if (args.timeout !== undefined) params.timeout = args.timeout;
	if (args.type) params.type = args.type as "UPTIME_CHECK" | "BROWSER_CHECK";
	if (args.alertPriority) params.alert_priority = args.alertPriority as "LOW" | "HIGH";
	if (args.method)
		params.method = args.method as "GET" | "HEAD" | "POST" | "PUT" | "PATCH" | "DELETE";
	if (args.body) params.body = args.body;
	if (args.header) params.headers = parseHeaders(args.header);
	if (args.followRedirects !== undefined) params.follow_redirects = args.followRedirects;
	if (args.verifySsl !== undefined) params.verify_ssl = args.verifySsl;
	if (args.authUsername) params.auth_username = args.authUsername;
	if (args.authPassword) params.auth_password = args.authPassword;
	if (args.version) params.version = args.version;
	if (args.webhookAlerts) params.webhook_alerts = args.webhookAlerts;
	if (args.oncallAlerts) params.oncall_alerts = args.oncallAlerts;

	let result: Check;
	try {
		result = await fetchResult(`/checks/`, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify(params),
		});
	} catch (err) {
		const errorWithCode = err as { code?: number; notes?: { text: string }[] };
		if (errorWithCode.code === 10004) {
			return logger.error(
				"You have reached the maximum number of checks for your account. Please upgrade to a paid plan to add more checks.",
			);
		} else if (errorWithCode.code === 10003) {
			//unauthorized
			return logger.error(
				"Your API token isn't allowed to create checks.\nPlease check your token with `onlineornot whoami` and try again.",
			);
		} else if (errorWithCode.code === 10000) {
			//validation error, need to check notes
			return logger.error("Validation error: " + errorWithCode?.notes?.[0].text);
		} else {
			return logger.error(err);
		}
	}

	if (args.json) {
		logger.log(JSON.stringify(result, null, "  "));
	} else {
		// Display all check fields in a readable format
		const formatArray = (arr: string[] | null): string =>
			arr && arr.length > 0 ? arr.join(", ") : "-";
		const formatValue = <T>(val: T | null): string =>
			val !== null && val !== undefined ? String(val) : "-";

		logger.log("Successfully created new check:");
		logger.log("");
		logger.log(`  Id:                      ${result.id}`);
		logger.log(`  Name:                    ${result.name}`);
		logger.log(`  URL:                     ${result.url}`);
		logger.log(`  Status:                  ${result.status}`);
		logger.log(`  Check type:              ${result.check_type}`);
		logger.log(`  Last queued:             ${formatValue(result.last_queued)}`);
		logger.log("");
		logger.log("Configuration:");
		logger.log(`  Test interval:           ${result.test_interval}s`);
		logger.log(`  Timeout:                 ${result.timeout}ms`);
		logger.log(`  Method:                  ${result.method}`);
		logger.log(`  Follow redirects:        ${result.follow_redirects}`);
		logger.log(`  Verify SSL:              ${result.verify_ssl}`);
		logger.log(`  Alert priority:          ${result.alert_priority}`);
		logger.log(`  Confirmation period:     ${result.confirmation_period_seconds}s`);
		logger.log(`  Recovery period:         ${result.recovery_period_seconds}s`);
		logger.log(
			`  Reminder interval:       ${result.reminder_alert_interval_minutes === -1 ? "Never" : `${result.reminder_alert_interval_minutes}m`}`,
		);
		logger.log(`  Regions:                 ${formatArray(result.test_regions)}`);
		logger.log("");
		logger.log("Request options:");
		logger.log(
			`  Headers:                 ${result.headers ? JSON.stringify(result.headers) : "-"}`,
		);
		logger.log(`  Body:                    ${formatValue(result.body)}`);
		logger.log(`  Text to search:          ${formatValue(result.text_to_search_for)}`);
		logger.log(
			`  Assertions:              ${result.assertions ? JSON.stringify(result.assertions) : "-"}`,
		);
		logger.log(`  Auth username:           ${formatValue(result.auth_username)}`);
		logger.log(`  Auth password:           ${result.auth_password ? "********" : "-"}`);
		logger.log(`  Version:                 ${formatValue(result.version)}`);
		logger.log("");
		logger.log("Notifications:");
		logger.log(`  User alerts:             ${formatArray(result.user_alerts)}`);
		logger.log(`  Slack alerts:            ${formatArray(result.slack_alerts)}`);
		logger.log(`  Discord alerts:          ${formatArray(result.discord_alerts)}`);
		logger.log(`  Teams alerts:            ${formatArray(result.microsoft_teams_alerts)}`);
		logger.log(`  Incident.io alerts:      ${formatArray(result.incident_io_alerts)}`);
		logger.log(`  On-call alerts:          ${formatArray(result.oncall_alerts)}`);
		logger.log(`  Webhook alerts:          ${formatArray(result.webhook_alerts)}`);
	}
}
