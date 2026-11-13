import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import {
	mkdir,
	mkdtemp,
	readFile,
	readdir,
	rename,
	rm,
	writeFile,
} from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

import { z } from "zod";

import { obtainVerifiedSchema, readLock } from "../../api/scripts/lib.mjs";
import { obtainCompiledCliPlugin } from "./compiled-cli-plugin.mjs";
import { runGenerationCommand } from "./generation-command.mjs";

const generationDeadline = Date.now() + 75_000;
const packageRoot = fileURLToPath(new URL("..", import.meta.url));
const require = createRequire(import.meta.url);
const forgePackage = path.dirname(
	require.resolve("@cloudflare/forge/package.json"),
);
const forgeBin = path.join(forgePackage, "bin/forge.cjs");
const pluginBin = path.join(forgePackage, "bin/forge-plugin.mjs");
const annotationSchema = z.discriminatedUnion("status", [
	z
		.object({
			status: z.literal("generated"),
			group: z.string().regex(/^[a-z][a-z0-9-]*(\.[a-z][a-z0-9-]*)*$/),
			method: z.string().regex(/^[a-z][a-z0-9-]*$/),
			positionals: z.record(z.string(), z.string()),
			flags: z.record(z.string(), z.string()),
			sensitive: z.array(z.string()).default([]),
			omitFlags: z.array(z.string()).default([]),
			requireBodyAnyOf: z.array(z.string()).default([]),
		})
		.strict(),
	z.object({ status: z.literal("handwritten"), command: z.string() }).strict(),
	z
		.object({
			status: z.enum(["deferred", "excluded"]),
			reason: z.string().min(1),
		})
		.strict(),
]);
const overlaySchema = z
	.object({
		operations: z.record(z.string(), annotationSchema),
		groupAliases: z
			.record(
				z.string().regex(/^[a-z][a-z0-9-]*$/),
				z.array(z.string().regex(/^[a-z][a-z0-9-]*$/)).min(1),
			)
			.default({}),
	})
	.strict();
const operationSchema = z
	.object({
		operationId: z.string(),
		parameters: z.array(z.json()).optional(),
		requestBody: z.json().optional(),
		security: z.array(z.record(z.string(), z.array(z.string()))).optional(),
	})
	.passthrough();
const documentSchema = z
	.object({
		paths: z.record(z.string(), z.record(z.string(), z.json())),
		security: z.array(z.record(z.string(), z.array(z.string()))).optional(),
	})
	.passthrough();
const methods = new Set([
	"get",
	"post",
	"put",
	"patch",
	"delete",
	"head",
	"options",
	"trace",
]);
const { values } = parseArgs({
	options: {
		check: { type: "boolean", default: false },
		output: { type: "string" },
		overlay: { type: "string" },
		"plugin-cache": { type: "string" },
	},
});
const output = path.resolve(
	values.output ?? path.join(packageRoot, "src/generated-cli"),
);
const overlay = overlaySchema.parse(
	JSON.parse(
		await readFile(
			values.overlay ?? path.join(packageRoot, "generator/cli-overlay.json"),
			"utf8",
		),
	),
);
const handwrittenCommands = new Set(
	Object.values(overlay.operations)
		.filter((operation) => operation.status === "handwritten")
		.map((operation) => operation.command),
);
for (const operation of Object.values(overlay.operations)) {
	if (operation.status !== "generated") continue;
	const command = `${operation.group.replaceAll(".", " ")} ${operation.method}`;
	if (handwrittenCommands.has(command))
		throw new Error(
			`CLI command conflicts with handwritten command: ${command}`,
		);
}
const generatedGroups = new Set(
	Object.values(overlay.operations)
		.filter((operation) => operation.status === "generated")
		.map((operation) => operation.group.split(".")[0]),
);
const claimedGroups = new Set([
	...generatedGroups,
	...Object.values(overlay.operations)
		.filter((operation) => operation.status === "handwritten")
		.map((operation) => operation.command.split(" ")[0]),
	"cli",
	"docs",
	"billing",
	"login",
	"logout",
	"whoami",
	"update",
	"uninstall",
	"version",
]);
for (const [group, aliases] of Object.entries(overlay.groupAliases)) {
	if (!generatedGroups.has(group))
		throw new Error(`Unknown CLI alias group: ${group}`);
	for (const alias of aliases) {
		if (claimedGroups.has(alias))
			throw new Error(`CLI group alias collision: ${alias}`);
		claimedGroups.add(alias);
	}
}
const lock = await readLock();
const schemaPath = await obtainVerifiedSchema(lock);
const bytes = await readFile(schemaPath);
if (createHash("sha256").update(bytes).digest("hex") !== lock.sha256)
	throw new Error("CLI schema digest mismatch");
