import { execFile } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { githubReleaseSource, resolveAndApply } from "binpatch";
import type { ProgressEvent } from "binpatch";

const execFileAsync = promisify(execFile);
const DEFAULT_RELEASES_URL =
	"https://api.github.com/repos/OnlineOrNot/onlineornot/releases";
const RELEASE_TAG_PATTERN = /^onlineornot@(\d+)\.(\d+)\.(\d+)$/;
const SHA256_DIGEST_PATTERN = /^sha256:([a-f0-9]{64})$/i;
const UPDATE_LOCK_MAX_AGE_MS = 15 * 60 * 1000;

interface ReleaseAsset {
	readonly name: string;
	readonly size: number;
	readonly digest: string | null;
	readonly downloadUrl: string;
}

interface StableRelease {
	readonly tag: string;
	readonly version: string;
	readonly versionParts: readonly [number, number, number];
	readonly assets: readonly ReleaseAsset[];
}

/** Progress reported while checking, downloading, verifying, and installing a standalone update. */
export type StandaloneUpdateProgress =
	| {
			readonly type: "phase";
			readonly phase: "check" | "patch" | "download" | "install";
	  }
	| {
			readonly type: "download";
			readonly receivedBytes: number;
			readonly totalBytes: number | null;
	  }
	| { readonly type: "patch"; readonly event: ProgressEvent };

/** Outcome of a standalone update attempt; expected network and filesystem failures are returned as values. */
export type StandaloneUpdateResult =
	| { readonly status: "current"; readonly version: string }
	| { readonly status: "available"; readonly version: string }
	| { readonly status: "busy" }
	| {
			readonly status: "updated";
			readonly version: string;
			readonly method: "patch" | "full";
	  }
	| {
			readonly status: "failed";
			readonly reason:
				| "release-check"
				| "unsupported-platform"
				| "missing-asset"
				| "download"
				| "checksum"
				| "candidate"
				| "install";
			readonly message: string;
	  };

/** Configuration for checking or installing a standalone binary update. */
export interface StandaloneUpdateOptions {
	readonly currentVersion: string;
	readonly checkOnly?: boolean;
	readonly force?: boolean;
	readonly executablePath?: string;
	readonly installDirectory?: string;
	readonly platform?: NodeJS.Platform;
	readonly architecture?: string;
	readonly releasesUrl?: string;
	readonly fetch?: typeof fetch;
	readonly onProgress?: (progress: StandaloneUpdateProgress) => void;
}

type ReleaseLookupResult =
	| { readonly ok: true; readonly release: StableRelease }
	| { readonly ok: false; readonly result: StandaloneUpdateResult };

type LockResult =
	| { readonly acquired: true; readonly release: () => Promise<void> }
	| { readonly acquired: false; readonly result: StandaloneUpdateResult };

type DownloadResult =
	| { readonly ok: true }
	| { readonly ok: false; readonly result: StandaloneUpdateResult };

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function parseStableRelease(value: unknown): StableRelease | null {
	if (!isRecord(value) || value.draft === true || value.prerelease === true) {
		return null;
	}
	if (typeof value.tag_name !== "string" || !Array.isArray(value.assets)) {
		return null;
	}

	const versionMatch = RELEASE_TAG_PATTERN.exec(value.tag_name);
	if (!versionMatch) return null;
	const major = Number(versionMatch[1]);
	const minor = Number(versionMatch[2]);
	const patch = Number(versionMatch[3]);
	const assets: ReleaseAsset[] = [];

	for (const candidate of value.assets) {
		if (
			!isRecord(candidate) ||
			typeof candidate.name !== "string" ||
			typeof candidate.size !== "number" ||
			typeof candidate.browser_download_url !== "string"
		) {
			continue;
		}
		assets.push({
			name: candidate.name,
			size: candidate.size,
			digest: typeof candidate.digest === "string" ? candidate.digest : null,
			downloadUrl: candidate.browser_download_url,
		});
	}

	return {
		tag: value.tag_name,
		version: `${major}.${minor}.${patch}`,
		versionParts: [major, minor, patch],
		assets,
	};
}

function compareVersionParts(
	a: readonly [number, number, number],
	b: readonly [number, number, number],
): number {
	for (let index = 0; index < 3; index++) {
		const difference = a[index] - b[index];
		if (difference !== 0) return difference;
	}
	return 0;
}

function parseVersionParts(
	version: string,
): readonly [number, number, number] | null {
	const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
	if (!match) return null;
	return [Number(match[1]), Number(match[2]), Number(match[3])];
}

