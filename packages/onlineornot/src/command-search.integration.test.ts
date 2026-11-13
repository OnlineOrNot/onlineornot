import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";

import { build } from "esbuild";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";

const execute = promisify(execFile);
const resultsSchema = z.array(
	z.object({ command: z.string(), summary: z.string() }).passthrough(),
);
let directory: string;
let preload: string;

beforeAll(async () => {
	directory = await mkdtemp(path.join(tmpdir(), "onlineornot-command-search-"));
	preload = path.join(directory, "deny-network.mjs");
	await writeFile(
		preload,
		'globalThis.fetch = () => { throw new Error("Search must not make network requests"); };',
	);
	for (const [entry, output] of [
		["src/cli.ts", "cli.cjs"],
		["src/fixtures/search-cli.ts", "fixture.mjs"],
	]) {
		await build({
			entryPoints: [entry],
			outfile: path.join(directory, output),
			bundle: true,
			platform: "node",
			format: output.endsWith("mjs") ? "esm" : "cjs",
			external: ["esbuild"],
			define: {
				"process.env.NODE_ENV": '"production"',
				"process.env.ONLINEORNOT_SEA": '"false"',
			},
		});
	}
}, 60000);

afterAll(async () => {
	await rm(directory, { recursive: true, force: true });
});

async function runDiscovery(args: string[], fixture = false) {
	const result = await execute(
		process.execPath,
		[
			"--import",
			pathToFileURL(preload).href,
			path.join(directory, fixture ? "fixture.mjs" : "cli.cjs"),
			...args,
		],
		{
			cwd: directory,
			timeout: 15000,
			env: {
				PATH: process.env.PATH,
				HOME: directory,
				USERPROFILE: directory,
				XDG_CONFIG_HOME: directory,
				ONLINEORNOT_API_TOKEN: "",
				FORCE_COLOR: "0",
			},
		},
	);
	expect(result.stderr).toBe("");
	return JSON.parse(result.stdout);
}

async function runSearch(query: string, fixture = false) {
	return resultsSchema.parse(
		await runDiscovery(["cli", "search", query], fixture),
	);
}

describe("local command discovery through the executable", () => {
	it.each([
		{ query: "checks dns cre", first: "onlineornot checks dns create" },
		{ query: "hearbeats delet", first: "onlineornot heartbeats delete" },
		{ query: "CHECKS DNS CREATE", first: "onlineornot checks dns create" },
		{ query: "environment-varia cre", first: "onlineornot env create" },
		{ query: "maintenance-windo cre", first: "onlineornot maintenance create" },
	])(
		"matches prefixes, typos, case and aliases for $query",
		async ({ query, first }) => {
			const results = await runSearch(query);
			expect(results[0].command).toBe(first);
			expect(results.length).toBeLessThanOrEqual(5);
			expect(new Set(results.map((result) => result.command)).size).toBe(
				results.length,
			);
		},
	);

	it.each([
		"docs",
		"billing",
		"auth login",
		"auth logout",
		"setup",
		"auth whoami",
		"mcp",
		"update",
		"uninstall",
		"cli commands",
		"cli search",
	])(
		"discovers the existing utility %s without running it",
		async (command) => {
			const results = await runSearch(command);
			expect(results.map((result) => result.command)).toContain(
				`onlineornot ${command}`,
			);
		},
	);

	it("indexes keyword metadata and utility flags", async () => {
		expect((await runSearch("signout"))[0].command).toBe(
			"onlineornot auth logout",
		);
		expect(
			(await runSearch("keep-config")).map((result) => result.command),
		).toContain("onlineornot uninstall");
	});

	it("indexes generated flag names and descriptions", async () => {
		const commands = (await runSearch("grace-period")).map(
			(result) => result.command,
		);
		expect(commands).toContain("onlineornot heartbeats create");
		expect(commands).toContain("onlineornot heartbeats update");
	});

	it.each(["   ", "!!!", "zzqvbnmxyzunmatchable"])(
		"returns no matches for %j",
		async (query) => {
			expect(await runSearch(query)).toEqual([]);
		},
	);

	it("leaves the hidden version command out of search", async () => {
		expect(
			(await runSearch("version")).map((result) => result.command),
		).not.toContain("onlineornot version");
	});

	it("keeps generated API metadata available in the full catalog", async () => {
		const catalog = await runDiscovery(["cli", "commands"]);
		expect(catalog.commands).toHaveLength(89);
		expect(
			catalog.commands.find(
				(command: { operationId: string }) =>
					command.operationId === "createDnsCheck",
			).flags.length,
		).toBeGreaterThan(0);
	});
});

describe("weighted discovery through a metadata-backed CLI", () => {
	it("ranks command and summary/keyword matches above description and option context, capped at five", async () => {
		const commands = (await runSearch("quasar", true)).map(
			(result) => result.command,
		);
		expect(commands).toEqual([
			"onlineornot quasar",
			"onlineornot alpha",
			"onlineornot charlie",
			"onlineornot bravo",
			"onlineornot delta",
		]);
	});

	it.each([
		{ query: "quas", expected: "onlineornot quasar" },
		{ query: "quasarx", expected: "onlineornot quasar" },
		{ query: "nebula", expected: "onlineornot alias" },
		{ query: "fixtureflag", expected: "onlineornot option" },
		{ query: "asteroidal", expected: "onlineornot option" },
		{ query: "celestial", expected: "onlineornot observatory inspect" },
		{ query: "supernova", expected: "onlineornot reference" },
	])("uses indexed metadata for $query", async ({ query, expected }) => {
		expect((await runSearch(query, true))[0].command).toBe(expected);
	});

	it.each(["secretive", "obsolete", "qxzzzrx"])(
		"excludes hidden, opted-out or unrelated commands for %j",
		async (query) => {
			expect(await runSearch(query, true)).toEqual([]);
		},
	);

	it("preserves command metadata and returns stable ranked results", async () => {
		const first = await runSearch("supernova", true);
		expect(first).toEqual([
			{
				command: "onlineornot reference",
				summary: "reference",
				operationId: "fullDescriptionMatch",
				description: "reference\nsupernova",
			},
		]);
		expect(await runSearch("supernova", true)).toEqual(first);
	});
});
