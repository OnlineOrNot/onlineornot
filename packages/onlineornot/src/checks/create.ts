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
	if (!args.json) {
		await printBanner();
	}
	let result: Check;
	try {
		result = await fetchResult(`/checks/`, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ name: args.name, url: args.url }),
		});
	} catch (err) {
		const errorWithCode = err as { code?: number; notes?: { text: string }[] };
		if (errorWithCode.code === 10004) {
			return logger.error(
				"You have reached the maximum number of checks for your account. Please upgrade to a paid plan to add more checks."
			);
		} else if (errorWithCode.code === 10003) {
			//unauthorized
			return logger.error(
				"Your API token isn't allowed to create checks.\nPlease check your token with `onlineornot whoami` and try again."
			);
		} else if (errorWithCode.code === 10000) {
			//validation error, need to check notes
			return logger.error(
				"Validation error: " + errorWithCode?.notes?.[0].text
			);
		} else {
			return logger.error(err);
		}
	}

	if (args.json) {
		logger.log(JSON.stringify(result, null, "  "));
	} else {
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
