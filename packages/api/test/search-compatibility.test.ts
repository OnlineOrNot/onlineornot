import { once } from "node:events";
import { createServer } from "node:http";

import { parse } from "valibot";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
	createClient,
	searchLogs,
	searchTraces,
	type TraceSpan,
} from "../src/index";
import {
	vSearchLogsQuery,
	vSearchLogsResponse,
	vSearchTracesQuery,
	vSearchTracesResponse,
} from "../src/valibot";
import {
	zSearchLogsQuery,
	zSearchLogsResponse,
	zSearchTracesQuery,
	zSearchTracesResponse,
} from "../src/zod";

const timestamp = "2026-11-17T10:00:00.000Z";
const span: TraceSpan = {
	id: "96f4fcac-b10a-4a44-96b4-bb0602ef25b3",
	project_id: "123456789012",
	received_at: timestamp,
	trace_id: "a".repeat(32),
	span_id: "b".repeat(16),
	parent_span_id: null,
	name: "GET /checkout",
	service: "checkout",
	environment: "test",
	kind: 2,
	start_time_unix_nano: "1794909600000000000",
	end_time_unix_nano: "1794909600001000000",
	duration_ms: 1,
	status_code: 1,
	status_message: null,
	trace_state: null,
	flags: 1,
	attributes: {
		"http.method": "GET",
		count: 0,
		cached: false,
		missing: null,
		tags: ["checkout", { retry: false }],
		details: { nested: { enabled: true } },
	},
	resource: {
		"service.name": "checkout",
		version: 2,
		enabled: true,
		note: null,
		zones: ["a", "b"],
		deployment: { region: "test" },
	},
	scope: {
		name: "instrumentation",
		version: 1,
		enabled: false,
		schema: null,
		tags: [],
		metadata: { revision: 3 },
	},
	events: [{ name: "request", attributes: { valid: false } }],
	links: [{ trace_id: "c".repeat(32) }],
	dropped_attributes_count: 0,
	dropped_events_count: 0,
	dropped_links_count: 0,
};
let responseBody = "{}";
let requestUrl = "";
let origin = "";
const server = createServer((request, response) => {
	requestUrl = request.url ?? "";
	response.setHeader("content-type", "application/json");
	response.end(responseBody);
});
beforeAll(async () => {
	server.listen(0, "127.0.0.1");
	await once(server, "listening");
	const address = server.address();
	if (!(address instanceof Object) || address.address !== "127.0.0.1")
		throw new Error("Loopback address unavailable");
	origin = `http://127.0.0.1:${address.port}`;
});
afterAll(async () => {
	server.closeAllConnections();
	await new Promise<void>((resolve, reject) =>
		server.close((error) => (error ? reject(error) : resolve())),
	);
});

describe.each(["logs", "traces"] as const)(
	"%s search project filters",
	(resource) => {
		it.each([
			undefined,
			"project-public-0001",
			"AbCdEf0123456789-",
			"a".repeat(128),
			"projectnano1",
			"123456789012",
			"unassigned",
			"",
			"1",
			"opaque/project:💡",
			"A".repeat(12),
			"x".repeat(256),
		])(
			"sends and validates the project filter %s over HTTP",
			async (projectId) => {
				const input = {
					from: timestamp,
					to: timestamp,
					project_id: projectId,
				};
				const query =
					resource === "logs"
						? parse(vSearchLogsQuery, zSearchLogsQuery.parse(input))
						: parse(vSearchTracesQuery, zSearchTracesQuery.parse(input));
				const payload = {
					success: true,
					errors: [],
					messages: [],
					result: {
						[resource === "logs" ? "logs" : "spans"]: [],
						next_cursor: null,
						scanned_bytes: 0,
					},
				};
				responseBody = JSON.stringify(payload);
				const client = createClient({ baseUrl: origin });

				const received =
					resource === "logs"
						? await searchLogs({ client, query })
						: await searchTraces({ client, query });

				expect(received.response?.status).toBe(200);
				expect(received.data).toEqual(payload);
				const url = new URL(requestUrl, origin);
				expect(url.pathname).toBe(`/v1/${resource}`);
				expect(url.searchParams.get("project_id")).toBe(projectId ?? null);
				if (resource === "logs") {
					expect(zSearchLogsResponse.parse(received.data)).toEqual(payload);
					expect(parse(vSearchLogsResponse, received.data)).toEqual(payload);
				} else {
					expect(zSearchTracesResponse.parse(received.data)).toEqual(payload);
					expect(parse(vSearchTracesResponse, received.data)).toEqual(payload);
				}
			},
		);

		it.each([42, true, {}, [], null])(
			"rejects non-string project filter %s",
			(projectId) => {
				const input = { from: timestamp, to: timestamp, project_id: projectId };

				if (resource === "logs") {
					expect(() => zSearchLogsQuery.parse(input)).toThrow();
					expect(() => parse(vSearchLogsQuery, input)).toThrow();
				} else {
					expect(() => zSearchTracesQuery.parse(input)).toThrow();
					expect(() => parse(vSearchTracesQuery, input)).toThrow();
				}
			},
		);
	},
);

