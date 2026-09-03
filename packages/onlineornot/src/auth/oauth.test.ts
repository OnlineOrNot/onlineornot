import http from "node:http";

import { afterEach, describe, expect, it } from "vitest";

import {
	buildAuthUrl,
	CALLBACK_PORT,
	startOAuthCallbackServer,
	type TokenResponse,
} from "./oauth";

const tokens: TokenResponse = {
	access_token: "access-token",
	refresh_token: "refresh-token",
	expires_in: 3600,
	token_type: "Bearer",
	scope: "openid UPTIME_CHECKS:EDIT",
};

const openServers: http.Server[] = [];

afterEach(async () => {
	await Promise.all(
		openServers.splice(0).map(
			(server) =>
				new Promise<void>((resolve) => {
					if (!server.listening) return resolve();
					server.close(() => resolve());
				}),
		),
	);
});

describe("OAuth authorization URL", () => {
	it("requests account creation for guided setup", async () => {
		const { url } = await buildAuthUrl({
			prompt: "create",
			provider: "github",
		});

		expect(new URL(url).searchParams.get("prompt")).toBe("create");
		expect(new URL(url).searchParams.get("oon_provider")).toBe("github");
	});
});

describe("OAuth callback server", () => {
	it("returns tokens for a matching callback state", async () => {
		const callback = await startOAuthCallbackServer("verifier", "state", {
			port: 0,
			exchangeCode: async (code, verifier, callbackUrl) => {
				expect(code).toBe("authorization-code");
				expect(verifier).toBe("verifier");
				expect(callbackUrl).toBe(callback.callbackUrl);
				return tokens;
			},
		});

		await fetch(`${callback.callbackUrl}?code=authorization-code&state=state`, {
			redirect: "manual",
		});

		await expect(callback.result).resolves.toEqual(tokens);
	});

	it("reports authorization denial", async () => {
		const callback = await startOAuthCallbackServer("verifier", "state", {
			port: 0,
		});
		const rejected = expect(callback.result).rejects.toThrow(
			"Authorization denied: No",
		);

		await fetch(
			`${callback.callbackUrl}?error=access_denied&error_description=No&state=state`,
			{ redirect: "manual" },
		);

		await rejected;
	});

	it("times out and releases the callback server", async () => {
		const callback = await startOAuthCallbackServer("verifier", "state", {
			port: 0,
			timeoutMs: 10,
		});

		await expect(callback.result).rejects.toThrow(
			"Timed out waiting for authorization",
		);
		expect(() => callback.close()).not.toThrow();
	});

	it("fails clearly when the callback port is occupied", async () => {
		const occupied = http.createServer();
		openServers.push(occupied);
		await new Promise<void>((resolve) =>
			occupied.listen(CALLBACK_PORT, "localhost", resolve),
		);

		await expect(startOAuthCallbackServer("verifier", "state")).rejects.toThrow(
			`callback port ${CALLBACK_PORT} is already in use`,
		);
	});

	it("can be interrupted before authorization and releases its port", async () => {
		const callback = await startOAuthCallbackServer("verifier", "state", {
			port: 0,
		});
		const port = new URL(callback.callbackUrl).port;

		await callback.close();
		const replacement = await startOAuthCallbackServer("verifier", "state", {
			port: Number(port),
		});
		await replacement.close();
	});
});
