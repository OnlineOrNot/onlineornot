import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";

test("generation is reproducible and operation classification is closed", () => {
	const generate = (args = []) =>
		execFileSync(
			process.execPath,
			["scripts/generate-heartbeats.mjs", ...args],
			{ encoding: "utf8", stdio: "pipe" },
		);
	generate(["--check"]);
	generate(["--check"]);
	const dir = mkdtempSync(path.join(tmpdir(), "heartbeat-overlay-"));
	try {
		const overlay = JSON.parse(
			readFileSync("scripts/heartbeats-overlay.json", "utf8"),
		);
		delete overlay.listTokens;
		const file = path.join(dir, "overlay.json");
		writeFileSync(file, JSON.stringify(overlay));
		assert.throws(
			() => generate(["--check", "--overlay", file]),
			/Unclassified operation: listTokens/,
		);
		overlay.listTokens = {
			classification: "generated",
			reason: "invalid expansion",
		};
		writeFileSync(file, JSON.stringify(overlay));
		assert.throws(
			() => generate(["--check", "--overlay", file]),
			/Unsupported generated operation/,
		);
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
});
