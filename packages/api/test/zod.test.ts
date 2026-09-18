import { describe, expect, it } from "vitest";

import {
	zCheckDeleteResponse,
	zCreateCheckBody,
	zStatusPageComponent,
} from "../src/zod";

describe("generated Zod schemas", () => {
	it("parses a representative request body", () => {
		const result = zCreateCheckBody.parse({
			name: "Website",
			url: "https://example.com",
			test_interval: 60,
		});

		expect(result).toMatchObject({
			name: "Website",
			url: "https://example.com",
			test_interval: 60,
		});
	});

	it("parses a representative response", () => {
		const response = {
			success: true,
			result: { id: "check-id" },
			errors: [],
			messages: [],
		};

		expect(zCheckDeleteResponse.parse(response)).toEqual(response);
	});

	it("rejects responses missing required fields with API defaults", () => {
		expect(() =>
			zCheckDeleteResponse.parse({
				result: { id: "check-id" },
				errors: [],
				messages: [],
			}),
		).toThrow();
		expect(
			zStatusPageComponent.shape.display_uptime.safeParse(undefined).success,
		).toBe(false);
		expect(
			zStatusPageComponent.shape.display_metrics.safeParse(undefined).success,
		).toBe(false);
	});

	it("rejects invalid request and response values", () => {
		expect(() =>
			zCreateCheckBody.parse({
				name: "Website",
				url: "not a URL",
				test_interval: 10,
			}),
		).toThrow();
		expect(() =>
			zCheckDeleteResponse.parse({
				success: true,
				result: { id: 123 },
				errors: [],
				messages: [],
			}),
		).toThrow();
	});
});
