import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";

import { build } from "esbuild";

// Exercise the actual CLI entrypoint in a subprocess. Only the API origin is
// replaced at bundle time; no credentials or requests can reach production.
test("generated heartbeat command contract", async () => {
	const dir = await mkdtemp(path.join(tmpdir(), "heartbeat-cli-"));
	const requests = [];
	const evidence = [];
	let status = 200;
	let response = {
		success: true,
		errors: [],
		messages: [],
		result: { id: "a1b2c3d4" },
	};
	const server = createServer(async (req, res) => {
		let text = "";
		for await (const chunk of req) text += chunk;
		assert.equal(req.headers.authorization, "Bearer fixture-token");
		requests.push({
			method: req.method,
			url: req.url,
			body: text ? JSON.parse(text) : null,
		});
		res.writeHead(status, { "content-type": "application/json" });
		res.end(JSON.stringify(response));
	});
	await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
	const origin = `http://127.0.0.1:${server.address().port}/v1`;
	try {
		await build({
			entryPoints: ["src/cli.ts"],
			outfile: path.join(dir, "cli.cjs"),
			bundle: true,
			external: ["esbuild"],
			platform: "node",
			format: "cjs",
			define: { "process.env.ONLINEORNOT_SEA": '"false"' },
			// Acknowledge consumption without decoding or replacing stdin. Pausing
			// prevents the observer from consuming input before the CLI does.
			banner: {
				js: 'process.stdin.on("data", () => process.send?.("stdin-chunk")); process.stdin.pause();',
			},
			plugins: [
				{
					name: "fixture-origin",
					setup(b) {
						b.onLoad({ filter: /[\\/]constants.ts$/ }, () => ({
							contents: `export const API_BASE_URL=${JSON.stringify(origin)}; export const PROD_API_BASE_URL=API_BASE_URL; export const LOCAL_API_BASE_URL=API_BASE_URL;`,
							loader: "ts",
						}));
					},
				},
			],
		});
		async function run(args, input = "", token = "fixture-token") {
			const child = spawn(
				process.execPath,
				[path.join(dir, "cli.cjs"), ...args],
				{
					env: {
						PATH: process.env.PATH,
						HOME: dir,
						USERPROFILE: dir,
						APPDATA: dir,
						LOCALAPPDATA: dir,
						SystemRoot: process.env.SystemRoot,
						XDG_CONFIG_HOME: dir,
						ONLINEORNOT_API_TOKEN: token,
						NO_COLOR: "1",
						ONLINEORNOT_LOG: "debug",
					},
					stdio: ["pipe", "pipe", "pipe", "ipc"],
					timeout: 15000,
				},
			);
			let stdout = "",
				stderr = "";
			child.stdout.on("data", (x) => (stdout += x));
			child.stderr.on("data", (x) => (stderr += x));
			if (Array.isArray(input)) {
				// Wait for consumption to prevent pipe coalescing from hiding the split.
				child.once("message", () => child.stdin.end(input[1]));
				child.stdin.write(input[0]);
			} else {
				child.stdin.end(input);
			}
			const code = await new Promise((resolve, reject) => {
				child.on("error", reject);
				child.on("close", resolve);
			});
			const result = { args, code, stdout, stderr };
			evidence.push(result);
			return result;
		}
		async function ok(args, input = "") {
			const r = await run(["heartbeats", ...args, "--json"], input);
			assert.equal(r.code, 0, JSON.stringify(r));
			assert.equal(r.stderr, "");
			return JSON.parse(r.stdout);
		}
		async function bad(args, input = "", token = "fixture-token") {
			const before = requests.length;
			const r = await run(["heartbeats", ...args, "--json"], input, token);
			assert.notEqual(r.code, 0);
			assert.equal(r.stdout, "");
			assert.notEqual(r.stderr, "");
			assert.equal(requests.length, before);
		}
		response = {
			success: true,
			errors: [],
			messages: [],
			result: [],
			result_info: { page: 2, per_page: 3, count: 0, total_count: 8 },
		};
		assert.deepEqual(
			await ok(["list", "--page", "2", "--per-page", "3"]),
			response,
		);
		assert.equal(requests.length, 1);
		assert.equal(requests.at(-1).url, "/v1/heartbeats?page=2&per_page=3");
		await ok(["list"]);
		assert.equal(requests.at(-1).url, "/v1/heartbeats");
		response = {
			success: true,
			errors: [],
			messages: [],
			result: { id: "a1b2c3d4" },
		};
		await ok(["view", "a1b2c3d4"]);
		assert.equal(requests.at(-1).url, "/v1/heartbeats/a1b2c3d4");
		const body = { name: "fixture", grace_period: 30, user_alerts: [] };
		const file = path.join(dir, "input.json");
		await writeFile(file, JSON.stringify(body));
		await ok(["create", "--input", file]);
		assert.deepEqual(requests.at(-1), {
			method: "POST",
			url: "/v1/heartbeats",
			body,
		});
		const unicodeBody = { name: "café", grace_period: 30 };
		const unicodeBytes = Buffer.from(JSON.stringify(unicodeBody));
		const split = unicodeBytes.indexOf(Buffer.from("é")) + 1;
		await ok(
			["create", "--input", "-"],
			[unicodeBytes.subarray(0, split), unicodeBytes.subarray(split)],
		);
		assert.deepEqual(requests.at(-1).body, unicodeBody);
		const patch = {
			paused: false,
			muted: false,
			reminder_alert_interval_minutes: 0,
			name: "",
			report_period: null,
			report_period_cron: null,
			timezone: null,
			user_alerts: [],
		};
		await ok(["update", "a1b2c3d4", "--input", "-"], JSON.stringify(patch));
		assert.deepEqual(requests.at(-1), {
			method: "PATCH",
			url: "/v1/heartbeats/a1b2c3d4",
			body: patch,
		});
		await ok(["update", "a1b2c3d4", "--input", "-"], "{}");
		assert.deepEqual(requests.at(-1).body, {});
		await bad(["delete", "a1b2c3d4"]);
		await bad(["delete", "a1b2c3d4", "--yes=false"]);
		await ok(["delete", "a1b2c3d4", "--yes"]);
		assert.equal(requests.at(-1).method, "DELETE");
		for (const value of [
			"{",
			"[]",
			"null",
			"{}",
			'{"name":"x","grace_period":0}',
			'{"name":"x","grace_period":1,"unknown":true}',
		])
			await bad(["create", "--input", "-"], value);
		for (const value of [
			'{"paused":null}',
			'{"report_period":0}',
			'{"user_alerts":[1]}',
			'{"alert_priority":"URGENT"}',
		])
			await bad(["update", "a1b2c3d4", "--input", "-"], value);
		await bad(["create"]);
		await bad(["create", "--input", file, "--name", "conflict"]);
		await bad(["create", "--input", file, "--input", file]);
		await bad(["list", "--page", "0"]);
		await bad(["list", "--page", "1.5"]);
		await bad(["view", "short"]);
		await bad(["ping", "a1b2c3d4"]);
		await bad(["oonchk"]);
		await bad(["list"], "", "");
		for (const failureStatus of [200, 401, 403, 500]) {
			status = failureStatus;
			response = {
				success: false,
				result: null,
				errors: [{ code: 10002, message: "fixture failure" }],
				messages: [],
			};
			const r = await run(["heartbeats", "list", "--json"]);
			assert.notEqual(r.code, 0);
			assert.equal(r.stdout, "");
			assert.match(r.stderr, /fixture failure/);
		}
		status = 200;
		response = { invalid: true };
		const malformed = await run(["heartbeats", "list", "--json"]);
		assert.notEqual(malformed.code, 0);
		assert.equal(malformed.stdout, "");
		for (const command of [
			"heartbeats",
			"heartbeats list",
			"heartbeats create",
			"heartbeats update",
			"checks",
			"login",
			"setup",
		]) {
			const help = await run([...command.split(" "), "--help"]);
			assert.equal(help.code, 0);
			assert.match(help.stdout, /onlineornot/);
		}
		const manifest = JSON.parse(
			await readFile("src/heartbeats/manifest.json", "utf8"),
		);
		assert.deepEqual(await ok(["commands"]), manifest);
		assert.deepEqual(
			manifest.commands.map((c) => ({
				command: c.command,
				options: c.options,
			})),
			JSON.parse(await readFile("test/heartbeats-compatibility.json", "utf8")),
		);
		if (process.env.HEARTBEAT_EVIDENCE)
			await writeFile(
				process.env.HEARTBEAT_EVIDENCE,
				JSON.stringify(
					{
						manifest,
						requests,
						assertions: evidence.map((r) => ({
							...r,
							args: r.args.map((a) =>
								a.startsWith(dir) ? "<fixture-file>" : a,
							),
						})),
					},
					null,
					2,
				).replaceAll(dir, "<fixture-directory>") + "\n",
			);
	} finally {
		await new Promise((resolve) => server.close(resolve));
		await rm(dir, { recursive: true, force: true });
	}
});
