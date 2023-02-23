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
		);
}
