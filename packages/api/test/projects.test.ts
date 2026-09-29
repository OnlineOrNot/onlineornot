import { describe, expect, it } from "vitest";

import {
	createClient,
	createProject,
	listProjects,
	getProject,
	updateProject,
	deleteProject,
	moveCheck,
	moveHeartbeat,
	createCheck,
	listChecks,
	createHeartbeat,
	listHeartbeats,
	createEnvironmentVariable,
	listEnvironmentVariables,
} from "../src/index";

const project = "a1b2c3d4e5f6g7h8";

function fixture(status = 200) {
	const requests: Request[] = [];
	const client = createClient({
		baseUrl: "https://fixture.example.test",
		fetch: async (input) => {
			const request = input instanceof Request ? input : new Request(input);
			requests.push(request);
			return new Response(
				JSON.stringify(
					status === 409
						? {
								success: false,
								result: null,
								errors: [
									{
										code: 409,
										type: "project_move_variable_conflict",
										message: "Destination variables incompatible",
									},
								],
								messages: [],
							}
						: {
								success: true,
								result: { id: "resource-id", project_id: project },
								errors: [],
								messages: [],
							},
				),
				{
					status,
					headers: { "content-type": "application/json" },
				},
			);
		},
	});
	return { client, requests };
}

describe("candidate projects wire contract (not a released API)", () => {
	it("exposes complete project CRUD and numbered list pagination", async () => {
		const { client, requests } = fixture();
		await createProject({ client, body: { name: "staging" } });
		await listProjects({ client, query: { page: 2, per_page: 10 } });
		await getProject({ client, path: { project_id: project } });
		await updateProject({
			client,
			path: { project_id: project },
			body: { name: "renamed" },
		});
		await deleteProject({ client, path: { project_id: project } });
		expect(
			requests.map((r) => [
				r.method,
				new URL(r.url).pathname + new URL(r.url).search,
			]),
		).toEqual([
			["POST", "/v1/projects"],
			["GET", "/v1/projects?page=2&per_page=10"],
			["GET", `/v1/projects/${project}`],
			["PATCH", `/v1/projects/${project}`],
			["DELETE", `/v1/projects/${project}`],
		]);
		expect(await requests[0].json()).toEqual({ name: "staging" });
		expect(await requests[3].json()).toEqual({ name: "renamed" });
	});
	it("omits project selection by default and serializes explicit resource selection/filter", async () => {
		const { client, requests } = fixture();
		await createCheck({
			client,
			body: { name: "Website", url: "https://example.test" },
		});
		await listChecks({ client });
		await createCheck({
			client,
			body: {
				name: "Website",
				url: "https://example.test",
				project_id: project,
			},
		});
		await listChecks({ client, query: { project_id: project } });
		await createHeartbeat({
			client,
			body: {
				name: "Job",
				report_period: 60,
				grace_period: 60,
				project_id: project,
			},
		});
		await listHeartbeats({ client, query: { project_id: project } });
		await createEnvironmentVariable({
			client,
			body: {
				name: "DATABASE_URL",
				type: "config",
				value: "fixture",
				project_id: project,
			},
		});
		await listEnvironmentVariables({ client, query: { project_id: project } });
		expect(await requests[0].json()).not.toHaveProperty("project_id");
		expect(new URL(requests[1].url).searchParams.has("project_id")).toBe(false);
		for (const index of [2, 4, 6])
			expect(await requests[index].json()).toHaveProperty(
				"project_id",
				project,
			);
		for (const index of [3, 5, 7])
			expect(new URL(requests[index].url).searchParams.get("project_id")).toBe(
				project,
			);
	});
	it("moves with exactly one POST, without state overrides or follow-up activation", async () => {
		const { client, requests } = fixture();
		await moveCheck({
			client,
			path: { check_id: "check-id" },
			body: { project_id: project },
		});
		await moveHeartbeat({
			client,
			path: { heartbeat_id: "heartbeat-id" },
			body: { project_id: project },
		});
		expect(requests.map((r) => [r.method, new URL(r.url).pathname])).toEqual([
			["POST", "/v1/checks/check-id/move"],
			["POST", "/v1/heartbeats/heartbeat-id/move"],
		]);
		for (const request of requests)
			expect(await request.json()).toEqual({ project_id: project });
	});
	it("returns atomic move conflicts without retry or compensating writes", async () => {
		const { client, requests } = fixture(409);
		const result = await moveCheck({
			client,
			path: { check_id: "check-id" },
			body: { project_id: project },
		});
		expect(result.response?.status).toBe(409);
		expect(result.error).toMatchObject({
			success: false,
			errors: [{ type: "project_move_variable_conflict" }],
		});
		expect(requests).toHaveLength(1);
	});
});