const document = documentSchema.parse(JSON.parse(bytes.toString("utf8")));
const names = new Set();
const coverage = [];
const selectedPaths = {};
for (const [apiPath, item] of Object.entries(document.paths)) {
	for (const [method, value] of Object.entries(item)) {
		if (!methods.has(method)) continue;
		const operation = operationSchema.parse(value);
		const id = operation.operationId;
		if (names.has(id)) throw new Error(`Duplicate CLI source operation: ${id}`);
		names.add(id);
		const annotation = overlay.operations[id];
		if (!annotation) throw new Error(`Unclassified CLI operation: ${id}`);
		coverage.push({
			operationId: id,
			method: method.toUpperCase(),
			path: apiPath,
			...annotation,
		});
		if (annotation.status !== "generated") continue;
		if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(id))
			throw new Error(`Unsupported SDK operation name: ${id}`);
		if (!apiPath.startsWith("/v1/"))
			throw new Error(`CLI cannot expose non-API operation: ${id}`);
		const jsonBody = z
			.object({
				content: z.object({
					"application/json": z.object({
						schema: z
							.object({ properties: z.record(z.string(), z.json()).optional() })
							.passthrough(),
					}),
				}),
			})
			.safeParse(operation.requestBody);
		const forbidden = [];
		if (jsonBody.success) {
			for (const [name, property] of Object.entries(
				jsonBody.data.content["application/json"].schema.properties ?? {},
			)) {
				const prohibited = z
					.object({ not: z.object({}).strict() })
					.passthrough()
					.safeParse(property);
				if (prohibited.success) forbidden.push(name);
			}
		}
		const security = operation.security ?? document.security ?? [];
		const prepared = {
			...operation,
			"x-forge-group-name": annotation.group,
			"x-forge-method-name": annotation.method,
			"x-onlineornot-operation-id": id,
			"x-onlineornot-cli": {
				groupAliases:
					overlay.groupAliases[annotation.group.split(".")[0]] ?? [],
				positionals: annotation.positionals,
				flags: annotation.flags,
				sensitive: annotation.sensitive,
				omitFlags: annotation.omitFlags,
				requireBodyAnyOf: annotation.requireBodyAnyOf,
				requiresAuth:
					security.length > 0 &&
					!security.some(
						(requirement) => Object.keys(requirement).length === 0,
					),
				forbidden,
			},
		};
		selectedPaths[apiPath] ??= {};
		if (item.parameters) selectedPaths[apiPath].parameters = item.parameters;
		selectedPaths[apiPath][method] = prepared;
	}
}
for (const id of Object.keys(overlay.operations))
	if (!names.has(id))
		throw new Error(`Stale CLI operation classification: ${id}`);
coverage.sort((left, right) =>
	left.operationId.localeCompare(right.operationId),
);
const temporary = await mkdtemp(path.join(tmpdir(), "onlineornot-forge-"));
function execute(stage, command, args, input) {
	return runGenerationCommand(
		stage,
		command,
		args,
		input,
		Math.min(60_000, generationDeadline - Date.now()),
		packageRoot,
	);
}

async function filesIn(directory) {
	if (!existsSync(directory)) return [];
	return (await readdir(directory, { recursive: true, withFileTypes: true }))
		.filter((entry) => entry.isFile())
		.map((entry) =>
			path.relative(directory, path.join(entry.parentPath, entry.name)),
		)
		.sort();
}
try {
	const plugin = await obtainCompiledCliPlugin(
		packageRoot,
		path.resolve(
			values["plugin-cache"] ?? path.join(packageRoot, ".cache/forge-cli"),
		),
		(pending) =>
			execute("compile WASM plugin", process.execPath, [
				pluginBin,
				"build",
				path.join(packageRoot, "generator/cli-plugin.ts"),
				"-o",
				pending,
			]),
	);
	const normalized = await execute(
		"normalize OpenAPI",
		process.execPath,
		[forgeBin, "normalize", "-"],
		JSON.stringify({ ...document, paths: selectedPaths }),
	);
	const input = path.join(temporary, "openapi.json");
	await writeFile(input, normalized);
	const generated = path.join(temporary, "generated");
	await execute("generate commands", process.execPath, [
		forgeBin,
		input,
		"--target",
		`wasm://${plugin}`,
		"--out",
		generated,
	]);
	const schema = { commit: lock.commit, sha256: lock.sha256 };
	const catalog = JSON.parse(
		await readFile(path.join(generated, "catalog.json"), "utf8"),
	);
	await writeFile(
		path.join(generated, "catalog.json"),
		`${JSON.stringify({ schema, ...catalog }, null, "\t")}\n`,
	);
	await writeFile(
		path.join(generated, "coverage.json"),
		`${JSON.stringify({ schema, groupAliases: overlay.groupAliases, operations: coverage }, null, "\t")}\n`,
	);
	const formatter = path.join(
		path.dirname(require.resolve("oxfmt/package.json")),
		"bin/oxfmt",
	);
	await execute("format generated commands", process.execPath, [
		formatter,
		"--write",
		"--config",
		path.join(packageRoot, "../../.oxfmtrc.json"),
		generated,
	]);
	if (values.check) {
		const generatedFiles = await filesIn(generated);
		const existingFiles = await filesIn(output);
		if (JSON.stringify(generatedFiles) !== JSON.stringify(existingFiles))
			throw new Error("Generated CLI drift: file inventory differs");
		for (const file of generatedFiles)
			if (
				!Buffer.from(await readFile(path.join(generated, file))).equals(
					await readFile(path.join(output, file)),
				)
			)
				throw new Error(`Generated CLI drift: ${file}`);
	} else {
		await mkdir(path.dirname(output), { recursive: true });
		const replacement = `${output}.replacement`;
		await rm(replacement, { recursive: true, force: true });
		await mkdir(replacement, { recursive: true });
		for (const file of await filesIn(generated)) {
			await mkdir(path.dirname(path.join(replacement, file)), {
				recursive: true,
			});
			await writeFile(
				path.join(replacement, file),
				await readFile(path.join(generated, file)),
			);
		}
		await rm(output, { recursive: true, force: true });
		await rename(replacement, output);
	}
	console.log(
		values.check
			? "Generated CLI matches pinned schema and metadata"
			: "Generated CLI from pinned schema and metadata",
	);
} finally {
	await rm(temporary, { recursive: true, force: true });
}
