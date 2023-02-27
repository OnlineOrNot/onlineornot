import * as Create from "./create";
import * as Delete from "./delete";
import * as View from "./individualCheck";
import * as List from "./list";

import type { CommonYargsArgv } from "../yargs-types";

export function checks(yargs: CommonYargsArgv) {
	return yargs
		.command("list", "List uptime checks", List.options, List.handler)
		.command(
			"view <id>",
			"View a specific uptime check",
			View.options,
			View.handler
		)
		.command(
			"create <name> <url>",
			"Create a new uptime check",
			Create.options,
			Create.handler
		)
		.command(
			"delete <id>",
			"Delete a specific uptime check",
			Delete.options,
			Delete.handler
		);
}
