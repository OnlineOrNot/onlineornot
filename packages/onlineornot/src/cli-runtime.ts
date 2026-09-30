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
