import { describe, expect, expectTypeOf, it } from "vitest";

import {
	createCheck,
	createClient,
	createProject,
	getHeartbeat,
	listChecks,
	listEnvironmentVariables,
	listHeartbeats,
	listMaintenanceWindows,
	listWebhooks,
	pingHeartbeat,
	pingHeartbeatGet,
	updateCheck,
	updateProject,
	type CheckListItem,
	type CheckListResponse,
	type CreateProjectErrors,
	type GetHeartbeatErrors,
	type ListChecksResponses,
	type UpdateProjectErrors,
	type PublicApiErrorResponse,
	type VerifyTokenErrors,
} from "../src/index";

interface MockResponseBody {
	errors?: readonly never[];
	messages?: readonly never[];
	result?: readonly never[];
	success?: boolean;
}

const ok = (
	body: MockResponseBody = {
		success: true,
		result: [],
		errors: [],
		messages: [],
	},
) =>
	new Response(JSON.stringify(body), {
		headers: { "content-type": "application/json" },
		status: 200,
	});

describe("generated client", () => {
	it("uses the default API server and bearer authentication", async () => {
		let request: Request | undefined;
		await listChecks({
			auth: "test-token",
			fetch: async (input) => {
				request = input instanceof Request ? input : new Request(input);
				return ok();
			},
			query: { page: 2, per_page: 10, search: "website" },
		});
		expect(request?.url).toBe(
			"https://api.onlineornot.com/v1/checks?page=2&per_page=10&search=website",
		);
		expect(request?.headers.get("authorization")).toBe("Bearer test-token");
	});

	describe.each([
		["checks", listChecks],
		["env", listEnvironmentVariables],
		["heartbeats", listHeartbeats],
		["maintenance-windows", listMaintenanceWindows],
		["webhooks", listWebhooks],
	] as const)("%s project filters", (path, list) => {
		it.each([
			{ value: "a", query: "project_id=a" },
			{ value: ["a", "b"], query: "project_id=a&project_id=b" },
			{
				value: ["a1b2c3d4e5f6g7h8", "unassigned"],
				query: "project_id=a1b2c3d4e5f6g7h8&project_id=unassigned",
			},
		])(
			"serializes $value without brackets or comma joining",
			async ({ value, query }) => {
				let request: Request | undefined;
				await list({
					query: { project_id: value },
					fetch: async (input) => {
						request = input instanceof Request ? input : new Request(input);
						return ok();
					},
				});
				expect(request?.url).toBe(
					`https://api.onlineornot.com/v1/${path}?${query}`,
				);
			},
		);
	});

	it("preserves project name conflict error envelopes", async () => {
		expectTypeOf<
			CreateProjectErrors[409]
		>().toEqualTypeOf<PublicApiErrorResponse>();
		expectTypeOf<
			UpdateProjectErrors[409]
		>().toEqualTypeOf<PublicApiErrorResponse>();
		const failure = {
			success: false,
			result: null,
			errors: [{ code: 1000, message: "project_name_taken" }],
			messages: [],
		} satisfies CreateProjectErrors[409];
		const options = {
			body: { name: "Production" },
			fetch: async () =>
				new Response(JSON.stringify(failure), {
					status: 409,
					headers: { "content-type": "application/json" },
				}),
		};
		const responses = [
			await createProject(options),
			await updateProject({ ...options, path: { project_id: "project-id" } }),
		];
		for (const response of responses) {
			expect(response.response?.status).toBe(409);
			expect(response.data).toBeUndefined();
			expect(response.error).toEqual(failure);
		}
	});

	it("serializes path and body inputs", async () => {
		let request: Request | undefined;
		await createCheck({
			body: { name: "Website", url: "https://example.com", test_interval: 60 },
			fetch: async (input) => {
				request = input instanceof Request ? input : new Request(input);
				return new Response(
					JSON.stringify({
						success: true,
						result: {},
						errors: [],
						messages: [],
					}),
					{
						headers: { "content-type": "application/json" },
						status: 201,
					},
				);
			},
		});
		expect(request?.url).toBe("https://api.onlineornot.com/v1/checks");
		expect(await request?.json()).toMatchObject({
			name: "Website",
			url: "https://example.com",
			test_interval: 60,
		});
	});

	it.each([undefined, "LOW", "HIGH"] satisfies Array<
		"LOW" | "HIGH" | undefined
	>)(
		"preserves alert priority %s without injecting defaults",
		async (priority) => {
			const requests: Request[] = [];
			const isolated = createClient({
				baseUrl: "https://api.example.test",
				throwOnError: true,
				fetch: async (input) => {
					requests.push(input instanceof Request ? input : new Request(input));
					return ok();
				},
			});
			const alert = priority === undefined ? {} : { alert_priority: priority };
			const body = { name: "Website", url: "https://example.com", ...alert };
			await createCheck({ client: isolated, body });
			await updateCheck({
				client: isolated,
				path: { check_id: "check-id" },
				body: alert,
			});
			expect(requests.map((request) => request.method)).toEqual([
				"POST",
				"PATCH",
			]);
			expect(
				await Promise.all(requests.map((request) => request.json())),
			).toEqual([body, alert]);
		},
	);

	it("preserves the documented heartbeat 404 error envelope", async () => {
		expectTypeOf<
			GetHeartbeatErrors[404]
		>().toEqualTypeOf<PublicApiErrorResponse>();
		const failure = {
			success: false,
			result: null,
			errors: [{ code: 1000, message: "Heartbeat not found or unavailable" }],
			messages: [],
		} satisfies GetHeartbeatErrors[404];
		const response = await getHeartbeat({
			path: { heartbeat_id: "missing-heartbeat" },
			fetch: async () =>
				new Response(JSON.stringify(failure), {
					status: 404,
					headers: { "content-type": "application/json" },
				}),
		});
		expect(response.response?.status).toBe(404);
		expect(response.data).toBeUndefined();
		expect(response.error).toEqual(failure);
	});

	it("supports an isolated client with custom fetch", async () => {
		const urls: string[] = [];
		const isolated = createClient({
			baseUrl: "https://api.example.test",
			fetch: async (input) => {
				urls.push(input instanceof Request ? input.url : String(input));
				return ok();
			},
		});
		await listChecks({ client: isolated });
		expect(urls).toEqual(["https://api.example.test/v1/checks"]);
	});

	it("always sends heartbeat pings to the operation server", async () => {
		const urls: string[] = [];
		const isolated = createClient({
			baseUrl: "https://api.example.test",
			fetch: async (input) => {
				urls.push(input instanceof Request ? input.url : String(input));
				return ok({});
			},
		});
		await pingHeartbeat({
			client: isolated,
			path: { heartbeat_id: "heartbeat-id" },
		});
		expect(urls).toEqual(["https://oonchk.com/heartbeat-id"]);
	});

	it.each([pingHeartbeatGet, pingHeartbeat])(
		"accepts empty heartbeat responses and preserves text errors (%#)",
		async (ping) => {
			const accepted = await ping({
				path: { heartbeat_id: "heartbeat-id" },
				fetch: async () => new Response(null, { status: 200 }),
			});
			expect(accepted.response?.status).toBe(200);
			expect(accepted.error).toBeUndefined();

			const rejected = await ping({
				path: { heartbeat_id: "heartbeat-id" },
				fetch: async () =>
					new Response("Too many requests", {
						status: 429,
						headers: { "content-type": "text/plain" },
					}),
			});
			expect(rejected.error).toBe("Too many requests");
			expect(rejected.response?.status).toBe(429);
		},
	);

	it("preserves documented HTTP 200 failure envelopes as data", async () => {
		const failure = {
			success: false,
			result: null,
			errors: [{ code: 1000, message: "Unable to list checks" }],
			messages: [],
		};
		const response = await listChecks({
			fetch: async () =>
				new Response(JSON.stringify(failure), {
					status: 200,
					headers: { "content-type": "application/json" },
				}),
		});
		expect(response.error).toBeUndefined();
		expect(response.data).toEqual(failure);
		if (response.data?.success === false) {
			expectTypeOf(response.data.result).toEqualTypeOf<null>();
		}
	});

	it("retains generated success and documented error types", () => {
		type ListChecksSuccess = Exclude<
			ListChecksResponses[200],
			{ success: false }
		>;
		expectTypeOf<ListChecksSuccess>().toMatchTypeOf<CheckListResponse>();
		expectTypeOf<ListChecksSuccess["result"]>().toEqualTypeOf<
			CheckListItem[]
		>();
		expectTypeOf<
			ListChecksSuccess["result_info"]["total_count"]
		>().toEqualTypeOf<number>();
		expectTypeOf<VerifyTokenErrors[401]>().toMatchTypeOf<{
			errors: Array<{ code: number; message: string }>;
			result?: null;
			success: boolean;
		}>();
	});
});
