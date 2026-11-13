import MiniSearch from "minisearch";

import { apiCommandOptions } from "./command-options";

export interface SearchCommandMetadata {
	command: string;
	description: string;
	summary?: string;
	aliases?: readonly string[];
	words?: readonly string[];
	flags?: readonly { name: string; description: string }[];
	hasBody?: boolean;
	confirmation?: boolean;
	hideCommand?: boolean;
	search?: { keywords?: readonly string[]; exclude?: boolean };
}

export interface SearchCommandCatalog {
	commands: readonly SearchCommandMetadata[];
	descriptions?: Record<string, string>;
}

interface CommandSearchDocument {
	command: string;
	summary: string;
	description: string;
	keywords: string;
	context: string;
}

export function searchCommandCatalog(
	catalog: SearchCommandCatalog,
	query: string,
) {
	const documents = catalog.commands
		.filter((command) => !command.hideCommand && !command.search?.exclude)
		.map((command): CommandSearchDocument => {
			const words = command.words ?? command.command.split(" ").slice(1);
			const parents = words
				.slice(0, -1)
				.map((_, index) => words.slice(0, index + 1).join(" "));
			const options =
				command.hasBody !== undefined
					? Object.entries(apiCommandOptions)
							.filter(
								([name]) =>
									name === "dry-run" ||
									(name === "body" && command.hasBody) ||
									(name === "force" && command.confirmation),
							)
							.map(([name, option]) => `${name} ${option.description}`)
					: [];
			return {
				command: command.command,
				summary: command.summary || command.description.split("\n")[0] || "",
				description: command.description,
				keywords: [
					...(command.search?.keywords ?? []),
					...(command.aliases ?? []),
				].join(" "),
				context: [
					...parents.map((parent) => catalog.descriptions?.[parent] ?? ""),
					...(command.flags ?? []).map(
						(flag) => `${flag.name} ${flag.description}`,
					),
					...options,
				].join(" "),
			};
		});
	const index = new MiniSearch<CommandSearchDocument>({
		fields: ["command", "summary", "description", "keywords", "context"],
		storeFields: ["command", "summary"],
		idField: "command",
	});
	index.addAll(documents);
	const metadata = new Map(
		documents.map((document) => [document.command, document]),
	);
	return index
		.search(query, {
			prefix: true,
			fuzzy: 0.2,
			boost: {
				command: 8,
				summary: 5,
				description: 2,
				keywords: 5,
				context: 0.5,
			},
		})
		.slice(0, 5)
		.map((match) => {
			const document = metadata.get(String(match.id));
			if (!document)
				throw new Error("Command search returned an unknown command");
			return { command: document.command, summary: document.summary };
		});
}
