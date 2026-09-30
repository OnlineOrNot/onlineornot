import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
	obtainVerifiedSchema,
	readLock,
	schemaUrl,
	validateFullCommit,
} from "../../api/scripts/lib.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const formatter = fileURLToPath(
	new URL("./bin/oxfmt", import.meta.resolve("oxfmt/package.json")),
);
const args = process.argv.slice(2);
const overlayFile = args.includes("--overlay")
	? args[args.indexOf("--overlay") + 1]
	: path.join(root, "scripts/cli-overlay.json");
const { resources, operations: overlay } = JSON.parse(
	await readFile(overlayFile, "utf8"),
);
const outputDirectory = args.includes("--output-dir")
	? path.resolve(args[args.indexOf("--output-dir") + 1])
	: path.join(root, "src/generated-cli");
const lock = await readLock();
validateFullCommit(lock.commit);
if (!/^[0-9a-f]{64}$/.test(lock.sha256))
	throw new Error("Invalid schema SHA-256");
const schema = JSON.parse(
	await readFile(await obtainVerifiedSchema(lock), "utf8"),
);
const operations = new Map();
for (const [url, methods] of Object.entries(schema.paths)) {
	for (const [method, operation] of Object.entries(methods)) {
		if (!operation.operationId) continue;
		if (operations.has(operation.operationId))
			throw new Error(`Duplicate operation: ${operation.operationId}`);
		operations.set(operation.operationId, { ...operation, url, method });
	}
}
const sdkSnapshot = JSON.parse(
	await readFile(path.join(root, "../api/operations.json"), "utf8"),
);
if (
	sdkSnapshot.schema !== schemaUrl(lock) ||
	JSON.stringify([...operations.keys()].sort()) !==
		JSON.stringify([...sdkSnapshot.operations].sort())
)
	throw new Error("SDK operation snapshot does not match the schema lock");
for (const id of operations.keys())
	if (!overlay[id]) throw new Error(`Unclassified operation: ${id}`);
