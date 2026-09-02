import { createHash } from "node:crypto";
import { chmod, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { zstdCompressSync } from "node:zlib";
import { afterEach, describe, expect, it } from "vitest";
import { runStandaloneUpdate } from "./standalone-update";

interface ReleaseAssetFixture {
	name: string;
	size: number;
	digest: string | null;
	browser_download_url: string;
}

const temporaryDirectories: string[] = [];

afterEach(async () => {
	await Promise.all(
		temporaryDirectories
			.splice(0)
			.map((directory) => rm(directory, { recursive: true, force: true })),
	);
});

function encodePatchInteger(value: number): Buffer {
	const buffer = Buffer.alloc(8);
	buffer.writeBigUInt64LE(BigInt(value));
	return buffer;
}

function buildReplacementPatch(target: Buffer): Buffer {
	const control = zstdCompressSync(
		Buffer.concat([
			encodePatchInteger(0),
			encodePatchInteger(target.byteLength),
			encodePatchInteger(0),
		]),
	);
	const difference = zstdCompressSync(Buffer.alloc(0));
	const extra = zstdCompressSync(target);
	return Buffer.concat([
		Buffer.from("TRDIFF10"),
		encodePatchInteger(control.byteLength),
		encodePatchInteger(difference.byteLength),
		encodePatchInteger(target.byteLength),
		control,
		difference,
		extra,
	]);
}

function sha256(value: Buffer): string {
	return createHash("sha256").update(value).digest("hex");
}

async function executableFixture(): Promise<{
	readonly directory: string;
	readonly executablePath: string;
	readonly currentBinary: Buffer;
	readonly targetBinary: Buffer;
}> {
	const directory = await mkdtemp(path.join(tmpdir(), "onlineornot-update-"));
	temporaryDirectories.push(directory);
	const executablePath = path.join(directory, "onlineornot");
	const currentBinary = Buffer.from("#!/bin/sh\nprintf '1.0.0\\n'\n");
	const targetBinary = Buffer.from("#!/bin/sh\nprintf '1.1.0\\n'\n");
	await writeFile(executablePath, currentBinary);
	await chmod(executablePath, 0o755);
	return { directory, executablePath, currentBinary, targetBinary };
}

function releaseList(
	targetBinary: Buffer,
	patch?: Buffer,
	digest = sha256(targetBinary),
) {
	const targetAssets: ReleaseAssetFixture[] = [
		{
			name: "onlineornot-linux-amd64",
			size: targetBinary.byteLength,
			digest: `sha256:${digest}`,
			browser_download_url: "https://downloads.test/onlineornot-linux-amd64",
		},
	];
	if (patch) {
		targetAssets.push(
			{
				name: "onlineornot-linux-amd64.gz",
				size: patch.byteLength * 4,
				digest: null,
				browser_download_url:
					"https://downloads.test/onlineornot-linux-amd64.gz",
			},
			{
				name: "onlineornot-linux-amd64.patch",
				size: patch.byteLength,
				digest: `sha256:${sha256(patch)}`,
				browser_download_url:
					"https://downloads.test/onlineornot-linux-amd64.patch",
			},
		);
	}
	return [
		{
			tag_name: "onlineornot@1.1.0",
			draft: false,
			prerelease: false,
			assets: targetAssets,
		},
		{
			tag_name: "onlineornot@1.0.0",
			draft: false,
			prerelease: false,
			assets: [],
		},
	];
}

function fixtureFetch(
	releases: ReturnType<typeof releaseList>,
	targetBinary: Buffer,
	patch?: Buffer,
): typeof fetch {
	return async (input) => {
		const url = requestUrl(input);
		if (url.startsWith("https://api.test/releases")) {
			return Response.json(releases);
		}
		if (url.endsWith(".patch") && patch) {
			return new Response(patch, {
				headers: { "content-length": String(patch.byteLength) },
			});
		}
		if (url.endsWith("onlineornot-linux-amd64")) {
			return new Response(targetBinary, {
				headers: { "content-length": String(targetBinary.byteLength) },
			});
		}
		return new Response(null, { status: 404 });
	};
}

function requestUrl(input: string | URL | Request): string {
	if (input instanceof URL) return input.href;
	if (input instanceof Request) return input.url;
	return input;
}

describe("standalone update", () => {
	it.skipIf(process.platform === "win32")(
		"applies and verifies a release delta before replacing the executable",
		async () => {
			const fixture = await executableFixture();
			const patch = buildReplacementPatch(fixture.targetBinary);

			const result = await runStandaloneUpdate({
				currentVersion: "1.0.0",
				executablePath: fixture.executablePath,
				installDirectory: fixture.directory,
				platform: "linux",
				architecture: "x64",
				releasesUrl: "https://api.test/releases",
				fetch: fixtureFetch(
					releaseList(fixture.targetBinary, patch),
					fixture.targetBinary,
					patch,
				),
			});

			expect(result).toEqual({
				status: "updated",
				version: "1.1.0",
				method: "patch",
			});
			await expect(readFile(fixture.executablePath)).resolves.toEqual(
				fixture.targetBinary,
			);
			await expect(
				readFile(path.join(fixture.directory, "version"), "utf8"),
			).resolves.toBe("1.1.0\n");
		},
	);

	it.skipIf(process.platform === "win32")(
		"falls back to a verified full binary when no patch is available",
		async () => {
			const fixture = await executableFixture();
			const result = await runStandaloneUpdate({
				currentVersion: "1.0.0",
				executablePath: fixture.executablePath,
				installDirectory: fixture.directory,
				platform: "linux",
				architecture: "x64",
				releasesUrl: "https://api.test/releases",
				fetch: fixtureFetch(
					releaseList(fixture.targetBinary),
					fixture.targetBinary,
				),
			});

			expect(result).toEqual({
				status: "updated",
				version: "1.1.0",
				method: "full",
			});
			await expect(readFile(fixture.executablePath)).resolves.toEqual(
				fixture.targetBinary,
			);
		},
	);

	it.skipIf(process.platform === "win32")(
		"falls back to a verified full binary when the release patch is invalid",
		async () => {
			const fixture = await executableFixture();
			const invalidPatch = Buffer.from("not a TRDIFF patch");
			const result = await runStandaloneUpdate({
				currentVersion: "1.0.0",
				executablePath: fixture.executablePath,
				installDirectory: fixture.directory,
				platform: "linux",
				architecture: "x64",
				releasesUrl: "https://api.test/releases",
				fetch: fixtureFetch(
					releaseList(fixture.targetBinary, invalidPatch),
					fixture.targetBinary,
					invalidPatch,
				),
			});

			expect(result).toEqual({
				status: "updated",
				version: "1.1.0",
				method: "full",
			});
			await expect(readFile(fixture.executablePath)).resolves.toEqual(
				fixture.targetBinary,
			);
		},
	);

	it.skipIf(process.platform === "win32")(
		"leaves the current executable intact when the full download digest is wrong",
		async () => {
			const fixture = await executableFixture();
			const result = await runStandaloneUpdate({
				currentVersion: "1.0.0",
				executablePath: fixture.executablePath,
				installDirectory: fixture.directory,
				platform: "linux",
				architecture: "x64",
				releasesUrl: "https://api.test/releases",
				fetch: fixtureFetch(
					releaseList(fixture.targetBinary, undefined, "0".repeat(64)),
					fixture.targetBinary,
				),
			});

			expect(result).toMatchObject({ status: "failed", reason: "checksum" });
			await expect(readFile(fixture.executablePath)).resolves.toEqual(
				fixture.currentBinary,
			);
		},
	);

	it.skipIf(process.platform === "win32")(
		"leaves the current executable intact when the candidate reports the wrong version",
		async () => {
			const fixture = await executableFixture();
			const wrongVersionBinary = Buffer.from("#!/bin/sh\nprintf '9.9.9\\n'\n");
			const result = await runStandaloneUpdate({
				currentVersion: "1.0.0",
				executablePath: fixture.executablePath,
				installDirectory: fixture.directory,
				platform: "linux",
				architecture: "x64",
				releasesUrl: "https://api.test/releases",
				fetch: fixtureFetch(
					releaseList(wrongVersionBinary),
					wrongVersionBinary,
				),
			});

			expect(result).toMatchObject({ status: "failed", reason: "candidate" });
			await expect(readFile(fixture.executablePath)).resolves.toEqual(
				fixture.currentBinary,
			);
		},
	);

	it("checks for an update without downloading release assets", async () => {
		const fixture = await executableFixture();
		let assetDownloads = 0;
		const fetchImplementation = fixtureFetch(
			releaseList(fixture.targetBinary),
			fixture.targetBinary,
		);
		const result = await runStandaloneUpdate({
			currentVersion: "1.0.0",
			checkOnly: true,
			executablePath: fixture.executablePath,
			installDirectory: fixture.directory,
			platform: "linux",
			architecture: "x64",
			releasesUrl: "https://api.test/releases",
			fetch: async (input, init) => {
				const url = requestUrl(input);
				if (!url.startsWith("https://api.test/releases")) assetDownloads++;
				return fetchImplementation(input, init);
			},
		});

		expect(result).toEqual({ status: "available", version: "1.1.0" });
		expect(assetDownloads).toBe(0);
	});

	it.skipIf(process.platform === "win32")(
		"rejects a concurrent updater before it queries releases",
		async () => {
			const fixture = await executableFixture();
			let continueReleaseFetch: (() => void) | undefined;
			const releaseFetchGate = new Promise<void>((resolve) => {
				continueReleaseFetch = resolve;
			});
			let releaseFetchStarted: (() => void) | undefined;
			const releaseFetchStart = new Promise<void>((resolve) => {
				releaseFetchStarted = resolve;
			});
			const baseFetch = fixtureFetch(
				releaseList(fixture.targetBinary),
				fixture.targetBinary,
			);
			const firstUpdate = runStandaloneUpdate({
				currentVersion: "1.0.0",
				executablePath: fixture.executablePath,
				installDirectory: fixture.directory,
				platform: "linux",
				architecture: "x64",
				releasesUrl: "https://api.test/releases",
				fetch: async (input, init) => {
					const url = requestUrl(input);
					if (url.startsWith("https://api.test/releases")) {
						releaseFetchStarted?.();
						await releaseFetchGate;
					}
					return baseFetch(input, init);
				},
			});

			await releaseFetchStart;
			let concurrentFetches = 0;
			const concurrentResult = await runStandaloneUpdate({
				currentVersion: "1.0.0",
				executablePath: fixture.executablePath,
				installDirectory: fixture.directory,
				platform: "linux",
				architecture: "x64",
				releasesUrl: "https://api.test/releases",
				fetch: async (input, init) => {
					concurrentFetches++;
					return baseFetch(input, init);
				},
			});
			continueReleaseFetch?.();

			expect(concurrentResult).toEqual({ status: "busy" });
			expect(concurrentFetches).toBe(0);
			await expect(firstUpdate).resolves.toMatchObject({ status: "updated" });
		},
	);
});
