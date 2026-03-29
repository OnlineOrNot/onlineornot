import { printBanner } from "../banner";
import { fetchResult } from "../fetch";
import { logger } from "../logger";
import { verifyToken } from "../user";
import type {
	CommonYargsArgv,
	StrictYargsOptionsToInterface,
} from "../yargs-types";

export function options(yargs: CommonYargsArgv) {
	return yargs
		.positional("id", {
			describe: "The ID of the check you wish to delete",
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

	try {
		await fetchResult(`/checks/${args.id}`, {
			method: "DELETE",
		});
	} catch (err) {
		const errorWithCode = err as { code?: number; notes?: { text: string }[] };
		if (errorWithCode.code === 10009 || errorWithCode.code === 10001) {
			// 10009 = NOT_FOUND, 10001 = ISSUE_FETCHING_DATA (legacy, also means not found)
			return logger.error(`Check "${args.id}" not found.`);
		} else if (errorWithCode.code === 10002 || errorWithCode.code === 10011) {
			// 10002 = UNAUTHENTICATED, 10011 = UNAUTHENTICATED_TOKEN
			return logger.error(
				"You are not authenticated.\nPlease check your token with `onlineornot whoami` and try again.",
			);
		} else if (errorWithCode.code === 10003 || errorWithCode.code === 10012) {
			// 10003 = UNAUTHORIZED, 10012 = INSUFFICIENT_PERMISSIONS
			return logger.error(
				"Your API token isn't allowed to delete checks.\nPlease check your token with `onlineornot whoami` and try again.",
			);
		} else {
			return logger.error(err);
		}
	}

	if (args.json) {
		logger.log(JSON.stringify({ id: args.id }, null, "  "));
	} else {
		logger.log(`Deleted check ${args.id}`);
	}
}
