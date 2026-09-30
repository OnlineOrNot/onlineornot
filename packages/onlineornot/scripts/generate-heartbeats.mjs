import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
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
	: path.join(root, "scripts/heartbeats-overlay.json");
const overlay = JSON.parse(await readFile(overlayFile, "utf8"));
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
const supported = [
	"listHeartbeats",
	"getHeartbeat",
	"createHeartbeat",
	"updateHeartbeat",
	"deleteHeartbeat",
];
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
	if (entry.classification === "generated" && !supported.includes(id))
		throw new Error(`Unsupported generated operation: ${id}`);
}
// This pilot deliberately supports only these schema primitives. New shapes fail
// generation rather than being accepted by a permissive generic validator.
function predicate(field, value) {
	const types = Array.isArray(field.type) ? field.type : [field.type];
	const allowed = new Set(["null", "string", "integer", "boolean", "array"]);
	if (types.some((t) => !allowed.has(t)))
		throw new Error("Unsupported heartbeat input schema");
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
const commands = [];
const validators = [];
const registrations = [];
for (const id of supported) {
	const entry = overlay[id];
	if (entry.classification !== "generated")
		throw new Error(`Pilot operation must remain generated: ${id}`);
	const operation = operations.get(id);
	if (
		entry.output !== "envelope" ||
		entry.pagination !== (id === "listHeartbeats" ? "single-page" : "none") ||
		entry.safety !==
			(id === "deleteHeartbeat"
				? "require-yes"
				: ["listHeartbeats", "getHeartbeat"].includes(id)
					? "read"
					: "write")
	)
		throw new Error(`Unsupported pilot policy: ${id}`);
	if (Object.values(entry.options).some((option) => "default" in option))
		throw new Error(`CLI defaults are forbidden: ${id}`);
	const body = operation.requestBody?.content?.["application/json"]?.schema;
	const type = id[0].toUpperCase() + id.slice(1) + "Data";
	const parameters = operation.parameters ?? [];
	const metadata = {
		operationId: id,
		command: entry.command,
		description: operation.summary,
		options: entry.options,
		arguments: entry.arguments,
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
	for (const [flag, target] of Object.entries(entry.arguments)) {
		const [location, name] = target.split(".");
		const parameter = parameters.find(
			(p) => p.in === location && p.name === name,
		);
		if (!parameter) throw new Error(`Missing parameter: ${id} ${target}`);
		if (location === "path") {
			builder.push(
				`.positional(${JSON.stringify(flag)}, {type:"string", demandOption:true, describe:${JSON.stringify(parameter.description)}})`,
			);
			checks.push(
				`if (!(${predicate(parameter.schema, `args.${flag}`)})) throw new Error("Invalid ${flag}");`,
			);
			request.push(`path: {${name}: args.${flag}}`);
		} else if (location === "query") {
			checks.push(
				`if (args[${JSON.stringify(flag)}] !== undefined && !(${predicate(parameter.schema, `args[${JSON.stringify(flag)}]`)})) throw new Error("Invalid --${flag}");`,
			);
		} else throw new Error(`Unsupported mapping: ${target}`);
	}
	const query = Object.entries(entry.arguments).filter(([, target]) =>
		target.startsWith("query."),
	);
	if (query.length)
		request.push(
			`query: {${query.map(([flag, target]) => `${target.split(".")[1]}: args[${JSON.stringify(flag)}]`).join(",")}}`,
		);
	if (entry.safety === "require-yes")
		checks.push(
			'if (args.yes !== true) throw new Error("Deletion requires --yes; no heartbeat was deleted.");',
		);
	if (body) {
		if (entry.input !== "json-file-or-stdin-only" || body.type !== "object")
			throw new Error(`Unsupported body: ${id}`);
		for (const key of Object.keys(body))
			if (!["type", "properties", "required"].includes(key))
				throw new Error(`Unsupported body constraint: ${key}`);
		const allowed = JSON.stringify(Object.keys(body.properties));
		validators.push(`function is${type}Body(value: unknown): value is ${type}["body"] {
   return isBodyObject(value) && Object.keys(value).every(key => ${allowed}.includes(key)) &&
   ${Object.entries(body.properties)
			.map(
				([name, field]) =>
					`${body.required?.includes(name) ? "" : `(value.${name} === undefined || `}${predicate(field, `value.${name}`)}${body.required?.includes(name) ? "" : ")"}`,
			)
			.join(" &&\n")};
  }`);
		checks.push(`const text = await readInput(args.input);
 let body: unknown;
 try { body = JSON.parse(text); } catch { throw new Error("Invalid JSON input; expected a heartbeat object."); }
  if (!is${type}Body(body)) throw new Error("Invalid heartbeat JSON body; see heartbeats commands for the pinned input contract.");`);
		request.push("body");
	}
	registrations.push(`yargs.command(${JSON.stringify(entry.command)}, ${JSON.stringify(operation.summary)}, y => { const options = y.options(metadata[${commands.length - 1}].options); return options${builder.join("")}; }, async args => {
 ${checks.join("\n")}
 if (!args.json) logger.warn("Heartbeat management commands are experimental; use --json for automation.");
 const config = await authenticatedConfig();
 const envelope = unwrapApiEnvelope(await ${id}({...config,${request.join(",")}}), ${JSON.stringify(operation.url)});
 logger.log(JSON.stringify(envelope, null, 2));
 });`);
}
const manifest = { schema: lock, commands, coverage: overlay };
const source = `// Generated by scripts/generate-heartbeats.mjs. Do not edit.
// JSON is an untrusted boundary; these generated predicates validate every input field.
/* oxlint-disable anti-slop/no-unknown-parameters, anti-slop/no-runtime-typeof */
import {${supported.join(",")}} from "@onlineornot/api";
import type {CreateHeartbeatData, UpdateHeartbeatData} from "@onlineornot/api";
import {unwrapApiEnvelope} from "../api/infrastructure";
import {logger} from "../logger";
import type {CommonYargsArgv} from "../yargs-types";
import {authenticatedConfig,isBodyObject,readInput} from "./runtime";
import manifest from "./manifest.json";
const metadata = ${JSON.stringify(commands.map((command) => ({ options: command.options })))} as const;
${validators.join("\n")}
export function heartbeats(yargs: CommonYargsArgv) {
 logger.loggerLevel = "log";
 yargs.parserConfiguration({"duplicate-arguments-array":true});
 ${registrations.join("\n")}
 return yargs.command("commands", "Show the pinned heartbeat command and input contract", y=>y.option("json",{type:"boolean"}), ()=>logger.log(JSON.stringify(manifest,null,2))).demandCommand(1).strict();
}
`;
for (const [file, contents] of [
	["src/heartbeats/generated.ts", source],
	["src/heartbeats/manifest.json", JSON.stringify(manifest, null, 2) + "\n"],
]) {
	const target = path.join(root, file);
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
