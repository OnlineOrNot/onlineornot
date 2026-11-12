import { definePlugin } from "@cloudflare/forge/plugin";
import type { Field, File, Method, Type } from "@cloudflare/forge/plugin";
import { z } from "zod";

const commandMetadataSchema = z.object({
	positionals: z.record(z.string(), z.string()),
	flags: z.record(z.string(), z.string()),
	forbidden: z.array(z.string()),
});

interface CommandFlag {
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

function unwrappedType(type: Type): Type {
	return type.kind === "model" ? unwrappedType(type.model.type) : type;
}

function objectFields(type: Type | undefined): readonly Field[] {
	if (!type) return [];
	const current = unwrappedType(type);
	if (current.kind === "object") return current.fields;
	if (current.kind === "intersection")
		return current.members.flatMap(objectFields);
	throw new Error(
		`CLI request must expose object fields, received ${current.kind}`,
	);
}

function flagValueType(
	type: Type,
): Pick<CommandFlag, "type" | "array" | "choices"> {
	const current = unwrappedType(type);
	if (current.kind === "scalar") {
		if (current.scalar === "boolean" || current.scalar === "number")
			return { type: current.scalar, array: false };
		return { type: "string", array: false };
	}
	if (current.kind === "enum") {
		const strings = current.values.filter(
			(value): value is string => typeof value === "string",
		);
		if (strings.length === current.values.length)
			return { type: "string", array: false, choices: strings };
		const numbers = current.values.filter(
			(value): value is number => typeof value === "number",
		);
		if (numbers.length === current.values.length)
			return { type: "number", array: false, choices: numbers };
		if (
			current.values.filter(
				(value): value is boolean => typeof value === "boolean",
			).length === current.values.length
		)
			return { type: "boolean", array: false };
		return { type: "json", array: false };
	}
	if (current.kind === "array") {
		const element = flagValueType(current.elem);
		return element.type === "json" || element.array
			? { type: "json", array: false }
			: { ...element, array: true };
	}
	if (current.kind === "union") {
		const members = current.members
			.map(unwrappedType)
			.filter((member) => member.kind !== "scalar" || member.scalar !== "null");
		if (members.length === 1) return flagValueType(members[0]);
		const values = members.map(flagValueType);
		if (
			values.every(
				(value) => value.type === values[0].type && value.type !== "json",
			)
		)
			return {
				type: values[0].type,
				array: values.some((value) => value.array),
			};
	}
	return { type: "json", array: false };
}

function commandArguments(method: Method) {
	const metadata = commandMetadataSchema.parse(
		method.extension("x-onlineornot-cli"),
	);
	const flags: CommandFlag[] = [];
	const reserved = new Set([
		"body",
		"dry-run",
		"force",
		"help",
		"h",
		"version",
		"v",
	]);
	const used = new Set<string>();
	function add(field: Field, location: CommandFlag["location"]) {
		if (
			field.readOnly ||
			(location === "body" && metadata.forbidden.includes(field.wireName))
		)
			return;
		const positional =
			location === "path" && field.wireName in metadata.positionals;
		const name = positional
			? metadata.positionals[field.wireName]
			: (metadata.flags[field.wireName] ?? field.name.kebab());
		if (!/^[a-z][a-z0-9-]*$/.test(name) || reserved.has(name) || used.has(name))
			throw new Error(
				`CLI flag collision or reserved name: ${method.path} --${name}`,
			);
		used.add(name);
		flags.push({
			name,
			wireName: field.wireName,
			location,
			...flagValueType(field.type),
			required: field.required,
			positional,
			description: field.description || field.wireName,
			sensitive: field.sensitive,
		});
	}
	for (const field of objectFields(method.request)) {
		const location = method.location(field);
		if (location) add(field, location.in);
	}
	for (const field of method.headers?.fields ?? []) add(field, "header");
	for (const field of objectFields(method.body?.json?.type)) add(field, "body");
	return { flags, forbidden: metadata.forbidden };
}

function sdkAdapter(method: Method, id: string, forbidden: string[]): string {
	const pascal = id[0].toUpperCase() + id.slice(1);
	const validators: string[] = [];
	const declarations: string[] = [];
	const request: string[] = [];
	for (const [location, suffix, fields] of [
		[
			"path",
			"Path",
			objectFields(method.request).filter(
				(field) => method.location(field)?.in === "path",
			),
		],
		[
			"query",
			"Query",
			objectFields(method.request).filter(
				(field) => method.location(field)?.in === "query",
			),
		],
		["headers", "Headers", method.headers?.fields ?? []],
		["body", "Body", objectFields(method.body?.json?.type)],
	] as const) {
		if (fields.length === 0) continue;
		const validator = `z${pascal}${suffix}`;
		validators.push(validator);
		const omitted = location === "body" ? forbidden : [];
		const omitExpression = omitted.length
			? `.omit(${JSON.stringify(Object.fromEntries(omitted.map((name) => [name, true])))})`
			: "";
		declarations.push(
			`const ${location} = ${validator}${omitExpression}.strict().parse(input.${location});`,
		);
		const properties = fields
			.filter((field) => !field.readOnly && !omitted.includes(field.wireName))
			.map((field) => {
				const key = JSON.stringify(field.wireName);
				const parsed = `${location}[${key}]`;
				return `${key}: ${field.required ? parsed : `input.${location}?.[${key}] === undefined ? undefined : ${parsed}`}`;
			});
		request.push(`${location}: { ${properties.join(",")} }`);
	}
	return `import { ${id} } from "@onlineornot/api";
import { ${validators.join(", ")} } from "@onlineornot/api/zod";
import { getApiConfig, unwrapApiEnvelope } from "../api/infrastructure";
import { createApiCommand } from "../command-runtime/api-command";

export const command = createApiCommand(SPEC, (input) => {
${declarations.join("\n")}
const request = { ${request.join(",")} };
return { request, execute: async (token) => unwrapApiEnvelope(await ${id}({ ...getApiConfig(token), ...request }), ${JSON.stringify(method.path)}) };
});
`;
}

export const { generate } = definePlugin({
	generate(forge) {
		const commands = [];
		const files: File[] = [];
		const addresses = new Set<string>();
		const imports: string[] = [];
		const grouped = new Map<string, string[]>();
		for (const group of forge.groups) {
			for (const method of group.methods) {
				const id = z
					.string()
					.parse(method.extension("x-onlineornot-operation-id"));
				if (group.path.length !== 1)
					throw new Error(
						`CLI operation must belong to one resource group: ${id}`,
					);
				const words = [
					...group.path.map((name) => name.kebab()),
					method.name.kebab(),
				];
				const address = words.join(" ");
				if (addresses.has(address))
					throw new Error(`Duplicate CLI command: ${address}`);
				addresses.add(address);
				const { flags, forbidden } = commandArguments(method);
				const spec = {
					operationId: id,
					command: `onlineornot ${address}`,
					words,
					description: method.summary || method.description,
					method: method.httpMethod,
					path: method.path,
					hasBody: method.body !== undefined,
					confirmation:
						method.httpMethod === "DELETE" || method.confirmation !== undefined,
					flags,
				};
				commands.push(spec);
				files.push({
					path: `${id}.ts`,
					content: sdkAdapter(method, id, forbidden).replace(
						"SPEC",
						JSON.stringify(spec),
					),
				});
				imports.push(`import { command as ${id} } from "./${id}";`);
				const root = words[0];
				const leaves = grouped.get(root) ?? [];
				leaves.push(id);
				grouped.set(root, leaves);
			}
		}
		commands.sort((left, right) => left.command.localeCompare(right.command));
		files.push({ path: "catalog.json", content: JSON.stringify({ commands }) });
		files.push({
			path: "index.ts",
			content: `import type { CommonYargsArgv } from "../yargs-types";
import { registerCommandCatalog } from "../command-runtime/command-catalog";
import catalog from "./catalog.json";
${imports.join("\n")}

export function registerGeneratedCommands(parser: CommonYargsArgv) {
${[...grouped].map(([root, leaves]) => `parser.command(${JSON.stringify(root)}, ${JSON.stringify(`Manage ${root}`)}, (group) => { ${leaves.map((name) => `group.command(${name});`).join(" ")} return group.demandCommand(1); }, () => {});`).join("\n")}
registerCommandCatalog(parser, catalog);
}
`,
		});
		return files;
	},
});
