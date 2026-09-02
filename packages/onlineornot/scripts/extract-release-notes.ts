import fs from "node:fs/promises";

async function extractReleaseNotes(): Promise<void> {
	const [version, changelogPath, outputPath] = process.argv.slice(2);
	if (!version || !changelogPath || !outputPath) {
		throw new Error(
			"Release notes extraction failed: expected version, changelog path, and output path arguments.",
		);
	}

	const changelog = await fs.readFile(changelogPath, "utf8");
	const heading = `## ${version}\n`;
	const sectionStart = changelog.indexOf(heading);
	if (sectionStart === -1) {
		throw new Error(
			`Release notes extraction failed: version ${version} is missing from ${changelogPath}.`,
		);
	}
	const contentStart = sectionStart + heading.length;
	const nextSection = changelog.indexOf("\n## ", contentStart);
	const releaseNotes = changelog
		.slice(contentStart, nextSection === -1 ? undefined : nextSection)
		.trim();
	if (!releaseNotes) {
		throw new Error(
			`Release notes extraction failed: version ${version} has no changelog content.`,
		);
	}

	await fs.writeFile(outputPath, `${releaseNotes}\n`);
}

extractReleaseNotes().catch((error: unknown) => {
	console.error(error instanceof Error ? error.message : error);
	process.exitCode = 1;
});
