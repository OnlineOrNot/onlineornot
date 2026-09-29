---
"@onlineornot/api": minor
"onlineornot": minor
---

feature: Prepare project management and explicit project moves.

Add project CRUD, optional resource project selection/filtering and single-request check/heartbeat moves to the generated SDK. Add CLI project CRUD, check creation/list project flags and check/heartbeat move commands with JSON output.

This preparation uses a locally pinned, unreleased candidate contract. Publication is blocked until server parity is reviewed and the SDK is regenerated from a released schema pin. Moves preserve server-controlled operational state; clients never perform a follow-up activation.

Reject the obsolete `checks update --version NODE20_PLAYWRIGHT` option locally with migration guidance to `NODE24_PLAYWRIGHT`. The old client option was already rejected by the current server contract.
