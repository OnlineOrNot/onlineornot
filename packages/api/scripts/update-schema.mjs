import { execFileSync } from "node:child_process";
import { writeFile } from "node:fs/promises";

import {
	digest,
	lockPath,
	packageDirectory,
	schemaUrl,
	validateFullCommit,
} from "./lib.mjs";

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
