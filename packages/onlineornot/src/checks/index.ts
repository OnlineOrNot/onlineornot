import type { CommonYargsArgv } from "../yargs-types";
import * as Create from "./create";
import * as Delete from "./delete";
import * as View from "./individualCheck";
import * as List from "./list";
import * as Move from "./move";
import * as Update from "./update";

export function checks(yargs: CommonYargsArgv) {
	return yargs
		.command(
			"move <id> <project-id>",
			"Move a check to another project",
			Move.options,
			Move.handler,
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
