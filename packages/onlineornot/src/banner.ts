import chalk from "chalk";
import supportsColor from "supports-color";

import { version as onlineornotVersion } from "../package.json";
import { logger } from "./logger";
import { updateCheck } from "./update-check";

export async function printBanner() {
	const text = ` ✅ onlineornot ${onlineornotVersion} ${await updateCheck()}`;

	logger.log(
		text +
			"\n" +
			(supportsColor.stdout
				? chalk.hex("#FF8800")("-".repeat(text.length))
				: "-".repeat(text.length))
	);
}
