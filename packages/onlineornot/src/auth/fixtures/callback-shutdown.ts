import assert from "node:assert/strict";
import { once } from "node:events";
import { connect } from "node:net";

import { authenticateWithBrowser } from "../../login";
import { startOAuthCallbackServer } from "../oauth";

async function run() {
	const scenario = process.argv[2];
	const callback = await startOAuthCallbackServer("verifier", "state", {
		port: 0,
		timeoutMs: scenario === "timeout" ? 500 : 10_000,
		exchangeCode: async () => ({
			access_token: "fixture-access",
			refresh_token: "fixture-refresh",
			expires_in: 3600,
			token_type: "Bearer",
			scope: "openid email",
		}),
	});

	// Browsers can speculatively connect without sending an HTTP request.
	const preconnection = connect({
		host: "localhost",
		port: Number(new URL(callback.callbackUrl).port),
	});
	await once(preconnection, "connect");
	// Only the server-side socket should be able to keep this subprocess alive.
	preconnection.unref();
	if (scenario === "partial") {
		preconnection.write("GET /oauth/callback HTTP/1.1\r\nHost:");
	}

	if (scenario === "cancel") {
		const closing = callback.close();
		assert.equal(callback.close(), closing);
		await closing;
		console.log("Callback closed");
	} else {
		let saved = false;
		let redirectResponse: Promise<Response> | undefined;
		const authentication = authenticateWithBrowser(
			{},
			{
				buildAuthUrl: async () => ({
					url: "https://example.invalid/authorize",
					codeVerifier: "verifier",
					state: "state",
				}),
				getCredentials: () => null,
				getEnvironmentToken: () => "",
				log: () => {},
				now: Date.now,
				openInBrowser: async () => {
					if (scenario === "timeout") return;
					const query =
						scenario === "denied"
							? "error=access_denied&state=state"
							: "code=fixture-code&state=state";
					redirectResponse = fetch(`${callback.callbackUrl}?${query}`, {
						redirect: "manual",
					});
				},
				saveCredentials: () => {
					saved = true;
				},
				startOAuthCallbackServer: async () => callback,
				fetch: async () =>
					new Response(JSON.stringify({ email: "fixture@example.invalid" })),
			},
		);

		if (scenario === "success" || scenario === "partial") {
			assert.deepEqual(await authentication, {
				status: "authenticated",
				email: "fixture@example.invalid",
			});
			assert.equal(saved, true);
			console.log("Successfully logged in.");
		} else {
			await assert.rejects(
				authentication,
				scenario === "timeout"
					? /Timed out waiting for authorization/
					: /Authorization denied: access_denied/,
			);
			assert.equal(saved, false);
			console.log("Authentication rejected");
		}
		if (redirectResponse) {
			const response = await redirectResponse;
			assert.equal(response.status, 302);
			assert.equal(
				response.headers.get("location"),
				scenario === "denied"
					? "https://onlineornot.com/oauth/error?error=access_denied"
					: "https://onlineornot.com/oauth/success",
			);
			await response.text();
		}
	}

	// No process.exit() or client socket cleanup: shutdown must release its handles.
}

void run().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
