# @onlineornot/api

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
