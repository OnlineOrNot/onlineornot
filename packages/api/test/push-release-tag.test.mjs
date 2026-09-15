import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { expect, it } from "vitest";

import { pushReleaseTag } from "../../../.github/push-release-tag.mjs";

it.each([undefined, "test-token"])(
	"pushes the immutable historical tag with token %s to a local remote",
	(token) => {
		const directory = mkdtempSync(path.join(tmpdir(), "release-tag-test-"));
		const cwd = path.join(directory, "checkout");
		const remote = path.join(directory, "remote.git");
		const git = (args, options = {}) =>
			execFileSync("git", args, { cwd, encoding: "utf8", ...options }).trim();
		try {
			execFileSync("git", ["init", "--bare", remote]);
			execFileSync("git", ["clone", remote, cwd]);
			git(["config", "user.name", "Test"]);
			git(["config", "user.email", "test@example.com"]);
			git([
				"config",
				"http.https://github.com/.extraheader",
				"checkout-header",
			]);
			git(["commit", "--allow-empty", "-m", "Published source"]);
			const published = git(["rev-parse", "HEAD"]);
			const tag = "@onlineornot/api@0.2.1";
			git(["tag", tag]);
			git(["commit", "--allow-empty", "-m", "Later workflow changes"]);
			let pushes = 0;
			const run = (command, args, options) => {
				expect(command).toBe("git");
				if (args[0] === "push") {
					pushes++;
					expect(args).toEqual(["push", "origin", `refs/tags/${tag}`]);
					expect(options.env.RELEASE_TAG_TOKEN).toBeUndefined();
					const headers = git(
						["config", "--get-all", "http.https://github.com/.extraheader"],
						{ env: options.env },
					);
					expect(headers).toBe(
						token
							? `checkout-header\n\nAUTHORIZATION: basic ${Buffer.from(`x-access-token:${token}`).toString("base64")}`
							: "checkout-header",
					);
					// Existing command-scoped configuration survives authentication setup.
					expect(git(["config", "test.preserved"], { env: options.env })).toBe(
						"yes",
					);
				}
				return execFileSync(command, args, { ...options, cwd });
			};
			const env = {
				...process.env,
				GIT_CONFIG_COUNT: "1",
				GIT_CONFIG_KEY_0: "test.preserved",
				GIT_CONFIG_VALUE_0: "yes",
				RELEASE_TAG_TOKEN: token,
			};
			pushReleaseTag(tag, env, run);
			pushReleaseTag(tag, env, run); // Retry is a no-op, never a force-push.
			expect(pushes).toBe(2);
			expect(git(["--git-dir", remote, "rev-parse", `refs/tags/${tag}`])).toBe(
				published,
			);
			expect(
				git(["config", "--get-all", "http.https://github.com/.extraheader"]),
			).toBe("checkout-header");
		} finally {
			rmSync(directory, { recursive: true, force: true });
		}
	},
);

it("reports the exact target on rejection without retrying or leaking credentials", () => {
	const calls = [];
	const run = (_command, args) => {
		calls.push(args);
		if (args[0] === "rev-parse") return "historical-commit\n";
		throw new Error("test-token must not be included in diagnostics");
	};
	expect(() =>
		pushReleaseTag(
			"onlineornot@1.6.5",
			{ RELEASE_TAG_TOKEN: "test-token" },
			run,
		),
	).toThrow(
		"Could not push onlineornot@1.6.5 at historical-commit. The tag target has not been changed.",
	);
	expect(calls).toHaveLength(2);
});
