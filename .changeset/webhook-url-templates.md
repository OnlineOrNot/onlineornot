---
"@onlineornot/api": major
"onlineornot": patch
---

fix: Refresh the SDK for webhook URL environment variable templates.

Pin OnlineOrNot/api-schemas commit 2bed27dfa7b21c8d5366a25aab83d12af149ab98 and regenerate TypeScript, Zod, and Valibot outputs. Webhook response, create, and update validators now accept URL templates such as `{{WEBHOOK_URL}}` and `https://api.example.com/hooks/{{WEBHOOK_TOKEN}}`. Generated validators enforce the published string contract; template syntax and resolved URL validation remain server responsibilities.

The snapshot also adds environment variable name search, documents Basic Auth environment variable references and expired token behavior, and limits status page passwords to 4096 characters. All 98 operation names remain unchanged. Refresh the CLI's bundled SDK with the same contract and stop offering the retired `NODE20_PLAYWRIGHT` update option.

