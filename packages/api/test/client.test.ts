import { describe, expect, expectTypeOf, it } from "vitest";

import {
	createCheck,
	createClient,
	getHeartbeat,
	listChecks,
	pingHeartbeat,
	pingHeartbeatGet,
	updateCheck,
	type CheckListItem,
	type CheckListResponse,
	type GetHeartbeatErrors,
	type ListChecksResponses,
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
