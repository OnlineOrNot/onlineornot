import { describe, expect, expectTypeOf, it } from "vitest";

import type { ParseError } from "../parse";
import {
	getApiConfig,
	unwrapApiEnvelope,
	unwrapApiResult,
} from "./infrastructure";

type TypedSdkResult =
	| {
			data: {
				success: true;
				result: { id: string };
				result_info: { page: number; total_pages: number };
				errors: [];
			};
			error: undefined;
	  }
	| {
			data: undefined;
			error: {
				success: false;
				result: null;
				errors: { code: number; message: string }[];
			};
	  };

// Keep the union at the call boundary, rather than narrowing to a literal branch.
function unwrapTypedSdkResult(response: TypedSdkResult) {
	const envelope = unwrapApiEnvelope(response, "/checks");
	const result = unwrapApiResult(response, "/checks");

	expectTypeOf(envelope.result.id).toEqualTypeOf<string>();
	expectTypeOf(envelope.result_info).toEqualTypeOf<{
		page: number;
		total_pages: number;
	}>();
	expectTypeOf(result.id).toEqualTypeOf<string>();

	return { envelope, result };
}

type TokenFailure = {
	success: false;
	result?: null;
	errors: { code: number; message: string }[];
};

type TokenSdkResult =
	| {
			data:
				| {
						success: boolean;
						result: { id?: string; status: string };
						errors: [];
				  }
				| TokenFailure;
			error: undefined;
	  }
	| { data: undefined; error: TokenFailure };

function unwrapTokenSdkResult(response: TokenSdkResult) {
	const envelope = unwrapApiEnvelope(response, "/tokens/verify");
	const result = unwrapApiResult(response, "/tokens/verify");

	expectTypeOf(envelope.result.status).toEqualTypeOf<string>();
	expectTypeOf(result.status).toEqualTypeOf<string>();
	expectTypeOf(result.id).toEqualTypeOf<string | undefined>();

	return result;
}

describe("API SDK infrastructure", () => {
	it("keeps token success typed when HTTP 200 can contain a failure", () => {
		expect(
			unwrapTokenSdkResult({
				data: { success: true, result: { status: "active" }, errors: [] },
				error: undefined,
			}),
		).toEqual({ status: "active" });
	});

	it.each(["data", "error"] as const)(
		"preserves API errors without result in SDK %s",
		(field) => {
			const failure: TokenFailure = {
				success: false,
				errors: [{ code: 10003, message: "Forbidden" }],
			};
			const response: TokenSdkResult =
				field === "data"
					? { data: failure, error: undefined }
					: { data: undefined, error: failure };

			for (const unwrap of [unwrapApiEnvelope, unwrapApiResult]) {
				expect(() => unwrap(response, "/tokens/verify")).toThrowError(
					expect.objectContaining<Partial<ParseError>>({
						code: 10003,
						notes: [{ text: "Forbidden [code: 10003]" }],
					}),
				);
			}
		},
	);

	it.each([unwrapApiEnvelope, unwrapApiResult])(
		"still rejects successful envelopes missing result via %s",
		(unwrap) => {
			expect(() =>
				unwrap(
					{
						// @ts-expect-error Deliberately malformed wire response.
						data: { success: true, errors: [] },
						error: undefined,
					},
					"/tokens/verify",
				),
			).toThrowError("Received a malformed response from the API");
		},
	);
	it("preserves success and pagination types with typed SDK errors", () => {
		const data: Extract<TypedSdkResult, { error: undefined }>["data"] = {
			success: true,
			result: { id: "check-id" },
			result_info: { page: 1, total_pages: 2 },
			errors: [],
		};

		expect(unwrapTypedSdkResult({ data, error: undefined })).toEqual({
			envelope: data,
			result: { id: "check-id" },
		});
	});

	it.each([unwrapApiEnvelope, unwrapApiResult])(
		"rejects typed SDK errors via %s",
		(unwrap) => {
			const unwrapTypedError = (response: TypedSdkResult) =>
				unwrap(response, "/checks");

			expect(() =>
				unwrapTypedError({
					data: undefined,
					error: {
						success: false,
						result: null,
						errors: [{ code: 10003, message: "Forbidden" }],
					},
				}),
			).toThrowError(
				expect.objectContaining<Partial<ParseError>>({
					code: 10003,
					text: "A request to the OnlineOrNot API (/checks) failed.",
					notes: [{ text: "Forbidden [code: 10003]" }],
				}),
			);
		},
	);
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
