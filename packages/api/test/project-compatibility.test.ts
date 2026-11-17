import { once } from "node:events";
import { createServer } from "node:http";

import { parse, safeParse } from "valibot";
import { afterAll, beforeAll, expect, expectTypeOf, it } from "vitest";

import {
	createClient,
	getCheck,
	getEnvironmentVariable,
	getHeartbeat,
	getProject,
	getStatusPageComponent,
	getWebhook,
	listChecks,
	type CheckListItem,
	type Client,
	type EnvironmentVariableMetadata,
	type ExpandedBrowserCheck,
	type ExpandedDnsCheck,
	type ExpandedTcpCheck,
	type ExpandedUptimeCheck,
	type Heartbeat,
	type Project,
	type Webhook,
} from "../src/index";
import {
	vGetCheckResponse,
	vGetCheckPath,
	vGetEnvironmentVariablePath,
	vGetStatusPageComponentPath,
	vGetEnvironmentVariableResponse,
	vGetHeartbeatResponse,
	vGetProjectResponse,
	vGetProjectPath,
	vGetWebhookResponse,
	vListChecksResponse,
} from "../src/valibot";
import {
	zGetCheckResponse,
	zGetCheckPath,
	zGetEnvironmentVariablePath,
	zGetStatusPageComponentPath,
	zGetEnvironmentVariableResponse,
	zGetHeartbeatResponse,
	zGetProjectResponse,
	zGetProjectPath,
	zGetWebhookResponse,
	zListChecksResponse,
} from "../src/zod";

const projectId = "project-public-0001";
const timestamp = "2026-10-16T13:37:39.000Z";
const alerts = {
	user_alerts: [],
	slack_alerts: [],
	discord_alerts: [],
	incident_io_alerts: [],
	microsoft_teams_alerts: [],
	telegram_alerts: [],
	pushover_alerts: [],
	oncall_alerts: [],
	webhook_alerts: [],
};
const check = {
	...alerts,
	id: "check-public-0001",
	name: "Website",
	last_queued: null,
	status: "UP",
	reminder_alert_interval_minutes: null,
	confirmation_period_seconds: 0,
	recovery_period_seconds: 0,
	test_interval: 180,
	timeout: 30,
	alert_priority: "HIGH",
};
const httpCheck = {
	...check,
	url: "https://example.test",
	headers: null,
	text_to_search_for: null,
	script: null,
	verify_ssl: true,
	method: "GET",
	body: null,
	follow_redirects: true,
	assertions: null,
	auth_username: null,
	auth_password: null,
	test_regions: [],
};
const checkResults = [
	{ ...httpCheck, check_type: "UPTIME", version: "CLOUDFLARE" },
	{ ...httpCheck, check_type: "BROWSER", version: "NODE24_PLAYWRIGHT" },
	{
		...check,
		check_type: "DNS",
		url: null,
		version: "NODE24_DNS",
		dns_domain: "example.test",
		dns_record_type: "A",
		dns_resolver: null,
		dns_protocol: "UDP",
		test_regions: [],
		assertions: null,
	},
	{
		...check,
		check_type: "TCP",
		url: null,
		version: "NODE24_TCP",
		tcp_hostname: "example.test",
		tcp_port: 443,
		tcp_ip_family: "IPv4",
		tcp_data: null,
		tcp_should_fail: false,
		test_regions: [],
		assertions: null,
	},
];
const webhook = {
	id: "webhook-public-01",
	enabled: true,
	url: "https://example.test/hooks",
	description: null,
	events: ["uptime.down"],
	created_at: timestamp,
	updated_at: timestamp,
	status_pages: [],
	checks: [],
	heartbeats: [],
};
const fixtures = [
	...checkResults.map((result) => ({
		name: result.check_type,
		result,
		read: (client: Client) =>
			getCheck({ client, path: { check_id: result.id } }),
		zod: zGetCheckResponse,
		valibot: vGetCheckResponse,
	})),
	{
		name: "heartbeat",
		result: {
			...alerts,
			id: "heartbeat-public-01",
			name: "Backup",
			status: "UP",
			last_seen: null,
			report_period: 3600,
			report_period_cron: null,
			timezone: null,
			grace_period: 300,
			reminder_alert_interval_minutes: null,
			alert_priority: "HIGH",
			created_at: timestamp,
			updated_at: timestamp,
		},
		read: (client: Client) =>
			getHeartbeat({ client, path: { heartbeat_id: "heartbeat-public-01" } }),
		zod: zGetHeartbeatResponse,
		valibot: vGetHeartbeatResponse,
	},
	...["config", "secret"].map((type) => {
		const metadata = {
			id: "variable-public-01",
			name: "API_TOKEN",
			type,
			has_value: true,
			created_at: timestamp,
			updated_at: timestamp,
		};
		return {
			name: type,
			result:
				type === "config"
					? { ...metadata, value: "configured-value" }
					: metadata,
			read: (client: Client) =>
				getEnvironmentVariable({
					client,
					path: { environment_variable_id: "variable-public-01" },
				}),
			zod: zGetEnvironmentVariableResponse,
			valibot: vGetEnvironmentVariableResponse,
		};
	}),
	{
		name: "webhook",
		result: webhook,
		read: (client: Client) =>
			getWebhook({ client, path: { webhook_id: webhook.id } }),
		zod: zGetWebhookResponse,
		valibot: vGetWebhookResponse,
	},
];
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
	if (
		!(address instanceof Object) ||
		address.address !== "127.0.0.1" ||
		!Number.isInteger(address.port) ||
		address.port < 1
	)
		throw new Error("Loopback address unavailable");
	origin = `http://127.0.0.1:${address.port}`;
});
afterAll(async () => {
	server.closeAllConnections();
	await new Promise<void>((resolve, reject) =>
		server.close((error) => (error ? reject(error) : resolve())),
	);
});

