import { parse, type InferOutput } from "valibot";
import { describe, expect, expectTypeOf, it } from "vitest";

import type { CreateTokenData } from "../src/index";
import {
	vCreateTokenBody,
	vGetTokenResponse,
	vListTokensResponse,
} from "../src/valibot";
import {
	zCreateTokenBody,
	zGetTokenResponse,
	zListTokensResponse,
} from "../src/zod";

function tokenMetadata(grants: unknown[]) {
	return {
		id: "token123",
		name: "Application logs",
		grants,
		project_id: null,
		expiresAfter: null,
		createdAt: "2026-10-27T00:00:00.000Z",
	};
}

const validators = [
	{
		name: "create",
		validate(grants: unknown[]) {
			const body = { name: "Application logs", grants };
			return {
				valibot: () => parse(vCreateTokenBody, body),
				zod: () => zCreateTokenBody.parse(body),
			};
		},
	},
	{
		name: "get",
		validate(grants: unknown[]) {
			const body = {
				success: true,
				result: tokenMetadata(grants),
				errors: [],
				messages: [],
			};
			return {
				valibot: () => parse(vGetTokenResponse, body),
				zod: () => zGetTokenResponse.parse(body),
			};
		},
	},
	{
		name: "list",
		validate(grants: unknown[]) {
			const body = {
				success: true,
				result: {
					result: [tokenMetadata(grants)],
					result_info: {
						page: 1,
						per_page: 10,
						total_count: 1,
						total_pages: 1,
					},
				},
				errors: [],
				messages: [],
			};
			return {
				valibot: () => parse(vListTokensResponse, body),
				zod: () => zListTokensResponse.parse(body),
			};
		},
	},
];

describe.each(validators)("$name token grant validation", ({ validate }) => {
	it.each([
		null,
		{},
		"LOGS:SEND",
		{ scope: "API_TOKENS", permission: "SEND" },
		{ scope: "LOGS", permission: "WRITE" },
		{ scope: "UNKNOWN", permission: "READ" },
		{ scope: "LOGS" },
	])("rejects invalid grant %j", (grant) => {
		const schemas = validate([grant]);
		expect(schemas.valibot).toThrow();
		expect(schemas.zod).toThrow();
	});

	it.each(["READ", "EDIT"])(
		"preserves explicit LOGS:%s with SEND and token read access",
		(permission) => {
			const grants = [
				{ scope: "LOGS", permission: "SEND" },
				{ scope: "LOGS", permission },
				{ scope: "API_TOKENS", permission: "READ" },
			];
			const schemas = validate(grants);
			expect(schemas.valibot()).toEqual(schemas.zod());
		},
	);
});

it("keeps Valibot grants typed like the generated token contract", () => {
	const parsed = parse(vCreateTokenBody, {
		name: "Application logs",
		grants: [{ scope: "LOGS", permission: "SEND" }],
	});
	expectTypeOf(parsed.grants).toEqualTypeOf<
		CreateTokenData["body"]["grants"]
	>();
	expectTypeOf<
		InferOutput<typeof vGetTokenResponse>["result"]["grants"]
	>().toEqualTypeOf<CreateTokenData["body"]["grants"]>();
	expectTypeOf<
		InferOutput<
			typeof vListTokensResponse
		>["result"]["result"][number]["grants"]
	>().toEqualTypeOf<CreateTokenData["body"]["grants"]>();
});
