import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { build } from "esbuild";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";

let directory: string;
let preload: string;
const searchResults = z.array(z.object({ command: z.string() }));
const storedCredentials = {
	accessToken: "fixture-api-access",
	refreshToken: "fixture-refresh",
	expiresAt: Date.now() + 3_600_000,
	scopes: ["UPTIME_CHECKS:EDIT"],
	user: { email: "auth@example.test" },
};

beforeAll(async () => {
	directory = await mkdtemp(path.join(tmpdir(), "onlineornot-auth-commands-"));
	preload = path.join(directory, "auth-network.mjs");
	await writeFile(
		preload,
		String.raw`
import { appendFileSync } from "node:fs";
globalThis.fetch = async (input, init) => {
	if (process.env.OON_AUTH_ALLOW_REVOCATION === "true" &&
		String(input) === "https://onlineornot.com/api/auth/oauth2/revoke" &&
		init?.method === "POST") {
		appendFileSync(process.env.OON_AUTH_REQUEST_LOG, "revoked\n");
		return new Response(null, { status: 200 });
	}
	throw new Error("Unexpected network request in authentication command test");
};
`,
	);
	await build({
		entryPoints: ["src/cli.ts"],
		outfile: path.join(directory, "cli.cjs"),
		bundle: true,
		platform: "node",
		format: "cjs",
		external: ["esbuild"],
		define: {
			"process.env.NODE_ENV": '"production"',
			"process.env.ONLINEORNOT_SEA": '"false"',
		},
	});
}, 60000);

afterAll(async () => {
	await rm(directory, { recursive: true, force: true });
});

async function runCLI(
	args: string[],
	options: { stored?: boolean; environment?: boolean; revoke?: boolean } = {},
) {
	const home = await mkdtemp(path.join(directory, "home-"));
	const credentialsPath = path.join(
		home,
		".config/onlineornot/credentials.json",
	);
	if (options.stored) {
		await mkdir(path.dirname(credentialsPath), { recursive: true });
		await writeFile(credentialsPath, JSON.stringify(storedCredentials));
	}
	const requests = path.join(home, "requests.txt");
	await writeFile(requests, "");
	const child = spawn(
		process.execPath,
		[
			"--import",
			pathToFileURL(preload).href,
			path.join(directory, "cli.cjs"),
			...args,
		],
		{
			cwd: home,
			timeout: 15000,
			stdio: ["ignore", "pipe", "pipe"],
			env: {
				PATH: process.env.PATH,
				HOME: home,
				USERPROFILE: home,
				XDG_CONFIG_HOME: home,
				ONLINEORNOT_API_TOKEN: options.environment
					? "fixture-environment-token"
					: "",
				OON_AUTH_ALLOW_REVOCATION: String(options.revoke ?? false),
				OON_AUTH_REQUEST_LOG: requests,
				FORCE_COLOR: "0",
			},
		},
	);
	let stdout = "";
	let stderr = "";
	child.stdout.on("data", (chunk: Buffer) => {
		stdout += chunk.toString();
	});
	child.stderr.on("data", (chunk: Buffer) => {
		stderr += chunk.toString();
	});
	await once(child, "close");
	return {
		code: child.exitCode,
		stdout,
		stderr,
		credentialsPath,
		requests: await readFile(requests, "utf8"),
	};
}

