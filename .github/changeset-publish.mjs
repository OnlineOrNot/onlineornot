import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

// changesets/action v1 expects legacy tag lines. Use v3's machine-readable
// report rather than parsing its human-facing (and potentially ANSI) output.
export function legacyTagLines(report) {
	return report
		.split("\n")
		.filter(Boolean)
		.flatMap((line) => {
			const event = JSON.parse(line);
			if (event.type !== "git-tag") return [];
			if (
				// oxlint-disable-next-line anti-slop/no-runtime-typeof -- Validate external JSON at the report boundary.
				typeof event.packageName !== "string" ||
				// oxlint-disable-next-line anti-slop/no-runtime-typeof -- Validate external JSON at the report boundary.
				typeof event.tag !== "string" ||
				!event.tag.startsWith(`${event.packageName}@`) ||
				/\s/.test(event.tag)
			) {
				throw new Error("Invalid Changesets git-tag event");
			}
			return [`New tag: ${event.tag}`];
		});
}

export function publish() {
	const directory = mkdtempSync(path.join(tmpdir(), "changeset-publish-"));
	const reportPath = path.join(directory, "report.jsonl");
	try {
		execFileSync("pnpm", ["changeset", "publish"], {
			stdio: "inherit",
			env: { ...process.env, CHANGESETS_OUTPUT: reportPath },
		});
		for (const line of legacyTagLines(readFileSync(reportPath, "utf8"))) {
			console.log(line);
		}
	} finally {
		rmSync(directory, { recursive: true, force: true });
	}
}

if (
	process.argv[1] &&
	import.meta.url === pathToFileURL(process.argv[1]).href
) {
	publish();
}
