import { parse } from "valibot";
import { describe, expect, it } from "vitest";

import { createToken, getToken } from "../src/index";
import { vCreateTokenBody, vGetTokenResponse } from "../src/valibot";
import { zCreateTokenBody, zGetTokenResponse } from "../src/zod";

describe("log sending tokens", () => {
	it.each([null, "projectABC1234567890"])(
		"creates combined grants with sending project %s",
		async (projectId) => {
			const body = {
				name: "Application logs",
				grants: [
					{ scope: "LOGS", permission: "SEND" },
					{ scope: "API_TOKENS", permission: "READ" },
				],
				project_id: projectId,
			} satisfies NonNullable<Parameters<typeof createToken>[0]>["body"];
			expect(zCreateTokenBody.parse(body)).toEqual(body);
			expect(parse(vCreateTokenBody, body)).toEqual(body);
			const result = await createToken({
				body,
				auth: "test-management-token",
				fetch: async (input) => {
					const request = input instanceof Request ? input : new Request(input);
					expect(request.url).toBe("https://api.onlineornot.com/v1/tokens");
					expect(request.method).toBe("POST");
					expect(request.headers.get("authorization")).toBe(
						"Bearer test-management-token",
					);
					expect(await request.json()).toEqual(body);
					return Response.json(
						{
							success: true,
							result: {
								id: "token123",
								name: body.name,
								token: "test-created-token",
								project_id: projectId,
								expiresAfter: null,
								createdAt: "2026-10-27T00:00:00.000Z",
							},
							errors: [],
							messages: [],
						},
						{ status: 201 },
					);
				},
			});
			expect(result.data?.result.project_id).toBe(projectId);
		},
	);

	it.each([null, "projectABC1234567890"])(
		"preserves sending project %s in validated token metadata",
		async (projectId) => {
			const metadata = {
				success: true,
				result: {
					id: "token123",
					name: "Application logs",
					project_id: projectId,
					grants: [
						{ scope: "API_TOKENS", permission: "READ" },
						{ scope: "LOGS", permission: "SEND" },
					],
					expiresAfter: null,
					createdAt: "2026-10-27T00:00:00.000Z",
				},
				errors: [],
				messages: [],
			};
			const result = await getToken({
				path: { token_id: "token123" },
				fetch: async () => Response.json(metadata),
			});
			expect(zGetTokenResponse.parse(result.data)).toEqual(metadata);
			expect(parse(vGetTokenResponse, result.data)).toEqual(metadata);
		},
	);
});
