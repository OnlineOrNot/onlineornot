import { describe, expect, it, vi } from "vitest";
import { runSetup, validateCheckUrl } from ".";
import type { BrowserAuthenticationOptions } from "../login";
import type { Check, CheckListItem } from "../checks/types";
import type { SetupCheckState } from "./state";

const createdCheck = {
	id: "public-check-id",
	name: "Example",
	url: "https://example.com/",
} as Check;

function dependencies(options: {
	state?: SetupCheckState | null;
	checks?: CheckListItem[];
}) {
	let state = options.state ?? null;
	return {
		authenticate: vi.fn(async (_options?: BrowserAuthenticationOptions) => ({
			status: "existing" as const,
			email: "user@example.com",
		})),
		listChecks: vi.fn(async () => options.checks ?? []),
		createCheck: vi.fn(async () => createdCheck),
		getState: vi.fn(() => state),
		saveState: vi.fn((next: SetupCheckState) => {
			state = next;
		}),
		prompt: vi.fn(async () => ""),
		isInteractive: false,
		log: vi.fn(),
	};
}

describe("setup", () => {
	it.each([
		"example.com",
		"ftp://example.com",
		"https://user:pass@example.com",
	])("rejects an unsafe or incomplete URL: %s", (value) => {
		expect(() => validateCheckUrl(value)).toThrow();
	});

	it("creates a first check from non-interactive flags", async () => {
		const deps = dependencies({});

		await expect(
			runSetup({ url: "https://example.com", name: "Example" }, deps),
		).resolves.toMatchObject(createdCheck);
		expect(deps.authenticate).toHaveBeenCalledWith({ prompt: "create" });
		expect(deps.createCheck).toHaveBeenCalledOnce();
		expect(deps.saveState).toHaveBeenLastCalledWith({
			url: "https://example.com/",
			name: "Example",
			checkId: "public-check-id",
		});
	});

	it("passes an explicit provider into account creation", async () => {
		const deps = dependencies({});

		await runSetup(
			{
				url: "https://example.com",
				name: "Example",
				provider: "github",
			},
			deps,
		);

		expect(deps.authenticate).toHaveBeenCalledWith({
			prompt: "create",
			provider: "github",
		});
	});

	it("asks an interactive user which provider to use", async () => {
		const deps = dependencies({});
		deps.isInteractive = true;
		deps.prompt.mockResolvedValueOnce("2");
		deps.authenticate.mockImplementation(async (options) => {
			expect(await options?.selectProvider?.()).toBe("github");
			return { status: "existing", email: "user@example.com" };
		});

		await runSetup({ url: "https://example.com", name: "Example" }, deps);

		expect(deps.prompt).toHaveBeenCalledWith(
			expect.stringContaining("Sign in (or sign up) with"),
		);
	});

	it("resumes an interrupted creation without making a duplicate", async () => {
		const pending = { url: "https://example.com/", name: "Example" };
		const deps = dependencies({
			state: pending,
			checks: [createdCheck as CheckListItem],
		});

		await runSetup({}, deps);

		expect(deps.createCheck).not.toHaveBeenCalled();
		expect(deps.saveState).toHaveBeenLastCalledWith({
			...pending,
			checkId: "public-check-id",
		});
	});

	it("does not create a duplicate check on a completed rerun", async () => {
		const completed = {
			url: "https://example.com/",
			name: "Example",
			checkId: "public-check-id",
		};
		const deps = dependencies({
			state: completed,
			checks: [createdCheck as CheckListItem],
		});

		await runSetup({}, deps);

		expect(deps.createCheck).not.toHaveBeenCalled();
	});

	it("requires --url without a TTY or resumable state", async () => {
		const deps = dependencies({});

		await expect(runSetup({}, deps)).rejects.toThrow(
			"A URL is required in non-interactive mode",
		);
		expect(deps.createCheck).not.toHaveBeenCalled();
	});
});
