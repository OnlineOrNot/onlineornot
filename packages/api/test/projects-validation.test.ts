import { safeParse } from "valibot";
import { describe, expect, it } from "vitest";

import {
	vCreateProjectBody,
	vMoveCheckBody,
	vMoveHeartbeatBody,
	vUpdateCheckBody,
	vUpdateHeartbeatBody,
	vUpdateEnvironmentVariableBody,
} from "../src/valibot";
import {
	zCreateProjectBody,
	zMoveCheckBody,
	zMoveHeartbeatBody,
	zUpdateCheckBody,
	zUpdateHeartbeatBody,
	zUpdateEnvironmentVariableBody,
} from "../src/zod";

const project_id = "a1b2c3d4e5f6g7h8";

describe("candidate ownership validation", () => {
	it("requires a nonempty project name", () => {
		expect(zCreateProjectBody.safeParse({ name: "" }).success).toBe(false);
		expect(safeParse(vCreateProjectBody, { name: "" }).success).toBe(false);
	});
	it("validates explicit move destinations in both optional validators", () => {
		for (const schema of [zMoveCheckBody, zMoveHeartbeatBody]) {
			expect(schema.safeParse({ project_id }).success).toBe(true);
			expect(schema.safeParse({ project_id: "123" }).success).toBe(false);
			expect(schema.safeParse({}).success).toBe(false);
			expect(schema.safeParse({ project_id, paused: false }).success).toBe(
				false,
			);
		}
		for (const schema of [vMoveCheckBody, vMoveHeartbeatBody]) {
			expect(safeParse(schema, { project_id }).success).toBe(true);
			expect(safeParse(schema, { project_id: "123" }).success).toBe(false);
			expect(safeParse(schema, {}).success).toBe(false);
			expect(safeParse(schema, { project_id, paused: false }).success).toBe(
				false,
			);
		}
	});
	it("forbids ownership in ordinary patches", () => {
		for (const schema of [
			zUpdateCheckBody,
			zUpdateHeartbeatBody,
			zUpdateEnvironmentVariableBody,
		]) {
			expect(schema.safeParse({ name: "renamed", project_id }).success).toBe(
				false,
			);
		}
		for (const schema of [
			vUpdateCheckBody,
			vUpdateHeartbeatBody,
			vUpdateEnvironmentVariableBody,
		]) {
			expect(safeParse(schema, { name: "renamed", project_id }).success).toBe(
				false,
			);
		}
	});
});
