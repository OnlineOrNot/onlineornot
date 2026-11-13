import { spawn } from "node:child_process";
import type { ChildProcessWithoutNullStreams } from "node:child_process";
import { EventEmitter, once } from "node:events";
import {
	mkdir,
	mkdtemp,
	readFile,
	rename,
	rm,
	writeFile,
} from "node:fs/promises";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import {
	JSONRPCMessageSchema,
	ProgressNotificationSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { build } from "esbuild";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const apiResource = "https://onlineornot.com";
const mcpResource = "https://mcp.onlineornot.com/mcp";
let directory: string;
let fixturePath: string;

beforeAll(async () => {
	directory = await mkdtemp(path.join(tmpdir(), "onlineornot-mcp-tests-"));
	fixturePath = path.join(directory, "cli.cjs");
	await build({
		entryPoints: ["src/mcp/fixtures/mcp-cli.ts"],
		outfile: fixturePath,
		bundle: true,
		platform: "node",
		format: "cjs",
		external: ["esbuild"],
		define: { "process.env.ONLINEORNOT_SEA": '"false"' },
	});
}, 30_000);

afterAll(async () => {
	await rm(directory, { recursive: true, force: true });
});

function isNetworkAddress(
	address: string | AddressInfo | null,
): address is AddressInfo {
	return address !== null && typeof address !== "string";
}

async function createHarness(
	options: {
		loggedIn?: boolean;
		tokenFailure?: string;
		mcpStatus?: number;
		environmentToken?: string;
		fetchFailure?: "oauth" | "mcp";
		redirect?: boolean;
	} = {},
) {
	const home = await mkdtemp(path.join(directory, "home-"));
	const credentialsPath = path.join(
		home,
		".config/onlineornot/credentials.json",
	);
	await mkdir(path.dirname(credentialsPath), { recursive: true });
	if (options.loggedIn !== false) {
		await writeFile(
			credentialsPath,
			JSON.stringify({
				accessToken: "api-access-original",
				refreshToken: "refresh-0",
				expiresAt: Date.now() + 3_600_000,
				scopes: ["UPTIME_CHECKS:EDIT"],
				user: { email: "mcp@example.test" },
			}),
			{ mode: 0o600 },
		);
	}
	let refreshToken = "refresh-0";
	const resources: string[] = [];
	const messages: ReturnType<typeof JSONRPCMessageSchema.parse>[] = [];
	const receivedMessages = new EventEmitter();
	const authorization: string[] = [];
	const protocolVersions: Array<string | undefined> = [];
	const server = http.createServer(async (req, res) => {
		const chunks: Buffer[] = [];
		for await (const chunk of req) chunks.push(Buffer.from(chunk));
		const body = Buffer.concat(chunks).toString();
		if (req.url === "/api/auth/oauth2/token") {
			const params = new URLSearchParams(body);
			resources.push(params.get("resource") ?? "");
			if (options.tokenFailure) {
				res.writeHead(options.tokenFailure === "server_error" ? 503 : 400, {
					"Content-Type": "application/json",
				});
				res.end(JSON.stringify({ error: options.tokenFailure }));
				return;
			}
			if (params.get("refresh_token") !== refreshToken) {
				res.writeHead(400, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ error: "invalid_grant" }));
				return;
			}
			refreshToken = `refresh-${resources.length}`;
			res.writeHead(200, { "Content-Type": "application/json" });
			res.end(
				JSON.stringify({
					access_token:
						params.get("resource") === mcpResource
							? "mcp-access-refreshed"
							: "api-access-refreshed",
					refresh_token: refreshToken,
					expires_in: 3600,
					token_type: "Bearer",
					scope: "UPTIME_CHECKS:EDIT",
				}),
			);
			return;
		}
		authorization.push(req.headers.authorization ?? "");
		protocolVersions.push(req.headers["mcp-protocol-version"]?.toString());
		if (options.redirect) {
			res.writeHead(307, { Location: "/unexpected-redirect" });
			res.end();
			return;
		}
		if (options.mcpStatus) {
			res.writeHead(options.mcpStatus);
			res.end("private upstream details: mcp-access-refreshed");
			return;
		}
		if (req.method === "GET") {
			res.writeHead(405);
			res.end();
			return;
		}
		if (req.method === "DELETE") {
			res.writeHead(200);
			res.end();
			return;
		}
		const message = JSONRPCMessageSchema.parse(JSON.parse(body));
		messages.push(message);
		if ("method" in message) receivedMessages.emit(message.method, message);
		if (!("id" in message) || !("method" in message)) {
			res.writeHead(202);
			res.end();
			return;
		}
		let result;
		if (message.method === "initialize") {
			result = {
				protocolVersion: "2025-03-26",
				serverInfo: { name: "onlineornot-test", version: "1" },
				capabilities: { tools: { listChanged: true }, resources: {} },
				instructions: "Use the hosted tools.",
			};
		} else if (message.method === "tools/list") {
			result = {
				tools: [
					{
						name: "check_status",
						description: "Read check status",
						inputSchema: { type: "object" },
					},
				],
			};
		} else if (message.method === "resources/list") {
			result = { resources: [{ uri: "oon://checks", name: "Checks" }] };
		} else if (message.method === "tools/call") {
			res.writeHead(200, { "Content-Type": "text/event-stream" });
			res.write(
				`data: ${JSON.stringify({ jsonrpc: "2.0", method: "notifications/progress", params: { progressToken: "progress-1", progress: 1 } })}\n\n`,
			);
			res.end(
				`data: ${JSON.stringify({ jsonrpc: "2.0", id: message.id, result: { content: [{ type: "text", text: "check-local is up" }] } })}\n\n`,
			);
			return;
		} else {
			res.writeHead(200, { "Content-Type": "application/json" });
			res.end(
				JSON.stringify({
					jsonrpc: "2.0",
					id: message.id,
					error: { code: -32601, message: "Unknown hosted method" },
				}),
			);
			return;
		}
		res.writeHead(200, {
			"Content-Type": "application/json",
			"Mcp-Session-Id": "test-session",
		});
		res.end(JSON.stringify({ jsonrpc: "2.0", id: message.id, result }));
	});
	await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
	const address = server.address();
	if (!isNetworkAddress(address))
		throw new Error("MCP test server has no address");
	const env = {
		ONLINEORNOT_API_TOKEN: options.environmentToken ?? "",
		PATH: process.env.PATH ?? "",
		HOME: home,
		USERPROFILE: home,
		XDG_CONFIG_HOME: home,
		OON_MCP_TEST_ORIGIN: `http://127.0.0.1:${address.port}`,
		OON_MCP_TEST_FETCH_FAILURE: options.fetchFailure ?? "",
	};
	const transports: StdioClientTransport[] = [];
	const processes: ChildProcessWithoutNullStreams[] = [];
	function createClient() {
		const transport = new StdioClientTransport({
			command: process.execPath,
			args: [fixturePath, "mcp"],
			env,
			stderr: "pipe",
		});
		transports.push(transport);
		let stderr = "";
		transport.stderr?.on("data", (chunk) => {
			stderr += chunk;
		});
		const client = new Client({ name: "mcp-integration", version: "1" });
		return { client, transport, stderr: () => stderr };
	}
	function spawnCLI(args: string[]) {
		const child = spawn(process.execPath, [fixturePath, ...args], { env });
		processes.push(child);
		return child;
	}
	return {
		credentialsPath,
		resources,
		messages,
		authorization,
		protocolVersions,
		createClient,
		spawnCLI,
		waitForMessage: (method: string) => once(receivedMessages, method),
		async close() {
			await Promise.all(transports.map((transport) => transport.close()));
			for (const child of processes) {
				if (child.exitCode === null) child.kill("SIGKILL");
			}
			server.closeAllConnections();
			await new Promise<void>((resolve) => server.close(() => resolve()));
		},
	};
}

