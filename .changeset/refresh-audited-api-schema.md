---
"@onlineornot/api": minor
"onlineornot": patch
---

Regenerate the TypeScript SDK from the audited OpenAPI schema, preserving all 93 operation names. Response types now describe HTTP 200 success/failure unions, canonical error envelopes, corrected monitor and status-page fields, and empty heartbeat ping responses with text errors.

Pagination inputs such as `page` and `per_page` now take numbers instead of strings. Update callers accordingly, and check `data.success` before accessing success-only fields because an HTTP 200 response can contain an API failure. The CLI now passes numeric pagination inputs.
