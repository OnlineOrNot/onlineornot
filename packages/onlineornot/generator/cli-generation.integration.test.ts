import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import {
	cp,
	mkdir,
	mkdtemp,
	readFile,
	readdir,
	rm,
	symlink,
	writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

const execute = promisify(execFile);
let directory: string;
beforeAll(async () => {
	directory = await mkdtemp(
		path.join(tmpdir(), "onlineornot-forge-generation-"),
	);
});
afterAll(async () => {
	await rm(directory, { recursive: true, force: true });
});

async function generatedTree(output: string) {
	const files = await readdir(output, { recursive: true });
	const entries: [string, string][] = [];
	for (const file of files.sort()) {
		if (!file.endsWith(".ts") && !file.endsWith(".json")) continue;
		entries.push([file, await readFile(path.join(output, file), "utf8")]);
	}
	return entries;
}

function generateCli(args: string[]) {
	return execute(process.execPath, ["scripts/generate-cli.mjs", ...args], {
		timeout: 90000,
		maxBuffer: 2_000_000,
	});
}

describe("pinned Forge binary and compiled CLI plugin", () => {
	it("generates identical command trees twice and records every operation's disposition", async () => {
		const first = path.join(directory, "first");
		const second = path.join(directory, "second");
		await generateCli(["--output", first]);
		await generateCli(["--output", second]);
		expect(await generatedTree(first)).toEqual(await generatedTree(second));
		const coverage = JSON.parse(
			await readFile(path.join(first, "coverage.json"), "utf8"),
		);
		expect(coverage.operations).toHaveLength(117);
		expect(
			coverage.operations.find(
				(operation: { operationId: string }) =>
					operation.operationId === "pingHeartbeat",
			).status,
		).toBe("excluded");
	}, 180000);

	it("detects generated drift without rewriting the changed file", async () => {
		const output = path.join(directory, "drift");
		await generateCli(["--output", output]);
		const file = path.join(output, "catalog.json");
		await writeFile(file, "{}\n");
		await expect(generateCli(["--output", output, "--check"])).rejects.toThrow(
			"Generated CLI drift",
		);
		expect(await readFile(file, "utf8")).toBe("{}\n");
	}, 180000);

	it("preserves generated output through a CRLF-configured Git checkout", async () => {
		const checkout = path.join(directory, "autocrlf");
		const output = path.join(
			checkout,
			"packages/onlineornot/src/generated-cli",
		);
		await cp("src/generated-cli", output, { recursive: true });
		if (existsSync("../../.gitattributes"))
			await cp("../../.gitattributes", path.join(checkout, ".gitattributes"));
		await execute("git", ["init", "--quiet", checkout]);
		await execute("git", [
			"-C",
			checkout,
			"-c",
			"core.autocrlf=true",
			"add",
			".",
		]);
		await rm(output, { recursive: true });
		await execute("git", [
			"-C",
			checkout,
			"-c",
			"core.autocrlf=true",
			"checkout-index",
			"--all",
			"--force",
		]);
		await generateCli(["--output", output, "--check"]);
		expect(await generatedTree(output)).toEqual(
			await generatedTree("src/generated-cli"),
		);
	}, 90000);

	it.each(["bundle", "build:sea"])(
		"rejects stale committed output before %s and leaves it unchanged",
		async (script) => {
			const workspace = path.join(directory, script.replace(":", "-"));
			const fixture = path.join(workspace, "packages/onlineornot");
			await mkdir(fixture, { recursive: true });
			for (const entry of [
				"package.json",
				"tsconfig.json",
				"src",
				"scripts",
				"generator",
				"bin",
				"sea-config.json",
			])
				await cp(entry, path.join(fixture, entry), { recursive: true });
			for (const entry of [".oxfmtrc.json", "tsconfig.json"])
				await cp(path.resolve("../..", entry), path.join(workspace, entry));
			await symlink(
				path.resolve("../../node_modules"),
				path.join(workspace, "node_modules"),
				"junction",
			);
			await symlink(
				path.resolve("node_modules"),
				path.join(fixture, "node_modules"),
				"junction",
			);
			await symlink(
				path.resolve("../api"),
				path.join(workspace, "packages/api"),
				"junction",
			);
			const output = path.join(fixture, "src/generated-cli");
			await writeFile(path.join(output, "catalog.json"), "{}\n");
			const staleTree = await generatedTree(output);
			await expect(
				execute(process.execPath, ["--run", script], {
					cwd: fixture,
					timeout: 90000,
					maxBuffer: 2_000_000,
				}),
			).rejects.toThrow("Generated CLI drift");
			expect(await generatedTree(output)).toEqual(staleTree);
		},
		180000,
	);

	it.each(["unclassified", "collision", "reserved"])(
		"rejects %s metadata before publishing generated output",
		async (failure) => {
			const overlay = JSON.parse(
				await readFile("generator/cli-overlay.json", "utf8"),
			);
			if (failure === "unclassified") delete overlay.operations.createHeartbeat;
			if (failure === "collision")
				overlay.operations.createHeartbeat.method = "list";
			if (failure === "reserved")
				overlay.operations.createHeartbeat.flags = { name: "body" };
			const overlayFile = path.join(directory, `${failure}.json`);
			await writeFile(overlayFile, JSON.stringify(overlay));
			await expect(
				generateCli([
					"--overlay",
					overlayFile,
					"--output",
					path.join(directory, failure),
				]),
			).rejects.toThrow();
		},
		90000,
	);

	it.each([
		{
			name: "canonical collision",
			aliases: { env: ["maintenance"] },
			error: "CLI group alias collision: maintenance",
		},
		{
			name: "duplicate alias",
			aliases: { env: ["shared"], maintenance: ["shared"] },
			error: "CLI group alias collision: shared",
		},
		{
			name: "unknown group",
			aliases: { missing: ["extra"] },
			error: "Unknown CLI alias group: missing",
		},
		{
			name: "handwritten collision",
			aliases: { env: ["checks"] },
			error: "CLI group alias collision: checks",
		},
	])(
		"rejects $name before publishing alias output",
		async ({ name, aliases, error }) => {
			const overlay = JSON.parse(
				await readFile("generator/cli-overlay.json", "utf8"),
			);
			overlay.groupAliases = aliases;
			const overlayFile = path.join(
				directory,
				`${name.replaceAll(" ", "-")}.json`,
			);
			const output = path.join(
				directory,
				`${name.replaceAll(" ", "-")}-output`,
			);
			await writeFile(overlayFile, JSON.stringify(overlay));
			await expect(
				generateCli(["--overlay", overlayFile, "--output", output]),
			).rejects.toThrow(error);
			expect(existsSync(output)).toBe(false);
		},
		90000,
	);

	it("refuses to generate a command that would shadow a retained check command", async () => {
		const overlay = JSON.parse(
			await readFile("generator/cli-overlay.json", "utf8"),
		);
		overlay.operations.getCheck = {
			status: "generated",
			group: "checks",
			method: "list",
			positionals: { check_id: "id" },
			flags: { "X-OnlineOrNot-Organisation": "organisation" },
		};
		const file = path.join(directory, "handwritten-command-collision.json");
		const output = path.join(directory, "handwritten-command-collision");
		await writeFile(file, JSON.stringify(overlay));
		await expect(
			generateCli(["--overlay", file, "--output", output]),
		).rejects.toThrow(
			"CLI command conflicts with handwritten command: checks list",
		);
		expect(existsSync(output)).toBe(false);
	}, 90000);
});
