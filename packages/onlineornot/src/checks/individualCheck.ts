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
	args: StrictYargsOptionsToInterface<typeof options>
) {
	if (!args.json) {
		await printBanner();
	}
	await verifyToken();
	const result = (await fetchResult(`/checks/${args.id}`)) as Check;

	if (args.json) {
		logger.log(JSON.stringify(result, null, "  "));
	} else {
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
