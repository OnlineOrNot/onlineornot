import { describe, expect, it } from "vitest";

import type { ParseError } from "../parse";
import {
	getApiConfig,
	unwrapApiEnvelope,
	unwrapApiResult,
} from "./infrastructure";

describe("API SDK infrastructure", () => {
	it("configures generated operations with CLI authentication", () => {
		const config = getApiConfig("secret-token");

		expect(config.auth).toBe("secret-token");
		expect(config.baseUrl).toBe("https://api.onlineornot.com");
		expect(config.headers["User-Agent"]).toMatch(/^onlineornot\//);
		expect(config.throwOnError).toBe(false);
	});

	it("unwraps successful API results", () => {
		const result = unwrapApiResult(
			{
				data: {
					success: true,
					result: { id: "check-id" },
					errors: [],
				},
				error: undefined,
			},
			"/checks",
		);

		expect(result).toEqual({ id: "check-id" });
	});

	it("preserves API error codes for CLI-specific handling", () => {
		expect(() =>
			unwrapApiEnvelope(
				{
					data: undefined,
					error: {
						success: false,
						result: null,
						errors: [{ code: 10003, message: "Forbidden" }],
					},
				},
				"/checks",
			),
		).toThrowError(
			expect.objectContaining<Partial<ParseError>>({
				code: 10003,
				text: "A request to the OnlineOrNot API (/checks) failed.",
			}),
		);
	});

	it("reports malformed SDK responses as parse errors", () => {
		expect(() =>
			unwrapApiEnvelope(
				{
					data: undefined,
					error: new SyntaxError("Unexpected token"),
				},
				"/checks",
			),
		).toThrowError("Received a malformed response from the API");
	});
});
