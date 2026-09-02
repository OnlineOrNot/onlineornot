import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import pkg from "../package.json";
import { isStandaloneExecutable } from "./runtime-environment";
import { runStandaloneUpdate } from "./standalone-update";

const INSTALL_DIRECTORY =
	process.env.ONLINEORNOT_INSTALL_DIR ??
	path.join(os.homedir(), ".onlineornot");
const AUTO_UPDATE_STATE_PATH = path.join(
	INSTALL_DIRECTORY,
	"auto-update-next-check",
);
const AUTO_UPDATE_SUCCESS_INTERVAL_MS = 24 * 60 * 60 * 1000;
const AUTO_UPDATE_FAILURE_INTERVAL_MS = 60 * 60 * 1000;

/** Start a detached, non-blocking standalone update check. */
export function checkForUpdateInBackground(argv: readonly string[]): void {
	if (
		!isStandaloneExecutable() ||
		process.env.ONLINEORNOT_DISABLE_AUTO_UPDATE === "true" ||
		argv.includes("update") ||
		argv.includes("uninstall") ||
		!isAutomaticUpdateCheckDue()
	) {
		return;
	}

	// Spawn detached process to check for updates
	const child = spawn(process.execPath, ["--onlineornot-check-update"], {
		detached: true,
		stdio: "ignore",
		env: {
			...process.env,
			ONLINEORNOT_UPDATE_CHECK: "true",
		},
	});
	child.on("error", () => {
		// Automatic updates are best-effort and must never interrupt the CLI.
	});
	child.unref();
}

function isAutomaticUpdateCheckDue(): boolean {
	try {
		const nextCheckAt = Number(readFileSync(AUTO_UPDATE_STATE_PATH, "utf8"));
		const now = Date.now();
		return (
			!Number.isFinite(nextCheckAt) ||
			nextCheckAt > now + AUTO_UPDATE_SUCCESS_INTERVAL_MS ||
			now >= nextCheckAt
		);
	} catch {
		return true;
	}
}

async function scheduleNextAutomaticUpdateCheck(
	delayMs: number,
): Promise<void> {
	const pendingStatePath = `${AUTO_UPDATE_STATE_PATH}.new`;
	try {
		await fs.mkdir(INSTALL_DIRECTORY, { recursive: true });
		await fs.writeFile(pendingStatePath, `${Date.now() + delayMs}\n`, {
			mode: 0o600,
		});
		await fs.rename(pendingStatePath, AUTO_UPDATE_STATE_PATH);
	} catch {
		await fs.rm(pendingStatePath, { force: true }).catch(() => {});
	}
}

/** Check for and atomically install a verified standalone update. */
export async function performUpdateCheck(): Promise<void> {
	const result = await runStandaloneUpdate({ currentVersion: pkg.version });
	if (result.status === "busy") return;
	await scheduleNextAutomaticUpdateCheck(
		result.status === "failed"
			? AUTO_UPDATE_FAILURE_INTERVAL_MS
			: AUTO_UPDATE_SUCCESS_INTERVAL_MS,
	);
}

/** Handle the private detached-update process flag. */
export async function handleUpdateCheckFlag(): Promise<boolean> {
	if (
		isStandaloneExecutable() &&
		process.env.ONLINEORNOT_UPDATE_CHECK === "true"
	) {
		await performUpdateCheck();
		return true;
	}
	return false;
}
