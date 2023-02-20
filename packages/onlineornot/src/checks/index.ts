import { printBanner } from "../banner";
import { fetchResult } from "../fetch";
import { logger } from "../logger";
import { CommonYargsArgv, StrictYargsOptionsToInterface } from "../yargs-types";

interface Check {
	id: string;
	name: string;
	url: string;
	status: string;
	lastQueued: string;
}
export function checksOptions(yargs: CommonYargsArgv) {
	return yargs.option("json", {
		describe: "Return output as JSON",
		type: "boolean",
		default: false,
	});
}
export async function checksHandler(
	args: StrictYargsOptionsToInterface<typeof checksOptions>
) {
	const results = (await fetchResult("/checks")) as Check[];

	if (args.json) {
		logger.log(JSON.stringify(results, null, "  "));
	} else {
		await printBanner();
		logger.table(
			results.map((result) => ({
				"Check ID": result.id,
				Name: result.name,
				URL: result.url,
				Status: result.status,
				"Last queued": result.lastQueued,
			}))
		);
	}
}
