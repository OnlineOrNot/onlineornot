import path from "node:path";
import { build } from "esbuild";

async function buildSEA() {
	const outdir = path.resolve("./sea");
	const onlineornotPackageDir = path.resolve(".");

	const __RELATIVE_PACKAGE_PATH__ = `"${path.relative(outdir, onlineornotPackageDir)}"`;

	await build({
		entryPoints: ["./src/cli.ts"],
		bundle: true,
		outfile: "./sea/onlineornot.cjs",
		platform: "node",
		format: "cjs",
		minify: true,
		// Ignore optional/large dependencies that aren't critical
		plugins: [
			{
				name: "ignore-optional",
				setup(pluginBuild) {
					// These are optional or handled with try-catch fallbacks
					const ignored = ["fsevents", "esbuild"];
					for (const pkg of ignored) {
						pluginBuild.onResolve({ filter: new RegExp(`^${pkg}$`) }, () => ({
							path: pkg,
							namespace: "ignore",
						}));
					}
					pluginBuild.onLoad({ filter: /.*/, namespace: "ignore" }, () => ({
						contents: "module.exports = {}",
					}));
				},
			},
		],
		define: {
			__RELATIVE_PACKAGE_PATH__,
			"process.env.NODE_ENV": '"production"',
			// Flag to indicate we're running as SEA
			"process.env.ONLINEORNOT_SEA": '"true"',
		},
	});

	console.log("SEA bundle created: sea/onlineornot.cjs");
}

buildSEA().catch((e) => {
	console.error(e);
	process.exit(1);
});