describe("authentication commands through the executable", () => {
	it("shows auth and setup at the root without legacy authentication names", async () => {
		const result = await runCLI(["--help"]);

		expect(result.code).toBe(0);
		expect(result.stdout).toMatch(/onlineornot auth\s+Manage authentication/);
		expect(result.stdout).toContain("onlineornot setup");
		expect(result.stdout).not.toMatch(/onlineornot (login|logout|whoami)\b/);
		expect(result.stderr).toBe("");
	});

	it("lists login, logout and whoami under auth", async () => {
		const result = await runCLI(["auth", "--help"]);

		expect(result.code).toBe(0);
		for (const name of ["login", "logout", "whoami"]) {
			expect(result.stdout).toContain(`onlineornot auth ${name}`);
		}
		expect(result.stdout).not.toContain("onlineornot auth setup");
		expect(result.stderr).toBe("");
	});

	it.each(["login", "logout", "whoami"])(
		"provides help for auth %s without running it",
		async (name) => {
			const result = await runCLI(["auth", name, "--help"]);

			expect(result.code).toBe(0);
			expect(result.stdout).toContain(`onlineornot auth ${name}`);
			expect(result.stderr).toBe("");
			expect(result.requests).toBe("");
		},
	);

	it.each([
		["auth"],
		["auth", "missing"],
		["auth", "login", "--unsupported"],
		["auth", "setup"],
	])("rejects invalid authentication invocation %j", async (...args) => {
		const result = await runCLI(args);

		expect(result.code).toBe(1);
		expect(result.stdout).toBe("");
		expect(result.stderr).toContain("onlineornot auth");
		expect(result.requests).toBe("");
	});

	it.each([
		["login", "login"],
		["logout", "logout"],
		["whoami", "whoami"],
		["signout", "logout"],
	])(
		"returns only canonical authentication names for %s",
		async (query, name) => {
			const result = await runCLI(["cli", "search", query]);
			const commands = searchResults
				.parse(JSON.parse(result.stdout))
				.map((item) => item.command);

			expect(result.code).toBe(0);
			expect(commands).toContain(`onlineornot auth ${name}`);
			expect(commands).not.toContain(`onlineornot ${name}`);
			expect(result.stderr).toBe("");
		},
	);

	it.each([["auth", "login"], ["login"]])(
		"uses existing credentials for %j",
		async (...args) => {
			const result = await runCLI(args, { stored: true });

			expect(result.code).toBe(0);
			expect(result.stdout).toContain(
				"Already logged in as auth@example.test.",
			);
			expect(result.stdout).toContain("onlineornot auth logout");
			expect(
				JSON.parse(await readFile(result.credentialsPath, "utf8")),
			).toEqual(storedCredentials);
			expect(result.requests).toBe("");
			expect(result.stderr).toBe("");
		},
	);

	it.each([["auth", "whoami"], ["whoami"]])(
		"shows the stored identity for %j",
		async (...args) => {
			const result = await runCLI(args, { stored: true });

			expect(result.code).toBe(0);
			expect(result.stdout).toContain("You are logged in as auth@example.test");
			expect(result.stdout).not.toContain(storedCredentials.accessToken);
			expect(result.requests).toBe("");
			expect(result.stderr).toBe("");
		},
	);

	it.each([["auth", "logout"], ["logout"]])(
		"revokes and clears stored credentials for %j",
		async (...args) => {
			const result = await runCLI(args, { stored: true, revoke: true });

			expect(result.code).toBe(0);
			expect(result.stdout).toContain("Successfully logged out.");
			expect(
				JSON.parse(await readFile(result.credentialsPath, "utf8")),
			).toEqual({});
			expect(result.requests).toBe("revoked\n");
			expect(result.stderr).toBe("");
		},
	);

	it.each([["auth", "logout"], ["logout"]])(
		"handles an already signed-out user for %j",
		async (...args) => {
			const result = await runCLI(args);

			expect(result.code).toBe(0);
			expect(result.stdout).toContain("Not logged in.");
			expect(result.requests).toBe("");
			expect(result.stderr).toBe("");
		},
	);

	it.each([["auth", "login"], ["login"], ["auth", "logout"], ["logout"]])(
		"preserves environment-token precedence for %j",
		async (...args) => {
			const result = await runCLI(args, { stored: true, environment: true });

			expect(result.code).toBe(0);
			expect(result.stdout).toContain(
				"ONLINEORNOT_API_TOKEN environment variable",
			);
			expect(result.stdout).not.toContain("fixture-environment-token");
			expect(
				JSON.parse(await readFile(result.credentialsPath, "utf8")),
			).toEqual(storedCredentials);
			expect(result.requests).toBe("");
			expect(result.stderr).toBe("");
		},
	);

	it.each([["auth", "whoami"], ["whoami"]])(
		"recommends the canonical login for %j without credentials",
		async (...args) => {
			const result = await runCLI(args);

			expect(result.code).toBe(0);
			expect(result.stdout).toContain("Run `onlineornot auth login`");
			expect(result.requests).toBe("");
			expect(result.stderr).toBe("");
		},
	);

	it.each([["heartbeats", "list"], ["mcp"]])(
		"uses canonical authentication recovery for %j",
		async (...args) => {
			const result = await runCLI(args);

			expect(result.code).toBe(1);
			expect(result.stdout).toBe("");
			expect(result.stderr).toContain("onlineornot auth login");
			expect(result.requests).toBe("");
		},
	);
});
