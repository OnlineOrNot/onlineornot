import { listHeartbeats, moveHeartbeat } from "../api/heartbeats";
import { logger } from "../logger";
import type { CommonYargsArgv } from "../yargs-types";

function jsonOptions(yargs: CommonYargsArgv) {
	return yargs.option("json", {
		describe: "Return output as JSON",
		type: "boolean",
		default: false,
	});
}
export function heartbeats(yargs: CommonYargsArgv) {
	return yargs
		.command(
			"list",
			"List heartbeats",
			(args) =>
				jsonOptions(args).option("project-id", {
					type: "string",
					describe: "Filter by encoded project ID; omit for all projects",
				}),
			async (args) => {
				const results = await listHeartbeats(args.projectId);
				if (args.json) logger.log(JSON.stringify(results, null, 2));
				else
					logger.table(
						results.map((result) => ({
							ID: result.id,
							Name: result.name,
							Project: result.project_id ?? "-",
							Status: result.status,
						})),
					);
			},
		)
		.command(
			"move <id> <project-id>",
			"Move a heartbeat to another project",
			(args) =>
				jsonOptions(args)
					.positional("id", {
						type: "string",
						demandOption: true,
						describe: "Encoded heartbeat ID",
					})
					.positional("project-id", {
						type: "string",
						demandOption: true,
						describe: "Encoded destination project ID",
					}),
			async (args) => {
				const result = await moveHeartbeat(args.id, args.projectId);
				if (args.json) logger.log(JSON.stringify(result, null, 2));
				else logger.table([result]);
			},
		);
}
