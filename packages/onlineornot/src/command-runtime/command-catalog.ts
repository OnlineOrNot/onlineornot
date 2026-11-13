import { logger } from "../logger";
import type { CommonYargsArgv } from "../yargs-types";
import {
	searchCommandCatalog,
	type SearchCommandCatalog,
} from "./command-search";
import { utilityCommandMetadata } from "./utility-command-metadata";

interface CommandCatalog extends SearchCommandCatalog {
	schema: { commit: string; sha256: string };
}

export function registerCommandCatalog(
	parser: CommonYargsArgv,
	catalog: CommandCatalog,
) {
	parser.command(
		"cli",
		"Discover CLI commands",
		(group) =>
			group
				.command(
					"commands",
					utilityCommandMetadata.cliCommands.description,
					() => {},
					() => {
						logger.log(JSON.stringify(catalog, null, 2));
					},
				)
				.command(
					"search <query>",
					utilityCommandMetadata.cliSearch.description,
					(search) =>
						search.positional("query", {
							type: "string",
							demandOption: true,
							description:
								"Search terms or a description of what you want to do",
						}),
					(argv) => {
						const commands = [
							...catalog.commands,
							...Object.values(utilityCommandMetadata),
						];
						const metadata = new Map(
							commands.map((command) => [command.command, command]),
						);
						const matches = searchCommandCatalog(
							{ ...catalog, commands },
							String(argv.query),
						);
						logger.log(
							JSON.stringify(
								matches.map((match) => ({
									...metadata.get(match.command),
									summary: match.summary,
								})),
								null,
								2,
							),
						);
					},
				)
				.demandCommand(1),
		() => {},
	);
}
