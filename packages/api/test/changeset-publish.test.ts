import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { expect, it, vi } from "vitest";

import { legacyTagLines } from "../../../.github/changeset-publish.mjs";
import { npmPackageVersion } from "../../../.github/npm-package-version.mjs";

it("bridges Changesets v3 reports to the action's legacy tag parser", () => {
	const report =
		[
			{ type: "git-tag", packageName: "onlineornot", tag: "onlineornot@1.7.0" },
			{
				type: "git-tag",
				packageName: "@onlineornot/api",
				tag: "@onlineornot/api@0.1.0",
			},
		]
			.map((event) => JSON.stringify(event))
			.join("\n") + "\n";
	expect(legacyTagLines(report)).toEqual([
		"New tag: onlineornot@1.7.0",
		"New tag: @onlineornot/api@0.1.0",
	]);
});

it("does not report releases for an empty report or unrelated events", () => {
	expect(legacyTagLines("")).toEqual([]);
	expect(legacyTagLines('{"type":"other"}\n')).toEqual([]);
});

it("rejects malformed reports instead of silently skipping a release", () => {
	expect(() => legacyTagLines("bad json")).toThrow();
	expect(() =>
		legacyTagLines(
			'{"type":"git-tag","packageName":"onlineornot","tag":"other@1.0.0"}',
		),
	).toThrow();
});

it("retries npm propagation delays", async () => {
	const query = vi
		.fn()
		.mockImplementationOnce(() => {
			throw Object.assign(new Error("Not found"), { stderr: "npm error E404" });
		})
		.mockReturnValue('"1.7.0"');
	const sleep = vi.fn();
	expect(await npmPackageVersion("onlineornot@1.7.0", { query, sleep })).toBe(
		"1.7.0",
	);
	expect(query).toHaveBeenCalledTimes(2);
	expect(sleep).toHaveBeenCalledWith(5000);
});

it("allows an unpublished version only after retrying", async () => {
	const query = vi.fn(() => {
		throw Object.assign(new Error("Not found"), { stderr: "npm error E404" });
	});
	expect(
		await npmPackageVersion("onlineornot@1.7.0", { query, sleep: vi.fn() }),
	).toBe("");
	expect(query).toHaveBeenCalledTimes(4);
});

it("fails on registry outages instead of silently skipping releases", async () => {
	const query = vi.fn(() => {
		throw Object.assign(new Error("Registry unavailable"), {
			stderr: "npm error E503",
		});
	});
	await expect(
		npmPackageVersion("onlineornot@1.7.0", { query, sleep: vi.fn() }),
	).rejects.toThrow("Registry unavailable");
	expect(query).toHaveBeenCalledTimes(4);
});

for (const status of [0, 1]) {
	it(`bridges only successful publish subprocesses (exit ${status})`, () => {
		const directory = mkdtempSync(path.join(tmpdir(), "publish-test-"));
		try {
			// Preload a Node stub rather than relying on executable shell scripts or
			// PATH lookup. Any unexpected subprocess fails, never reaching npm.
			const preload = path.join(directory, "stub-publish.mjs");
			writeFileSync(
				preload,
				`import assert from "node:assert/strict";
import childProcess from "node:child_process";
import { writeFileSync } from "node:fs";
import { syncBuiltinESMExports } from "node:module";
childProcess.execFileSync = (command, args, options) => {
	assert.equal(command, "pnpm");
	assert.deepEqual(args, ["changeset", "publish"]);
	writeFileSync(options.env.CHANGESETS_OUTPUT, JSON.stringify({
		type: "git-tag", packageName: "onlineornot", tag: "onlineornot@1.7.0"
	}) + "\\n");
	console.log("Stub publish invoked");
	if (${status} !== 0) throw new Error("Stub publish failed");
};
syncBuiltinESMExports();
`,
			);
			const result = spawnSync(
				process.execPath,
				[
					"--import",
					pathToFileURL(preload).href,
					fileURLToPath(
						new URL("../../../.github/changeset-publish.mjs", import.meta.url),
					),
				],
				{
					encoding: "utf8",
				},
			);
			expect(result.error).toBeUndefined();
			expect(result.stdout).toContain("Stub publish invoked");
			expect(result.status === 0, result.stderr).toBe(status === 0);
			expect(result.stdout.includes("New tag: onlineornot@1.7.0")).toBe(
				status === 0,
			);
		} finally {
			rmSync(directory, { recursive: true, force: true });
		}
	});
}
