import { parse } from "valibot";
import { describe, expect, it } from "vitest";

import {
	vCheckDeleteResponse,
	vCreateCheckBody,
	vSendLogsBody,
} from "../src/valibot";

describe("generated Valibot schemas", () => {
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

				const parsed = parse(vSendLogsBody, body);

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

				expect(() => parse(vSendLogsBody, body)).toThrow();
			},
		);
	});

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
