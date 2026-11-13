import yargs from "yargs";

import { registerCommandCatalog } from "../command-runtime/command-catalog";
import { searchCommandCatalogFixture } from "./search-command-catalog";

const parser = yargs(process.argv.slice(2))
	.scriptName("onlineornot")
	.strict()
	.option("v", { type: "boolean" })
	.exitProcess(false);
registerCommandCatalog(parser, searchCommandCatalogFixture);
await parser.parseAsync();
