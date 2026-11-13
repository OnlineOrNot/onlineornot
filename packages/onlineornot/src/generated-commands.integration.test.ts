import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

import type { PublicCheckResultsResultInfo } from "@onlineornot/api";
import { build } from "esbuild";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";

import { checkCommandCases } from "./fixtures/check-command-cases";
import { resourceCommandCases } from "./fixtures/resource-command-cases";

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
type FixtureApiResult = z.infer<ReturnType<typeof z.json>>;
let fixtureResult: FixtureApiResult | undefined;
let fixturePagination: PublicCheckResultsResultInfo | null | undefined;
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
				? request.url === "/v1/tokens/verify"
					? { id: "token1234", status: "active" }
					: (fixtureResult ?? { id: "heartbeat123", name: "Nightly backup" })
				: null,
			errors: apiSuccess
				? []
				: [{ code: 1001, message: "Heartbeat access denied" }],
			messages: [],
			result_info:
				fixturePagination === null
					? undefined
					: (fixturePagination ?? {
							page: 2,
							per_page: 5,
							count: 1,
							total_count: 12,
						}),
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
		`if (process.env.CLI_FIXTURE_TTY === "1") {
	Object.defineProperty(process.stdin, "isTTY", { value: true });
	Object.defineProperty(process.stderr, "isTTY", { value: true });
	}
	const send = globalThis.fetch;
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
	fixtureResult = undefined;
	fixturePagination = undefined;
});

afterAll(async () => {
	await new Promise<void>((resolve) => server.close(() => resolve()));
	await rm(directory, { recursive: true, force: true });
});

function runCli(
	args: string[],
	input = "",
	authenticated = true,
	options: { interactive?: boolean; ci?: boolean; logLevel?: string } = {},
) {
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
						USERPROFILE: directory,
						CLI_FIXTURE_TTY: options.interactive ? "1" : "0",
						CI: options.ci ? "1" : "",
						ONLINEORNOT_LOG: options.logLevel ?? "log",
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

	it("shows generated checks help and machine-readable version", async () => {
		const help = await runCli(["checks", "--help"], "", false);
		expect(help.code).toBe(0);
		expect(help.stdout).toContain("checks http");
		expect(help.stdout).not.toContain("create <name> <url>");
		expect(help.stdout).toContain("get <id>");
		expect(help.stdout).not.toContain("view <id>");
		expect(help.stdout).not.toContain("update <id>");
		const version = await runCli(["--version"], "", false);
		const manifest = JSON.parse(await readFile("package.json", "utf8"));
		expect(version.stdout).toBe(`${manifest.version}\n`);
		expect(requests).toHaveLength(0);
	});
});

describe("generated resource management through the executable and real HTTP", () => {
	it.each(resourceCommandCases)(
		"sends $operationId to its API endpoint",
		async (scenario) => {
			const result = await runCli(scenario.args, "", !scenario.public);
			expect(result.code).toBe(0);
			expect(JSON.parse(result.stdout)).toEqual({
				id: "heartbeat123",
				name: "Nightly backup",
			});
			expect(requests).toHaveLength(1);
			expect(requests[0].method).toBe(scenario.method);
			expect(requests[0].url).toBe(scenario.url);
			expect(requests[0].authorization).toBe(
				scenario.public ? undefined : "Bearer fixture-token",
			);
			expect(requests[0].body ? JSON.parse(requests[0].body) : null).toEqual(
				scenario.body,
			);
		},
	);

	it.each(
		resourceCommandCases.filter((scenario) => scenario.method === "DELETE"),
	)("requires confirmation before $operationId", async (scenario) => {
		const result = await runCli(
			scenario.args.filter((arg) => arg !== "--force"),
		);
		expect(result.code).toBe(1);
		expect(result.stdout).toBe("");
		expect(result.stderr).toContain("--force");
		expect(requests).toHaveLength(0);
	});

	it("discovers every new command and nested help without exposing deferred operations", async () => {
		const catalog = await runCli(["cli", "commands"], "", false);
		expect(catalog.code).toBe(0);
		const operations = JSON.parse(catalog.stdout).commands.map(
			(command: { operationId: string }) => command.operationId,
		);
		expect(operations).toHaveLength(89);
		for (const scenario of resourceCommandCases)
			expect(operations).toContain(scenario.operationId);
		for (const operation of [
			"getWebhookDeliverySummary",
			"getWebhookDeliveryActivity",
			"listWebhookDeliveries",
			"getWebhookDelivery",
			"getDnsCheck",
			"moveResources",
		])
			expect(operations).not.toContain(operation);
		for (const args of [
			["env"],
			["maintenance"],
			["status-pages"],
			["status-pages", "incidents"],
			["status-pages", "incidents", "updates"],
			["status-pages", "incidents", "updates", "create"],
		]) {
			const help = await runCli([...args, "--help"], "", false);
			expect(help.code).toBe(0);
			expect(help.stdout).toContain("create");
		}
		const search = await runCli(
			["cli", "search", "status-pages incidents updates create"],
			"",
			false,
		);
		expect(JSON.parse(search.stdout)[0].command).toBe(
			"onlineornot status-pages incidents updates create",
		);
		expect(requests).toHaveLength(0);
	}, 20000);

	it.each(["pages", "status"])(
		"does not register the unapproved resource group %s",
		async (resource) => {
			const result = await runCli([resource, "list"], "", false);
			expect(result.code).toBe(1);
			expect(result.stdout).toBe("");
			expect(result.stderr).toMatch(/Unknown (command|argument)/);
			expect(result.stderr).toContain(resource);
			expect(requests).toHaveLength(0);
		},
	);

	it("supports flags for nested object arrays, repeated values and camel-case wire fields", async () => {
		const token = await runCli([
			"tokens",
			"create",
			"--name",
			"Log sender",
			"--grants",
			'[{"scope":"LOGS","permission":"SEND"}]',
			"--expires-at",
			"2027-01-01T00:00:00.000Z",
			"--project-id",
			"project1234567890",
		]);
		expect(token.code).toBe(0);
		expect(JSON.parse(requests[0].body)).toEqual({
			name: "Log sender",
			grants: [{ scope: "LOGS", permission: "SEND" }],
			expiresAt: "2027-01-01T00:00:00.000Z",
			project_id: "project1234567890",
		});
		const incident = await runCli([
			"status-pages",
			"incidents",
			"create",
			"status1234",
			"--title",
			"API",
			"--description",
			"Investigating",
			"--status",
			"INVESTIGATING",
			"--components",
			'[{"id":"component123","status":"MAJOR_OUTAGE"}]',
		]);
		expect(incident.code).toBe(0);
		expect(JSON.parse(requests[1].body)).toEqual({
			title: "API",
			description: "Investigating",
			status: "INVESTIGATING",
			components: [{ id: "component123", status: "MAJOR_OUTAGE" }],
		});
		const sorted = await runCli([
			"status-pages",
			"components",
			"sort-order",
			"status1234",
			"--component-ids",
			"component123",
			"--component-ids",
			"component456",
		]);
		expect(sorted.code).toBe(0);
		expect(JSON.parse(requests[2].body)).toEqual({
			component_ids: ["component123", "component456"],
		});
	});

	it.each(["webhooks", "env", "maintenance"])(
		"paginates and filters %s without fetching additional pages",
		async (resource) => {
			const result = await runCli([
				resource,
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
			expect(requests).toHaveLength(1);
			const query = new URL(requests[0].url, "http://fixture").searchParams;
			expect(query.get("page")).toBe("2");
			expect(query.get("per_page")).toBe("5");
			expect(query.getAll("project_id")).toEqual([
				"unassigned",
				"project1234567890",
			]);
			expect(requests[0].organisation).toBe("organization1234");
			expect(result.stderr).toContain('result_info: {"page":2');
		},
	);

	it.each(["flags", "file", "stdin"])(
		"redacts environment values in %s dry-runs without authenticating or sending",
		async (input) => {
			const value = "fixture-preview-value";
			const payload = JSON.stringify({
				name: "API_TOKEN",
				type: "secret",
				value,
			});
			const file = path.join(directory, "environment-preview.json");
			await writeFile(file, payload);
			const args =
				input === "flags"
					? ["--name", "API_TOKEN", "--type", "secret", "--value", value]
					: ["--body", input === "file" ? `@${file}` : "-"];
			const result = await runCli(
				["env", "create", ...args, "--dry-run"],
				input === "stdin" ? payload : "",
				false,
			);
			expect(result.code).toBe(0);
			expect(result.stdout).not.toContain(value);
			expect(result.stderr).not.toContain(value);
			expect(JSON.parse(result.stdout).body).toEqual({
				name: "API_TOKEN",
				type: "secret",
				value: "<redacted>",
			});
			expect(requests).toHaveLength(0);
		},
	);

	it("redacts status-page passwords and previews deletions without confirmation", async () => {
		const preview = await runCli(
			[
				"status-pages",
				"create",
				"--name",
				"Private",
				"--subdomain",
				"private",
				"--password",
				"fixture-password",
				"--dry-run",
			],
			"",
			false,
		);
		expect(preview.code).toBe(0);
		expect(preview.stdout).not.toContain("fixture-password");
		expect(JSON.parse(preview.stdout).body.password).toBe("<redacted>");
		const deletion = await runCli(
			["tokens", "delete", "token123456", "--dry-run"],
			"",
			false,
		);
		expect(deletion.code).toBe(0);
		expect(JSON.parse(deletion.stdout)).toMatchObject({
			method: "DELETE",
			path: "/v1/tokens/token123456",
		});
		expect(requests).toHaveLength(0);
	});

	it.each([
		{
			args: [
				"tokens",
				"create",
				"--body",
				'{"name":"Invalid","grants":[{"scope":"PROJECTS","permission":"SEND"}]}',
			],
			error: "grants",
		},
		{
			args: [
				"tokens",
				"create",
				"--name",
				"Invalid",
				"--grants",
				"[]",
				"--expires-at",
				"tomorrow",
			],
			error: "expiresAt",
		},
		{
			args: [
				"env",
				"create",
				"--name",
				"lowercase",
				"--type",
				"secret",
				"--value",
				"x",
			],
			error: "name",
		},
		{
			args: ["env", "update", "variable123", "--body", '{"type":"config"}'],
			error: "type",
		},
		{
			args: ["env", "update", "variable123", "--body", '{"project_id":null}'],
			error: "project_id",
		},
		{
			args: [
				"webhooks",
				"update",
				"webhook123",
				"--body",
				'{"project_id":null}',
			],
			error: "project_id",
		},
		{
			args: [
				"maintenance",
				"update",
				"window1234",
				"--body",
				'{"project_id":null}',
			],
			error: "project_id",
		},
		{
			args: [
				"webhooks",
				"create",
				"--url",
				"https://example.com",
				"--events",
				"not-an-event",
			],
			error: "events",
		},
		{
			args: [
				"status-pages",
				"components",
				"create",
				"status1234",
				"--status",
				"NOT_A_STATUS",
				"--name",
				"API",
			],
			error: "status",
		},
		{
			args: [
				"status-pages",
				"subscribers",
				"create",
				"status1234",
				"--email-address",
				"invalid",
			],
			error: "email_address",
		},
		{
			args: [
				"status-pages",
				"incidents",
				"updates",
				"get",
				"status1234",
				"incident123",
			],
			error: "Not enough non-option arguments",
		},
		{
			args: [
				"status-pages",
				"scheduled-maintenance",
				"create",
				"status1234",
				"--body",
				'{"title":"Maintenance","description":"Test","start_date":"tomorrow","duration_minutes":0}',
			],
			error: "start_date",
		},
		{ args: ["projects", "create", "--body", '{"name":""}'], error: "name" },
		{ args: ["webhooks", "deliveries"], error: "deliveries" },
	])(
		"rejects invalid resource input before HTTP: $error",
		async ({ args, error }) => {
			const result = await runCli([...args, "--dry-run"], "", false);
			expect(result.code).toBe(1);
			expect(result.stdout).toBe("");
			expect(result.stderr).toContain(error);
			expect(requests).toHaveLength(0);
		},
	);
});

describe("generated resource group aliases through the executable", () => {
	const aliases = [
		{ group: "env", alias: "environment-variables" },
		{ group: "maintenance", alias: "maintenance-windows" },
	];
	const cases = aliases.flatMap(({ group, alias }) =>
		resourceCommandCases
			.filter((scenario) => scenario.args[0] === group)
			.map((scenario) => ({
				...scenario,
				args: [alias, ...scenario.args.slice(1)],
			})),
	);

	it.each(cases)(
		"sends $operationId through its long-form alias",
		async (scenario) => {
			const result = await runCli(scenario.args);
			expect(result.code).toBe(0);
			expect(JSON.parse(result.stdout)).toEqual({
				id: "heartbeat123",
				name: "Nightly backup",
			});
			expect(requests).toHaveLength(1);
			expect(requests[0].method).toBe(scenario.method);
			expect(requests[0].url).toBe(scenario.url);
			expect(requests[0].authorization).toBe("Bearer fixture-token");
			expect(requests[0].body ? JSON.parse(requests[0].body) : null).toEqual(
				scenario.body,
			);
		},
	);

	it.each(cases.filter((scenario) => scenario.method === "DELETE"))(
		"retains deletion confirmation for alias $operationId",
		async (scenario) => {
			const result = await runCli(
				scenario.args.filter((arg) => arg !== "--force"),
			);
			expect(result.code).toBe(1);
			expect(result.stdout).toBe("");
			expect(result.stderr).toContain("--force");
			expect(requests).toHaveLength(0);
		},
	);

	it.each(aliases)(
		"discovers $alias while keeping $group canonical and previews without HTTP",
		async ({ group, alias }) => {
			const help = await runCli([alias, "--help"], "", false);
			expect(help.code).toBe(0);
			expect(help.stdout).toContain("create");
			const catalog = await runCli(["cli", "commands"], "", false);
			const commands = JSON.parse(catalog.stdout).commands;
			expect(commands).toHaveLength(89);
			const create = commands.find(
				(command: { command: string }) =>
					command.command === `onlineornot ${group} create`,
			);
			expect(create.aliases).toEqual([`onlineornot ${alias} create`]);
			const search = await runCli(
				["cli", "search", `${alias} create`],
				"",
				false,
			);
			expect(JSON.parse(search.stdout)[0].command).toBe(
				`onlineornot ${group} create`,
			);
			const scenario = cases.find(
				(entry) => entry.args[0] === alias && entry.args[1] === "create",
			);
			if (!scenario) throw new Error("Missing alias create scenario");
			const preview = await runCli([...scenario.args, "--dry-run"], "", false);
			expect(preview.code).toBe(0);
			const request = JSON.parse(preview.stdout);
			expect(request.path).toBe(scenario.url);
			if (group === "env") expect(request.body.value).toBe("<redacted>");
			else expect(request.body).toEqual(scenario.body);
			expect(requests).toHaveLength(0);
		},
		20000,
	);

	it.each([
		{
			args: [
				"environment-variables",
				"update",
				"variable123",
				"--body",
				'{"type":"config"}',
			],
			error: "type",
		},
		{
			args: [
				"maintenance-windows",
				"update",
				"window1234",
				"--body",
				'{"project_id":null}',
			],
			error: "project_id",
		},
	])(
		"rejects invalid alias input before HTTP: $error",
		async ({ args, error }) => {
			const result = await runCli([...args, "--dry-run"], "", false);
			expect(result.code).toBe(1);
			expect(result.stdout).toBe("");
			expect(result.stderr).toContain(error);
			expect(requests).toHaveLength(0);
		},
	);
});

describe("generated type-specific check commands through the executable", () => {
	it.each(checkCommandCases)(
		"sends $operationId to its existing API operation",
		async (scenario) => {
			fixtureResult = scenario.result;
			if (scenario.operationId.endsWith("Results")) fixturePagination = null;
			const result = await runCli(scenario.args);
			expect(result.code).toBe(0);
			expect(JSON.parse(result.stdout)).toEqual(scenario.result);
			expect(requests).toHaveLength(1);
			expect(requests[0].method).toBe(scenario.method);
			expect(requests[0].url).toBe(scenario.url);
			expect(requests[0].authorization).toBe("Bearer fixture-token");
			expect(requests[0].body ? JSON.parse(requests[0].body) : null).toEqual(
				scenario.body,
			);
			if (scenario.operationId.endsWith("Results")) {
				expect(result.stderr).not.toContain("result_info:");
				expect(JSON.parse(result.stdout).result_info).toEqual({
					page: 2,
					per_page: 5,
					count: 0,
					total_count: 0,
				});
			} else
				expect(result.stderr).toContain(
					'result_info: {"page":2,"per_page":5,"count":1,"total_count":12}',
				);
		},
	);

	it("discovers every typed command without restoring untyped creation", async () => {
		const catalog = await runCli(["cli", "commands"], "", false);
		const commands = JSON.parse(catalog.stdout).commands;
		expect(commands).toHaveLength(89);
		for (const scenario of checkCommandCases)
			expect(
				commands.map((command: { operationId: string }) => command.operationId),
			).toContain(scenario.operationId);
		expect(
			commands.map((command: { command: string }) => command.command),
		).not.toContain("onlineornot checks create");
		const root = await runCli(["checks", "--help"], "", false);
		for (const word of [
			"http",
			"browser",
			"dns",
			"tcp",
			"list",
			"delete",
			"get",
			"move",
		])
			expect(root.stdout).toContain(`checks ${word}`);
		expect(root.stdout).not.toContain("checks create");
		for (const group of ["http", "browser", "dns", "tcp"]) {
			const help = await runCli(
				["checks", group, "create", "--help"],
				"",
				false,
			);
			expect(help.code).toBe(0);
			expect(help.stdout).toContain("--name");
			expect(help.stdout).not.toContain("--type");
		}
		const search = await runCli(
			["cli", "search", "checks dns create"],
			"",
			false,
		);
		expect(JSON.parse(search.stdout)[0].command).toBe(
			"onlineornot checks dns create",
		);
		expect(requests).toHaveLength(0);
	}, 20000);

	it("removes checks create name url rather than silently keeping an HTTP fallback", async () => {
		const result = await runCli([
			"checks",
			"create",
			"Legacy",
			"https://example.com",
			"--json",
		]);
		expect(result.code).toBe(1);
		expect(result.stderr).toContain("Unknown");
		expect(requests).toHaveLength(0);
	});

	it.each([
		["checks", "view", "check1234"],
		["checks", "update", "check1234", "--name", "Renamed"],
		["checks", "list", "--json"],
		["checks", "get", "check1234", "--json"],
		["checks", "delete", "check1234", "--force", "--json"],
	])("rejects removed command or flags %j before HTTP", async (...args) => {
		const result = await runCli(args);
		expect(result.code).toBe(1);
		expect(result.stdout).toBe("");
		expect(result.stderr).toContain("Unknown");
		expect(requests).toHaveLength(0);
	});

	it("lists one filtered page as JSON without a token verification request", async () => {
		fixtureResult = [
			{ id: "dns12345", name: "DNS", check_type: "DNS" },
			{ id: "tcp12345", name: "TCP", check_type: "TCP" },
		];
		fixturePagination = { page: 2, per_page: 2, count: 2, total_count: 9 };
		const result = await runCli([
			"checks",
			"list",
			"--page",
			"2",
			"--per-page",
			"2",
			"--search",
			"prod & api",
			"--project-id",
			"project1234567890",
			"--project-id",
			"project0987654321",
			"--filter",
			"DOWN",
			"--organisation",
			"org1234567890123",
		]);
		expect(result.code).toBe(0);
		expect(JSON.parse(result.stdout)).toEqual(fixtureResult);
		expect(result.stderr).toBe(
			`result_info: ${JSON.stringify(fixturePagination)}\n`,
		);
		expect(requests).toHaveLength(1);
		expect(requests[0].method).toBe("GET");
		expect(requests[0].url).toBe(
			"/v1/checks?page=2&per_page=2&search=prod%20%26%20api&project_id=project1234567890&project_id=project0987654321&filter=DOWN",
		);
		expect(requests[0].organisation).toBe("org1234567890123");
		expect(requests[0].authorization).toBe("Bearer fixture-token");
	});

	it.each([[], [{ id: "check1234", check_type: "UPTIME" }]])(
		"leaves omitted pagination to the API and returns only its page %j",
		async (...checks) => {
			fixtureResult = checks;
			fixturePagination = {
				page: 1,
				per_page: 20,
				count: checks.length,
				total_count: 41,
			};
			const result = await runCli(["checks", "list"]);
			expect(result.code).toBe(0);
			expect(JSON.parse(result.stdout)).toEqual(checks);
			expect(result.stderr).toBe(
				`result_info: ${JSON.stringify(fixturePagination)}\n`,
			);
			expect(requests).toHaveLength(1);
			expect(requests[0].url).toBe("/v1/checks");
		},
	);

	it("keeps debug diagnostics on stderr and resource JSON on stdout", async () => {
		fixtureResult = [{ id: "check1234", check_type: "DNS" }];
		const result = await runCli(["checks", "list"], "", true, {
			logLevel: "debug",
		});
		expect(result.code).toBe(0);
		expect(JSON.parse(result.stdout)).toEqual(fixtureResult);
		expect(result.stderr).toContain(
			"-- START API REQUEST: GET https://api.onlineornot.com/v1/checks",
		);
		expect(result.stderr).toContain("-- START API RESPONSE:");
		expect(result.stderr).toContain("[REDACTED]");
		expect(result.stderr).not.toContain("fixture-token");
		expect(result.stderr).toContain("result_info:");
		expect(requests).toHaveLength(1);
	});

	it("requires --force for unattended check deletion before authentication or HTTP", async () => {
		const result = await runCli(["checks", "delete", "check1234"], "", false);
		expect(result.code).toBe(1);
		expect(result.stdout).toBe("");
		expect(result.stderr).toContain("requires --force");
		expect(requests).toHaveLength(0);
	});

	it("previews deletion without credentials, confirmation or HTTP", async () => {
		const result = await runCli(
			["checks", "delete", "check1234", "--dry-run"],
			"",
			false,
		);
		expect(result.code).toBe(0);
		expect(JSON.parse(result.stdout)).toEqual({
			operationId: "deleteCheck",
			method: "DELETE",
			path: "/v1/checks/check1234",
			headers: {},
		});
		expect(requests).toHaveLength(0);
	});

	it.each([
		{ answer: "yes\n", code: 0 },
		{ answer: "n\n", code: 1 },
		{ answer: "\n", code: 1 },
		{ answer: "", code: 1 },
	])(
		"confirms check deletion interactively with $answer",
		async ({ answer, code }) => {
			fixtureResult = { id: "check1234" };
			fixturePagination = null;
			const result = await runCli(
				["checks", "delete", "check1234"],
				answer,
				true,
				{ interactive: true },
			);
			expect(result.code).toBe(code);
			expect(result.stderr).toContain("Permanently delete this resource?");
			if (code === 0) {
				expect(JSON.parse(result.stdout)).toEqual({ id: "check1234" });
				expect(requests).toHaveLength(1);
				expect(requests[0].method).toBe("DELETE");
				expect(requests[0].url).toBe("/v1/checks/check1234");
			} else {
				expect(result.stdout).toBe("");
				expect(result.stderr).toContain("cancelled");
				expect(requests).toHaveLength(0);
			}
		},
	);

	it("requires --force in CI even with terminal input and accepts explicit force", async () => {
		const blocked = await runCli(
			["checks", "delete", "check1234"],
			"yes\n",
			true,
			{ interactive: true, ci: true },
		);
		expect(blocked.code).toBe(1);
		expect(blocked.stdout).toBe("");
		expect(blocked.stderr).toContain("requires --force");
		expect(blocked.stderr).not.toContain("Permanently delete");
		expect(requests).toHaveLength(0);
		fixtureResult = { id: "check1234" };
		fixturePagination = null;
		const forced = await runCli(
			["checks", "delete", "check1234", "--force"],
			"",
			true,
			{ interactive: true, ci: true },
		);
		expect(forced.code).toBe(0);
		expect(JSON.parse(forced.stdout)).toEqual({ id: "check1234" });
		expect(requests).toHaveLength(1);
		expect(requests[0].method).toBe("DELETE");
	}, 15000);

	it.each([
		["--page", "0"],
		["--page", "1.5"],
		["--per-page", "0"],
		["--per-page", "1.5"],
		["--filter", "UNKNOWN"],
	])(
		"rejects invalid check pagination or filters %j before HTTP",
		async (...flags) => {
			const result = await runCli(["checks", "list", ...flags]);
			expect(result.code).toBe(1);
			expect(result.stdout).toBe("");
			expect(requests).toHaveLength(0);
		},
	);

	it.each([
		["checks", "list"],
		["checks", "get", "check1234"],
		["checks", "delete", "check1234", "--force"],
	])("fails without credentials for %j before HTTP", async (...args) => {
		const result = await runCli(args, "", false);
		expect(result.code).toBe(1);
		expect(result.stdout).toBe("");
		expect(result.stderr).toContain("Not logged in");
		expect(requests).toHaveLength(0);
	});

	it.each([
		{ args: ["checks", "list"], status: 401 },
		{ args: ["checks", "list"], status: 200 },
		{ args: ["checks", "get", "check1234"], status: 404 },
		{ args: ["checks", "delete", "check1234", "--force"], status: 403 },
		{
			args: ["checks", "http", "update", "check1234", "--name", "Renamed"],
			status: 500,
		},
	])("exits nonzero for HTTP $status on $args", async (scenario) => {
		status = scenario.status;
		apiSuccess = false;
		const result = await runCli(scenario.args);
		expect(result.code).toBe(1);
		expect(result.stdout).toBe("");
		expect(result.stderr).toContain("Heartbeat access denied");
		expect(requests).toHaveLength(1);
	});

	it.each([
		["heartbeats", "update", "heartbeat123"],
		...["http", "browser", "dns", "tcp"].map((type) => [
			"checks",
			type,
			"update",
			"check1234",
		]),
		...resourceCommandCases
			.filter(
				(scenario) => scenario.method === "PATCH" || scenario.method === "PUT",
			)
			.map((scenario) =>
				scenario.args.slice(
					0,
					scenario.args.findIndex((word) => word.startsWith("--")),
				),
			),
	])(
		"rejects empty updates for %j before credentials or HTTP",
		async (...args) => {
			for (const flags of [
				[],
				["--body", "{}"],
				["--organisation", "org1234567890123"],
			]) {
				const result = await runCli([...args, ...flags], "", false);
				expect(result.code).toBe(1);
				expect(result.stdout).toBe("");
				expect(result.stderr).toContain(
					"Update requires at least one body field",
				);
			}
			expect(requests).toHaveLength(0);
		},
		15000,
	);

	it("rejects empty updates from files and stdin before HTTP", async () => {
		const file = path.join(directory, "empty-update.json");
		await writeFile(file, "{}");
		for (const body of [`@${file}`, "-"]) {
			const result = await runCli(
				["checks", "http", "update", "check1234", "--body", body],
				"{}",
				false,
			);
			expect(result.code).toBe(1);
			expect(result.stdout).toBe("");
			expect(result.stderr).toContain(
				"Update requires at least one body field",
			);
		}
		expect(requests).toHaveLength(0);
	});

	it.each(["http", "browser", "dns", "tcp"])(
		"preserves explicit false, zero and empty arrays when updating %s checks",
		async (type) => {
			const body = {
				muted: false,
				paused: false,
				confirmation_period_seconds: 0,
				recovery_period_seconds: 0,
				reminder_alert_interval_minutes: 0,
				assertions: [],
			};
			const result = await runCli([
				"checks",
				type,
				"update",
				"check1234",
				"--body",
				JSON.stringify(body),
			]);
			expect(result.code).toBe(0);
			expect(requests).toHaveLength(1);
			expect(requests[0].method).toBe("PATCH");
			expect(JSON.parse(requests[0].body)).toEqual(body);
		},
	);

	it.each([
		{ type: "http", flags: ["--http-body", ""], body: { body: "" } },
		{ type: "http", flags: ["--no-muted"], body: { muted: false } },
		{
			type: "http",
			flags: ["--confirmation-period-seconds", "0"],
			body: { confirmation_period_seconds: 0 },
		},
		{
			type: "http",
			flags: [
				"--body",
				'{"headers":{},"auth_username":"","auth_password":"","text_to_search_for":""}',
			],
			body: {
				headers: {},
				auth_username: "",
				auth_password: "",
				text_to_search_for: "",
			},
		},
		{
			type: "dns",
			flags: ["--body", '{"dns_resolver":null}'],
			body: { dns_resolver: null },
		},
		{
			type: "tcp",
			flags: ["--body", '{"tcp_data":null}'],
			body: { tcp_data: null },
		},
		{ type: "tcp", flags: ["--data", ""], body: { tcp_data: "" } },
		{ type: "browser", flags: ["--body", '{"url":null}'], body: { url: null } },
	])(
		"accepts a supplied falsy update instead of treating it as empty: $type $flags",
		async ({ type, flags, body }) => {
			const result = await runCli([
				"checks",
				type,
				"update",
				"check1234",
				...flags,
			]);
			expect(result.code).toBe(0);
			expect(requests).toHaveLength(1);
			expect(JSON.parse(requests[0].body)).toEqual(body);
		},
	);

	it.each(["UPTIME", "BROWSER", "DNS", "TCP"])(
		"retrieves %s checks without requiring type-specific routing",
		async (type) => {
			fixtureResult = { id: "check1234", check_type: type };
			const result = await runCli(["checks", "get", "check1234"]);
			expect(result.code).toBe(0);
			expect(JSON.parse(result.stdout)).toEqual(fixtureResult);
			expect(requests).toHaveLength(1);
			expect(requests[0].url).toBe("/v1/checks/check1234");
		},
	);

	it.each([
		{
			args: [
				"checks",
				"http",
				"create",
				"--name",
				"HTTP",
				"--url",
				"https://example.com",
				"--method",
				"POST",
				"--http-body",
				"payload",
				"--headers",
				'{"Authorization":"Bearer fixture-secret"}',
				"--auth-password",
				"fixture-password",
				"--no-verify-ssl",
			],
			path: "/v1/checks/uptime",
			expected: {
				name: "HTTP",
				url: "https://example.com",
				method: "POST",
				body: "payload",
				headers: { Authorization: "Bearer fixture-secret" },
				auth_password: "fixture-password",
				verify_ssl: false,
			},
		},
		{
			args: [
				"checks",
				"browser",
				"create",
				"--name",
				"Browser",
				"--url",
				"https://example.com",
				"--runtime",
				"NODE24_PLAYWRIGHT",
			],
			path: "/v1/checks/browser",
			expected: {
				name: "Browser",
				url: "https://example.com",
				version: "NODE24_PLAYWRIGHT",
			},
		},
		{
			args: [
				"checks",
				"dns",
				"create",
				"--name",
				"DNS",
				"--domain",
				"example.com",
				"--record-type",
				"A",
				"--protocol",
				"TCP",
			],
			path: "/v1/checks/dns",
			expected: {
				name: "DNS",
				dns_domain: "example.com",
				dns_record_type: "A",
				dns_protocol: "TCP",
			},
		},
		{
			args: [
				"checks",
				"tcp",
				"create",
				"--name",
				"TCP",
				"--hostname",
				"example.com",
				"--port",
				"443",
				"--ip-family",
				"IPv6",
				"--data",
				"probe",
				"--should-fail",
				"false",
			],
			path: "/v1/checks/tcp",
			expected: {
				name: "TCP",
				tcp_hostname: "example.com",
				tcp_port: 443,
				tcp_ip_family: "IPv6",
				tcp_data: "probe",
				tcp_should_fail: false,
			},
		},
	])(
		"maps type-specific flags without injecting omitted API defaults: $path",
		async ({ args, path: apiPath, expected }) => {
			const result = await runCli([
				...args,
				"--organisation",
				"org1234567890123",
			]);
			expect(result.code).toBe(0);
			expect(requests).toHaveLength(1);
			expect(requests[0].url).toBe(apiPath);
			expect(requests[0].organisation).toBe("org1234567890123");
			expect(JSON.parse(requests[0].body)).toEqual(expected);
		},
	);

	it("supports JSON file and stdin bodies while keeping HTTP payload separate", async () => {
		const scenario = checkCommandCases.find(
			(entry) => entry.operationId === "createBrowserCheck",
		);
		if (!scenario) throw new Error("Missing browser create fixture");
		const file = path.join(directory, "browser-check.json");
		await writeFile(file, JSON.stringify(scenario.body));
		const browser = await runCli([
			"checks",
			"browser",
			"create",
			"--body",
			`@${file}`,
		]);
		expect(browser.code).toBe(0);
		expect(JSON.parse(requests[0].body)).toEqual(scenario.body);
		const body = {
			name: "HTTP",
			url: "https://example.com",
			method: "POST",
			body: "monitored payload",
		};
		const http = await runCli(
			["checks", "http", "create", "--body", "-"],
			JSON.stringify(body),
		);
		expect(http.code).toBe(0);
		expect(JSON.parse(requests[1].body)).toEqual(body);
	});

	it.each(checkCommandCases.filter((scenario) => scenario.body !== null))(
		"previews $operationId without credentials or HTTP and redacts sensitive input",
		async (scenario) => {
			const result = await runCli([...scenario.args, "--dry-run"], "", false);
			expect(result.code).toBe(0);
			const preview = JSON.parse(result.stdout);
			expect(preview.path).toBe(scenario.url);
			const body = z.record(z.string(), z.json()).parse(scenario.body);
			for (const name of [
				"headers",
				"body",
				"auth_username",
				"auth_password",
				"script",
				"tcp_data",
			]) {
				if (body[name] !== undefined)
					expect(preview.body[name]).toBe("<redacted>");
			}
			expect(requests).toHaveLength(0);
		},
	);

	it.each([
		{
			args: ["checks", "http", "create", "--name", "Missing URL"],
			error: "url",
		},
		{
			args: ["checks", "browser", "create", "--name", "Missing target"],
			error: "url, script",
		},
		{
			args: [
				"checks",
				"http",
				"create",
				"--body",
				'{"name":"Wrong type","url":"https://example.com","type":"BROWSER_CHECK"}',
			],
			error: "type",
		},
		{
			args: [
				"checks",
				"dns",
				"create",
				"--name",
				"DNS",
				"--domain",
				"example.com",
				"--record-type",
				"INVALID",
			],
			error: "record-type",
		},
		{
			args: [
				"checks",
				"tcp",
				"create",
				"--name",
				"TCP",
				"--hostname",
				"example.com",
				"--port",
				"65536",
			],
			error: "tcp_port",
		},
		{
			args: [
				"checks",
				"http",
				"create",
				"--body",
				'{"name":"HTTP","url":"https://example.com"}',
				"--http-body",
				"conflict",
			],
			error: "conflicts",
		},
		{
			args: [
				"checks",
				"dns",
				"update",
				"check1234",
				"--body",
				'{"project_id":null}',
			],
			error: "project_id",
		},
		{
			args: [
				"checks",
				"tcp",
				"update",
				"check1234",
				"--body",
				'{"url":"https://example.com"}',
			],
			error: "url",
		},
		{ args: ["checks", "dns", "results", "check1234"], error: "from" },
		{
			args: [
				"checks",
				"tcp",
				"results",
				"check1234",
				"--from",
				"not-a-date",
				"--to",
				"2026-11-01T01:00:00Z",
			],
			error: "from",
		},
		{
			args: [
				"checks",
				"browser",
				"incidents",
				"check1234",
				"--per-page",
				"101",
			],
			error: "per_page",
		},
		{
			args: [
				"checks",
				"http",
				"create",
				"--name",
				"HTTP",
				"--url",
				"https://example.com",
				"--type",
				"UPTIME_CHECK",
			],
			error: "type",
		},
		{
			args: ["checks", "move", "check1234", "--body", '{"project_id":"short"}'],
			error: "project_id",
		},
	])(
		"rejects invalid check input before auth or HTTP: $error",
		async ({ args, error }) => {
			const result = await runCli([...args, "--dry-run"], "", false);
			expect(result.code).toBe(1);
			expect(result.stdout).toBe("");
			expect(result.stderr).toContain(error);
			expect(requests).toHaveLength(0);
		},
	);

	it("fails without credentials and reports API errors with a nonzero exit", async () => {
		const args = [
			"checks",
			"dns",
			"create",
			"--name",
			"DNS",
			"--domain",
			"example.com",
			"--record-type",
			"A",
		];
		const unauthenticated = await runCli(args, "", false);
		expect(unauthenticated.code).toBe(1);
		expect(unauthenticated.stderr).toContain("Not logged in");
		expect(requests).toHaveLength(0);
		status = 403;
		apiSuccess = false;
		const denied = await runCli(args);
		expect(denied.code).toBe(1);
		expect(denied.stdout).toBe("");
		expect(denied.stderr).toContain("Heartbeat access denied");
		expect(requests).toHaveLength(1);
	});
});
