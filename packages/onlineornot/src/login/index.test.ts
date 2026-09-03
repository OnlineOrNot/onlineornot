import { beforeEach, describe, expect, it, vi } from "vitest";

import { authenticateWithBrowser } from ".";

const dependencies = {
	buildAuthUrl: vi.fn(),
	getCredentials: vi.fn(),
	getEnvironmentToken: vi.fn(),
	log: vi.fn(),
	now: vi.fn(() => Date.now()),
	openInBrowser: vi.fn(),
	saveCredentials: vi.fn(),
	startOAuthCallbackServer: vi.fn(),
	fetch: vi.fn<typeof fetch>(),
};

beforeEach(() => {
	vi.clearAllMocks();
	dependencies.getEnvironmentToken.mockReturnValue("");
});

describe("login", () => {
	it("keeps an existing valid OAuth login without opening a new browser flow", async () => {
		const selectProvider = vi.fn(async () => "github" as const);
		dependencies.getCredentials.mockReturnValue({
			accessToken: "access-token",
			refreshToken: "refresh-token",
			expiresAt: Date.now() + 60_000,
			scopes: ["UPTIME_CHECKS:EDIT"],
			user: { email: "user@example.com" },
		});

		await expect(
			authenticateWithBrowser({ selectProvider }, dependencies),
		).resolves.toEqual({
			status: "existing",
			email: "user@example.com",
		});
		expect(dependencies.startOAuthCallbackServer).not.toHaveBeenCalled();
		expect(dependencies.openInBrowser).not.toHaveBeenCalled();
		expect(selectProvider).not.toHaveBeenCalled();
	});

	it("selects a provider lazily before opening account creation", async () => {
		const selectProvider = vi.fn(async () => "github" as const);
		const close = vi.fn(async () => undefined);
		dependencies.getCredentials.mockReturnValue(null);
		dependencies.buildAuthUrl.mockResolvedValue({
			url: "https://onlineornot.com/api/auth/oauth2/authorize?signed=true",
			codeVerifier: "verifier",
			state: "state",
		});
		dependencies.startOAuthCallbackServer.mockResolvedValue({
			callbackUrl: "http://localhost:8976/oauth/callback",
			result: Promise.reject(new Error("Stop after opening browser")),
			close,
		});

		await expect(
			authenticateWithBrowser(
				{ prompt: "create", selectProvider },
				dependencies,
			),
		).rejects.toThrow("Stop after opening browser");

		expect(selectProvider).toHaveBeenCalledOnce();
		expect(dependencies.buildAuthUrl).toHaveBeenCalledWith({
			prompt: "create",
			provider: "github",
		});
		expect(dependencies.openInBrowser).toHaveBeenCalledWith(
			"https://onlineornot.com/api/auth/oauth2/authorize?signed=true",
		);
		expect(dependencies.log).toHaveBeenCalledWith(
			"Opening GitHub in your browser...",
		);
		expect(dependencies.log).toHaveBeenCalledWith(
			"If it doesn't open, use this link:\n  https://onlineornot.com/api/auth/oauth2/authorize?signed=true",
		);
		expect(close).toHaveBeenCalledOnce();
	});
});
