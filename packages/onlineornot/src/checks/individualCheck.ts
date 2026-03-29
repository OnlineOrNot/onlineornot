import { printBanner } from "../banner";
import { fetchResult } from "../fetch";
import { logger } from "../logger";
import { verifyToken } from "../user";
import type { Check } from "./types";
import type {
	CommonYargsArgv,
	StrictYargsOptionsToInterface,
} from "../yargs-types";

export function options(yargs: CommonYargsArgv) {
	return yargs
		.positional("id", {
			describe: "The ID of the check you wish to fetch",
			type: "string",
			demandOption: true,
		})
		.option("json", {
			describe: "Return output as JSON",
			type: "boolean",
			default: false,
		});
}

export async function handler(
	args: StrictYargsOptionsToInterface<typeof options>,
) {
	if (!args.json) {
		await printBanner();
	}
	await verifyToken();
	const result = (await fetchResult(`/checks/${args.id}`)) as Check;

	if (args.json) {
		logger.log(JSON.stringify(result, null, "  "));
	} else {
		// Display all check fields in a readable format
		const formatArray = (arr: string[] | null): string =>
			arr && arr.length > 0 ? arr.join(", ") : "-";
		const formatValue = <T>(val: T | null): string =>
			val !== null && val !== undefined ? String(val) : "-";

		logger.log("Check details:");
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
		logger.log(
			`  Confirmation period:     ${result.confirmation_period_seconds}s`,
		);
		logger.log(`  Recovery period:         ${result.recovery_period_seconds}s`);
		logger.log(
			`  Reminder interval:       ${result.reminder_alert_interval_minutes === -1 ? "Never" : `${result.reminder_alert_interval_minutes}m`}`,
		);
		logger.log(
			`  Regions:                 ${formatArray(result.test_regions)}`,
		);
		logger.log("");
		logger.log("Request options:");
		logger.log(
			`  Headers:                 ${result.headers ? JSON.stringify(result.headers) : "-"}`,
		);
		logger.log(`  Body:                    ${formatValue(result.body)}`);
		logger.log(
			`  Text to search:          ${formatValue(result.text_to_search_for)}`,
		);
		logger.log(
			`  Assertions:              ${result.assertions ? JSON.stringify(result.assertions) : "-"}`,
		);
		logger.log(
			`  Auth username:           ${formatValue(result.auth_username)}`,
		);
		logger.log(
			`  Auth password:           ${result.auth_password ? "********" : "-"}`,
		);
		logger.log(`  Version:                 ${formatValue(result.version)}`);
		logger.log("");
		logger.log("Notifications:");
		logger.log(`  User alerts:             ${formatArray(result.user_alerts)}`);
		logger.log(
			`  Slack alerts:            ${formatArray(result.slack_alerts)}`,
		);
		logger.log(
			`  Discord alerts:          ${formatArray(result.discord_alerts)}`,
		);
		logger.log(
			`  Teams alerts:            ${formatArray(result.microsoft_teams_alerts)}`,
		);
		logger.log(
			`  Incident.io alerts:      ${formatArray(result.incident_io_alerts)}`,
		);
		logger.log(
			`  On-call alerts:          ${formatArray(result.oncall_alerts)}`,
		);
		logger.log(
			`  Webhook alerts:          ${formatArray(result.webhook_alerts)}`,
		);
	}
}
