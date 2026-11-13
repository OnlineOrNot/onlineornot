---
"onlineornot": major
---

BREAKING: Replace legacy check commands with generated, type-specific commands and consistent resource behavior.

Remove `checks create <name> <url>`, `checks update <id>` and `checks view <id>` without compatibility aliases. Use `checks http|browser|dns|tcp create` and `update`, and shared `checks get <id>`. Each type also supports results and incidents; shared `checks move` handles project assignment.

Generate `checks list` and `checks delete`. Check resource commands output JSON without `--json`, banners or tables. Lists return one page with `--page` and `--per-page`; pagination metadata is on stderr. Check deletion requires interactive confirmation or `--force` in unattended scripts. Validation, authentication and API errors exit nonzero.

Use `--body` for inline/file/stdin API JSON, `--http-body` for the monitored HTTP payload, `--headers` JSON instead of repeated `--header`, and `--runtime` for the browser runtime. Omitted creation fields use API defaults, including HIGH alert priority and enabled HTTP TLS verification. Reject empty resource updates while preserving explicit false/null/zero/empty values and omitted fields. Support validated, redacted previews and organization selection.

See `BREAKING_CHANGES.md` for migration examples. Authentication flows, first-check setup, the SDK and the public API remain unchanged.
