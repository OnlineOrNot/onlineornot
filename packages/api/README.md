# `@onlineornot/api`

A low-level, generated TypeScript client for the public [OnlineOrNot REST API](https://onlineornot.com). It uses the Fetch API, ships as ESM with declarations, and has no runtime dependencies.

> This package is initially `0.x`. Generated operation names and behavior may change between minor releases while the API is exercised.

## Install

```sh
npm install @onlineornot/api
```

## Authentication

```ts
import { client, listChecks } from "@onlineornot/api";

client.setConfig({
	auth: process.env.ONLINEORNOT_API_TOKEN,
});

const { data, error } = await listChecks();
if (error) throw error;
console.log(data.result);
```

The default client sends normal API operations to `https://api.onlineornot.com`. Authentication uses the bearer token supplied through `auth`.

Although this Fetch-based client can run in a browser, embedding an OnlineOrNot API token in browser code is unsafe. Keep API tokens in trusted server-side environments.

## Write operation

```ts
import { createCheck } from "@onlineornot/api";

const { data, error, request, response } = await createCheck({
	body: {
		name: "Website",
		url: "https://example.com",
		test_interval: 60,
	},
});

if (error) {
	console.error(response?.status, error);
	throw error;
}
console.log(data.result);
```

Operations preserve the generated `{ data, error, request, response }` result and the API's wire envelopes. The package does not unwrap `result`, throw by default, or automatically paginate.

## Isolated and custom clients

Avoid changing the shared client by creating an isolated one. Generated operations accept a client and all other generated per-request overrides, including a custom `fetch` implementation.

```ts
import { createClient, listChecks } from "@onlineornot/api";

const isolated = createClient({
	auth: process.env.ONLINEORNOT_API_TOKEN,
	fetch: globalThis.fetch,
});

const result = await listChecks({
	client: isolated,
	headers: { "x-request-id": crypto.randomUUID() },
});
```

Heartbeat ping operations use their OpenAPI operation server, `https://oonchk.com`, even when an isolated client's default base URL points elsewhere. An explicit per-request `baseUrl` remains available as an override.

## Schema generation

Generated sources are committed so consumers and normal builds do not need the schema repository. `schema.lock.json` pins:

- the `OnlineOrNot/api-schemas` repository;
- a full commit SHA;
- `openapi.json`; and
- the SHA-256 of the exact downloaded bytes.

Regenerate the current pin with network access, or an already verified cache entry:

```sh
pnpm --filter @onlineornot/api generate
pnpm --filter @onlineornot/api check:generated
```

The ignored cache is keyed by both schema commit and digest. A failed download or digest mismatch fails generation; there is no fallback URL.

To deliberately update the schema, supply an explicit full commit SHA:

```sh
pnpm --filter @onlineornot/api schema:update 0123456789abcdef0123456789abcdef01234567
```

This updates the lock, digest, generated code, and reviewed `operations.json` public-name snapshot. Inspect all changes before committing. The current pinned schema contains 93 operations (not the earlier count of 73), and every operation has a unique source `operationId`. The checked-in operation snapshot makes any future public rename fail normal generation until explicitly accepted.

Hey API 0.99.0 does not emit operation-level OpenAPI `servers` into SDK calls. The deterministic generation script therefore verifies the two heartbeat operations exist and applies their pinned `https://oonchk.com` server to generated output.

## First publication

The repository release workflow publishes this package with npm provenance through GitHub Actions. Before its first release, a package owner must create or reserve `@onlineornot/api` on npm and configure npm Trusted Publishing for repository `OnlineOrNot/onlineornot` and workflow `.github/workflows/release.yml`. Trusted Publisher configuration is per npm package, so the existing `onlineornot` setup does not automatically cover this package.
