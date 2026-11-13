import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { InitializeResultSchema } from "@modelcontextprotocol/sdk/types.js";
import type { RequestId } from "@modelcontextprotocol/sdk/types.js";

import { MCP_OAUTH_RESOURCE } from "../auth/oauth-resources";
import { AuthenticationError, getTokenAsync } from "../user";

export async function runMcpBridge(): Promise<void> {
	try {
		await getTokenAsync(MCP_OAUTH_RESOURCE);
	} catch (error) {
		if (error instanceof AuthenticationError) {
			if (error.code === "NOT_LOGGED_IN") {
				throw new AuthenticationError(
					"MCP authentication is required. Run `onlineornot auth login` in a terminal first, using the same OS user and home directory as your MCP client, or set ONLINEORNOT_API_TOKEN in the MCP server process environment. See `onlineornot mcp --help` for client configuration.",
					error.code,
				);
			}
			if (error.code === "REFRESH_FAILED") {
				throw new AuthenticationError(
					`${error.message} If this is a connection problem, check network access to onlineornot.com and retry. See \`onlineornot mcp --help\` for authentication setup.`,
					error.code,
				);
			}
		}
		throw error;
	}
	const stdio = new StdioServerTransport();
	const remote = new StreamableHTTPClientTransport(
		new URL(MCP_OAUTH_RESOURCE),
		{
			fetch: async (url, init) => {
				if (url.toString() !== MCP_OAUTH_RESOURCE)
					throw new Error("MCP bridge refused an unexpected request URL.");
				const { apiToken, source } = await getTokenAsync(MCP_OAUTH_RESOURCE);
				const headers = new Headers(init?.headers);
				headers.set("Authorization", `Bearer ${apiToken}`);
				const timeout = new AbortController();
				const timer = setTimeout(
					() => timeout.abort(),
					init?.method === "DELETE" ? 2_000 : 30_000,
				);
				let response: Response;
				try {
					response = await fetch(url, {
						...init,
						headers,
						redirect: "error",
						signal: init?.signal
							? AbortSignal.any([init.signal, timeout.signal])
							: timeout.signal,
					});
				} catch {
					throw new Error(
						"Could not reach the OnlineOrNot MCP server at https://mcp.onlineornot.com/mcp. Check your network/proxy settings and retry. HTTP redirects are not followed.",
					);
				} finally {
					clearTimeout(timer);
				}
				if (
					!response.ok &&
					!(init?.method === "GET" && response.status === 405) &&
					!(init?.method === "DELETE" && response.status === 405)
				) {
					await response.body?.cancel();
					const recovery =
						response.status === 401
							? source === "environment"
								? "Unset or replace ONLINEORNOT_API_TOKEN in the MCP server process environment; it overrides CLI login."
								: "Run `onlineornot auth logout` then `onlineornot auth login` in a terminal, then restart your MCP client."
							: response.status === 403
								? "Check your credential's permissions, organization access and plan for the requested operation."
								: "Check the MCP service availability and retry. See `onlineornot mcp --help` for setup.";
					throw new Error(
						`MCP request failed (HTTP ${response.status}). ${recovery}`,
					);
				}
				return response;
			},
		},
	);
	let initializeId: RequestId | undefined;
	await new Promise<void>((resolve, reject) => {
		let stopping = false;
		const stop = async (error?: Error) => {
			if (stopping) return;
			stopping = true;
			process.stdin.off("end", onEnd);
			try {
				if (!error) await remote.terminateSession();
			} catch (closeError) {
				error =
					closeError instanceof Error
						? closeError
						: new Error("MCP session termination failed.");
			} finally {
				await Promise.all([remote.close(), stdio.close()]);
				process.off("SIGINT", onEnd);
				process.off("SIGTERM", onEnd);
			}
			if (error) reject(error);
			else resolve();
		};
		const fail = (error: Error) => {
			void stop(error);
		};
		const onEnd = () => {
			void stop();
		};
		stdio.onmessage = (message) => {
			if (
				"method" in message &&
				message.method === "initialize" &&
				"id" in message
			)
				initializeId = message.id;
			void remote.send(message).catch(fail);
		};
		remote.onmessage = (message) => {
			if (
				"id" in message &&
				message.id === initializeId &&
				"result" in message
			) {
				const initialized = InitializeResultSchema.safeParse(message.result);
				if (initialized.success)
					remote.setProtocolVersion(initialized.data.protocolVersion);
			}
			void stdio.send(message).catch(fail);
		};
		stdio.onerror = fail;
		remote.onerror = fail;
		remote.onclose = onEnd;
		process.stdin.once("end", onEnd);
		process.on("SIGINT", onEnd);
		process.on("SIGTERM", onEnd);
		void remote
			.start()
			.then(() => stdio.start())
			.catch(fail);
	});
}
