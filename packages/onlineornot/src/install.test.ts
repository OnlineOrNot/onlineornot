import { createHash } from "node:crypto";
import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { mkdtemp } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const installer = fileURLToPath(new URL("../install.sh", import.meta.url));
const platform = process.platform === "darwin" ? "darwin" : "linux";
const architecture = process.arch === "arm64" ? "arm64" : "amd64";
const binaryName = `onlineornot-${platform}-${architecture}`;
const installerBehaviorTest = it.skipIf(process.platform === "win32");

function runInstaller(args: string[], env: Record<string, string>) {
	return spawnSync("bash", [installer, ...args], {
		encoding: "utf8",
		env: { ...process.env, ...env },
	});
}

async function installerFixture(
	checksumStatus: "matches" | "mismatch" | "unavailable",
) {
	const root = await mkdtemp(path.join(tmpdir(), "onlineornot-installer-"));
	const commands = path.join(root, "commands");
	const installDir = path.join(root, "install");
	const binary = path.join(root, "release-binary");
	const checksum = path.join(root, "release-binary.sha256");
	await mkdir(commands);
	await writeFile(binary, "verified onlineornot binary\n");
	const digest = createHash("sha256")
		.update(await readFile(binary))
		.digest("hex");
	await writeFile(
		checksum,
		`${checksumStatus === "matches" ? digest : "0".repeat(64)}  ${binaryName}\n`,
	);
	const fakeCurl = path.join(commands, "curl");
	await writeFile(
		fakeCurl,
		`#!/bin/bash
set -euo pipefail
output=""
url=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    -o) output="$2"; shift 2 ;;
    http*) url="$1"; shift ;;
    *) shift ;;
  esac
done
printf '%s\n' "$url" >> "$FIXTURE_CURL_LOG"
if [[ "$url" == */releases/latest ]]; then
  if [[ "$FIXTURE_RELEASE_LOOKUP_FAIL" == "true" ]]; then
    exit 22
  fi
  printf '{"tag_name":"onlineornot@%s"}\n' "$FIXTURE_LATEST_VERSION"
  exit 0
fi
if [[ "$url" == *.sha256 ]]; then
  if [[ "$FIXTURE_CHECKSUM_STATUS" == "unavailable" ]]; then
    exit 22
  fi
  cp "$FIXTURE_CHECKSUM" "$output"
else
  cp "$FIXTURE_BINARY" "$output"
fi
`,
	);
	await chmod(fakeCurl, 0o755);
	return {
		installDir,
		env: {
			ONLINEORNOT_INSTALL_DIR: installDir,
			FIXTURE_LATEST_VERSION: "1.2.3",
			FIXTURE_RELEASE_LOOKUP_FAIL: "false",
			FIXTURE_BINARY: binary,
			FIXTURE_CHECKSUM: checksum,
			FIXTURE_CHECKSUM_STATUS: checksumStatus,
			FIXTURE_CURL_LOG: path.join(root, "curl.log"),
			PATH: `${commands}:${process.env.PATH}`,
		},
	};
}

describe("installer", () => {
	it("has valid bash syntax", () => {
		const result = spawnSync("bash", ["-n", installer], { encoding: "utf8" });
		expect(result.status, result.stderr).toBe(0);
	});

	installerBehaviorTest(
		"prints a dry run without changing the install directory",
		async () => {
			const fixture = await installerFixture("matches");
			const result = runInstaller(
				["--version", "1.2.3", "--dry-run", "--no-setup"],
				fixture.env,
			);

			expect(result.status, result.stderr).toBe(0);
			expect(result.stdout).toContain("Dry run: no files will be changed.");
			expect(result.stdout).toContain(`${binaryName}.sha256`);
			await expect(readFile(fixture.installDir)).rejects.toThrow();
		},
	);

	installerBehaviorTest(
		"installs only after verifying the release checksum",
		async () => {
			const fixture = await installerFixture("matches");
			const result = runInstaller(
				["--version", "1.2.3", "--no-setup", "--no-modify-path"],
				fixture.env,
			);

			expect(result.status, result.stderr).toBe(0);
			await expect(
				readFile(path.join(fixture.installDir, "bin", "onlineornot"), "utf8"),
			).resolves.toBe("verified onlineornot binary\n");
		},
	);

	installerBehaviorTest(
		"installs the release designated latest by GitHub",
		async () => {
			const fixture = await installerFixture("matches");
			const result = runInstaller(
				["--no-setup", "--no-modify-path"],
				fixture.env,
			);

			expect(result.status, result.stderr).toBe(0);
			await expect(
				readFile(fixture.env.FIXTURE_CURL_LOG, "utf8"),
			).resolves.toContain(
				"https://api.github.com/repos/OnlineOrNot/onlineornot/releases/latest",
			);
			await expect(
				readFile(path.join(fixture.installDir, "version"), "utf8"),
			).resolves.toBe("1.2.3\n");
		},
	);

	installerBehaviorTest("reports a latest-release lookup failure", async () => {
		const fixture = await installerFixture("matches");
		const result = runInstaller([], {
			...fixture.env,
			FIXTURE_RELEASE_LOOKUP_FAIL: "true",
		});

		expect(result.status).not.toBe(0);
		expect(result.stderr).toContain("Failed to detect latest version");
	});

	installerBehaviorTest("fails closed on a checksum mismatch", async () => {
		const fixture = await installerFixture("mismatch");
		const result = runInstaller(
			["--version", "1.2.3", "--no-setup", "--no-modify-path"],
			fixture.env,
		);

		expect(result.status).not.toBe(0);
		expect(result.stderr).toContain("checksum does not match");
		await expect(
			readFile(path.join(fixture.installDir, "bin", "onlineornot")),
		).rejects.toThrow();
	});

	installerBehaviorTest(
		"fails closed when the release checksum is unavailable",
		async () => {
			const fixture = await installerFixture("unavailable");
			const result = runInstaller(
				["--version", "1.2.3", "--no-setup", "--no-modify-path"],
				fixture.env,
			);

			expect(result.status).not.toBe(0);
			await expect(
				readFile(path.join(fixture.installDir, "bin", "onlineornot")),
			).rejects.toThrow();
		},
	);
});
