import type { Options } from "yargs";

export const apiCommandOptions = {
	body: {
		type: "string",
		requiresArg: true,
		description:
			"JSON object, @file.json, or - for stdin; cannot mix with body flags",
	},
	"dry-run": {
		type: "boolean",
		default: false,
		description: "Validate and preview the request without sending it",
	},
	force: {
		type: "boolean",
		default: false,
		description: "Confirm this destructive operation",
	},
} satisfies Record<string, Options>;
