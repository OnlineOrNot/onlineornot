import { printBanner } from "../banner";
import { fetchResult } from "../fetch";
import { logger } from "../logger";
import { verifyToken } from "../user";
import type { Check } from "./types";
import type {
	CommonYargsArgv,
	StrictYargsOptionsToInterface,
} from "../yargs-types";

export function checkOptions(yargs: CommonYargsArgv) {
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
export async function checkHandler(
	args: StrictYargsOptionsToInterface<typeof checkOptions>
) {
	await verifyToken();
	const result = (await fetchResult(`/checks/${args.id}`)) as Check;

	if (args.json) {
		logger.log(JSON.stringify(result, null, "  "));
	} else {
		await printBanner();
		logger.table([
			{
				"Check ID": result.id,
				Name: result.name,
				URL: result.url,
				Status: result.status,
				"Last queued": result.lastQueued,
			},
		]);
	}
}