async function fetchLatestStableRelease(
	releasesUrl: string,
	fetchImplementation: typeof fetch,
): Promise<ReleaseLookupResult> {
	let response: Response;
	try {
		response = await fetchImplementation(`${releasesUrl}?per_page=20`, {
			headers: {
				Accept: "application/vnd.github+json",
				"User-Agent": "onlineornot-cli",
			},
			signal: AbortSignal.timeout(30_000),
		});
	} catch {
		return {
			ok: false,
			result: {
				status: "failed",
				reason: "release-check",
				message: "Standalone update check failed: GitHub could not be reached.",
			},
		};
	}

	if (!response.ok) {
		return {
			ok: false,
			result: {
				status: "failed",
				reason: "release-check",
				message: `Standalone update check failed: GitHub returned HTTP ${response.status}.`,
			},
		};
	}

	let payload: unknown;
	try {
		payload = await response.json();
	} catch {
		return {
			ok: false,
			result: {
				status: "failed",
				reason: "release-check",
				message:
					"Standalone update check failed: GitHub returned invalid JSON.",
			},
		};
	}

	if (!Array.isArray(payload)) {
		return {
			ok: false,
			result: {
				status: "failed",
				reason: "release-check",
				message:
					"Standalone update check failed: GitHub returned an invalid release list.",
			},
		};
	}

	const releases = payload
		.map(parseStableRelease)
		.filter((release): release is StableRelease => release !== null)
		.sort((a, b) => compareVersionParts(b.versionParts, a.versionParts));
	const release = releases[0];
	if (!release) {
		return {
			ok: false,
			result: {
				status: "failed",
				reason: "release-check",
				message:
					"Standalone update check failed: no stable CLI release was found.",
			},
		};
	}

	return { ok: true, release };
}

function getStandaloneBinaryName(
	platform: NodeJS.Platform,
	architecture: string,
): string | null {
	const osName =
		platform === "darwin" ? "darwin" : platform === "linux" ? "linux" : null;
	const architectureName =
		architecture === "arm64"
			? "arm64"
			: architecture === "x64"
				? "amd64"
				: null;
	if (!osName || !architectureName) return null;
	return `onlineornot-${osName}-${architectureName}`;
}

function reportProgress(
	handler: StandaloneUpdateOptions["onProgress"],
	progress: StandaloneUpdateProgress,
): void {
	try {
		handler?.(progress);
	} catch {
		// Progress is cosmetic and must not interrupt an update.
	}
}

function hasErrorCode(error: unknown, code: string): boolean {
	return error instanceof Error && "code" in error && error.code === code;
}

async function acquireStandaloneUpdateLock(
	installDirectory: string,
): Promise<LockResult> {
	try {
		await fs.mkdir(installDirectory, { recursive: true });
	} catch {
		return {
			acquired: false,
			result: {
				status: "failed",
				reason: "install",
				message:
					"Standalone update failed: the installation directory could not be created.",
			},
		};
	}
	const lockPath = path.join(installDirectory, "update.lock");

	for (let attempt = 0; attempt < 2; attempt++) {
		let lock: fs.FileHandle | null = null;
		try {
			lock = await fs.open(lockPath, "wx", 0o600);
			const lockToken = `${process.pid}:${randomUUID()}\n`;
			await lock.writeFile(lockToken);
			const acquiredLock = lock;
			return {
				acquired: true,
				release: async () => {
					await acquiredLock.close().catch(() => {});
					const currentToken = await fs
						.readFile(lockPath, "utf8")
						.catch(() => null);
					if (currentToken === lockToken) {
						await fs.rm(lockPath, { force: true }).catch(() => {});
					}
				},
			};
		} catch (error) {
			await lock?.close().catch(() => {});
			if (!hasErrorCode(error, "EEXIST")) {
				if (lock) await fs.rm(lockPath, { force: true }).catch(() => {});
				return {
					acquired: false,
					result: {
						status: "failed",
						reason: "install",
						message:
							"Standalone update failed: the update lock could not be created.",
					},
				};
			}

			const lockStat = await fs.stat(lockPath).catch(() => null);
			if (
				attempt === 0 &&
				lockStat &&
				Date.now() - lockStat.mtimeMs > UPDATE_LOCK_MAX_AGE_MS
			) {
				await fs.rm(lockPath, { force: true }).catch(() => {});
				continue;
			}
			return { acquired: false, result: { status: "busy" } };
		}
	}

	return { acquired: false, result: { status: "busy" } };
}

function expectedAssetSha256(asset: ReleaseAsset): string | null {
	if (!asset.digest) return null;
	return SHA256_DIGEST_PATTERN.exec(asset.digest)?.[1]?.toLowerCase() ?? null;
}

