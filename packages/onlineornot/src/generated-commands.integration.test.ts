import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { build } from "esbuild";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";

interface RecordedRequest {
	method: string;
	url: string;
	authorization: string | undefined;
	organisation: string | string[] | undefined;
	body: string;
}

const requests: RecordedRequest[] = [];
let status = 200;
let apiSuccess = true;
let malformedResponse = false;
let directory: string;
let cliPath: string;
let preloadPath: string;
const server = createServer(async (request, response) => {
	let body = "";
	for await (const chunk of request) body += chunk;
	requests.push({
		method: request.method ?? "",
		url: request.url ?? "",
		authorization: request.headers.authorization,
		organisation: request.headers["x-onlineornot-organisation"],
		body,
	});
	response.writeHead(status, { "Content-Type": "application/json" });
	if (malformedResponse) {
		response.end("{");
		return;
	}
	response.end(
		JSON.stringify({
			success: apiSuccess,
			result: apiSuccess
				? { id: "heartbeat123", name: "Nightly backup" }
				: null,
			errors: apiSuccess
				? []
				: [{ code: 1001, message: "Heartbeat access denied" }],
			messages: [],
			result_info: { page: 2, per_page: 5, count: 1, total_count: 12 },
		}),
	);
});

beforeAll(async () => {
	directory = await mkdtemp(path.join(tmpdir(), "onlineornot-generated-cli-"));
	cliPath = path.join(directory, "cli.cjs");
	preloadPath = path.join(directory, "fixture.mjs");
	await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
	const address = server.address();
	const bound = z.object({ port: z.number() }).parse(address);
	await writeFile(
		preloadPath,
		`const send = globalThis.fetch;
	globalThis.fetch = (input, init) => {
		const request = new Request(input, init);
		const url = new URL(request.url);
		if (url.origin !== "https://api.onlineornot.com") throw new Error("Unexpected fixture origin");
		url.protocol = "http:";
		url.hostname = "127.0.0.1";
		url.port = "${bound.port}";
		return send(new Request(url, request));
	};`,
	);
	await build({
		entryPoints: ["src/cli.ts"],
		outfile: cliPath,
		bundle: true,
		platform: "node",
		format: "cjs",
		external: ["esbuild"],
		define: {
			"process.env.NODE_ENV": '"production"',
			"process.env.ONLINEORNOT_SEA": '"false"',
		},
	});
}, 60000);

beforeEach(() => {
	requests.length = 0;
	status = 200;
	apiSuccess = true;
	malformedResponse = false;
});

afterAll(async () => {
	await new Promise<void>((resolve) => server.close(() => resolve()));
	await rm(directory, { recursive: true, force: true });
});

function runCli(args: string[], input = "", authenticated = true) {
	return new Promise<{ code: number | null; stdout: string; stderr: string }>(
		(resolve, reject) => {
			const child = spawn(
				process.execPath,
				["--import", pathToFileURL(preloadPath).href, cliPath, ...args],
				{
					cwd: directory,
					env: {
						PATH: process.env.PATH,
						HOME: directory,
						XDG_CONFIG_HOME: directory,
						FORCE_COLOR: "0",
						ONLINEORNOT_API_TOKEN: authenticated ? "fixture-token" : "",
					},
					stdio: ["pipe", "pipe", "pipe"],
				},
			);
			let stdout = "";
			let stderr = "";
			child.stdout.on("data", (chunk) => {
				stdout += chunk;
			});
			child.stderr.on("data", (chunk) => {
				stderr += chunk;
			});
			const timeout = setTimeout(() => {
				child.kill();
				reject(new Error("CLI fixture timed out"));
			}, 20000);
			child.on("error", reject);
			child.on("close", (code) => {
				clearTimeout(timeout);
				resolve({ code, stdout, stderr });
			});
			child.stdin.end(input);
		},
	);
}

