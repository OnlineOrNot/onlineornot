import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	buildAuthUrl: vi.fn(),
	getCredentials: vi.fn(),
	getEnvironmentToken: vi.fn(),
	log: vi.fn(),
	openInBrowser: vi.fn(),
	saveCredentials: vi.fn(),
	startOAuthCallbackServer: vi.fn(),
}));

vi.mock("../auth", () => ({
	buildAuthUrl: mocks.buildAuthUrl,
	getCredentials: mocks.getCredentials,
	saveCredentials: mocks.saveCredentials,
	startOAuthCallbackServer: mocks.startOAuthCallbackServer,
}));
vi.mock("../environment-variables/misc-variables", () => ({
	getOnlineOrNotAPITokenFromEnv: mocks.getEnvironmentToken,
}));
vi.mock("../logger", () => ({ logger: { log: mocks.log } }));
vi.mock("../open-in-browser", () => ({ default: mocks.openInBrowser }));

import { authenticateWithBrowser } from ".";

beforeEach(() => {
	vi.clearAllMocks();
	mocks.getEnvironmentToken.mockReturnValue("");
});

describe("login", () => {
	it("keeps an existing valid OAuth login without opening a new browser flow", async () => {
		const selectProvider = vi.fn(async () => "github" as const);
		mocks.getCredentials.mockReturnValue({
			accessToken: "access-token",
			refreshToken: "refresh-token",
			expiresAt: Date.now() + 60_000,
			scopes: ["UPTIME_CHECKS:EDIT"],
			user: { email: "user@example.com" },
		});

		await expect(authenticateWithBrowser({ selectProvider })).resolves.toEqual({
			status: "existing",
			email: "user@example.com",
		});
		expect(mocks.startOAuthCallbackServer).not.toHaveBeenCalled();
		expect(mocks.openInBrowser).not.toHaveBeenCalled();
		expect(selectProvider).not.toHaveBeenCalled();
	});

	it("selects a provider lazily before opening account creation", async () => {
		const selectProvider = vi.fn(async () => "github" as const);
		const close = vi.fn(async () => undefined);
		mocks.getCredentials.mockReturnValue(null);
		mocks.buildAuthUrl.mockResolvedValue({
			url: "https://onlineornot.com/api/auth/oauth2/authorize?signed=true",
			codeVerifier: "verifier",
			state: "state",
		});
		mocks.startOAuthCallbackServer.mockResolvedValue({
			result: Promise.reject(new Error("Stop after opening browser")),
			close,
		});

		await expect(
			authenticateWithBrowser({ prompt: "create", selectProvider }),
		).rejects.toThrow("Stop after opening browser");

		expect(selectProvider).toHaveBeenCalledOnce();
		expect(mocks.buildAuthUrl).toHaveBeenCalledWith({
			prompt: "create",
			provider: "github",
		});
		expect(mocks.openInBrowser).toHaveBeenCalledWith(
			"https://onlineornot.com/api/auth/oauth2/authorize?signed=true",
		);
		expect(mocks.log).toHaveBeenCalledWith("Opening GitHub in your browser...");
		expect(mocks.log).toHaveBeenCalledWith(
			"If it doesn't open, use this link:\n  https://onlineornot.com/api/auth/oauth2/authorize?signed=true",
		);
		expect(close).toHaveBeenCalledOnce();
	});
});
