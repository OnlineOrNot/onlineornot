import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { expect, it } from "vitest";

import { wasCliPublished } from "../../../.github/cli-release-published.mjs";

it("does not treat an API-only Changesets publication as a CLI release", () => {
	expect(
		wasCliPublished('[{"name":"@onlineornot/api","version":"0.1.0"}]', "1.6.5"),
	).toBe(false);
	expect(
		wasCliPublished('[{"name":"onlineornot","version":"1.6.6"}]', "1.6.6"),
	).toBe(true);
});

it("includes both packages in preview publishing", () => {
	const root = path.resolve(
		fileURLToPath(new URL("../../..", import.meta.url)),
	);
	const workflow = readFileSync(
		path.join(root, ".github/workflows/prereleases.yml"),
		"utf8",
	);
	expect(workflow).toContain("'./packages/onlineornot' './packages/api'");
});
