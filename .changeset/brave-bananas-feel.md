---
"onlineornot": minor
---

feat: add OAuth login support

- Added `onlineornot login` command with OAuth 2.0 + PKCE authentication flow
- Added `onlineornot logout` command to revoke tokens and clear credentials
- Credentials are stored locally with automatic token refresh
- `onlineornot whoami` updated to handle OAuth
- Existing `ONLINEORNOT_API_TOKEN` environment variable still works and takes precedence
