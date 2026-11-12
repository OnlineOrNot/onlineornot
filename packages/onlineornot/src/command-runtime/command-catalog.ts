import { logger } from "../logger";
import type { CommonYargsArgv } from "../yargs-types";

interface CatalogCommand {
	command: string;
	description: string;
	operationId: string;
}

interface CommandCatalog {
	commands: CatalogCommand[];
	schema: { commit: string; sha256: string };
}

export function registerCommandCatalog(
	parser: CommonYargsArgv,
	catalog: CommandCatalog,
) {
	parser.command(
		"cli",
		"Discover generated API commands",
		(group) =>
			group
				.command(
					"commands",
					"Print the generated command catalog as JSON",
					() => {},
					() => {
						logger.log(JSON.stringify(catalog, null, 2));
					},
				)
				.command(
					"search <query>",
					"Find generated API commands",
					(search) =>
						search.positional("query", { type: "string", demandOption: true }),
					(argv) => {
						const terms = String(argv.query)
							.toLowerCase()
							.split(/\s+/)
							.filter(Boolean);
						const matches = catalog.commands
							.map((command) => ({
								command,
								score: terms.filter((term) =>
									`${command.command} ${command.description}`
										.toLowerCase()
										.includes(term),
								).length,
							}))
							.filter((match) => match.score > 0)
							.sort(
								(left, right) =>
									right.score - left.score ||
									left.command.command.localeCompare(right.command.command),
							)
							.slice(0, 5)
							.map((match) => match.command);
						logger.log(JSON.stringify(matches, null, 2));
					},
				)
				.demandCommand(1),
		() => {},
	);
}
