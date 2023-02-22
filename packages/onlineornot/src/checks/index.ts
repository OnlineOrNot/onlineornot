import { printBanner } from "../banner";
import { fetchPagedResult } from "../fetch";
import { logger } from "../logger";
import type { Check } from "./types";
import type {
	CommonYargsArgv,
	StrictYargsOptionsToInterface,
} from "../yargs-types";

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
	const results = (await fetchPagedResult("/checks")) as Check[];

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
