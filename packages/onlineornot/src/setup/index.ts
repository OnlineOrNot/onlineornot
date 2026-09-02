import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { authenticateWithBrowser } from "../login";
import { fetchPagedResult, fetchResult } from "../fetch";
import { logger } from "../logger";
import type { Check, CheckListItem } from "../checks/types";
import type {
	CommonYargsArgv,
	StrictYargsOptionsToInterface,
} from "../yargs-types";
import {
	getSetupCheckState,
	saveSetupCheckState,
	type SetupCheckState,
} from "./state";

const DASHBOARD_BASE_URL = "https://onlineornot.com/app/checks";

export function setupOptions(yargs: CommonYargsArgv) {
	return yargs
		.option("url", {
			describe: "URL for the first uptime check",
			type: "string",
		})
		.option("name", {
			describe: "Optional name for the first uptime check",
			type: "string",
		});
}

export function validateCheckUrl(value: string): string {
	let parsed: URL;
	try {
		parsed = new URL(value.trim());
	} catch {
		throw new Error(
			"Enter a valid absolute URL, including http:// or https://.",
		);
	}

	if (!["http:", "https:"].includes(parsed.protocol)) {
		throw new Error("Only http:// and https:// URLs can be monitored.");
	}
	if (parsed.username || parsed.password) {
		throw new Error("Do not include credentials in the check URL.");
	}

	return parsed.toString();
}

interface SetupCheck {
	id: string;
	name: string;
	url: string;
}

interface SetupDependencies {
	authenticate: typeof authenticateWithBrowser;
	listChecks: () => Promise<CheckListItem[]>;
	createCheck: (name: string, url: string) => Promise<Check>;
	getState: () => SetupCheckState | null;
	saveState: (state: SetupCheckState) => void;
	prompt: (question: string) => Promise<string>;
	isInteractive: boolean;
	log: (...values: unknown[]) => void;
}

const defaultDependencies: SetupDependencies = {
	authenticate: authenticateWithBrowser,
	listChecks: () => fetchPagedResult<CheckListItem>("/checks"),
	createCheck: (name, url) =>
		fetchResult<Check>("/checks/", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ name, url }),
		}),
	getState: getSetupCheckState,
	saveState: saveSetupCheckState,
	prompt: async () => {
		throw new Error("Interactive prompt is unavailable");
	},
	isInteractive: Boolean(stdin.isTTY && stdout.isTTY),
	log: (...values) => logger.log(...values),
};

function normalizedUrl(value: string): string | null {
	try {
		return new URL(value).toString();
	} catch {
		return null;
	}
}

function matchingCheck(
	checks: CheckListItem[],
	state: SetupCheckState,
): CheckListItem | undefined {
	const expectedUrl = normalizedUrl(state.url);
	const sameTarget = (check: CheckListItem) =>
		check.name === state.name && normalizedUrl(check.url) === expectedUrl;
	return (
		checks.find((check) => check.id === state.checkId && sameTarget(check)) ??
		checks.find(
			(check) =>
				check.name === state.name && normalizedUrl(check.url) === expectedUrl,
		)
	);
}

function printCheck(check: SetupCheck, log: (...values: unknown[]) => void) {
	log("");
	log(`Check:     ${check.url}`);
	log(`Dashboard: ${DASHBOARD_BASE_URL}/${encodeURIComponent(check.id)}`);
}

export async function runSetup(
	args: { url?: string; name?: string },
	dependencies: Partial<SetupDependencies> = {},
): Promise<SetupCheck> {
	const deps = { ...defaultDependencies, ...dependencies };
	const login = await deps.authenticate();
	if (login.status === "authenticated") {
		deps.log(`Logged in as ${login.email}.`);
	} else if (login.status === "existing") {
		deps.log(`Using the existing login for ${login.email}.`);
	} else {
		deps.log("Using ONLINEORNOT_API_TOKEN for authentication.");
	}

	const savedState = deps.getState();
	let url = args.url;
	let name = args.name?.trim();

	if (!url && savedState) {
		url = savedState.url;
		name = name || savedState.name;
	}

	if (!url) {
		if (!deps.isInteractive) {
			throw new Error(
				"A URL is required in non-interactive mode. Run `onlineornot setup --url https://example.com`.",
			);
		}
		url = await deps.prompt("URL to monitor: ");
	}

	const validatedUrl = validateCheckUrl(url);
	if (!name) {
		const defaultName = new URL(validatedUrl).hostname;
		if (deps.isInteractive && !savedState) {
			name = (await deps.prompt(`Check name (${defaultName}): `)).trim();
		}
		name = name || defaultName;
	}

	const pendingState = { url: validatedUrl, name };
	deps.saveState(pendingState);
	const checks = await deps.listChecks();
	const existing = matchingCheck(checks, {
		...pendingState,
		checkId:
			savedState?.url === validatedUrl && savedState.name === name
				? savedState.checkId
				: undefined,
	});

	if (existing) {
		deps.saveState({ ...pendingState, checkId: existing.id });
		deps.log("Your first uptime check already exists.");
		printCheck(existing, deps.log);
		return existing;
	}

	const created = await deps.createCheck(name, validatedUrl);
	deps.saveState({ ...pendingState, checkId: created.id });
	deps.log("Created your first uptime check.");
	printCheck(created, deps.log);
	return created;
}

export async function setupHandler(
	args: StrictYargsOptionsToInterface<typeof setupOptions>,
) {
	let promptInterface: ReturnType<typeof createInterface> | undefined;
	try {
		if (stdin.isTTY && stdout.isTTY) {
			promptInterface = createInterface({ input: stdin, output: stdout });
		}
		await runSetup(args, {
			prompt: async (question) => {
				if (!promptInterface) {
					throw new Error("Interactive prompt is unavailable");
				}
				return promptInterface.question(question);
			},
		});
	} finally {
		promptInterface?.close();
	}
}
