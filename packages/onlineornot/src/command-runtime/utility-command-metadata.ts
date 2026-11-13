import type { SearchCommandMetadata } from "./command-search";

function utilityCommand(
	name: string,
	description: string,
	metadata: Pick<
		SearchCommandMetadata,
		"flags" | "search" | "hideCommand"
	> = {},
): SearchCommandMetadata {
	return {
		command: `onlineornot ${name}`,
		words: name.split(" "),
		description,
		summary: description,
		...metadata,
	};
}

export const utilityCommandMetadata = {
	docs: utilityCommand("docs", "📚 Open OnlineOrNot's docs in your browser", {
		search: { keywords: ["documentation", "guides", "reference"] },
	}),
	billing: utilityCommand(
		"billing",
		"🧾 Open OnlineOrNot's billing in your browser",
		{
			search: { keywords: ["subscription", "payment", "invoices"] },
		},
	),
	login: utilityCommand("login", "🔓 Login to OnlineOrNot via OAuth", {
		search: { keywords: ["signin", "authenticate", "authorization"] },
	}),
	logout: utilityCommand("logout", "🔒 Logout from OnlineOrNot", {
		search: { keywords: ["signout", "revoke", "credentials"] },
	}),
	setup: utilityCommand(
		"setup",
		"🚀 Sign in or sign up and create your first uptime check",
		{
			search: { keywords: ["signup", "onboarding", "signin"] },
			flags: [
				{ name: "url", description: "URL for the first uptime check" },
				{
					name: "name",
					description: "Optional name for the first uptime check",
				},
				{
					name: "provider",
					description: "Sign in or sign up with this provider: google, github",
				},
			],
		},
	),
	whoami: utilityCommand(
		"whoami",
		"🕵️  Retrieve your user info and test your auth config",
		{
			search: { keywords: ["identity", "account", "authentication"] },
		},
	),
	mcp: utilityCommand(
		"mcp",
		"Connect an MCP client over stdio using your CLI login",
		{
			search: { keywords: ["model context protocol", "AI", "agent", "bridge"] },
		},
	),
	update: utilityCommand(
		"update",
		"⬆️  Update OnlineOrNot CLI to the latest version",
		{
			search: { keywords: ["upgrade", "binary", "release"] },
			flags: [
				{
					name: "force",
					description: "Force update even if already on latest version",
				},
				{ name: "check", description: "Only check for updates, don't install" },
			],
		},
	),
	uninstall: utilityCommand(
		"uninstall",
		"🗑️  Uninstall OnlineOrNot CLI and remove all related files",
		{
			search: { keywords: ["uninstaller", "remove CLI"] },
			flags: [
				{
					name: "keep-config",
					description: "Keep configuration files (credentials)",
				},
				{ name: "keep-data", description: "Keep data directory" },
				{
					name: "dry-run",
					description: "Show what would be removed without removing",
				},
				{ name: "force", description: "Skip confirmation prompts" },
			],
		},
	),
	version: utilityCommand("version", "Show the CLI version", {
		hideCommand: true,
	}),
	cliCommands: utilityCommand(
		"cli commands",
		"Print the generated command catalog as JSON",
	),
	cliSearch: utilityCommand("cli search", "Search all CLI commands by intent", {
		flags: [
			{
				name: "query",
				description: "Search terms or a description of what you want to do",
			},
		],
	}),
};
