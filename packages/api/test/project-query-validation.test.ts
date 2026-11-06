import { safeParse } from "valibot";
import { describe, expect, it } from "vitest";

import {
	vListChecksQuery,
	vListEnvironmentVariablesQuery,
	vListHeartbeatsQuery,
	vListMaintenanceWindowsQuery,
	vListWebhooksQuery,
} from "../src/valibot";
import {
	zListChecksQuery,
	zListEnvironmentVariablesQuery,
	zListHeartbeatsQuery,
	zListMaintenanceWindowsQuery,
	zListWebhooksQuery,
} from "../src/zod";

describe.each([
	["checks", zListChecksQuery, vListChecksQuery],
	["env", zListEnvironmentVariablesQuery, vListEnvironmentVariablesQuery],
	["heartbeats", zListHeartbeatsQuery, vListHeartbeatsQuery],
	[
		"maintenance-windows",
		zListMaintenanceWindowsQuery,
		vListMaintenanceWindowsQuery,
	],
	["webhooks", zListWebhooksQuery, vListWebhooksQuery],
] as const)("%s project query validators", (_, zod, valibot) => {
	it.each([
		undefined,
		"a",
		["a", "b"],
		"unassigned",
		["a", "unassigned"],
		Array.from({ length: 100 }, () => "a"),
	])("accepts scalar, array, sentinel and omitted forms (%#)", (project_id) => {
		expect(zod.safeParse({ project_id }).success).toBe(true);
		expect(safeParse(valibot, { project_id }).success).toBe(true);
	});
	it.each([null, [], 1, ["a", 1], Array.from({ length: 101 }, () => "a")])(
		"rejects invalid values and arrays over 100 (%#)",
		(project_id) => {
			expect(zod.safeParse({ project_id }).success).toBe(false);
			expect(safeParse(valibot, { project_id }).success).toBe(false);
		},
	);
});
