import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const temporaryDirectories: string[] = [];
const originalEnvironment = {
	installDirectory: process.env.ONLINEORNOT_INSTALL_DIR,
	sea: process.env.ONLINEORNOT_SEA,
};

const dependencies = {
	spawn: vi.fn(),
	runStandaloneUpdate: vi.fn(),
};

beforeEach(() => {
	vi.resetModules();
	dependencies.spawn.mockReset();
	dependencies.runStandaloneUpdate.mockReset();
	process.env.ONLINEORNOT_SEA = "true";
});

afterEach(async () => {
	if (originalEnvironment.installDirectory === undefined) {
		delete process.env.ONLINEORNOT_INSTALL_DIR;
	} else {
		process.env.ONLINEORNOT_INSTALL_DIR = originalEnvironment.installDirectory;
	}
	if (originalEnvironment.sea === undefined) {
		delete process.env.ONLINEORNOT_SEA;
	} else {
		process.env.ONLINEORNOT_SEA = originalEnvironment.sea;
	}
	await Promise.all(
		temporaryDirectories
			.splice(0)
			.map((directory) => rm(directory, { recursive: true, force: true })),
	);
});

async function loadAutoUpdate() {
	const installDirectory = await mkdtemp(
		path.join(tmpdir(), "onlineornot-auto-update-"),
	);
	temporaryDirectories.push(installDirectory);
	process.env.ONLINEORNOT_INSTALL_DIR = installDirectory;
	return {
		installDirectory,
		module: await import("./auto-update"),
	};
}

describe("automatic updates", () => {
	it("does not start for explicit update or uninstall commands", async () => {
		const { module } = await loadAutoUpdate();

		module.checkForUpdateInBackground(["--help", "update"], dependencies);
		module.checkForUpdateInBackground(["--force", "uninstall"], dependencies);

		expect(dependencies.spawn).not.toHaveBeenCalled();
	});

	it("does not start before the persisted next-check time", async () => {
		const { installDirectory, module } = await loadAutoUpdate();
		await writeFile(
			path.join(installDirectory, "auto-update-next-check"),
			`${Date.now() + 60_000}\n`,
		);

		module.checkForUpdateInBackground([], dependencies);

		expect(dependencies.spawn).not.toHaveBeenCalled();
	});

	it("ignores an implausibly distant next-check time", async () => {
		const child = { on: vi.fn(), unref: vi.fn() };
		dependencies.spawn.mockReturnValue(child);
		const { installDirectory, module } = await loadAutoUpdate();
		await writeFile(
			path.join(installDirectory, "auto-update-next-check"),
			`${Date.now() + 48 * 60 * 60 * 1000}\n`,
		);

		module.checkForUpdateInBackground([], dependencies);

		expect(dependencies.spawn).toHaveBeenCalledOnce();
	});

	it("handles background process spawn errors", async () => {
		const child = { on: vi.fn(), unref: vi.fn() };
		dependencies.spawn.mockReturnValue(child);
		const { module } = await loadAutoUpdate();

		module.checkForUpdateInBackground([], dependencies);

		expect(child.on).toHaveBeenCalledWith("error", expect.any(Function));
		expect(child.unref).toHaveBeenCalledOnce();
	});

	it("persists a successful automatic-check interval", async () => {
		dependencies.runStandaloneUpdate.mockResolvedValue({
			status: "current",
			version: "1.5.0",
		});
		const { installDirectory, module } = await loadAutoUpdate();
		await mkdir(installDirectory, { recursive: true });
		const beforeCheck = Date.now();

		await module.performUpdateCheck(dependencies);

		const nextCheckAt = Number(
			await readFile(
				path.join(installDirectory, "auto-update-next-check"),
				"utf8",
			),
		);
		expect(nextCheckAt).toBeGreaterThanOrEqual(
			beforeCheck + 24 * 60 * 60 * 1000,
		);
	});
});
