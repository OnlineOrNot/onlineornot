import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

test("generation is reproducible and operation classification is closed", () => {
	const generate = (args = []) =>
		execFileSync(process.execPath, ["scripts/generate-cli.mjs", ...args], {
			encoding: "utf8",
			stdio: "pipe",
		});
	generate(["--check"]);
	generate(["--check"]);
	const dir = mkdtempSync(path.join(tmpdir(), "cli-overlay-"));
	try {
		const overlay = JSON.parse(
			readFileSync("scripts/cli-overlay.json", "utf8"),
		);
		delete overlay.operations.listTokens;
		const file = path.join(dir, "overlay.json");
		writeFileSync(file, JSON.stringify(overlay));
		assert.throws(
			() => generate(["--check", "--overlay", file]),
			/Unclassified operation: listTokens/,
		);
		overlay.operations.listTokens = {
			classification: "generated",
			reason: "invalid expansion",
		};
		writeFileSync(file, JSON.stringify(overlay));
		assert.throws(
			() => generate(["--check", "--overlay", file]),
			/Unknown resource/,
		);
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
});

test("a second resource is generated from the overlay without changing the emitter", async () => {
	const { execFile } = await import("node:child_process");
	const { createServer } = await import("node:http");
	const { promisify } = await import("node:util");
	const { build } = await import("esbuild");
	const run = promisify(execFile);
	// Keep generated fixtures adjacent to real runtime imports; delete on exit.
	const dir = mkdtempSync(path.resolve("src/.cli-fixture-"));
	const requests = [];
	const server = createServer(async (req, res) => {
		let text = "";
		for await (const chunk of req) text += chunk;
		requests.push({
			method: req.method,
			url: req.url,
			body: text ? JSON.parse(text) : null,
		});
		res.writeHead(200, { "content-type": "application/json" });
		res.end(
			JSON.stringify({
				success: true,
				errors: [],
				messages: [],
				result: { id: "group123" },
			}),
		);
	});
	await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
	try {
		const overlay = JSON.parse(
			readFileSync("scripts/cli-overlay.json", "utf8"),
		);
		overlay.resources["component-groups"] = {
			description: "Fixture-only component groups",
		};
		overlay.operations.createStatusPageComponentGroup = {
			...structuredClone(overlay.operations.createHeartbeat),
			resource: "component-groups",
			command: "create <page-id>",
			arguments: { "page-id": "path.status_page_id" },
		};
		overlay.operations.deleteStatusPageComponentGroup = {
			...structuredClone(overlay.operations.deleteHeartbeat),
			resource: "component-groups",
			command: "delete <page-id> <group-id>",
			arguments: {
				"page-id": "path.status_page_id",
				"group-id": "path.group_id",
			},
		};
		const overlayFile = path.join(dir, "overlay.json");
		writeFileSync(overlayFile, JSON.stringify(overlay));
		const generate = (args = []) =>
			execFileSync(
				process.execPath,
				[
					"scripts/generate-cli.mjs",
					"--overlay",
					overlayFile,
					"--output-dir",
					dir,
					...args,
				],
				{ stdio: "pipe" },
			);
		generate();
		generate(["--check"]);
		// Compile the fixture alongside the real CLI to verify generated SDK types,
		// including both path parameters and the dynamically selected body import.
		execFileSync(
			process.execPath,
			[
				fileURLToPath(
					new URL("./bin/tsc", import.meta.resolve("typescript/package.json")),
				),
				"--noEmit",
			],
			{ stdio: "pipe" },
		);
		const source = readFileSync(path.join(dir, "component-groups.ts"), "utf8");
		assert.match(source, /CreateStatusPageComponentGroupData/);
		assert.match(source, /createStatusPageComponentGroup/);
		assert.doesNotMatch(source, /CreateHeartbeatData/);
		const registry = readFileSync(path.join(dir, "index.ts"), "utf8");
		assert.match(registry, /component-groups/);
		assert.doesNotMatch(
			readFileSync("src/generated-cli/index.ts", "utf8"),
			/component-groups/,
		);
		const origin = `http://127.0.0.1:${server.address().port}/v1`;
		await build({
			entryPoints: ["src/cli.ts"],
			outfile: path.join(dir, "cli.cjs"),
			bundle: true,
			platform: "node",
			format: "cjs",
			external: ["esbuild"],
			define: { "process.env.ONLINEORNOT_SEA": '"false"' },
			plugins: [
				{
					name: "fixture-config",
					setup(b) {
						b.onResolve({ filter: /^\.\/generated-cli$/ }, () => ({
							path: path.join(dir, "index.ts"),
						}));
						b.onLoad({ filter: /[\\/]constants.ts$/ }, () => ({
							contents: `export const API_BASE_URL=${JSON.stringify(origin)};export const PROD_API_BASE_URL=API_BASE_URL;export const LOCAL_API_BASE_URL=API_BASE_URL;`,
							loader: "ts",
						}));
					},
				},
			],
		});
		const env = {
			PATH: process.env.PATH,
			HOME: dir,
			USERPROFILE: dir,
			APPDATA: dir,
			LOCALAPPDATA: dir,
			SystemRoot: process.env.SystemRoot,
			ONLINEORNOT_API_TOKEN: "fixture-token",
		};
		const cli = (args) =>
			run(
				process.execPath,
				[path.join(dir, "cli.cjs"), "component-groups", ...args, "--json"],
				{ env, timeout: 15000 },
			);
		const inputFile = path.join(dir, "body.json");
		writeFileSync(inputFile, '{"name":"Fixture group"}');
		const created = await cli([
			"create",
			"page1234",
			"--name",
			"Fixture group",
		]);
		assert.equal(created.stderr, "");
		assert.deepEqual(JSON.parse(created.stdout).result, { id: "group123" });
		assert.deepEqual(requests.at(-1), {
			method: "POST",
			url: "/v1/status_pages/page1234/groups",
			body: { name: "Fixture group" },
		});
		await assert.rejects(cli(["delete", "page1234", "group123"]));
		assert.equal(requests.length, 1);
		await cli(["delete", "page1234", "group123", "--yes"]);
		assert.deepEqual(requests.at(-1), {
			method: "DELETE",
			url: "/v1/status_pages/page1234/groups/group123",
			body: null,
		});
		writeFileSync(inputFile, '{"name":""}');
		await assert.rejects(cli(["create", "page1234", "--input", inputFile]));
		assert.equal(requests.length, 2);
		// Unsupported primitives/constraints still fail closed rather than silently widening.
		overlay.operations.createInvitation = {
			...overlay.operations.createHeartbeat,
			resource: "component-groups",
			command: "invite",
			arguments: {},
		};
		writeFileSync(overlayFile, JSON.stringify(overlay));
		assert.throws(() => generate(), /Unsupported input constraint: format/);
	} finally {
		await new Promise((resolve) => server.close(resolve));
		rmSync(dir, { recursive: true, force: true });
	}
});
