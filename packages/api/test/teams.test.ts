import { once } from "node:events";
import { createServer } from "node:http";

import * as v from "valibot";
import { afterAll, beforeAll, beforeEach, expect, it } from "vitest";

import {
	addProjectTeam,
	approveTeamJoinRequest,
	createClient,
	createTeam,
	deleteTeam,
	deleteTeamJoinRequest,
	getOrganisationAccessSettings,
	getTeam,
	joinTeam,
	leaveTeam,
	listProjectTeams,
	listTeamJoinRequests,
	listTeamMembers,
	listTeamProjects,
	listTeams,
	removeProjectTeam,
	removeTeamMember,
	setTeamMember,
	updateTeam,
} from "../src/index";
import { vCreateTokenBody, vSetTeamMemberBody } from "../src/valibot";
import { zCreateTokenBody, zSetTeamMemberBody } from "../src/zod";

const teamId = "team-public-0001";
const userId = "user-public-0001";
const projectId = "project-public-0001";
const requests: {
	method: string;
	url: string;
	body: string;
	authorization: string | undefined;
	organisation: string | string[] | undefined;
}[] = [];
let origin = "";
const server = createServer((request, response) => {
	void (async () => {
		let body = "";
		for await (const chunk of request) body += String(chunk);
		requests.push({
			method: request.method ?? "GET",
			url: request.url ?? "/",
			body,
			authorization: request.headers.authorization,
			organisation: request.headers["x-onlineornot-organisation"],
		});
		response.setHeader("content-type", "application/json");
		response.statusCode = 200;
		response.end(
			JSON.stringify({
				success: true,
				errors: [],
				messages: [],
				result: { id: teamId, name: "Platform" },
			}),
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
});
function client() {
	return createClient({ baseUrl: origin, auth: "fabricated-team-token" });
}

it("exposes every team operation over HTTP with bearer auth", async () => {
	const isolated = client();
	const team = { team_id: teamId };
	const member = { team_id: teamId, user_id: userId };
	const link = { project_id: projectId, team_id: teamId };
	await listTeams({ client: isolated, query: { page: 2, per_page: 10 } });
	await createTeam({ client: isolated, body: { name: "Platform" } });
	const read = await getTeam({ client: isolated, path: team });
	expect(read.data?.result.id).toBe(teamId);
	await updateTeam({ client: isolated, path: team, body: { name: "Infra" } });
	await deleteTeam({ client: isolated, path: team });
	await listTeamMembers({ client: isolated, path: team });
	await setTeamMember({
		client: isolated,
		path: member,
		body: { role: "CONTRIBUTOR" },
	});
	await removeTeamMember({ client: isolated, path: member });
	await joinTeam({ client: isolated, path: team });
	await leaveTeam({ client: isolated, path: team });
	await listTeamJoinRequests({ client: isolated, path: team });
	await approveTeamJoinRequest({ client: isolated, path: member });
	await deleteTeamJoinRequest({ client: isolated, path: member });
	await listTeamProjects({ client: isolated, path: team });
	await listProjectTeams({ client: isolated, path: { project_id: projectId } });
	await addProjectTeam({ client: isolated, path: link });
	await removeProjectTeam({ client: isolated, path: link });
	await getOrganisationAccessSettings({
		client: isolated,
		headers: { "X-OnlineOrNot-Organisation": "org-public-0001" },
	});
	expect(requests.map((r) => [r.method, r.url])).toEqual([
		["GET", "/v1/teams?page=2&per_page=10"],
		["POST", "/v1/teams"],
		["GET", `/v1/teams/${teamId}`],
		["PATCH", `/v1/teams/${teamId}`],
		["DELETE", `/v1/teams/${teamId}`],
		["GET", `/v1/teams/${teamId}/members`],
		["PUT", `/v1/teams/${teamId}/members/${userId}`],
		["DELETE", `/v1/teams/${teamId}/members/${userId}`],
		["POST", `/v1/teams/${teamId}/join`],
		["DELETE", `/v1/teams/${teamId}/membership`],
		["GET", `/v1/teams/${teamId}/join-requests`],
		["POST", `/v1/teams/${teamId}/join-requests/${userId}/approve`],
		["DELETE", `/v1/teams/${teamId}/join-requests/${userId}`],
		["GET", `/v1/teams/${teamId}/projects`],
		["GET", `/v1/projects/${projectId}/teams`],
		["PUT", `/v1/projects/${projectId}/teams/${teamId}`],
		["DELETE", `/v1/projects/${projectId}/teams/${teamId}`],
		["GET", "/v1/organisation/access-settings"],
	]);
	expect(
		requests.every((r) => r.authorization === "Bearer fabricated-team-token"),
	).toBe(true);
	expect(requests.map((r) => r.body)).toEqual([
		"",
		JSON.stringify({ name: "Platform" }),
		"",
		JSON.stringify({ name: "Infra" }),
		"",
		"",
		JSON.stringify({ role: "CONTRIBUTOR" }),
		"",
		"",
		"",
		"",
		"",
		"",
		"",
		"",
		"",
		"",
		"",
	]);
	expect(requests.at(-1)?.organisation).toBe("org-public-0001");
});

it("validates team member roles with both validator entrypoints", () => {
	expect(zSetTeamMemberBody.safeParse({ role: "ADMIN" }).success).toBe(true);
	expect(zSetTeamMemberBody.safeParse({ role: "OWNER" }).success).toBe(false);
	expect(v.safeParse(vSetTeamMemberBody, { role: "ADMIN" }).success).toBe(true);
	expect(v.safeParse(vSetTeamMemberBody, { role: "OWNER" }).success).toBe(
		false,
	);
});

it("accepts the TEAMS token grant scope", () => {
	const body = {
		name: "Team automation",
		grants: [{ scope: "TEAMS", permission: "READ" }],
	};
	expect(zCreateTokenBody.safeParse(body).success).toBe(true);
	expect(v.safeParse(vCreateTokenBody, body).success).toBe(true);
});
