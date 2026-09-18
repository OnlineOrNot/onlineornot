import { describe, expect, it } from "vitest";

import { zCreateCheckBody, zVerifyTokenResponse } from "../src/zod";

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
			result: { id: "token-id", status: "valid" },
			errors: [],
			messages: [],
		};

		expect(zVerifyTokenResponse.parse(response)).toEqual(response);
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
			zVerifyTokenResponse.parse({
				success: true,
				result: { status: 123 },
				errors: [],
				messages: [],
			}),
		).toThrow();
	});
});
