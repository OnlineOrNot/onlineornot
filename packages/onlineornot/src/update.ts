import chalk from "chalk";
import pkg from "../package.json";
import { logger } from "./logger";
import { runStandaloneUpdate } from "./standalone-update";
import type { StandaloneUpdateProgress } from "./standalone-update";
import type { CommonYargsOptions } from "./yargs-types";
import type { Argv } from "yargs";

function isSEA(): boolean {
	return process.env.ONLINEORNOT_SEA === "true";
}

/** Configure flags for the standalone CLI update command. */
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

function reportUpdateProgress(): (progress: StandaloneUpdateProgress) => void {
	let lastPhase: StandaloneUpdateProgress["type"] | string | null = null;
	return (progress) => {
		if (progress.type !== "phase" || progress.phase === lastPhase) return;
		lastPhase = progress.phase;
		if (progress.phase === "check")
			logger.log(chalk.dim("Checking for updates..."));
		if (progress.phase === "patch")
			logger.log(chalk.dim("Looking for a delta update..."));
		if (progress.phase === "download")
			logger.log(chalk.dim("Downloading the full update..."));
		if (progress.phase === "install")
			logger.log(chalk.dim("Installing the verified update..."));
	};
}

function printUpdateSuccess(version: string, method: "patch" | "full"): void {
	logger.log("");
	logger.log(
		chalk.dim("█▀▀█ █▀▀▄ █   ▀ █▀▀▄ █▀▀ ") +
			"█▀▀█ █▀▀█ " +
			chalk.dim("█▀▀▄ █▀▀█ ▀▀█▀▀"),
	);
	logger.log(
		chalk.dim("█░░█ █░░█ █   █ █░░█ █▀▀ ") +
			"█░░█ █▄▄▀ " +
			chalk.dim("█░░█ █░░█   █"),
	);
	logger.log(
		chalk.dim("▀▀▀▀ ▀  ▀ ▀▀▀ ▀ ▀  ▀ ▀▀▀ ") +
			"▀▀▀▀ ▀ ▀▀ " +
			chalk.dim("▀  ▀ ▀▀▀▀   ▀"),
	);
	logger.log("");
	logger.log(
		chalk.dim(
			`Updated to version ${version} using a ${method === "patch" ? "delta patch" : "full download"}.`,
		),
	);
	logger.log("");
	logger.log("onlineornot checks  " + chalk.dim("# Manage checks"));
	logger.log("");
	logger.log(
		chalk.dim("For more information visit ") + "https://onlineornot.com/docs",
	);
	logger.log("");
}

/** Check for or install the latest CLI release. */
export async function updateHandler(args: {
	force: boolean;
	check: boolean;
}): Promise<void> {
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
		logger.log("Or install the standalone binary for automatic updates:");
		logger.log(
			chalk.dim("  curl -fsSL https://onlineornot.com/install | bash"),
		);
		logger.log("");
		return;
	}

	logger.log(chalk.dim(`Current version: ${pkg.version}`));
	const result = await runStandaloneUpdate({
		currentVersion: pkg.version,
		checkOnly: args.check,
		force: args.force,
		onProgress: reportUpdateProgress(),
	});

	if (result.status === "current") {
		logger.log("");
		logger.log(chalk.green("✓") + " You're already on the latest version!");
		return;
	}
	if (result.status === "available") {
		logger.log("");
		logger.log(`Version ${chalk.cyan(result.version)} is available.`);
		logger.log(`Run ${chalk.cyan("onlineornot update")} to install it.`);
		return;
	}
	if (result.status === "busy") {
		logger.log(chalk.dim("Another OnlineOrNot update is already running."));
		return;
	}
	if (result.status === "failed") {
		logger.error(result.message);
		process.exitCode = 1;
		return;
	}

	printUpdateSuccess(result.version, result.method);
}
