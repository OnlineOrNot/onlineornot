import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import chalk from "chalk";
import pkg from "../package.json";
import { logger } from "./logger";
import type { CommonYargsOptions } from "./yargs-types";
import type { Argv } from "yargs";

const INSTALL_DIR =
	process.env.ONLINEORNOT_INSTALL_DIR ||
	path.join(os.homedir(), ".onlineornot");
const REPO = "OnlineOrNot/onlineornot-cli";

interface GitHubRelease {
	tag_name: string;
	assets: Array<{
		name: string;
		browser_download_url: string;
	}>;
}

function isSEA(): boolean {
	return process.env.ONLINEORNOT_SEA === "true";
}

function isNewerVersion(a: string, b: string): boolean {
	const partsA = a.replace(/^v/, "").split(".").map(Number);
	const partsB = b.replace(/^v/, "").split(".").map(Number);

	for (let i = 0; i < 3; i++) {
		const numA = partsA[i] || 0;
		const numB = partsB[i] || 0;
		if (numA > numB) return true;
		if (numA < numB) return false;
	}

	return false;
}

export function updateOptions(yargs: Argv<CommonYargsOptions>) {
	return yargs
		.option("force", {
			alias: "f",
			type: "boolean",
			description: "Force update even if already on latest version",
			default: false,
		})
		.option("check", {
			alias: "c",
			type: "boolean",
			description: "Only check for updates, don't install",
			default: false,
		});
}

export async function updateHandler(args: {
	force: boolean;
	check: boolean;
}): Promise<void> {
	const currentVersion = pkg.version;

	if (!isSEA()) {
		logger.log("");
		logger.log(
			`You're running OnlineOrNot CLI via ${chalk.cyan("npm/pnpm")}, not as a standalone binary.`,
		);
		logger.log("");
		logger.log("To update, run:");
		logger.log(chalk.dim("  npm update -g onlineornot"));
		logger.log(chalk.dim("  # or"));
		logger.log(chalk.dim("  pnpm update -g onlineornot"));
		logger.log("");
		logger.log(`Or install the standalone binary for auto-updates:`);
		logger.log(
			chalk.dim("  curl -fsSL https://onlineornot.com/install.sh | bash"),
		);
		return;
	}

	logger.log(`Current version: ${chalk.cyan(currentVersion)}`);
	logger.log("Checking for updates...");

	// Fetch latest release
	const response = await fetch(
		`https://api.github.com/repos/${REPO}/releases/latest`,
		{
			headers: {
				"User-Agent": "onlineornot-cli",
			},
		},
	);

	if (!response.ok) {
		logger.error("Failed to check for updates. Please try again later.");
		return;
	}

	const release = (await response.json()) as GitHubRelease;
	const latestVersion = release.tag_name.replace(/^v/, "");

	if (!args.force && !isNewerVersion(latestVersion, currentVersion)) {
		logger.log("");
		logger.log(chalk.green("✓") + " You're already on the latest version!");
		return;
	}

	logger.log(`Latest version:  ${chalk.green(latestVersion)}`);

	if (args.check) {
		if (isNewerVersion(latestVersion, currentVersion)) {
			logger.log("");
			logger.log(
				`Run ${chalk.cyan("onlineornot update")} to install the latest version.`,
			);
		}
		return;
	}

	// Determine binary name for this platform
	const osName = process.platform === "darwin" ? "darwin" : "linux";
	const arch = process.arch === "arm64" ? "arm64" : "amd64";
	const binaryName = `onlineornot-${osName}-${arch}`;

	const asset = release.assets.find((a) => a.name === binaryName);
	if (!asset) {
		logger.error(`No binary available for your platform (${osName}-${arch})`);
		return;
	}

	logger.log("");
	logger.log(`Downloading ${chalk.cyan(binaryName)}...`);

	const binaryResponse = await fetch(asset.browser_download_url);
	if (!binaryResponse.ok) {
		logger.error("Failed to download update. Please try again later.");
		return;
	}

	const buffer = await binaryResponse.arrayBuffer();
	const currentBinary = process.execPath;

	// Write to a temp file first
	const tempPath = `${currentBinary}.new`;
	await fs.writeFile(tempPath, Buffer.from(buffer));
	await fs.chmod(tempPath, 0o755);

	// Replace current binary
	const backupPath = `${currentBinary}.backup`;
	try {
		// Backup current binary
		await fs.copyFile(currentBinary, backupPath);
		// Replace with new binary
		await fs.rename(tempPath, currentBinary);
		// Remove backup
		await fs.rm(backupPath, { force: true });
	} catch (error) {
		// Restore backup if something went wrong
		try {
			await fs.rename(backupPath, currentBinary);
		} catch {
			// Ignore restore errors
		}
		throw error;
	}

	// Update version file
	await fs.mkdir(INSTALL_DIR, { recursive: true });
	await fs.writeFile(path.join(INSTALL_DIR, "version"), latestVersion);

	logger.log("");
	logger.log(
		chalk.green("✓") + ` Updated to version ${chalk.cyan(latestVersion)}!`,
	);
	logger.log("");
	logger.log(
		chalk.dim(
			"Restart your terminal or run a new command to use the new version.",
		),
	);
}
