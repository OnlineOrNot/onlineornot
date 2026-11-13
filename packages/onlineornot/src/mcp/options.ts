import type { CommonYargsArgv } from "../yargs-types";

export function mcpOptions(yargs: CommonYargsArgv) {
	return yargs
		.usage(
			"$0 mcp\n\nStart an MCP server over stdio, bridging to https://mcp.onlineornot.com/mcp.\nThis is not an interactive CLI. An MCP client must launch this command,\ninitialize the connection and discover tools with tools/list.",
		)
		.example(
			"npx -y onlineornot@latest auth login",
			"Sign in in a terminal before configuring your MCP client",
		)
		.example(
			"npx -y onlineornot@latest mcp",
			"Launch via your MCP client (installed CLI: onlineornot mcp)",
		).epilog(`Authentication:
  Run onlineornot auth login first (or npx -y onlineornot@latest auth login).
  The MCP client must use the same OS user and home directory as the login.
  Saved OAuth credentials are refreshed automatically; mcp never opens a login browser.
  Alternatively, set ONLINEORNOT_API_TOKEN in the MCP server process environment.
  This is the only authentication environment variable; it takes precedence over
  saved login. Unset it to use OAuth. Do not put tokens in prompts or source control.
  If an older login has not authorized MCP, run onlineornot auth logout then
  onlineornot auth login to authorize it again.

MCP client configuration (generic mcpServers format):
{
  "mcpServers": {
    "onlineornot": {
      "command": "npx",
      "args": ["-y", "onlineornot@latest", "mcp"]
    }
  }
}
  Configuration location and format depend on the client. Node.js 22+ and npx
  must be on its PATH. For an installed CLI, use command "onlineornot", args ["mcp"].
  No token is needed in this JSON when using your saved CLI login.

Tools and permissions:
  The hosted server currently exposes search (find API endpoints and schemas) and
  execute (run JavaScript making authenticated OnlineOrNot API requests).
  Use these for monitoring checks, heartbeats, status pages, incidents, maintenance
  windows and other supported API workflows. Mutations require matching permissions;
  tools do not bypass organization, grant or plan restrictions. Discover tools in
  your MCP client rather than treating tool names as CLI subcommands.

When launched directly:
  With authentication ready, no output while stdin remains open is normal: the
  server is waiting for MCP protocol messages, not terminal commands. Silence does
  not verify the remote connection; that happens when a client sends a request.
  Use Ctrl+C to stop, or close stdin to exit. Failures exit nonzero with diagnostics
  on stderr. During a session, stdout is reserved for MCP protocol messages only.

Documentation:
  https://onlineornot.com/docs/reference/mcp
  https://onlineornot.com/docs/how-to/mcp/connect
  https://mcp.onlineornot.com/llms.txt`);
}
