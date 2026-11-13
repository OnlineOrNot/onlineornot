import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { InitializeResultSchema } from "@modelcontextprotocol/sdk/types.js";
import type { RequestId } from "@modelcontextprotocol/sdk/types.js";

import { MCP_OAUTH_RESOURCE } from "../auth/oauth-resources";
import { getTokenAsync } from "../user";

export async function runMcpBridge(): Promise<void> {
	await getTokenAsync(MCP_OAUTH_RESOURCE);
	const stdio = new StdioServerTransport();
	const remote = new StreamableHTTPClientTransport(
		new URL(MCP_OAUTH_RESOURCE),
		{
			fetch: async (url, init) => {
				if (url.toString() !== MCP_OAUTH_RESOURCE)
					throw new Error("MCP bridge refused an unexpected request URL.");
				const { apiToken } = await getTokenAsync(MCP_OAUTH_RESOURCE);
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
				} finally {
					clearTimeout(timer);
				}
				if (
					!response.ok &&
					!(init?.method === "GET" && response.status === 405) &&
					!(init?.method === "DELETE" && response.status === 405)
				) {
					await response.body?.cancel();
					throw new Error(
						`MCP request failed (HTTP ${response.status}).${response.status === 401 ? " Run `onlineornot auth logout` then `onlineornot auth login`." : ""}`,
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
