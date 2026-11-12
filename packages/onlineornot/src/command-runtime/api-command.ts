import { readFile } from "node:fs/promises";
import { createInterface } from "node:readline/promises";

import type { ArgumentsCamelCase, CommandModule } from "yargs";
import { z } from "zod";

import { logger } from "../logger";
import { getTokenAsync } from "../user";
import type { CommonYargsOptions } from "../yargs-types";

interface ApiCommandFlag {
	name: string;
	wireName: string;
	location: "path" | "query" | "header" | "body";
	type: "string" | "number" | "boolean" | "json";
	array: boolean;
	required: boolean;
	positional: boolean;
	description: string;
	choices?: (string | number)[];
	sensitive: boolean;
}

interface ApiCommandSpec {
	operationId: string;
	command: string;
	words: string[];
	description: string;
	method: string;
	path: string;
	hasBody: boolean;
	confirmation: boolean;
	flags: ApiCommandFlag[];
}

type CommandJson = z.infer<ReturnType<typeof z.json>>;
type CommandFields = Record<string, CommandJson | undefined>;

interface ApiCommandRequest {
	path?: CommandFields;
	query?: CommandFields;
	headers?: CommandFields;
	body?: CommandFields;
}

interface ApiCommandInput {
	path: CommandFields;
	query: CommandFields;
	headers: CommandFields;
	body?: CommandFields;
}

interface ApiCommandResponse {
	result: unknown;
	result_info?: unknown;
}

interface PreparedApiCommand {
	request: ApiCommandRequest;
	execute: (token: string) => Promise<ApiCommandResponse>;
}

async function parseCommandBody(value: string) {
	let text = value;
	if (value === "-") {
		if (process.stdin.isTTY)
			throw new Error("Command body requires JSON on stdin");
		const chunks: Buffer[] = [];
		for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk));
		text = Buffer.concat(chunks).toString("utf8");
	} else if (value.startsWith("@")) {
		text = await readFile(value.slice(1), "utf8");
	}
	try {
		return z.record(z.string(), z.json()).parse(JSON.parse(text));
	} catch {
		throw new Error("Invalid command body: expected a JSON object");
	}
}

async function collectCommandInput(
	spec: ApiCommandSpec,
	argv: ArgumentsCamelCase<CommonYargsOptions>,
): Promise<ApiCommandInput> {
	const input: ApiCommandInput = { path: {}, query: {}, headers: {} };
	const rawBody = z.string().optional().parse(argv.body);
	const bodyFlags = spec.flags.filter(
		(flag) => flag.location === "body" && argv[flag.name] !== undefined,
	);
	if (rawBody !== undefined && bodyFlags.length > 0)
		throw new Error(
			"Command body conflicts with individual body flags; use one input form",
		);
	if (spec.hasBody)
		input.body = rawBody === undefined ? {} : await parseCommandBody(rawBody);
	for (const flag of spec.flags) {
		const value = argv[flag.name];
		if (value === undefined) continue;
		const parsed =
			flag.type === "json"
				? z.json().parse(JSON.parse(z.string().parse(value)))
				: z.json().parse(value);
		switch (flag.location) {
			case "path":
				input.path[flag.wireName] = parsed;
				break;
			case "query":
				input.query[flag.wireName] = parsed;
				break;
			case "header":
				input.headers[flag.wireName] = parsed;
				break;
			case "body":
				if (input.body) input.body[flag.wireName] = parsed;
				break;
		}
	}
	return input;
}

async function confirmCommandMutation(
	argv: ArgumentsCamelCase<CommonYargsOptions>,
) {
	if (argv.force === true) return;
	if (!process.stdin.isTTY || !process.stderr.isTTY || process.env.CI)
		throw new Error(
			"Destructive command requires --force in non-interactive mode",
		);
	const prompt = createInterface({
		input: process.stdin,
		output: process.stderr,
	});
	try {
		const answer = await prompt.question(
			"Permanently delete this resource? [y/N] ",
		);
		if (!/^y(es)?$/i.test(answer.trim()))
			throw new Error("Destructive command cancelled");
	} finally {
		prompt.close();
	}
}

function previewCommandRequest(
	spec: ApiCommandSpec,
	request: ApiCommandRequest,
) {
	const body = { ...request.body };
	for (const flag of spec.flags)
		if (
			flag.sensitive &&
			flag.location === "body" &&
			body[flag.wireName] !== undefined
		)
			body[flag.wireName] = "<redacted>";
	return {
		operationId: spec.operationId,
		method: spec.method,
		path: spec.path.replace(/\{([^}]+)\}/g, (_match, key: string) =>
			encodeURIComponent(String(request.path?.[key])),
		),
		query: request.query,
		headers: request.headers,
		body: spec.hasBody ? body : undefined,
	};
}

export function createApiCommand(
	spec: ApiCommandSpec,
	prepare: (input: ApiCommandInput) => PreparedApiCommand,
): CommandModule<CommonYargsOptions, CommonYargsOptions> {
	const positionals = spec.flags
		.filter((flag) => flag.positional)
		.map((flag) => `<${flag.name}>`);
	return {
		command: [spec.words.at(-1), ...positionals].join(" "),
		describe: spec.description,
		builder: (parser) => {
			for (const flag of spec.flags) {
				const options = {
					type: flag.type === "json" ? ("string" as const) : flag.type,
					array: flag.array,
					description: flag.description,
					choices: flag.choices,
					default: undefined,
				};
				if (flag.positional)
					parser.positional(flag.name, {
						...options,
						demandOption: flag.required,
					});
				else if (flag.array) {
					const { default: _default, ...arrayOptions } = options;
					parser.option(flag.name, arrayOptions);
				} else
					parser.option(flag.name, {
						...options,
						requiresArg: flag.type !== "boolean",
					});
			}
			if (spec.hasBody)
				parser.option("body", {
					type: "string",
					requiresArg: true,
					description:
						"JSON object, @file.json, or - for stdin; cannot mix with body flags",
				});
			parser.option("dry-run", {
				type: "boolean",
				default: false,
				description: "Validate and preview the request without sending it",
			});
			if (spec.confirmation)
				parser.option("force", {
					type: "boolean",
					default: false,
					description: "Confirm this destructive operation",
				});
			return parser;
		},
		handler: async (argv) => {
			const prepared = prepare(await collectCommandInput(spec, argv));
			if (argv["dry-run"] === true) {
				logger.log(
					JSON.stringify(
						previewCommandRequest(spec, prepared.request),
						null,
						2,
					),
				);
				return;
			}
			if (spec.confirmation) await confirmCommandMutation(argv);
			const { apiToken } = await getTokenAsync();
			const response = await prepared.execute(apiToken);
			if (response.result !== null && response.result !== undefined)
				logger.log(JSON.stringify(response.result, null, 2));
			if (response.result_info !== undefined)
				process.stderr.write(
					`result_info: ${JSON.stringify(response.result_info)}\n`,
				);
		},
	};
}
