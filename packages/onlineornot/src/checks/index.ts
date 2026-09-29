import { moveOptions, moveCheckHandler } from "../move";
import type { CommonYargsArgv } from "../yargs-types";
import * as Create from "./create";
import * as Delete from "./delete";
import * as View from "./individualCheck";
import * as List from "./list";
import * as Update from "./update";

export function checks(yargs: CommonYargsArgv) {
	// Check commands use --version for their runtime, not the root CLI banner.
	return yargs
		.option("v", { type: "boolean", alias: "version", global: false })
		.command(
			"move <id>",
			"Move a check atomically, preserving running/paused state (candidate API)",
			moveOptions,
			moveCheckHandler,
		)
		.command("list", "List uptime checks", List.options, List.handler)
		.command(
			"view <id>",
			"View a specific uptime check",
			View.options,
			View.handler,
		)
		.command(
			"create <name> <url>",
			"Create a new uptime check",
			Create.options,
			Create.handler,
		)
		.command(
			"update <id>",
			"Update an existing uptime check",
			Update.options,
			Update.handler,
		)
		.command(
			"delete <id>",
			"Delete a specific uptime check",
			Delete.options,
			Delete.handler,
		);
}
