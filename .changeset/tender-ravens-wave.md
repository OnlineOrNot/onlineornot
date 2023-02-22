---
"onlineornot": patch
---

fix: improve whoami output

This PR adds permission scopes to `onlineornot whoami` output, so you know what your token can do:

```bash
 ✅ onlineornot 0.0.10
----------------------
Getting User settings...
👋 You are logged in with an API Token.
🔓 Token Permissions:
Scope (Access)
- uptime_checks (read)
```
