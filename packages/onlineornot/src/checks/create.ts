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
		});
}

export async function handler(
	args: StrictYargsOptionsToInterface<typeof options>
) {
	await verifyToken();
	const result = (await fetchResult(`/checks/`, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ name: args.name, url: args.url }),
	})) as Check;

	if (args.json) {
		logger.log(JSON.stringify(result, null, "  "));
	} else {
		await printBanner();
		logger.log("Successfully created new check:");
		logger.table([
			{
				"Check ID": result.id,
				Name: result.name,
				URL: result.url,
				Status: result.status ? result.status : "Pending",
				"Last queued": result.lastQueued
					? result.lastQueued
					: "Waiting to be queued",
			},
		]);
	}
}
