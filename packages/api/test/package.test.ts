import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { expect, it } from "vitest";

const packageDirectory = path.resolve(
	fileURLToPath(new URL("..", import.meta.url)),
);

it("keeps validators isolated to their subpaths", async () => {
	const rootPath = path.join(packageDirectory, "dist/index.js");
	const valibotPath = path.join(packageDirectory, "dist/valibot.js");
	const zodPath = path.join(packageDirectory, "dist/zod.js");
	const [rootSource, valibotSource, zodSource] = [
		rootPath,
		valibotPath,
		zodPath,
	].map((file) => readFileSync(file, "utf8"));

	expect(rootSource).not.toMatch(/from\s+["'](?:valibot|zod)(?:\/[^"']*)?["']/);
	expect(valibotSource).toMatch(/from\s+["']valibot["']/);
	expect(zodSource).toMatch(/from\s+["']zod(?:\/[^"']*)?["']/);

	const sdk = await import(pathToFileURL(rootPath).href);
	expect(sdk.listChecks).toBeTypeOf("function");
	expect(sdk.createClient).toBeTypeOf("function");
	expect(sdk.vCreateCheckBody).toBeUndefined();
	expect(sdk.zCreateCheckBody).toBeUndefined();

	const valibotSchemas = await import(pathToFileURL(valibotPath).href);
	expect(valibotSchemas.vCreateCheckBody).toBeTypeOf("object");
	const zodSchemas = await import(pathToFileURL(zodPath).href);
	expect(zodSchemas.zCreateCheckBody).toBeTypeOf("object");
});

it("packs only intended public files", () => {
	const command = process.platform === "win32" ? "cmd.exe" : "npm";
	const arguments_ =
		process.platform === "win32"
			? ["/d", "/s", "/c", "npm pack --dry-run --json --ignore-scripts"]
			: ["pack", "--dry-run", "--json", "--ignore-scripts"];
	const result = execFileSync(command, arguments_, {
		cwd: packageDirectory,
		encoding: "utf8",
	});
	const files = JSON.parse(result)[0]
		.files.map((file: { path: string }) => file.path)
		.sort();
	expect(files).toEqual([
		"LICENSE",
		"README.md",
		"dist/index.d.ts",
		"dist/index.js",
		"dist/index.js.map",
		"dist/valibot.d.ts",
		"dist/valibot.js",
		"dist/valibot.js.map",
		"dist/zod.d.ts",
		"dist/zod.js",
		"dist/zod.js.map",
		"package.json",
	]);
	for (const file of files)
		expect(file).not.toMatch(/(?:\.env|schema|cache|token|credential)/i);
}, 30_000);

it("keeps public operation names unique and pinned", () => {
	const manifest = JSON.parse(
		readFileSync(path.join(packageDirectory, "operations.json"), "utf8"),
	);
	expect(manifest.operations).toHaveLength(manifest.count);
	expect(new Set(manifest.operations).size).toBe(manifest.count);
	expect(manifest.count).toBe(93);
});
