import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import chalk from "chalk";
import { logger } from "./logger";
import type { CommonYargsOptions } from "./yargs-types";
import type { Argv } from "yargs";

const INSTALL_DIR =
	process.env.ONLINEORNOT_INSTALL_DIR ||
	path.join(os.homedir(), ".onlineornot");
const CONFIG_DIR = path.join(
	process.env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config"),
	"onlineornot",
);

function isSEA(): boolean {
	return process.env.ONLINEORNOT_SEA === "true";
}

function shortenPath(p: string): string {
	const home = os.homedir();
	if (p.startsWith(home)) {
		return p.replace(home, "~");
	}
	return p;
}

async function getDirectorySize(dir: string): Promise<number> {
	let total = 0;

	const walk = async (current: string) => {
		const entries = await fs
			.readdir(current, { withFileTypes: true })
			.catch(() => []);
		for (const entry of entries) {
			const full = path.join(current, entry.name);
			if (entry.isDirectory()) {
				await walk(full);
			} else if (entry.isFile()) {
				const stat = await fs.stat(full).catch(() => null);
				if (stat) total += stat.size;
			}
		}
	};

	await walk(dir);
	return total;
}

function formatSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	if (bytes < 1024 * 1024 * 1024)
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

async function getShellConfigFile(): Promise<string | null> {
	const shell = path.basename(process.env.SHELL || "bash");
	const home = os.homedir();
	const xdgConfig = process.env.XDG_CONFIG_HOME || path.join(home, ".config");

	const configFiles: Record<string, string[]> = {
		fish: [path.join(xdgConfig, "fish", "config.fish")],
		zsh: [
			path.join(home, ".zshrc"),
			path.join(home, ".zshenv"),
			path.join(xdgConfig, "zsh", ".zshrc"),
			path.join(xdgConfig, "zsh", ".zshenv"),
		],
		bash: [
			path.join(home, ".bashrc"),
			path.join(home, ".bash_profile"),
			path.join(home, ".profile"),
			path.join(xdgConfig, "bash", ".bashrc"),
			path.join(xdgConfig, "bash", ".bash_profile"),
		],
		ash: [path.join(home, ".ashrc"), path.join(home, ".profile")],
		sh: [path.join(home, ".profile")],
	};

	const candidates = configFiles[shell] || configFiles.bash;

	for (const file of candidates) {
		const exists = await fs
			.access(file)
			.then(() => true)
			.catch(() => false);
		if (!exists) continue;

		const content = await fs.readFile(file, "utf-8").catch(() => "");
		if (
			content.includes("# onlineornot") ||
			content.includes(".onlineornot/bin")
		) {
			return file;
		}
	}

	return null;
}

async function cleanShellConfig(file: string): Promise<void> {
	const content = await fs.readFile(file, "utf-8");
	const lines = content.split("\n");

	const filtered: string[] = [];
	let skip = false;

	for (const line of lines) {
		const trimmed = line.trim();

		if (trimmed === "# onlineornot") {
			skip = true;
			continue;
		}

		if (skip) {
			skip = false;
			if (
				trimmed.includes(".onlineornot/bin") ||
				trimmed.includes("fish_add_path")
			) {
				continue;
			}
		}

		if (
			(trimmed.startsWith("export PATH=") &&
				trimmed.includes(".onlineornot/bin")) ||
			(trimmed.startsWith("fish_add_path") && trimmed.includes(".onlineornot"))
		) {
			continue;
		}

		filtered.push(line);
	}

	// Remove trailing empty lines
	while (filtered.length > 0 && filtered[filtered.length - 1].trim() === "") {
		filtered.pop();
	}

	const output = filtered.join("\n") + "\n";
	await fs.writeFile(file, output);
}

export function uninstallOptions(yargs: Argv<CommonYargsOptions>) {
	return yargs
		.option("keep-config", {
			alias: "c",
			type: "boolean",
			describe: "Keep configuration files (credentials)",
			default: false,
		})
		.option("keep-data", {
			alias: "d",
			type: "boolean",
			describe: "Keep data directory",
			default: false,
		})
		.option("dry-run", {
			type: "boolean",
			describe: "Show what would be removed without removing",
			default: false,
		})
		.option("force", {
			alias: "f",
			type: "boolean",
			describe: "Skip confirmation prompts",
			default: false,
		});
}

