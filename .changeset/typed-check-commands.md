---
"onlineornot": major
---

BREAKING: Replace untyped check creation with generated HTTP, browser, DNS and TCP commands.

Remove `checks create <name> <url>`. Use `checks http create --name <name> --url <url>`, or the browser, DNS and TCP groups. Each type supports create, update, results and incidents. Add shared `checks get` and `checks move` commands; retain existing list, view, update and delete behavior.

New commands output JSON, support inline/file/stdin API request bodies, validated previews and organization selection. Use `--http-body` for the monitored HTTP request payload and `--body` for API request JSON. Redact sensitive preview fields. Track migration details and unapproved future candidates in `BREAKING_CHANGES.md`.
