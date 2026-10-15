import { execFile } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { afterAll, beforeAll, beforeEach, expect, it } from "vitest";

const execute = promisify(execFile);
const projectId = "project-public-0001";
const requests: {
	method: string;
	url: string;
	body: string;
	authorization: string | undefined;
}[] = [];
let origin = "";
let home = "";
let rejectMove = false;
const server = createServer((request, response) => {
	void (async () => {
		let body = "";
		for await (const chunk of request) body += String(chunk);
		const url = new URL(request.url ?? "/", "http://localhost");
		requests.push({
			method: request.method ?? "GET",
			url: request.url ?? "/",
			body,
			authorization: request.headers.authorization,
		});
		response.setHeader("content-type", "application/json");
		if (rejectMove && url.pathname.endsWith("/move")) {
			response.statusCode = 409;
			response.end(
				JSON.stringify({
					success: false,
					result: null,
					errors: [{ code: 10000, message: "project_move_variable_conflict" }],
					messages: [],
				}),
			);
			return;
		}
		const result = fixtureResult(url, request.method);
		response.end(
			JSON.stringify({
				success: true,
				result,
				errors: [],
				messages: [],
				result_info: {
					total_count: url.pathname === "/v1/projects" ? 2 : 1,
					count: 1,
				},
			}),
		);
	})().catch(() => {
		response.statusCode = 500;
		response.end();
	});
});

function fixtureResult(url: URL, method: string | undefined) {
	if (url.pathname === "/v1/tokens/verify") return { status: "active" };
	if (url.pathname.endsWith("/move"))
		return { id: url.pathname.split("/").at(-2), project_id: projectId };
	if (url.pathname === "/v1/checks" && method === "POST")
		return { id: "check-public-001", project_id: projectId };
	if (
		method === "GET" &&
		["/v1/projects", "/v1/checks", "/v1/heartbeats"].includes(url.pathname)
	) {
		return url.searchParams.get("page") === "2"
			? [{ id: "project-public-0002", name: "Second" }]
			: [{ id: projectId, name: "Staging", project_id: projectId }];
	}
	return {
		id: projectId,
		name: "Staging",
		is_default: false,
		created_at: "2026-10-15T00:00:00Z",
		updated_at: "2026-10-15T00:00:00Z",
	};
}

beforeAll(async () => {
	home = await mkdtemp(path.join(tmpdir(), "onlineornot-projects-"));
	server.listen(0, "127.0.0.1");
	await once(server, "listening");
	const address = server.address();
	if (
		!(address instanceof Object) ||
		address.address !== "127.0.0.1" ||
		!Number.isInteger(address.port) ||
		address.port < 1
	)
		throw new Error("Loopback port unavailable");
	origin = `http://127.0.0.1:${address.port}`;
});
afterAll(async () => {
	server.closeAllConnections();
	await new Promise<void>((resolve, reject) =>
		server.close((error) => (error ? reject(error) : resolve())),
	);
	await rm(home, { recursive: true, force: true });
});
beforeEach(() => {
	requests.length = 0;
	rejectMove = false;
});

async function cli(...args: string[]) {
	return execute(
		process.execPath,
		[
			"--import",
			path.resolve("test-fixtures/projects-http.mjs"),
			path.resolve("bin/onlineornot.js"),
			...args,
		],
		{
			env: {
				...process.env,
				HOME: home,
				ONLINEORNOT_API_TOKEN: "fabricated-project-token",
				ONLINEORNOT_TEST_API_ORIGIN: origin,
				NODE_ENV: "test",
			},
			timeout: 4000,
		},
	);
}

it("runs project CRUD with JSON output and bearer authentication", async () => {
	for (const args of [
		["create", "Staging"],
		["view", projectId],
		["update", projectId, "--name", "Renamed"],
		["delete", projectId],
	]) {
		const { stdout } = await cli("projects", ...args, "--json");
		expect(JSON.parse(stdout)).toMatchObject({ id: projectId });
	}
	expect(
		requests.filter((r) => r.url !== "/v1/tokens/verify").map((r) => r.method),
	).toEqual(["POST", "GET", "PATCH", "DELETE"]);
	expect(
		requests.every(
			(r) => r.authorization === "Bearer fabricated-project-token",
		),
	).toBe(true);
	expect(
		JSON.parse(requests.find((r) => r.method === "PATCH")?.body ?? "null"),
	).toEqual({ name: "Renamed" });
});
it("collects all project pages", async () => {
	const { stdout } = await cli("projects", "list", "--json");
	expect(JSON.parse(stdout)).toHaveLength(2);
	expect(
		requests
			.filter((r) => r.url.startsWith("/v1/projects?"))
			.map((r) => new URL(r.url, origin).searchParams.get("page")),
	).toEqual(["1", "2"]);
});
it.each(["checks", "heartbeats"])(
	"filters %s with an explicit project and preserves unfiltered listing",
	async (resource) => {
		await cli(resource, "list", "--project-id", projectId, "--json");
		expect(
			requests.some(
				(r) =>
					new URL(r.url, origin).searchParams.get("project_id") === projectId,
			),
		).toBe(true);
		requests.length = 0;
		await cli(resource, "list", "--json");
		expect(
			requests.every(
				(r) => !new URL(r.url, origin).searchParams.has("project_id"),
			),
		).toBe(true);
	},
);
it.each([undefined, projectId])(
	"creates a check with project selection %s without inventing a default",
	async (selected) => {
		await cli(
			"checks",
			"create",
			"Website",
			"https://example.com",
			"--json",
			...(selected ? ["--project-id", selected] : []),
		);
		const body: unknown = JSON.parse(
			requests.find((r) => r.method === "POST")?.body ?? "null",
		);
		expect(body).toMatchObject({ name: "Website", url: "https://example.com" });
		if (selected) expect(body).toHaveProperty("project_id", selected);
		else expect(body).not.toHaveProperty("project_id");
	},
);
it.each(["checks", "heartbeats"])(
	"moves %s through POST rather than PATCH",
	async (resource) => {
		const { stdout } = await cli(
			resource,
			"move",
			"resource-public-001",
			projectId,
			"--json",
		);
		expect(JSON.parse(stdout)).toEqual({
			id: "resource-public-001",
			project_id: projectId,
		});
		const request = requests.find((r) => r.url.endsWith("/move"));
		expect(request?.method).toBe("POST");
		expect(JSON.parse(request?.body ?? "null")).toEqual({
			project_id: projectId,
		});
	},
);
it("returns nonzero and preserves the API conflict when a check cannot move", async () => {
	rejectMove = true;
	await expect(
		cli("checks", "move", "resource-public-001", projectId, "--json"),
	).rejects.toMatchObject({
		code: 1,
		stderr: expect.stringContaining("project_move_variable_conflict"),
	});
});
it("rejects ownership PATCH flags rather than silently moving a check", async () => {
	await expect(
		cli(
			"checks",
			"update",
			"resource-public-001",
			"--project-id",
			projectId,
			"--json",
		),
	).rejects.toMatchObject({ code: 1 });
	expect(requests).toHaveLength(0);
});
