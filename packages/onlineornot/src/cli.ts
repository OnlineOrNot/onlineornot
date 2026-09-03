import process from "process";

import { hideBin } from "yargs/helpers";

import { main } from ".";
import {
	checkForUpdateInBackground,
	handleUpdateCheckFlag,
} from "./auto-update";
import { FatalError } from "./errors";

/**
 * The main entrypoint for the CLI.
 * main only gets called when the script is run directly, not when it's imported as a module.
 */

async function run() {
	const argv = hideBin(process.argv);

	// Handle background update check process
	if (await handleUpdateCheckFlag()) {
		return;
	}

	// Check for updates in background (SEA only)
	checkForUpdateInBackground(argv);

	// Run the main CLI
	try {
		await main(argv);
	} catch (e) {
		// The logging of any error that was thrown from `main()` is handled in the `yargs.fail()` handler.
		// Here we just want to ensure that the process exits with a non-zero code.
		// We don't want to do this inside the `main()` function, since that would kill the process when running our tests.
		const exitCode = (e instanceof FatalError && e.code) || 1;
		process.exit(exitCode);
	}
}

run();
