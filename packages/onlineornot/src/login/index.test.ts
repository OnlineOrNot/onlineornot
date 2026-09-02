import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	buildAuthUrl: vi.fn(),
	getCredentials: vi.fn(),
	getEnvironmentToken: vi.fn(),
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
vi.mock("../open-in-browser", () => ({ default: mocks.openInBrowser }));

import { authenticateWithBrowser } from ".";

beforeEach(() => {
	vi.clearAllMocks();
	mocks.getEnvironmentToken.mockReturnValue("");
});

describe("login", () => {
	it("keeps an existing valid OAuth login without opening a new browser flow", async () => {
		mocks.getCredentials.mockReturnValue({
			accessToken: "access-token",
			refreshToken: "refresh-token",
			expiresAt: Date.now() + 60_000,
			scopes: ["UPTIME_CHECKS:EDIT"],
			user: { email: "user@example.com" },
		});

		await expect(authenticateWithBrowser()).resolves.toEqual({
			status: "existing",
			email: "user@example.com",
		});
		expect(mocks.startOAuthCallbackServer).not.toHaveBeenCalled();
		expect(mocks.openInBrowser).not.toHaveBeenCalled();
	});
});