async function expireStoredToken(
	credentialsPath: string,
	field: "expiresAt" | "mcpExpiresAt",
) {
	const credentials = JSON.parse(await readFile(credentialsPath, "utf8"));
	await writeFile(
		`${credentialsPath}.pending`,
		JSON.stringify({ ...credentials, [field]: 0 }),
		{ mode: 0o600 },
	);
	await rename(`${credentialsPath}.pending`, credentialsPath);
}

async function collectProcess(child: ChildProcessWithoutNullStreams) {
	let stdout = "";
	let stderr = "";
	child.stdout.on("data", (chunk) => {
		stdout += chunk;
	});
	child.stderr.on("data", (chunk) => {
		stderr += chunk;
	});
	const timeout = setTimeout(() => child.kill("SIGKILL"), 5_000);
	const [code, signal] = await once(child, "close");
	clearTimeout(timeout);
	return { code, signal, stdout, stderr };
}

const initializeMessage = `${JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-03-26", capabilities: {}, clientInfo: { name: "startup", version: "1" } } })}\n`;

describe("onlineornot mcp stdio bridge", () => {
	it("explains authentication, client configuration, tools and silent stdio behavior without authentication or HTTP", async () => {
		const harness = await createHarness({
			loggedIn: false,
			fetchFailure: "mcp",
		});
		try {
			const result = await collectProcess(harness.spawnCLI(["mcp", "--help"]));

			expect(result.code).toBe(0);
			expect(result.stderr).toBe("");
			for (const text of [
				"not an interactive CLI",
				"MCP client must launch",
				"tools/list",
				"onlineornot auth login",
				"onlineornot auth logout",
				"ONLINEORNOT_API_TOKEN",
				"takes precedence",
				"same OS user and home directory",
				"npx -y onlineornot@latest auth login",
				"npx -y onlineornot@latest mcp",
				"no output",
				"Ctrl+C",
				"stderr",
				"nonzero",
				"search",
				"execute",
				"https://onlineornot.com/docs/reference/mcp",
			])
				expect(result.stdout).toContain(text);
			const configStart = result.stdout.indexOf('{\n  "mcpServers"');
			const configEnd = result.stdout.indexOf("\n}", configStart) + 2;
			expect(JSON.parse(result.stdout.slice(configStart, configEnd))).toEqual({
				mcpServers: {
					onlineornot: {
						command: "npx",
						args: ["-y", "onlineornot@latest", "mcp"],
					},
				},
			});
			expect(harness.resources).toEqual([]);
			expect(harness.authorization).toEqual([]);
		} finally {
			await harness.close();
		}
	});

	it("stays silent when launched directly and exits successfully on stdin EOF", async () => {
		const harness = await createHarness();
		try {
			const child = harness.spawnCLI(["mcp"]);
			const collected = collectProcess(child);
			// Leave stdin open briefly, just as a terminal does without an MCP client.
			let runningAtEOF = false;
			const eof = setTimeout(() => {
				runningAtEOF = child.exitCode === null;
				child.stdin.end();
			}, 500);
			const result = await collected;
			clearTimeout(eof);

			expect(runningAtEOF).toBe(true);
			expect(result.code).toBe(0);
			expect(result.stdout).toBe("");
			expect(result.stderr).toBe("");
			expect(harness.resources).toEqual([mcpResource]);
			expect(harness.messages).toEqual([]);
		} finally {
			await harness.close();
		}
	});

	it.each(["oauth", "mcp"] as const)(
		"makes %s network failures actionable on stderr",
		async (fetchFailure) => {
			const harness = await createHarness({ fetchFailure });
			try {
				const child = harness.spawnCLI(["mcp"]);
				const collected = collectProcess(child);
				if (fetchFailure === "mcp") child.stdin.write(initializeMessage);
				const result = await collected;

				expect(result.code).toBe(1);
				expect(result.stdout).toBe("");
				expect(result.stderr).toContain("network");
				expect(result.stderr).toContain("retry");
				expect(result.stderr).not.toContain("refresh-0");
				expect(result.stderr).not.toContain("mcp-access-refreshed");
			} finally {
				await harness.close();
			}
		},
	);

	it.each([
		[401, undefined, "onlineornot auth logout"],
		[401, "environment-api-token", "replace ONLINEORNOT_API_TOKEN"],
		[403, undefined, "permissions"],
		[503, undefined, "retry"],
	])(
		"makes hosted HTTP %s errors actionable with token %s",
		async (mcpStatus, environmentToken, expected) => {
			const harness = await createHarness({ mcpStatus, environmentToken });
			try {
				const child = harness.spawnCLI(["mcp"]);
				const collected = collectProcess(child);
				child.stdin.write(initializeMessage);
				const result = await collected;

				expect(result.code).toBe(1);
				expect(result.stdout).toBe("");
				expect(result.stderr).toContain(`HTTP ${mcpStatus}`);
				expect(result.stderr).toContain(expected);
				expect(result.stderr).not.toContain("private upstream details");
				expect(result.stderr).not.toContain("mcp-access-refreshed");
				expect(result.stderr).not.toContain("environment-api-token");
			} finally {
				await harness.close();
			}
		},
	);

	it("forwards initialization, discovery, SSE progress, tool results and errors using CLI OAuth", async () => {
		const harness = await createHarness();
		try {
			const { client, transport, stderr } = harness.createClient();
			const progress: number[] = [];
			client.setNotificationHandler(
				ProgressNotificationSchema,
				(notification) => {
					progress.push(notification.params.progress);
				},
			);

			await client.connect(transport);
			const tools = await client.listTools();
			const resources = await client.listResources();
			const result = await client.callTool({ name: "check_status" });

			expect(client.getInstructions()).toBe("Use the hosted tools.");
			expect(tools.tools[0].name).toBe("check_status");
			expect(resources.resources[0].uri).toBe("oon://checks");
			expect(result.content).toEqual([
				{ type: "text", text: "check-local is up" },
			]);
			expect(progress).toEqual([1]);
			await expect(
				client.readResource({ uri: "oon://missing" }),
			).rejects.toThrow("Unknown hosted method");
			expect(harness.resources).toEqual([mcpResource]);
			expect(new Set(harness.authorization)).toEqual(
				new Set(["Bearer mcp-access-refreshed"]),
			);
			expect(harness.protocolVersions.filter(Boolean)).toContain("2025-03-26");
			expect(stderr()).toBe("");
			const saved = JSON.parse(await readFile(harness.credentialsPath, "utf8"));
			expect(saved.accessToken).toBe("api-access-original");
			expect(saved.refreshToken).toBe("refresh-1");
		} finally {
			await harness.close();
		}
	});

	it("serializes rotating refresh tokens across two MCP processes and API refresh", async () => {
		const harness = await createHarness();
		try {
			await expireStoredToken(harness.credentialsPath, "expiresAt");
			const first = harness.createClient();
			const second = harness.createClient();

			const [, , api] = await Promise.all([
				first.client.connect(first.transport),
				second.client.connect(second.transport),
				collectProcess(harness.spawnCLI(["test-api-token"])),
			]);
			await first.client.listTools();

			expect(harness.resources.toSorted()).toEqual(
				[mcpResource, apiResource].toSorted(),
			);
			expect(api.code).toBe(0);
			expect(api.stdout.trim()).toBe("api-access-refreshed");
			expect(first.stderr()).toBe("");
			expect(second.stderr()).toBe("");
		} finally {
			await harness.close();
		}
	});

	it.each([
		["invalid_target", "logout", true],
		["invalid_grant", "login", false],
		["server_error", "503", true],
	])(
		"reports %s without leaking credentials",
		async (failure, expected, preservesCredentials) => {
			const harness = await createHarness({ tokenFailure: failure });
			try {
				const result = await collectProcess(harness.spawnCLI(["mcp"]));

				expect(result.code).toBe(1);
				expect(result.stdout).toBe("");
				expect(result.stderr).toContain(expected);
				expect(result.stderr).not.toContain("refresh-0");
				const saved = JSON.parse(
					await readFile(harness.credentialsPath, "utf8"),
				);
				expect(Boolean(saved.accessToken)).toBe(preservesCredentials);
			} finally {
				await harness.close();
			}
		},
	);

	it("requires login without opening a browser or writing to stdout", async () => {
		const harness = await createHarness({ loggedIn: false });
		try {
			const result = await collectProcess(harness.spawnCLI(["mcp"]));

			expect(result.code).toBe(1);
			expect(result.stdout).toBe("");
			expect(result.stderr).toContain("Run `onlineornot auth login`");
			expect(result.stderr).toContain("ONLINEORNOT_API_TOKEN");
			expect(harness.resources).toEqual([]);
		} finally {
			await harness.close();
		}
	});

	it("fails on a hosted authentication rejection without exposing the response body", async () => {
		const harness = await createHarness({ mcpStatus: 401 });
		try {
			const { client, transport, stderr } = harness.createClient();

			await expect(client.connect(transport)).rejects.toThrow();

			expect(stderr()).toContain("401");
			expect(stderr()).not.toContain("mcp-access-refreshed");
		} finally {
			await harness.close();
		}
	});

	it.each(["eof", "SIGTERM"])("terminates on %s", async (shutdown) => {
		const harness = await createHarness();
		try {
			const child = harness.spawnCLI(["mcp"]);
			const collected = collectProcess(child);
			child.stdin.write(
				`${JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-03-26", capabilities: {}, clientInfo: { name: "shutdown", version: "1" } } })}\n`,
			);
			await Promise.race([
				once(child.stdout, "data"),
				collected.then((result) => {
					throw new Error(
						`MCP CLI exited before initialization (code ${result.code}, signal ${result.signal}): ${result.stderr}`,
					);
				}),
			]);

			if (shutdown === "eof") child.stdin.end();
			else child.kill("SIGTERM");
			const result = await collected;

			if (process.platform === "win32" && shutdown === "SIGTERM") {
				expect(result.signal).toBe("SIGTERM");
			} else {
				expect(result.code).toBe(0);
				expect(result.signal).toBeNull();
			}
			expect(result.stderr).toBe("");
			expect(
				JSONRPCMessageSchema.parse(JSON.parse(result.stdout.trim())),
			).toHaveProperty("id", 1);
		} finally {
			await harness.close();
		}
	});

	it("refreshes an expired MCP token while the stdio process remains connected", async () => {
		const harness = await createHarness();
		try {
			const { client, transport } = harness.createClient();
			await client.connect(transport);
			await expireStoredToken(harness.credentialsPath, "mcpExpiresAt");

			const tools = await client.listTools();

			expect(tools.tools[0].name).toBe("check_status");
			expect(harness.resources).toEqual([mcpResource, mcpResource]);
		} finally {
			await harness.close();
		}
	});

	it("preserves environment API token precedence without requiring OAuth", async () => {
		const harness = await createHarness({
			loggedIn: false,
			environmentToken: "environment-api-token",
		});
		try {
			const { client, transport } = harness.createClient();

			await client.connect(transport);
			await client.listTools();

			expect(harness.resources).toEqual([]);
			expect(new Set(harness.authorization)).toEqual(
				new Set(["Bearer environment-api-token"]),
			);
		} finally {
			await harness.close();
		}
	});

	it("forwards client notifications without interpreting them", async () => {
		const harness = await createHarness();
		try {
			const { client, transport } = harness.createClient();
			await client.connect(transport);

			const received = harness.waitForMessage("notifications/cancelled");
			await client.notification({
				method: "notifications/cancelled",
				params: { requestId: 123, reason: "Cancelled by client" },
			});
			await client.listTools();

			expect((await received)[0]).toEqual({
				jsonrpc: "2.0",
				method: "notifications/cancelled",
				params: { requestId: 123, reason: "Cancelled by client" },
			});
		} finally {
			await harness.close();
		}
	});

	it("refuses to forward credentials through an HTTP redirect", async () => {
		const harness = await createHarness({ redirect: true });
		try {
			const { client, transport, stderr } = harness.createClient();

			await expect(client.connect(transport)).rejects.toThrow();

			expect(harness.authorization).toHaveLength(1);
			expect(stderr()).not.toContain("mcp-access-refreshed");
		} finally {
			await harness.close();
		}
	});

	it("requests API and MCP resources in the existing browser OAuth flow", async () => {
		const harness = await createHarness();
		try {
			const result = await collectProcess(harness.spawnCLI(["test-auth-url"]));
			const url = new URL(result.stdout.trim());

			expect(url.searchParams.getAll("resource")).toEqual([
				apiResource,
				mcpResource,
			]);
			expect(url.searchParams.get("code_challenge_method")).toBe("S256");
		} finally {
			await harness.close();
		}
	});
});