async function downloadVerifiedReleaseBinary(
	asset: ReleaseAsset,
	destinationPath: string,
	fetchImplementation: typeof fetch,
	onProgress: StandaloneUpdateOptions["onProgress"],
): Promise<DownloadResult> {
	const expectedSha256 = expectedAssetSha256(asset);
	if (!expectedSha256) {
		return {
			ok: false,
			result: {
				status: "failed",
				reason: "checksum",
				message:
					"Standalone update checksum failed: the release binary has no SHA-256 digest.",
			},
		};
	}

	let response: Response;
	try {
		response = await fetchImplementation(asset.downloadUrl, {
			headers: { "User-Agent": "onlineornot-cli" },
			signal: AbortSignal.timeout(120_000),
		});
	} catch {
		return {
			ok: false,
			result: {
				status: "failed",
				reason: "download",
				message:
					"Standalone update download failed: the release binary could not be downloaded.",
			},
		};
	}

	if (!response.ok || !response.body) {
		return {
			ok: false,
			result: {
				status: "failed",
				reason: "download",
				message: `Standalone update download failed: GitHub returned HTTP ${response.status}.`,
			},
		};
	}

	let output: fs.FileHandle;
	try {
		await fs.rm(destinationPath, { force: true });
		output = await fs.open(destinationPath, "wx", 0o700);
	} catch {
		return {
			ok: false,
			result: {
				status: "failed",
				reason: "download",
				message:
					"Standalone update download failed: the candidate file could not be created.",
			},
		};
	}
	const hash = createHash("sha256");
	let receivedBytes = 0;
	const contentLengthHeader = response.headers.get("content-length");
	const contentLength = Number(contentLengthHeader);
	const totalBytes =
		contentLengthHeader !== null &&
		Number.isSafeInteger(contentLength) &&
		contentLength >= 0
			? contentLength
			: null;

	try {
		for await (const chunk of response.body) {
			hash.update(chunk);
			let offset = 0;
			while (offset < chunk.byteLength) {
				const { bytesWritten } = await output.write(
					chunk,
					offset,
					chunk.byteLength - offset,
				);
				if (bytesWritten === 0) {
					throw new Error(
						"Standalone update download failed: writing the candidate made no progress.",
					);
				}
				offset += bytesWritten;
			}
			receivedBytes += chunk.byteLength;
			reportProgress(onProgress, {
				type: "download",
				receivedBytes,
				totalBytes,
			});
		}
		await output.sync();
	} catch {
		await output.close().catch(() => {});
		await fs.rm(destinationPath, { force: true }).catch(() => {});
		return {
			ok: false,
			result: {
				status: "failed",
				reason: "download",
				message:
					"Standalone update download failed: the release binary download was interrupted.",
			},
		};
	}
	try {
		await output.close();
	} catch {
		await fs.rm(destinationPath, { force: true }).catch(() => {});
		return {
			ok: false,
			result: {
				status: "failed",
				reason: "download",
				message:
					"Standalone update download failed: the candidate file could not be closed.",
			},
		};
	}

	if (hash.digest("hex") !== expectedSha256) {
		await fs.rm(destinationPath, { force: true }).catch(() => {});
		return {
			ok: false,
			result: {
				status: "failed",
				reason: "checksum",
				message:
					"Standalone update checksum failed: the downloaded binary does not match its release digest.",
			},
		};
	}

	return { ok: true };
}

async function smokeTestStandaloneBinary(
	candidatePath: string,
	targetVersion: string,
): Promise<boolean> {
	try {
		const { stdout } = await execFileAsync(candidatePath, ["--version"], {
			env: {
				...process.env,
				ONLINEORNOT_DISABLE_AUTO_UPDATE: "true",
				ONLINEORNOT_UPDATE_CHECK: "false",
			},
			timeout: 30_000,
		});
		return stdout.trim() === targetVersion;
	} catch {
		return false;
	}
}

async function installStandaloneCandidate(
	candidatePath: string,
	executablePath: string,
	installDirectory: string,
	targetVersion: string,
): Promise<StandaloneUpdateResult | null> {
	try {
		await fs.chmod(candidatePath, 0o755);
		if (!(await smokeTestStandaloneBinary(candidatePath, targetVersion))) {
			await fs.rm(candidatePath, { force: true }).catch(() => {});
			return {
				status: "failed",
				reason: "candidate",
				message:
					"Standalone update validation failed: the candidate binary did not report the expected version.",
			};
		}

		const candidate = await fs.open(candidatePath, "r");
		try {
			await candidate.sync();
		} finally {
			await candidate.close();
		}

		await fs.rename(candidatePath, executablePath);
	} catch {
		await fs.rm(candidatePath, { force: true }).catch(() => {});
		return {
			status: "failed",
			reason: "install",
			message:
				"Standalone update installation failed: the verified binary could not be installed.",
		};
	}

	// The executable is authoritative. A stale installer hint must not turn a
	// successful atomic replacement into a reported update failure.
	const versionPath = path.join(installDirectory, "version");
	const pendingVersionPath = `${versionPath}.new`;
	try {
		await fs.writeFile(pendingVersionPath, `${targetVersion}\n`, {
			mode: 0o600,
		});
		await fs.rename(pendingVersionPath, versionPath);
	} catch {
		await fs.rm(pendingVersionPath, { force: true }).catch(() => {});
	}
	return null;
}

