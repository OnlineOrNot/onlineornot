import { describe, expect, it } from "vitest";
import {
	indexLocation,
	ParseError,
	parseJSON,
	parsePackageJSON,
} from "./parse";

describe("parseJSON", () => {
	it("parses valid JSON", () => {
		const result = parseJSON<{ foo: string }>('{"foo": "bar"}');
		expect(result).toEqual({ foo: "bar" });
	});

	it("throws ParseError for invalid JSON", () => {
		expect(() => parseJSON("{invalid}")).toThrow(ParseError);
	});

	it("includes file info in ParseError", () => {
		try {
			parseJSON("{invalid}", "test.json");
		} catch (err) {
			expect(err).toBeInstanceOf(ParseError);
			const parseErr = err as ParseError;
			expect(parseErr.location?.file).toBe("test.json");
		}
	});
});

describe("parsePackageJSON", () => {
	it("parses valid package.json content", () => {
		const result = parsePackageJSON('{"dependencies": {"foo": "1.0.0"}}');
		expect(result.dependencies).toEqual({ foo: "1.0.0" });
	});
});

describe("indexLocation", () => {
	it("calculates line and column for single line", () => {
		const location = indexLocation({ fileText: "hello world" }, 6);
		expect(location.line).toBe(1);
		expect(location.column).toBe(5);
		expect(location.lineText).toBe("hello world");
	});

	it("calculates line and column for multiline text", () => {
		const location = indexLocation({ fileText: "line1\nline2\nline3" }, 8);
		expect(location.line).toBe(2);
		expect(location.lineText).toBe("line2");
	});

	it("handles empty fileText", () => {
		const location = indexLocation({}, 0);
		expect(location.line).toBe(1);
		expect(location.column).toBe(-1);
	});
});

describe("ParseError", () => {
	it("creates error with text and location", () => {
		const error = new ParseError({
			text: "Test error",
			location: { line: 1, column: 5 },
		});
		expect(error.message).toBe("Test error");
		expect(error.text).toBe("Test error");
		expect(error.location?.line).toBe(1);
		expect(error.kind).toBe("error");
	});

	it("defaults kind to error", () => {
		const error = new ParseError({ text: "Test" });
		expect(error.kind).toBe("error");
	});

	it("accepts warning kind", () => {
		const error = new ParseError({ text: "Warning", kind: "warning" });
		expect(error.kind).toBe("warning");
	});
});
