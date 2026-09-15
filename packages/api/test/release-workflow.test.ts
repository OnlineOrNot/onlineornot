import { execFileSync } from "node:child_process";
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

it.each([
	{ pending: true, localTag: true },
	{ pending: true, localTag: false },
	{ pending: false, localTag: true },
	{ pending: false, localTag: false },
])(
	"handles SDK tag push with $pending pending and $localTag local tag",
	({ pending, localTag }) => {
		const workflow = readFileSync(
			new URL("../../../.github/workflows/release.yml", import.meta.url),
			"utf8",
		);
		const sdkStep = workflow
			.split("id: inspect-api-release")[1]
			?.split("- name: Publish API SDK")[0];
		const tagBlock = sdkStep?.match(
			/if \[\[ "\$RELEASE_PENDING" == "true" \]\]; then[\s\S]*?(?=          echo "version=)/,
		)?.[0];
		if (!tagBlock) throw new Error("SDK tag handling block not found");

		// Stub git so the real workflow shell cannot create or push release tags.
		const output = execFileSync(
			"bash",
			[
				"--noprofile",
				"--norc",
				"-eu",
				"-c",
				`
		git() {
			if [[ "$1" == "rev-parse" ]]; then
				[[ "$LOCAL_TAG" == "true" ]]
			else
				printf '%s\\n' "$*"
			fi
		}
		${tagBlock}
	`,
			],
			{
				encoding: "utf8",
				env: {
					RELEASE_PENDING: String(pending),
					LOCAL_TAG: String(localTag),
					API_JUST_PUBLISHED: "true",
					GITHUB_SHA: "release-commit",
					TAG: "@onlineornot/api@0.2.1",
				},
			},
		);
		const expected = pending
			? `${localTag ? "" : "tag @onlineornot/api@0.2.1 release-commit\n"}push origin refs/tags/@onlineornot/api@0.2.1\n`
			: "";
		expect(output).toBe(expected);
	},
);

it("builds the workspace SDK in each binary job before bundling the CLI", () => {
	const workflow = readFileSync(
		new URL("../../../.github/workflows/release.yml", import.meta.url),
		"utf8",
	);
	const binaryJob = workflow
		.split(/\r?\n  build-binaries:\r?\n/)[1]
		?.split(/\r?\n  publish-release:\r?\n/)[0];
	expect(binaryJob).toBeDefined();
	expect(binaryJob).toContain("runs-on: ${{ matrix.os }}");
	expect(binaryJob).toContain(
		"ref: onlineornot@${{ needs.release.outputs.version }}",
	);
	expect(binaryJob).toMatch(
		/run: pnpm install --frozen-lockfile[\s\S]*run: pnpm --filter @onlineornot\/api run build[\s\S]*run: pnpm run build:sea/,
	);
});
