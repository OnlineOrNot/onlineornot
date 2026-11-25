import { describe, expect, it } from "vitest";

import {
	zCheckDeleteResponse,
	zCreateCheckBody,
	zDomainExpiry,
	zStatusPageComponent,
	zSendLogsBody,
} from "../src/zod";

describe("generated Zod schemas", () => {
	describe.each([
		["trace_id", 32],
		["span_id", 16],
	] as const)("log %s validation", (field, length) => {
		it.each(["a", "A", "aF09"])(
			"accepts hexadecimal IDs with %s",
			(characters) => {
				const value = characters.repeat(length / characters.length);
				const body = {
					logs: [{ message: "request completed", [field]: value }],
				};

				const parsed = zSendLogsBody.parse(body);

				expect(parsed.logs[0][field]).toBe(value);
			},
		);
		it.each(["short", "long", "non-hex", "literal-flags"])(
			"rejects %s IDs",
			(kind) => {
				const value =
					kind === "short"
						? "a".repeat(length - 1)
						: kind === "long"
							? "a".repeat(length + 1)
							: kind === "non-hex"
								? "g".repeat(length)
								: `${"a".repeat(length)}/i`;
				const body = {
					logs: [{ message: "request completed", [field]: value }],
				};

				expect(() => zSendLogsBody.parse(body)).toThrow();
			},
		);
	});

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

	it("accepts domain_expiry_alerts on check request bodies", () => {
		const result = zCreateCheckBody.parse({
			name: "Website",
			url: "https://example.com",
			domain_expiry_alerts: true,
		});

		expect(result.domain_expiry_alerts).toBe(true);
	});

	it("parses a verified domain expiry summary", () => {
		const summary = {
			domain: "example.com",
			lookup_status: "verified",
			expires_at: "2027-01-01T00:00:00.000Z",
			expired: false,
			last_verified_at: "2026-10-16T13:37:39.000Z",
		};

		expect(zDomainExpiry.parse(summary)).toEqual(summary);
	});

	it("rejects unknown domain expiry lookup statuses", () => {
		expect(() =>
			zDomainExpiry.parse({
				domain: "example.com",
				lookup_status: "stale",
				expires_at: null,
				expired: false,
				last_verified_at: null,
			}),
		).toThrow();
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