it.each(fixtures)(
	"validates $name HTTP responses across assignment versions",
	async (fixture) => {
		for (const assignment of [
			undefined,
			projectId,
			"projectnano1",
			"123456789012",
			"",
			"1",
			"opaque/project:💡",
			"x".repeat(256),
			null,
		]) {
			const ownership =
				assignment === undefined ? {} : { project_id: assignment };
			const payload = {
				success: true,
				errors: [],
				messages: [],
				result: { ...fixture.result, ...ownership },
			};
			responseBody = JSON.stringify(payload);

			const received = await fixture.read(createClient({ baseUrl: origin }));

			expect(received.response?.status).toBe(200);
			expect(received.data).toEqual(payload);
			expect(fixture.zod.parse(received.data)).toEqual(payload);
			expect(parse(fixture.valibot, received.data)).toEqual(payload);
		}
	},
);

it.each([undefined, projectId, "projectnano1", "123456789012", null])(
	"validates check list assignment %s without inventing defaults",
	async (assignment) => {
		const ownership =
			assignment === undefined ? {} : { project_id: assignment };
		const payload = {
			success: true,
			errors: [],
			messages: [],
			result: checkResults.map((result) => ({
				...ownership,
				id: result.id,
				name: result.name,
				check_type: result.check_type,
				url: result.url,
				last_queued: result.last_queued,
				status: result.status,
			})),
			result_info: { page: 1, per_page: 20, count: 4, total_count: 4 },
		};
		responseBody = JSON.stringify(payload);

		const received = await listChecks({
			client: createClient({ baseUrl: origin }),
		});

		expect(received.data).toEqual(payload);
		expect(zListChecksResponse.parse(received.data)).toEqual(payload);
		expect(parse(vListChecksResponse, received.data)).toEqual(payload);
	},
);

it.each([
	projectId,
	"projectnano1",
	"123456789012",
	"",
	"1",
	"opaque/project:💡",
	"x".repeat(256),
])("validates project %s over HTTP without legacy metadata", async (id) => {
	const payload = {
		success: true,
		errors: [],
		messages: [],
		result: {
			id,
			name: "Staging",
			created_at: timestamp,
			updated_at: timestamp,
		},
	};
	responseBody = JSON.stringify(payload);

	const received = await getProject({
		client: createClient({ baseUrl: origin }),
		path: parse(vGetProjectPath, zGetProjectPath.parse({ project_id: id })),
	});

	expect(received.data).toEqual(payload);
	expect(zGetProjectResponse.parse(received.data)).toEqual(payload);
	expect(parse(vGetProjectResponse, received.data)).toEqual(payload);
});

