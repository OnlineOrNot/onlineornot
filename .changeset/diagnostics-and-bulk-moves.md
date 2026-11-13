---
"onlineornot": minor
---

FEATURE: Generate webhook diagnostics, audit history and atomic project moves.

Add `webhooks deliveries list|get|activity|summary`, `audit-logs list` and `resources move` through Forge and the existing SDK. Preserve cursor and numbered pagination, organization selection, JSON stdout and nonzero API failures.

Require confirmation or `--force` for bulk moves, with a move-specific prompt and credential-free previews. Keep webhook delivery-detail payloads out of debug diagnostics while returning the API result to the command caller.
