import { createHash } from "node:crypto";
import {
	mkdir,
	readFile,
	readdir,
	rename,
	rm,
	writeFile,
} from "node:fs/promises";
import path from "node:path";

import lockfile from "proper-lockfile";

function digest(bytes) {
	return createHash("sha256").update(bytes).digest("hex");
}

export async function obtainCompiledCliPlugin(
	packageRoot,
	cacheDirectory,
	compile,
) {
	const sourceFiles = (
		await readdir(path.join(packageRoot, "generator"), { recursive: true })
	)
		.filter(
			(file) =>
				(file.endsWith(".ts") && !file.endsWith(".test.ts")) ||
				file.endsWith(".json"),
		)
		.map((file) => path.join("generator", file));
	const inputs = [
		...sourceFiles,
		"../../pnpm-lock.yaml",
		"../../tsconfig.json",
		"tsconfig.json",
		"scripts/generate-cli.mjs",
		"scripts/compiled-cli-plugin.mjs",
	].sort();
	const hash = createHash("sha256").update(
		JSON.stringify([process.version, process.platform, process.arch]),
	);
	for (const input of inputs) {
		hash.update(input);
		hash.update(await readFile(path.resolve(packageRoot, input)));
	}
	await mkdir(cacheDirectory, { recursive: true });
	const target = path.join(cacheDirectory, `${hash.digest("hex")}.wasm`);
	const manifest = `${target}.sha256`;
	const release = await lockfile.lock(target, {
		realpath: false,
		retries: { retries: 100, minTimeout: 100, maxTimeout: 250 },
	});
	try {
		try {
			if (
				digest(await readFile(target)) === (await readFile(manifest, "utf8"))
			) {
				process.stderr.write("Reused CLI plugin\n");
				return target;
			}
		} catch (error) {
			if (error.code !== "ENOENT") throw error;
		}
		const pending = `${target}.pending`;
		try {
			await compile(pending);
			const bytes = await readFile(pending);
			await rename(pending, target);
			await writeFile(manifest, digest(bytes));
			process.stderr.write("Compiled CLI plugin\n");
			return target;
		} finally {
			await rm(pending, { force: true });
		}
	} finally {
		await release();
	}
}
