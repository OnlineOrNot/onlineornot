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

import { runGenerationCommand } from "../scripts/generation-command.mjs";

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

function generateCli(args: string[], cwd = process.cwd()) {
	return execute(process.execPath, ["scripts/generate-cli.mjs", ...args], {
		cwd,
		timeout: 90000,
		maxBuffer: 2_000_000,
	});
}

async function createGeneratorWorkspace(name: string) {
	const workspace = path.join(directory, name);
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
	for (const entry of [".oxfmtrc.json", "tsconfig.json", "pnpm-lock.yaml"])
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
	return fixture;
}

describe("pinned Forge binary and compiled CLI plugin", () => {
	it("generates identical command trees twice and records every operation's disposition", async () => {
		const first = path.join(directory, "first");
		const second = path.join(directory, "second");
		const cache = path.join(directory, "determinism-cache");
		const built = await generateCli([
			"--output",
			first,
			"--plugin-cache",
			cache,
		]);
		const reused = await generateCli([
			"--output",
			second,
			"--plugin-cache",
			cache,
		]);
		expect(built.stderr).toContain("Compiled CLI plugin");
		expect(reused.stderr).toContain("Reused CLI plugin");
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

	it("rebuilds a corrupted compiled plugin without changing generated commands", async () => {
		const cache = path.join(directory, "corrupt-cache");
		const first = path.join(directory, "corrupt-first");
		const repaired = path.join(directory, "corrupt-repaired");
		await generateCli(["--output", first, "--plugin-cache", cache]);
		const artifact = (await readdir(cache)).find((file) =>
			file.endsWith(".wasm"),
		);
		if (!artifact) throw new Error("Compiled CLI plugin was not cached");
		await writeFile(path.join(cache, artifact), "invalid wasm");

		const result = await generateCli([
			"--output",
			repaired,
			"--plugin-cache",
			cache,
		]);

		expect(result.stderr).toContain("Compiled CLI plugin");
		expect(await generatedTree(repaired)).toEqual(await generatedTree(first));
	}, 180000);

	it("invalidates the compiled plugin when its source changes", async () => {
		const fixture = await createGeneratorWorkspace("plugin-input-change");
		const cache = path.join(directory, "source-change-cache");
		const output = path.join(directory, "source-change-output");
		const args = ["--output", output, "--plugin-cache", cache];
		await generateCli(args, fixture);
		const source = path.join(fixture, "generator/cli-plugin.ts");
		await writeFile(source, `${await readFile(source, "utf8")}\n`);

		const rebuilt = await generateCli(args, fixture);
		const reused = await generateCli(args, fixture);

		expect(rebuilt.stderr).toContain("Compiled CLI plugin");
		expect(reused.stderr).toContain("Reused CLI plugin");
		expect(await generatedTree(output)).toEqual(
			await generatedTree("src/generated-cli"),
		);
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
			const fixture = await createGeneratorWorkspace(script.replace(":", "-"));
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
});

describe("generation subprocess supervision", () => {
	it("terminates a stalled phase and its descendants while retaining diagnostic output", async () => {
		const script = `
			const { spawn } = require("node:child_process");
			spawn(process.execPath, ["-e", "process.stderr.write('descendant started\\n'); setInterval(() => {}, 1000)"], { stdio: "inherit" });
			setInterval(() => {}, 1000);
		`;

		await expect(
			runGenerationCommand(
				"stalled fixture",
				process.execPath,
				["-e", script],
				undefined,
				2000,
			),
		).rejects.toThrow(
			/CLI generation stalled fixture timed out after 2000ms:[\s\S]*descendant started/,
		);
	}, 10000);

	it("retains stderr and identifies a failed generation phase", async () => {
		await expect(
			runGenerationCommand(
				"invalid fixture",
				process.execPath,
				[
					"-e",
					"console.error('fixture compiler rejected input'); process.exitCode = 7",
				],
				undefined,
			),
		).rejects.toThrow(
			/CLI generation invalid fixture failed \(7\):[\s\S]*fixture compiler rejected input/,
		);
	});
});
