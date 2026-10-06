---
"@onlineornot/api": patch
"onlineornot": patch
---

fix: align the SDK and bundled CLI with the latest API schema

Regenerate the SDK from api-schemas commit `3e0c8e6964938c98b08a9f1a86226f32c190d9b3`, including nullable status-page custom domains, corrected list query parameters, scheduled-maintenance IDs, and updated environment-variable errors and permission documentation. All 98 operation names are unchanged.

The CLI bundles the refreshed SDK; its existing check and token adapters remain compatible without command changes. SDK callers should remove unsupported `search` parameters from audit-log, user, invitation, and status-page resource list requests.
