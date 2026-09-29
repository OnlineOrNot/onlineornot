import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

// openapi-ts 0.99 ignores `not: {}` and Zod additionalProperties:false.
// Assert the exact candidate output shape before correcting these constraints.
// Remove this compatibility step once the generator supports both keywords.
export async function applyCandidateCompatibility(directory) {
	const resources = [
		"Check",
		"UptimeCheck",
		"BrowserCheck",
		"DnsCheck",
		"TcpCheck",
		"Heartbeat",
		"EnvironmentVariable",
	];
	for (const [file, prefix, from, to] of [
		["types.gen.ts", "", "project_id?: string;", "project_id?: never;"],
		[
			"zod.gen.ts",
			"z",
			"project_id: z.string().optional(),",
			"project_id: z.never().optional(),",
		],
		[
			"valibot.gen.ts",
			"v",
			"project_id: v.optional(v.string()),",
			"project_id: v.optional(v.never()),",
		],
	]) {
		const target = path.join(directory, file);
		let source = await readFile(target, "utf8");
		for (const resource of resources) {
			const component = resource.endsWith("Check");
			const name = component
				? `ProjectRolloutPatch${resource}Patch`
				: `Update${resource}${prefix ? "Body" : "Data"}`;
			const declaration = prefix
				? `export const ${prefix}${name} =`
				: `export type ${name} =`;
			const start = source.indexOf(declaration);
			if (start < 0)
				throw new Error(`Missing candidate declaration: ${declaration}`);
			const end = source.indexOf("\nexport ", start + declaration.length);
			const block = source.slice(start, end < 0 ? undefined : end);
			if (block.split(from).length !== 2)
				throw new Error(`Unexpected candidate ownership field: ${declaration}`);
			source =
				source.slice(0, start) +
				block.replace(from, to) +
				(end < 0 ? "" : source.slice(end));
		}
		if (prefix === "z") {
			for (const operation of [
				"CreateProject",
				"UpdateProject",
				"MoveCheck",
				"MoveHeartbeat",
			]) {
				const fromObject = `export const z${operation}Body = z.object(`;
				if (!source.includes(fromObject))
					throw new Error(`Missing candidate validator: ${operation}`);
				source = source.replace(
					fromObject,
					`export const z${operation}Body = z.strictObject(`,
				);
			}
		}
		await writeFile(target, source);
	}
}
