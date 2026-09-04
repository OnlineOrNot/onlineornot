import { stdin, stdout } from "node:process";
import { createInterface } from "node:readline/promises";

import {
	createCheck as createApiCheck,
	listChecks as listApiChecks,
} from "../api/checks";
import type { OAuthProvider } from "../auth";
import { logger } from "../logger";
import {
	authenticateWithBrowser,
	type BrowserAuthenticationOptions,
} from "../login";
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
		})
		.option("provider", {
			choices: ["google", "github"] as const,
			describe: "Sign in or sign up with this provider",
		});
}

export function validateCheckUrl(value: string): string {
	const withoutSpaces = value.replace(/\s+/g, "");
	const normalizedValue = /^[a-z][a-z0-9+.-]*:\/\//i.test(withoutSpaces)
		? withoutSpaces
		: `https://${withoutSpaces}`;
	let parsed: URL;
	try {
		parsed = new URL(normalizedValue);
	} catch {
		throw new Error("Enter a valid URL, like example.com.");
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
	listChecks: () => Promise<SetupCheck[]>;
	createCheck: (name: string, url: string) => Promise<SetupCheck>;
	getState: () => SetupCheckState | null;
	saveState: (state: SetupCheckState) => void;
	prompt: (question: string) => Promise<string>;
	isInteractive: boolean;
	log: (...values: unknown[]) => void;
}

async function listSetupChecks(): Promise<SetupCheck[]> {
	return (await listApiChecks()).flatMap(({ id, name, url }) =>
		url === null ? [] : [{ id, name, url }],
	);
}

async function createSetupCheck(
	name: string,
	url: string,
): Promise<SetupCheck> {
	const check = await createApiCheck({ name, url });
	if (check.url === null) {
		throw new Error("The API returned a check without a URL.");
	}
	return { id: check.id, name: check.name, url: check.url };
}

const defaultDependencies: SetupDependencies = {
	authenticate: authenticateWithBrowser,
	listChecks: listSetupChecks,
	createCheck: createSetupCheck,
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
	checks: SetupCheck[],
	state: SetupCheckState,
): SetupCheck | undefined {
	const expectedUrl = normalizedUrl(state.url);
	const sameTarget = (check: SetupCheck) =>
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

async function selectAuthProvider(
	prompt: (question: string) => Promise<string>,
): Promise<OAuthProvider> {
	let question =
		"Sign in (or sign up) with:\n  1. Google\n  2. GitHub\nChoose [1]: ";
	while (true) {
		const answer = (await prompt(question)).trim().toLowerCase();
		if (["", "1", "google", "g"].includes(answer)) return "google";
		if (["2", "github", "gh"].includes(answer)) return "github";
		question = "Choose 1 for Google or 2 for GitHub: ";
	}
}

export async function runSetup(
	args: { url?: string; name?: string; provider?: OAuthProvider },
	dependencies: Partial<SetupDependencies> = {},
): Promise<SetupCheck> {
	const deps = { ...defaultDependencies, ...dependencies };
	const authenticationOptions: BrowserAuthenticationOptions = {
		prompt: "create",
	};
	if (args.provider) authenticationOptions.provider = args.provider;
	if (deps.isInteractive) {
		authenticationOptions.selectProvider = () =>
			selectAuthProvider(deps.prompt);
	}
	const login = await deps.authenticate(authenticationOptions);
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

	let validatedUrl: string;
	if (!url) {
		if (!deps.isInteractive) {
			throw new Error(
				"A URL is required in non-interactive mode. Run `onlineornot setup --url https://example.com`.",
			);
		}
		while (true) {
			try {
				validatedUrl = validateCheckUrl(await deps.prompt("URL to monitor: "));
				break;
			} catch (error) {
				deps.log(error instanceof Error ? error.message : error);
			}
		}
	} else {
		validatedUrl = validateCheckUrl(url);
	}

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
