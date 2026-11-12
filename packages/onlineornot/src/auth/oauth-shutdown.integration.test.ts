import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { build } from "esbuild";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

let directory: string;
let fixturePath: string;

beforeAll(async () => {
	directory = await mkdtemp(path.join(tmpdir(), "onlineornot-oauth-shutdown-"));
	fixturePath = path.join(directory, "callback-shutdown.cjs");
	await build({
		entryPoints: ["src/auth/fixtures/callback-shutdown.ts"],
		outfile: fixturePath,
		bundle: true,
		platform: "node",
		format: "cjs",
		external: ["esbuild"],
	});
}, 30_000);

afterAll(async () => {
	await rm(directory, { recursive: true, force: true });
});

function runFixture(scenario: string) {
	return new Promise<{ code: number | null; stdout: string; stderr: string }>(
		(resolve, reject) => {
			const child = spawn(process.execPath, [fixturePath, scenario], {
				cwd: directory,
				env: {
					PATH: process.env.PATH,
					HOME: directory,
					XDG_CONFIG_HOME: directory,
				},
				stdio: ["ignore", "pipe", "pipe"],
			});
			let stdout = "";
			let stderr = "";
			const timeout = setTimeout(() => {
				child.kill("SIGKILL");
				reject(
					new Error(
						`OAuth ${scenario} did not exit naturally. stdout: ${stdout}; stderr: ${stderr}`,
					),
				);
			}, 5_000);
			child.stdout.on("data", (chunk) => {
				stdout += chunk;
			});
			child.stderr.on("data", (chunk) => {
				stderr += chunk;
			});
			child.on("error", (error) => {
				clearTimeout(timeout);
				reject(error);
			});
			child.on("close", (code) => {
				clearTimeout(timeout);
				resolve({ code, stdout, stderr });
			});
		},
	);
}

describe("OAuth shutdown with an unused browser connection", () => {
	it.each([
		["success", "Successfully logged in."],
		["partial", "Successfully logged in."],
		["denied", "Authentication rejected"],
		["timeout", "Authentication rejected"],
		["cancel", "Callback closed"],
	])(
		"exits naturally after %s",
		async (scenario, message) => {
			const result = await runFixture(scenario);

			expect(result.stderr).toBe("");
			expect(result.code).toBe(0);
			expect(result.stdout.trim()).toBe(message);
		},
		10_000,
	);
});
