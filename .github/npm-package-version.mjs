import { execFileSync } from "node:child_process";
import path from "node:path";
import { setTimeout } from "node:timers/promises";
import { fileURLToPath } from "node:url";

export async function npmPackageVersion(
	spec,
	{
		query = () =>
			execFileSync("npm", ["view", spec, "version", "--json"], {
				encoding: "utf8",
				stdio: ["ignore", "pipe", "pipe"],
				timeout: 30_000,
			}),
		sleep = setTimeout,
		attempts = 4,
	} = {},
) {
	for (let attempt = 1; attempt <= attempts; attempt++) {
		try {
			const version = JSON.parse(query());
			// oxlint-disable-next-line anti-slop/no-runtime-typeof -- Validate npm JSON at the subprocess boundary.
			if (typeof version !== "string")
				throw new Error(`Unexpected npm version for ${spec}`);
			return version;
		} catch (error) {
			if (attempt === attempts) {
				// Unpublished version PRs are normal; network/auth failures aren't.
				if (/\bE404\b/.test(String(error.stderr))) return "";
				throw error;
			}
			await sleep(5000);
		}
	}
}

if (
	process.argv[1] &&
	path.relative(
		fileURLToPath(import.meta.url),
		path.resolve(process.argv[1]),
	) === ""
) {
	console.log(await npmPackageVersion(process.argv[2]));
}
