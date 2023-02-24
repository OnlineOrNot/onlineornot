import { printBanner } from "../banner";
import { fetchResult } from "../fetch";
import { logger } from "../logger";
import { verifyToken } from "../user";
import type {
	CommonYargsArgv,
	StrictYargsOptionsToInterface,
} from "../yargs-types";

export function options(yargs: CommonYargsArgv) {
	return yargs.positional("id", {
		describe: "The ID of the check you wish to delete",
		type: "string",
		demandOption: true,
	});
}

export async function handler(
	args: StrictYargsOptionsToInterface<typeof options>
) {
	await printBanner();
	await verifyToken();
	await fetchResult(`/checks/${args.id}`, {
		method: "DELETE",
	});
	logger.log(`Deleted check ${args.id}`);
}
