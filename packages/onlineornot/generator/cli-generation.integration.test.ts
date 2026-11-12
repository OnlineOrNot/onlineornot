import { execFile } from "node:child_process";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
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
});
