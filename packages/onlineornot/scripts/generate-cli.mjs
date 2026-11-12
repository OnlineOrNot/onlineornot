import { spawnSync } from "node:child_process";
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
			group: z.string().regex(/^[a-z][a-z0-9-]*$/),
			method: z.string().regex(/^[a-z][a-z0-9-]*$/),
			positionals: z.record(z.string(), z.string()),
			flags: z.record(z.string(), z.string()),
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
	.object({ operations: z.record(z.string(), annotationSchema) })
	.strict();
const operationSchema = z
	.object({
		operationId: z.string(),
		parameters: z.array(z.json()).optional(),
		requestBody: z.json().optional(),
	})
	.passthrough();
const documentSchema = z
	.object({ paths: z.record(z.string(), z.record(z.string(), z.json())) })
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
		const prepared = {
			...operation,
			"x-forge-group-name": annotation.group,
			"x-forge-method-name": annotation.method,
			"x-onlineornot-operation-id": id,
			"x-onlineornot-cli": {
				positionals: annotation.positionals,
				flags: annotation.flags,
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
function execute(command, args, input) {
	const result = spawnSync(command, args, {
		cwd: packageRoot,
		encoding: "utf8",
		input,
		maxBuffer: 8_000_000,
		timeout: 90000,
	});
	if (result.error) throw result.error;
	if (result.status !== 0)
		throw new Error(
			`CLI generation failed: ${result.stderr || result.stdout || result.signal}`,
		);
	return result.stdout;
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
	const plugin = path.join(temporary, "cli.wasm");
	execute(process.execPath, [
		pluginBin,
		"build",
		path.join(packageRoot, "generator/cli-plugin.ts"),
		"-o",
		plugin,
	]);
	const normalized = execute(
		process.execPath,
		[forgeBin, "normalize", "-"],
		JSON.stringify({ ...document, paths: selectedPaths }),
	);
	const input = path.join(temporary, "openapi.json");
	await writeFile(input, normalized);
	const generated = path.join(temporary, "generated");
	execute(process.execPath, [
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
		`${JSON.stringify({ schema, operations: coverage }, null, "\t")}\n`,
	);
	const formatter = path.join(
		path.dirname(require.resolve("oxfmt/package.json")),
		"bin/oxfmt",
	);
	execute(process.execPath, [
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