for (const [id, entry] of Object.entries(overlay)) {
	if (!operations.has(id)) throw new Error(`Stale classification: ${id}`);
	if (
		!["generated", "handwritten", "deferred", "excluded"].includes(
			entry.classification,
		) ||
		!entry.reason
	)
		throw new Error(`Invalid classification: ${id}`);
	if (
		entry.classification === "generated" &&
		!Object.hasOwn(resources, entry.resource)
	)
		throw new Error(`Unknown resource for ${id}: ${entry.resource}`);
}
// This pilot deliberately supports only these schema primitives. New shapes fail
// generation rather than being accepted by a permissive generic validator.
function predicate(field, value) {
	const types = Array.isArray(field.type) ? field.type : [field.type];
	const allowed = new Set(["null", "string", "integer", "boolean", "array"]);
	if (types.some((t) => !allowed.has(t)))
		throw new Error("Unsupported input schema");
	for (const key of Object.keys(field))
		if (
			![
				"type",
				"minimum",
				"minLength",
				"enum",
				"items",
				"description",
				"example",
				"default",
			].includes(key)
		)
			throw new Error(`Unsupported input constraint: ${key}`);
	return `(${types
		.map((type) => {
			if (type === "null") return `${value} === null`;
			if (type === "array")
				return `(Array.isArray(${value}) && ${value}.every((item: unknown) => ${predicate(field.items, "item")}))`;
			const conditions = [
				type === "integer"
					? `(typeof ${value} === "number" && Number.isInteger(${value}))`
					: `typeof ${value} === "${type}"`,
			];
			if (field.minimum !== undefined)
				conditions.push(`${value} >= ${field.minimum}`);
			if (field.minLength !== undefined)
				conditions.push(`${value}.length >= ${field.minLength}`);
			if (field.enum)
				conditions.push(
					`(${field.enum.map((v) => `${value} === ${JSON.stringify(v)}`).join(" || ")})`,
				);
			return `(${conditions.join(" && ")})`;
		})
		.join(" || ")})`;
}
const groups = new Map();
for (const [id, entry] of Object.entries(overlay)) {
	if (entry.classification !== "generated") continue;
	if (!/^[A-Za-z][A-Za-z0-9]*$/.test(id))
		throw new Error(`Unsupported SDK identifier: ${id}`);
	if (!/^[a-z][a-z0-9-]*$/.test(entry.resource))
		throw new Error(`Invalid resource: ${entry.resource}`);
	if (!groups.has(entry.resource)) groups.set(entry.resource, []);
	groups.get(entry.resource).push(id);
}
const outputs = new Map();
for (const [resource, ids] of groups) {
	const commands = [];
	const validators = [];
	const types = [];
	const registrations = [];
	const commandNames = new Set(["commands"]);
	for (const id of ids) {
		const entry = overlay[id];
		const operation = operations.get(id);
		const leaf = entry.command.split(" ")[0];
		if (commandNames.has(leaf))
			throw new Error(`Duplicate or reserved command: ${resource} ${leaf}`);
		commandNames.add(leaf);
		const validSafety =
			operation.method === "get"
				? entry.safety === "read"
				: operation.method === "delete"
					? entry.safety === "require-yes"
					: ["write", "require-yes"].includes(entry.safety);
		if (
			!validSafety ||
			!["get", "post", "patch", "put", "delete"].includes(operation.method) ||
			entry.output !== "envelope" ||
			!["none", "single-page"].includes(entry.pagination) ||
			(entry.pagination === "single-page" && operation.method !== "get")
		)
			throw new Error(`Unsupported command policy: ${id}`);
		if (Object.values(entry.options).some((option) => "default" in option))
			throw new Error(`CLI defaults are forbidden: ${id}`);
		const body = operation.requestBody?.content?.["application/json"]?.schema;
		if (operation.requestBody && !body)
			throw new Error(`Unsupported body media type: ${id}`);
		if (entry.input !== (body ? "flags-or-json-exclusive" : "none"))
			throw new Error(`Unsupported input policy: ${id}`);
		if (
			entry.options.json?.type !== "boolean" ||
			(body &&
				(entry.options.input?.type !== "string" ||
					entry.options.input?.demandOption === true ||
					entry.options.input?.nargs !== 1)) ||
			(entry.safety === "require-yes" && entry.options.yes?.type !== "boolean")
		)
			throw new Error(`Missing policy options: ${id}`);
		const type = id[0].toUpperCase() + id.slice(1) + "Data";
		const parameters = operation.parameters ?? [];
		const metadata = {
			operationId: id,
			command: entry.command,
			description: operation.summary,
			options: structuredClone(entry.options),
			arguments: { ...entry.arguments },
			input: entry.input,
			output: entry.output,
			safety: entry.safety,
			pagination: entry.pagination,
			method: operation.method,
			path: operation.url,
			body: body ?? null,
		};
		commands.push(metadata);
		const builder = [];
		const checks = [];
		const request = [];
		const mappings = { path: [], query: [] };
		for (const [flag, target] of Object.entries(entry.arguments)) {
			const [location, name] = target.split(".");
			const parameter = parameters.find(
				(p) => p.in === location && p.name === name,
			);
			if (!parameter) throw new Error(`Missing parameter: ${id} ${target}`);
			const value = `args[${JSON.stringify(flag)}]`;
			if (location === "path") {
				if (parameter.schema.type !== "string")
					throw new Error(`Unsupported path schema: ${id} ${flag}`);
				if (!entry.command.includes(`<${flag}>`))
					throw new Error(`Missing positional: ${id} ${flag}`);
				builder.push(
					`.positional(${JSON.stringify(flag)}, {type:"string", demandOption:true, describe:${JSON.stringify(parameter.description)}})`,
				);
				checks.push(
					`if (!(${predicate(parameter.schema, value)})) throw new Error(${JSON.stringify(`Invalid ${flag}`)});`,
				);
			} else if (location === "query") {
				const option = entry.options[flag];
				const optionType =
					parameter.schema.type === "integer"
						? "number"
						: parameter.schema.type;
				if (
					!["string", "number", "boolean"].includes(optionType) ||
					option?.type !== optionType ||
					(parameter.required && option.demandOption !== true)
				)
					throw new Error(
						`Missing or incompatible query option: ${id} ${flag}`,
					);
				checks.push(
					`if (${value} !== undefined && !(${predicate(parameter.schema, value)})) throw new Error(${JSON.stringify(`Invalid --${flag}`)});`,
				);
			} else throw new Error(`Unsupported mapping: ${target}`);
			mappings[location].push(`${JSON.stringify(name)}: ${value}`);
		}
		for (const parameter of parameters)
			if (
				parameter.required &&
				!Object.values(entry.arguments).includes(
					`${parameter.in}.${parameter.name}`,
				)
			)
				throw new Error(`Unmapped required parameter: ${id} ${parameter.name}`);
		for (const [location, fields] of Object.entries(mappings))
			if (fields.length) request.push(`${location}: {${fields.join(",")}}`);
		if (entry.safety === "require-yes")
			checks.push(
				'if (args.yes !== true) throw new Error("Deletion or destructive mutation requires --yes; no request was sent.");',
			);
		if (body) {
			if (body.type !== "object" || !body.properties)
				throw new Error(`Unsupported body: ${id}`);
			for (const key of Object.keys(body))
				if (!["type", "properties", "required"].includes(key))
					throw new Error(`Unsupported body constraint: ${key}`);
			const fields = Object.entries(body.properties);
			if (!fields.length)
				throw new Error(`Unsupported empty body schema: ${id}`);
			for (const name of body.required ?? [])
				if (!Object.hasOwn(body.properties, name))
					throw new Error(`Unknown required body property: ${id} ${name}`);
			types.push(type);
			const flagValues = [];
			const bodyFlags = [];
			const fieldChecks = [];
			const sampleFlags = [];
			const booleanFlags = [];
			const reserve = (flag) => {
				if (
					!/^[a-z][a-z0-9-]*$/.test(flag) ||
					[
						"help",
						"h",
						"version",
						"v",
						...Object.keys(metadata.options),
						...Object.keys(entry.arguments),
					].includes(flag)
				)
					throw new Error(`Conflicting body flag: ${id} --${flag}`);
				bodyFlags.push(flag);
			};
			for (const [name, field] of fields) {
				const flag = name
					.replace(/([a-z0-9])([A-Z])/g, "$1-$2")
					.replace(/[_.]/g, "-")
					.toLowerCase();
				reserve(flag);
				const fieldTypes = Array.isArray(field.type)
					? field.type
					: [field.type];
				const nonNull = fieldTypes.filter((value) => value !== "null");
				if (nonNull.length !== 1)
					throw new Error(`Unsupported body flag types: ${id} ${name}`);
				const fieldType = nonNull[0];
				const scalarType = fieldType === "array" ? field.items.type : fieldType;
				if (!["string", "integer", "boolean"].includes(scalarType))
					throw new Error(`Unsupported body flag: ${id} ${name}`);
				const required = body.required?.includes(name);
				const option = {
					type: scalarType === "integer" ? "number" : scalarType,
					describe:
						(field.description ?? name.replaceAll("_", " ")) +
						(required ? " (required unless supplied in --input)" : ""),
				};
				if (fieldType === "array") {
					option.array = true;
					option.nargs = 1;
					option.describe += `; repeat --${flag} for each item`;
				} else if (fieldType !== "boolean") option.nargs = 1;
				else {
					booleanFlags.push(flag);
					option.describe += `; --no-${flag} sets false`;
				}
				if (field.enum) option.choices = field.enum;
				metadata.options[flag] = option;
				metadata.arguments[flag] = `body.${name}`;
				const argument = `args[${JSON.stringify(flag)}]`;
				let expression = argument;
				if (fieldTypes.includes("null") || fieldType === "array") {
					const clearFlag = `clear-${flag}`;
					reserve(clearFlag);
					const cleared = fieldTypes.includes("null") ? "null" : "[]";
					metadata.options[clearFlag] = {
						type: "boolean",
						describe: `Clear ${name} by sending ${cleared}; conflicts with --${flag}`,
					};
					metadata.arguments[clearFlag] = `body.${name}`;
					checks.push(`if (args[${JSON.stringify(clearFlag)}] !== undefined) {
					 if (args[${JSON.stringify(clearFlag)}] !== true) throw new Error(${JSON.stringify(`Use --${clearFlag} to clear ${name}, or omit it to leave the field unchanged.`)});
					 if (${argument} !== undefined) throw new Error(${JSON.stringify(`--${clearFlag} conflicts with --${flag}; choose one.`)});
					}`);
					expression = `args[${JSON.stringify(clearFlag)}] === true ? ${cleared} : ${argument}`;
				}
				flagValues.push(`${JSON.stringify(name)}: ${expression}`);
				const value = `value[${JSON.stringify(name)}]`;
				const condition = predicate(field, value);
				if (required)
					fieldChecks.push(
						`if (${value} === undefined) throw new Error(${JSON.stringify(`--${flag} is required; supply it as a flag or set "${name}" in --input JSON.`)});`,
					);
				let expected =
					fieldType === "array"
						? `an array of ${scalarType} values (repeat --${flag})`
						: fieldType === "integer"
							? "an integer"
							: `a ${fieldType}`;
				if (field.minimum !== undefined) expected += ` >= ${field.minimum}`;
				if (field.minLength !== undefined)
					expected += ` with at least ${field.minLength} characters`;
				if (field.enum) expected = `one of ${field.enum.join(", ")}`;
				if (fieldTypes.includes("null"))
					expected += ` or null (use --clear-${flag})`;
				fieldChecks.push(
					`if (${value} !== undefined && !${condition}) throw new Error(${JSON.stringify(`Invalid --${flag} / JSON field "${name}": expected ${expected}.`)});`,
				);
				if (
					required ||
					((body.required?.length ?? 0) === 0 && sampleFlags.length === 0)
				) {
					const example =
						field.example ??
						field.enum?.[0] ??
						(fieldType === "integer"
							? (field.minimum ?? 1)
							: fieldType === "boolean"
								? true
								: "example");
					if (fieldType !== "array")
						sampleFlags.push(`--${flag} ${JSON.stringify(example)}`);
				}
			}
			const allowed = JSON.stringify(Object.keys(body.properties));
			validators.push(`function assert${type}Body(value: unknown): asserts value is ${type}["body"] {
			 if (!isBodyObject(value)) throw new Error("--input must contain a JSON object.");
			 const extra = Object.keys(value).find(key => !${allowed}.includes(key));
			 if (extra !== undefined) throw new Error("Unknown JSON field: " + JSON.stringify(extra) + ". See --help for supported fields.");
			 ${fieldChecks.join("\n")}
			}`);
			checks.push(`let body: ${type}["body"];
			 if (args.input !== undefined) {
			  if (${JSON.stringify(bodyFlags)}.some(flag => args[flag] !== undefined)) throw new Error("--input cannot be mixed with body flags (including --clear-* and --no-*); choose one input mode.");
			  const text = await readInput(args.input);
			  let parsed: unknown;
             try { parsed = JSON.parse(text); } catch { throw new Error("Invalid JSON in --input; expected an object."); }
             assert${type}Body(parsed);
             body = parsed;
             } else {
              const fields = {${flagValues.join(",")}};
              // Yargs can return repeated values outside its inferred option types.
              // Validate flags at the same boundary as JSON before the typed SDK call.
              // oxlint-disable-next-line anti-slop/no-known-value-widening
              assert${type}Body(fields);
              body = fields;
             }`);
			const example = `$0 ${resource} ${entry.command.replace(/<[^>]+>/g, "a1b2c3d4")} ${sampleFlags.join(" ")}`;
			metadata.examples = [
				{
					command: example,
					description:
						"Set fields directly (optional fields are not defaulted)",
				},
			];
			builder.push(
				`.example(${JSON.stringify(example)}, "Set fields directly (optional fields are not defaulted)")`,
			);
			builder.push(
				`.epilog(${JSON.stringify("Use body flags OR --input file/-; never both. Omitted fields stay unchanged on updates. --clear-* sends null for nullable fields or [] for arrays." + (booleanFlags.length ? ` Set booleans false with ${booleanFlags.map((flag) => `--no-${flag}`).join(", ")}.` : ""))})`,
			);

			request.push("body");
		}
		registrations.push(`yargs.command(${JSON.stringify(entry.command)}, ${JSON.stringify(operation.summary)}, y => { const options = y.options(metadata[${commands.length - 1}].options); return options${builder.join("")}; }, async args => {
   ${checks.join("\n")}
   if (!args.json) logger.warn(${JSON.stringify(`${resource} management commands are experimental; use --json for automation.`)});
   const config = await authenticatedConfig();
   const envelope = unwrapApiEnvelope(await ${id}({...config,${request.join(",")}}), ${JSON.stringify(operation.url)});
   logger.log(JSON.stringify(envelope, null, 2));
  });`);
	}
	const manifest = { schema: lock, commands, coverage: overlay };
	const hasBody = types.length > 0;
	const source = `// Generated by scripts/generate-cli.mjs. Do not edit.
// JSON is an untrusted boundary; these generated predicates validate every input field.
/* oxlint-disable anti-slop/no-unknown-parameters, anti-slop/no-runtime-typeof */
import {${ids.join(",")}} from "@onlineornot/api";
${hasBody ? `import type {${types.join(",")}} from "@onlineornot/api";` : ""}
import {unwrapApiEnvelope} from "../api/infrastructure";
import {logger} from "../logger";
import type {CommonYargsArgv} from "../yargs-types";
import {authenticatedConfig${hasBody ? ",isBodyObject,readInput" : ""}} from "../cli-runtime";
import manifest from "./${resource}.manifest.json";
const metadata = ${JSON.stringify(commands.map((command) => ({ options: command.options })))} as const;
${validators.join("\n")}
export function registerCommands(yargs: CommonYargsArgv) {
 logger.loggerLevel = "log";
 yargs.parserConfiguration({"duplicate-arguments-array":true});
 ${registrations.join("\n")}
 return yargs.command("commands", ${JSON.stringify(`Show the pinned ${resource} command and input contract`)}, y=>y.option("json",{type:"boolean"}), ()=>logger.log(JSON.stringify(manifest,null,2))).demandCommand(1).strict();
}
`;
	outputs.set(`${resource}.ts`, source);
	outputs.set(
		`${resource}.manifest.json`,
		JSON.stringify(manifest, null, 2) + "\n",
	);
}
const names = [...groups.keys()];
outputs.set(
	"index.ts",
	`// Generated by scripts/generate-cli.mjs. Do not edit.
import type {CommonYargsArgv} from "../yargs-types";
${names.map((resource, index) => `import {registerCommands as resource${index}} from "./${resource}";`).join("\n")}
const resources = ${JSON.stringify(names)} as const;
export function isGeneratedCommand(argv: string[]): boolean {
 const command = argv.find(arg => !arg.startsWith("-"));
 return resources.some(resource => resource === command);
}
export function registerGeneratedCommands(yargs: CommonYargsArgv) {
 ${names.map((resource, index) => `yargs.command(${JSON.stringify(resource)}, ${JSON.stringify(resources[resource].description)}, resource${index});`).join("\n")}
 return yargs;
}
`,
);
if (!args.includes("--check"))
	await mkdir(outputDirectory, { recursive: true });
for (const [file, contents] of outputs) {
	const target = path.join(outputDirectory, file);
	const formatted = execFileSync(
		process.execPath,
		[formatter, "--stdin-filepath", target],
		{ input: contents, encoding: "utf8" },
	);
	if (args.includes("--check")) {
		if ((await readFile(target, "utf8")) !== formatted)
			throw new Error(`Generated output is stale: ${file}`);
	} else await writeFile(target, formatted);
}
