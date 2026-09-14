# @onlineornot/api

## 0.2.0

### Minor Changes

- [#94](https://github.com/OnlineOrNot/onlineornot/pull/94) [`bf86e0a`](https://github.com/OnlineOrNot/onlineornot/commit/bf86e0a8af3720bd7475f636a9c99b33d014e010) Thanks [@rozenmd](https://github.com/rozenmd)! - Regenerate the TypeScript SDK from the audited OpenAPI schema, preserving all 93 operation names. Response types now describe HTTP 200 success/failure unions, canonical error envelopes, corrected monitor and status-page fields, and empty heartbeat ping responses with text errors.

  Pagination inputs such as `page` and `per_page` now take numbers instead of strings. Update callers accordingly, and check `data.success` before accessing success-only fields because an HTTP 200 response can contain an API failure. The CLI now passes numeric pagination inputs.

## 0.1.0

### Minor Changes

- [#84](https://github.com/OnlineOrNot/onlineornot/pull/84) [`34a89f9`](https://github.com/OnlineOrNot/onlineornot/commit/34a89f96db2f4e1cffdce9418b03f5b8493176e7) Thanks [@rozenmd](https://github.com/rozenmd)! - Add the initial generated, typed OnlineOrNot REST API client.
