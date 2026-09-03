import { describe, expect, expectTypeOf, it } from "vitest";

import {
	createCheck,
	createClient,
	listChecks,
	pingHeartbeat,
	type CheckListResponse,
	type GetV1TokensVerifyErrors,
	type ListChecksResponses,
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
			query: { page: "2", per_page: "10", search: "website" },
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

	it("retains generated success and documented error types", () => {
		expectTypeOf<ListChecksResponses[200]>().toEqualTypeOf<CheckListResponse>();
		expectTypeOf<GetV1TokensVerifyErrors[401]>().toMatchTypeOf<{
			errors: Array<{ code: number; message: string }>;
			result: null;
			success: boolean;
		}>();
	});
});
