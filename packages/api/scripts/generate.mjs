import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
	obtainVerifiedSchema,
	packageDirectory,
	readLock,
	schemaUrl,
	validateFullCommit,
} from "./lib.mjs";

const check = process.argv.includes("--check");
const updateOperations = process.argv.includes("--update-operations");
const lock = await readLock();
validateFullCommit(lock.commit);
if (!/^[0-9a-f]{64}$/.test(lock.sha256))
	throw new Error("Invalid SHA-256 digest in schema.lock.json");
const schema = await obtainVerifiedSchema(lock);

execFileSync("pnpm", ["exec", "openapi-ts"], {
	cwd: packageDirectory,
	env: { ...process.env, ONLINEORNOT_OPENAPI_PATH: schema },
	stdio: "inherit",
});

const sdkPath = path.join(packageDirectory, "src/generated/sdk.gen.ts");
let sdk = await readFile(sdkPath, "utf8");
for (const operation of ["pingHeartbeatGet", "pingHeartbeat"]) {
	const marker = `export const ${operation} =`;
	const start = sdk.indexOf(marker);
	if (start === -1)
		throw new Error(`Expected generated operation ${operation}`);
	const end = sdk.indexOf("\n", start);
	const line = sdk.slice(start, end);
	if (!line.includes("{ url:"))
		throw new Error(`Unable to apply heartbeat server to ${operation}`);
	const patched = line.replace(
		"{ url:",
		"{ baseUrl: 'https://oonchk.com', url:",
	);
	sdk = `${sdk.slice(0, start)}${patched}${sdk.slice(end)}`;
}
await writeFile(sdkPath, sdk);
execFileSync("pnpm", ["exec", "oxfmt", "--write", "src/generated"], {
	cwd: packageDirectory,
	stdio: "inherit",
});

const operations = [...sdk.matchAll(/^export const ([A-Za-z_$][\w$]*)\s*=/gm)]
	.map((match) => match[1])
	.sort();
if (operations.length !== new Set(operations).size)
	throw new Error("Generated operation names collide");
const manifestPath = path.join(packageDirectory, "operations.json");
const manifest = `${JSON.stringify({ schema: schemaUrl(lock), count: operations.length, operations }, null, "\t")}\n`;
if (updateOperations) {
	await writeFile(manifestPath, manifest);
} else {
	const expected = await readFile(manifestPath, "utf8");
	if (manifest !== expected) {
		throw new Error(
			"Public operation names changed. Review the schema and run `pnpm schema:update <full-commit-sha>` to accept them.",
		);
	}
}

if (check) {
	execFileSync(
		"git",
		["diff", "--exit-code", "--", "src/generated", "operations.json"],
		{
			cwd: packageDirectory,
			stdio: "inherit",
		},
	);
}
console.log(`Generated ${operations.length} operations from ${lock.commit}`);
