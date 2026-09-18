import { parse } from "valibot";
import { describe, expect, it } from "vitest";

import { vCheckDeleteResponse, vCreateCheckBody } from "../src/valibot";

describe("generated Valibot schemas", () => {
	it("parses a representative request body", () => {
		const result = parse(vCreateCheckBody, {
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

		expect(parse(vCheckDeleteResponse, response)).toEqual(response);
	});

	it("rejects a response missing its required success field", () => {
		expect(() =>
			parse(vCheckDeleteResponse, {
				result: { id: "check-id" },
				errors: [],
				messages: [],
			}),
		).toThrow();
	});

	it("rejects invalid request and response values", () => {
		expect(() =>
			parse(vCreateCheckBody, {
				name: "Website",
				url: "not a URL",
				test_interval: 10,
			}),
		).toThrow();
		expect(() =>
			parse(vCheckDeleteResponse, {
				success: true,
				result: { id: 123 },
				errors: [],
				messages: [],
			}),
		).toThrow();
	});
});
