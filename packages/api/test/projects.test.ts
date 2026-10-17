import { once } from "node:events";
import { createServer } from "node:http";

import { afterAll, beforeAll, beforeEach, expect, it } from "vitest";

import type { CheckInput, MoveResourcesData } from "../src/index";
import {
	createCheck,
	createClient,
	createProject,
	deleteProject,
	getProject,
	listChecks,
	listProjects,
	moveCheck,
	moveEnvironmentVariable,
	moveHeartbeat,
	moveResources,
	moveWebhook,
	updateProject,
} from "../src/index";

const projectId = "project-public-0001";
const requests: {
	method: string;
	url: string;
	body: string;
	authorization: string | undefined;
}[] = [];
let origin = "";
let conflict = false;
const server = createServer((request, response) => {
	void (async () => {
		let body = "";
		for await (const chunk of request) body += String(chunk);
		requests.push({
			method: request.method ?? "GET",
			url: request.url ?? "/",
			body,
			authorization: request.headers.authorization,
		});
		response.setHeader("content-type", "application/json");
		response.statusCode = conflict ? 409 : 200;
		response.end(
			JSON.stringify(
				conflict
					? {
							success: false,
							result: null,
							errors: [
								{ code: 10000, message: "project_move_variable_conflict" },
							],
							messages: [],
						}
					: {
							success: true,
							errors: [],
							messages: [],
							result: {
								id: projectId,
								project_id: projectId,
								name: "Staging",
							},
						},
			),
		);
	})().catch(() => {
		response.statusCode = 500;
		response.end();
	});
});
beforeAll(async () => {
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
});
beforeEach(() => {
	requests.length = 0;
	conflict = false;
});
function client() {
	return createClient({ baseUrl: origin, auth: "fabricated-project-token" });
}

it("exposes all project CRUD operations over HTTP with encoded identity and bearer auth", async () => {
	const isolated = client();
	await createProject({ client: isolated, body: { name: "Staging" } });
	await listProjects({ client: isolated, query: { page: 2, per_page: 10 } });
	const read = await getProject({
		client: isolated,
		path: { project_id: projectId },
	});
	expect(read.data?.result.id).toBe(projectId);
	await updateProject({
		client: isolated,
		path: { project_id: projectId },
		body: { name: "Renamed" },
	});
	await deleteProject({ client: isolated, path: { project_id: projectId } });
	expect(requests.map((r) => [r.method, r.url])).toEqual([
		["POST", "/v1/projects"],
		["GET", "/v1/projects?page=2&per_page=10"],
		["GET", `/v1/projects/${projectId}`],
		["PATCH", `/v1/projects/${projectId}`],
		["DELETE", `/v1/projects/${projectId}`],
	]);
	expect(
		requests.every(
			(r) => r.authorization === "Bearer fabricated-project-token",
		),
	).toBe(true);
	expect(JSON.parse(requests[3].body)).toEqual({ name: "Renamed" });
});
it.each([undefined, projectId, null])(
	"preserves optional project selection %s without inventing defaults",
	async (selected) => {
		const isolated = client();
		const body: CheckInput = { name: "Website", url: "https://example.com" };
		if (selected !== undefined) body.project_id = selected;
		await createCheck({
			client: isolated,
			body,
		});
		await listChecks({
			client: isolated,
			query: { project_id: selected === null ? "unassigned" : selected },
		});
		const sentBody: unknown = JSON.parse(requests[0].body);
		if (selected !== undefined)
			expect(sentBody).toHaveProperty("project_id", selected);
		else expect(sentBody).not.toHaveProperty("project_id");
		expect(
			new URL(requests[1].url, origin).searchParams.get("project_id"),
		).toBe(selected === null ? "unassigned" : (selected ?? null));
	},
);
it.each([projectId, null])(
	"assigns or unassigns every supported resource over HTTP to %s",
	async (project) => {
		const isolated = client();
		await moveCheck({
			client: isolated,
			path: { check_id: "check-public-001" },
			body: { project_id: project },
		});
		await moveHeartbeat({
			client: isolated,
			path: { heartbeat_id: "heartbeat-public-001" },
			body: { project_id: project },
		});
		await moveWebhook({
			client: isolated,
			path: { webhook_id: "webhook-public-001" },
			body: { project_id: project },
		});
		await moveEnvironmentVariable({
			client: isolated,
			path: { environment_variable_id: "variable-public-001" },
			body: { project_id: project },
		});
		expect(requests.map((r) => [r.method, r.url, JSON.parse(r.body)])).toEqual([
			["POST", "/v1/checks/check-public-001/move", { project_id: project }],
			[
				"POST",
				"/v1/heartbeats/heartbeat-public-001/move",
				{ project_id: project },
			],
			["POST", "/v1/webhooks/webhook-public-001/move", { project_id: project }],
			["POST", "/v1/env/variable-public-001/move", { project_id: project }],
		]);
	},
);
it.each([projectId, null])(
	"sends an explicit atomic resource selection to %s",
	async (project) => {
		const body = {
			project_id: project,
			resources: [
				{ kind: "check", id: "check-public-001" },
				{ kind: "heartbeat", id: "heartbeat-public-001" },
				{ kind: "webhook", id: "webhook-public-001" },
				{ kind: "environment_variable", id: "variable-public-001" },
			],
		} satisfies MoveResourcesData["body"];

		await moveResources({ client: client(), body });

		expect(requests.map((r) => [r.method, r.url, JSON.parse(r.body)])).toEqual([
			["POST", "/v1/resources/move", body],
		]);
		expect(requests[0].authorization).toBe("Bearer fabricated-project-token");
	},
);
it("preserves move conflicts as SDK errors without turning them into success", async () => {
	conflict = true;
	const result = await moveCheck({
		client: client(),
		path: { check_id: "check-public-001" },
		body: { project_id: projectId },
	});
	expect(result.response?.status).toBe(409);
	expect(result.data).toBeUndefined();
	expect(result.error).toMatchObject({
		success: false,
		errors: [{ message: "project_move_variable_conflict" }],
	});
});

it("preserves atomic move conflicts without retrying individual resources", async () => {
	conflict = true;

	const result = await moveResources({
		client: client(),
		body: {
			project_id: null,
			resources: [{ kind: "check", id: "check-public-001" }],
		},
	});

	expect(result.response?.status).toBe(409);
	expect(result.data).toBeUndefined();
	expect(result.error).toMatchObject({
		success: false,
		errors: [{ message: "project_move_variable_conflict" }],
	});
	expect(requests).toHaveLength(1);
});
