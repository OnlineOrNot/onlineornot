---
"onlineornot": patch
---

fix: Explain MCP client setup and make bridge failures actionable.

Expand `onlineornot mcp --help` with authentication prerequisites, launch examples,
client JSON configuration, hosted tool capabilities and normal silent stdio behavior.
Add credential-specific authentication recovery and connection/permission diagnostics
without writing non-protocol output to stdout during MCP sessions.
