import { registerCommandCatalog } from "../command-runtime/command-catalog";
import type { CommonYargsArgv } from "../yargs-types";
import catalog from "./catalog.json";
import { command as createHeartbeat } from "./createHeartbeat";
import { command as deleteHeartbeat } from "./deleteHeartbeat";
import { command as getHeartbeat } from "./getHeartbeat";
import { command as listHeartbeats } from "./listHeartbeats";
import { command as moveHeartbeat } from "./moveHeartbeat";
import { command as updateHeartbeat } from "./updateHeartbeat";

export function registerGeneratedCommands(parser: CommonYargsArgv) {
	parser.command(
		"heartbeats",
		"Manage heartbeats",
		(group) => {
			group.command(createHeartbeat);
			group.command(deleteHeartbeat);
			group.command(getHeartbeat);
			group.command(listHeartbeats);
			group.command(moveHeartbeat);
			group.command(updateHeartbeat);
			return group.demandCommand(1);
		},
		() => {},
	);
	registerCommandCatalog(parser, catalog);
}