it.each([true, false])(
	"does not expose the removed project marker %s through validators",
	async (flag) => {
		const payload = {
			success: true,
			errors: [],
			messages: [],
			result: {
				id: projectId,
				name: "Staging",
				created_at: timestamp,
				updated_at: timestamp,
			},
		};
		responseBody = JSON.stringify({
			...payload,
			result: { ...payload.result, is_default: flag },
		});

		const received = await getProject({
			client: createClient({ baseUrl: origin }),
			path: { project_id: projectId },
		});

		expect(received.response?.status).toBe(200);
		expect(zGetProjectResponse.parse(received.data)).toEqual(payload);
		expect(safeParse(vGetProjectResponse, received.data).success).toBe(false);
	},
);

it.each([42, true, {}, []])(
	"still rejects non-string assignment %j",
	(assignment) => {
		const payload = {
			success: true,
			errors: [],
			messages: [],
			result: { ...webhook, project_id: assignment },
		};

		expect(zGetWebhookResponse.safeParse(payload).success).toBe(false);
		expect(safeParse(vGetWebhookResponse, payload).success).toBe(false);
	},
);

it("exposes nullable assignments without legacy project metadata in public types", () => {
	expectTypeOf<ExpandedUptimeCheck["project_id"]>().toEqualTypeOf<
		string | null | undefined
	>();
	expectTypeOf<ExpandedBrowserCheck["project_id"]>().toEqualTypeOf<
		string | null | undefined
	>();
	expectTypeOf<ExpandedDnsCheck["project_id"]>().toEqualTypeOf<
		string | null | undefined
	>();
	expectTypeOf<ExpandedTcpCheck["project_id"]>().toEqualTypeOf<
		string | null | undefined
	>();
	expectTypeOf<CheckListItem["project_id"]>().toEqualTypeOf<
		string | null | undefined
	>();
	expectTypeOf<Heartbeat["project_id"]>().toEqualTypeOf<
		string | null | undefined
	>();
	expectTypeOf<EnvironmentVariableMetadata["project_id"]>().toEqualTypeOf<
		string | null | undefined
	>();
	expectTypeOf<Webhook["project_id"]>().toEqualTypeOf<
		string | null | undefined
	>();
	expectTypeOf<keyof Project>().toEqualTypeOf<
		"id" | "name" | "created_at" | "updated_at"
	>();
});

it.each([
	{
		name: "check",
		url: (id: string) => `/v1/checks/${encodeURIComponent(id)}`,
		path: (id: string) => ({ check_id: id }),
		zod: zGetCheckPath,
		valibot: vGetCheckPath,
		read: (client: Client, id: string) =>
			getCheck({ client, path: { check_id: id } }),
	},
	{
		name: "environment variable",
		url: (id: string) => `/v1/env/${encodeURIComponent(id)}`,
		path: (id: string) => ({ environment_variable_id: id }),
		zod: zGetEnvironmentVariablePath,
		valibot: vGetEnvironmentVariablePath,
		read: (client: Client, id: string) =>
			getEnvironmentVariable({ client, path: { environment_variable_id: id } }),
	},
	{
		name: "status page component",
		url: (id: string) =>
			`/v1/status_pages/${encodeURIComponent(id)}/components/${encodeURIComponent(id)}`,
		path: (id: string) => ({
			status_page_id: id,
			status_page_component_id: id,
		}),
		zod: zGetStatusPageComponentPath,
		valibot: vGetStatusPageComponentPath,
		read: (client: Client, id: string) =>
			getStatusPageComponent({
				client,
				path: { status_page_id: id, status_page_component_id: id },
			}),
	},
])("treats $name path IDs as opaque strings over HTTP", async (fixture) => {
	for (const id of ["", "1", "opaque/resource:💡", "x".repeat(256)]) {
		const path = fixture.path(id);
		const payload = { success: true, errors: [], messages: [], result: {} };
		responseBody = JSON.stringify(payload);

		expect(fixture.zod.parse(path)).toEqual(path);
		expect(parse(fixture.valibot, path)).toEqual(path);
		const received = await fixture.read(createClient({ baseUrl: origin }), id);

		expect(received.response?.status).toBe(200);
		expect(received.data).toEqual(payload);
		expect(new URL(requestUrl, origin).pathname).toBe(fixture.url(id));
	}
	for (const value of [undefined, null, 42, true, {}, []]) {
		const path = Object.fromEntries(
			Object.keys(fixture.path("id")).map((key) => [key, value]),
		);
		expect(fixture.zod.safeParse(path).success).toBe(false);
		expect(safeParse(fixture.valibot, path).success).toBe(false);
	}
});
