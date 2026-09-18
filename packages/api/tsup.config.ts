import { defineConfig } from "tsup";

export default defineConfig({
	clean: true,
	dts: true,
	entry: ["src/index.ts", "src/zod.ts"],
	format: ["esm"],
	sourcemap: true,
	target: "es2022",
	treeshake: true,
});
