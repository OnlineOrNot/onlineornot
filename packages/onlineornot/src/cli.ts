import process from "process";
import { hideBin } from "yargs/helpers";
import {
	applyPendingUpdate,
	checkForUpdateInBackground,
	handleUpdateCheckFlag,
} from "./auto-update";
import { FatalError } from "./errors";
import { main } from ".";

/**
 * The main entrypoint for the CLI.
 * main only gets called when the script is run directly, not when it's imported as a module.
 */

async function run() {
	// Handle background update check process
	if (await handleUpdateCheckFlag()) {
		return;
	}

	// Apply any pending updates (SEA only)
	await applyPendingUpdate();

	// Check for updates in background (SEA only)
	checkForUpdateInBackground();

	// Run the main CLI
	try {
		await main(hideBin(process.argv));
	} catch (e) {
		// The logging of any error that was thrown from `main()` is handled in the `yargs.fail()` handler.
		// Here we just want to ensure that the process exits with a non-zero code.
		// We don't want to do this inside the `main()` function, since that would kill the process when running our tests.
		const exitCode = (e instanceof FatalError && e.code) || 1;
		process.exit(exitCode);
	}
}

run();