export async function uninstallHandler(args: {
	keepConfig: boolean;
	keepData: boolean;
	dryRun: boolean;
	force: boolean;
}): Promise<void> {
	logger.log("");
	logger.log(chalk.bold("Uninstall OnlineOrNot CLI"));
	logger.log("");

	const installMethod = isSEA() ? "curl" : "npm";
	logger.log(chalk.dim(`Installation method: ${installMethod}`));
	logger.log("");

	// Collect what we'll remove
	const shellConfig =
		installMethod === "curl" ? await getShellConfigFile() : null;
	const binaryPath = installMethod === "curl" ? process.execPath : null;

	// Show what will be removed
	logger.log("The following will be removed:");
	logger.log("");

	const installDirExists = await fs
		.access(INSTALL_DIR)
		.then(() => true)
		.catch(() => false);
	if (installDirExists) {
		const size = await getDirectorySize(INSTALL_DIR);
		const status = args.keepData ? chalk.dim(" (keeping)") : "";
		const prefix = args.keepData ? "○" : "✓";
		logger.log(
			`  ${prefix} Data: ${shortenPath(INSTALL_DIR)} ${chalk.dim(`(${formatSize(size)})`)}${status}`,
		);
	}

	const configDirExists = await fs
		.access(CONFIG_DIR)
		.then(() => true)
		.catch(() => false);
	if (configDirExists) {
		const size = await getDirectorySize(CONFIG_DIR);
		const status = args.keepConfig ? chalk.dim(" (keeping)") : "";
		const prefix = args.keepConfig ? "○" : "✓";
		logger.log(
			`  ${prefix} Config: ${shortenPath(CONFIG_DIR)} ${chalk.dim(`(${formatSize(size)})`)}${status}`,
		);
	}

	if (binaryPath) {
		logger.log(`  ✓ Binary: ${shortenPath(binaryPath)}`);
	}

	if (shellConfig) {
		logger.log(`  ✓ Shell PATH in ${shortenPath(shellConfig)}`);
	}

	if (installMethod !== "curl") {
		logger.log(`  ✓ Package: npm uninstall -g onlineornot`);
	}

	logger.log("");

	// Dry run - stop here
	if (args.dryRun) {
		logger.warn("Dry run - no changes made");
		return;
	}

	// Confirm unless --force
	if (!args.force) {
		const readline = await import("node:readline");
		const rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout,
		});

		const answer = await new Promise<string>((resolve) => {
			rl.question("Are you sure you want to uninstall? (y/N) ", resolve);
		});
		rl.close();

		if (answer.toLowerCase() !== "y") {
			logger.log("Cancelled");
			return;
		}
	}

	logger.log("");

	// Remove install directory
	if (installDirExists && !args.keepData) {
		logger.log(`Removing ${shortenPath(INSTALL_DIR)}...`);
		await fs.rm(INSTALL_DIR, { recursive: true, force: true });
		logger.log(chalk.green("✓") + " Removed data directory");
	} else if (installDirExists && args.keepData) {
		logger.log(chalk.dim(`Skipping data (--keep-data)`));
	}

	// Remove config directory
	if (configDirExists && !args.keepConfig) {
		logger.log(`Removing ${shortenPath(CONFIG_DIR)}...`);
		await fs.rm(CONFIG_DIR, { recursive: true, force: true });
		logger.log(chalk.green("✓") + " Removed config directory");
	} else if (configDirExists && args.keepConfig) {
		logger.log(chalk.dim(`Skipping config (--keep-config)`));
	}

	// Clean shell config
	if (shellConfig) {
		logger.log(`Cleaning ${shortenPath(shellConfig)}...`);
		await cleanShellConfig(shellConfig);
		logger.log(chalk.green("✓") + " Cleaned shell config");
	}

	// Handle binary removal
	if (installMethod === "curl" && binaryPath) {
		logger.log("");
		logger.log("To finish removing the binary, run:");
		logger.log(chalk.dim(`  rm "${binaryPath}"`));

		const binDir = path.dirname(binaryPath);
		if (binDir.includes(".onlineornot")) {
			logger.log(chalk.dim(`  rmdir "${binDir}" 2>/dev/null`));
		}
	}

	if (installMethod !== "curl") {
		logger.log("");
		logger.log("To finish uninstalling, run:");
		logger.log(chalk.dim("  npm uninstall -g onlineornot"));
	}

	logger.log("");
	logger.log(chalk.green("✓") + " Thank you for using OnlineOrNot!");
	logger.log("");
}
