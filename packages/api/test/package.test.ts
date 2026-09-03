import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { expect, it } from "vitest";

const packageDirectory = path.resolve(
	fileURLToPath(new URL("..", import.meta.url)),
);

it("imports the built package root", async () => {
	const sdk = await import(
		pathToFileURL(path.join(packageDirectory, "dist/index.js")).href
	);
	expect(sdk.listChecks).toBeTypeOf("function");
	expect(sdk.createClient).toBeTypeOf("function");
});

it("packs only intended public files", () => {
	const npm = process.platform === "win32" ? "npm.cmd" : "npm";
	const result = execFileSync(
		npm,
		["pack", "--dry-run", "--json", "--ignore-scripts"],
		{
			cwd: packageDirectory,
			encoding: "utf8",
		},
	);
	const files = JSON.parse(result)[0]
		.files.map((file: { path: string }) => file.path)
		.sort();
	expect(files).toEqual([
		"LICENSE",
		"README.md",
		"dist/index.d.ts",
		"dist/index.js",
		"dist/index.js.map",
		"package.json",
	]);
	for (const file of files)
		expect(file).not.toMatch(/(?:\.env|schema|cache|token|credential)/i);
});

it("keeps public operation names unique and pinned", () => {
	const manifest = JSON.parse(
		readFileSync(path.join(packageDirectory, "operations.json"), "utf8"),
	);
	expect(manifest.operations).toHaveLength(manifest.count);
	expect(new Set(manifest.operations).size).toBe(manifest.count);
	expect(manifest.count).toBe(93);
});
