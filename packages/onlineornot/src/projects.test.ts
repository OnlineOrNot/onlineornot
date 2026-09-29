import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createCLIParser } from "./index";

const project = "a1b2c3d4e5f6g7h8";
const originalFetch = globalThis.fetch;
const originalToken = process.env.ONLINEORNOT_API_TOKEN;
const requests: Request[] = [];
let conflict = false;

beforeEach(() => {
	requests.length = 0;
	conflict = false;
	process.env.ONLINEORNOT_API_TOKEN = "local-fixture-token";
	// Custom in-process Fetch fixture: no API or credentials leave this process.
	globalThis.fetch = async (input, init) => {
		const request = new Request(input, init);
		requests.push(request);
		const url = new URL(request.url);
		const failed = conflict && url.pathname.endsWith("/move");
		const result = url.pathname.endsWith("/tokens/verify")
			? { status: "active" }
			: request.method === "GET" && !url.pathname.includes(project)
				? []
				: {
						id: project,
						name: "staging",
						check_type: "UPTIME",
						is_default: false,
						project_id: project,
						created_at: "2026-01-01T00:00:00.000Z",
						updated_at: "2026-01-01T00:00:00.000Z",
					};
		return new Response(
			JSON.stringify({
				success: !failed,
				result: failed ? null : result,
				errors: failed
					? [
							{
								code: 409,
								type: "project_move_variable_conflict",
								message: "Destination variables incompatible",
							},
						]
					: [],
				messages: [],
				result_info: { total_count: 0, page: 1, per_page: 100, total_pages: 1 },
			}),
			{
				status: failed ? 409 : 200,
				headers: { "content-type": "application/json" },
			},
		);
	};
});
afterEach(() => {
	globalThis.fetch = originalFetch;
	if (originalToken === undefined) delete process.env.ONLINEORNOT_API_TOKEN;
	else process.env.ONLINEORNOT_API_TOKEN = originalToken;
});

async function run(...args: string[]) {
	await createCLIParser([...args, "--json"]).parseAsync();
	return requests.filter((request) => !request.url.endsWith("/tokens/verify"));
}

describe("candidate projects CLI with local Fetch fixtures", () => {
	it.each([
		["create", ["staging"], "POST", "/v1/projects"],
		["list", [], "GET", "/v1/projects"],
		["view", [project], "GET", `/v1/projects/${project}`],
		[
			"update",
			[project, "--name", "renamed"],
			"PATCH",
			`/v1/projects/${project}`,
		],
		["delete", [project], "DELETE", `/v1/projects/${project}`],
	] as const)("projects %s", async (command, args, method, path) => {
		const sent = await run("projects", command, ...args);
		expect(sent).toHaveLength(1);
		expect(sent[0].method).toBe(method);
		expect(new URL(sent[0].url).pathname).toBe(path);
	});
	it.each(["checks", "heartbeats"])(
		"%s move performs one atomic request",
		async (resource) => {
			const sent = await run(
				resource,
				"move",
				"resource-id",
				"--project-id",
				project,
			);
			expect(sent).toHaveLength(1);
			expect(sent[0].method).toBe("POST");
			expect(new URL(sent[0].url).pathname).toBe(
				`/v1/${resource}/resource-id/move`,
			);
			expect(await sent[0].json()).toEqual({ project_id: project });
		},
	);
	it("propagates move failure without retry, PATCH or reactivation", async () => {
		conflict = true;
		await expect(
			run("checks", "move", "resource-id", "--project-id", project),
		).rejects.toThrow();
		expect(
			requests.filter((request) => request.url.includes("/checks/")),
		).toHaveLength(1);
	});
	it("supports optional project selection at check creation", async () => {
		const sent = await run(
			"checks",
			"create",
			"Website",
			"https://example.test",
			"--project-id",
			project,
		);
		expect(await sent[0].json()).toHaveProperty("project_id", project);
	});
	it.each([undefined, project])(
		"preserves check list scope %s",
		async (selection) => {
			const args = selection === undefined ? [] : ["--project-id", selection];
			const sent = await run("checks", "list", ...args);
			expect(new URL(sent[0].url).searchParams.get("project_id")).toBe(
				selection ?? null,
			);
		},
	);
	it("rejects unchecked ownership updates without a request", async () => {
		await expect(
			run("checks", "update", "resource-id", "--project-id", project),
		).rejects.toThrow();
		expect(requests).toHaveLength(0);
	});
	it("rejects missing move destination without a request", async () => {
		await expect(run("checks", "move", "resource-id")).rejects.toThrow();
		expect(requests).toHaveLength(0);
	});
});

it("rejects the obsolete Node 20 runtime before any request", async () => {
	await expect(
		run("checks", "update", "resource-id", "--version", "NODE20_PLAYWRIGHT"),
	).rejects.toThrow(
		"NODE20_PLAYWRIGHT is no longer supported; use NODE24_PLAYWRIGHT",
	);
	expect(requests).toHaveLength(0);
});

it("accepts the supported runtime as a command value, not the CLI version flag", async () => {
	const sent = await run(
		"checks",
		"update",
		"resource-id",
		"--version",
		"NODE24_PLAYWRIGHT",
	);
	expect(await sent[0].json()).toEqual({ version: "NODE24_PLAYWRIGHT" });
});
