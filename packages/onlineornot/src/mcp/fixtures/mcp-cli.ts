import { buildAuthUrl } from "../../auth/oauth";
import { getValidToken } from "../../auth/refresh";

const nativeFetch = globalThis.fetch;
const origin = process.env.OON_MCP_TEST_ORIGIN;
if (!origin) throw new Error("MCP test origin is required");
globalThis.fetch = (input, init) => {
	const url = new URL(input instanceof Request ? input.url : input.toString());
	if (
		!["onlineornot.com", "api.onlineornot.com", "mcp.onlineornot.com"].includes(
			url.hostname,
		)
	) {
		throw new Error("Unexpected MCP test request origin");
	}
	if (
		(process.env.OON_MCP_TEST_FETCH_FAILURE === "oauth" &&
			url.pathname.endsWith("/token")) ||
		(process.env.OON_MCP_TEST_FETCH_FAILURE === "mcp" &&
			url.hostname === "mcp.onlineornot.com")
	)
		throw new TypeError("fetch failed");
	return nativeFetch(new URL(`${url.pathname}${url.search}`, origin), init);
};

async function runFixture() {
	if (process.argv[2] === "test-api-token") {
		process.stdout.write(`${await getValidToken()}\n`);
	} else if (process.argv[2] === "test-auth-url") {
		process.stdout.write(`${(await buildAuthUrl()).url}\n`);
	} else {
		await import("../../cli");
	}
}

void runFixture().catch((error: Error) => {
	process.stderr.write(`${error.message}\n`);
	process.exitCode = 1;
});
