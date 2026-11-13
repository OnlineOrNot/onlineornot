---
"onlineornot": minor
---

FEATURE: Group authentication commands under `onlineornot auth`.

Use `auth login`, `auth logout` and `auth whoami`. Keep the previous top-level names as hidden compatibility aliases, show only the canonical names in command search, and use them in authentication recovery messages. Keep `setup` top-level and preserve existing OAuth, API token and credential behavior.
