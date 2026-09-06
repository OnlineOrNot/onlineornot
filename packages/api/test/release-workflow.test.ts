import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { expect, it } from "vitest";

import { wasPackagePublished } from "../../../.github/package-release-published.mjs";

it("does not treat an API-only Changesets publication as a CLI release", () => {
	const publishedPackages = '[{"name":"@onlineornot/api","version":"0.1.0"}]';
	expect(wasPackagePublished(publishedPackages, "onlineornot", "1.6.5")).toBe(
		false,
	);
	expect(
		wasPackagePublished(publishedPackages, "@onlineornot/api", "0.1.0"),
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

it("publishes API SDK GitHub releases without replacing the CLI latest release", () => {
	const root = path.resolve(
		fileURLToPath(new URL("../../..", import.meta.url)),
	);
	const workflow = readFileSync(
		path.join(root, ".github/workflows/release.yml"),
		"utf8",
	);
	expect(workflow).toContain('TAG="@onlineornot/api@$VERSION"');
	expect(workflow).toContain('gh release create "$TAG" --verify-tag');
	expect(workflow).toContain("--latest=false");
});

it("uses the v3 publication bridge and recovers missing CLI tags from version history", () => {
	const workflow = readFileSync(
		new URL("../../../.github/workflows/release.yml", import.meta.url),
		"utf8",
	);
	expect(workflow).toContain("publish: node .github/changeset-publish.mjs");
	expect(workflow).toContain(
		'node .github/find-package-version-commit.mjs packages/onlineornot/package.json "$VERSION"',
	);
	expect(workflow).toContain('git tag "$TAG" "$RELEASE_COMMIT"');
	expect(workflow).toContain(
		'node .github/npm-package-version.mjs "onlineornot@$VERSION"',
	);
});
