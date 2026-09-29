import { execFileSync } from "node:child_process";
import { access, writeFile } from "node:fs/promises";

import {
	digest,
	lockPath,
	packageDirectory,
	schemaUrl,
	validateFullCommit,
} from "./lib.mjs";

try {
	await access(new URL("../schema.candidate.lock.json", import.meta.url));
	throw new Error(
		"Remove the unreleased candidate lock before advancing the released schema pin.",
	);
} catch (error) {
	if (error.code !== "ENOENT") throw error;
}

const commit = process.argv[2];
validateFullCommit(commit ?? "");
const lock = {
	repository: "OnlineOrNot/api-schemas",
	commit,
	path: "openapi.json",
	sha256: "",
};
const response = await fetch(schemaUrl(lock));
if (!response.ok)
	throw new Error(
		`Schema download failed: ${response.status} ${response.statusText}`,
	);
const bytes = Buffer.from(await response.arrayBuffer());
lock.sha256 = digest(bytes);
await writeFile(lockPath, `${JSON.stringify(lock, null, "\t")}\n`);
execFileSync("pnpm", ["run", "generate", "--", "--update-operations"], {
	cwd: packageDirectory,
	stdio: "inherit",
});
