import { printBanner } from "../banner";
import { utilityCommandMetadata } from "../command-runtime/utility-command-metadata";
import { loginHandler, loginOptions } from "../login";
import { logoutHandler, logoutOptions } from "../logout";
import { whoami } from "../whoami";
import type { CommonYargsArgv } from "../yargs-types";

export function registerAuthCommands(parser: CommonYargsArgv) {
	const commands = [
		{
			command: "login",
			describe: utilityCommandMetadata.login.description,
			builder: loginOptions,
			handler: loginHandler,
		},
		{
			command: "logout",
			describe: utilityCommandMetadata.logout.description,
			builder: logoutOptions,
			handler: logoutHandler,
		},
		{
			command: "whoami",
			describe: utilityCommandMetadata.whoami.description,
			builder: () => {},
			handler: async () => {
				await printBanner();
				await whoami();
			},
		},
	];

	parser.command(
		"auth",
		"Manage authentication",
		(group) => {
			for (const command of commands) {
				group.command(
					command.command,
					command.describe,
					command.builder,
					command.handler,
				);
			}
			return group.demandCommand(1, "Specify an authentication command.");
		},
		() => {},
	);

	for (const command of commands) {
		parser.command(command.command, false, command.builder, command.handler);
	}
}
