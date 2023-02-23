import makeCLI from "yargs";

import { version as onlineornotVersion } from "../package.json";
import { printBanner } from "./banner";
import { checks } from "./checks";
import { logger } from "./logger";

import { whoami } from "./whoami";
import type { CommonYargsArgv, CommonYargsOptions } from "./yargs-types";
import type Yargs from "yargs";

const resetColor = "\x1b[0m";
const fgGreenColor = "\x1b[32m";

export class CommandLineArgsError extends Error {}

export function createCLIParser(argv: string[]) {
	// Type check result against CommonYargsOptions to make sure we've included
	// all common options
	const onlineornot: CommonYargsArgv = makeCLI(argv)
		.strict()
		// We handle errors ourselves in a try-catch around `yargs.parse`.
		// If you want the "help info" to be displayed then throw an instance of `CommandLineArgsError`.
		// Otherwise we just log the error that was thrown without any "help info".
		.showHelpOnFail(false)
		.fail((msg, error) => {
			if (!error || error.name === "YError") {
				// If there is no error or the error is a "YError", then this came from yargs own validation
				// Wrap it in a `CommandLineArgsError` so that we can handle it appropriately further up.
				error = new CommandLineArgsError(msg);
			}
			throw error;
		})
		.scriptName("onlineornot")
		.wrap(null)
		// Define global options here, so they get included in the `Argv` type of
		// the `onlineornot` variable
		.version(false)
		.option("v", {
			describe: "Show version number",
			alias: "version",
			type: "boolean",
		});

	onlineornot.group(["help", "version"], "Flags:");
	onlineornot.help().alias("h", "help");

	// Default help command that supports the subcommands
	const subHelp: Yargs.CommandModule<CommonYargsOptions, CommonYargsOptions> = {
		command: ["*"],
		handler: async (args) => {
			setImmediate(() =>
				onlineornot.parse([...args._.map((a) => `${a}`), "--help"])
			);
		},
	};

	onlineornot.command(
		["*"],
		false,
		() => {},
		async (args) => {
			if (args._.length > 0) {
				throw new CommandLineArgsError(`Unknown command: ${args._}.`);
			} else {
				// args.v will exist and be true in the case that no command is called, and the -v
				// option is present. This is to allow for running asynchronous printBanner
				// in the version command.
				if (args.v) {
					if (process.stdout.isTTY) {
						await printBanner();
					} else {
						logger.log(onlineornotVersion);
					}
				} else {
					onlineornot.showHelp("log");
				}
			}
		}
	);

	// checks
	onlineornot.command("checks", "✅ Manage your uptime checks", (d1Yargs) => {
		return checks(d1Yargs.command(subHelp));
	});

	// whoami
	onlineornot.command(
		"whoami",
		"🕵️  Retrieve your user info and test your auth config",
		() => {},
		async () => {
			await printBanner();
			await whoami();
		}
	);

	// This set to false to allow overwrite of default behaviour
	onlineornot.version(false);

	// version
	onlineornot.command(
		"version",
		false,
		() => {},
		async () => {
			if (process.stdout.isTTY) {
				await printBanner();
			} else {
				logger.log(onlineornotVersion);
			}
		}
	);

	onlineornot.exitProcess(false);

	return onlineornot;
}

export async function main(argv: string[]): Promise<void> {
	const onlineornot = createCLIParser(argv);
	try {
		await onlineornot.parse();
	} catch (e) {
		logger.log(""); // Just adds a bit of space
		if (e instanceof CommandLineArgsError) {
			logger.error(e.message);
			// We are not able to ask the `onlineornot` CLI parser to show help for a subcommand programmatically.
			// The workaround is to re-run the parsing with an additional `--help` flag, which will result in the correct help message being displayed.
			// The `onlineornot` object is "frozen"; we cannot reuse that with different args, so we must create a new CLI parser to generate the help message.
			await createCLIParser([...argv, "--help"]).parse();
		} else {
			logger.error(e instanceof Error ? e.message : e);
			logger.log(
				`${fgGreenColor}%s${resetColor}`,
				"If you think this is a bug then please create an issue at https://github.com/onlineornot/onlineornot/issues/new"
			);
		}
		throw e;
	}
}
