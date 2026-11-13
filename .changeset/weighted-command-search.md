---
"onlineornot": minor
---

FEATURE: Match Cloudflare-style local command search with MiniSearch.

Add prefix matching, fuzzy matching at 0.2, and weighted ranking for command names (8), summaries (5), descriptions (2), keywords (5), and parent/argument/flag context (0.5). Search visible utility commands alongside generated API commands, retain group aliases, exclude hidden or opted-out entries, and return at most five matches.

Preserve the existing JSON command metadata in search results and add summaries. Keep the full API catalog available through `cli commands`. Discovery runs locally without login, API requests, AI services, or search telemetry.
