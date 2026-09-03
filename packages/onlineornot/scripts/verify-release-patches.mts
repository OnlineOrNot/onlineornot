import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import { applyPatch } from "binpatch";

function sha256(value: Uint8Array): string {
	return createHash("sha256").update(value).digest("hex");
}

async function verifyReleasePatches(): Promise<void> {
	const [oldBinariesDirectory, newBinariesDirectory, patchesDirectory] =
		process.argv.slice(2);
	if (!oldBinariesDirectory || !newBinariesDirectory || !patchesDirectory) {
		throw new Error(
			"Release patch verification failed: expected old-binaries, new-binaries, and patches directory arguments.",
		);
	}
	const patchNames = (await fs.readdir(patchesDirectory).catch(() => []))
		.filter((name) => name.endsWith(".patch"))
		.sort();
	for (const patchName of patchNames) {
		const binaryName = patchName.slice(0, -".patch".length);
		const oldBinaryPath = path.join(oldBinariesDirectory, binaryName);
		const newBinaryPath = path.join(newBinariesDirectory, binaryName);
		const patchPath = path.join(patchesDirectory, patchName);
		const reconstructedPath = path.join(
			patchesDirectory,
			`.verified-${binaryName}`,
		);

		const [patch, expectedBinary] = await Promise.all([
			fs.readFile(patchPath),
			fs.readFile(newBinaryPath),
		]);
		const actualSha256 = await applyPatch(
			oldBinaryPath,
			patch,
			reconstructedPath,
		);
		const expectedSha256 = sha256(expectedBinary);
		await fs.rm(reconstructedPath, { force: true });
		if (actualSha256 !== expectedSha256) {
			throw new Error(
				`Release patch verification failed: ${patchName} produced ${actualSha256}, expected ${expectedSha256}.`,
			);
		}
		console.log(`Verified ${patchName}`);
	}

	console.log(`Verified ${patchNames.length} release patch(es).`);
}

verifyReleasePatches().catch((error) => {
	console.error(error instanceof Error ? error.message : error);
	process.exitCode = 1;
});
