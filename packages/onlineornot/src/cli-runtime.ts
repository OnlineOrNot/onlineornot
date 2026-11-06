import { readFile } from "node:fs/promises";

import { getApiConfig } from "./api/infrastructure";
import { logger } from "./logger";
import { getTokenAsync } from "./user";

export async function authenticatedConfig() {
	// API responses can contain sensitive URLs or credentials. Do not debug-log their bodies or
	// contaminate machine-readable stdout, even when ONLINEORNOT_LOG=debug.
	logger.loggerLevel = "log";
	const { apiToken } = await getTokenAsync();
	if (!apiToken)
		throw new Error(
			"Not authenticated. Run onlineornot login or set ONLINEORNOT_API_TOKEN.",
		);
	return getApiConfig(apiToken);
}

// JSON parsing is the only untyped boundary. Generated guards then check every
// accepted property before handing the unchanged object to the typed SDK.
/* oxlint-disable anti-slop/no-unknown-parameters, anti-slop/no-unsafe-dictionary-type */
export function isBodyObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function readInput(input: string): Promise<string> {
	// Yargs returns an array for repeated flags despite its static string type.
	// oxlint-disable-next-line anti-slop/no-runtime-typeof
	if (typeof input !== "string" || input.length === 0)
		throw new Error("Supply exactly one --input file or --input -.");
	if (input !== "-") return readFile(input, "utf8");
	if (process.stdin.isTTY)
		throw new Error("--input - requires piped JSON on stdin.");
	// Retain partial UTF-8 sequences when a code point spans stdin chunks.
	process.stdin.setEncoding("utf8");
	let text = "";
	for await (const chunk of process.stdin) text += chunk;
	return text;
}

interface GeneratedOption {
	readonly type: "string" | "number" | "boolean";
	readonly nargs?: number;
}

/**
 * Yargs coerces any --boolean=value other than "true" to false. Check the
 * original spelling before accepting that coerced value. This is not an argument
 * parser: yargs still owns command selection, positionals and option parsing.
 * Metadata lets us skip non-boolean values, even when they look like flags.
 */
export function validateBooleanArguments(
	argv: readonly string[],
	options: Readonly<Record<string, GeneratedOption>>,
): void {
	for (let index = 0; index < argv.length; index++) {
		const token = argv[index];
		if (token === "--") break;
		if (!token.startsWith("--")) continue;
		const equals = token.indexOf("=");
		const rawName = token.slice(2, equals === -1 ? undefined : equals);
		// Match yargs' automatic camelCase aliases as well as kebab-case flags.
		let name = rawName.replace(
			/[A-Z]/g,
			(letter) => `-${letter.toLowerCase()}`,
		);
		const negated = name.startsWith("no-") && !options[name];
		if (negated) name = name.slice(3);
		const option = options[name];
		if (!option) continue;
		if (option.type !== "boolean") {
			if (equals === -1 && !negated) index += option.nargs ?? 1;
			continue;
		}
		if (equals === -1) continue;
		const value = token.slice(equals + 1);
		if (value !== "true" && value !== "false") {
			throw new Error(
				`--${name} expects true or false; use --${name}, --no-${name}, --${name}=true or --${name}=false.`,
			);
		}
	}
}
