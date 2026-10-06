# @onlineornot/api

## 0.5.2

### Patch Changes

- [#111](https://github.com/OnlineOrNot/onlineornot/pull/111) [`2e3cf77`](https://github.com/OnlineOrNot/onlineornot/commit/2e3cf77d5622265b62918dc74ff204881a7ea352) Thanks [@rozenmd](https://github.com/rozenmd)! - fix: align the SDK and bundled CLI with the latest API schema

  Regenerate the SDK from api-schemas commit `3e0c8e6964938c98b08a9f1a86226f32c190d9b3`, including nullable status-page custom domains, corrected list query parameters, scheduled-maintenance IDs, and updated environment-variable errors and permission documentation. All 98 operation names are unchanged.

  The CLI bundles the refreshed SDK; its existing check and token adapters remain compatible without command changes. SDK callers should remove unsupported `search` parameters from audit-log, user, invitation, and status-page resource list requests.

## 0.5.1

### Patch Changes

- [#109](https://github.com/OnlineOrNot/onlineornot/pull/109) [`6c21da6`](https://github.com/OnlineOrNot/onlineornot/commit/6c21da627403d41160a1937cc537c51df575f92b) Thanks [@rozenmd](https://github.com/rozenmd)! - feature: Update the API schema with status page image fields.

  Regenerate the SDK types and optional validators to support favicon, logo, and dark mode logo inputs and their response URLs. Refresh webhook association and event documentation while preserving all 98 operation names.

## 0.5.0

### Minor Changes

- [#107](https://github.com/OnlineOrNot/onlineornot/pull/107) [`30be346`](https://github.com/OnlineOrNot/onlineornot/commit/30be3469a7a36bc0ab1dab0f7ff6e7e8c9c3c7c5) Thanks [@rozenmd](https://github.com/rozenmd)! - fix: Refresh the SDK for webhook URL environment variable templates.

  Pin OnlineOrNot/api-schemas commit 2bed27dfa7b21c8d5366a25aab83d12af149ab98 and regenerate TypeScript, Zod, and Valibot outputs. Webhook response, create, and update validators now accept URL templates such as `{{WEBHOOK_URL}}` and `https://api.example.com/hooks/{{WEBHOOK_TOKEN}}`. Generated validators enforce the published string contract; template syntax and resolved URL validation remain server responsibilities.

  The snapshot also adds environment variable name search, documents Basic Auth environment variable references and expired token behavior, and limits status page passwords to 4096 characters. All 98 operation names remain unchanged. Refresh the CLI's bundled SDK with the same contract and stop offering the retired `NODE20_PLAYWRIGHT` update option.

## 0.4.0

### Minor Changes

- [#103](https://github.com/OnlineOrNot/onlineornot/pull/103) [`30586a5`](https://github.com/OnlineOrNot/onlineornot/commit/30586a5883d36894638ed79db9310fbc9f360c7c) Thanks [@rozenmd](https://github.com/rozenmd)! - Refresh the generated API client and validation schemas from the latest published OnlineOrNot API schema, including environment variable operations and the corrected default for SSL verification.

## 0.3.1

### Patch Changes

- [#101](https://github.com/OnlineOrNot/onlineornot/pull/101) [`8258049`](https://github.com/OnlineOrNot/onlineornot/commit/825804927bfe3027d4daa01babc31af527cfb431) Thanks [@rozenmd](https://github.com/rozenmd)! - Refresh the TypeScript, Zod, and Valibot SDK outputs from OnlineOrNot/api-schemas commit cd4dd1109039ce731bcddbb44303f15859535f82.

## 0.3.0

### Minor Changes

- [#99](https://github.com/OnlineOrNot/onlineornot/pull/99) [`53daa80`](https://github.com/OnlineOrNot/onlineornot/commit/53daa806b18fb17bff8777b247c6d239bdfee782) Thanks [@open-session-jcjv](https://github.com/apps/open-session-jcjv)! - Add generated Zod and Valibot request, response, and model schemas through the optional `@onlineornot/api/zod` and `@onlineornot/api/valibot` entrypoints.

## 0.2.1

### Patch Changes

- [#95](https://github.com/OnlineOrNot/onlineornot/pull/95) [`5d17a8a`](https://github.com/OnlineOrNot/onlineornot/commit/5d17a8a93107b506e31190864f441d9452ba63b3) Thanks [@rozenmd](https://github.com/rozenmd)! - Refresh the SDK from OnlineOrNot/api-schemas commit 14d505afb15e62969e21f8c497a45199f7f4a050. Document HIGH as the API default for omitted check creation alert priority and preserve omission on PATCH. Add the documented heartbeat lookup 404 error type.

## 0.2.0

### Minor Changes

- [#94](https://github.com/OnlineOrNot/onlineornot/pull/94) [`bf86e0a`](https://github.com/OnlineOrNot/onlineornot/commit/bf86e0a8af3720bd7475f636a9c99b33d014e010) Thanks [@rozenmd](https://github.com/rozenmd)! - Regenerate the TypeScript SDK from the audited OpenAPI schema, preserving all 93 operation names. Response types now describe HTTP 200 success/failure unions, canonical error envelopes, corrected monitor and status-page fields, and empty heartbeat ping responses with text errors.

  Pagination inputs such as `page` and `per_page` now take numbers instead of strings. Update callers accordingly, and check `data.success` before accessing success-only fields because an HTTP 200 response can contain an API failure. The CLI now passes numeric pagination inputs.

## 0.1.0

### Minor Changes

- [#84](https://github.com/OnlineOrNot/onlineornot/pull/84) [`34a89f9`](https://github.com/OnlineOrNot/onlineornot/commit/34a89f96db2f4e1cffdce9418b03f5b8493176e7) Thanks [@rozenmd](https://github.com/rozenmd)! - Add the initial generated, typed OnlineOrNot REST API client.
