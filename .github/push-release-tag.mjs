import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

export function pushReleaseTag(tag, env = process.env, run = execFileSync) {
	// Resolve the existing tag, never replace it with the current checkout.
	const commit = run(
		"git",
		["rev-parse", "--verify", `refs/tags/${tag}^{commit}`],
		{
			encoding: "utf8",
		},
	).trim();
	const { RELEASE_TAG_TOKEN, ...pushEnv } = env;
	if (RELEASE_TAG_TOKEN) {
		// Reset checkout's persisted extraheader for this process only. An extra
		// header alone would send both credentials. Do not put the token in argv.
		const header = `http.${env.GITHUB_SERVER_URL || "https://github.com"}/.extraheader`;
		const index = Number(pushEnv.GIT_CONFIG_COUNT || 0);
		pushEnv.GIT_CONFIG_COUNT = String(index + 2);
		pushEnv[`GIT_CONFIG_KEY_${index}`] = header;
		pushEnv[`GIT_CONFIG_VALUE_${index}`] = "";
		pushEnv[`GIT_CONFIG_KEY_${index + 1}`] = header;
		pushEnv[`GIT_CONFIG_VALUE_${index + 1}`] =
			`AUTHORIZATION: basic ${Buffer.from(`x-access-token:${RELEASE_TAG_TOKEN}`).toString("base64")}`;
	}
	try {
		run("git", ["push", "origin", `refs/tags/${tag}`], {
			env: pushEnv,
			stdio: "inherit",
		});
	} catch {
		throw new Error(
			`Could not push ${tag} at ${commit}. The tag target has not been changed. ` +
				`If GitHub reports missing workflows permission, follow .github/release-recovery.md: ` +
				`an operator must push this exact tag with workflow-authorized credentials, ` +
				`or configure RELEASE_TAG_TOKEN for automated recovery. ` +
				`GITHUB_TOKEN cannot gain workflows permission through workflow YAML.`,
		);
	}
}

if (
	process.argv[1] &&
	import.meta.url === pathToFileURL(process.argv[1]).href
) {
	pushReleaseTag(process.argv[2]);
}