/** Check for and optionally install the latest standalone CLI release. */
export async function runStandaloneUpdate(
	options: StandaloneUpdateOptions,
): Promise<StandaloneUpdateResult> {
	const fetchImplementation = options.fetch ?? fetch;
	const releasesUrl = options.releasesUrl ?? DEFAULT_RELEASES_URL;
	const executablePath = options.executablePath ?? process.execPath;
	const installDirectory =
		options.installDirectory ??
		process.env.ONLINEORNOT_INSTALL_DIR ??
		path.join(os.homedir(), ".onlineornot");
	const binaryName = getStandaloneBinaryName(
		options.platform ?? process.platform,
		options.architecture ?? process.arch,
	);
	if (!binaryName) {
		return {
			status: "failed",
			reason: "unsupported-platform",
			message:
				"Standalone update failed: this operating system or architecture is not supported.",
		};
	}

	const lock = options.checkOnly
		? null
		: await acquireStandaloneUpdateLock(installDirectory);
	if (lock && !lock.acquired) return lock.result;

	try {
		reportProgress(options.onProgress, { type: "phase", phase: "check" });
		const latest = await fetchLatestStableRelease(
			releasesUrl,
			fetchImplementation,
		);
		if (!latest.ok) return latest.result;

		const currentVersionParts = parseVersionParts(options.currentVersion);
		const updateAvailable =
			currentVersionParts === null ||
			compareVersionParts(latest.release.versionParts, currentVersionParts) > 0;
		if (options.checkOnly) {
			return updateAvailable
				? { status: "available", version: latest.release.version }
				: { status: "current", version: options.currentVersion };
		}
		if (!updateAvailable && !options.force) {
			return { status: "current", version: options.currentVersion };
		}

		const targetAsset = latest.release.assets.find(
			(asset) => asset.name === binaryName,
		);
		if (!targetAsset) {
			return {
				status: "failed",
				reason: "missing-asset",
				message: `Standalone update failed: release ${latest.release.version} has no ${binaryName} binary.`,
			};
		}

		const candidatePath = `${executablePath}.new`;

		try {
			await fs.rm(candidatePath, { force: true });
			let method: "patch" | "full" = "patch";
			reportProgress(options.onProgress, { type: "phase", phase: "patch" });
			try {
				const source = githubReleaseSource({
					releasesUrl,
					binaryName,
					userAgent: `onlineornot-cli/${options.currentVersion}`,
					fetch: fetchImplementation,
				});
				const patchResult = await resolveAndApply({
					source,
					currentVersion: `onlineornot@${options.currentVersion}`,
					targetVersion: latest.release.tag,
					oldPath: executablePath,
					destPath: candidatePath,
					signal: AbortSignal.timeout(120_000),
					onProgress: (event) =>
						reportProgress(options.onProgress, { type: "patch", event }),
				});
				if (!patchResult) method = "full";
			} catch {
				method = "full";
				await fs.rm(candidatePath, { force: true }).catch(() => {});
			}

			if (method === "full") {
				reportProgress(options.onProgress, {
					type: "phase",
					phase: "download",
				});
				const download = await downloadVerifiedReleaseBinary(
					targetAsset,
					candidatePath,
					fetchImplementation,
					options.onProgress,
				);
				if (!download.ok) return download.result;
			}

			reportProgress(options.onProgress, { type: "phase", phase: "install" });
			const installFailure = await installStandaloneCandidate(
				candidatePath,
				executablePath,
				installDirectory,
				latest.release.version,
			);
			if (installFailure) return installFailure;
			return {
				status: "updated",
				version: latest.release.version,
				method,
			};
		} catch {
			await fs.rm(candidatePath, { force: true }).catch(() => {});
			return {
				status: "failed",
				reason: "install",
				message: "Standalone update failed: the update could not be prepared.",
			};
		}
	} finally {
		if (lock?.acquired) await lock.release();
	}
}
