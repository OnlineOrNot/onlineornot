import { moveCheck, moveHeartbeat } from "./api/projects";
import { logger } from "./logger";
import type {
	CommonYargsArgv,
	StrictYargsOptionsToInterface,
} from "./yargs-types";

export function moveOptions(yargs: CommonYargsArgv) {
	return yargs
		.positional("id", {
			describe: "Resource ID to move",
			type: "string",
			demandOption: true,
		})
		.option("project-id", {
			describe: "Encoded destination project ID (not its name)",
			type: "string",
			demandOption: true,
		})
		.option("json", {
			describe: "Return output as JSON",
			type: "boolean",
			default: false,
		});
}

export async function moveCheckHandler(
	args: StrictYargsOptionsToInterface<typeof moveOptions>,
) {
	const result = await moveCheck(args.id, args.projectId);
	logger.log(
		args.json
			? JSON.stringify(result, null, 2)
			: `Check ${result.id} is in project ${result.project_id}`,
	);
}

export async function moveHeartbeatHandler(
	args: StrictYargsOptionsToInterface<typeof moveOptions>,
) {
	const result = await moveHeartbeat(args.id, args.projectId);
	logger.log(
		args.json
			? JSON.stringify(result, null, 2)
			: `Heartbeat ${result.id} is in project ${result.project_id}`,
	);
}