it("preserves trace attribute, resource and scope maps from an HTTP response", async () => {
	const payload = {
		success: true,
		errors: [],
		messages: [],
		result: { spans: [span], next_cursor: null, scanned_bytes: 0 },
	};
	responseBody = JSON.stringify(payload);

	const received = await searchTraces({
		client: createClient({ baseUrl: origin }),
		query: { from: timestamp, to: timestamp },
	});

	expect(received.response?.status).toBe(200);
	expect(received.data).toEqual(payload);
	expect(zSearchTracesResponse.parse(received.data)).toEqual(payload);
	expect(parse(vSearchTracesResponse, received.data)).toEqual(payload);
});

it.each(["attributes", "resource", "scope"] as const)(
	"rejects a non-map trace %s in an HTTP response",
	async (field) => {
		for (const value of [null, [], "invalid"]) {
			const payload = {
				success: true,
				errors: [],
				messages: [],
				result: {
					spans: [{ ...span, [field]: value }],
					next_cursor: null,
					scanned_bytes: 0,
				},
			};
			responseBody = JSON.stringify(payload);

			const received = await searchTraces({
				client: createClient({ baseUrl: origin }),
				query: { from: timestamp, to: timestamp },
			});

			expect(received.response?.status).toBe(200);
			expect(() => zSearchTracesResponse.parse(received.data)).toThrow();
			expect(() => parse(vSearchTracesResponse, received.data)).toThrow();
		}
	},
);

it.each(["logs", "traces"] as const)(
	"preserves opaque %s record IDs over HTTP",
	async (resource) => {
		for (const id of ["", "1", "opaque/resource:💡", "x".repeat(256)]) {
			const record =
				resource === "traces"
					? { ...span, id }
					: {
							id,
							project_id: "opaque-project",
							timestamp,
							received_at: timestamp,
							level: "INFO",
							message: "Request completed",
							service: null,
							environment: null,
							attributes: {},
							trace_id: null,
							span_id: null,
						};
			const payload = {
				success: true,
				errors: [],
				messages: [],
				result: {
					[resource === "traces" ? "spans" : "logs"]: [record],
					next_cursor: null,
					scanned_bytes: 0,
				},
			};
			responseBody = JSON.stringify(payload);
			const client = createClient({ baseUrl: origin });
			const query = { from: timestamp, to: timestamp };

			const received =
				resource === "traces"
					? await searchTraces({ client, query })
					: await searchLogs({ client, query });

			expect(received.response?.status).toBe(200);
			if (resource === "traces") {
				expect(zSearchTracesResponse.parse(received.data)).toEqual(payload);
				expect(parse(vSearchTracesResponse, received.data)).toEqual(payload);
			} else {
				expect(zSearchLogsResponse.parse(received.data)).toEqual(payload);
				expect(parse(vSearchLogsResponse, received.data)).toEqual(payload);
			}
		}
	},
);
