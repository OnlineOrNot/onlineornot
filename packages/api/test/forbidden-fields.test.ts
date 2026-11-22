import { parse } from "valibot";
import { describe, expect, expectTypeOf, it } from "vitest";

import type {
	CreateInvitationData,
	CreateTokenData,
	UpdateHeartbeatData,
} from "../src/index";
import {
	vCreateInvitationBody,
	vCreateTokenBody,
	vUpdateHeartbeatBody,
} from "../src/valibot";
import {
	zCreateInvitationBody,
	zCreateTokenBody,
	zUpdateHeartbeatBody,
} from "../src/zod";

// The API marks fields it always rejects with `not: {}`, so the SDK must not
// accept or send them.
describe("forbidden request fields", () => {
	it("omits access_scope from token creation", () => {
		expectTypeOf<NonNullable<CreateTokenData["body"]>>().not.toHaveProperty(
			"access_scope",
		);
		expect(zCreateTokenBody.shape).not.toHaveProperty("access_scope");
		expect(vCreateTokenBody.entries).not.toHaveProperty("access_scope");

		const body = {
			name: "Application logs",
			grants: [],
			access_scope: {},
		};
		expect(() => zCreateTokenBody.strict().parse(body)).toThrow();
		expect(zCreateTokenBody.parse(body)).not.toHaveProperty("access_scope");
		expect(parse(vCreateTokenBody, body)).not.toHaveProperty("access_scope");
	});

	it("omits team_assignments from invitations", () => {
		expectTypeOf<
			NonNullable<CreateInvitationData["body"]>
		>().not.toHaveProperty("team_assignments");
		expect(zCreateInvitationBody.shape).not.toHaveProperty("team_assignments");
		expect(vCreateInvitationBody.entries).not.toHaveProperty(
			"team_assignments",
		);

		const body = { email: "person@example.com", team_assignments: [] };
		expect(() => zCreateInvitationBody.strict().parse(body)).toThrow();
		expect(zCreateInvitationBody.parse(body)).not.toHaveProperty(
			"team_assignments",
		);
		expect(parse(vCreateInvitationBody, body)).not.toHaveProperty(
			"team_assignments",
		);
	});

	it("omits project_id from updates; moves change projects", () => {
		expectTypeOf<NonNullable<UpdateHeartbeatData["body"]>>().not.toHaveProperty(
			"project_id",
		);
		expect(zUpdateHeartbeatBody.shape).not.toHaveProperty("project_id");
		expect(vUpdateHeartbeatBody.entries).not.toHaveProperty("project_id");
		expect(() =>
			zUpdateHeartbeatBody.strict().parse({ project_id: "a1b2c3d4e5f6" }),
		).toThrow();
	});
});