describe("Forge-generated commands through the executable and real HTTP", () => {
	it("lists one page with repeated project filters and the organization header", async () => {
		const result = await runCli([
			"heartbeats",
			"list",
			"--page",
			"2",
			"--per-page",
			"5",
			"--project-id",
			"unassigned",
			"--project-id",
			"project1234567890",
			"--organisation",
			"organization1234",
		]);
		expect(result.code).toBe(0);
		expect(JSON.parse(result.stdout)).toEqual({
			id: "heartbeat123",
			name: "Nightly backup",
		});
		expect(result.stderr).toContain('result_info: {"page":2');
		expect(requests).toHaveLength(1);
		const query = new URL(requests[0].url, "http://fixture").searchParams;
		expect(query.get("per_page")).toBe("5");
		expect(query.getAll("project_id")).toEqual([
			"unassigned",
			"project1234567890",
		]);
		expect(requests[0].authorization).toBe("Bearer fixture-token");
		expect(requests[0].organisation).toBe("organization1234");
	});

	it("creates from generated flags without supplying optional API defaults", async () => {
		const result = await runCli([
			"heartbeats",
			"create",
			"--name",
			"Backup",
			"--grace-period",
			"30",
			"--report-period",
			"3600",
			"--user-alerts",
			"user-one",
			"--user-alerts",
			"user-two",
		]);
		expect(result.code).toBe(0);
		expect(requests).toHaveLength(1);
		expect(requests[0].method).toBe("POST");
		expect(JSON.parse(requests[0].body)).toEqual({
			name: "Backup",
			grace_period: 30,
			report_period: 3600,
			user_alerts: ["user-one", "user-two"],
		});
	});

	it("preserves omitted booleans and explicit false and zero on updates", async () => {
		const first = await runCli([
			"heartbeats",
			"update",
			"heartbeat123",
			"--name",
			"Renamed",
		]);
		expect(first.code).toBe(0);
		expect(JSON.parse(requests[0].body)).toEqual({ name: "Renamed" });
		const second = await runCli([
			"heartbeats",
			"update",
			"heartbeat123",
			"--paused=false",
			"--muted=false",
			"--reminder-alert-interval-minutes",
			"0",
		]);
		expect(second.code).toBe(0);
		expect(JSON.parse(requests[1].body)).toEqual({
			paused: false,
			muted: false,
			reminder_alert_interval_minutes: 0,
		});
	});

	it("preserves explicit null and empty arrays from JSON file and stdin bodies", async () => {
		const bodyFile = path.join(directory, "patch.json");
		await writeFile(bodyFile, '{"report_period":null,"user_alerts":[]}');
		const fromFile = await runCli([
			"heartbeats",
			"update",
			"heartbeat123",
			"--body",
			`@${bodyFile}`,
		]);
		expect(fromFile.code).toBe(0);
		expect(JSON.parse(requests[0].body)).toEqual({
			report_period: null,
			user_alerts: [],
		});
		const fromStdin = await runCli(
			["heartbeats", "update", "heartbeat123", "--body", "-"],
			'{"timezone":null,"muted":false}',
		);
		expect(fromStdin.code).toBe(0);
		expect(JSON.parse(requests[1].body)).toEqual({
			timezone: null,
			muted: false,
		});
	});

	it("encodes the resource positional and supports project moves", async () => {
		const get = await runCli(["heartbeats", "get", "hello/world"]);
		expect(get.code).toBe(0);
		expect(requests[0].url).toBe("/v1/heartbeats/hello%2Fworld");
		const move = await runCli([
			"heartbeats",
			"move",
			"heartbeat123",
			"--body",
			'{"project_id":null}',
		]);
		expect(move.code).toBe(0);
		expect(requests[1].method).toBe("POST");
		expect(requests[1].url).toBe("/v1/heartbeats/heartbeat123/move");
		expect(JSON.parse(requests[1].body)).toEqual({ project_id: null });
	});

	it("requires explicit confirmation in non-interactive contexts before deletion", async () => {
		const refused = await runCli(["heartbeats", "delete", "heartbeat123"]);
		expect(refused.code).toBe(1);
		expect(refused.stdout).toBe("");
		expect(refused.stderr).toContain("--force");
		expect(requests).toHaveLength(0);
		const confirmed = await runCli([
			"heartbeats",
			"delete",
			"heartbeat123",
			"--force",
		]);
		expect(confirmed.code).toBe(0);
		expect(requests).toHaveLength(1);
		expect(requests[0].method).toBe("DELETE");
	});

	it("validates before previewing and does not authenticate or send preview requests", async () => {
		const preview = await runCli(
			[
				"heartbeats",
				"create",
				"--name",
				"Backup",
				"--grace-period",
				"30",
				"--dry-run",
			],
			"",
			false,
		);
		expect(preview.code).toBe(0);
		expect(JSON.parse(preview.stdout)).toMatchObject({
			method: "POST",
			path: "/v1/heartbeats",
			body: { name: "Backup", grace_period: 30 },
		});
		expect(requests).toHaveLength(0);
		const invalid = await runCli(
			["heartbeats", "create", "--dry-run"],
			"",
			false,
		);
		expect(invalid.code).toBe(1);
		expect(invalid.stdout).toBe("");
		expect(requests).toHaveLength(0);
	});

	it.each([
		{ args: ["create", "--body", "{"], error: "Invalid command body" },
		{
			args: ["create", "--body", '{"name":"Bad","grace_period":0}'],
			error: "grace_period",
		},
		{
			args: [
				"create",
				"--name",
				"Bad",
				"--grace-period",
				"10",
				"--alert-priority",
				"URGENT",
			],
			error: "alert-priority",
		},
		{
			args: [
				"create",
				"--body",
				'{"name":"Bad","grace_period":10,"typo":true}',
			],
			error: "typo",
		},
		{
			args: [
				"create",
				"--name",
				"Conflicting",
				"--body",
				'{"name":"Bad","grace_period":10}',
			],
			error: "conflicts",
		},
		{
			args: [
				"update",
				"heartbeat123",
				"--body",
				'{"project_id":"project1234567890"}',
			],
			error: "project_id",
		},
		{
			args: ["update", "heartbeat123", "--body", "null"],
			error: "expected a JSON object",
		},
		{ args: ["create", "--body", "@does-not-exist.json"], error: "ENOENT" },
		{ args: ["list", "--page", "0"], error: "page" },
	])("rejects invalid input before HTTP: $error", async ({ args, error }) => {
		const result = await runCli(["heartbeats", ...args]);
		expect(result.code).toBe(1);
		expect(result.stdout).toBe("");
		expect(result.stderr).toContain(error);
		expect(requests).toHaveLength(0);
	});

	it.each([200, 403, 500])(
		"retains API error details for HTTP %i",
		async (responseStatus) => {
			status = responseStatus;
			apiSuccess = false;
			const result = await runCli(["heartbeats", "list"]);
			expect(result.code).toBe(1);
			expect(result.stdout).toBe("");
			expect(result.stderr).toContain("Heartbeat access denied");
		},
	);

	it("fails on malformed API responses and missing authentication", async () => {
		malformedResponse = true;
		const malformed = await runCli(["heartbeats", "list"]);
		expect(malformed.code).toBe(1);
		expect(malformed.stdout).toBe("");
		expect(malformed.stderr).toContain("malformed");
		requests.length = 0;
		const unauthenticated = await runCli(["heartbeats", "list"], "", false);
		expect(unauthenticated.code).toBe(1);
		expect(unauthenticated.stdout).toBe("");
		expect(requests).toHaveLength(0);
	});

	it("uses the generated catalog for discovery and help, excluding heartbeat ping", async () => {
		const catalog = await runCli(["cli", "commands"], "", false);
		expect(catalog.code).toBe(0);
		const commands = JSON.parse(catalog.stdout);
		expect(
			commands.commands.map(
				(command: { operationId: string }) => command.operationId,
			),
		).toContain("createHeartbeat");
		expect(
			commands.commands.map(
				(command: { operationId: string }) => command.operationId,
			),
		).not.toContain("pingHeartbeat");
		const help = await runCli(["heartbeats", "create", "--help"], "", false);
		expect(help.code).toBe(0);
		expect(help.stdout).toContain("--grace-period");
		expect(help.stdout).toContain("--body");
		const search = await runCli(
			["cli", "search", "delete heartbeat"],
			"",
			false,
		);
		expect(search.code).toBe(0);
		expect(JSON.parse(search.stdout)[0].command).toBe(
			"onlineornot heartbeats delete",
		);
		expect(requests).toHaveLength(0);
	});

	it("keeps existing checks help and machine-readable version working", async () => {
		const help = await runCli(["checks", "--help"], "", false);
		expect(help.code).toBe(0);
		expect(help.stdout).toContain("create <name> <url>");
		expect(help.stdout).toContain("view <id>");
		const version = await runCli(["--version"], "", false);
		const manifest = JSON.parse(await readFile("package.json", "utf8"));
		expect(version.stdout).toBe(`${manifest.version}\n`);
		expect(requests).toHaveLength(0);
	});
});
