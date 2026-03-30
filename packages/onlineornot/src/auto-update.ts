import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import pkg from "../package.json";

const INSTALL_DIR =
	process.env.ONLINEORNOT_INSTALL_DIR ||
	path.join(os.homedir(), ".onlineornot");
const PENDING_DIR = path.join(INSTALL_DIR, "pending");
const VERSION_FILE = path.join(INSTALL_DIR, "version");
const REPO = "OnlineOrNot/onlineornot";

/**
 * Check if we're running as a SEA binary (not via npm)
 */
function isSEA(): boolean {
	return process.env.ONLINEORNOT_SEA === "true";
}

/**
 * Apply any pending update before running the CLI
 * This replaces the current binary with the pending one
 */
export async function applyPendingUpdate(): Promise<void> {
	if (!isSEA()) return;

	try {
		const files = await fs.readdir(PENDING_DIR).catch(() => []);
		if (files.length === 0) return;

		const pendingBinary = path.join(PENDING_DIR, files[0]);
		const currentBinary = process.execPath;

		// Replace current binary with pending one
		await fs.copyFile(pendingBinary, currentBinary);
		await fs.rm(PENDING_DIR, { recursive: true, force: true });

		// Update version file
		const newVersion = files[0].replace("onlineornot-", "");
		await fs.writeFile(VERSION_FILE, newVersion);
	} catch {
		// Silently ignore update errors - don't block CLI usage
	}
}

/**
 * Check for updates in background (non-blocking)
 * Downloads new version to pending directory if available
 */
export function checkForUpdateInBackground(): void {
	if (!isSEA()) return;

	// Spawn detached process to check for updates
	const child = spawn(process.execPath, ["--onlineornot-check-update"], {
		detached: true,
		stdio: "ignore",
		env: {
			...process.env,
			ONLINEORNOT_UPDATE_CHECK: "true",
		},
	});
	child.unref();
}

/**
 * Actually perform the update check and download
 * Called by the background process
 */
export async function performUpdateCheck(): Promise<void> {
	try {
		const currentVersion = pkg.version;

		// Get releases from GitHub (changesets uses onlineornot@x.x.x tags)
		const response = await fetch(
			`https://api.github.com/repos/${REPO}/releases`,
			{
				headers: {
					"User-Agent": "onlineornot-cli",
				},
			},
		);

		if (!response.ok) return;

		const releases = (await response.json()) as Array<{
			tag_name: string;
			assets: Array<{ name: string; browser_download_url: string }>;
		}>;

		// Find latest onlineornot release
		const release = releases.find((r) => r.tag_name.startsWith("onlineornot@"));
		if (!release) return;
		const latestVersion = release.tag_name.replace(/^onlineornot@/, "");

		// Compare versions (simple semver comparison)
		if (!isNewerVersion(latestVersion, currentVersion)) return;

		// Determine binary name for this platform
		const osName = process.platform === "darwin" ? "darwin" : "linux";
		const arch = process.arch === "arm64" ? "arm64" : "amd64";
		const binaryName = `onlineornot-${osName}-${arch}`;

		// Find the asset
		const asset = release.assets.find(
			(a: { name: string }) => a.name === binaryName,
		);
		if (!asset) return;

		// Download to pending directory
		await fs.mkdir(PENDING_DIR, { recursive: true });
		const pendingPath = path.join(PENDING_DIR, `onlineornot-${latestVersion}`);

		const binaryResponse = await fetch(asset.browser_download_url);
		if (!binaryResponse.ok) return;

		const buffer = await binaryResponse.arrayBuffer();
		await fs.writeFile(pendingPath, Buffer.from(buffer));
		await fs.chmod(pendingPath, 0o755);
	} catch {
		// Silently ignore errors
	}
}

/**
 * Simple semver comparison: is a newer than b?
 */
function isNewerVersion(a: string, b: string): boolean {
	const partsA = a.split(".").map(Number);
	const partsB = b.split(".").map(Number);

	for (let i = 0; i < 3; i++) {
		const numA = partsA[i] || 0;
		const numB = partsB[i] || 0;
		if (numA > numB) return true;
		if (numA < numB) return false;
	}

	return false;
}

/**
 * Handle the --onlineornot-check-update flag
 * Returns true if we should exit (this is an update check process)
 */
export async function handleUpdateCheckFlag(): Promise<boolean> {
	if (process.env.ONLINEORNOT_UPDATE_CHECK === "true") {
		await performUpdateCheck();
		return true;
	}
	return false;
}
