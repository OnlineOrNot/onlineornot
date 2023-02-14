import path from "node:path";
import { build } from "esbuild";
import { EXTERNAL_DEPENDENCIES } from "./deps";

async function buildMain() {
	const outdir = path.resolve("./onlineornot-dist");
	const onlineornotPackageDir = path.resolve(".");
	/**
	 * The relative path between the bundled code and the onlineornot package.
	 * This is used as a reliable way to compute paths relative to the onlineornot package
	 * in the source files, rather than relying upon `__dirname` which can change depending
	 * on whether the source files have been bundled and the location of the outdir.
	 *
	 * This is exposed in the source via the `getBasePath()` function, which should be used
	 * in place of `__dirname` and similar Node.js constants.
	 */
	const __RELATIVE_PACKAGE_PATH__ = `"${path.relative(
		outdir,
		onlineornotPackageDir
	)}"`;
	await build({
		entryPoints: ["./src/cli.ts"],
		bundle: true,
		outdir,
		platform: "node",
		format: "cjs",
		external: EXTERNAL_DEPENDENCIES,
		sourcemap: process.env.SOURCEMAPS !== "false",
		// This is required to support jsonc-parser. See https://github.com/microsoft/node-jsonc-parser/issues/57
		mainFields: ["module", "main"],
		define: {
			__RELATIVE_PACKAGE_PATH__,
			"process.env.NODE_ENV": `'${process.env.NODE_ENV || "production"}'`,
		},
	});
}

async function run() {
	// main cli
	await buildMain();

	// After built once completely, rerun them both in watch mode
	if (process.argv.includes("--watch")) {
		console.log("Built. Watching for changes...");
		await Promise.all([buildMain()]);
	}
}

run().catch((e) => {
	console.error(e);
	process.exit(1);
});
