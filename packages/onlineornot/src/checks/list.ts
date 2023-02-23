import { printBanner } from "../banner";
import { fetchPagedResult } from "../fetch";
import { logger } from "../logger";
import { verifyToken } from "../user";
import type { Check } from "./types";
import type {
	CommonYargsArgv,
	StrictYargsOptionsToInterface,
} from "../yargs-types";

export function options(yargs: CommonYargsArgv) {
	return yargs.option("json", {
		describe: "Return output as JSON",
		type: "boolean",
		default: false,
	});
}
export async function handler(
	args: StrictYargsOptionsToInterface<typeof options>
) {
	await verifyToken();
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
