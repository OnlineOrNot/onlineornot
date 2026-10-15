import { moveCheck } from "../api/checks";
import { logger } from "../logger";
import type {
	CommonYargsArgv,
	StrictYargsOptionsToInterface,
} from "../yargs-types";

export function options(yargs: CommonYargsArgv) {
	return yargs
		.positional("id", {
			describe: "Encoded check ID",
			type: "string",
			demandOption: true,
		})
		.positional("project-id", {
			describe: "Encoded destination project ID",
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
	const result = await moveCheck(args.id, args.projectId);
	if (args.json) logger.log(JSON.stringify(result, null, 2));
	else logger.table([result]);
}
